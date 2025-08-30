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
let hintCount = 3
let currentWord = ""
let hintButton = document.getElementById("hint-button")
let wordDisplay = document.getElementById("word-display")
let currentWordSpan = document.getElementById("current-word")
let hintCountSpan = document.getElementById("hint-count")
let hintDisplay = document.getElementById("hint-display")
let hintText = document.getElementById("hint-text")
let remainingHintsSpan = document.getElementById("remaining-hints")

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