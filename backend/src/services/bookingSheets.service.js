/**
 * Đẩy lịch sang Google Sheets — MỖI NĂM MỘT TAB.
 *
 * Tab chỉ chứa các buổi ĐÃ ĐÓNG DẤU HOÀN THÀNH, kèm số tiền thật đã chốt.
 * Đây là SỔ TIỀN chứ không phải lịch sắp tới: buổi mới đăng ký thì chưa dạy,
 * đưa vào thì cộng lại ra số cao hơn tiền thật thu được.
 *
 * CÁCH ĐỒNG BỘ: ghi lại TOÀN BỘ tab của năm bị ảnh hưởng, không ghi từng dòng
 * theo từng thay đổi. Ghi từng dòng thì phải nhớ dòng nào ứng với buổi nào;
 * lỡ một lần ghi hỏng, hoặc ai đó sửa tay trên Sheet, là lệch vĩnh viễn và
 * không có cách nào biết. Ghi lại cả tab thì Sheet luôn là bản sao đúng của
 * database, hỏng một lần thì lần sau tự đúng lại.
 *
 * HẸN GIỜ 8 GIÂY: kéo một thẻ trên lưới bắn ra vài sự kiện liên tiếp, mà
 * Google chỉ cho 60 lượt ghi mỗi phút. Gom cả chùm thành một lần ghi.
 *
 * KHÔNG DÙNG `googleapis`: gói đó nặng cả trăm MB cho một việc là ký JWT rồi
 * gọi hai endpoint REST. Node có sẵn crypto để ký RS256 và fetch để gọi, nên
 * tự làm gọn hơn nhiều so với kéo thêm một cây phụ thuộc vào bản deploy.
 *
 * THIẾU CẤU HÌNH THÌ IM LẶNG BỎ QUA: trang đăng ký phải chạy được kể cả khi
 * chưa ai cắm chìa khóa Google vào. Báo một lần rồi thôi, không chặn thao tác
 * nào của người dùng.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { supabase } = require('../config/database');

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
const HEN_GIO_MS = 8000;
// Chặn trên cho một năm. Một trung tâm dạy kín cả năm cũng chỉ vài nghìn buổi;
// con số này chỉ để một lỗi dữ liệu nào đó không kéo theo lần ghi khổng lồ.
const TOI_DA_DONG = 5000;

const DAY_VN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// Màu nền dòng, lấy đúng tông -100 của bảng màu trên lưới để nhìn Sheet và
// nhìn lưới ra cùng một người
const MAU_NEN = {
  teal: { red: 0.8, green: 0.95, blue: 0.93 },
  amber: { red: 0.99, green: 0.93, blue: 0.78 },
  violet: { red: 0.93, green: 0.91, blue: 0.996 },
  rose: { red: 1, green: 0.89, blue: 0.91 },
  sky: { red: 0.88, green: 0.95, blue: 0.99 },
  lime: { red: 0.9, green: 0.98, blue: 0.8 },
  orange: { red: 1, green: 0.93, blue: 0.84 },
  indigo: { red: 0.88, green: 0.91, blue: 1 },
  slate: { red: 0.95, green: 0.96, blue: 0.97 },
};

const COT = [
  'Ngày',
  'Thứ',
  'Bắt đầu',
  'Kết thúc',
  'Số phút',
  'Học viên',
  'Điện thoại',
  'Bảng',
  'Ghi chú',
  'Chốt lúc',
  'Tiền',
];

let daBaoThieuCauHinh = false;
let boNho = null; // { token, hetHan }
const henGio = new Map(); // boardId -> timeout

/**
 * ID của file Sheet.
 *
 * Nhận cả khi người cấu hình dán nguyên cái URL: giá trị trong .env hiện là
 * "1AX8.../edit?pli=1#gid=0" — dán nguyên đuôi URL là chuyện rất hay xảy ra,
 * mà để nguyên thì mọi lệnh gọi đều 404 với một thông báo chẳng gợi ý gì.
 */
const layId = () => {
  const raw = String(process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '').trim();
  if (!raw) return null;
  const tuUrl = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (tuUrl) return tuUrl[1];
  return raw.split('/')[0].split('?')[0].split('#')[0] || null;
};

/** Khóa service account: ưu tiên biến môi trường (Render không có file). */
const layKhoa = () => {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
  const file = process.env.GOOGLE_SERVICE_ACCOUNT_FILE;
  if (!file) return null;
  const duong = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  try {
    return JSON.parse(fs.readFileSync(duong, 'utf8'));
  } catch {
    return null;
  }
};

const b64 = (obj) =>
  Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/** Đổi service account lấy access token; giữ lại 55 phút thay vì xin mỗi lần. */
const layToken = async (khoa) => {
  const gio = Math.floor(Date.now() / 1000);
  if (boNho && boNho.hetHan > gio + 60) return boNho.token;

  const dauVao = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: khoa.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: gio,
    exp: gio + 3600,
  })}`;
  const chuKy = crypto.createSign('RSA-SHA256').update(dauVao).end().sign(khoa.private_key);
  const jwt = `${dauVao}.${b64(chuKy)}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Google từ chối cấp token: ${data.error_description || data.error || res.status}`);
  }
  boNho = { token: data.access_token, hetHan: gio + 3300 };
  return data.access_token;
};

const goi = async (token, duong, opt = {}) => {
  const res = await fetch(`${SHEETS}${duong}`, {
    ...opt,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opt.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Sheets ${res.status}: ${data.error?.message || 'lỗi không rõ'}`);
  }
  return data;
};

/** Tab của năm; chưa có thì tạo. Trả về sheetId để còn tô màu theo dòng. */
const tabCuaNam = async (token, fileId, nam) => {
  const file = await goi(token, `/${fileId}?fields=sheets.properties`);
  const co = (file.sheets || []).find((s) => s.properties?.title === String(nam));
  if (co) return co.properties.sheetId;

  const them = await goi(token, `/${fileId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: {
              title: String(nam),
              gridProperties: { rowCount: 1000, columnCount: COT.length, frozenRowCount: 1 },
            },
          },
        },
      ],
    }),
  });
  return them.replies[0].addSheet.properties.sheetId;
};

/** Mọi buổi của một năm, MỌI BẢNG — tab của năm là tab chung, không của riêng bảng nào. */
const docBuoiTrongNam = async (nam) => {
  const { data, error } = await supabase
    .from('booking_requests')
    .select(
      'session_date, start_time, end_time, note, done_at, amount, color, ' +
        'registrant:booking_registrants!booking_requests_registrant_id_fkey(full_name, phone, color, price_per_session), ' +
        'board:booking_boards!booking_requests_board_id_fkey(title)'
    )
    .gte('session_date', `${nam}-01-01`)
    .lte('session_date', `${nam}-12-31`)
    .in('status', ['pending', 'approved'])
    // CHỈ buổi đã đóng dấu hoàn thành. Tab này là sổ tiền: buổi mới đăng ký
    // chưa dạy, đưa vào thì cộng lại ra số cao hơn tiền thật thu được, mà
    // người đọc Sheet không có cột nào để biết dòng nào đã dạy dòng nào chưa.
    .not('done_at', 'is', null)
    .order('session_date', { ascending: true })
    .limit(TOI_DA_DONG);
  if (error) throw error;

  // Sắp theo NGÀY rồi GIỜ. Server chỉ sắp theo ngày, mà đọc một tab lịch thì
  // phải đi theo trình tự thời gian mới có nghĩa.
  return (data || []).sort((a, b) => {
    const d = String(a.session_date).localeCompare(String(b.session_date));
    return d !== 0 ? d : String(a.start_time).localeCompare(String(b.start_time));
  });
};

const soPhut = (bd, kt) => {
  const [h1, m1] = String(bd).split(':').map(Number);
  const [h2, m2] = String(kt).split(':').map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
};

/**
 * Tiền của một buổi: số THẬT đã chốt lúc đóng dấu; buổi nào chốt trước khi có
 * chức năng học phí thì chưa có số nào, lấy tạm giá mặc định của học viên.
 *
 * Giá mặc định chỉ là chỗ dựa cuối: nó là giá HÔM NAY, còn buổi kia dạy từ
 * bao giờ không biết. Bao giờ cũng ưu tiên số đã đóng băng trên chính buổi đó.
 */
const tienCuaBuoi = (r) => {
  if (r.amount !== null && r.amount !== undefined) return Number(r.amount);
  const mac = r.registrant?.price_per_session;
  return mac === null || mac === undefined ? '' : Number(mac);
};

const gioVN = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });
};

const dongCuaBuoi = (r) => [
  String(r.session_date).slice(0, 10),
  DAY_VN[new Date(`${String(r.session_date).slice(0, 10)}T00:00:00`).getDay()],
  String(r.start_time).slice(0, 5),
  String(r.end_time).slice(0, 5),
  soPhut(r.start_time, r.end_time),
  r.registrant?.full_name || '',
  r.registrant?.phone || '',
  r.board?.title || '',
  r.note || '',
  gioVN(r.done_at),
  tienCuaBuoi(r),
];

/**
 * Bảng sẽ ghi lên Sheet của một năm. Tách riêng khỏi phần gọi mạng để còn
 * xem được nội dung mà không cần chìa khóa Google.
 */
const bangChoNam = async (nam) => {
  const buoi = await docBuoiTrongNam(nam);
  return { buoi, bang: [COT, ...buoi.map(dongCuaBuoi)] };
};

/** Ghi lại toàn bộ một tab năm. */
const ghiTabNam = async (token, fileId, nam) => {
  const { buoi, bang } = await bangChoNam(nam);
  const sheetId = await tabCuaNam(token, fileId, nam);

  // Xóa sạch rồi ghi đè. Không dùng update đè lên vùng cũ: tuần này ít buổi
  // hơn tuần trước thì mấy dòng thừa ở dưới vẫn nằm nguyên đó.
  await goi(token, `/${fileId}/values/${encodeURIComponent(`${nam}!A1:Z${TOI_DA_DONG + 10}`)}:clear`, {
    method: 'POST',
    body: '{}',
  });
  await goi(
    token,
    `/${fileId}/values/${encodeURIComponent(`${nam}!A1`)}?valueInputOption=USER_ENTERED`,
    { method: 'PUT', body: JSON.stringify({ values: bang }) }
  );

  // Màu nền từng dòng + định dạng tiêu đề, gộp vào MỘT lượt batchUpdate
  const requests = [
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
        cell: {
          userEnteredFormat: {
            textFormat: { bold: true },
            backgroundColor: { red: 0.93, green: 0.94, blue: 0.96 },
          },
        },
        fields: 'userEnteredFormat(textFormat,backgroundColor)',
      },
    },
    {
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
        fields: 'gridProperties.frozenRowCount',
      },
    },
  ];

  buoi.forEach((r, i) => {
    const mau = MAU_NEN[r.registrant?.color || r.color || 'slate'] || MAU_NEN.slate;
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: i + 1, endRowIndex: i + 2, startColumnIndex: 0, endColumnIndex: COT.length },
        cell: { userEnteredFormat: { backgroundColor: mau } },
        fields: 'userEnteredFormat.backgroundColor',
      },
    });
  });

  await goi(token, `/${fileId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests }),
  });

  return { nam, rows: buoi.length };
};

/** Những năm mà bảng này có buổi — chỉ ghi lại tab của các năm đó. */
const cacNamCuaBang = async (boardId) => {
  const { data } = await supabase
    .from('booking_requests')
    .select('session_date')
    .eq('board_id', boardId)
    .in('status', ['pending', 'approved']);
  return [...new Set((data || []).map((r) => String(r.session_date).slice(0, 4)))];
};

const coCauHinh = () => Boolean(layId() && layKhoa());

/** Chạy ngay, không hẹn giờ. Dùng cho nút "Đồng bộ ngay". */
const dongBoNgay = async (boardId) => {
  const fileId = layId();
  const khoa = layKhoa();
  if (!fileId || !khoa) {
    throw {
      statusCode: 503,
      message: 'Chưa cắm chìa khóa Google: cần GOOGLE_SERVICE_ACCOUNT_JSON (hoặc _FILE) và GOOGLE_SHEETS_SPREADSHEET_ID',
    };
  }
  const token = await layToken(khoa);
  const nam = await cacNamCuaBang(boardId);
  const ketQua = [];
  for (const n of nam) {
    // Tuần tự chứ không song song: Google đếm lượt ghi theo phút, bắn cùng lúc
    // vài năm là ăn 429 ngay
    ketQua.push(await ghiTabNam(token, fileId, n));
  }
  return { tabs: ketQua };
};

/**
 * Hẹn một lần đồng bộ. Gọi bao nhiêu lần trong 8 giây cũng chỉ ghi một lần.
 * Không bao giờ ném lỗi ra ngoài — đây là việc phụ, hỏng thì ghi log.
 */
const henDongBo = (boardId) => {
  if (!boardId) return;
  if (!coCauHinh()) {
    if (!daBaoThieuCauHinh) {
      daBaoThieuCauHinh = true;
      console.log('[sheets] chưa cấu hình Google, bỏ qua đồng bộ lịch sang Sheet');
    }
    return;
  }
  clearTimeout(henGio.get(boardId));
  henGio.set(
    boardId,
    setTimeout(() => {
      henGio.delete(boardId);
      dongBoNgay(boardId)
        .then((r) => console.log(`[sheets] đã ghi ${r.tabs.map((t) => `${t.nam}:${t.rows} dòng`).join(', ')}`))
        .catch((e) => console.warn('[sheets] đồng bộ hỏng:', e.message || e));
    }, HEN_GIO_MS)
  );
};

module.exports = { henDongBo, dongBoNgay, coCauHinh, bangChoNam };
