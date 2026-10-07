# Thiết kế thẻ NFC Khoảng Ngẫm

- Thành phẩm: `85.6 × 54 mm` (chuẩn ID-1).
- File SVG: `91.6 × 60 mm`, đã gồm bleed `3 mm` mỗi cạnh.
- Vùng an toàn: giữ nội dung quan trọng cách đường cắt ít nhất `4 mm`. Khung viền mặt trước nằm cách đường cắt `4.5 mm`.
- Màu thương hiệu: ink `#16302f`, paper `#f7f0e2`, gold `#ecc98a`, sage `#bcd3bd`.
- Màu vàng là màu đặc (không gradient) để dùng được cho cả in CMYK lẫn ép kim. Nếu ép kim, tách các phần tử `#ecc98a` ở mặt trước thành một lớp spot riêng.
- Nền tối tràn lề: nên cán mờ để hạn chế vân tay và xước.
- Font sử dụng: Source Serif 4 (bản tĩnh 14pt) cho toàn bộ nội dung, Great Vibes (`fonts/wordmark/greatvibes.ttf`) cho chữ thương hiệu ở góc mặt trước. Cả hai theo giấy phép OFL. Các tệp font được đặt trong `fonts/` để bản xem trước hiển thị đúng. PDF in đã nhúng font. Nếu nhà in yêu cầu chữ outline, mở PDF bằng Illustrator hoặc Inkscape để chuyển.
- Mặt sau đưa ra hai cách mở thư ngang hàng, không nhắc tới chữ "NFC": chạm điện thoại vào thẻ, hoặc quét mã QR. Mã trong `back.svg` (nhóm `qr-sample`) chỉ là MÃ MẪU. Mỗi thẻ phải in một mã QR riêng, mã hoá đúng `nfcUrl` của thẻ đó (cột `nfcUrl` trong CSV xuất từ `/admin`), nên cần in dữ liệu biến đổi. Ô mã: 16 × 16 mm tại x=56.6, y=27.5 (tính trên khổ có bleed), không có khung viền, giữ trống ít nhất 2 mm quanh mã. Đánh đổi đã chấp nhận: ai chụp được mã QR là mở được thư mà không cần thẻ.
- Không khóa ghi chip ở lô test. Chỉ khóa NDEF sau khi kiểm tra URL thật trên iPhone và Android.

Mở `preview.html` để xem hai mặt cạnh nhau. Bản xem trước hiển thị đúng khổ thành phẩm (đã cắt bleed) và nhúng SVG bằng `<object>` để tải được font trong `fonts/`.

Đường cắt và bleed: mỗi SVG có lớp `guides` (ẩn mặc định, không ảnh hưởng file in). Xem ở nửa dưới của `preview.html`, hoặc mở `front.svg#guides` và `back.svg#guides` trong trình duyệt. Hồng là vùng bleed và đường cắt, xanh là vùng an toàn.

File gửi nhà in (vector, mỗi file 1 trang 91.6 × 60 mm đã gồm bleed, font nhúng sẵn, màu RGB, không có lớp guides):

Trong trang Admin, nút `Tải file in QR` tự động tạo ZIP cho tối đa 500 thẻ chưa mở. ZIP gồm mặt trước dùng chung, một SVG mặt sau có QR riêng theo UID, font và file `doi-chieu.csv` để ghép đúng mặt in với chip NFC.

- `khoang-ngam-mat-truoc.pdf`: mặt trước, in giống nhau cho mọi thẻ.
- `khoang-ngam-mat-sau-MA-QR-MAU.pdf`: mặt sau. Mã QR trong file là MÃ MẪU để nhà in biết vị trí và kích thước, không được in nguyên như vậy. Nhà in thay bằng mã riêng của từng thẻ theo CSV.

Xuất lại sau mỗi lần sửa SVG: mở `print.html#front` hoặc `print.html#back` bằng Chrome, In, Lưu dưới dạng PDF, lề Không, tắt đầu trang và chân trang.
