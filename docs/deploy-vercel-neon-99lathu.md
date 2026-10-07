# Triển khai 99 lá thư lên Vercel và Neon

Địa chỉ đích: **https://99lathu.khoangngam.com**. Tài liệu này áp dụng cho mã nguồn hiện tại của `khoang-ngam` (Next.js 15, Prisma 6, schema và migration PostgreSQL cho Neon). Cập nhật: 07/10/2026. Đây là hướng dẫn thao tác; việc tạo tài khoản, đổi DNS và triển khai production chưa được thực hiện.

## 1. Những điều phải hiểu trước khi triển khai

Ứng dụng Next.js sẽ chạy trên Vercel; dữ liệu thẻ, thư tặng, khách hàng, đơn hàng, phiên đăng nhập và thống kê sẽ ở Neon PostgreSQL. DNS của `99lathu.khoangngam.com` sẽ trỏ về dự án Vercel. `APP_URL` phải là chính địa chỉ HTTPS này **trước khi xuất CSV/ZIP và ghi URL vào thẻ NFC**, vì URL đã ghi lên thẻ là cố định.

Mã nguồn hiện chưa thể chỉ bấm “Deploy”:

1. `prisma/schema.prisma` và migration hiện dùng PostgreSQL. Trước khi chạy ứng dụng hoặc migration, phải cấu hình `DATABASE_URL` và `DIRECT_URL` của Neon cho đúng branch.
2. `src/server/audio.ts` đọc `audio/*.mp3` và `audio/*.json`; tuyến `/admin/print-export` đọc SVG và font từ `design/nfc-card`. Các tệp đọc theo đường dẫn động cần được đưa vào Vercel Function bằng `outputFileTracingIncludes`. [Next.js 15: output file tracing](https://nextjs.org/docs/15/app/api-reference/config/next-config-js/output).
3. `package.json` ghi Node `>=20`. Vercel đã ngừng cho **bản triển khai mới** chọn Node 20 từ 01/10/2026; nên chốt Node 22.x cho dự án này và thử build trên cùng phiên bản. [Thông báo của Vercel](https://vercel.com/changelog/node-js-20-is-being-deprecated).

> Nếu `prisma/dev.db` đã chứa thẻ, người dùng, đơn hàng hoặc tiến độ đọc thật, đọc mục **8. Dữ liệu SQLite đang dùng** trước khi làm bước chuyển database. Tạo migration mới chỉ tạo bảng trống; nó không chuyển dữ liệu cũ.

## 2. Chuẩn bị

- Có tài khoản GitHub, Vercel, Neon và quyền quản lý DNS của `khoangngam.com`.
- Cài Node.js 22 và npm; chạy `node --version` và `npm --version` để kiểm tra.
- Ở gốc dự án, chạy `npm ci` để cài đúng phiên bản trong `package-lock.json` trước khi chạy các lệnh Prisma.
- Giữ bản sao an toàn của `prisma/dev.db` và `.env` hiện có. **Không** đưa `.env`, file database hoặc khóa bí mật lên GitHub. `.gitignore` hiện đã bỏ qua `.env` và `prisma/*.db`.
- Quyết định vùng đặt Neon gần vùng Vercel Function phục vụ người dùng Việt Nam để giảm độ trễ. Nếu có môi trường Preview, tạo một Neon branch/database riêng; không dùng chung dữ liệu production để thử thao tác ghi.
- Có đủ các cặp file giọng đọc thực sự cần phát ở `audio/<letter-id>.mp3` và `audio/<letter-id>.json`. Không cần biến `ELEVENLABS_API_KEY` trên Vercel nếu chỉ phát các file đã tạo; khóa này chỉ dành cho script tạo âm thanh chạy bên ngoài Vercel.

## 3. Tạo PostgreSQL trên Neon

1. Trong Neon Console, tạo project PostgreSQL và chọn vùng gần vùng chạy Vercel dự kiến. Tạo database/branch production. Nếu định kiểm tra Preview, tạo thêm branch phát triển.
2. Ở **Connection Details**, lấy hai URL của cùng database/branch:
   - **Pooled connection** (hostname thường có `-pooler`): dùng cho `DATABASE_URL`, tức truy vấn từ các Vercel Function.
   - **Direct connection**: dùng cho `DIRECT_URL`, tức Prisma Migrate và thao tác quản trị database.
3. Giữ nguyên tên database, tài khoản và tham số TLS do Neon cung cấp (thường có `sslmode=require`). Không tự thêm `-pooler` bằng tay khi Console đã có tùy chọn sao chép URL. Neon hỗ trợ kết nối pooled cho ứng dụng serverless; dùng direct cho migration giúp tách rõ hai mục đích. [Neon về Prisma và pooled connection](https://neon.com/blog/better-postgres-with-prisma-experience).

Ví dụ **chỉ minh họa cấu trúc**, không dùng nguyên văn:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxxx-pooler.REGION.aws.neon.tech/DB?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxxxx.REGION.aws.neon.tech/DB?sslmode=require"
```

## 4. Chuẩn bị mã nguồn cho PostgreSQL và Vercel

Thực hiện các sửa đổi sau trên một nhánh làm việc; đây là các thay đổi cần được commit cùng nhau.

### 4.1 Đổi Prisma datasource

`prisma/schema.prisma` đã có khối `datasource db` sau:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Đây là cú pháp phù hợp với Prisma 6 mà dự án đang cài; không sao chép hướng dẫn Prisma 7/8 dùng `prisma.config.ts` hoặc các lệnh CLI mới sang dự án này. [Tài liệu Prisma Migrate v6](https://www.prisma.io/docs/orm/v6/prisma-migrate/getting-started).

Trong `.env` **chỉ trên máy phát triển**, thay `DATABASE_URL` SQLite bằng URL pooled của **Neon branch phát triển**, thêm `DIRECT_URL` direct của cùng branch. Giữ các khóa hiện có; không dùng database production ở bước `migrate dev`.

### 4.2 Áp dụng migration PostgreSQL đã có

`prisma/migrations` đã chứa một migration `init` PostgreSQL được sinh từ schema hiện tại. Trên Neon branch phát triển trống, chạy ở gốc dự án:

```powershell
npx prisma validate
npm run db:deploy
npx prisma generate
npm run typecheck
npm run build
```

`db:deploy` áp dụng migration lên **Neon branch phát triển trống**. File `prisma/migrations/migration_lock.toml` ghi `provider = "postgresql"`; migration `init` chứa các bảng, khóa ngoại và chỉ mục. File SQLite cũ `prisma/dev.db` không bị sửa nhưng không dùng được với schema PostgreSQL; xem mục 8 nếu cần chuyển dữ liệu.

**Không chạy `prisma migrate reset` trên database production.** `npm run db:deploy` của dự án gọi `prisma migrate deploy`, dùng để áp dụng migration đã tạo vào production; không sinh migration mới trên production.

### 4.3 Đóng gói âm thanh và file in

Thêm vào object `nextConfig` hiện có trong `next.config.ts`:

```ts
outputFileTracingIncludes: {
  "/thu-thu": ["./audio/*.mp3", "./audio/*.json"],
  "/thu-thu/audio/*": ["./audio/*.mp3"],
  "/v/*": ["./audio/*.mp3", "./audio/*.json"],
  "/v/*/audio/*": ["./audio/*.mp3"],
  "/admin/print-export": ["./design/nfc-card/*.svg", "./design/nfc-card/fonts/**/*.ttf"],
},
```

Các key là **đường dẫn URL**, không phải đường dẫn `src/app`; glob phía phải tính từ gốc dự án. Sau khi build, thử trực tiếp trang đọc thử, trang thư của thẻ và ZIP xuất file in trên Preview. Nếu Next.js không ghép glob `"/v/*"` vào route động như dự kiến, kiểm tra trace của route tương ứng trong `.next/server/app` và đổi key sang route cụ thể mà Next báo; đừng đưa toàn bộ `audio/` vào mọi Function. [Next.js 15: quy tắc glob của output file tracing](https://nextjs.org/docs/15/app/api-reference/config/next-config-js/output), [Vercel: file trong Function](https://vercel.com/kb/guide/how-can-i-use-files-in-serverless-functions).

Vercel Function không phải nơi lưu file được tạo trong lúc chạy. Các MP3/JSON hiện có phải được đưa vào bản triển khai; script `generate-audio.mjs` nên chạy trước build. Nếu về sau có đủ 99 + 7 giọng đọc và kích thước bundle tăng mạnh, chuyển audio sang storage riêng có kiểm tra quyền và hỗ trợ HTTP Range, thay vì đóng gói hàng trăm MP3 vào Function. [Giới hạn kích thước Function của Vercel](https://vercel.com/kb/guide/troubleshooting-function-250mb-limit).

### 4.4 Chốt Node và kiểm tra build

Đổi `"engines": { "node": ">=20" }` trong `package.json` thành `"engines": { "node": "22.x" }`; trên Vercel cũng chọn Node 22.x. Giữ build command hiện tại `prisma generate && next build` và `postinstall: prisma generate`. **Không đưa `prisma migrate dev`, `db push` hoặc script tạo audio vào build command**: mỗi build/Preview không nên tự sửa schema hay ghi file. [Vercel: phiên bản Node](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [Prisma: sinh Client khi triển khai](https://www.prisma.io/docs/orm/v6/prisma-client/deployment/serverless).

## 5. Đưa mã lên GitHub

Thư mục hiện chưa có Git repository. Tạo một GitHub repository riêng tư, sau đó ở gốc dự án:

```powershell
git init
git status --short
git add .
git diff --cached --name-only
git commit -m "Prepare 99 letters for Vercel and Neon"
git branch -M main
git remote add origin https://github.com/TAI-KHOAN/TEN-REPO.git
git push -u origin main
```

Trước `git commit`, xem **danh sách staged** từ `git diff --cached --name-only`: không được có `.env`, `prisma/dev.db`, file thử giọng trong `audio/_thu/`, thư mục build `.next/`, hoặc hồ sơ Chrome tạm. Nếu có, dùng `git restore --staged -- <đường-dẫn>` để bỏ riêng tệp đó khỏi commit, cập nhật `.gitignore`, rồi kiểm tra lại. Chỉ commit các MP3/JSON cuối cùng cần phát; tránh đưa bản thu thử vào production.

## 6. Tạo dự án Vercel và đặt biến môi trường

Trong Vercel: **Add New → Project → Import Git Repository**, chọn repo vừa tạo. Framework để **Next.js**, Root Directory là gốc repo, Build Command dùng `npm run build`, Node.js Version là **22.x**. Vercel hỗ trợ triển khai Next.js từ Git và cấp URL `*.vercel.app` để thử trước. [Vercel: Next.js](https://vercel.com/docs/frameworks/full-stack/nextjs).

Trong **Project → Settings → Environment Variables**, nhập các biến sau cho **Production**:

| Biến | Giá trị / tác dụng |
| --- | --- |
| `DATABASE_URL` | URL **pooled** của Neon production |
| `DIRECT_URL` | URL **direct** của cùng Neon production |
| `APP_URL` | `https://99lathu.khoangngam.com` |
| `CARD_HASH_SECRET` | Đúng khóa đang dùng nếu đã tạo hoặc ghi thẻ; khóa mới ngẫu nhiên nếu bắt đầu hoàn toàn từ đầu |
| `SCAN_TOKEN_SECRET` | Chuỗi ngẫu nhiên dài dùng ký phiên đọc thư |
| `ADMIN_SESSION_SECRET` | Chuỗi ngẫu nhiên dài dùng phiên đăng nhập admin |
| `ADMIN_PASSWORD` | Mật khẩu khởi tạo owner **lần đầu** khi bảng `AdminUser` còn trống |

`.env` trên máy chỉ là cấu hình local, Vercel không tự lấy file này vì nó bị bỏ qua bởi Git. Có thể tạo chuỗi ngẫu nhiên bằng `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"` trên máy, rồi lưu từng giá trị vào Vercel; không in các khóa thật vào tài liệu hoặc commit. `CARD_HASH_SECRET` phải giữ ổn định sau khi đã tạo `uidHash`/ghi thẻ để việc tạo thẻ mới và chữ ký link tặng nhất quán. `APP_URL` sai sẽ tạo URL NFC sai. [Vercel: biến môi trường](https://vercel.com/docs/environment-variables).

Với **Preview**, dùng Neon branch/database khác và khóa thử riêng; không trỏ Preview vào production. Thay đổi biến trên Vercel chỉ có hiệu lực ở deployment **mới**, nên redeploy sau khi sửa biến. [Vercel: môi trường triển khai](https://vercel.com/docs/environment-variables).

### Áp dụng migration production đúng một lần trước khi thử ứng dụng

Sau khi liên kết thư mục với Vercel bằng `npx vercel link` và đã đặt đầy đủ biến Production, chạy trên máy đã cài đúng dependencies:

```powershell
npx vercel env run -e production -- npm run db:deploy
```

Lệnh này chạy `prisma migrate deploy` với `DIRECT_URL` production từ Vercel mà không ghi khóa ra file local. Chỉ dùng khi database production đang trống hoặc đã được chuẩn bị theo mục 8; không chạy `migrate dev` ở đây. Trên Neon, kiểm tra bảng `_prisma_migrations` và các bảng ứng dụng đã xuất hiện. [Vercel CLI: chạy lệnh với biến Production](https://vercel.com/docs/cli/env), [Prisma Migrate v6](https://www.prisma.io/docs/orm/v6/prisma-migrate/getting-started).

Sau đó để Vercel triển khai commit trên `main` hoặc chọn **Redeploy** nếu lần import đầu xảy ra trước khi database có bảng. Kiểm tra Build Logs; việc build thành công chưa thay thế việc thử các chức năng ghi/đọc.

## 7. Gắn `99lathu.khoangngam.com` và kiểm tra

1. Vào **Vercel Project → Settings → Domains**, thêm `99lathu.khoangngam.com` và gán cho Production.
2. Tại nơi đang quản lý DNS của `khoangngam.com`, tạo bản ghi **CNAME** với Host/Name là `99lathu`, Target/Value là **giá trị chính xác Vercel hiển thị cho dự án**. Không tự đoán CNAME chung; Vercel có thể cấp target riêng. Không thay nameserver cả domain chính nếu bạn chỉ cần subdomain. [Vercel: thêm custom domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain).
3. Đợi Vercel báo domain và HTTPS đã hoạt động. Nếu dùng Cloudflare, khi xác minh DNS gặp lỗi hãy kiểm tra bản ghi đang được proxy hay DNS-only và làm theo hướng dẫn Vercel trong mục Domains.
4. Truy cập `https://99lathu.khoangngam.com/` và kiểm tra:
   - `/thu-thu` mở lá đọc thử, cookie giữ ngày bắt đầu; nếu có MP3 đúng ID thì nút nghe phát được, kể cả trên iPhone (audio route hỗ trợ HTTP Range).
   - `/admin/login` cho tạo owner đầu tiên bằng email và `ADMIN_PASSWORD` khi Neon chưa có admin; sau đó kiểm tra đăng nhập, đăng xuất và tải ZIP in thẻ.
   - Tạo **một thẻ thử** chưa đưa cho khách, xuất CSV/ZIP; `nfcUrl` và QR phải bắt đầu bằng `https://99lathu.khoangngam.com/uid/`. Thử chạm hoặc mở URL của thẻ thử, xem thư, thử link tặng và kiểm tra số lần mở trong admin.
   - Neon có dữ liệu mới; Vercel Runtime Logs không có lỗi `P1001`, `P2021`, thiếu font, thiếu audio hoặc `ENOENT`.

Khi nghiệm thu xong, lưu bản sao các khóa production và thông tin quản trị DNS/Neon tại nơi quản lý bí mật của bạn. Trước mỗi thay đổi schema sau này, tạo migration trên branch phát triển, kiểm tra, commit, áp dụng `migrate deploy` vào production rồi mới đưa phiên bản app phụ thuộc schema mới ra phục vụ. Sao lưu/khả năng khôi phục Neon và kiểm tra định kỳ là việc vận hành riêng, đặc biệt vì dữ liệu thẻ và tiến độ đọc không thể tái tạo chỉ từ mã nguồn.

## 8. Nếu SQLite đã có dữ liệu thật

Quy trình ở mục 4–7 dành cho **Neon production trống**. Nếu `prisma/dev.db` có dữ liệu cần giữ, migration schema **không** di chuyển dữ liệu. Trước khi đổi database:

1. Sao lưu file SQLite và khóa `CARD_HASH_SECRET`; giữ hệ thống cũ ở chế độ không nhận thêm ghi trong thời gian chuyển cuối cùng.
2. Tạo bảng PostgreSQL bằng migration mới trên Neon. Viết/chạy một chương trình chuyển dữ liệu riêng, đọc từng model từ SQLite và ghi vào Neon theo thứ tự quan hệ; giữ nguyên `Card.id`, `uid`, `uidHash`, `currentN`, `lastOpenedDay`, thư tặng, người dùng admin, đơn hàng, lịch sử gán và các mốc thời gian. Không tạo lại UID/hash hoặc thay đổi `CARD_HASH_SECRET`.
3. So sánh số bản ghi từng bảng giữa hai bên; kiểm tra vài thẻ thật với tiến độ, link tặng, admin và nhật ký tương ứng. Sau khi kiểm tra xong mới trỏ domain sang Vercel và cho phép ghi trên Neon.

Không dùng `prisma db push` như cách chuyển dữ liệu: lệnh đó chỉ đồng bộ **cấu trúc**, không sao chép bản ghi. Với dữ liệu đã bán hoặc đang dùng, nên làm bản chuyển thử trên Neon branch trước, rồi lặp lại một lần có kiểm soát cho production.

## 9. Lỗi thường gặp

| Hiện tượng | Kiểm tra trước |
| --- | --- |
| Build báo migration provider không khớp | `prisma/migrations/migration_lock.toml` vẫn là `sqlite`; xem lại mục 4.2. |
| Ứng dụng báo `P1001`/không nối Neon | URL, mật khẩu, TLS, trạng thái Neon và biến đúng môi trường Production/Preview. |
| Báo `P2021`/table missing | Chưa chạy `migrate deploy` trên đúng Neon branch/database. |
| Có trang nhưng không có nút nghe | Cặp MP3/JSON chưa có trong deployment, JSON không khớp nội dung thư, hoặc trace thiếu file. |
| Bấm nghe được nhưng trả 404/`ENOENT` | Trace của audio route thiếu MP3; xem mục 4.3 và Runtime Logs. |
| ZIP in thẻ lỗi `ENOENT` | Trace của `/admin/print-export` thiếu SVG hoặc font. |
| QR/NFC dẫn về localhost hay domain khác | `APP_URL` Production sai hoặc bản ZIP/CSV đã được tạo trước khi sửa biến; xuất lại **trước khi ghi thẻ**. |
| Domain chưa có HTTPS | Xem trạng thái xác minh domain, CNAME Vercel cấp và DNS hiện hành; không in thẻ lúc này. |

## Tài liệu gốc đối chiếu

- [Vercel: Deploy Next.js](https://vercel.com/docs/frameworks/full-stack/nextjs), [Custom domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain), [Environment variables](https://vercel.com/docs/environment-variables).
- [Neon: dùng PostgreSQL pooled với Prisma](https://neon.com/blog/better-postgres-with-prisma-experience).
- [Prisma: giới hạn khi đổi database provider](https://docs.prisma.io/docs/orm/v7/prisma-migrate/understanding-prisma-migrate/limitations-and-known-issues), [Prisma Migrate v6](https://www.prisma.io/docs/orm/v6/prisma-migrate/getting-started).
- [Next.js 15: đóng gói file ngoài mã nguồn](https://nextjs.org/docs/15/app/api-reference/config/next-config-js/output).
