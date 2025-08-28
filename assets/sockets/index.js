module.exports = (io) => {
    // Import gameSocket
    const gameSocket = require("./gameSocket")

    // Khởi tạo game socket với io
    gameSocket(io)
}
