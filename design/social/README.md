# Ảnh bìa mạng xã hội — Khoảng Ngẫm

Mô tả kênh, từ khóa và mẫu mô tả video YouTube nằm trong [youtube-content.md](youtube-content.md).

Nội dung hồ sơ và bài đăng cho các nền tảng khác:

- [Facebook](facebook-content.md): bio, giới thiệu fanpage, bài ghim, đoạn kết bài viết/Reels và tin nhắn chào.
- [Instagram](instagram-content.md): bio, liên kết hồ sơ, caption bài ghim, đoạn kết caption/Reels và nội dung Story.
- [Threads](threads-content.md): bio, liên kết hồ sơ, bài ghim, lời mời đọc thử và những bài đầu tiên.

Người dùng đã xác nhận tạo cả 5 nền tảng với tên **@khoangngam**:

| Nền tảng | Liên kết |
| --- | --- |
| Facebook Page | https://www.facebook.com/khoangngam |
| YouTube | https://www.youtube.com/@khoangngam |
| TikTok | https://www.tiktok.com/@khoangngam |
| Instagram | https://www.instagram.com/khoangngam/ |
| Threads | https://www.threads.com/@khoangngam |

Liên kết dùng trong website được quản lý tại `src/lib/site.ts`. Nội dung hồ sơ được chuẩn bị để sao chép; chưa cập nhật trực tiếp lên tài khoản mạng xã hội.

| Nền tảng | Tệp tải lên | Kích thước | Vùng chứa nội dung chính |
| --- | --- | --- | --- |
| YouTube | `youtube-cover.png` | 2560 × 1440 px | Giữa ảnh, x = 508–2052, y = 509–931 (1544 × 422 px) |
| Facebook Page | `facebook-cover.png` | 1702 × 630 px | Giữa ảnh, x = 400–1302, y = 110–500; tránh góc trái dưới |

Hai tệp `.svg` là bản nguồn chỉnh sửa được. Chúng dùng font trong `design/nfc-card/fonts/`; giữ nguyên cấu trúc thư mục khi mở để hiển thị đúng font. Khi tải lên mạng xã hội, dùng tệp PNG.

Đồ họa nền và phong thư có thể bị cắt trên các thiết bị khác nhau; logo và toàn bộ chữ vẫn ở vùng trung tâm. Facebook có thể che một phần góc trái dưới bằng ảnh đại diện hoặc nút của Trang.
