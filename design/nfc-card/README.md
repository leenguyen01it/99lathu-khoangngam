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

Trong trang Admin, tạo thẻ cần xác nhận số lượng trong modal. Mỗi lần tạo được lưu thành một đợt riêng trong nhật ký quản trị, cùng danh sách UID chính xác; thẻ và nhật ký được lưu trong cùng một transaction. Nút `Tải file in QR` xuất riêng đợt được chọn, mặc định là đợt vừa tạo hoặc đợt mới nhất. Có thể chọn lại đợt cũ để in lại. Thẻ tạo trước tính năng chia đợt vẫn xuất được qua mục `Tất cả thẻ chưa mở` (tối đa 500 thẻ).

ZIP chỉ gồm `mat-truoc.pdf` dùng chung và các file `mat-sau/KN001.pdf`, `KN002.pdf`… có QR riêng cho từng thẻ, không có CSV, thư mục font hoặc file hướng dẫn riêng. Số thứ tự bắt đầu từ KN001 trong mỗi đợt và giữ nguyên cho cùng một thẻ khi tải lại đợt đó. PDF là vector, mỗi file một trang 91.6 × 60 mm gồm bleed 3 mm, nhúng font sẵn.

Tên ZIP gửi nhà in: `Khoang-Ngam_File-In_20-The_08-10-2026.zip`. Ngày theo định dạng ngày-tháng-năm, dùng ngày tạo đợt theo múi giờ Việt Nam; khi xuất tất cả thẻ chưa mở thì dùng ngày tải. Tên ZIP không chứa nhãn trạng thái.

Ghi chip sau khi nhận thẻ từ nhà in: mở `/admin/nfc` bằng Chrome trên điện thoại Android có NFC, qua HTTPS. Chọn đợt, quét QR bằng camera trong trang, bấm `Ghi NFC và kiểm tra`, áp chính thẻ đó vào điện thoại rồi nhấc ra và chạm lại để xác nhận. Số `KNxxx` được tra theo thứ tự UID đã lưu của đợt, khớp tên PDF. Không cần giữ thứ tự thẻ khi nhận từ nhà in. Trang chỉ đọc nội dung QR và chip, không mở URL, không kích hoạt thẻ hoặc khóa chip. Chip chứa dữ liệu khác sẽ bị từ chối ghi đè.

Chỉ sau khi đọc được URL chip khớp QR mới lưu nhật ký `nfc_verified` và cập nhật tiến độ; kiểm tra lại cùng thẻ không tăng số lượng. Tiến độ lưu trên server và giữ nguyên khi tải lại trang hoặc đổi thiết bị. Nếu mạng lỗi sau khi ghi, dùng `Lưu lại kết quả` hoặc đọc kiểm tra lại thẻ. Tài khoản hỗ trợ không có quyền ghi thẻ. Chạy `npm run test:nfc` để kiểm tra quy trình với chip mô phỏng; cần kiểm tra cuối cùng trên điện thoại và chip thật.

- `khoang-ngam-mat-truoc.pdf`: mặt trước, in giống nhau cho mọi thẻ.
- `khoang-ngam-mat-sau-MA-QR-MAU.pdf`: mặt sau. Mã QR trong file là MÃ MẪU để nhà in biết vị trí và kích thước, không được in nguyên như vậy. Nhà in thay bằng mã riêng của từng thẻ theo CSV.

Xuất lại sau mỗi lần sửa SVG: mở `print.html#front` hoặc `print.html#back` bằng Chrome, In, Lưu dưới dạng PDF, lề Không, tắt đầu trang và chân trang.
