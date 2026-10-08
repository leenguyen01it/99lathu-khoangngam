# Landing page Khoảng Ngẫm

`index.html` là trang giới thiệu tại `https://khoangngam.com`. Footer có 5 kênh @khoangngam. Phải triển khai kèm `checkout.js` cùng thư mục.

## Đặt hàng

- Các nút đặt thẻ dẫn đến `#dat-hang`.
- Form tải giá từ `GET https://99lathu.khoangngam.com/api/orders` và gửi đơn qua `POST` cùng địa chỉ.
- Giá chuẩn nằm tại `src/lib/checkout.ts`: bản thẻ 169.000đ, bản quà tặng 249.000đ, miễn phí vận chuyển, theo giá hiện có trên landing. Khi đổi giá, cập nhật cả phần giới thiệu `KN.plans` trong HTML.
- Đơn, sản phẩm, khách hàng và địa chỉ được lưu trong cùng một transaction. Xem tại `/admin/orders`, nguồn “Website Khoảng Ngẫm”. Đơn mới chờ xác nhận, chưa thanh toán, chưa giao; không tự tạo hoặc kích hoạt thẻ.
- Form giữ requestId khi gửi lại để tránh tạo trùng đơn khi mạng bị gián đoạn. API giới hạn 10 request/IP/phút và 3 lần tạo đơn mới/số điện thoại/giờ. Bộ đếm PostgreSQL UPSERT nguyên tử, dùng chung giữa các instance; request sai cũng tiêu thụ giới hạn IP. Trả 429 với Retry-After; database giới hạn bị lỗi thì trả 503, không ghi đơn.
- Số điện thoại được chuẩn hóa về +84, kiểm tra country, độ dài và loại MOBILE bằng `libphonenumber-js/max`. Đây là kiểm tra cấu trúc, chưa xác minh quyền sở hữu bằng OTP.
- Origin, trường chống bot và giới hạn ứng dụng giảm spam; không chặn tuyệt đối bot dùng nhiều IP/số khác nhau. Khi vận hành cần cấu hình rate limit/WAF ở hosting. Reverse proxy phải ghi đè header IP từ client; API dùng IP do proxy cung cấp. Không coi CORS là xác thực.
- API chấp nhận origin `https://khoangngam.com`, `https://www.khoangngam.com`, `https://99lathu.khoangngam.com`. Trong môi trường phát triển hỗ trợ `http://localhost:3000` và `http://localhost:8080`.

## Triển khai

Chạy `npm run db:deploy` để thêm bảng `CheckoutThrottle`, triển khai app 99 lá thư có API mới trước, sau đó cập nhật HTML landing và `checkout.js`. `CARD_HASH_SECRET` phải được thiết lập trên máy chủ để HMAC các khóa giới hạn; không đặt khóa admin hoặc khóa máy chủ trong landing page. Có thể xóa định kỳ các hàng `CheckoutThrottle` đã hết hạn hơn 1 ngày.

Để thử local, phục vụ landing bằng HTTP tại localhost:8080, chạy app tại localhost:3000 và sửa `KN.appUrl` sang `http://localhost:3000` trong bản dùng thử. Không mở trực tiếp bằng file:// vì origin đó không được API chấp nhận.

## API địa giới Việt Nam

Đã tra cứu và gọi thử ngày 08/10/2026:

- [Province Open API](https://provinces.open-api.vn/): v2 dành cho địa giới sau sáp nhập 07/2025; v1 là dữ liệu trước sáp nhập.
- [Tài liệu v2](https://provinces.open-api.vn/api/v2/redoc), [OpenAPI schema](https://provinces.open-api.vn/api/v2/openapi.json).
- `GET /api/v2/p/`: danh sách tỉnh/thành; lúc kiểm tra trả 34 mục.
- `GET /api/v2/p/{code}?depth=2`: tỉnh/thành và các phường/xã trực thuộc; không dùng cấp quận/huyện.
- Website cung cấp API cộng đồng; không khẳng định là API nhà nước hoặc bảo đảm cập nhật tức thời mọi điều chỉnh địa giới.

App proxy qua `/api/locations` và cache dữ liệu 24 giờ, có timeout 8 giây. Chỉ tải phường/xã của tỉnh được chọn, tránh tải toàn bộ cây dữ liệu. Máy chủ kiểm tra mã phường/xã thuộc tỉnh và lấy tên từ API, không tin tên do trình duyệt gửi. Khi API lỗi, form hiển thị tải lại; không chấp nhận địa chỉ chưa kiểm chứng. Client hủy request phường/xã cũ khi đổi tỉnh để tránh hiển thị sai dữ liệu.

## Kiểm tra

`node --test tests/checkout.test.cjs`: dữ liệu, số điện thoại, giá, retry đơn, IP/phone 429, địa chỉ sai, upstream lỗi, payload lớn và database lỗi.

`node --env-file=.env --test tests/checkout-throttle.integration.cjs`: chạy trên PostgreSQL local, dùng bảng thử riêng; 30 request cùng IP chỉ 10 được qua, 10 request cùng số điện thoại chỉ 3 được qua, hết hạn thì reset.

`node tests/checkout.browser.cjs`: cần Playwright và Chrome; có thể đặt `PLAYWRIGHT_PATH` nếu cài package ngoài repository. Kiểm tra giao diện desktop/mobile với API đặt hàng giả lập, dữ liệu địa chỉ lấy từ API thật; không tạo đơn thật.
