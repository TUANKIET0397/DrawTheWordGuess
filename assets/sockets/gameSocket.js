const { sequelize, connect } = require('../config/db/db.js');
connect(); // Gọi hàm kết nối DB
const PlayerModel = require('../app/models/Player.js')(sequelize);

// Export function để sử dụng ở file khác
module.exports = (io) => {
  let drawHistory = [];
  let guessHistory = [];
  let players = []; // [{id, name, score, isCorrect, avatar}]
  let currentDrawerIndex = 0;
  let currentWord = '';
  // Lưu số lần gợi ý đã dùng cho mỗi lượt theo socket id của drawer
  let hintUsage = { count: 0, drawerId: null };
  let gameStarted = false;
  let turnCount = 0; // Track number of turns per player
  let maxTurns = 4; // Default max turns
  let roundStartTime = {}; // Track answer times
  let usedAvatars = new Set(); // Track used avatars to avoid duplicates

  io.on('connection', (socket) => {
    console.log('✅ New user connected:', socket.id);

    socket.on('joinGame', async (playerName) => {
      if (!playerName || playerName.trim() === '') {
        console.log('❌ Invalid player name');
        socket.emit('error', { message: 'Tên người chơi không hợp lệ' });
        return;
      }

      // Kiểm tra xem player đã tồn tại chưa
      const existingPlayer = players.find((p) => p.id === socket.id);
      if (existingPlayer) {
        console.log('Player already exists:', socket.id);
        return;
      }

      let playerScore = 0;

      // Kiểm tra xem player đã từng chơi chưa (dựa trên tên)
      try {
        const existingDbPlayer = await PlayerModel.findOne({
          where: { player_name: playerName.trim() },
        });

        if (existingDbPlayer) {
          playerScore = existingDbPlayer.score || 0;
          console.log(
            `Returning player ${playerName} with score: ${playerScore}`
          );

          // Cập nhật socket_id mới
          await PlayerModel.update(
            { socket_id: socket.id },
            { where: { player_name: playerName.trim() } }
          );
        }
      } catch (error) {
        console.error('❌ Error checking existing player:', error);
      }

      const newPlayer = {
        id: socket.id,
        name: playerName.trim(),
        score: playerScore,
        role: 'guesser',
        isCorrect: false,
        avatar: assignRandomAvatar(),
      };

      players.push(newPlayer);
      updatePlayers();
      updateMaxTurns();

      // Lưu vào DB (hoặc update nếu đã có)
      try {
        const [player, created] = await PlayerModel.findOrCreate({
          where: { player_name: newPlayer.name },
          defaults: {
            socket_id: newPlayer.id,
            player_name: newPlayer.name,
            score: newPlayer.score,
          },
        });

        if (!created) {
          // Player đã tồn tại, chỉ update socket_id
          await player.update({ socket_id: newPlayer.id });
        }
      } catch (err) {
        console.error('❌ Error saving player to DB:', err.message);
      }

      // Game logic
      if (players.length >= 3 && !gameStarted) {
        gameStarted = true;
        startTurn(); // Bắt đầu lượt đầu tiên khi có đủ 2 người
      } else if (players.length >= 3 && gameStarted) {
        socket.emit('role', 'guesser');
        socket.emit('startGame');

        // Gửi thông tin người vẽ hiện tại cho người mới
        const currentDrawer = players[currentDrawerIndex];
        if (currentDrawer) {
          socket.emit('updateCurrentDrawer', {
            id: currentDrawer.id,
            name:
              currentDrawer.name ||
              currentDrawer.player_name ||
              currentDrawer.id.slice(0, 5),
          });
        }
      } else {
        socket.emit('waiting', 'Waiting for others...');
      }

      // Gửi dữ liệu cho người mới
      socket.emit('init', {
        drawHistory,
        guessHistory,
      });
    });

    // Nhận dữ liệu vẽ và phát cho người khác
    socket.on('drawing', (data) => {
      drawHistory.push(data);
      socket.broadcast.emit('drawing', data);
    });

    // Nhận đoán và gửi lại cho tất cả
    socket.on('guess', async (text) => {
      // Track answer time for rankings
      roundStartTime[socket.id] = Date.now();

      // Tìm player để lấy tên
      const player = players.find((p) => p.id === socket.id);
      const playerName = player ? player.name : socket.id.slice(0, 5);

      const guess = { username: playerName, guess: text };
      guessHistory.push(guess);
      io.emit('guess', { username: playerName, guess: text });

      //logic check keyword
      if (
        text.trim().toLowerCase() === currentWord.trim().toLowerCase() &&
        socket.id !== players[currentDrawerIndex].id
      ) {
        const winner = players.find((p) => p.id === socket.id);
        if (winner) {
          // Cập nhật điểm trong memory
          winner.score += 15;
          winner.isCorrect = true;

          // Cập nhật điểm trong database
          try {
            await PlayerModel.update(
              { score: winner.score },
              { where: { socket_id: winner.id } }
            );
          } catch (error) {
            console.error('❌ Error updating score in DB:', error);
          }

          updatePlayers();
        }

        io.emit('stopTimer');

        // Delay chuyển lượt
        setTimeout(() => {
          nextTurn();
        }, 3000);
      }
    });

    socket.on('requestWordOptions', async () => {
      try {
        const [rows] = await sequelize.query(
          'SELECT keyword FROM Keywords ORDER BY RAND() LIMIT 2'
        );

        const wordOptions = rows.map((r) => r.keyword);
        socket.emit('chooseWordOptions', wordOptions);
      } catch (error) {
        console.error('❌ Error getting word options:', error);
        socket.emit('error', { message: 'Lỗi khi lấy từ khóa' });
      }
    });

    socket.on('skipDrawing', () => {
      const player = players.find((p) => p.id === socket.id);
      if (player && player.role === 'drawer') {
        io.emit('stopTimer');
        nextTurn();
      }
    });

    socket.on('selectedWord', (word) => {
      const player = players.find((p) => p.id === socket.id);
      if (player && player.role === 'drawer') {
        currentWord = word;
        const drawer = players[currentDrawerIndex];
        // Reset bộ đếm gợi ý cho lượt mới
        hintUsage = { count: 0, drawerId: drawer.id };

        // Phát cho tất cả người chơi sự kiện bắt đầu round với thời gian từ server
        const drawingTime = 45; // 45 giây vẽ
        const startTime = Date.now(); // Timestamp bắt đầu
        io.emit('startRound', { 
          duration: drawingTime,
          startTime: startTime 
        });

        io.to(drawer.id).emit('startDrawing');
        socket.broadcast.emit('otherPlayerDrawing');
        
        // Chỉ sync một lần sau 1 giây để đảm bảo tất cả client đồng bộ ban đầu
        setTimeout(() => {
          const currentElapsed = (Date.now() - startTime) / 1000;
          const remainingTime = Math.max(0, drawingTime - currentElapsed);
          
          if (remainingTime > 0) {
            io.emit('syncTimer', { remainingTime, startTime });
          }
        }, 1000);
      }
    });

    socket.on('timeUp', () => {
      console.log('Server got timeUp from', socket.id);
      const player = players.find((p) => p.id === socket.id);
      if (player && player.role === 'drawer') {
        nextTurn();
      }
    });

    socket.on('clearImg', () => {
      const player = players.find((p) => p.id === socket.id);
      if (player && player.role === 'drawer') {
        drawHistory = [];
        io.emit('clear');
      }
    });

    // Xử lý yêu cầu gợi ý: chỉ người vẽ được gửi, server tạo gợi ý đúng từ currentWord
    socket.on("requestHint", async (data) => {
      const player = players.find((p) => p.id === socket.id);
      if (!player || player.role !== "drawer") return;
      if (!currentWord) return;
      if (hintUsage.drawerId !== socket.id) {
        hintUsage = { count: 0, drawerId: socket.id };
      }
      if (hintUsage.count >= 3) {
        io.to(socket.id).emit('hintLimitReached', { message: 'Bạn đã dùng hết gợi ý.' });
        return;
      }

      const level = Math.min(Math.max(parseInt(data?.hintLevel) || (hintUsage.count + 1), 1), 3);

      const generateServerHint = (word, level) => {
        const w = (word || '').toString();
        const len = w.length;
        if (!len) return 'Không có từ để gợi ý';
        if (level === 1) {
          return `This word has ${len} letters and starts with the letter "${w.charAt(0).toUpperCase()}"`;
        }
        if (level === 2) {
          return `This word starts with the letter "${w.charAt(0).toUpperCase()}" and ends with the letter "${w.charAt(len - 1).toUpperCase()}"`;
        }
        const revealed = Math.max(1, Math.ceil(len * 0.6));
        let parts = [];
        for (let i = 0; i < revealed; i++) {
          const pos = Math.floor((i * len) / revealed);
          parts.push(`${pos + 1}. "${w.charAt(pos).toUpperCase()}"`);
        }
        return `letters: ${parts.join(' ')}`;
      };

      hintUsage.count += 1;

      const hint = generateServerHint(currentWord, level);
      io.emit("showHint", {
        hint,
        remainingHints: Math.max(0, 3 - hintUsage.count)
      });
    });

    socket.on('disconnect', async () => {
      console.log('❌ User disconnected:', socket.id);
      const wasDrawer = socket.id === players[currentDrawerIndex]?.id;

      const playerToRemove = players.find((p) => p.id === socket.id);
      if (playerToRemove) {
        // Reset avatar khi player disconnect
        if (playerToRemove.avatar) {
          usedAvatars.delete(playerToRemove.avatar);
        }
        
        players = players.filter((p) => p.id !== socket.id);
        updatePlayers();

        try {
          await removePlayerFromDB(playerToRemove.id);
        } catch (error) {
          console.error('❌ Error removing player from DB:', error);
        }

        if (players.length < 3) {
          io.emit('waiting', 'Waiting for other players...');
          currentDrawerIndex = 0;
          drawHistory = [];
          guessHistory = [];
          io.emit('clearCanvas');
          await resetGame();
          gameStarted = false;
          return;
        }

        if (wasDrawer) {
          if (currentDrawerIndex >= players.length) {
            currentDrawerIndex = 0;
          }
          nextTurn();
        }
      }
    });
  });

  //Functions
  function assignRandomAvatar() {
    const totalAvatars = 20; // avt1.jpg to avt20.jpg
    const availableAvatars = [];
    
    // Tìm tất cả avatar chưa được sử dụng
    for (let i = 1; i <= totalAvatars; i++) {
      const avatarName = `avt${i}.jpg`;
      if (!usedAvatars.has(avatarName)) {
        availableAvatars.push(avatarName);
      }
    }
    
    // Nếu hết avatar, reset lại
    if (availableAvatars.length === 0) {
      usedAvatars.clear();
      for (let i = 1; i <= totalAvatars; i++) {
        availableAvatars.push(`avt${i}.jpg`);
      }
    }
    
    // Chọn random một avatar
    const randomIndex = Math.floor(Math.random() * availableAvatars.length);
    const selectedAvatar = availableAvatars[randomIndex];
    usedAvatars.add(selectedAvatar);
    
    return selectedAvatar;
  }

  function updatePlayers() {
    const currentDrawer = players[currentDrawerIndex];

    // Gửi thông tin danh sách players
    io.emit(
      'updatePlayers',
      players.map((p) => ({
        id: p.id,
        name: p.name || p.player_name || p.id.slice(0, 5),
        score: p.score || 0,
        role: p.role || 'guesser', // 'drawer' hoặc 'guesser'
        isCorrect: p.isCorrect || false,
        avatar: p.avatar || 'avt1.jpg', // Default avatar if not set
      }))
    );

    // Gửi thông tin người vẽ hiện tại riêng biệt
    if (currentDrawer && players.length >= 3) {
      const drawerInfo = {
        id: currentDrawer.id,
        name:
          currentDrawer.name ||
          currentDrawer.player_name ||
          currentDrawer.id.slice(0, 5),
      };

      console.log('Sending updateCurrentDrawer:', drawerInfo.name);
      io.emit('updateCurrentDrawer', drawerInfo);
    }
    updateMaxTurns();
  }

  function updateMaxTurns() {
    if (players.length < 4) {
      maxTurns = 4;
    } else if (players.length < 6) {
      maxTurns = 3;
    } else if (players.length < 8) {
      maxTurns = 2;
    } else {
      maxTurns = 1;
    }

    let scores = players.map((p) => p.score);
    let maxScore = Math.max(...scores);

    if (maxScore >= 120) {
      maxTurns = 0;
    }
  }

  async function resetGame() {
    // Reset các biến game
    turnCount = 0;
    currentDrawerIndex = 0;
    players.forEach((p) => {
      p.score = 0;
      p.role = 'guesser';
      p.isCorrect = false;
      // Giữ nguyên avatar khi reset game
    });
    updatePlayers();

    // Clear history
    drawHistory = [];
    guessHistory = [];

    // Thông báo reset
    io.emit('resetGame', {
      players: players,
    });

    // Bắt đầu game mới sau 3 giây
    setTimeout(() => {
      if (players.length >= 3) {
        updateMaxTurns();
        startTurn();
      }
    }, 3000);
  }

  async function showRankings() {
    if (players.length < 3) return;

    // Sắp xếp theo điểm cao đến thấp
    const rankedPlayers = Array.from(players.values()).sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score; // Sắp xếp theo điểm
      }
      return a.answerTime - b.answerTime; // Nếu điểm bằng nhau thì xét thời gian
    });

    // Lấy top 3 và sắp xếp theo thứ tự hiển thị (2-1-3)
    const top3 = [
      rankedPlayers[1], // Vị trí 2
      rankedPlayers[0], // Vị trí 1
      rankedPlayers[2], // Vị trí 3
    ].filter(Boolean);

    io.emit('showRankings', {
      players: top3,
      duration: 8,
    });

    // Reset game sau khi hiện bảng xếp hạng
    setTimeout(() => {
      resetGame();
      // Bắt đầu game mới
      setTimeout(() => {
        if (players.length >= 3) {
          updateMaxTurns();
          startTurn();
        }
      }, 3000);
    }, 15000);
  }

  async function chooseWord() {
    try {
      const [rows] = await sequelize.query(
        'SELECT keyword FROM Keywords ORDER BY RAND() LIMIT 1'
      );

      return rows[0]?.keyword || 'default';
    } catch (error) {
      console.error('Error choosing word:', error);
      return 'default';
    }
  }

  async function startTurn() {
    if (players.length < 3) return;

    // Reset tất cả về guesser
    players.forEach((p) => {
      p.role = 'guesser';
      p.isCorrect = false;
    });

    // Chỉ định drawer
    players[currentDrawerIndex].role = 'drawer';

    const drawer = players[currentDrawerIndex];

    console.log(`Starting turn - Drawer: ${drawer.name} (${drawer.id})`);

    updatePlayers();

    io.emit('newTurnStarted', {
      currentDrawer: {
        id: drawer.id,
        name: drawer.name || drawer.player_name || drawer.id.slice(0, 5),
      },
    });

    // Gửi role cho từng người chơi
    players.forEach((p, index) => {
      if (index === currentDrawerIndex) {
        io.to(p.id).emit('role', 'drawer');
        // Gửi sự kiện để người vẽ đầu tiên có thể bắt đầu chọn từ
        io.to(p.id).emit('yourTurnToDraw');
      } else {
        io.to(p.id).emit('role', 'guesser');
      }
    });

    drawHistory = [];
    guessHistory = [];

    io.emit('clearCanvas');
    io.emit('startGame');
    
    // KHÔNG gửi startRound ở đây vì người vẽ đầu tiên cần chọn từ trước
    // startRound sẽ được gửi sau khi họ chọn từ (trong selectedWord)
  }

  async function nextTurn() {
    turnCount++;
    if (turnCount >= maxTurns * players.length) {
      // Show rankings when all turns are done
      await showRankings();
      return;
    }

    if (players.length < 3) return;

    // Thưởng điểm cho drawer nếu có người đoán đúng
    const currentDrawer = players[currentDrawerIndex];
    const hasCorrectGuess = players.some((p) => p.isCorrect);

    if (hasCorrectGuess && currentDrawer) {
      // Thưởng điểm cho drawer và trừ điểm theo số lần đã dùng gợi ý trong lượt này
      const hintPenalty = (hintUsage.drawerId === currentDrawer.id) ? (hintUsage.count || 0) : 0;
      currentDrawer.score += 7; // thưởng cơ bản
      currentDrawer.score = Math.max(0, currentDrawer.score - hintPenalty); // trừ mỗi gợi ý 1 điểm

      // Cập nhật điểm drawer trong database
      try {
        await PlayerModel.update(
          { score: currentDrawer.score },
          { where: { socket_id: currentDrawer.id } }
        );
      } catch (error) {
        console.error('❌ Error updating drawer score in DB:', error);
      }
    }

    // Chuyển lượt
    currentDrawerIndex = (currentDrawerIndex + 1) % players.length;
    currentWord = await chooseWord();

    // Reset tất cả về guesser
    players.forEach((p) => {
      p.role = 'guesser';
      p.isCorrect = false;
    });

    // Chỉ định drawer mới
    players[currentDrawerIndex].role = 'drawer';

    const newDrawer = players[currentDrawerIndex];

    console.log(`Next turn - New Drawer: ${newDrawer.name} (${newDrawer.id})`);

    // Cập nhật players và gửi thông tin người vẽ mới
    updatePlayers();

    // Gửi sự kiện turn mới
    io.emit('newTurnStarted', {
      currentDrawer: {
        id: newDrawer.id,
        name:
          newDrawer.name || newDrawer.player_name || newDrawer.id.slice(0, 5),
      },
    });

    // Gửi role cho từng người
    players.forEach((p, index) => {
      if (index === currentDrawerIndex) {
        io.to(p.id).emit('role', 'drawer');
        io.to(p.id).emit('yourTurnToDraw', currentWord);
      } else {
        io.to(p.id).emit('role', 'guesser');
      }
    });

    drawHistory = [];
    guessHistory = [];

    io.emit('clearCanvas');
    io.emit('startGame');
  }

  // Function delete from database
  async function removePlayerFromDB(socketId) {
    try {
      await PlayerModel.destroy({
        where: { socket_id: socketId },
      });
      console.log(`Player with socket_id=${socketId} removed from DB`);
    } catch (error) {
      console.error('Error removing player from DB:', error);
    }
  }
};
