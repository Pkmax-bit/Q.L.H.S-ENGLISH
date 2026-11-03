# Bảng đăng ký lịch học (booking board)

Trang công khai để học viên / phụ huynh tự giữ chỗ vào các ca học.
Vào bằng **số điện thoại**, lần đầu nhập thêm họ tên. Nhiều người cùng đăng ký
trên một bảng, mỗi ca có sĩ số tối đa.

Một bảng phủ **1–6 tuần**: trung tâm gửi một link cho cả tháng, học viên bấm
chuyển tuần ngay trên trang. Sĩ số mỗi ca **tính riêng từng tuần**.

Module tách hoàn toàn khỏi `profiles` / `class_students` / `schedules` — không
ảnh hưởng học phí, điểm danh, lớp học hiện có.

---

## 1. Cài đặt

Chạy migration (chỉ cần một lần, cần `DATABASE_URL` hoặc `SUPABASE_ACCESS_TOKEN`
trong `backend/.env`):

```bash
cd backend && for v in 038 039 040 041 042 043; do npm run migrate:$v; done
```

Kiểm tra đã áp chưa:

```bash
cd backend && npm run migrate:status
```

Không cần thêm biến môi trường nào. `JWT_BOOKING_SECRET` là tùy chọn — bỏ trống
thì suy ra từ `JWT_ACCESS_SECRET` (đã bắt buộc ≥32 ký tự ở `validateEnv`).

## 2. Dùng hằng tuần

1. Vào **Bảng đăng ký lịch** ở sidebar (admin / giáo viên) → **Tạo bảng mới**.
   Chọn tuần (luôn tính từ thứ 2), đặt số ca tối đa mỗi người (0 = không giới hạn).
2. Mở bảng → **Thêm ca học**. Chọn nhiều thứ cùng lúc để tạo một ca cho cả tuần
   (vd 18:00–19:30 cho T2/T4/T6), đặt sĩ số, giáo viên, phòng.
3. **Copy link** rồi gửi cho học viên: `https://<domain>/dk/<mã>`.
4. Tuần sau: bấm **Nhân bản tuần sau** — giữ nguyên bộ ca, bỏ đăng ký cũ, sinh
   link mới.
5. Chốt lớp: tab **Danh sách đăng ký** có tên + SĐT bấm gọi được, hoặc **Xuất CSV**.

## 3. Cấu trúc dữ liệu

| Bảng | Vai trò |
|---|---|
| `booking_boards` | Một bảng = `week_count` tuần liên tiếp (1–6). `slug` là mã trong link, `week_start` bắt buộc là thứ 2 (CHECK `ISODOW = 1`). |
| `booking_slots` | Ca trong bảng. `day_of_week` 0=CN…6=T7 — **cùng quy ước với `schedules.day_of_week`**. `created_by` quyết định màu hiển thị. |
| `booking_registrants` | Người đăng ký: `phone` UNIQUE (đã chuẩn hóa) + `full_name`. Đây là lý do "lần sau chỉ cần nhập SĐT" hoạt động. |
| `booking_entries` | Một người giữ một ca **vào một ngày cụ thể** (`session_date`). `status`: `confirmed` / `waitlist` / `cancelled`. |

Không giữ trùng một ca trong cùng một ngày nhờ partial unique index
`uniq_booking_entry_active (slot_id, registrant_id, session_date) WHERE status <> 'cancelled'`
— bản ghi đã hủy không chặn đăng ký lại.

**Vì sao `session_date` phải lưu, không suy ra được**: trước migration 039 ngày
được suy từ `board.week_start + slot.day_of_week`, nên mỗi bảng chỉ ứng với đúng
một tuần. Muốn một bảng phủ cả tháng thì "T2 18:00" của tuần 1 và tuần 3 phải là
hai chỗ khác nhau — bắt buộc ghi ngày.

### Hai hàm SQL không thể thay bằng code Node

- `book_booking_slot(slot_id, registrant_id, session_date)` — `SELECT ... FOR UPDATE` khóa hàng
  ca rồi mới đếm và chèn. **Nếu đếm ở Node rồi chèn, hai người bấm cùng lúc sẽ
  cùng thấy "còn chỗ" và ca bị vượt sĩ số.** Lỗi này chắc chắn xảy ra khi gửi
  link cho cả lớp cùng lúc.
- `cancel_booking_entry(entry_id, registrant_id)` — hủy xong tự đẩy người đầu
  hàng chờ lên `confirmed`. Truyền `NULL` cho `registrant_id` = admin hủy hộ.

Cả hai `SECURITY DEFINER`, `search_path = public`, đã `REVOKE` khỏi
`PUBLIC`/`anon`/`authenticated` và chỉ `GRANT` cho `service_role`. Bốn bảng đều
bật RLS không policy — giống posture ghi ở `030_rls_posture_note.sql`.

## 4. API

### Công khai — không cần tài khoản

Xác thực bằng header `X-Booking-Token` (JWT ký bằng `jwtConfig.booking.secret`,
hạn 30 ngày, payload `{ rid, phone, kind: 'booking' }`).

| Method | Path | Ghi chú |
|---|---|---|
| POST | `/api/booking/public/identify` | `{ phone, full_name? }`. SĐT lạ mà thiếu tên → `{ needs_name: true }`. Giới hạn 20 lần / 15 phút / IP. |
| GET | `/api/booking/public/boards/:slug?week=YYYY-MM-DD` | Token tùy chọn — có thì đánh dấu ca mình đã giữ. Thiếu `week` thì backend tự mở tuần chứa hôm nay. Trả kèm mảng `weeks` để dựng thanh chọn tuần. |
| GET | `/api/booking/public/me` | |
| POST | `/api/booking/public/slots/:slotId/register` | Body bắt buộc `{ session_date }`. |
| DELETE | `/api/booking/public/entries/:entryId` | Chỉ hủy được chỗ của chính mình. |

### Quản trị — JWT nội bộ, `admin` + `teacher`

`GET|POST /api/booking/boards`, `GET|PUT /api/booking/boards/:id`,
`DELETE /api/booking/boards/:id` (chỉ admin),
`POST /api/booking/boards/:id/clone`,
`POST /api/booking/boards/:id/slots`, `POST .../slots/bulk`,
`PUT|DELETE /api/booking/slots/:slotId`,
`GET /api/booking/boards/:id/registrations[.csv]`,
`POST /api/booking/slots/:slotId/entries` (đăng ký hộ),
`DELETE /api/booking/entries/:entryId` (hủy hộ).

## 4a. Hai dạng xem lưới

| Dạng | Component | Dùng khi |
|---|---|---|
| **Theo giờ** (mặc định) | `HourGrid.jsx` | Thời khóa biểu: hàng = giờ **7h–23h** (17 hàng cố định), cột = T2…CN. Mỗi hàng giờ chia nhỏ theo **bước giờ** chọn được: 1 giờ / 30 / 15 / 5 phút. |
| **Theo ngày** | `WeekSlotGrid.jsx` | Danh sách theo ngày, gom theo buổi Sáng/Trưa/Chiều/Tối. Dễ đọc trên điện thoại. |

### Chọn nhiều ô rồi mới xác nhận

Bấm vào ô là **chọn** (tích xanh), không gọi API ngay. Chọn xong bao nhiêu ô tùy
ý rồi bấm nút ở `SelectionBar` — lỡ tay một cái là mất chỗ hoặc tạo nhầm ca, mà
lại phải đi hủy từng cái.

| `mode` | Bấm ô có ca | Bấm ô trống | Nút xác nhận |
|---|---|---|---|
| `public` | Chưa giữ → **chọn**. Đã giữ → **hủy ngay** (không ai hủy hàng loạt) | trơ | `Đặt lịch N ca` |
| `admin` | Mở form sửa ca | **chọn** | `Tạo lịch N ca` → form điền thiết lập chung |

Ô trống ở `mode="public"` không giữ chỗ được (giờ đó chưa có ca nào) nên bấm vào
là **gửi nguyện vọng** — xem mục 4c. Chọn lẫn lộn ca có sẵn và ô trống cũng được:
nút xác nhận đổi thành "Đặt N ca + xin M giờ", backend xử lý hai nhánh riêng.

- **Đặt lần lượt, không song song**: sĩ số do hàm SQL khóa hàng kiểm tra, bắn
  song song thì thứ tự thành công khó đoán và thông báo lỗi khó hiểu.
- **Chấp nhận thành công một phần**: đặt được ca nào hay ca đó, báo rõ
  "Giữ được 2 ca. Không được: 18:00 — …". Bắt tất-cả-hoặc-không sẽ làm người
  dùng mất cả 2 ca hợp lệ chỉ vì 1 ca đầy.
- **Đổi tuần thì xóa lựa chọn** ở cả hai phía — ô đã chọn gắn với tuần cũ, giữ
  lại là đặt nhầm tuần.
- Thanh xác nhận `sticky bottom-24` chứ không đặt cuối lưới: lưới cao 17 hàng,
  nút nằm dưới đáy thì chọn ô ở hàng 8 xong phải cuộn hết lưới mới bấm được.
- Nút "Thêm ca học" thường phải **xóa lựa chọn đang có**, nếu không form mở nhầm
  sang chế độ lô (nó nhận biết chế độ qua prop `cells`).

API: `POST /api/booking/boards/:id/slots/bulk` nhận một trong hai dạng —
`days_of_week: [1,3,5]` + một khung giờ chung, hoặc
`slots: [{ day_of_week, start_time, end_time }, …]` cho các ô rời rạc. Tối đa
100 ca mỗi lần.

Những chỗ đã xử lý sẵn:

- **17 hàng × 7 cột không vừa màn hình điện thoại** → lưới cuộn ngang, cột giờ
  `sticky left-0`. Thiếu phần ghim này thì cuộn sang T6 là mất trục giờ.
- **Ca ngoài khung 7h–23h** (vd ca 6h sáng) không bị im lặng biến mất — có dải
  cảnh báo liệt kê chúng ở cuối lưới.
- **Giờ 23h** không thể kết thúc lúc 24:00 nên `end_time` bị kẹp về `23:59`.
- Ca bắt đầu lúc 18:30 nằm ở hàng 18:00 (lấy theo giờ, bỏ phút).

### Bước giờ linh hoạt

Ô chọn `Bước giờ` ở cả hai phía chia nhỏ từng hàng giờ thành ô con:

| Bước | Ô con mỗi giờ | Tổng ô trống | Chiều cao ô |
|---|---|---|---|
| 1 giờ | 1 | ~102 | `h-9` |
| 30 phút | 2 | ~200 | `h-8` |
| **15 phút (mặc định)** | **4** | ~376 | `h-7` |
| 5 phút | 12 | ~1126 | `h-4` |

Chiều cao ô tra theo bảng `cellH` chứ không dùng ngưỡng `step >= 30` như bản
đầu — ngưỡng đó làm ô 15 phút tụt xuống cùng chiều cao với ô 5 phút, bé tới mức
khó bấm trúng dù chỉ có 4 ô. Từ bước 15 phút trở lên, ô còn in mốc giờ khi rê
chuột để biết đang bấm khung nào.

- **Vẫn giữ 17 hàng giờ làm khung** thay vì sinh thẳng 204 hàng ở bước 5 phút —
  cột giờ bên trái còn đọc được, và khi để 1 giờ thì y hệt như trước.
- Khóa ô trống gắn với **mốc phút** (`cell|<thứ>|<phút từ nửa đêm>`), nên **đổi
  bước giờ là xóa lựa chọn đang có** ở cả hai trang — giữ lại thì ô cũ trỏ vào
  khung giờ khác.
- Ô con bị ca khác **đè lên** (vd ca 18:00–19:30 phủ ô 18:30) hiện xám và không
  chọn được, tránh tạo hai ca chồng giờ.
- Bước 5 phút sinh hơn 1100 nút và ô chỉ cao 16px — chỉ dùng khi thật sự cần
  mốc 5 phút, bình thường cứ để 15 phút.

**Gõ tay giờ bất kỳ**: form thêm/sửa ca dùng `<input type="time">` nên nhập được
mọi mốc phút (09:07–09:53 cũng được), không bị bước giờ của lưới giới hạn.

Backend nhận ba dạng khung giờ ở `slotRange()` (`booking.service.js`), ưu tiên từ
cụ thể đến khái quát:

```
{ start_time, end_time }  -> dùng nguyên
{ start_time, duration }  -> tính end theo số phút
{ hour }                  -> ô 1 tiếng kiểu cũ, giữ để không vỡ client cũ
```

23:xx luôn bị kẹp về `23:59` vì không thể kết thúc sang 24:00.

## 4c. Nguyện vọng giờ học (`booking_requests`)

Học viên bấm ô **trống** trên lưới giờ để báo "em muốn học giờ này". **Không giữ
chỗ, không ảnh hưởng sĩ số.** Admin xem giờ nào đông rồi mở ca thật.

**Vì sao tách bảng riêng, không thêm một `status` mới vào `booking_entries`**:
`booking_entries.slot_id` là `NOT NULL` và sĩ số được `book_booking_slot()` khóa
hàng để đếm. Nguyện vọng thì không có ca, không có sĩ số. Nhét chung bảng sẽ
phải nới `slot_id` thành nullable và **mọi câu đếm sĩ số đều phải thêm điều kiện
loại trừ** — quên một chỗ là sĩ số sai.

Luồng:

1. Học viên chọn ô trống → `POST /public/boards/:slug/requests` với `{ cells: [{ session_date, hour }] }`
2. Ô đó hiện "đã xin" (viền vàng); bấm lại để rút → `DELETE /public/requests/:id`
3. Admin vào tab **Nguyện vọng giờ học**, thấy danh sách **xếp theo số người muốn giảm dần**
4. Bấm **Mở ca** → `POST /boards/:id/requests/open-slot` tạo ca đúng thứ + giờ, đồng thời duyệt các nguyện vọng cùng khung giờ và gán `created_slot_id`

Chi tiết đã xử lý:

- Bấm lại ô đã gửi thì **bỏ qua im lặng**, không báo lỗi trùng — người dùng chỉ
  muốn nói "giờ này em muốn học", không quan tâm chuyện trùng.
- Chặn xin giờ **ngày đã qua** và ngày ngoài phạm vi bảng, nếu không thống kê nhu
  cầu bị nhiễu.
- Mở ca xong, người đã xin **vẫn phải tự vào giữ chỗ** — hệ thống không giữ hộ,
  vì sĩ số có thể ít hơn số người muốn. Giữ hộ sẽ phá nguyên tắc sĩ số do RPC quản.
- Mở ca chỉ duyệt nguyện vọng **đúng ngày đó**; nguyện vọng cùng giờ ở tuần khác
  giữ nguyên để admin tự quyết (ca áp dụng mọi tuần nhưng nhu cầu từng tuần khác nhau).
- `uniq_booking_request_open` là partial unique index chỉ áp cho status
  `pending`/`approved` — bản đã hủy/từ chối không chặn gửi lại.

## 4b. Màu theo người tạo ca

`booking_slots.created_by` (migration 040) quyết định màu của thẻ ca. Màu **không
lưu trong CSDL** — suy ra từ UUID người tạo ở `backend/src/utils/bookingColors.js`.

- Đặt `created_by` ở **ca** chứ không dùng `booking_boards.created_by`: một bảng
  có thể do nhiều giáo viên cùng xếp ca. Lấy theo người tạo bảng thì cả lưới chỉ
  một màu, vô nghĩa.
- Không thêm cột màu vào `profiles`: đó là bảng dùng chung toàn hệ thống, thêm
  cột chỉ phục vụ một màn hình là nợ kỹ thuật.
- `assignColors()` ưu tiên màu theo hash UUID (một người giữ nguyên màu giữa các
  bảng), nhưng nếu hai người trùng màu **trong cùng một bảng** thì người sau bị
  đẩy sang màu trống kế tiếp — không bao giờ nhập nhằng trong một lưới.
- **Lớp CSS phải viết tĩnh đầy đủ** trong `SLOT_COLORS` ở
  `frontend/src/lib/bookingUtils.js`. Tailwind quét mã nguồn theo chuỗi, ghép
  động kiểu `` `border-${color}-300` `` sẽ không sinh CSS và màu biến mất lúc build.
- Nhánh công khai chỉ trả **khóa màu**, không trả `created_by` hay tên người tạo.
  Tên người tạo + chú giải màu chỉ có ở API quản trị.
- Thẻ ca mình đã giữ chỗ thì **ưu tiên màu xanh xác nhận** đè lên màu người tạo:
  "đây là chỗ tôi giữ" quan trọng hơn "ca này của ai tạo".

## 4d. Màn xếp lịch của admin (`SchedulingBoard`)

Tab **Xếp lịch** ở trang chi tiết bảng, **chỉ `admin`** — nhánh API này sửa được
cả lịch lẫn **tiền** của người khác, giáo viên thường không nên có quyền đó.

| Thao tác | Cách làm |
|---|---|
| Xếp người vào ca | Kéo thẻ từ **Giờ chờ sắp** thả vào thẻ ca |
| Chuyển sang ca khác | Kéo thẻ người từ ca này sang ca khác |
| Đổi mức giá | **Chuột phải** vào người → Đổi mức giá |
| Gỡ khỏi ca | **Chuột phải** → Gỡ về giờ chờ sắp |
| Hủy hẳn | **Chuột phải** → Hủy hẳn chỗ này |
| Quản lý mức giá | **Chuột phải** vào thẻ ở giờ chờ sắp → Sửa mức giá |

### Bảng dữ liệu (migration 042)

- `booking_price_tiers` — nhiều mức giá cho **một** người đăng ký (vd "Ca thường
  200k", "Ca cuối tuần 300k", "Kèm riêng 450k"). Unique theo
  `(registrant_id, lower(btrim(name)))` nên "Ca thường" và " ca THUONG " là trùng.
  Partial unique `WHERE is_default` bảo đảm mỗi người đúng một mức mặc định.
- `booking_entries.price_tier_id` + `price_amount` + `assigned_by`
- `booking_pool_items` — khu "giờ chờ sắp"

### Bốn quyết định quan trọng

**1. KHÔNG nối vào `tuition_invoices` / `teacher_pay_entries`.** Hai bảng đó là
tiền đang vận hành thật (hóa đơn đã phát, đã thu). Sinh dòng tự động từ màn xếp
lịch sẽ làm số liệu học phí lệch mà rất khó truy nguyên. Ở đây chỉ **ghi** giá
kèm mỗi lượt xếp.

**2. `price_amount` là BẢN SAO, không phải tham chiếu sống.** Sửa mức giá về sau
không làm đổi tiền của các buổi đã xếp — nếu không, đối chiếu sổ sách tháng
trước sẽ ra con số khác lúc chốt. Xóa mức giá cũng chỉ đưa `price_tier_id` về
`NULL`, tiền giữ nguyên.

**3. Admin xếp tay vẫn đi qua `book_booking_slot()`.** `assignToSlot` gọi lại
đúng hàm giữ chỗ của nhánh công khai, nên **admin cũng không vượt được sĩ số** và
hàng chờ vẫn hoạt động. Nếu chèn thẳng vào `booking_entries` thì mọi bảo đảm về
sĩ số mất sạch ở nhánh quản trị.

**4. Chuyển ca: xếp chỗ mới TRƯỚC, hủy chỗ cũ SAU.** Hủy trước mà ca mới đã đầy
thì người đó mất cả hai chỗ.

Gỡ khỏi ca dùng RPC `cancel_booking_entry` chứ không xóa bản ghi, để người đầu
hàng chờ của ca đó được đẩy lên. Thời lượng đưa vào khu chờ lấy đúng độ dài ca
(ca 18:00–19:30 → 90 phút).

## 4e. Học phí tự điền & trang Học viên đăng ký

Trang **Học viên đăng ký** (`/booking-registrants`, chỉ `admin`) liệt kê mọi
người đăng ký qua trang công khai kèm: số buổi đã xếp, tổng học phí, mức giá mặc
định, và **số buổi chưa có giá** — con số này là thứ cần soi để không sót thu.

### Thứ tự lấy giá khi xếp một người vào ca

Xem `resolvePrice()` ở `bookingScheduling.service.js`, ưu tiên từ riêng đến chung:

| # | Nguồn | `price_source` |
|---|---|---|
| 1 | Mức giá admin chọn tay lúc xếp | `tier` |
| 2 | Mức giá **mặc định** của chính học viên (`is_default`) | `default_tier` |
| 3 | **Học phí của ca** (`booking_slots.price_amount`, migration 043) | `slot` |
| 4 | Không có giá | `none` |

Đây là phần "setup tự động": đặt mức mặc định cho học viên **hoặc** đặt học phí
cho ca là từ đó về sau tiền tự điền, không phải gõ lại mỗi lần xếp.

- **Để trống khác 0 đồng**: `price_amount = NULL` nghĩa là *chưa đặt* và sẽ rơi
  xuống nấc tiếp theo; `0` nghĩa là *miễn phí* và dừng ở đó.
- **Giá của ca là một con số, không trỏ tới `booking_price_tiers`**: price_tiers
  gắn với một người cụ thể (`registrant_id NOT NULL`), còn giá ca áp cho mọi
  người học ca đó. Trỏ sang đó sẽ phải nới `registrant_id` thành nullable và mọi
  truy vấn "mức giá của người này" đều phải thêm điều kiện lọc.
- Đổi giá ca hay mức giá về sau **không** đổi tiền buổi đã xếp (vẫn là bản sao).
  Buổi đã xếp sai giá phải sửa từng cái ở tab **Xếp lịch** → chuột phải → Đổi mức giá.

## 5. Những chỗ dễ sai

- **Chuẩn hóa SĐT** (`backend/src/utils/phone.js`): `0912345678`, `+84912345678`,
  `84912345678`, `0912 345 678` phải ra cùng một người. Nếu không, cùng một
  người sẽ sinh nhiều `booking_registrants` và "lần sau chỉ nhập SĐT" hỏng.
  Có test ở `backend/test/booking-utils.test.js`.
- **Không lộ SĐT ở nhánh công khai**: `getPublicBoard` chỉ trả tên viết tắt qua
  `maskName` ("Nguyễn Văn An" → "Nguyễn Văn A."). Khi sửa phần `select` của
  Supabase phải kiểm lại, rất dễ vô tình trả thừa cột.
- **Token đăng ký tách biệt token nội bộ**: ký bằng secret riêng
  (`jwtConfig.booking`), verify bằng `middleware/bookingAuth.js` — **không** tái
  dùng `middleware/auth.js` vì middleware đó gắn `role` và cả hệ thống phân
  quyền dựa vào đó. Có test chứng minh hai token không verify chéo được.
- **Header `X-Booking-Token` phải nằm trong CORS allowlist**: `backend/src/config/cors.js`
  có whitelist `allowedHeaders` cứng. Thiếu header này thì trình duyệt chặn ngay ở
  bước preflight với `ERR_FAILED` — và **curl không dính lỗi này**, nên test bằng
  curl vẫn xanh hết. Đây là lỗi đã thực sự xảy ra khi chạy thử lần đầu.
- **Axios instance riêng ở frontend**: `publicApi` trong
  `frontend/src/services/booking.service.js` không gắn `accessToken` và không
  tự gọi `/auth/refresh`. Nếu dùng chung `api`, admin đang đăng nhập mà mở thử
  link `/dk/...` sẽ bị đá về `/login`.
- **Học viên phải thấy chỗ của mình ở MỌI tuần**: `my_all_entries` trong
  `getPublicBoard` gom toàn bộ, `MyBookingsBar` hiển thị và hủy được ngay. Nếu
  chỉ trả chỗ của tuần đang xem, muốn hủy ca tuần sau phải mò qua từng tab tuần.
- **Hạ sĩ số dưới số người đã giữ**: bị chặn ở `updateSlot`, xét **từng ngày** —
  tuần này 3 người mà tuần sau 8 người thì chặn theo 8.
- **Thu hẹp phạm vi tuần của bảng**: `updateBoard` chặn nếu có lượt giữ chỗ nằm
  ngoài phạm vi mới. Nếu không, các lượt đó thành mồ côi — biến mất khỏi bảng
  nhưng vẫn nằm trong CSDL và trong file CSV.
- **Giới hạn `max_slots_per_person` tính THEO TUẦN**, không theo cả bảng. Bảng
  dài một tháng mà giới hạn theo bảng sẽ thành "2 ca cho cả tháng".

## 6. Đánh đổi đã chọn, cần biết

**Chỉ cần SĐT là vào** — ai biết SĐT của bạn cũng vào xem và hủy được chỗ của
bạn. Đây là lựa chọn có chủ đích để không làm phiền người học. Nếu sau này cần
siết:

- Chỗ cắm OTP đã sẵn: thêm bước xác minh trước khi `identify` phát token, không
  phải đổi schema.
- Hoặc chỉ dựa vào tính bí mật của link (`slug` 7 ký tự ngẫu nhiên, không liệt
  kê được qua API công khai).

**Chưa làm**: nâng `booking_registrants` thành học viên thật (`profiles` +
`class_students`). Khi chốt lớp vẫn nhập tay hoặc dùng luồng thêm học sinh sẵn có.

## 7. File liên quan

```
backend/src/migrations/038_booking_board.sql
backend/src/migrations/039_booking_board_multi_week.sql
backend/src/migrations/040_booking_slot_owner.sql
backend/src/migrations/041_booking_requests.sql
backend/src/migrations/042_booking_scheduling.sql
backend/src/migrations/043_booking_slot_price.sql
backend/src/services/bookingScheduling.service.js
backend/src/controllers/bookingScheduling.controller.js
backend/src/utils/bookingColors.js
backend/src/utils/phone.js
backend/src/middleware/bookingAuth.js
backend/src/services/booking.service.js
backend/src/controllers/booking.controller.js
backend/src/routes/booking.routes.js
backend/test/booking-utils.test.js

frontend/src/lib/bookingUtils.js
frontend/src/services/booking.service.js
frontend/src/components/booking/PhoneGate.jsx
frontend/src/components/booking/WeekPicker.jsx
frontend/src/components/booking/MyBookingsBar.jsx
frontend/src/components/booking/WeekSlotGrid.jsx
frontend/src/components/booking/HourGrid.jsx
frontend/src/components/booking/SelectionBar.jsx
frontend/src/components/booking/RequestDemandPanel.jsx
frontend/src/components/booking/SchedulingBoard.jsx
frontend/src/components/booking/ContextMenu.jsx
frontend/src/components/booking/PriceTierModal.jsx
frontend/src/hooks/useContextMenu.js
frontend/src/components/booking/BookingBoardForm.jsx
frontend/src/components/booking/BookingSlotForm.jsx
frontend/src/pages/BookingBoardPage.jsx          (công khai, /dk/:slug)
frontend/src/pages/BookingBoardsPage.jsx         (/booking-boards)
frontend/src/pages/BookingBoardDetailPage.jsx    (/booking-boards/:id)
frontend/src/pages/BookingRegistrantsPage.jsx    (/booking-registrants)
```
