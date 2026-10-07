# Dữ liệu khách hàng, đơn hàng và thẻ

## Nguyên tắc

Trang admin là nơi quản lý chính. Dữ liệu nhập tay và dữ liệu đồng bộ từ các kênh ngoài đều được quy về `Customer`, `Order`, `OrderItem` và `Card`.

- `Customer` là hồ sơ khách hàng chuẩn trong hệ thống.
- `Order` có thể được tạo trực tiếp trên admin (`sourceId = null`) hoặc đồng bộ từ một `SyncSource`.
- `ExternalCustomerLink` nối ID khách ở nguồn ngoài với đúng customer nội bộ, không dùng số điện thoại làm khóa đồng bộ lâu dài.
- `Card` giữ customer và đơn hàng hiện tại để tra cứu nhanh.
- `CardAssignment` lưu lịch sử gán, đổi, thu hồi hoặc thay thẻ.
- `SyncRun` lưu trạng thái mỗi lần import để có thể tiếp tục, kiểm tra lỗi và tránh import mù.

## Chuẩn hóa và tìm khách

Giữ cả giá trị hiển thị và giá trị chuẩn hóa:

- `phone`: cách viết người dùng đã nhập.
- `phoneNormalized`: chỉ gồm mã quốc gia và chữ số, ví dụ `84901234567`.
- `email`: cách viết để hiển thị.
- `emailNormalized`: trim và chuyển về chữ thường.

Số điện thoại và email được đánh index nhưng không ép unique. Điều này cho phép xử lý trường hợp hai người dùng chung số điện thoại hoặc dữ liệu import bị trùng. Khi tìm kiếm, admin nên hiện mọi kết quả phù hợp và cho phép hợp nhất hồ sơ có chủ đích.

## Quy tắc đồng bộ

1. Nếu đã có `ExternalCustomerLink(sourceId, externalId)`, cập nhật customer được liên kết.
2. Nếu chưa có liên kết, thử tìm bằng `phoneNormalized`, sau đó bằng `emailNormalized`.
3. Nếu chỉ có đúng một kết quả đáng tin cậy, nối nguồn ngoài vào customer đó.
4. Nếu có nhiều kết quả hoặc thông tin mâu thuẫn, đánh dấu để admin chọn; không tự hợp nhất.
5. Mỗi order nguồn ngoài được upsert bằng `(sourceId, externalId)`.
6. Mỗi dòng order được upsert bằng `(orderId, externalLineId)`.
7. Lưu `rawJson` để điều tra sai lệch, nhưng giao diện và nghiệp vụ chỉ đọc các trường chuẩn.
8. API key và token của nguồn đồng bộ chỉ đặt trong biến môi trường, không lưu trong `configJson`.

## Tiền và lịch sử đơn hàng

Các trường tiền là số nguyên theo đơn vị nhỏ nhất của tiền tệ. Với VND, `150000` nghĩa là 150.000 đồng. Không dùng số thực cho tiền.

Thông tin người nhận và địa chỉ trên `Order` là snapshot tại thời điểm mua. Khi khách sửa hồ sơ hoặc địa chỉ mặc định, lịch sử đơn cũ không thay đổi.

## Quy trình gắn thẻ

1. Tạo hoặc tìm customer bằng số điện thoại trong admin.
2. Tạo đơn hàng hoặc mở đơn đã import.
3. Quét/chọn UID nội bộ của thẻ từ tem tạm trên bao bì.
4. Gán `Card.customerId`, `Card.orderId`, `Card.orderItemId`, `Card.assignedAt`.
5. Đồng thời tạo một `CardAssignment` với action `assigned`.
6. Nếu đổi thẻ, cập nhật liên kết hiện tại và tạo thêm lịch sử với action `replaced`; không sửa bản ghi lịch sử cũ.

UID không cần in lên thành phẩm và không bao giờ được thay bằng số điện thoại khách hàng.
