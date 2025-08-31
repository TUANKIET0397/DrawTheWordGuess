const canvas = document.querySelector('canvas'),
  toolBtns = document.querySelectorAll('.tool'),
  fillColor = document.querySelector('#fill-color'),
  sizeSlider = document.querySelector('#size-slider'),
  colorBtns = document.querySelectorAll('.colors .option'),
  colorPicker = document.querySelector('#color-picker'),
  clearCanvas = document.querySelector('.clear-canvas'),
  saveImg = document.querySelector('.save-img'),
  ctx = canvas.getContext('2d');

// Function to handle out game
document.addEventListener('DOMContentLoaded', () => {
  const outgame = document.getElementById('out-game');
  if (outgame) {
    outgame.addEventListener('click', () => {
      window.location.href = '/';
    });
  }
});
// Show canvas and hide waiting message
function showCanvasWaiting() {
  document.getElementById('drawing-board__canvas').style.display = 'block';
  document.getElementById('drawing-board__choice').style.display = 'none';
  if (!isDrawing) {
    document.querySelector('.drawing-board__progress').style.display = 'none';
  }
}

// global variables with default value
let prevMouseX,
  prevMouseY,
  snapshot,
  isDrawing = false,
  selectedTool = 'brush',
  brushWidth = 5,
  selectedColor = '#000';

let lastX, lastY;
let canPlay = false;
let isDrawer = false;
let canGuess = false;
let timer;

// Biến cho hệ thống gợi ý
let hintCount = 3;
let currentWord = '';
let hintButton = document.getElementById('hint-button');
let wordDisplay = document.getElementById('word-display');
let currentWordSpan = document.getElementById('current-word');
let hintCountSpan = document.getElementById('hint-count');
let hintDisplay = document.getElementById('hint-display');
let hintText = document.getElementById('hint-text');
let remainingHintsSpan = document.getElementById('remaining-hints');

// Biến cho thanh thời gian chọn
let choiceTimer1 = null;
let choiceTimer2 = null;
let choiceTimerDuration = 10; // 10 giây

const setCanvasBackground = () => {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = selectedColor; // setting fillstyle back to the selectedColor, it'll be the brush color
};

const resizeCanvas = () => {
  const oldWidth = canvas.width;
  const oldHeight = canvas.height;

  let tempImage = null;
  if (oldWidth > 0 && oldHeight > 0) {
    tempImage = ctx.getImageData(0, 0, oldWidth, oldHeight);
  }

  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  setCanvasBackground();

  const scaleX = canvas.width / oldWidth;
  const scaleY = canvas.height / oldHeight;

  if (tempImage) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = oldWidth;
    tempCanvas.height = oldHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(tempImage, 0, 0);

    ctx.scale(scaleX, scaleY);
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
};

window.addEventListener('resize', () => {
  resizeCanvas();
});

const startDraw = (e) => {
  if (!isDrawer) return;
  isDrawing = true;
  prevMouseX = e.offsetX; // passing current mouseX position as prevMouseX value
  prevMouseY = e.offsetY; // passing current mouseY position as prevMouseY value
  lastX = e.offsetX;
  lastY = e.offsetY;

  ctx.beginPath(); // creating new path to draw
  ctx.lineWidth = brushWidth; // passing brushSize as line width
  ctx.strokeStyle = selectedColor; // passing selectedColor as stroke style
  ctx.fillStyle = selectedColor; // passing selectedColor as fill style
  // copying canvas data & passing as snapshot value.. this avoids dragging the image
  snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
};

const socket = io(); // Mặc định kết nối tới server đang chạy

const drawing = (e) => {
  if (!isDrawing || !isDrawer) return;
  ctx.putImageData(snapshot, 0, 0); // adding copied canvas data on to this canvas

  const currentX = e.offsetX;
  const currentY = e.offsetY;

  ctx.strokeStyle = selectedTool === 'eraser' ? '#fff' : selectedColor;
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();

  // Gửi dữ liệu vẽ
  if (typeof lastX === 'number' && typeof lastY === 'number') {
    socket.emit('drawing', {
      prevX: lastX,
      prevY: lastY,
      x: currentX,
      y: currentY,
      color: selectedTool === 'eraser' ? '#fff' : selectedColor,
      width: brushWidth,
    });
  }

  lastX = currentX;
  lastY = currentY;
};

toolBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelector('.options .active').classList.remove('active');
    btn.classList.add('active');
    selectedTool = btn.id;
  });
});

sizeSlider.addEventListener('change', () => (brushWidth = sizeSlider.value));

colorBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelector('.options .selected').classList.remove('selected');
    btn.classList.add('selected');
    selectedColor = window
      .getComputedStyle(btn)
      .getPropertyValue('background-color');
  });
});

colorPicker.addEventListener('change', () => {
  colorPicker.parentElement.style.background = colorPicker.value;
  colorPicker.parentElement.click();
});

clearCanvas.addEventListener('click', () => {
  socket.emit('clearImg');
});

saveImg.addEventListener('click', () => {
  const link = document.createElement('a'); // creating <a> element
  link.download = `${Date.now()}.jpg`; // passing current date as link download value
  link.href = canvas.toDataURL(); // passing canvasData as link href value
  link.click(); // clicking link to download image
});

canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', drawing);
canvas.addEventListener('mouseup', () => (isDrawing = false));

//GUESS
const chatInput = document.querySelector('.chat_input');
const chatBody = document.querySelector('.chat_body');

chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && chatInput.value.trim() !== '') {
    if (!canGuess) return;
    socket.emit('guess', chatInput.value.trim());
    chatInput.value = '';
  }
});

socket.on('guess', (data) => {
  const div = document.createElement('div');
  div.classList.add('guess'); // class để định dạng CSS
  div.textContent = `👤 ${data.username}: ${data.guess}`; // Cắt gọn ID cho đẹp
  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight; // Tự cuộn xuống dòng mới
});

// ========== HÀM CẬP NHẬT TÊN NGƯỜI VẼ ==========
function updateCurrentDrawerName(drawerName) {
  const usernameElements = document.querySelectorAll(
    '.drawing-board__username'
  );
  usernameElements.forEach((element) => {
    element.textContent = drawerName || 'Đang chờ...';
  });
  console.log('Updated drawer name to:', drawerName);
}

let currentDrawerName = 'Đang chờ...';

//Socket IO

socket.on('clear', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  setCanvasBackground();
});

socket.on('drawing', (data) => {
  if (
    typeof data.prevX !== 'number' ||
    typeof data.prevY !== 'number' ||
    typeof data.x !== 'number' ||
    typeof data.y !== 'number'
  )
    return;

  ctx.beginPath();
  ctx.strokeStyle = data.color;
  ctx.lineWidth = data.width;
  ctx.moveTo(data.prevX, data.prevY); // từ điểm trước
  ctx.lineTo(data.x, data.y); // đến điểm mới
  ctx.stroke();
});

socket.on('init', (data) => {
  // Đảm bảo canvas đã resize trước khi vẽ
  const container = document.getElementById('drawing-board__canvas');
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  setCanvasBackground();

  data.drawHistory.forEach((line) => {
    if (
      typeof line.prevX !== 'number' ||
      typeof line.prevY !== 'number' ||
      typeof line.x !== 'number' ||
      typeof line.y !== 'number'
    )
      return;

    ctx.beginPath();
    ctx.strokeStyle = line.color;
    ctx.lineWidth = line.width;
    ctx.moveTo(line.prevX, line.prevY);
    ctx.lineTo(line.x, line.y);
    ctx.stroke();
  });

  // Gửi đoán
  data.guessHistory.forEach((g) => {
    const div = document.createElement('div');
    div.classList.add('guess');
    div.textContent = `👤 ${g.username}: ${g.guess}`;
    chatBody.appendChild(div);
  });

  chatBody.scrollTop = chatBody.scrollHeight;
});

socket.on('startGame', () => {
  canPlay = true;
  document.getElementById('drawing-board__first').style.display = 'flex'; //Mặc định
  document.querySelector('.drawing-board__progress').style.display = 'block'; //Mặc định
});

// Khi chưa đủ người
socket.on('waiting', (playerCount) => {
  showCanvasWaiting();
  alert(`Waiting for other players`);
});

socket.on('yourTurnToDraw', () => {
  isDrawer = true;
  canGuess = false;
  document.getElementById('drawing-board__choice').style.display = 'block';

  stopChoiceTimers(); // <-- Đảm bảo dừng timer trước khi bắt đầu mới
  startChoiceTimer1();
});

socket.on('startDrawing', () => {
  isDrawer = true;
  document.getElementById('drawing-board__choice').style.display = 'none';
  document.getElementById('drawing-board__canvas').style.display = 'block';
  resizeCanvas();

  stopChoiceTimers();

  // Khởi tạo lại hint elements
  hintButton = document.getElementById('hint-button');
  wordDisplay = document.getElementById('word-display');
  currentWordSpan = document.getElementById('current-word');
  hintCountSpan = document.getElementById('hint-count');
  hintDisplay = document.getElementById('hint-display');
  hintText = document.getElementById('hint-text');
  remainingHintsSpan = document.getElementById('remaining-hints');

  // Thêm event listener cho hint button
  addHintButtonListener();

  // Nếu client đã biết currentWord, hiển thị ngay cho người vẽ
  if (currentWord && currentWordSpan) currentWordSpan.textContent = currentWord;
  if (currentWord && wordDisplay) wordDisplay.style.display = 'block';
});

socket.on('otherPlayerDrawing', () => {
  isDrawer = false;
  canGuess = true;
  document.getElementById('drawing-board__choice').style.display = 'none';
  document.getElementById('drawing-board__canvas').style.display = 'block';
  resizeCanvas();

  // Dừng tất cả timer chọn
  stopChoiceTimers();
});

socket.on('startRound', (data) => {
  document.querySelector('.drawing-board__progress').style.display = 'block';
  const duration = data?.duration || 45; // Lấy thời gian từ server, mặc định 45s
  const startTime = data?.startTime || Date.now(); // Timestamp từ server

  // Tính thời gian còn lại dựa trên timestamp từ server
  const elapsed = (Date.now() - startTime) / 1000;
  const remainingTime = Math.max(0, duration - elapsed);

  // Sử dụng thời gian còn lại để tạo progress bar mượt mà
  setProgressBar(remainingTime, 'drawing-board__canvas-fill', () => {
    setTimeout(() => {
      socket.emit('timeUp');
    }, 3000);
  });

  // Lưu thông tin để sync timer
  window.currentRoundData = { duration, startTime };
});

//Role
socket.on('role', (role) => {
  console.log('Received role:', role);

  // Khởi tạo lại hint elements
  hintButton = document.getElementById('hint-button');
  wordDisplay = document.getElementById('word-display');
  currentWordSpan = document.getElementById('current-word');
  hintCountSpan = document.getElementById('hint-count');
  hintDisplay = document.getElementById('hint-display');
  hintText = document.getElementById('hint-text');
  remainingHintsSpan = document.getElementById('remaining-hints');

  if (role === 'drawer') {
    isDrawer = true;
    canGuess = false;
    // Reset lượt gợi ý khi trở thành người vẽ mới
    hintCount = 3;
    updateHintButton();
    if (hintDisplay) hintDisplay.style.display = 'none';

    // Hiện first, ẩn second và canvas
    document.getElementById('drawing-board__choice').style.display = 'block';
    document.getElementById('drawing-board__first').style.display = 'flex';
    document.getElementById('drawing-board__second').style.display = 'none';
    document.getElementById('drawing-board__canvas').style.display = 'none';
  } else {
    isDrawer = false;
    canGuess = true;
    // Khi là người đoán, đảm bảo nút gợi ý bị vô hiệu hóa và ẩn khung gợi ý cũ
    updateHintButton();
    if (hintDisplay) hintDisplay.style.display = 'none';
    if (wordDisplay) wordDisplay.style.display = 'none';
    if (currentWordSpan) currentWordSpan.textContent = '';

    // Ẩn tất cả UI chọn vẽ, chỉ để canvas đoán
    document.getElementById('drawing-board__choice').style.display = 'none';
    document.getElementById('drawing-board__canvas').style.display = 'block';

    // KHÔNG cập nhật tên ở đây nữa vì không phải là drawer
  }
});

// ========== LẮNG NGHE CẬP NHẬT THÔNG TIN NGƯỜI VẼ ==========
// Lắng nghe sự kiện cập nhật thông tin người vẽ hiện tại
socket.on('updateCurrentDrawer', (drawerInfo) => {
  console.log('Updating current drawer to:', drawerInfo.name);
  currentDrawerName = drawerInfo.name;
  updateCurrentDrawerName(drawerInfo.name);
});

// Cập nhật khi game bắt đầu turn mới
socket.on('newTurnStarted', (gameState) => {
  console.log('New turn started, drawer:', gameState.currentDrawer);
  if (gameState.currentDrawer) {
    currentDrawerName = gameState.currentDrawer.name;
    updateCurrentDrawerName(gameState.currentDrawer.name);
  }
});

socket.on('clearCanvas', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  setCanvasBackground();
  chatBody.innerHTML = ''; // Xoá đoạn chat cũ

  // Dừng tất cả timer chọn
  stopChoiceTimers();
});

//Choose Word

function chooseWord(word) {
  // Dừng timer2 ngay khi chọn từ
  stopChoiceTimers();

  currentWord = word;
  if (currentWordSpan) currentWordSpan.textContent = word;
  if (wordDisplay) wordDisplay.style.display = 'block';

  socket.emit('selectedWord', word);
  document.getElementById('drawing-board__choice').style.display = 'none';
  document.getElementById('drawing-board__canvas').style.display = 'block';

  resizeCanvas();
  setProgressBar(45, 'drawing-board__canvas-fill', () => {
    setTimeout(() => {
      socket.emit('timeUp');
    }, 3000);
  });
}

socket.on('chooseWordOptions', (words) => {
  document.getElementById('drawing-board__choice').style.display = 'block';
  document.getElementById('drawing-board__canvas').style.display = 'none';

  const secondUI = document.getElementById('drawing-board__second');
  secondUI.style.display = 'flex';

  // Tìm phần .drawing-board__options
  const optionsContainer = secondUI.querySelector('.drawing-board__options');
  optionsContainer.innerHTML = ''; // Xoá các nút cũ nếu có

  // Thêm các nút mới vào .drawing-board__options
  words.forEach((word) => {
    const btn = document.createElement('button');
    btn.textContent = word;
    btn.classList.add('drawing-board__button');
    btn.onclick = () => chooseWord(word);
    optionsContainer.appendChild(btn);
  });

  // Bắt đầu timer cho bảng chọn từ
  startChoiceTimer2();
});

// (removed duplicate/incorrect selectedWord handler)

//Drawboard.js

function handleChoice(choice) {
  if (choice === 'draw') {
    // Ẩn first, hiển thị second
    document.getElementById('drawing-board__first').style.display = 'none';
    document.getElementById('drawing-board__second').style.display = 'flex';

    // Dừng timer1 trước khi request từ mới
    stopChoiceTimers();
    socket.emit('requestWordOptions');
  } else {
    socket.emit('skipDrawing');
    document.getElementById('drawing-board__choice').style.display = 'none';
    stopChoiceTimers();
  }
}

function setProgressBar(duration, barId, callback) {
  const fill = document.getElementById(barId);
  if (!fill) return;

  // Clear timer cũ nếu có
  if (window.currentProgressTimer) {
    clearTimeout(window.currentProgressTimer);
  }

  // Reset style
  fill.style.transition = 'none';
  fill.style.width = '100%';
  fill.style.background = '#4a98f7'; // Bắt đầu với màu xanh

  // Force reflow để đảm bảo trình duyệt nhận style mới
  void fill.offsetWidth;

  // Bắt đầu animation với transition mượt mà
  setTimeout(() => {
    fill.style.transition = `width ${duration}s cubic-bezier(0.4, 0.0, 0.2, 1)`;
    fill.style.width = '0%';

    // Tạo hiệu ứng chuyển màu dần dần từ xanh sang đỏ
    const startTime = Date.now();
    const colorInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = elapsed / duration;

      if (progress >= 1) {
        clearInterval(colorInterval);
        fill.style.background = '#ff0000'; // Màu đỏ khi hết thời gian
      } else {
        // Chuyển dần từ xanh (#4a98f7) sang đỏ (#ff0000)
        const red = Math.round(74 + (255 - 74) * progress);
        const green = Math.round(152 + (0 - 152) * progress);
        const blue = Math.round(247 + (0 - 247) * progress);
        fill.style.background = `rgb(${red}, ${green}, ${blue})`;
      }
    }, 200); // Cập nhật màu mỗi 200ms để mượt mà hơn
  }, 100);

  // Set timer mới
  window.currentProgressTimer = setTimeout(callback, duration * 1000);
}

// Hàm setChoiceProgressBar đã được thay thế bằng logic trực tiếp trong startChoiceTimer1 và startChoiceTimer2

// Hàm để bắt đầu thanh thời gian cho bảng chọn đầu tiên
function startChoiceTimer1() {
  const timerFill = document.getElementById('choice-timer-1');
  if (!timerFill) {
    console.log('Timer 1 element not found');
    return;
  }

  // Dừng timer cũ nếu có
  if (choiceTimer1) {
    clearTimeout(choiceTimer1);
    choiceTimer1 = null;
  }

  // Reset style
  timerFill.style.transition = 'none';
  timerFill.style.width = '100%';
  timerFill.style.background = '#4a98f7';

  // Force reflow
  void timerFill.offsetWidth;

  // Start animation
  setTimeout(() => {
    timerFill.style.transition = `width ${choiceTimerDuration}s linear`;
    timerFill.style.width = '0%';

    // Tạo hiệu ứng chuyển màu dần dần từ xanh sang đỏ
    const startTime = Date.now();
    const colorInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = elapsed / choiceTimerDuration;

      if (progress >= 1) {
        clearInterval(colorInterval);
        timerFill.style.background = '#ff0000'; // Màu đỏ khi hết thời gian

        // Chỉ kick khi timer thực sự chạy xong
        if (choiceTimer1) {
          alert('⏰ Time is up! You have been kicked for AFK!');
          socket.disconnect();
          window.location.href = '/';
        }
      } else {
        // Chuyển dần từ xanh (#4a98f7) sang đỏ (#ff0000)
        const red = Math.round(74 + (255 - 74) * progress);
        const green = Math.round(152 + (0 - 152) * progress);
        const blue = Math.round(247 + (0 - 247) * progress);
        timerFill.style.background = `rgb(${red}, ${green}, ${blue})`;
      }
    }, 100);

    // Set timeout cho việc kick
    choiceTimer1 = setTimeout(() => {
      choiceTimer1 = null; // Reset để tránh kick nhiều lần
    }, choiceTimerDuration * 1000);
  }, 50);
}

function startChoiceTimer2() {
  const timerFill = document.getElementById('choice-timer-2');
  if (!timerFill) return;

  // Dừng timer cũ nếu có
  if (choiceTimer2) {
    clearTimeout(choiceTimer2);
    choiceTimer2 = null;
  }

  // Reset style
  timerFill.style.transition = 'none';
  timerFill.style.width = '100%';
  timerFill.style.background = '#4a98f7';

  // Force reflow
  void timerFill.offsetWidth;

  // Start animation
  setTimeout(() => {
    timerFill.style.transition = `width ${choiceTimerDuration}s linear`;
    timerFill.style.width = '0%';

    // Tạo hiệu ứng chuyển màu dần dần từ xanh sang đỏ
    const startTime = Date.now();
    const colorInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = elapsed / choiceTimerDuration;

      if (progress >= 1) {
        clearInterval(colorInterval);
        timerFill.style.background = '#ff0000'; // Màu đỏ khi hết thời gian

        // Chỉ kick khi timer thực sự chạy xong và là người vẽ
        if (choiceTimer2 && isDrawer) {
          alert('⏰ Time is up! You have been kicked for AFK!');
          socket.disconnect();
          window.location.href = '/';
        }
      } else {
        // Chuyển dần từ xanh (#4a98f7) sang đỏ (#ff0000)
        const red = Math.round(74 + (255 - 74) * progress);
        const green = Math.round(152 + (0 - 152) * progress);
        const blue = Math.round(247 + (0 - 247) * progress);
        timerFill.style.background = `rgb(${red}, ${green}, ${blue})`;
      }
    }, 100);

    // Set timeout cho việc kick
    choiceTimer2 = setTimeout(() => {
      choiceTimer2 = null; // Reset để tránh kick nhiều lần
    }, choiceTimerDuration * 1000);
  }, 50);
}
