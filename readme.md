# 🎨 Vẽ Hình Đoán Chữ với Nodejs

“Vẽ Hình Đoán Chữ” là một trò chơi tương tác vui nhộn, nơi người chơi thể hiện khả năng sáng tạo qua việc vẽ hình minh họa để người khác đoán từ khóa hoặc cụm từ bí mật. Game kết hợp giữa nghệ thuật, trí tuệ và sự hài hước, mang lại trải nghiệm giải trí độc đáo cho nhóm bạn hoặc gia đình.

---

## 🚀 Mục tiêu dự án

Dự án nhằm xây dựng một trò chơi đơn giản, dễ tiếp cận, giúp người chơi rèn luyện khả năng tư duy hình ảnh, giao tiếp phi ngôn ngữ và tăng sự gắn kết trong tập thể. Game có thể triển khai trên nền tảng web, ứng dụng di động hoặc tích hợp trong các hệ thống học tập tương tác.

---

## 🖌️ Cách chơi

-   Một người chơi được giao một từ khóa bí mật (ví dụ: “con mèo”, “máy bay”, “tình yêu”).

-   Người đó sẽ vẽ hình minh họa cho từ khóa đó trên màn hình.

-   Những người chơi còn lại sẽ quan sát hình vẽ và cố gắng đoán từ khóa trong thời gian giới hạn.

-   Người đoán đúng sẽ ghi điểm, và lượt chơi sẽ chuyển sang người tiếp theo.

---

## 📜 Luật chơi cơ bản

-   **Thời gian**: mỗi lượt chơi kéo dài 50s
-   **Người chơi**: từ 3 người trở lên
-   **Tính năng AFK**: nếu không chọn ở giai đoạn vẽ trong 10s, hệ thống sẽ tự động kick

---

## 💻Hướng dẫn chạy dự án tạo dự án

Dự án này chạy bằng **Node.js**, file khởi động chính là **index.js**.

## 📌 Yêu cầu hệ thống

-   [Node.js](https://nodejs.org/) (phiên bản >= 16.x khuyến nghị)
-   [npm](https://www.npmjs.com/) (có sẵn khi cài Node.js)
-   [MySQL Server](dev.mysql.com/mysql) (phiên bản >= 8.0 khuyến nghị)
-   [MySQL Workbench](dev.mysql.com/workbench) (dùng để quản lý và trực quan hóa cơ sở dữ liệu)

---

## ⚙️ Cài đặt

1. Clone hoặc tải dự án về:

    ```bash
    git clone https://github.com/TUANKIET0397/DrawTheWordGuess.
    cd DrawTheWordGuess
    ```

2. Cài dependencies:
    ```bash
    npm install
    ```

---

3. Lưu ý
    ```bash
    💡 Do trong quá trình phát triển và kiểm thử, đồng thời chưa có domain hoặc server, nên cần chạy MySQL cục bộ để xem được demo.
    - Xây dựng database dựa vào thư mục database
    - Đổi password theo root database của bạn
    ```

---

## ▶️ Chạy dự án

```bash
node assets/index.js
```
