## 📦 Documentation

- Chạy lệnh npm install, sau đó là npm run dev, và mở trình duyệt tại địa chỉ http://localhost:8080.
- Thay đổi nội dung file index.html theo ý muốn của bạn.
- Nếu không muốn sử dụng tính năng bình luận, hãy xóa thuộc tính data-url và data-key trong thẻ <body> tại file index.html.
- Điều chỉnh data-url trong thẻ <body> ở file index và dashboard sao cho khớp với URL backend (nếu bạn tự hosting).
- Đồng thời điều chỉnh data-key ở file index bằng access key mà bạn có thể lấy từ dashboard.
- Nếu muốn sử dụng GIF, hãy lấy Tenor API key tại developers.google.com/tenor.
- Để triển khai (deployment), chạy lệnh npm run build:public. Thư mục public là thư mục bạn sẽ dùng để upload.
- Đối với backend tự host (self-hosting), xem giải thích bên dưới, hoặc sử dụng trial API miễn phí.
- Thiệp mời này chỉ sử dụng HTML, CSS, và JavaScript thuần. NPM được sử dụng để file JavaScript có thể được thực thi ngay lập tức (không còn là dạng module nữa).
- Nếu bạn vẫn muốn dùng mà không có NPM, hãy đổi src="./dist/guest.js" thành src="./js/guest.js" type="module" trong thẻ <head> ở file index và dashboard.html, tuy nhiên sẽ có rủi ro bị lỗi giao diện (glitch) khi mới tải trang.
- Nếu bạn có câu hỏi, hãy sử dụng tính năng discussions để các bạn khác cũng có thể đọc được.

[!WARNING]   Hãy sử dụng phiên bản 3.14.0, vì phiên bản 4 vẫn đang trong giai đoạn phát triển và có khả năng chứa lỗi (bug) 🐛

## 🔥 Deployment API

- Video
    đang cập nhật (otw)

## ⚙️ Công nghệ sử dụng (Tech stack)

- Bootstrap 5.3.8
- AOS 2.3.4
- Fontawesome 7.1.0
- Canvas Confetti 1.9.3
- Google Fonts
- Vanilla JS

## 🎨 Credit
Tất cả tài nguyên hình ảnh trong dự án này đều được lấy từ hình ảnh cá nhân.

## 🤝 Contributing

Tôi rất hoan nghênh những bạn nào muốn đóng góp cho dự án thiệp mời này!