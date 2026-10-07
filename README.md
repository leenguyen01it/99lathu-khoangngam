# Khoảng Ngẫm: 99 lá thư mở bằng thẻ NFC

Mỗi tấm thẻ NFC chứa một đường dẫn riêng. Chạm điện thoại vào thẻ để mở lá thư của hôm nay. Mỗi ngày một lá, 99 lá.

Dự án độc lập, không dùng chung mã hay dữ liệu với TapNow.

## Cách hoạt động

1. Admin đăng nhập `/admin`, tạo thẻ, tải file CSV. Mỗi dòng có `uid` (in lên thẻ) và `nfcUrl` (ghi vào chip NFC).
2. `nfcUrl` có dạng `/uid/<hash>`, với `hash` là 32 ký tự đầu của `HMAC-SHA256(uid, CARD_HASH_SECRET)`.
3. Người dùng chạm thẻ. Máy chủ tạo một phiên xem 10 phút, ghi nhật ký, rồi chuyển hướng sang `/v/<token>`. Thanh địa chỉ chỉ còn đường dẫn tạm này.
4. Lần chạm đầu tiên của một ngày mới mở lá thư kế tiếp. Các lần chạm sau trong ngày mở lại lá đó. "Ngày" tính theo giờ Việt Nam và chuyển ngày lúc 0 giờ (`src/lib/day.ts`).
5. Hết 10 phút, trang tự khoá và yêu cầu chạm lại thẻ.

Người đọc không cần tài khoản: tấm thẻ chính là danh tính.

### Giới hạn đã biết

Đường dẫn `/uid/<hash>` ghi trên thẻ là cố định. Người rành kỹ thuật có thể đọc thẻ bằng ứng dụng NFC, lưu đường dẫn đó và mở lại mà không cần thẻ. Cơ chế hiện tại chỉ chặn việc lưu hoặc chia sẻ đường dẫn tạm `/v/<token>`. Muốn chặn hẳn phải dùng loại chip sinh mã mới ở mỗi lần chạm.

## Các trang

| Đường dẫn | Dành cho | Nội dung |
|---|---|---|
| `/` | Mọi người | Giới thiệu ngắn |
| `/thu-thu` | Mọi người | Đọc thử 7 lá thư riêng (không nằm trong 99 lá của thẻ), mỗi ngày mở thêm một lá, không cần thẻ |
| `/tang` | Người tặng | Nhập mã thẻ và viết lời nhắn riêng, trước khi thẻ được mở lần đầu |
| `/tang/<token>` | Người tặng | Link riêng tạo tự động cho từng thẻ; mở đúng thẻ, không cần nhập UID |
| `/uid/<hash>` | Thẻ NFC | Điểm vào khi chạm thẻ |
| `/v/<token>` | Người có thẻ | Lá thư hôm nay và hộp thư các lá đã mở, sống 10 phút |
| `/admin` | Admin | Tạo thẻ, xem tiến độ, tải CSV |

## Cài đặt

```bash
npm install
npm run setup        # tạo .env với các khoá ngẫu nhiên, không ghi đè nếu đã có
npm run db:deploy    # áp dụng migration PostgreSQL lên Neon sau khi điền URL vào .env
npm run dev
```

Điền `DATABASE_URL` (pooled) và `DIRECT_URL` (direct) của cùng Neon branch vào `.env` trước khi chạy `db:deploy`. Mật khẩu admin nằm ở dòng `ADMIN_PASSWORD` trong `.env`; hãy đổi thành mật khẩu của bạn.

## Nội dung thư

`content/letters.json` là bản chép của `99-la-thu/thu.json` bên dự án video. Trường `n` là thứ tự mở. Khi sửa thư hoặc sắp xếp lại, chép đè file này rồi build lại.

Không đổi thứ tự `n` sau khi đã bán thẻ: người đang ở ngày 40 sẽ thấy hộp thư của họ đổi nội dung.

`content/trial-letters.json` là bộ 7 lá dành riêng cho trang đọc thử (bản chép của `99-la-thu/doc-thu.json`). Không lấy lá nào trong 99 lá chính làm lá đọc thử: người đọc thử xong rồi mua thẻ phải nhận được toàn lá mới.

## Đưa lên production

- Hướng dẫn từng bước cho Vercel + Neon và `99lathu.khoangngam.com`: [docs/deploy-vercel-neon-99lathu.md](docs/deploy-vercel-neon-99lathu.md).
- **Không đổi `CARD_HASH_SECRET` sau khi đã tạo hoặc ghi thẻ.** Sao lưu khoá này ở nơi an toàn để việc tạo thẻ và xác thực link tặng luôn nhất quán.
- Trên production, đặt `APP_URL="https://99lathu.khoangngam.com"` trước khi tạo CSV, vì `nfcUrl` ghi vào thẻ NFC được ghép từ đó. Giữ `http://localhost:3000` trong `.env` khi phát triển trên máy cá nhân.
- `prisma/migrations` chứa một migration PostgreSQL khởi tạo cho Neon. Nếu `prisma/dev.db` cũ có dữ liệu cần giữ, làm theo mục 8 trong hướng dẫn triển khai để chuyển dữ liệu.
- Giới hạn số lần thử mật khẩu admin được lưu trong database.
- Bảng `ScanSession` lớn dần theo số lần chạm. Thỉnh thoảng xoá các dòng đã hết hạn.

## Tên và màu

Tên thương hiệu, tên sản phẩm và nhãn chủ đề nằm trong `src/lib/site.ts`. Bảng màu nằm trong `tailwind.config.ts` (bảng màu xanh của Khoảng Ngẫm).

## Giọng đọc

Mỗi lá thư có thể có một bản thu giọng đọc, nằm trong thư mục `audio/` ở gốc dự án: `<id>.mp3` và `<id>.json` (mốc thời gian từng ký tự, dùng để tô sáng câu đang đọc).

```bash
node --env-file=.env scripts/generate-audio.mjs lon-len-01      # một lá
node --env-file=.env scripts/generate-audio.mjs --all           # cả 99 lá và 7 lá đọc thử
```

Cần `ELEVENLABS_API_KEY` và `ELEVENLABS_VOICE_ID` trong môi trường (tuỳ chọn `ELEVENLABS_MODEL_ID`, mặc định `eleven_v4`). Lá nào đã có file thì bỏ qua, nên chạy lại không tốn thêm credit.

- Lá nào chưa có bản thu thì trang không hiện nút loa.
- **Sửa chữ của một lá thư sau khi đã thu thì nút loa của lá đó tự ẩn**, vì bản thu không còn khớp chữ. Xoá hai file của lá đó trong `audio/` rồi chạy lại script để thu lại.
- File âm thanh không nằm trong `public/`. Chúng chỉ được phát qua `/v/<token>/audio/<n>` (phiên chạm thẻ còn hạn và lá đã mở) và `/thu-thu/audio/<n>` (lá đọc thử đã tới ngày).
- Thư mục `audio/` được đọc từ đĩa lúc chạy. Triển khai kiểu serverless thì phải khai báo để thư mục này được đóng gói kèm.
