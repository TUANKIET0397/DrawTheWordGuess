const path = require('path');
const express = require('express');
const morgan = require('morgan');
const { engine } = require('express-handlebars');
const ngrok = require('ngrok');
const http = require('http');
const { Server } = require('socket.io');
const { Player } = require('./app/models');

const app = express();
const port = 1607;

const route = require('./routes');

// middleware
app.use(express.urlencoded({ extended: true })); // xử lý dữ liệu từ form
app.use(express.json()); // xử lý dữ liệu json

// xử lý dạng file tĩnh
app.use(express.static(path.join(__dirname, 'public')));

app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use('/favicon', express.static(path.join(__dirname, 'favicon')));
// HTTP logger
app.use(morgan('combined'));

// template engine
app.engine(
  '.hbs',
  engine({
    extname: '.hbs',
    allowProtoPropertiesByDefault: true,
    helpers: {
      block: function (name) {
        this._blocks = this._blocks || {};
        const val = (this._blocks[name] || []).join('\n');
        return val;
      },
      contentFor: function (name, options) {
        this._blocks = this._blocks || {};
        this._blocks[name] = this._blocks[name] || [];
        this._blocks[name].push(options.fn(this));
      },
    },
  })
);

app.set('view engine', '.hbs');
// set views directory - render xong nhảy vào đây tìm
app.set('views', path.join(__dirname, 'resources', 'views'));

//IO - Tạo HTTP server từ Express app
const server = http.createServer(app);
const io = new Server(server);

// Import socket handlers
const initializeSocket = require('./sockets');
initializeSocket(io);

// nạp route vào app
app.get('/', (req, res) => {
  res.render('home', {
    ngrokUrl: global.ngrokUrl || `http://localhost:${port}`,
    title: 'Home',
  });
});

// API login hoặc tạo mới player
app.get('/api/player', async (req, res) => {
  const playerName = req.query.playerName;
  console.log('Received playerName:', playerName);

  if (!playerName) {
    return res.status(400).json({ error: 'playerName is required' });
  }

  try {
    console.log('Searching for player...');
    let player = await Player.findOne({ where: { player_name: playerName } });
    console.log('Found player:', player);

    if (!player) {
      console.log('Creating new player...');
      player = await Player.create({
        player_name: playerName,
        socket_id: 'default_socket',
        avatar: 'default.png',
      });
      console.log('Created player:', player);
    }

    res.json({
      id: player.id,
      playerName: player.player_name,
      socket_id: player.socket_id,
      avatar: player.avatar,
      score: player.score,
      status: 'online',
      message: 'Welcome to the game!',
    });
  } catch (error) {
    console.error('Detailed error:', error); // Log chi tiết lỗi
    res.status(500).json({
      error: 'Failed to process player',
      details: error.message, // Trả về chi tiết lỗi (chỉ dùng khi debug)
    });
  }
});

// Sử dụng route từ file routes/site.js
const drawRoute = require('./routes/site');
app.use('/', drawRoute);

server.listen(port, async () => {
  console.log(`Server listening on port ${port}`);

  try {
    // Khởi tạo tunnel ngrok
    const url = await ngrok.connect(port);
    console.log(`🌐 Public URL: ${url}`);

    // Lưu vào global variable để dùng ở các file khác
    global.ngrokUrl = url;
  } catch (error) {
    console.error('❌ Ngrok connection failed:', error);
    global.ngrokUrl = `http://localhost:${port}`; // Fallback
  }
});
