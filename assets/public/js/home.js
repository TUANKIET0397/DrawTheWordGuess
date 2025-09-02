document.addEventListener("DOMContentLoaded", function () {
    const btn = document.getElementById("play-button")
    const input = document.getElementById("playerName")

    function startGame() {
        const name = input.value.trim()
        if (!name) {
            alert("Please enter your name!")
            return
        }
        // Lưu tên player vào localStorage
        localStorage.setItem("playerName", name)
        window.location.href = "/player?playerName=" + encodeURIComponent(name)
    }

    // Sự kiện click
    btn.addEventListener("click", function (e) {
        e.preventDefault() // Ngăn submit form mặc định
        startGame()
    })

    // Sự kiện Enter trong input
    input.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault() // Ngăn form submit mặc định
            startGame()
        }
    })
})
