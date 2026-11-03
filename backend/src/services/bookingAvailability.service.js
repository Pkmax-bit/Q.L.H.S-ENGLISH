/**
 * Khung giờ CÓ THỂ HỌC của học viên, và thuật toán xếp buổi vào những khung đó.
 *
 * Luồng việc: học viên khoanh "em rảnh T5 12h–15h" → giáo viên mở lịch tổng
 * hợp thấy các vùng rảnh chồng lên nhau → bấm sắp tự động → hệ thống đề xuất
 * giờ cho từng người → giáo viên xem rồi mới chốt.
 *
 * Để riêng file vì booking.service.js đã hơn hai nghìn dòng, mà phần này
 * không dùng chung gì với nó ngoài mấy hàm kiểm tra chung.
 */
const { supabase } = require('../config/database');

const PHUT_MAC_DINH = 60;

const phut = (hhmm) => {
  const [h, m] = String(hhmm).slice(0, 5).split(':').map(Number);
  return h * 60 + m;
};

const gio = (p) =>
  `${String(Math.floor(p / 60)).padStart(2, '0')}:${String(p % 60).padStart(2, '0')}`;

/**
 * Gộp các khung dính nhau hoặc đè nhau CỦA CÙNG MỘT NGƯỜI thành một.
 *
 * Người dùng kéo chọn trên lưới 15 phút thì một vùng 12h–15h đến dưới dạng
 * mười hai ô rời. Không gộp thì bảng đầy những mẩu 15 phút, vẽ chồng lên nhau
 * trông như răng cưa, mà thuật toán cũng phải tự gộp lại trước khi xếp.
 */
const gopKhung = (khung) => {
  const sap = [...khung].sort((a, b) =>
    a.session_date === b.session_date
      ? phut(a.start_time) - phut(b.start_time)
      : String(a.session_date).localeCompare(String(b.session_date))
  );
  const ra = [];
  for (const k of sap) {
    const cuoi = ra[ra.length - 1];
    if (
      cuoi &&
      cuoi.session_date === k.session_date &&
      phut(k.start_time) <= phut(cuoi.end_time) // dính hoặc đè
    ) {
      if (phut(k.end_time) > phut(cuoi.end_time)) cuoi.end_time = k.end_time;
      cuoi.desired_minutes = cuoi.desired_minutes ?? k.desired_minutes ?? null;
      continue;
    }
    ra.push({ ...k });
  }
  return ra;
};

/**
 * XẾP LỊCH TỰ ĐỘNG cho một ngày.
 *
 * Bài toán: một giáo viên (một "máy"), mỗi học viên có một khoảng thời gian
 * rảnh và cần một độ dài buổi. Không buổi nào được chồng nhau.
 *
 * Thuật toán: tham lam theo HẠN CHÓT GẦN NHẤT (earliest deadline first) —
 * xếp người có khung KẾT THÚC SỚM NHẤT trước, đặt buổi vào vị trí sớm nhất
 * còn trống trong khung của họ.
 *
 * Vì sao theo giờ KẾT THÚC chứ không theo giờ BẮT ĐẦU: người phải về sớm là
 * người ít đường lui nhất. Xếp theo giờ bắt đầu thì một người rảnh cả ngày
 * đến sớm sẽ chiếm mất chỗ của người chỉ rảnh một tiếng cuối giờ, rồi người
 * đó không còn chỗ nào — dù hoán đổi hai người là cả hai cùng vừa.
 *
 * Ví dụ của đề bài: Vy 12h–15h, Huy 13h–16h, mỗi buổi 90 phút.
 * Vy hết hạn sớm hơn nên xếp trước: 12:00–13:30. Con trỏ nhảy tới 13:30,
 * Huy vào 13:30–15:00 — vẫn nằm trong khung 13h–16h của Huy.
 *
 * `banRoi` là các buổi ĐÃ xếp trong ngày: thuật toán phải tránh, không được
 * đè lên lịch giáo viên đã chốt tay.
 */
const xepMotNgay = (khung, banRoi = [], phutMacDinh = PHUT_MAC_DINH) => {
  // Hạn chót gần nhất trước; cùng hạn thì ai rảnh muộn hơn xếp sau cho gọn
  const sap = [...khung].sort(
    (a, b) => phut(a.end_time) - phut(b.end_time) || phut(a.start_time) - phut(b.start_time)
  );
  const ban = [...banRoi]
    .map((b) => ({ tu: phut(b.start_time), den: phut(b.end_time) }))
    .sort((a, b) => a.tu - b.tu);

  const xep = [];
  const hong = [];
  let contro = 0;

  for (const k of sap) {
    const dai = k.desired_minutes || phutMacDinh;
    let tu = Math.max(contro, phut(k.start_time));
    const hanChot = phut(k.end_time);

    // Nhảy qua những buổi đã chốt tay mà chạm phải
    let yen = false;
    while (!yen) {
      yen = true;
      for (const b of ban) {
        if (tu < b.den && tu + dai > b.tu) {
          tu = b.den;
          yen = false;
        }
      }
    }

    if (tu + dai > hanChot) {
      hong.push({
        ...k,
        ly_do:
          tu > phut(k.start_time)
            ? 'khung bị người xếp trước chiếm mất, không còn đủ chỗ'
            : 'khung ngắn hơn độ dài buổi',
        can_phut: dai,
      });
      continue;
    }

    xep.push({ ...k, start_time: gio(tu), end_time: gio(tu + dai), minutes: dai });
    contro = tu + dai;
  }

  return { xep, hong };
};

/** Khung rảnh trên bảng. Học viên chỉ thấy của mình, người quản lý thấy tất. */
const listAvailability = async (boardId, registrantId, manager) => {
  let q = supabase
    .from('booking_availability')
    .select(
      'id, registrant_id, session_date, start_time, end_time, desired_minutes, note, ' +
        'registrant:booking_registrants!booking_availability_registrant_id_fkey(id, full_name, color)'
    )
    .eq('board_id', boardId)
    .order('session_date', { ascending: true });
  if (!manager) q = q.eq('registrant_id', registrantId);

  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id,
    registrant_id: r.registrant_id,
    date: r.session_date,
    start_time: String(r.start_time).slice(0, 5),
    end_time: String(r.end_time).slice(0, 5),
    desired_minutes: r.desired_minutes,
    note: r.note,
    full_name: r.registrant?.full_name || null,
    color: r.registrant?.color || null,
  }));
};

module.exports = { gopKhung, xepMotNgay, listAvailability, phut, gio, PHUT_MAC_DINH };
