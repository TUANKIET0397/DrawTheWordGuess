const path = require("path")
const express = require("express")
const morgan = require("morgan")
const { engine } = require("express-handlebars")
const ngrok = require("ngrok")
const http = require("http")
const { Server } = require("socket.io")

const app = express()
const port = 1607

const route = require("./routes")

// middleware
app.use(express.urlencoded({ extended: true })) // xử lý dữ liệu từ form
app.use(express.json()) // xử lý dữ liệu json

// xử lý dạng file tĩnh
app.use(express.static(path.join(__dirname, "public")))

app.use("/js", express.static(path.join(__dirname, "js")))
app.use("/img", express.static(path.join(__dirname, "img")))
// HTTP logger
app.use(morgan("combined"))

// template engine
// app.engine(
//     ".hbs",
//     engine({
//         extname: ".hbs",
//         allowProtoPropertiesByDefault: true,
//     })
// )

// template engine
app.engine(
    ".hbs",
    engine({
        extname: ".hbs",
        allowProtoPropertiesByDefault: true,
        helpers: {
            block: function (name) {
                this._blocks = this._blocks || {}
                const val = (this._blocks[name] || []).join("\n")
                return val
            },
            contentFor: function (name, options) {
                this._blocks = this._blocks || {}
                this._blocks[name] = this._blocks[name] || []
                this._blocks[name].push(options.fn(this))
            },
        },
    })
)

app.set("view engine", ".hbs")
// set views directory - render xong nhảy vào đây tìm
app.set("views", path.join(__dirname, "resources", "views"))

//IO - Tạo HTTP server từ Express app
const server = http.createServer(app)
const io = new Server(server)

// Import socket handlers
const initializeSocket = require("./sockets")
initializeSocket(io)

// nạp route vào app
app.get("/", (req, res) => {
    res.render("home", {
        ngrokUrl: global.ngrokUrl || `http://localhost:${port}`,
    })
})

const drawRoute = require("./routes/site")
app.use("/", drawRoute)

server.listen(port, async () => {
    console.log(`Server listening on port ${port}`)

    try {
        // Khởi tạo tunnel ngrok
        const url = await ngrok.connect(port)
        console.log(`🌐 Public URL: ${url}`)

        // Lưu vào global variable để dùng ở các file khác
        global.ngrokUrl = url
    } catch (error) {
        console.error("❌ Ngrok connection failed:", error)
        global.ngrokUrl = `http://localhost:${port}` // Fallback
    }
})
