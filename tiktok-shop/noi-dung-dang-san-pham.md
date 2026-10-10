# Nội dung đăng sản phẩm TikTok Shop: Thẻ 99 ngày thương mình

Soạn ngày 09/10/2026. Dán từng mục vào đúng ô trong Trung tâm Nhà bán hàng (Seller Center). Giá, phiên bản và tính năng lấy theo `landing/index.html`, `src/lib/checkout.ts` và `docs/chien-luoc-gia.md`.

Các thông số của sàn (số ảnh, giới hạn ký tự, từ bị cấm) lấy từ bài hướng dẫn của bên thứ ba, không phải văn bản chính thức. Khi form đăng báo khác thì làm theo form.

## 1. Tên sản phẩm

Chọn một trong ba. Tên đặt loại sản phẩm lên đầu để người tìm "quà tặng", "thẻ NFC" còn thấy, vì chưa ai tìm tên thương hiệu.

**Phương án A (nên dùng, 103 ký tự)**

```
Thẻ 99 Ngày Thương Mình Khoảng Ngẫm, 99 Lá Thư Mỗi Ngày Một Lá, Chạm Điện Thoại Để Mở, Quà Tặng Ý Nghĩa
```

**Phương án B (nghiêng về quà tặng)**

```
Quà Tặng Ý Nghĩa Thẻ 99 Lá Thư Khoảng Ngẫm, Chạm Điện Thoại Mở Thư Mỗi Ngày, Quà Sinh Nhật Tốt Nghiệp
```

**Phương án C (nghiêng về thẻ NFC)**

```
Thẻ NFC 99 Lá Thư Khoảng Ngẫm, 99 Ngày Thương Mình, Chạm Điện Thoại Mở Thư Không Cần Ứng Dụng
```

Sau hai tuần, xem từ khoá tìm kiếm trong phần phân tích sản phẩm rồi đổi sang phương án có từ khoá kéo được lượt xem.

## 2. Ngành hàng

Tra trong ô chọn ngành hàng theo thứ tự ưu tiên dưới đây, lấy mục đầu tiên có trong cây ngành hàng của tài khoản bạn:

1. Sách, tạp chí và âm thanh hoặc Văn phòng phẩm: nhánh thiệp, thiệp chúc mừng.
2. Văn phòng phẩm: nhánh quà lưu niệm, đồ thủ công, quà tặng.
3. Nhà cửa và đời sống: nhánh đồ trang trí, quà tặng.

Trước khi bấm lưu, xem phần trăm hoa hồng của ngành đã chọn. `docs/chien-luoc-gia.md` tính theo mức 14%. Nếu rơi vào Nhà cửa và đời sống, mức có thể lên 18,1% và phải tính lại biên. Tôi không tra được cây ngành hàng hiện hành, nên bước này bạn cần tự kiểm trong form.

## 3. Thương hiệu và thuộc tính

| Ô | Điền |
|---|---|
| Thương hiệu | Khoảng Ngẫm nếu đã đăng ký nhãn hiệu trên sàn. Chưa thì chọn "Không có thương hiệu" (tên Khoảng Ngẫm vẫn giữ trong tên sản phẩm vì là thương hiệu của chính shop) |
| Xuất xứ | Việt Nam |
| Chất liệu | Nhựa PVC (kiểm lại theo báo giá xưởng in) |
| Kích thước | 85,6 × 54 mm |
| Dịp tặng | Sinh nhật, tốt nghiệp, kỷ niệm |
| Ngôn ngữ nội dung | Tiếng Việt |

## 4. Phân loại hàng và giá

Tên nhóm phân loại: **Phiên bản**

| Phân loại | Giá bán | Giá gạch | SKU người bán | Ảnh phân loại |
|---|---|---|---|---|
| Bản thẻ | 169.000đ | 229.000đ | `card` | `anh/01-anh-chinh.jpg` |
| Bản quà tặng | 249.000đ | 349.000đ | `gift` | Ảnh chụp thật hộp quà (chưa có) |

Ba điều cần chốt trước khi điền giá:

- **Giá gạch.** `docs/chien-luoc-gia.md` mục D2 đã cảnh báo: giá gạch phải là giá từng bán thật. Sản phẩm chưa bán ngày nào ở 229.000đ và 349.000đ. Cách an toàn là để trống giá gạch lúc đăng, hoặc bán đúng giá gạch 2 đến 3 tuần rồi mới hạ.
- **Giá ra mắt.** Mục F của cùng tài liệu ghi giá ra mắt là 149.000đ và 229.000đ để lấy 30 đến 50 đánh giá đầu, trong khi landing đang để 169.000đ và 249.000đ. Nguyên tắc D1 yêu cầu cùng bản cùng giá ở mọi kênh, nên bạn cần chọn một mức cho cả hai nơi. Nếu muốn giá ra mắt thấp hơn trên sàn mà không lệch giá niêm yết, dùng voucher của shop.
- **Combo.** Combo 2 bản thẻ 299.000đ và combo 5 bản thẻ 699.000đ nên đăng thành phân loại thứ ba và thứ tư sau khi hai bản chính đã được duyệt.

Cân nặng và kích thước kiện (cân lại gói hàng thật trước khi điền, số dưới là ước lượng):

| Phân loại | Cân nặng | Kích thước kiện |
|---|---|---|
| Bản thẻ | khoảng 50 g | 16 × 12 × 1 cm |
| Bản quà tặng | khoảng 200 g | theo hộp cứng thật |

## 5. Ảnh sản phẩm

9 ảnh trong `tiktok-shop/anh/`, mỗi ảnh 1200 × 1200, JPG, dưới 300 KB. Tải lên đúng thứ tự tên file.

| Thứ tự | File | Trả lời câu hỏi nào của người mua |
|---|---|---|
| 1 | `01-anh-chinh.jpg` | Đây là cái gì (thẻ chạm vào điện thoại đang mở lá thư) |
| 2 | `02-hai-mat-the.jpg` | Nó trông thế nào, to bằng nào |
| 3 | `03-cach-dung.jpg` | Dùng ra sao (thẻ chạm vào điện thoại, màn hình là bìa sách của app) |
| 4 | `04-la-thu.jpg` | Thư viết kiểu gì (màn hình là trang sách thật của app) |
| 5 | `05-moi-ngay-mot-la.jpg` | Có những chủ đề nào, quên thì sao |
| 6 | `06-tuong-thich.jpg` | Máy tôi có dùng được không |
| 7 | `07-qua-tang.jpg` | Tặng thì có gì riêng (màn hình lời nhắn của người tặng, thẻ trong phong bì) |
| 8 | `08-hai-phien-ban.jpg` | Hai bản khác nhau chỗ nào |
| 9 | `09-ban-nhan-duoc.jpg` | Tóm lại tôi nhận được gì |

Giới hạn của bộ ảnh này:

- Cả 9 ảnh là bản dựng từ file thiết kế in (`design/nfc-card/`), không phải ảnh chụp. Khi có thẻ thật, chụp một ảnh thẻ trên nền sáng và thay ảnh 1, vì ảnh chính là ảnh chụp thật thường được duyệt nhanh và ít bị trả hàng vì "không giống hình".
- Chưa có ảnh nào cho hộp cứng và bìa 99 ngày của bản quà tặng vì hai thứ này chưa có thiết kế trong repo. Ảnh 8 chỉ liệt kê bằng chữ. Không nên mở bán bản quà tặng trước khi có ảnh chụp hộp thật.
- Ảnh không chứa tên miền, tên nền tảng khác hay giá bán. Mã QR ở mặt sau thẻ trong ảnh là mã minh hoạ, không quét được.

Màn hình điện thoại ở ảnh 1, 3 và 4 là ảnh chụp trang `/doc-thu` của app ở khổ 390 × 750, đã ẩn khối mời mua của trang đọc thử vì người dùng thẻ thật không thấy khối đó. Màn hình lời nhắn ở ảnh 7 không chụp từ một thẻ thật (cần thẻ có lời nhắn trong cơ sở dữ liệu): script dựng lại đúng markup của `GiftBook.tsx` trên trang đang mở và dùng CSS của app, với một lời nhắn ví dụ. Khi giao diện app đổi, chạy `npx next dev -p 3111` rồi `node tiktok-shop/nguon/chup-man-hinh.mjs` để chụp lại.

Sửa chữ trên ảnh: mở `tiktok-shop/nguon/anh.html`, sửa, rồi chạy `node tiktok-shop/nguon/render.mjs`.

## 6. Mô tả sản phẩm

Dán nguyên khối dưới đây. Chèn ảnh 3, 6 và 8 vào giữa các đoạn tương ứng nếu trình soạn mô tả cho phép.

```
THẺ 99 NGÀY THƯƠNG MÌNH | KHOẢNG NGẪM
Mỗi ngày một lá thư, viết cho chính bạn.

Một tấm thẻ nhỏ chứa 99 lá thư ngắn về những ngày cố gắng, lớn lên, yêu thương và học cách dịu dàng với mình. Chạm điện thoại vào thẻ, lá thư của hôm nay mở ra. Không cần đọc vội. Mỗi ngày một lá là đủ.

TẤM THẺ CÓ GÌ
• 99 lá thư thuộc 9 chủ đề: Cố gắng, Thành người mình thích, Lớn lên, Tình yêu, Không cần vừa lòng ai, Bạn bè, Tuổi trẻ, Ước mơ, Ngày mai.
• Mỗi lá chỉ vài câu, đọc chưa tới một phút. Chuyện trong thư là chuyện thường ngày: cái danh sách việc cần làm, nhóm chat, cuộc gọi về nhà.
• Mỗi ngày thẻ chỉ mở đúng một lá. Bạn không lướt hết trong một tối được, và đó là chủ ý.
• Những lá đã mở nằm lại trong hộp thư để đọc lại bất cứ lúc nào.
• Gặp lá mình thích, bạn lưu thành ảnh để giữ hoặc gửi cho một người bạn.

CÁCH DÙNG
1. Mở khoá màn hình, áp thẻ vào lưng điện thoại. Một thông báo hiện lên, bạn bấm vào đó.
2. Lá thư của hôm nay mở ra ngay trong trình duyệt.
3. Ngày mai chạm lại để mở lá kế tiếp, cho tới lá thứ 99.

Không cần cài ứng dụng. Không cần tạo tài khoản. Không cần nhớ mật khẩu. Tấm thẻ chính là chìa khoá.

ĐIỆN THOẠI NÀO DÙNG ĐƯỢC
• iPhone XS, XR trở lên: đưa thẻ lại gần mép trên của máy.
• Android có NFC: bật NFC trong cài đặt, áp thẻ vào giữa lưng máy.
• Máy không có NFC: mở camera, quét mã in ở mặt sau thẻ.

NẾU MUA ĐỂ TẶNG
Trước khi trao thẻ, bạn viết một lời nhắn riêng bằng mã in trên thẻ. Đó là điều đầu tiên người nhận thấy khi chạm thẻ lần đầu, trước cả lá thư số 1. Sau đó mỗi ngày họ nhận thêm một lá thư.
Lưu ý: viết lời nhắn trước khi thẻ được mở lần đầu. Sau lần mở đầu tiên thì không viết thêm được.
Hợp cho sinh nhật, ngày tốt nghiệp, ngày một người thân bắt đầu chặng mới.

HAI PHIÊN BẢN
• Bản thẻ: thẻ kèm phong bì. Dành cho người mua cho chính mình.
• Bản quà tặng: thẻ, thêm hộp cứng và bìa 99 ngày. Dành cho người mua để tặng.
Cả hai bản đều có đủ 99 lá thư và viết được lời nhắn riêng.

THÔNG SỐ
• Kích thước thẻ: 85,6 × 54 mm, bằng một tấm thẻ ngân hàng, để vừa trong ví.
• Mở thư bằng cách chạm điện thoại (NFC) hoặc quét mã ở mặt sau.
• Nội dung: tiếng Việt.
• Không có phí hằng tháng, không có gói nâng cấp. Mua một lần là đủ.

CÂU HỎI THƯỜNG GẶP
Hỏi: Tôi đọc nhiều lá trong một ngày được không?
Đáp: Không. Lần chạm đầu tiên của một ngày mới mở lá kế tiếp, những lần chạm sau trong ngày mở lại đúng lá đó. Ngày mới bắt đầu lúc 0 giờ theo giờ Việt Nam.

Hỏi: Quên chạm thẻ vài ngày thì có mất lá nào không?
Đáp: Không mất lá nào. Lá kế tiếp luôn chờ tới lần bạn chạm thẻ vào một ngày mới, nên nghỉ một tuần bạn vẫn đọc tiếp từ chỗ đã dừng.

Hỏi: Vì sao trang thư tự khoá sau một lúc?
Đáp: Mỗi lần chạm thẻ mở một phiên đọc dài 10 phút. Hết thời gian, bạn chạm thẻ lần nữa để đọc tiếp. Cách này giữ cho thư chỉ mở được khi tấm thẻ đang ở trong tay bạn.

Hỏi: Đọc hết 99 lá rồi thì sao?
Đáp: Tấm thẻ vẫn là của bạn. Bạn vẫn chạm thẻ để vào hộp thư và đọc lại cả 99 lá.

Hỏi: Thẻ cần sạc pin hay kết nối gì không?
Đáp: Thẻ không có pin. Điện thoại của bạn cần có mạng để tải lá thư.

Cần hỗ trợ, bạn nhắn cho shop ngay trong phần trò chuyện của đơn hàng.
```

Vài chỗ tôi cố ý viết khác landing:

- Bỏ "miễn phí giao hàng toàn quốc" và "thiệp viết tay". Theo `docs/chien-luoc-gia.md` mục D3, hai thứ này là điểm khác biệt của kênh bán trực tiếp. Phí giao trên sàn do chương trình của sàn quyết định.
- Không ghi tên miền `khoangngam.com` hay `99lathu.khoangngam.com/tang`, không nhắc "đọc thử 7 lá miễn phí". Sàn xử lý nội dung hướng người mua ra ngoài nền tảng. Cách viết lời nhắn được ghi là "bằng mã in trên thẻ". Bạn nên in đường dẫn trang lời nhắn lên phong bì hoặc tờ hướng dẫn trong gói hàng để người mua biết vào đâu.
- Câu "Điện thoại cần có mạng để tải lá thư" là tôi thêm vào vì thư mở trong trình duyệt. Hãy xác nhận lại rằng đúng như vậy.
- Không dùng các từ dễ bị bộ lọc của sàn chặn: "chữa lành", "cao cấp", "100%", "tốt nhất", "cam kết".

## 7. Video sản phẩm

Ô video của trang sản phẩm nhận video dọc hoặc vuông. Dùng kịch bản C1 trong `docs/lich-dang-3-tuan.md` (tấm thẻ này chứa 99 lá thư, 20 giây), nhưng đổi cảnh cuối: thay dòng "Đọc thử 7 lá miễn phí: khoangngam.com" bằng "Mỗi ngày một lá thư, viết cho chính bạn". Video cần quay tay thật và thẻ thật, nên chưa làm được lúc này.

## 8. Chú thích cho video gắn giỏ hàng

Dùng khi đăng video có gắn sản phẩm. Khác chú thích trong lịch đăng 3 tuần ở chỗ không mời ra link ngoài.

```
Tấm thẻ này chứa 99 lá thư. Chạm vào điện thoại, mỗi ngày nó chỉ mở đúng một lá.

Không cần cài ứng dụng, không cần tài khoản.

#khoangngam #99ngaythuongminh #lathu #quatangynghia
```

```
Trước khi tặng tấm thẻ này, mình viết một lời nhắn. Đó là thứ đầu tiên người nhận thấy khi chạm thẻ.

Rồi mỗi ngày họ nhận thêm một lá thư, trong 99 ngày.

#khoangngam #99ngaythuongminh #quasinhnhat #quatangynghia
```

## 9. Việc cần làm trước khi bấm đăng

1. Chốt một mức giá chung cho sàn và landing (mục 4).
2. Quyết định có điền giá gạch hay không (mục 4).
3. Kiểm phần trăm hoa hồng của ngành hàng đã chọn (mục 2).
4. Cân gói hàng thật và điền cân nặng, kích thước kiện (mục 4).
5. Chụp ảnh thật thẻ và hộp quà, thay ảnh 1 và ảnh phân loại bản quà tặng (mục 5).
6. Quay video C1 với thẻ thật (mục 7).
7. Đọc lại gói hàng: không để tên miền bán hàng hay lời mời mua ngoài sàn trong hộp, chỉ để hướng dẫn dùng thẻ và thiệp cảm ơn.

## Nguồn tra cứu

- [Chi tiết cách đăng sản phẩm lên TikTok Shop và các lưu ý, ViettelStore](https://viettelstore.vn/tin-tuc/chi-tiet-cach-dang-san-pham-len-tiktok-shop-va-cac-luu-y)
- [Cách đăng sản phẩm lên TikTok Shop được duyệt nhanh, FPT Shop](https://fptshop.com.vn/tin-tuc/danh-gia/cach-dang-san-pham-len-tiktok-shop-duoc-duyet-nhanh-184265)
- [Cách đăng sản phẩm lên TikTok Shop, Mega Digital](https://megadigital.ai/vi/blog/cach-dang-san-pham-len-tiktok-shop/)
- [6 trường thông tin sản phẩm giúp tăng tỷ lệ chuyển đổi trên TikTok Shop, Brands Vietnam](https://www.brandsvietnam.com/congdong/topic/6-truong-thong-tin-san-pham-giup-gia-tang-ty-le-chuyen-doi-tren-tiktok-shop)
- [Các từ bị cấm trên TikTok Shop, GHN](https://ghn.vn/blogs/tip-ban-hang/cac-tu-bi-cam-tren-tiktok-shop)
- [Danh sách các từ bị cấm trên TikTok Shop, ViettelStore](https://viettelstore.vn/tin-tuc/danh-sach-cac-tu-bi-cam-tren-tiktok-shop)
- [Quy định LIVE TikTok Shop, Mega Digital](https://megadigital.ai/vi/blog/quy-dinh-live-tiktok-shop/)
