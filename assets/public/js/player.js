// ==================== DOM ELEMENTS ====================
const canvas = document.querySelector("canvas"),
    toolBtns = document.querySelectorAll(".tool"),
    fillColor = document.querySelector("#fill-color"),
    sizeSlider = document.querySelector("#size-slider"),
    colorBtns = document.querySelectorAll(".colors .option"),
    colorPicker = document.querySelector("#color-picker"),
    clearCanvas = document.querySelector(".clear-canvas"),
    saveImg = document.querySelector(".save-img"),
    ctx = canvas.getContext("2d")

// ==================== GLOBAL VARIABLES ====================
let prevMouseX,
    prevMouseY,
    snapshot,
    isDrawing = false
let selectedTool = "brush"
let brushWidth = 5
let selectedColor = "#000"
let lastX, lastY
let canPlay = false
let isDrawer = false
let canGuess = false

// ==================== HINT SYSTEM VARIABLES ====================
let hintCount = 3
let currentWord = ""
let hintButton = document.getElementById("hint-button")
let wordDisplay = document.getElementById("word-display")
let currentWordSpan = document.getElementById("current-word")
let hintCountSpan = document.getElementById("hint-count")
let hintDisplay = document.getElementById("hint-display")
let hintText = document.getElementById("hint-text")
let remainingHintsSpan = document.getElementById("remaining-hints")

// ==================== CHOICE TIMER VARIABLES ====================
let choiceTimer1 = null
let choiceTimer2 = null
let choiceTimerDuration = 10 // 10 giây

// ==================== SOCKET CONNECTION ====================
const socket = io()

// ==================== CANVAS FUNCTIONS ====================
const setCanvasBackground = () => {
    ctx.fillStyle = "#fff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = selectedColor
}

const resizeCanvas = () => {
    const oldWidth = canvas.width
    const oldHeight = canvas.height
    let tempImage = null

    if (oldWidth > 0 && oldHeight > 0) {
        tempImage = ctx.getImageData(0, 0, oldWidth, oldHeight)
    }

    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    setCanvasBackground()

    if (tempImage) {
        const tempCanvas = document.createElement("canvas")
        tempCanvas.width = oldWidth
        tempCanvas.height = oldHeight
        const tempCtx = tempCanvas.getContext("2d")
        tempCtx.putImageData(tempImage, 0, 0)

        const scaleX = canvas.width / oldWidth
        const scaleY = canvas.height / oldHeight
        ctx.scale(scaleX, scaleY)
        ctx.drawImage(tempCanvas, 0, 0)
        ctx.setTransform(1, 0, 0, 1, 0, 0)
    }
}

// ==================== DRAWING FUNCTIONS ====================
const startDraw = (e) => {
    if (!isDrawer) return
    isDrawing = true
    prevMouseX = e.offsetX
    prevMouseY = e.offsetY
    lastX = e.offsetX
    lastY = e.offsetY

    ctx.beginPath()
    ctx.lineWidth = brushWidth
    ctx.strokeStyle = selectedColor
    ctx.fillStyle = selectedColor
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height)
}

const drawing = (e) => {
    if (!isDrawing || !isDrawer) return
    ctx.putImageData(snapshot, 0, 0)

    const currentX = e.offsetX
    const currentY = e.offsetY

    ctx.strokeStyle = selectedTool === "eraser" ? "#fff" : selectedColor
    ctx.lineTo(e.offsetX, e.offsetY)
    ctx.stroke()

    // Gửi dữ liệu vẽ
    if (typeof lastX === "number" && typeof lastY === "number") {
        socket.emit("drawing", {
            prevX: lastX,
            prevY: lastY,
            x: currentX,
            y: currentY,
            color: selectedTool === "eraser" ? "#fff" : selectedColor,
            width: brushWidth,
        })
    }

    lastX = currentX
    lastY = currentY
}

// ==================== PROGRESS BAR FUNCTIONS ====================
function setProgressBar(duration, barId, callback) {
    const fill = document.getElementById(barId)
    if (!fill) return

    // Clear timer cũ nếu có
    if (window.currentProgressTimer) {
        clearTimeout(window.currentProgressTimer)
    }

    // Reset style
    fill.style.transition = "none"
    fill.style.width = "100%"
    fill.style.background = "#4a98f7"

    // Force reflow để đảm bảo trình duyệt nhận style mới
    void fill.offsetWidth

    // Bắt đầu animation với transition mượt mà
    setTimeout(() => {
        fill.style.transition = `width ${duration}s cubic-bezier(0.4, 0.0, 0.2, 1)`
        fill.style.width = "0%"

        // Tạo hiệu ứng chuyển màu dần dần từ xanh sang đỏ
        const startTime = Date.now()
        const colorInterval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000
            const progress = elapsed / duration

            if (progress >= 1) {
                clearInterval(colorInterval)
                fill.style.background = "#ff0000"
            } else {
                const red = Math.round(74 + (255 - 74) * progress)
                const green = Math.round(152 + (0 - 152) * progress)
                const blue = Math.round(247 + (0 - 247) * progress)
                fill.style.background = `rgb(${red}, ${green}, ${blue})`
            }
        }, 200)
    }, 100)

    // Set timer mới
    window.currentProgressTimer = setTimeout(callback, duration * 1000)
}

// ==================== CHOICE TIMER FUNCTIONS ====================
function startChoiceTimer1() {
    const timerFill = document.getElementById("choice-timer-1")
    if (!timerFill) return

    // Dừng timer cũ nếu có
    if (choiceTimer1) {
        clearTimeout(choiceTimer1)
        choiceTimer1 = null
    }

    // Reset style
    timerFill.style.transition = "none"
    timerFill.style.width = "100%"
    timerFill.style.background = "#4a98f7"

    // Force reflow
    void timerFill.offsetWidth

    // Start animation
    setTimeout(() => {
        timerFill.style.transition = `width ${choiceTimerDuration}s linear`
        timerFill.style.width = "0%"

        // Tạo hiệu ứng chuyển màu dần dần từ xanh sang đỏ
        const startTime = Date.now()
        const colorInterval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000
            const progress = elapsed / choiceTimerDuration

            if (progress >= 1) {
                clearInterval(colorInterval)
                timerFill.style.background = "#ff0000"

                if (choiceTimer1) {
                    alert("⏰ Time is up! You have been kicked for AFK!")
                    socket.disconnect()
                    window.location.href = "/"
                }
            } else {
                const red = Math.round(74 + (255 - 74) * progress)
                const green = Math.round(152 + (0 - 152) * progress)
                const blue = Math.round(247 + (0 - 247) * progress)
                timerFill.style.background = `rgb(${red}, ${green}, ${blue})`
            }
        }, 100)

        choiceTimer1 = setTimeout(() => {
            choiceTimer1 = null
        }, choiceTimerDuration * 1000)
    }, 50)
}

function startChoiceTimer2() {
    const timerFill = document.getElementById("choice-timer-2")
    if (!timerFill) return

    // Dừng timer cũ nếu có
    if (choiceTimer2) {
        clearTimeout(choiceTimer2)
        choiceTimer2 = null
    }

    // Reset style
    timerFill.style.transition = "none"
    timerFill.style.width = "100%"
    timerFill.style.background = "#4a98f7"

    // Force reflow
    void timerFill.offsetWidth

    // Start animation
    setTimeout(() => {
        timerFill.style.transition = `width ${choiceTimerDuration}s linear`
        timerFill.style.width = "0%"

        // Tạo hiệu ứng chuyển màu dần dần từ xanh sang đỏ
        const startTime = Date.now()
        const colorInterval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000
            const progress = elapsed / choiceTimerDuration

            if (progress >= 1) {
                clearInterval(colorInterval)
                timerFill.style.background = "#ff0000"

                if (choiceTimer2 && isDrawer) {
                    alert("⏰ Time is up! You have been kicked for AFK!")
                    socket.disconnect()
                    window.location.href = "/"
                }
            } else {
                const red = Math.round(74 + (255 - 74) * progress)
                const green = Math.round(152 + (0 - 152) * progress)
                const blue = Math.round(247 + (0 - 247) * progress)
                timerFill.style.background = `rgb(${red}, ${green}, ${blue})`
            }
        }, 100)

        choiceTimer2 = setTimeout(() => {
            choiceTimer2 = null
        }, choiceTimerDuration * 1000)
    }, 50)
}

function stopChoiceTimers() {
    // Clear timeouts
    if (choiceTimer1) {
        clearTimeout(choiceTimer1)
        choiceTimer1 = null
    }
    if (choiceTimer2) {
        clearTimeout(choiceTimer2)
        choiceTimer2 = null
    }

    // Reset style cho cả 2 timer
    const timer1 = document.getElementById("choice-timer-1")
    const timer2 = document.getElementById("choice-timer-2")

    if (timer1) {
        timer1.style.transition = "none"
        timer1.style.width = "100%"
        timer1.style.background = "#4a98f7"
    }
    if (timer2) {
        timer2.style.transition = "none"
        timer2.style.width = "100%"
        timer2.style.background = "#4a98f7"
    }
}

// ==================== GAME LOGIC FUNCTIONS ====================
function showCanvasWaiting() {
    document.getElementById("drawing-board__canvas").style.display = "block"
    document.getElementById("drawing-board__choice").style.display = "none"
    if (!isDrawing) {
        document.querySelector(".drawing-board__progress").style.display =
            "none"
    }
}

function updateCurrentDrawerName(drawerName) {
    const usernameElements = document.querySelectorAll(
        ".drawing-board__username"
    )
    usernameElements.forEach((element) => {
        element.textContent = drawerName || "Đang chờ..."
    })
}

function chooseWord(word) {
    stopChoiceTimers()

    currentWord = word
    if (currentWordSpan) currentWordSpan.textContent = word
    if (wordDisplay) wordDisplay.style.display = "block"

    socket.emit("selectedWord", word)
    document.getElementById("drawing-board__choice").style.display = "none"
    document.getElementById("drawing-board__canvas").style.display = "block"

    resizeCanvas()
    setProgressBar(45, "drawing-board__canvas-fill", () => {
        setTimeout(() => {
            socket.emit("timeUp")
        }, 3000)
    })
}

function handleChoice(choice) {
    if (choice === "draw") {
        document.getElementById("drawing-board__first").style.display = "none"
        document.getElementById("drawing-board__second").style.display = "flex"
        stopChoiceTimers()
        socket.emit("requestWordOptions")
    } else {
        socket.emit("skipDrawing")
        document.getElementById("drawing-board__choice").style.display = "none"
        stopChoiceTimers()
    }
}

function startDrawing() {
    document.getElementById("drawing-board__choice").style.display = "none"
    document.getElementById("drawing-board__canvas").style.display = "flex"
    stopChoiceTimers()

    requestAnimationFrame(() => {
        resizeCanvas()
        setProgressBar(45, "drawing-board__canvas-fill", () => {
            setTimeout(() => {
                socket.emit("timeUp")
            }, 3000)
        })
    })
}

function updateRankingBoard(rankings, durationSec = 8) {
    const items = document.querySelectorAll(".ranking-board__item")

    rankings.forEach((player, index) => {
        const item = items[index]
        if (item) {
            item.querySelector(".ranking-board__name").textContent = player.name
            item.querySelector(".ranking-board__score").textContent =
                player.score
        }
    })

    const progressFill = document.querySelector(".ranking-board__progress-fill")
    progressFill.style.transition = "none"
    progressFill.style.width = "100%"
    void progressFill.offsetWidth
    progressFill.style.transition = `width ${durationSec}s linear`
    progressFill.style.width = "0"
}

function registerPlayer() {
    const storedName = localStorage.getItem("playerName")
    if (!storedName) {
        window.location.href = "/"
        return
    }
    socket.emit("joinGame", storedName)
}

// ==================== HINT SYSTEM FUNCTIONS ====================
function updateHintButton() {
    if (hintCountSpan) hintCountSpan.textContent = hintCount
    if (hintButton) {
        hintButton.disabled = !isDrawer || hintCount <= 0
        if (hintCount <= 0) hintButton.textContent = "Hết gợi ý"
    }
}

function addHintButtonListener() {
    if (hintButton && !hintButton.hasAttribute("data-listener-added")) {
        hintButton.addEventListener("click", () => {
            if (!isDrawer) return
            if (hintCount > 0 && currentWord) {
                const hintLevel = 4 - hintCount
                socket.emit("requestHint", {
                    word: currentWord,
                    hintLevel,
                })
            }
        })
        hintButton.setAttribute("data-listener-added", "true")
    }
}

// ==================== EVENT LISTENERS ====================
// Canvas events
canvas.addEventListener("mousedown", startDraw)
canvas.addEventListener("mousemove", drawing)
canvas.addEventListener("mouseup", () => (isDrawing = false))

// Tool selection
toolBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        document.querySelector(".options .active").classList.remove("active")
        btn.classList.add("active")
        selectedTool = btn.id
    })
})

// Color selection
colorBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        document
            .querySelector(".options .selected")
            .classList.remove("selected")
        btn.classList.add("selected")
        selectedColor = window
            .getComputedStyle(btn)
            .getPropertyValue("background-color")
    })
})

// Size slider
sizeSlider.addEventListener("change", () => (brushWidth = sizeSlider.value))

// Color picker
colorPicker.addEventListener("change", () => {
    colorPicker.parentElement.style.background = colorPicker.value
    colorPicker.parentElement.click()
})

// Canvas actions
clearCanvas.addEventListener("click", () => socket.emit("clearImg"))
saveImg.addEventListener("click", () => {
    const link = document.createElement("a")
    link.download = `${Date.now()}.jpg`
    link.href = canvas.toDataURL()
    link.click()
})

// Chat input
const chatInput = document.querySelector(".chat_input")
const chatBody = document.querySelector(".chat_body")
chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && chatInput.value.trim() !== "") {
        if (!canGuess) return
        socket.emit("guess", chatInput.value.trim())
        chatInput.value = ""
    }
})

// Out game button
document.addEventListener("DOMContentLoaded", () => {
    const outgame = document.getElementById("out-game")
    if (outgame) {
        outgame.addEventListener("click", () => {
            window.location.href = "/"
        })
    }
})

// Window resize
window.addEventListener("resize", resizeCanvas)

// ==================== SOCKET EVENT HANDLERS ====================
// Game state events
socket.on("startGame", () => {
    canPlay = true
    document.getElementById("drawing-board__first").style.display = "flex"
    document.querySelector(".drawing-board__progress").style.display = "block"
})

socket.on("waiting", () => {
    showCanvasWaiting()
    alert("Waiting for other players")
})

socket.on("startRound", (data) => {
    document.querySelector(".drawing-board__progress").style.display = "block"
    const duration = data?.duration || 45
    const startTime = data?.startTime || Date.now()

    const elapsed = (Date.now() - startTime) / 1000
    const remainingTime = Math.max(0, duration - elapsed)

    setProgressBar(remainingTime, "drawing-board__canvas-fill", () => {
        setTimeout(() => {
            socket.emit("timeUp")
        }, 3000)
    })

    window.currentRoundData = { duration, startTime }
})

socket.on("stopTimer", () => {
    if (window.currentProgressTimer) {
        clearTimeout(window.currentProgressTimer)
        window.currentProgressTimer = null
    }

    const fill = document.getElementById("drawing-board__canvas-fill")
    if (fill) {
        fill.style.transition = "width 0.3s ease-out"
        fill.style.width = "0%"

        setTimeout(() => {
            fill.style.transition = "none"
            fill.style.background = "#4a98f7"
        }, 300)
    }

    window.currentRoundData = null
})

// Role and turn events
socket.on("role", (role) => {
    // Khởi tạo lại hint elements
    hintButton = document.getElementById("hint-button")
    wordDisplay = document.getElementById("word-display")
    currentWordSpan = document.getElementById("current-word")
    hintCountSpan = document.getElementById("hint-count")
    hintDisplay = document.getElementById("hint-display")
    hintText = document.getElementById("hint-text")
    remainingHintsSpan = document.getElementById("remaining-hints")

    if (role === "drawer") {
        isDrawer = true
        canGuess = false
        hintCount = 3
        updateHintButton()
        if (hintDisplay) hintDisplay.style.display = "none"

        document.getElementById("drawing-board__choice").style.display = "block"
        document.getElementById("drawing-board__first").style.display = "flex"
        document.getElementById("drawing-board__second").style.display = "none"
        document.getElementById("drawing-board__canvas").style.display = "none"
    } else {
        isDrawer = false
        canGuess = true
        updateHintButton()
        if (hintDisplay) hintDisplay.style.display = "none"
        if (wordDisplay) wordDisplay.style.display = "none"
        if (currentWordSpan) currentWordSpan.textContent = ""

        document.getElementById("drawing-board__choice").style.display = "none"
        document.getElementById("drawing-board__canvas").style.display = "block"
    }
})

socket.on("yourTurnToDraw", () => {
    isDrawer = true
    canGuess = false
    document.getElementById("drawing-board__choice").style.display = "block"
    stopChoiceTimers()
    startChoiceTimer1()
})

socket.on("startDrawing", () => {
    isDrawer = true
    document.getElementById("drawing-board__choice").style.display = "none"
    document.getElementById("drawing-board__canvas").style.display = "block"
    resizeCanvas()
    stopChoiceTimers()

    // Khởi tạo lại hint elements
    hintButton = document.getElementById("hint-button")
    wordDisplay = document.getElementById("word-display")
    currentWordSpan = document.getElementById("current-word")
    hintCountSpan = document.getElementById("hint-count")
    hintDisplay = document.getElementById("hint-display")
    hintText = document.getElementById("hint-text")
    remainingHintsSpan = document.getElementById("remaining-hints")

    addHintButtonListener()

    if (currentWord && currentWordSpan)
        currentWordSpan.textContent = currentWord
    if (currentWord && wordDisplay) wordDisplay.style.display = "block"
})

socket.on("otherPlayerDrawing", () => {
    isDrawer = false
    canGuess = true
    document.getElementById("drawing-board__choice").style.display = "none"
    document.getElementById("drawing-board__canvas").style.display = "block"
    resizeCanvas()
    stopChoiceTimers()
})

// Game flow events
socket.on("chooseWordOptions", (words) => {
    document.getElementById("drawing-board__choice").style.display = "block"
    document.getElementById("drawing-board__canvas").style.display = "none"

    const secondUI = document.getElementById("drawing-board__second")
    secondUI.style.display = "flex"

    const optionsContainer = secondUI.querySelector(".drawing-board__options")
    optionsContainer.innerHTML = ""

    words.forEach((word) => {
        const btn = document.createElement("button")
        btn.textContent = word
        btn.classList.add("drawing-board__button")
        btn.onclick = () => chooseWord(word)
        optionsContainer.appendChild(btn)
    })

    startChoiceTimer2()
})

socket.on("newTurnStarted", (gameState) => {
    if (gameState.currentDrawer) {
        updateCurrentDrawerName(gameState.currentDrawer.name)
    }
})

socket.on("updateCurrentDrawer", (drawerInfo) => {
    updateCurrentDrawerName(drawerInfo.name)
})

// Canvas and drawing events
socket.on("clear", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setCanvasBackground()
})

socket.on("clearCanvas", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setCanvasBackground()
    chatBody.innerHTML = ""
    stopChoiceTimers()
})

socket.on("drawing", (data) => {
    if (
        typeof data.prevX !== "number" ||
        typeof data.prevY !== "number" ||
        typeof data.x !== "number" ||
        typeof data.y !== "number"
    )
        return

    ctx.beginPath()
    ctx.strokeStyle = data.color
    ctx.lineWidth = data.width
    ctx.moveTo(data.prevX, data.prevY)
    ctx.lineTo(data.x, data.y)
    ctx.stroke()
})

// Chat and guess events
socket.on("guess", (data) => {
    const div = document.createElement("div")
    div.classList.add("guess")
    div.textContent = `👤 ${data.username}: ${data.guess}`
    chatBody.appendChild(div)
    chatBody.scrollTop = chatBody.scrollHeight
})

// Hint events
socket.on("showHint", (data) => {
    hintCount = Math.max(0, Number(data?.remainingHints) || hintCount)
    updateHintButton()
    if (hintText) hintText.textContent = data?.hint || ""
    if (remainingHintsSpan) remainingHintsSpan.textContent = String(hintCount)
    if (hintDisplay) {
        hintDisplay.style.display = "block"
        setTimeout(() => {
            hintDisplay.style.display = "none"
        }, 5000)
    }
})

// Player management events
socket.on("updatePlayers", (players) => {
    const sidebar = document.querySelector(".player-drawing .player_playing")
    if (!sidebar) return

    sidebar.innerHTML = ""

    const currentDrawer = players.find((p) => p.role === "drawer")

    players.forEach((p) => {
        const playerDiv = document.createElement("div")
        playerDiv.classList.add("player")

        const drawerIcon = p.role === "drawer" ? "✏️ " : ""

        playerDiv.innerHTML = `
      <div class="player_main">
        <div class="player_avatar">
          <img src="/img/avatar/${p.avatar || "avt1.jpg"}" alt="Avatar" />
        </div>
        <div class="player_detail">
          <div class="player_name">${drawerIcon}${p.name}</div>
          <div class="player_score">${
              p.score
          } <p class="player_score_text">pts</p></div>
        </div>
      </div>
      ${
          p.isCorrect
              ? `
        <div class="greentick">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10L8 14L16 6" stroke="#28a745" stroke-width="2" fill="none"/>
          </svg>
        </div>
      `
              : ""
      }
    `

        sidebar.appendChild(playerDiv)
    })
})

// Game initialization events
socket.on("init", (data) => {
    const container = document.getElementById("drawing-board__canvas")
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight
    setCanvasBackground()

    data.drawHistory.forEach((line) => {
        if (
            typeof line.prevX !== "number" ||
            typeof line.prevY !== "number" ||
            typeof line.x !== "number" ||
            typeof line.y !== "number"
        )
            return

        ctx.beginPath()
        ctx.strokeStyle = line.color
        ctx.lineWidth = line.width
        ctx.moveTo(line.prevX, line.prevY)
        ctx.lineTo(line.x, line.y)
        ctx.stroke()
    })

    data.guessHistory.forEach((g) => {
        const div = document.createElement("div")
        div.classList.add("guess")
        div.textContent = `👤 ${g.username}: ${g.guess}`
        chatBody.appendChild(div)
    })

    chatBody.scrollTop = chatBody.scrollHeight
})

// Ranking events
socket.on("showRankings", (data) => {
    const rankingBoard = document.querySelector(".ranking-board")
    const wd = document.getElementById("word-display")
    const prog = document.querySelector(".drawing-board__progress")

    if (wd) wd.style.display = "none"
    if (prog) prog.style.display = "none"

    rankingBoard.style.display = "flex"
    rankingBoard.style.flexDirection = "column"

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            updateRankingBoard(data.players, data.duration || 8)
        })
    })

    setTimeout(() => {
        rankingBoard.style.display = "none"
    }, (data.duration || 8) * 1000 + 200)
})

// Game reset events
socket.on("resetGame", (data) => {
    isDrawer = false
    const oldWordDisplay = document.querySelector(".current-word-display")
    if (oldWordDisplay) {
        oldWordDisplay.remove()
    }

    const urlParams = new URLSearchParams(window.location.search)
    const playerName = urlParams.get("playerName")
    if (playerName) {
        document.querySelector(".player-name").textContent = playerName
    }
})

// Connection events
socket.on("connect", () => {
    currentDrawerName = "Đang chờ..."
    updateCurrentDrawerName("Đang chờ...")

    // Khởi tạo hint elements
    hintButton = document.getElementById("hint-button")
    wordDisplay = document.getElementById("word-display")
    currentWordSpan = document.getElementById("current-word")
    hintCountSpan = document.getElementById("hint-count")
    hintDisplay = document.getElementById("hint-display")
    hintText = document.getElementById("hint-text")
    remainingHintsSpan = document.getElementById("remaining-hints")

    registerPlayer()
})

socket.on("reconnect", (attemptNumber) => {
    currentDrawerName = "Đang chờ..."
    updateCurrentDrawerName("Đang chờ...")

    // Khởi tạo hint elements
    hintButton = document.getElementById("hint-button")
    wordDisplay = document.getElementById("word-display")
    currentWordSpan = document.getElementById("current-word")
    hintCountSpan = document.getElementById("hint-count")
    hintDisplay = document.getElementById("hint-display")
    hintText = document.getElementById("hint-text")
    remainingHintsSpan = document.getElementById("remaining-hints")

    registerPlayer()
})

// ==================== QR CODE FUNCTIONALITY ====================
const ngrokUrl = window.ngrokUrl
const shareBtn = document.querySelector(".share")
const qrCode = document.querySelector(".qr-code")
const qrImg = qrCode.querySelector("img")
let isVisible = false

shareBtn.addEventListener("click", () => {
    if (!isVisible) {
        const gameUrl = `${ngrokUrl}`
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
            gameUrl
        )}`
        qrCode.classList.add("show")
        shareBtn.textContent = "Hide"
        isVisible = true
    } else {
        qrCode.classList.remove("show")
        shareBtn.textContent = "Share"
        isVisible = false
    }
})

// ==================== INITIALIZATION ====================
window.onload = function () {
    // Khởi tạo hint elements
    hintButton = document.getElementById("hint-button")
    wordDisplay = document.getElementById("word-display")
    currentWordSpan = document.getElementById("current-word")
    hintCountSpan = document.getElementById("hint-count")
    hintDisplay = document.getElementById("hint-display")
    hintText = document.getElementById("hint-text")
    remainingHintsSpan = document.getElementById("remaining-hints")

    setProgressBar(10, "drawing-board__progress-fill", () => startDrawing())
}

// Thêm event listener khi DOM load
document.addEventListener("DOMContentLoaded", () => {
    addHintButtonListener()
})

// Khởi tạo biến global
let currentDrawerName = "Đang chờ..."
