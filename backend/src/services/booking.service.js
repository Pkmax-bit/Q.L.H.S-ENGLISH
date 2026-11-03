const jwt = require('jsonwebtoken');
const { supabase } = require('../config/database');
const jwtConfig = require('../config/jwt');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');
const { normalizePhone, isValidPhone, maskName } = require('../utils/phone');
const { assignColors, DEFAULT_COLOR, PALETTE, nextRegistrantColor } = require('../utils/bookingColors');
const sheets = require('./bookingSheets.service');
const { emitNotification } = require('../socket');

const REGISTRANT_EMBED = 'registrant:booking_registrants!booking_entries_registrant_id_fkey(id, full_name, phone)';
const SLUG_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'; // bỏ l, o, 0, 1 cho dễ đọc qua điện thoại
const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MAX_WEEKS = 6;

// ---------------------------------------------------------------- helpers

const addDays = (iso, days) => {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Lùi về thứ 2 của tuần chứa ngày đó — booking_boards có CHECK bắt buộc ISODOW = 1. */
const toMonday = (value) => {
  const raw = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw { statusCode: 400, message: 'Tuần bắt đầu không hợp lệ (định dạng YYYY-MM-DD)' };
  }
  const d = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    throw { statusCode: 400, message: 'Tuần bắt đầu không hợp lệ' };
  }
  const dow = d.getUTCDay(); // 0 = CN
  d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return d.toISOString().slice(0, 10);
};

/** Ngày thật của một ca trong một tuần cụ thể. weekStart là thứ 2, day_of_week 0=CN..6=T7. */
const slotDate = (weekStart, dayOfWeek) =>
  addDays(weekStart, Number(dayOfWeek) === 0 ? 6 : Number(dayOfWeek) - 1);

/** Danh sách các tuần mà một bảng phụ trách. */
const weeksOf = (board) => {
  const count = Math.max(1, Math.min(MAX_WEEKS, Number(board.week_count) || 1));
  return Array.from({ length: count }, (_, i) => {
    const start = addDays(board.week_start, i * 7);
    return { index: i + 1, week_start: start, week_end: addDays(start, 6) };
  });
};

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Tuần nào được mở sẵn khi học viên vào trang.
 * Ưu tiên: tuần người dùng chọn -> tuần chứa hôm nay -> tuần sắp tới gần nhất -> tuần đầu.
 * Nếu mở mặc định tuần đầu của bảng cả tháng thì giữa tháng ai vào cũng thấy
 * tuần đã qua, phải tự bấm sang tuần hiện tại — phiền vô ích.
 */
const pickWeek = (weeks, requested) => {
  if (requested) {
    const asked = String(requested).slice(0, 10);
    const hit = weeks.find((w) => w.week_start === asked || (asked >= w.week_start && asked <= w.week_end));
    if (hit) return hit;
  }
  const today = todayIso();
  const current = weeks.find((w) => today >= w.week_start && today <= w.week_end);
  if (current) return current;
  const upcoming = weeks.find((w) => w.week_start > today);
  return upcoming || weeks[weeks.length - 1];
};

const randomSlug = (len = 7) => {
  let out = '';
  for (let i = 0; i < len; i += 1) {
    out += SLUG_ALPHABET[Math.floor(Math.random() * SLUG_ALPHABET.length)];
  }
  return out;
};

const slugTaken = async (slug) => {
  const { data, error } = await supabase
    .from('booking_boards')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
};

const makeUniqueSlug = async () => {
  for (let i = 0; i < 8; i += 1) {
    const candidate = randomSlug();
    if (!(await slugTaken(candidate))) return candidate;
  }
  throw { statusCode: 500, message: 'Không tạo được mã link, thử lại' };
};

const normalizeSlug = (value) => {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(slug)) {
    throw { statusCode: 400, message: 'Mã link chỉ gồm chữ thường, số và dấu gạch ngang, dài 3–64 ký tự' };
  }
  return slug;
};

const parseWeekCount = (value) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > MAX_WEEKS) {
    throw { statusCode: 400, message: `Số tuần phải từ 1 đến ${MAX_WEEKS}` };
  }
  return n;
};

const issueBookingToken = (registrant) =>
  jwt.sign(
    { rid: registrant.id, phone: registrant.phone, kind: 'booking' },
    jwtConfig.booking.secret,
    { expiresIn: jwtConfig.booking.expiresIn }
  );

const isAccepting = (board) => {
  if (!board.is_open) return false;
  const now = Date.now();
  if (board.opens_at && now < new Date(board.opens_at).getTime()) return false;
  if (board.closes_at && now > new Date(board.closes_at).getTime()) return false;
  return true;
};

const parseTime = (value, field) => {
  const s = String(value || '').trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) {
    throw { statusCode: 400, message: `${field} không hợp lệ (định dạng HH:MM)` };
  }
  return `${m[1].padStart(2, '0')}:${m[2]}:${m[3] || '00'}`;
};

const parseSlotPayload = (data, { partial = false } = {}) => {
  const out = {};
  const has = (k) => Object.prototype.hasOwnProperty.call(data, k);

  if (!partial || has('day_of_week')) {
    const dow = Number(data.day_of_week);
    if (!Number.isInteger(dow) || dow < 0 || dow > 6) {
      throw { statusCode: 400, message: 'Thứ không hợp lệ (0 = CN, 1 = T2 ... 6 = T7)' };
    }
    out.day_of_week = dow;
  }
  if (!partial || has('start_time')) out.start_time = parseTime(data.start_time, 'Giờ bắt đầu');
  if (!partial || has('end_time')) out.end_time = parseTime(data.end_time, 'Giờ kết thúc');
  if (out.start_time && out.end_time && out.end_time <= out.start_time) {
    throw { statusCode: 400, message: 'Giờ kết thúc phải sau giờ bắt đầu' };
  }
  if (!partial || has('capacity')) {
    const cap = Number(data.capacity ?? 10);
    if (!Number.isInteger(cap) || cap < 1 || cap > 999) {
      throw { statusCode: 400, message: 'Sĩ số tối đa phải từ 1 đến 999' };
    }
    out.capacity = cap;
  }
  if (has('label')) out.label = data.label ? String(data.label).trim() : null;
  if (has('teacher_name')) out.teacher_name = data.teacher_name ? String(data.teacher_name).trim() : null;
  if (has('room_name')) out.room_name = data.room_name ? String(data.room_name).trim() : null;
  if (has('note')) out.note = data.note ? String(data.note).trim() : null;
  if (has('allow_waitlist')) out.allow_waitlist = Boolean(data.allow_waitlist);
  if (has('is_active')) out.is_active = Boolean(data.is_active);
  if (has('order_index')) out.order_index = Number(data.order_index) || 0;
  if (has('price_amount')) {
    // Học phí của ca: để trống = chưa đặt, khác hẳn với 0 đồng (miễn phí)
    const raw = data.price_amount;
    if (raw === null || raw === '' || raw === undefined) {
      out.price_amount = null;
    } else {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 1e12) {
        throw { statusCode: 400, message: 'Học phí của ca không hợp lệ' };
      }
      out.price_amount = Math.round(n);
    }
  }

  return out;
};

/** Gom entries theo khóa (slot_id|session_date) — sĩ số nay tính theo từng ngày. */
const groupEntriesBySlotDate = (entries) => {
  const map = new Map();
  for (const e of entries) {
    const key = `${e.slot_id}|${e.session_date}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(e);
  }
  return map;
};

const fetchBoardBySlug = async (slug) => {
  const { data, error } = await supabase
    .from('booking_boards')
    .select('*')
    .eq('slug', String(slug || '').trim().toLowerCase())
    .maybeSingle();
  if (error) throw error;
  if (!data) throw { statusCode: 404, message: 'Không tìm thấy bảng đăng ký. Kiểm tra lại đường link.' };
  return data;
};

const publicBoardShape = (board, weeks, selectedWeek) => ({
  id: board.id,
  slug: board.slug,
  title: board.title,
  description: board.description,
  week_start: board.week_start,
  week_count: board.week_count,
  week_end: weeks[weeks.length - 1].week_end,
  selected_week: selectedWeek.week_start,
  selected_week_end: selectedWeek.week_end,
  is_open: board.is_open,
  is_accepting: isAccepting(board),
  opens_at: board.opens_at,
  closes_at: board.closes_at,
  max_slots_per_person: board.max_slots_per_person,
});

// ------------------------------------------------------- công khai (no JWT)

/**
 * Nhận diện người đăng ký bằng SĐT.
 * - SĐT đã có -> trả thông tin + token, không cần nhập tên.
 * - SĐT lạ mà chưa gửi họ tên -> báo needs_name để frontend hiện thêm ô tên.
 */
const identify = async ({ phone, full_name }) => {
  const normalized = normalizePhone(phone);
  if (!normalized || !isValidPhone(normalized)) {
    throw { statusCode: 400, message: 'Số điện thoại không hợp lệ. Ví dụ: 0912345678' };
  }

  const { data: existing, error } = await supabase
    .from('booking_registrants')
    .select('id, phone, full_name, is_manager, created_at')
    .eq('phone', normalized)
    .maybeSingle();
  if (error) throw error;

  if (existing) {
    const name = String(full_name || '').trim();
    // Cho phép sửa tên nếu lần này người ta gõ tên khác (vd lần đầu gõ thiếu dấu)
    const patch = { last_login_at: new Date().toISOString() };
    if (name && name !== existing.full_name) patch.full_name = name;

    const { data: updated, error: upErr } = await supabase
      .from('booking_registrants')
      .update(patch)
      .eq('id', existing.id)
      .select('id, phone, full_name, is_manager')
      .single();
    if (upErr) throw upErr;

    return {
      needs_name: false,
      is_new: false,
      registrant: updated,
      booking_token: issueBookingToken(updated),
    };
  }

  const name = String(full_name || '').trim();
  if (!name) {
    return { needs_name: true, is_new: true, registrant: null, booking_token: null };
  }
  if (name.length < 2 || name.length > 80) {
    throw { statusCode: 400, message: 'Họ tên phải từ 2 đến 80 ký tự' };
  }

  // Cấp màu ngay lúc tạo: chọn màu đang ít người dùng nhất nên 9 người đầu
  // không ai trùng ai trên lưới
  const { data: usedRows } = await supabase.from('booking_registrants').select('color');
  const color = nextRegistrantColor((usedRows || []).map((r) => r.color).filter(Boolean));

  const { data: created, error: insErr } = await supabase
    .from('booking_registrants')
    .insert({ phone: normalized, full_name: name, color, last_login_at: new Date().toISOString() })
    .select('id, phone, full_name, color, is_manager')
    .single();
  if (insErr) {
    // Hai tab cùng bấm đăng ký một lúc -> unique violation, đọc lại cho mượt
    if (insErr.code === '23505') {
      const { data: raced } = await supabase
        .from('booking_registrants')
        .select('id, phone, full_name')
        .eq('phone', normalized)
        .single();
      if (raced) {
        return { needs_name: false, is_new: false, registrant: raced, booking_token: issueBookingToken(raced) };
      }
    }
    throw insErr;
  }

  return {
    needs_name: false,
    is_new: true,
    registrant: created,
    booking_token: issueBookingToken(created),
  };
};

/**
 * Bảng công khai của MỘT tuần trong bảng. KHÔNG trả số điện thoại của ai.
 * Kèm danh sách tuần để frontend dựng thanh chọn tuần.
 */
const getPublicBoard = async (slug, registrantId = null, requestedWeek = null) => {
  const board = await fetchBoardBySlug(slug);
  const weeks = weeksOf(board);
  const selected = pickWeek(weeks, requestedWeek);

  const { data: slots, error: slotErr } = await supabase
    .from('booking_slots')
    .select('id, day_of_week, start_time, end_time, label, teacher_name, room_name, capacity, allow_waitlist, note, order_index, created_by, price_amount')
    .eq('board_id', board.id)
    .eq('is_active', true)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })
    .order('order_index', { ascending: true });
  if (slotErr) throw slotErr;

  // Chỉ lấy lượt giữ chỗ của tuần đang xem — bảng một tháng mà kéo hết thì phí
  let entries = [];
  if (slots?.length) {
    const { data, error } = await supabase
      .from('booking_entries')
      .select(`id, slot_id, registrant_id, session_date, status, created_at, price_tier_id, price_amount, ${REGISTRANT_EMBED}, tier:booking_price_tiers!booking_entries_price_tier_id_fkey(id, name, amount)`)
      .in('slot_id', slots.map((s) => s.id))
      .gte('session_date', selected.week_start)
      .lte('session_date', selected.week_end)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true });
    if (error) throw error;
    entries = data || [];
  }

  // Đếm chỗ của chính mình theo từng tuần, để chấm dấu lên thanh chọn tuần
  const myWeekCounts = {};
  const myAllEntries = [];
  if (registrantId) {
    const { data: mineAll, error: mineErr } = await supabase
      .from('booking_entries')
      .select('id, slot_id, session_date, status, slot:booking_slots!booking_entries_slot_id_fkey(day_of_week, start_time, end_time, label, teacher_name, room_name)')
      .eq('board_id', board.id)
      .eq('registrant_id', registrantId)
      .neq('status', 'cancelled')
      .order('session_date', { ascending: true });
    if (mineErr) throw mineErr;

    for (const row of mineAll || []) {
      const w = weeks.find((x) => row.session_date >= x.week_start && row.session_date <= x.week_end);
      if (w) myWeekCounts[w.week_start] = (myWeekCounts[w.week_start] || 0) + 1;

      // Bảng nhiều tuần: học viên phải thấy được TOÀN BỘ chỗ của mình, nếu không
      // muốn hủy một ca tuần sau lại phải mò qua từng tuần
      myAllEntries.push({
        id: row.id,
        slot_id: row.slot_id,
        status: row.status,
        date: row.session_date,
        week_start: w ? w.week_start : null,
        week_index: w ? w.index : null,
        day_of_week: row.slot?.day_of_week ?? null,
        start_time: row.slot ? String(row.slot.start_time).slice(0, 5) : null,
        end_time: row.slot ? String(row.slot.end_time).slice(0, 5) : null,
        label: row.slot?.label || null,
        teacher_name: row.slot?.teacher_name || null,
        room_name: row.slot?.room_name || null,
      });
    }
  }

  // Buổi đã đăng ký để vẽ lên lưới.
  //
  // Người thường: chỉ buổi của chính mình. Người quản lý (047): buổi của MỌI
  // học viên trên bảng, kèm tên — đó là lý do có cờ, và cũng là lý do cờ phải
  // đọc từ DB chứ không nhận từ client.
  const manager = await isManagerSession(registrantId);
  const myRequests = [];
  if (registrantId) {
    let q = supabase
      .from('booking_requests')
      .select(
        'id, registrant_id, session_date, start_time, end_time, status, session_count, color, note, is_marked, is_bold, done_at, amount, ' +
          'registrant:booking_registrants!booking_requests_registrant_id_fkey(id, full_name, phone, color, price_per_session)'
      )
      .eq('board_id', board.id)
      .in('status', ['pending', 'approved'])
      .order('session_date', { ascending: true });
    if (!manager) q = q.eq('registrant_id', registrantId);

    const { data: reqs, error: reqErr } = await q;
    if (reqErr) throw reqErr;

    for (const r of reqs || []) {
      myRequests.push({
        id: r.id,
        registrant_id: r.registrant_id,
        date: r.session_date,
        start_time: String(r.start_time).slice(0, 5),
        end_time: String(r.end_time).slice(0, 5),
        status: r.status,
        session_count: r.session_count,
        color: r.registrant?.color || r.color || null,
        note: r.note || null,
        is_marked: Boolean(r.is_marked),
        is_bold: Boolean(r.is_bold),
        done_at: r.done_at || null,
        // Tiền CHỈ gửi cho người quản lý. Học viên không thấy cả giá của
        // chính mình: trang này công khai, chỉ cần một số điện thoại là vào
        // được, nên học phí lọt ra đây là lọt ra ngoài.
        amount: manager && r.amount !== null && r.amount !== undefined ? Number(r.amount) : null,
        price_per_session:
          manager &&
          r.registrant?.price_per_session !== null &&
          r.registrant?.price_per_session !== undefined
            ? Number(r.registrant.price_per_session)
            : null,
        full_name: r.registrant?.full_name || null,
        // Số điện thoại chỉ lộ cho người quản lý
        phone: manager ? r.registrant?.phone || null : null,
      });
    }
  }

  let unreadMessages = 0;
  if (registrantId) {
    let q = supabase
      .from('booking_messages')
      .select('id', { count: 'exact', head: true })
      .eq('board_id', board.id)
      .is('read_at', null);
    q = manager ? q.eq('sender', 'student') : q.eq('registrant_id', registrantId).eq('sender', 'center');
    const { count } = await q;
    unreadMessages = count || 0;
  }

  const byKey = groupEntriesBySlotDate(entries);
  const colorOf = assignColors((slots || []).map((s) => s.created_by));
  const mine = [];

  const slotRows = (slots || []).map((slot) => {
    const date = slotDate(selected.week_start, slot.day_of_week);
    const rows = byKey.get(`${slot.id}|${date}`) || [];
    const confirmed = rows.filter((r) => r.status === 'confirmed');
    const waitlist = rows.filter((r) => r.status === 'waitlist');
    const myRow = registrantId ? rows.find((r) => r.registrant_id === registrantId) : null;

    const payload = {
      id: slot.id,
      day_of_week: slot.day_of_week,
      date,
      start_time: String(slot.start_time).slice(0, 5),
      end_time: String(slot.end_time).slice(0, 5),
      label: slot.label,
      teacher_name: slot.teacher_name,
      room_name: slot.room_name,
      note: slot.note,
      price_amount: slot.price_amount,
      // Chỉ trả KHÓA màu, không trả danh tính người tạo ra nhánh công khai
      color: colorOf.get(slot.created_by) || DEFAULT_COLOR,
      capacity: slot.capacity,
      confirmed_count: confirmed.length,
      waitlist_count: waitlist.length,
      seats_left: Math.max(0, slot.capacity - confirmed.length),
      is_full: confirmed.length >= slot.capacity,
      allow_waitlist: slot.allow_waitlist,
      // Chỉ tên viết tắt — SĐT không bao giờ rời backend ở nhánh công khai
      people: confirmed.map((r) => maskName(r.registrant?.full_name)),
      waitlist_people: waitlist.map((r) => maskName(r.registrant?.full_name)),
      my_entry: myRow ? { id: myRow.id, status: myRow.status } : null,
    };

    if (myRow) {
      mine.push({
        ...payload.my_entry,
        slot_id: slot.id,
        date,
        start_time: payload.start_time,
        end_time: payload.end_time,
        label: slot.label,
      });
    }
    return payload;
  });

  return {
    board: publicBoardShape(board, weeks, selected),
    weeks: weeks.map((w) => ({ ...w, my_count: myWeekCounts[w.week_start] || 0 })),
    slots: slotRows,
    my_entries: mine,
    my_count: mine.length,
    my_all_entries: myAllEntries,
    my_all_count: myAllEntries.length,
    my_requests: myRequests,
    // Số tin chưa đọc để vẽ chấm đỏ trên nút chat. Người quản lý đếm tin của
    // MỌI học viên, học viên chỉ đếm tin trung tâm gửi cho mình.
    unread_messages: unreadMessages,
    // Frontend bật bảng màu + select học viên theo cờ này; quyền thật vẫn do
    // server kiểm lại ở từng API, đây chỉ để khỏi hiện nút bấm vào thì lỗi
    is_manager: manager,
  };
};

const RPC_ERRORS = {
  slot_not_found: { statusCode: 404, message: 'Ca học không còn tồn tại' },
  slot_inactive: { statusCode: 400, message: 'Ca học này đã tạm ngưng' },
  board_not_found: { statusCode: 404, message: 'Bảng đăng ký không còn tồn tại' },
  board_closed: { statusCode: 403, message: 'Bảng đăng ký đã đóng, không nhận thêm' },
  slot_full: { statusCode: 409, message: 'Ca này vừa đủ chỗ, bạn chọn ca khác giúp nhé' },
  date_day_mismatch: { statusCode: 400, message: 'Ngày không khớp với thứ của ca học' },
  date_out_of_range: { statusCode: 400, message: 'Ngày này nằm ngoài phạm vi bảng đăng ký' },
  entry_not_found: { statusCode: 404, message: 'Không tìm thấy đăng ký này' },
  not_owner: { statusCode: 403, message: 'Bạn chỉ có thể hủy chỗ của mình' },
};

const MIN_OF_DAY = 24 * 60 - 1; // 23:59

const toMinutes = (hhmm) => {
  const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
};

const fromMinutes = (total) => {
  const t = Math.max(0, Math.min(MIN_OF_DAY, Math.round(total)));
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}:00`;
};

/**
 * Khung giờ của một ô nguyện vọng.
 *
 * Nhận ba dạng, ưu tiên từ cụ thể đến khái quát:
 *   { start_time, end_time }  -> dùng nguyên (cho phép gõ tay 09:15–09:50)
 *   { start_time, duration }  -> tính end theo thời lượng phút
 *   { hour }                  -> ô 1 tiếng kiểu cũ, giữ để không vỡ client cũ
 *
 * 23:xx không thể kết thúc sang 24:00 nên luôn kẹp về 23:59.
 */
const slotRange = (cell = {}) => {
  let start = toMinutes(cell.start_time);
  if (start === null && cell.hour !== undefined && cell.hour !== null) {
    const h = Number(cell.hour);
    if (!Number.isInteger(h) || h < 0 || h > 23) {
      throw { statusCode: 400, message: 'Giờ không hợp lệ' };
    }
    start = h * 60;
  }
  if (start === null) {
    throw { statusCode: 400, message: 'Thiếu giờ bắt đầu (định dạng HH:MM)' };
  }

  let end = toMinutes(cell.end_time);
  if (end === null) {
    const dur = Number(cell.duration ?? cell.step ?? 60);
    if (!Number.isInteger(dur) || dur < 5 || dur > 12 * 60) {
      throw { statusCode: 400, message: 'Thời lượng phải từ 5 phút đến 12 tiếng' };
    }
    end = start + dur;
  }

  end = Math.min(end, MIN_OF_DAY);
  if (end <= start) {
    throw { statusCode: 400, message: 'Giờ kết thúc phải sau giờ bắt đầu' };
  }

  return { start_time: fromMinutes(start), end_time: fromMinutes(end) };
};

/**
 * Báo cho mọi người đang mở bảng này: có thứ gì đó vừa đổi, tải lại đi.
 *
 * Chỉ gửi tín hiệu kèm `action`, KHÔNG gửi dữ liệu thay đổi: mỗi phiên thấy
 * một tập dữ liệu khác nhau (học viên chỉ thấy buổi của mình, người quản lý
 * thấy tất cả), đẩy thẳng bản ghi đi thì sẽ lộ buổi của người khác sang máy
 * người không có quyền. Nhận tín hiệu rồi client tự gọi API của mình.
 */
const notifyBoard = (boardId, action, extra = {}) => {
  if (!boardId) return;
  emitNotification(
    'booking:board_changed',
    { board_id: boardId, action, ...extra, ts: Date.now() },
    `booking_board:${boardId}`
  );
  // Một chỗ duy nhất để móc đồng bộ Sheet vào: mọi thao tác đổi lịch đều đã
  // gọi qua đây rồi. Rải lời gọi vào 13 chỗ sửa dữ liệu thì chỉ cần quên một
  // chỗ là Sheet lệch mà không ai biết.
  sheets.henDongBo(boardId);
};

/**
 * Ghi một dòng nhật ký. KHÔNG bao giờ làm hỏng thao tác chính.
 *
 * Bọc try/catch và không await ở chỗ gọi: nhật ký hỏng thì mất một dòng lịch
 * sử, còn để nó ném lỗi ngược ra thì học viên bấm đăng ký lại báo thất bại
 * trong khi buổi đã lưu xong.
 */
const logActivity = async ({ boardId, actor, action, targetId = null, detail = null }) => {
  try {
    await supabase.from('booking_activity_log').insert({
      board_id: boardId || null,
      actor_registrant_id: actor?.registrantId || null,
      actor_user_id: actor?.userId || null,
      actor_name: actor?.name || null,
      action,
      target_id: targetId,
      detail,
    });
  } catch (err) {
    console.error('[activity-log]', action, err.message);
  }
};

/** Tên người làm để ghi vào nhật ký, lấy một lần rồi chụp lại */
const actorFromRegistrant = async (registrantId) => {
  if (!registrantId) return null;
  const { data } = await supabase
    .from('booking_registrants')
    .select('full_name')
    .eq('id', registrantId)
    .maybeSingle();
  return { registrantId, name: data?.full_name || null };
};

/**
 * Phiên công khai này có phải người quản lý không.
 *
 * Luôn đọc lại từ DB theo registrant_id trong token: cờ là quyền xem dữ liệu
 * của người khác, không bao giờ tin client gửi lên.
 */
const isManagerSession = async (registrantId) => {
  if (!registrantId) return false;
  const { data, error } = await supabase
    .from('booking_registrants')
    .select('is_manager')
    .eq('id', registrantId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.is_manager);
};

/** Tên + cờ quản lý của một người, cho tầng socket in danh sách đang online. */
const getRegistrantBrief = async (registrantId) => {
  if (!registrantId) return null;
  const { data, error } = await supabase
    .from('booking_registrants')
    .select('id, full_name, is_manager')
    .eq('id', registrantId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
};

const assertSessionDate = (value) => {
  const date = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw { statusCode: 400, message: 'Thiếu ngày học hoặc ngày không hợp lệ' };
  }
  return date;
};

/** Giữ chỗ — sĩ số do hàm SQL khóa hàng kiểm tra, không đếm ở đây. */
const registerSlot = async (slotId, registrantId, sessionDate) => {
  const date = assertSessionDate(sessionDate);

  const { data, error } = await supabase.rpc('book_booking_slot', {
    p_slot_id: slotId,
    p_registrant_id: registrantId,
    p_session_date: date,
  });
  if (error) throw error;

  if (!data?.ok) {
    if (data?.code === 'person_limit_reached') {
      throw {
        statusCode: 409,
        message: `Mỗi người chỉ được giữ tối đa ${data.limit} ca trong một tuần`,
      };
    }
    throw RPC_ERRORS[data?.code] || { statusCode: 400, message: 'Không giữ được chỗ, thử lại' };
  }

  // Lấy board để báo cho mọi người đang mở bảng; hỏng câu này cũng không sao,
  // chỉ là màn người khác chậm tới lần làm mới sau
  const { data: slotRow } = await supabase
    .from('booking_slots')
    .select('board_id')
    .eq('id', slotId)
    .maybeSingle();
  notifyBoard(slotRow?.board_id, 'entry.register');

  return {
    entry_id: data.entry_id,
    status: data.status,
    session_date: data.session_date || date,
    already_booked: data.code === 'already_booked',
  };
};

/** Người đăng ký tự hủy chỗ của mình. */
const cancelEntry = async (entryId, registrantId) => {
  const { data, error } = await supabase.rpc('cancel_booking_entry', {
    p_entry_id: entryId,
    p_registrant_id: registrantId,
  });
  if (error) throw error;
  if (!data?.ok) {
    throw RPC_ERRORS[data?.code] || { statusCode: 400, message: 'Không hủy được, thử lại' };
  }
  const { data: entryRow } = await supabase
    .from('booking_entries')
    .select('slot:booking_slots!booking_entries_slot_id_fkey(board_id)')
    .eq('id', entryId)
    .maybeSingle();
  notifyBoard(entryRow?.slot?.board_id, 'entry.cancel');

  return { entry_id: entryId, promoted_entry_id: data.promoted_entry_id || null };
};

/**
 * Một người không thể có hai buổi chồng giờ nhau.
 *
 * Chỉ xét CÙNG MỘT học viên: hai người khác nhau học cùng khung giờ là chuyện
 * bình thường (lớp nhóm), chặn hết thì không xếp nổi lịch. Nhưng một người ngồi
 * hai buổi cùng lúc thì chắc chắn là nhầm.
 *
 * Kiểm ở server chứ không chỉ ở giao diện: kéo thả, API, hay màn hình khác
 * đang mở dữ liệu cũ — đường nào cũng phải đi qua đây.
 */
const assertNoSelfOverlap = async (boardId, registrantId, date, startHHMM, endHHMM, exceptId = null) => {
  const toMin = (t) => {
    const [h, m] = String(t).split(':');
    return (Number(h) || 0) * 60 + (Number(m) || 0);
  };
  const from = toMin(startHHMM);
  const to = toMin(endHHMM);

  let q = supabase
    .from('booking_requests')
    .select('id, start_time, end_time')
    .eq('board_id', boardId)
    .eq('registrant_id', registrantId)
    .eq('session_date', String(date).slice(0, 10))
    .in('status', ['pending', 'approved']);
  if (exceptId) q = q.neq('id', exceptId);

  const { data, error } = await q;
  if (error) throw error;

  const hit = (data || []).find((r) => toMin(r.start_time) < to && toMin(r.end_time) > from);
  if (hit) {
    throw {
      statusCode: 409,
      message: `Trùng giờ với buổi ${String(hit.start_time).slice(0, 5)}–${String(hit.end_time).slice(0, 5)} của chính học viên này`,
    };
  }
};

/**
 * Gửi nguyện vọng giờ học cho các ô TRỐNG đã chọn.
 *
 * KHÔNG giữ chỗ, không đụng tới sĩ số. Chỉ là lời nhắn "em muốn học giờ này" để
 * trung tâm thấy giờ nào đông rồi mở ca thật.
 */
const createRequests = async (slug, registrantId, cells = []) => {
  const board = await fetchBoardBySlug(slug);
  // Người quản lý xếp lịch hộ: không chịu hai rào dành cho học viên — bảng đã
  // đóng vẫn thêm được, và xếp bù vào ngày đã qua là việc bình thường (buổi đã
  // dạy hôm kia mà quên ghi thì vẫn phải ghi lại được).
  const manager = await isManagerSession(registrantId);
  if (!manager && !isAccepting(board)) {
    throw { statusCode: 403, message: 'Bảng đăng ký đã đóng, không nhận thêm' };
  }
  if (!Array.isArray(cells) || cells.length === 0) {
    throw { statusCode: 400, message: 'Chưa chọn khung giờ nào' };
  }
  if (cells.length > 50) {
    throw { statusCode: 400, message: 'Mỗi lần chỉ gửi tối đa 50 khung giờ' };
  }

  const weeks = weeksOf(board);
  const lastDay = weeks[weeks.length - 1].week_end;
  const today = todayIso();

  const rows = [];
  for (const cell of cells) {
    const date = assertSessionDate(cell.session_date ?? cell.date);
    const { start_time, end_time } = slotRange(cell);

    if (date < board.week_start || date > lastDay) {
      throw { statusCode: 400, message: `Ngày ${date} nằm ngoài phạm vi bảng đăng ký` };
    }
    // Học viên xin một giờ đã trôi qua là vô nghĩa và làm nhiễu thống kê nhu cầu.
    // Người quản lý thì ngược lại, ghi bù quá khứ mới là việc hay phải làm.
    if (!manager && date < today) {
      throw { statusCode: 400, message: `Ngày ${date} đã qua, không gửi nguyện vọng được` };
    }

    const sessions = Number(cell.session_count ?? 1);
    if (!Number.isInteger(sessions) || sessions < 1 || sessions > 200) {
      throw { statusCode: 400, message: 'Số buổi phải từ 1 đến 200' };
    }

    await assertNoSelfOverlap(board.id, registrantId, date, start_time, end_time);

    rows.push({
      board_id: board.id,
      registrant_id: registrantId,
      session_date: date,
      start_time,
      end_time,
      session_count: sessions,
      note: cell.note ? String(cell.note).trim().slice(0, 500) : null,
    });
  }

  // Bấm lại ô đã gửi thì bỏ qua, không báo lỗi — người dùng không quan tâm
  // chuyện trùng, họ chỉ muốn "giờ này em muốn học"
  const { data: existing, error: exErr } = await supabase
    .from('booking_requests')
    .select('session_date, start_time')
    .eq('board_id', board.id)
    .eq('registrant_id', registrantId)
    .in('status', ['pending', 'approved']);
  if (exErr) throw exErr;

  const taken = new Set((existing || []).map((r) => `${r.session_date}|${String(r.start_time).slice(0, 5)}`));
  const fresh = rows.filter((r) => !taken.has(`${r.session_date}|${r.start_time.slice(0, 5)}`));

  if (fresh.length === 0) {
    return { created: 0, skipped: rows.length };
  }

  const { data: created, error } = await supabase
    .from('booking_requests')
    .insert(fresh)
    .select('id, session_date, start_time, end_time, status');
  if (error) throw error;

  const actor = await actorFromRegistrant(registrantId);
  for (const row of created || []) {
    logActivity({
      boardId: board.id,
      actor,
      action: 'request.create',
      targetId: row.id,
      detail: {
        ngay: row.session_date,
        gio: `${String(row.start_time).slice(0, 5)}–${String(row.end_time).slice(0, 5)}`,
      },
    });
  }

  notifyBoard(board.id, 'request.create');
  return { created: created?.length || 0, skipped: rows.length - fresh.length, data: created };
};

/** Người đăng ký tự rút nguyện vọng của mình. */
const cancelRequest = async (requestId, registrantId) => {
  const { data: row, error } = await supabase
    .from('booking_requests')
    .select('id, board_id, registrant_id, status, session_date, start_time')
    .eq('id', requestId)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw { statusCode: 404, message: 'Không tìm thấy nguyện vọng này' };
  if (row.registrant_id !== registrantId && !(await isManagerSession(registrantId))) {
    throw { statusCode: 403, message: 'Bạn chỉ có thể rút nguyện vọng của mình' };
  }
  if (row.status === 'cancelled') return { id: requestId };

  const { error: upErr } = await supabase
    .from('booking_requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', requestId);
  if (upErr) throw upErr;

  logActivity({
    boardId: row.board_id,
    actor: await actorFromRegistrant(registrantId),
    action: 'request.cancel',
    targetId: requestId,
    detail: { ngay: row.session_date, gio: String(row.start_time).slice(0, 5) },
  });
  notifyBoard(row.board_id, 'request.cancel');
  return { id: requestId };
};

/**
 * Sửa một buổi đã đăng ký: giờ, ghi chú, số buổi, màu.
 *
 * `registrantId` khác null = người đăng ký tự sửa, chỉ đụng được buổi của
 * chính mình và KHÔNG đổi màu (màu là việc xếp lớp của trung tâm).
 * Null = admin/giáo viên sửa hộ; riêng màu thì route chỉ cho admin.
 *
 * Giờ mới đi qua đúng hàm slotRange như lúc tạo, nên 09:15–09:50 hay
 * "bắt đầu + thời lượng" đều nhận, và end <= start bị chặn ngay.
 */
const updateRequest = async (
  requestId,
  patch = {},
  { registrantId = null, canColor = false, actorUserId = null, actorName = null } = {}
) => {
  const { data: row, error } = await supabase
    .from('booking_requests')
    .select('id, board_id, registrant_id, status, session_date, start_time, end_time')
    .eq('id', requestId)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw { statusCode: 404, message: 'Không tìm thấy buổi đăng ký này' };
  const manager = registrantId ? await isManagerSession(registrantId) : false;
  if (registrantId && !manager && row.registrant_id !== registrantId) {
    throw { statusCode: 403, message: 'Bạn chỉ sửa được buổi của mình' };
  }

  const update = { updated_at: new Date().toISOString() };

  if (patch.start_time !== undefined || patch.end_time !== undefined) {
    const range = slotRange({
      start_time: patch.start_time ?? String(row.start_time).slice(0, 5),
      end_time: patch.end_time ?? String(row.end_time).slice(0, 5),
    });
    update.start_time = range.start_time;
    update.end_time = range.end_time;
  }

  if (patch.session_date !== undefined) {
    // Kéo khối sang ngày khác trên lưới. Vẫn qua assertSessionDate để không
    // nhận được chuỗi rác, nhưng KHÔNG chặn ngày đã qua: admin xếp bù buổi cũ
    // là việc bình thường.
    update.session_date = assertSessionDate(patch.session_date);
  }

  if (patch.note !== undefined) {
    const clean = patch.note === null || String(patch.note).trim() === ''
      ? null
      : String(patch.note).trim().slice(0, 500);
    update.note = clean;
  }

  if (patch.is_marked !== undefined) {
    update.is_marked = Boolean(patch.is_marked);
  }

  if (patch.is_bold !== undefined) {
    update.is_bold = Boolean(patch.is_bold);
  }

  if (patch.done !== undefined) {
    // Gửi done: true/false, server tự chấm mốc thời gian — client không được
    // tự đặt giờ hoàn thành, nếu không mỗi máy lệch giờ một kiểu
    update.done_at = patch.done ? new Date().toISOString() : null;
  }

  // Tiền của buổi. Gửi amount rỗng/null nghĩa là "lấy giá mặc định của học
  // viên", KHÔNG phải "xóa tiền": người đóng dấu thường bỏ trống ô này, và
  // bỏ trống phải ra con số chứ không ra số 0.
  const chotTien = patch.done === true || patch.amount !== undefined;
  if (chotTien) {
    let tien = null;
    if (patch.amount !== undefined && patch.amount !== null && String(patch.amount).trim() !== '') {
      const n = Number(patch.amount);
      if (!Number.isFinite(n) || n < 0) throw { statusCode: 400, message: 'Số tiền không hợp lệ' };
      tien = Math.round(n);
    } else {
      const { data: nguoi } = await supabase
        .from('booking_registrants')
        .select('price_per_session')
        .eq('id', update.registrant_id || row.registrant_id)
        .maybeSingle();
      const mac = nguoi?.price_per_session;
      tien = mac === null || mac === undefined ? null : Math.round(Number(mac));
    }
    update.amount = tien;
  }
  // Mở lại một buổi đã chốt thì GIỮ số tiền: đóng dấu nhầm rồi đóng lại là
  // chuyện thường, bắt gõ lại tiền mỗi lần chỉ tổ gõ sai. Tổng chỉ cộng buổi
  // đang có done_at nên số tiền nằm im ở đó không ảnh hưởng sổ sách.

  if (patch.session_count !== undefined) {
    const n = Number(patch.session_count);
    if (!Number.isInteger(n) || n < 1 || n > 200) {
      throw { statusCode: 400, message: 'Số buổi phải từ 1 đến 200' };
    }
    update.session_count = n;
  }

  if (patch.registrant_id !== undefined) {
    if (registrantId && !manager) {
      throw { statusCode: 403, message: 'Chỉ trung tâm đổi được học viên của buổi' };
    }
    const { data: person, error: pErr } = await supabase
      .from('booking_registrants')
      .select('id')
      .eq('id', patch.registrant_id)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!person) throw { statusCode: 404, message: 'Không tìm thấy học viên này' };
    update.registrant_id = patch.registrant_id;
  }

  if (patch.color !== undefined) {
    if (!canColor && !manager) {
      throw { statusCode: 403, message: 'Chỉ quản trị viên đổi được màu' };
    }
    const next = patch.color === null || patch.color === '' ? null : String(patch.color);
    if (next !== null && !PALETTE.includes(next) && next !== DEFAULT_COLOR) {
      throw { statusCode: 400, message: `Màu không hợp lệ: ${next}` };
    }
    update.color = next;
  }

  if (Object.keys(update).length === 1) {
    throw { statusCode: 400, message: 'Không có gì để sửa' };
  }

  // Đổi giờ / ngày / người đều có thể đẩy buổi này chồng lên buổi khác của
  // chính người đó, nên kiểm lại bằng giá trị SAU khi đổi
  if (update.session_date || update.start_time || update.registrant_id) {
    await assertNoSelfOverlap(
      row.board_id,
      update.registrant_id || row.registrant_id,
      update.session_date || row.session_date,
      update.start_time || row.start_time,
      update.end_time || row.end_time,
      requestId
    );
  }

  const { error: upErr } = await supabase
    .from('booking_requests')
    .update(update)
    .eq('id', requestId);
  if (upErr) {
    // uniq_booking_request_open: người đó đã có buổi đúng ngày giờ này rồi
    if (upErr.code === '23505') {
      throw { statusCode: 409, message: 'Học viên này đã có buổi ở đúng khung giờ đó' };
    }
    throw upErr;
  }

  // Ghi đúng phần đã đổi, kèm giá trị cũ — xem lại mới biết ai đổi giờ từ đâu sang đâu
  const changes = {};
  if (update.session_date) changes.ngay = { tu: row.session_date, thanh: update.session_date };
  if (update.start_time) {
    changes.gio = {
      tu: `${String(row.start_time).slice(0, 5)}–${String(row.end_time).slice(0, 5)}`,
      thanh: `${update.start_time.slice(0, 5)}–${update.end_time.slice(0, 5)}`,
    };
  }
  if (update.note !== undefined) changes.ghi_chu = { thanh: update.note };
  if (update.registrant_id) changes.hoc_vien = { tu: row.registrant_id, thanh: update.registrant_id };
  if (update.color !== undefined) changes.mau = { thanh: update.color };
  if (update.is_marked !== undefined) changes.danh_dau = { thanh: update.is_marked ? 'có' : 'bỏ' };
  if (update.is_bold !== undefined) changes.to_dam = { thanh: update.is_bold ? 'có' : 'bỏ' };
  if (update.done_at !== undefined) {
    changes.hoan_thanh = { thanh: update.done_at ? 'đã đóng dấu' : 'mở lại' };
  }
  if (update.amount !== undefined) changes.so_tien = { thanh: update.amount };

  logActivity({
    boardId: row.board_id,
    actor: registrantId ? await actorFromRegistrant(registrantId) : { userId: actorUserId, name: actorName },
    action: 'request.update',
    targetId: requestId,
    detail: changes,
  });
  notifyBoard(row.board_id, 'request.update');
  return { id: requestId };
};

/** Đổi màu cố định của một học viên. Chỉ admin (chặn ở route). */
const setRegistrantColor = async (registrantId, color) => {
  const next = color === null || color === undefined || color === '' ? null : String(color);
  if (next !== null && !PALETTE.includes(next) && next !== DEFAULT_COLOR) {
    throw { statusCode: 400, message: `Màu không hợp lệ: ${next}` };
  }
  const { data, error } = await supabase
    .from('booking_registrants')
    .update({ color: next })
    .eq('id', registrantId)
    .select('id, full_name, color')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw { statusCode: 404, message: 'Không tìm thấy học viên này' };

  // Màu thuộc về người, không thuộc bảng nào — báo cho mọi bảng người đó có buổi
  const { data: boards } = await supabase
    .from('booking_requests')
    .select('board_id')
    .eq('registrant_id', registrantId);
  for (const b of new Set((boards || []).map((x) => x.board_id))) {
    notifyBoard(b, 'registrant.color');
  }
  return data;
};

/**
 * Admin gỡ một buổi đã đăng ký khỏi lưới.
 *
 * Chuyển status sang 'cancelled' chứ KHÔNG xóa hàng: cần biết giờ nào từng có
 * người muốn học để nhìn lại nhu cầu, xóa trắng là mất luôn dữ liệu đó. Chỉ số
 * trạng thái chặn cũng dựa vào đây để người ta đăng ký lại được giờ đã hủy.
 */
const adminCancelRequest = async (requestId) => {
  const { data: row, error } = await supabase
    .from('booking_requests')
    .select('id, board_id, status')
    .eq('id', requestId)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw { statusCode: 404, message: 'Không tìm thấy buổi đăng ký này' };
  if (row.status === 'cancelled') return { id: requestId };

  const { error: upErr } = await supabase
    .from('booking_requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', requestId);
  if (upErr) throw upErr;
  notifyBoard(row.board_id, 'request.cancel');
  return { id: requestId };
};

/**
 * Danh sách học viên CỦA BẢNG NÀY cho người quản lý chọn trong bảng công cụ.
 *
 * Chỉ những ai đã đăng ký hoặc giữ chỗ trên chính bảng này, không phải toàn bộ
 * người dùng hệ thống: đây là phiên đăng nhập bằng số điện thoại, lộ ít chừng nào
 * hay chừng ấy.
 */
const listBoardStudents = async (slug, registrantId) => {
  if (!(await isManagerSession(registrantId))) {
    throw { statusCode: 403, message: 'Bạn không có quyền xem danh sách học viên' };
  }
  const board = await fetchBoardBySlug(slug);

  const [{ data: reqs, error: rErr }, { data: slotRows, error: sErr }] = await Promise.all([
    supabase.from('booking_requests').select('registrant_id').eq('board_id', board.id),
    supabase.from('booking_slots').select('id').eq('board_id', board.id),
  ]);
  if (rErr) throw rErr;
  if (sErr) throw sErr;

  const ids = new Set((reqs || []).map((r) => r.registrant_id));
  const slotIds = (slotRows || []).map((s) => s.id);
  if (slotIds.length > 0) {
    const { data: entries, error: eErr } = await supabase
      .from('booking_entries')
      .select('registrant_id')
      .in('slot_id', slotIds);
    if (eErr) throw eErr;
    for (const e of entries || []) ids.add(e.registrant_id);
  }
  if (ids.size === 0) return [];

  const { data: people, error } = await supabase
    .from('booking_registrants')
    .select('id, full_name, phone, color, price_per_session, is_manager')
    .in('id', [...ids])
    .order('full_name', { ascending: true });
  if (error) throw error;

  // Cộng tiền ngay trong một lượt đọc: hộp quản lý học viên luôn hiện kèm
  // "đã học mấy buổi, thu bao nhiêu", tách ra thành API riêng thì mở hộp phải
  // chờ hai vòng mạng mà chẳng bao giờ dùng riêng từng cái.
  //
  // Chỉ buổi CÓ done_at mới vào tổng. Buổi chưa đóng dấu là chưa dạy xong,
  // cộng vào thì con số lúc nào cũng cao hơn tiền thật thu được.
  const { data: money, error: mErr } = await supabase
    .from('booking_requests')
    .select('registrant_id, amount, done_at')
    .eq('board_id', board.id)
    .in('status', ['pending', 'approved']);
  if (mErr) throw mErr;

  const thongKe = new Map();
  for (const r of money || []) {
    if (!thongKe.has(r.registrant_id)) {
      thongKe.set(r.registrant_id, { sessions: 0, done: 0, total: 0 });
    }
    const t = thongKe.get(r.registrant_id);
    t.sessions += 1;
    if (r.done_at) {
      t.done += 1;
      t.total += Number(r.amount || 0);
    }
  }

  return (people || []).map((p) => {
    const t = thongKe.get(p.id) || { sessions: 0, done: 0, total: 0 };
    return {
      ...p,
      price_per_session:
        p.price_per_session === null || p.price_per_session === undefined
          ? null
          : Number(p.price_per_session),
      is_manager: Boolean(p.is_manager),
      session_total: t.sessions,
      done_total: t.done,
      amount_total: t.total,
    };
  });
};

/** Giá mặc định một buổi của một học viên. Chỉ người quản lý đặt được. */
const managerSetRegistrantPrice = async (targetId, price, registrantId) => {
  if (!(await isManagerSession(registrantId))) {
    throw { statusCode: 403, message: 'Bạn không có quyền đặt học phí' };
  }
  let next = null;
  if (price !== null && price !== undefined && String(price).trim() !== '') {
    const n = Number(price);
    if (!Number.isFinite(n) || n < 0) throw { statusCode: 400, message: 'Học phí không hợp lệ' };
    next = Math.round(n);
  }

  const { data, error } = await supabase
    .from('booking_registrants')
    .update({ price_per_session: next })
    .eq('id', targetId)
    .select('id, full_name, price_per_session')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw { statusCode: 404, message: 'Không tìm thấy học viên này' };

  // Đổi giá KHÔNG sửa lại tiền các buổi đã chốt — xem lý do ở migration 054
  const { data: boards } = await supabase
    .from('booking_requests')
    .select('board_id')
    .eq('registrant_id', targetId);
  for (const b of new Set((boards || []).map((x) => x.board_id))) {
    logActivity({
      boardId: b,
      actor: await actorFromRegistrant(registrantId),
      action: 'registrant.price',
      targetId,
      detail: { hoc_vien: data.full_name, hoc_phi: { thanh: next } },
    });
    notifyBoard(b, 'registrant.price');
  }
  return { ...data, price_per_session: next };
};

/** Người quản lý đổi màu cố định của một học viên. */
const managerSetRegistrantColor = async (targetId, color, registrantId) => {
  if (!(await isManagerSession(registrantId))) {
    throw { statusCode: 403, message: 'Bạn không có quyền đổi màu' };
  }
  return setRegistrantColor(targetId, color);
};

/**
 * Nhật ký của một bảng. Chỉ người quản lý (047) hoặc tài khoản nội bộ đọc được:
 * nó chứa tên của mọi học viên.
 */
const listActivity = async (boardId, { limit = 60 } = {}) => {
  const { data, error } = await supabase
    .from('booking_activity_log')
    .select('id, action, actor_name, detail, target_id, created_at')
    .eq('board_id', boardId)
    .order('created_at', { ascending: false })
    .limit(Math.min(200, Number(limit) || 60));
  if (error) throw error;
  return data || [];
};

const listActivityBySlug = async (slug, registrantId, query = {}) => {
  if (!(await isManagerSession(registrantId))) {
    throw { statusCode: 403, message: 'Bạn không có quyền xem nhật ký' };
  }
  const board = await fetchBoardBySlug(slug);
  return listActivity(board.id, query);
};

// ------------------------------------------------------------- chat

// Supabase .in() với mảng rỗng trả về lỗi cú pháp chứ không trả 0 dòng, nên
// luồng chưa có tin nào phải lọc bằng một id không bao giờ tồn tại
const NO_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Luồng chat. Học viên chỉ đọc luồng của chính mình; người quản lý đọc luồng
 * của bất kỳ ai trên bảng (truyền registrant_id) — kiểm cờ ở đây, không tin client.
 */
const listMessages = async (slug, registrantId, targetId = null) => {
  const board = await fetchBoardBySlug(slug);
  const manager = await isManagerSession(registrantId);
  const thread = targetId && manager ? targetId : registrantId;

  const { data, error } = await supabase
    .from('booking_messages')
    .select('id, sender, body, created_at, read_at, reply_to, image_url, deleted_at')
    .eq('board_id', board.id)
    .eq('registrant_id', thread)
    .order('created_at', { ascending: true })
    .limit(300);
  if (error) throw error;

  const rows = data || [];
  const byId = new Map(rows.map((m) => [m.id, m]));

  // Cảm xúc của cả luồng lấy một lần rồi gom, không hỏi từng tin
  const { data: reactions, error: rErr } = await supabase
    .from('booking_message_reactions')
    .select('message_id, registrant_id, emoji')
    .in('message_id', rows.length ? rows.map((m) => m.id) : [NO_ID]);
  if (rErr) throw rErr;

  const ids = rows.length ? rows.map((m) => m.id) : [NO_ID];

  // Bình chọn của luồng: hai lượt đọc cho cả luồng chứ không phải mỗi tin một lượt
  const [{ data: polls, error: pErr }, { data: votes, error: vErr }] = await Promise.all([
    supabase
      .from('booking_message_polls')
      .select('message_id, question, options, multi, closed_at')
      .in('message_id', ids),
    supabase.from('booking_poll_votes').select('message_id, registrant_id, option_id').in('message_id', ids),
  ]);
  if (pErr) throw pErr;
  if (vErr) throw vErr;

  // Tên của mọi người có mặt trong cảm xúc / phiếu bầu, tra một lần.
  // Luồng chat chỉ có hai phía (học viên đó và trung tâm) nên hiện tên ở đây
  // không lộ ai ra ngoài phạm vi người xem vốn đã thấy.
  const nguoiIds = new Set([
    ...(reactions || []).map((r) => r.registrant_id),
    ...(votes || []).map((v) => v.registrant_id),
  ]);
  const tenCua = new Map();
  if (nguoiIds.size > 0) {
    const { data: people } = await supabase
      .from('booking_registrants')
      .select('id, full_name, is_manager')
      .in('id', [...nguoiIds]);
    for (const n of people || []) {
      tenCua.set(n.id, n.is_manager ? 'Trung tâm' : n.full_name || 'Học viên');
    }
  }

  const byMessage = new Map();
  for (const r of reactions || []) {
    if (!byMessage.has(r.message_id)) byMessage.set(r.message_id, new Map());
    const perEmoji = byMessage.get(r.message_id);
    if (!perEmoji.has(r.emoji)) {
      perEmoji.set(r.emoji, { emoji: r.emoji, count: 0, mine: false, names: [] });
    }
    const entry = perEmoji.get(r.emoji);
    entry.count += 1;
    entry.names.push(r.registrant_id === registrantId ? 'Bạn' : tenCua.get(r.registrant_id) || 'Ai đó');
    if (r.registrant_id === registrantId) entry.mine = true;
  }

  // Gộp phiếu theo tin rồi theo phương án; giữ cả tên để hiện "ai chọn gì"
  const pollOf = new Map();
  for (const poll of polls || []) {
    const perOption = new Map(
      (poll.options || []).map((o) => [o.id, { id: o.id, text: o.text, count: 0, mine: false, names: [] }])
    );
    pollOf.set(poll.message_id, {
      question: poll.question,
      multi: Boolean(poll.multi),
      closed_at: poll.closed_at || null,
      options: perOption,
      voters: new Set(),
    });
  }
  for (const v of votes || []) {
    const poll = pollOf.get(v.message_id);
    if (!poll) continue;
    poll.voters.add(v.registrant_id);
    const opt = poll.options.get(v.option_id);
    if (!opt) continue; // phương án đã bị gỡ khỏi câu hỏi
    opt.count += 1;
    opt.mine = opt.mine || v.registrant_id === registrantId;
    opt.names.push(v.registrant_id === registrantId ? 'Bạn' : tenCua.get(v.registrant_id) || 'Ai đó');
  }

  // Mở luồng ra là coi như đã đọc phần của phía bên kia
  const mine = manager && targetId ? 'student' : 'center';
  await supabase
    .from('booking_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('board_id', board.id)
    .eq('registrant_id', thread)
    .eq('sender', mine)
    .is('read_at', null);

  const messages = rows.map((m) => {
    const quoted = m.reply_to ? byId.get(m.reply_to) : null;
    const poll = pollOf.get(m.id);
    return {
      ...m,
      reactions: [...(byMessage.get(m.id)?.values() || [])],
      poll: poll
        ? {
            question: poll.question,
            multi: poll.multi,
            closed_at: poll.closed_at,
            options: [...poll.options.values()],
            voter_count: poll.voters.size,
          }
        : null,
      // Trích dẫn kèm luôn trong tin, khỏi phải tra ngược ở client
      reply: quoted
        ? {
            id: quoted.id,
            sender: quoted.sender,
            body: quoted.deleted_at
              ? 'Tin nhắn đã được thu hồi'
              : quoted.body
                ? quoted.body.slice(0, 160)
                : '[Hình ảnh]',
          }
        : m.reply_to
          ? { id: m.reply_to, sender: null, body: null } // tin gốc đã bị xóa
          : null,
    };
  });

  return { thread_id: thread, messages };
};

/**
 * Thả hoặc bỏ một cảm xúc. Thả lại đúng emoji đó là bỏ — không có nút xóa riêng.
 */
const toggleReaction = async (messageId, emoji, registrantId) => {
  const icon = String(emoji || '').trim();
  if (!icon || icon.length > 8) throw { statusCode: 400, message: 'Cảm xúc không hợp lệ' };

  const { data: msg, error } = await supabase
    .from('booking_messages')
    .select('id, board_id, registrant_id')
    .eq('id', messageId)
    .maybeSingle();
  if (error) throw error;
  if (!msg) throw { statusCode: 404, message: 'Không tìm thấy tin nhắn' };

  // Chỉ người trong luồng đó, hoặc người quản lý, mới thả được
  const manager = await isManagerSession(registrantId);
  if (!manager && msg.registrant_id !== registrantId) {
    throw { statusCode: 403, message: 'Bạn không xem được tin nhắn này' };
  }

  const { data: existing, error: exErr } = await supabase
    .from('booking_message_reactions')
    .select('message_id')
    .eq('message_id', messageId)
    .eq('registrant_id', registrantId)
    .eq('emoji', icon)
    .maybeSingle();
  if (exErr) throw exErr;

  if (existing) {
    const { error: delErr } = await supabase
      .from('booking_message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('registrant_id', registrantId)
      .eq('emoji', icon);
    if (delErr) throw delErr;
  } else {
    const { error: insErr } = await supabase
      .from('booking_message_reactions')
      .insert({ message_id: messageId, registrant_id: registrantId, emoji: icon });
    if (insErr) throw insErr;
  }

  // Hai phía đang mở hộp chat phải thấy ngay, y như tin nhắn mới
  const payload = { board_id: msg.board_id, thread_id: msg.registrant_id, reaction: true };
  emitNotification('booking:message', payload, `booking_thread:${msg.registrant_id}`);
  emitNotification('booking:message', payload, `booking_manager:${msg.board_id}`);

  return { message_id: messageId, emoji: icon, added: !existing };
};

const BOOKING_CHAT_BUCKET = () => process.env.BOOKING_CHAT_BUCKET || 'booking-chat';

/**
 * Đẩy một tấm ảnh lên kho rồi trả link công khai.
 *
 * Tên file gắn id ngẫu nhiên: hai người gửi cùng một tấm "IMG_1234.jpg" thì
 * không đè nhau, và không ai đoán được đường dẫn ảnh của người khác.
 */
const uploadChatImage = async (file, registrantId) => {
  const okTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  if (!okTypes.includes(file.mimetype)) {
    throw { statusCode: 400, message: 'Chỉ nhận ảnh PNG, JPG, WEBP hoặc GIF' };
  }
  if (file.size > 5 * 1024 * 1024) {
    throw { statusCode: 400, message: 'Ảnh tối đa 5MB' };
  }

  const safe = String(file.originalname || 'anh').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const path = `${registrantId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe}`;

  const { error } = await supabase.storage
    .from(BOOKING_CHAT_BUCKET())
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from(BOOKING_CHAT_BUCKET()).getPublicUrl(path);
  return { url: data.publicUrl, path };
};

const sendMessage = async (slug, registrantId, { body, registrant_id: targetId, reply_to: replyTo } = {}, file = null) => {
  const text = String(body || '').trim();
  // Tin chỉ có ảnh là chuyện thường, nên chỉ chặn khi KHÔNG có gì cả
  if (!text && !file) throw { statusCode: 400, message: 'Chưa nhập nội dung' };
  if (text.length > 2000) throw { statusCode: 400, message: 'Tin nhắn tối đa 2000 ký tự' };

  const board = await fetchBoardBySlug(slug);
  const manager = await isManagerSession(registrantId);
  // Quản lý nhắn cho một học viên cụ thể thì tin đó là của TRUNG TÂM
  const thread = targetId && manager ? targetId : registrantId;
  const sender = manager && targetId && targetId !== registrantId ? 'center' : manager ? 'center' : 'student';

  const image = file ? await uploadChatImage(file, registrantId) : null;

  const { data, error } = await supabase
    .from('booking_messages')
    .insert({
      board_id: board.id,
      registrant_id: thread,
      sender,
      body: text || null,
      reply_to: replyTo || null,
      image_url: image?.url || null,
      image_path: image?.path || null,
    })
    .select('id, sender, body, created_at, reply_to, image_url')
    .single();
  if (error) throw error;

  logActivity({
    boardId: board.id,
    actor: await actorFromRegistrant(registrantId),
    action: 'message.send',
    targetId: data.id,
    detail: { ben: sender === 'center' ? 'trung tâm' : 'học viên', co_anh: Boolean(image) },
  });

  // Đẩy ngay cho hai phía đang mở hộp chat: phòng của chính luồng đó, và phòng
  // quản lý của bảng (để danh sách luồng + chấm đỏ nhảy số mà không phải chờ hỏi lại)
  emitNotification('booking:message', { board_id: board.id, thread_id: thread, message: data }, `booking_thread:${thread}`);
  emitNotification('booking:message', { board_id: board.id, thread_id: thread, message: data }, `booking_manager:${board.id}`);

  return data;
};

/**
 * Tạo một bình chọn trong luồng chat.
 *
 * Bình chọn đi kèm MỘT tin nhắn thật: nó nằm đúng chỗ trong mạch hội thoại,
 * thừa quyền xem của luồng, và báo động cho phía kia bằng chính đường tin
 * nhắn đang có — không phải dựng thêm kênh thông báo riêng.
 */
const createPoll = async (slug, registrantId, { question, options, multi, target_id: targetId } = {}) => {
  const board = await fetchBoardBySlug(slug);
  const manager = await isManagerSession(registrantId);
  const thread = targetId && manager ? targetId : registrantId;

  const hoi = String(question || '').trim();
  if (hoi.length < 1 || hoi.length > 300) {
    throw { statusCode: 400, message: 'Câu hỏi phải từ 1 đến 300 ký tự' };
  }

  // Bỏ phương án trống và phương án trùng chữ — người gõ nhanh hay để lọt một
  // ô rỗng, mà bình chọn hai phương án giống hệt nhau thì đếm xong không dùng được
  const daCo = new Set();
  const ds = [];
  for (const raw of Array.isArray(options) ? options : []) {
    const text = String(raw || '').trim().slice(0, 120);
    if (!text || daCo.has(text.toLowerCase())) continue;
    daCo.add(text.toLowerCase());
    ds.push({ id: `o${ds.length + 1}`, text });
  }
  if (ds.length < 2) throw { statusCode: 400, message: 'Cần ít nhất 2 phương án khác nhau' };
  if (ds.length > 10) throw { statusCode: 400, message: 'Tối đa 10 phương án' };

  const sender = manager ? 'center' : 'student';
  const { data: msg, error } = await supabase
    .from('booking_messages')
    .insert({ board_id: board.id, registrant_id: thread, sender, body: `[Bình chọn] ${hoi}` })
    .select('id, sender, body, created_at, reply_to, image_url')
    .single();
  if (error) throw error;

  const { error: pErr } = await supabase
    .from('booking_message_polls')
    .insert({ message_id: msg.id, question: hoi, options: ds, multi: Boolean(multi) });
  if (pErr) {
    // Tin đã chèn mà bình chọn hỏng thì phải dọn, không để lại một tin "[Bình
    // chọn] ..." rỗng không bấm được gì
    await supabase.from('booking_messages').delete().eq('id', msg.id);
    throw pErr;
  }

  logActivity({
    boardId: board.id,
    actor: await actorFromRegistrant(registrantId),
    action: 'poll.create',
    targetId: msg.id,
    detail: { cau_hoi: hoi, so_phuong_an: ds.length },
  });

  const payload = { board_id: board.id, thread_id: thread, message: msg };
  emitNotification('booking:message', payload, `booking_thread:${thread}`);
  emitNotification('booking:message', payload, `booking_manager:${board.id}`);
  return { message_id: msg.id, question: hoi, options: ds };
};

/** Bỏ phiếu / đổi ý. Bấm lại đúng phương án đang chọn là rút phiếu. */
const votePoll = async (messageId, optionId, registrantId) => {
  const { data: poll, error } = await supabase
    .from('booking_message_polls')
    .select('message_id, options, multi, closed_at, message:booking_messages!booking_message_polls_message_id_fkey(board_id, registrant_id)')
    .eq('message_id', messageId)
    .maybeSingle();
  if (error) throw error;
  if (!poll) throw { statusCode: 404, message: 'Không tìm thấy bình chọn này' };
  if (poll.closed_at) throw { statusCode: 409, message: 'Bình chọn đã khóa' };

  const manager = await isManagerSession(registrantId);
  if (!manager && poll.message?.registrant_id !== registrantId) {
    throw { statusCode: 403, message: 'Bạn không xem được bình chọn này' };
  }
  if (!(poll.options || []).some((o) => o.id === optionId)) {
    throw { statusCode: 400, message: 'Phương án không hợp lệ' };
  }

  const { data: dangCo } = await supabase
    .from('booking_poll_votes')
    .select('option_id')
    .eq('message_id', messageId)
    .eq('registrant_id', registrantId);
  const chon = new Set((dangCo || []).map((v) => v.option_id));

  if (chon.has(optionId)) {
    await supabase
      .from('booking_poll_votes')
      .delete()
      .eq('message_id', messageId)
      .eq('registrant_id', registrantId)
      .eq('option_id', optionId);
  } else {
    // Bình chọn một lựa chọn: phiếu mới thay phiếu cũ, không cộng thêm
    if (!poll.multi && chon.size > 0) {
      await supabase
        .from('booking_poll_votes')
        .delete()
        .eq('message_id', messageId)
        .eq('registrant_id', registrantId);
    }
    const { error: insErr } = await supabase
      .from('booking_poll_votes')
      .insert({ message_id: messageId, registrant_id: registrantId, option_id: optionId });
    if (insErr && insErr.code !== '23505') throw insErr;
  }

  const boardId = poll.message?.board_id;
  const thread = poll.message?.registrant_id;
  const payload = { board_id: boardId, thread_id: thread, poll: true };
  emitNotification('booking:message', payload, `booking_thread:${thread}`);
  if (boardId) emitNotification('booking:message', payload, `booking_manager:${boardId}`);
  return { message_id: messageId, option_id: optionId, added: !chon.has(optionId) };
};

/** Khóa bình chọn. Chỉ trung tâm khóa được — khóa là chốt kết quả. */
const closePoll = async (messageId, registrantId) => {
  if (!(await isManagerSession(registrantId))) {
    throw { statusCode: 403, message: 'Chỉ trung tâm khóa được bình chọn' };
  }
  const { data, error } = await supabase
    .from('booking_message_polls')
    .update({ closed_at: new Date().toISOString() })
    .eq('message_id', messageId)
    .is('closed_at', null)
    .select('message_id, message:booking_messages!booking_message_polls_message_id_fkey(board_id, registrant_id)')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw { statusCode: 404, message: 'Bình chọn không tồn tại hoặc đã khóa' };

  const payload = { board_id: data.message?.board_id, thread_id: data.message?.registrant_id, poll: true };
  emitNotification('booking:message', payload, `booking_thread:${data.message?.registrant_id}`);
  if (data.message?.board_id) {
    emitNotification('booking:message', payload, `booking_manager:${data.message.board_id}`);
  }
  return { message_id: messageId };
};

/** Nút "Đồng bộ ngay": ghi lại Sheet không chờ hẹn giờ. Chỉ trung tâm bấm được. */
const syncSheetNow = async (slug, registrantId) => {
  if (!(await isManagerSession(registrantId))) {
    throw { statusCode: 403, message: 'Bạn không có quyền đồng bộ Sheet' };
  }
  const board = await fetchBoardBySlug(slug);
  return sheets.dongBoNgay(board.id);
};

/**
 * Thu hồi một tin nhắn.
 *
 * Xóa NỘI DUNG (chữ, ảnh, cả file trong kho) nhưng giữ lại dòng, đánh dấu
 * deleted_at — xem lý do ở migration 056.
 *
 * Ai thu hồi được: người gửi, và trung tâm. `sender` đã ghi phía nào gửi nên
 * không cần cột tác giả riêng. Người quản lý gỡ được tin của học viên vì
 * luồng nằm trên bảng của họ — ảnh bậy bạ thì phải có người gỡ xuống được.
 */
const deleteMessage = async (messageId, registrantId) => {
  const { data: msg, error } = await supabase
    .from('booking_messages')
    .select('id, board_id, registrant_id, sender, image_path, deleted_at')
    .eq('id', messageId)
    .maybeSingle();
  if (error) throw error;
  if (!msg) throw { statusCode: 404, message: 'Không tìm thấy tin nhắn này' };
  if (msg.deleted_at) throw { statusCode: 409, message: 'Tin này đã được thu hồi' };

  const manager = await isManagerSession(registrantId);
  const laNguoiGui = manager
    ? msg.sender === 'center'
    : msg.sender === 'student' && msg.registrant_id === registrantId;
  if (!laNguoiGui && !manager) {
    throw { statusCode: 403, message: 'Chỉ người gửi mới thu hồi được tin' };
  }

  // Gỡ file trước khi xóa đường dẫn, không thì mất dấu file nằm lại trong kho
  if (msg.image_path) {
    await supabase.storage.from(BOOKING_CHAT_BUCKET()).remove([msg.image_path]);
  }

  const { error: upErr } = await supabase
    .from('booking_messages')
    .update({ body: null, image_url: null, image_path: null, deleted_at: new Date().toISOString() })
    .eq('id', messageId);
  if (upErr) throw upErr;

  // Cảm xúc và bình chọn gắn vào tin đã thu hồi thì không còn nghĩa gì
  await supabase.from('booking_message_reactions').delete().eq('message_id', messageId);
  await supabase.from('booking_message_polls').delete().eq('message_id', messageId);

  logActivity({
    boardId: msg.board_id,
    actor: await actorFromRegistrant(registrantId),
    action: 'message.delete',
    targetId: messageId,
    detail: { ben: msg.sender === 'center' ? 'trung tâm' : 'học viên' },
  });

  const payload = { board_id: msg.board_id, thread_id: msg.registrant_id, deleted: true };
  emitNotification('booking:message', payload, `booking_thread:${msg.registrant_id}`);
  emitNotification('booking:message', payload, `booking_manager:${msg.board_id}`);
  return { message_id: messageId };
};

/**
 * Xóa bình chọn. Bình chọn LÀ một tin nhắn nên xóa luôn cả tin: để lại cái
 * vỏ "[Bình chọn] ..." không bấm được gì thì còn khó hiểu hơn là mất hẳn.
 * Phiếu bầu đi theo bằng ON DELETE CASCADE.
 *
 * Ai xóa được: người tạo, và trung tâm. `sender` chính là phía đã tạo —
 * 'center' là trung tâm, 'student' là chủ luồng — nên không cần cột tác giả
 * riêng để biết ai là người tạo.
 */
const deletePoll = async (messageId, registrantId) => {
  const { data: poll, error } = await supabase
    .from('booking_message_polls')
    .select('message_id, message:booking_messages!booking_message_polls_message_id_fkey(id, board_id, registrant_id, sender)')
    .eq('message_id', messageId)
    .maybeSingle();
  if (error) throw error;
  if (!poll?.message) throw { statusCode: 404, message: 'Không tìm thấy bình chọn này' };

  const msg = poll.message;
  const manager = await isManagerSession(registrantId);
  const laNguoiTao = manager ? msg.sender === 'center' : msg.sender === 'student' && msg.registrant_id === registrantId;
  if (!laNguoiTao && !manager) {
    throw { statusCode: 403, message: 'Chỉ người tạo mới xóa được bình chọn' };
  }

  const { error: delErr } = await supabase.from('booking_messages').delete().eq('id', messageId);
  if (delErr) throw delErr;

  logActivity({
    boardId: msg.board_id,
    actor: await actorFromRegistrant(registrantId),
    action: 'poll.delete',
    targetId: messageId,
    detail: { nguoi_tao: msg.sender === 'center' ? 'trung tâm' : 'học viên' },
  });

  const payload = { board_id: msg.board_id, thread_id: msg.registrant_id, poll: true };
  emitNotification('booking:message', payload, `booking_thread:${msg.registrant_id}`);
  emitNotification('booking:message', payload, `booking_manager:${msg.board_id}`);
  return { message_id: messageId };
};

/** Danh sách luồng cho người quản lý: ai nhắn gì gần nhất, còn mấy tin chưa đọc. */
const listThreads = async (slug, registrantId) => {
  if (!(await isManagerSession(registrantId))) {
    throw { statusCode: 403, message: 'Bạn không có quyền xem tin nhắn của người khác' };
  }
  const board = await fetchBoardBySlug(slug);

  const { data, error } = await supabase
    .from('booking_messages')
    .select('registrant_id, sender, body, created_at, read_at, deleted_at, registrant:booking_registrants!booking_messages_registrant_id_fkey(id, full_name, phone, color)')
    .eq('board_id', board.id)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;

  const byThread = new Map();
  for (const m of data || []) {
    if (!byThread.has(m.registrant_id)) {
      byThread.set(m.registrant_id, {
        registrant_id: m.registrant_id,
        full_name: m.registrant?.full_name || null,
        phone: m.registrant?.phone || null,
        color: m.registrant?.color || null,
        last_body: m.deleted_at ? 'Tin nhắn đã được thu hồi' : m.body || '[Hình ảnh]',
        last_at: m.created_at,
        unread: 0,
      });
    }
    if (m.sender === 'student' && !m.read_at) byThread.get(m.registrant_id).unread += 1;
  }
  return [...byThread.values()];
};

const getMyRegistrant = async (registrantId) => {
  const { data, error } = await supabase
    .from('booking_registrants')
    .select('id, phone, full_name, created_at')
    .eq('id', registrantId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw { statusCode: 404, message: 'Không tìm thấy thông tin đăng ký' };
  return data;
};

// ----------------------------------------------------- quản trị (admin/GV)

const listBoards = async (queryParams = {}) => {
  const { page, limit, offset } = parsePagination(queryParams);

  let countQuery = supabase.from('booking_boards').select('id', { count: 'exact', head: true });
  if (queryParams.search) countQuery = countQuery.ilike('title', `%${queryParams.search}%`);
  const { count: total, error: countError } = await countQuery;
  if (countError) throw countError;

  let dataQuery = supabase.from('booking_boards').select('*');
  if (queryParams.search) dataQuery = dataQuery.ilike('title', `%${queryParams.search}%`);
  const { data: boards, error } = await dataQuery
    .order('week_start', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;

  const ids = (boards || []).map((b) => b.id);
  const slotStats = new Map();
  const entryCount = new Map();

  if (ids.length) {
    const { data: slots, error: sErr } = await supabase
      .from('booking_slots')
      .select('id, board_id, capacity')
      .in('board_id', ids)
      .eq('is_active', true);
    if (sErr) throw sErr;
    for (const s of slots || []) {
      const cur = slotStats.get(s.board_id) || { slots: 0, capacity: 0 };
      slotStats.set(s.board_id, { slots: cur.slots + 1, capacity: cur.capacity + s.capacity });
    }

    const { data: entries, error: eErr } = await supabase
      .from('booking_entries')
      .select('id, board_id, status')
      .in('board_id', ids)
      .neq('status', 'cancelled');
    if (eErr) throw eErr;
    for (const e of entries || []) {
      entryCount.set(e.board_id, (entryCount.get(e.board_id) || 0) + 1);
    }
  }

  const rows = (boards || []).map((b) => {
    const weeks = weeksOf(b);
    const perWeekCapacity = slotStats.get(b.id)?.capacity || 0;
    return {
      ...b,
      week_end: weeks[weeks.length - 1].week_end,
      weeks: weeks.length,
      is_accepting: isAccepting(b),
      slot_count: slotStats.get(b.id)?.slots || 0,
      // Sĩ số của cả bảng = sĩ số một tuần nhân số tuần, vì mỗi tuần mở lại từ đầu
      total_capacity: perWeekCapacity * weeks.length,
      capacity_per_week: perWeekCapacity,
      registration_count: entryCount.get(b.id) || 0,
    };
  });

  return { data: rows, pagination: buildPaginationResponse(total || 0, page, limit) };
};

/** Chi tiết bảng cho màn quản trị: mọi ca kể cả ca đang tắt, kèm tên + SĐT đầy đủ. */
const getBoardDetail = async (id, requestedWeek = null) => {
  const { data: board, error } = await supabase
    .from('booking_boards')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!board) throw { statusCode: 404, message: 'Không tìm thấy bảng đăng ký' };

  const weeks = weeksOf(board);
  const selected = pickWeek(weeks, requestedWeek);

  const { data: slots, error: slotErr } = await supabase
    .from('booking_slots')
    .select('*')
    .eq('board_id', board.id)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })
    .order('order_index', { ascending: true });
  if (slotErr) throw slotErr;

  let entries = [];
  if (slots?.length) {
    const { data, error: eErr } = await supabase
      .from('booking_entries')
      .select(`id, slot_id, registrant_id, session_date, status, created_at, ${REGISTRANT_EMBED}`)
      .in('slot_id', slots.map((s) => s.id))
      .gte('session_date', selected.week_start)
      .lte('session_date', selected.week_end)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true });
    if (eErr) throw eErr;
    entries = data || [];
  }

  const byKey = groupEntriesBySlotDate(entries);
  const colorOf = assignColors((slots || []).map((x) => x.created_by));

  // Tên người tạo để dựng chú giải màu; chỉ nhánh quản trị mới thấy
  const creatorNames = new Map();
  const creatorIds = [...colorOf.keys()];
  if (creatorIds.length) {
    const { data: people, error: pErr } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('id', creatorIds);
    if (pErr) throw pErr;
    for (const person of people || []) creatorNames.set(person.id, person);
  }

  return {
    board: {
      ...board,
      week_end: weeks[weeks.length - 1].week_end,
      selected_week: selected.week_start,
      selected_week_end: selected.week_end,
      is_accepting: isAccepting(board),
    },
    weeks,
    creators: creatorIds.map((cid) => ({
      id: cid,
      name: creatorNames.get(cid)?.full_name || 'Không rõ',
      role: creatorNames.get(cid)?.role || null,
      color: colorOf.get(cid),
      slot_count: (slots || []).filter((x) => x.created_by === cid).length,
    })),
    slots: (slots || []).map((slot) => {
      const date = slotDate(selected.week_start, slot.day_of_week);
      const rows = byKey.get(`${slot.id}|${date}`) || [];
      const confirmed = rows.filter((r) => r.status === 'confirmed');
      const waitlist = rows.filter((r) => r.status === 'waitlist');
      return {
        ...slot,
        date,
        start_time: String(slot.start_time).slice(0, 5),
        end_time: String(slot.end_time).slice(0, 5),
        color: colorOf.get(slot.created_by) || DEFAULT_COLOR,
        creator_name: creatorNames.get(slot.created_by)?.full_name || null,
        confirmed_count: confirmed.length,
        waitlist_count: waitlist.length,
        seats_left: Math.max(0, slot.capacity - confirmed.length),
        entries: rows.map((r) => ({
          id: r.id,
          status: r.status,
          created_at: r.created_at,
          session_date: r.session_date,
          registrant_id: r.registrant_id,
          full_name: r.registrant?.full_name || null,
          phone: r.registrant?.phone || null,
          price_tier_id: r.price_tier_id,
          price_name: r.tier?.name || null,
          // Hiện số đã CHỐT lúc xếp, không phải số hiện tại của mức giá
          price_amount: r.price_amount,
        })),
      };
    }),
  };
};

const createBoard = async (data, currentUser) => {
  const title = String(data.title || '').trim();
  if (!title) throw { statusCode: 400, message: 'Tên bảng không được để trống' };

  const weekStart = toMonday(data.week_start || todayIso());
  const weekCount = data.week_count === undefined ? 1 : parseWeekCount(data.week_count);
  const slug = data.slug ? normalizeSlug(data.slug) : await makeUniqueSlug();

  if (data.slug && (await slugTaken(slug))) {
    throw { statusCode: 409, message: 'Mã link này đã được dùng, chọn mã khác' };
  }

  const { data: row, error } = await supabase
    .from('booking_boards')
    .insert({
      slug,
      title,
      description: data.description ? String(data.description).trim() : null,
      week_start: weekStart,
      week_count: weekCount,
      is_open: data.is_open === undefined ? true : Boolean(data.is_open),
      opens_at: data.opens_at || null,
      closes_at: data.closes_at || null,
      max_slots_per_person: Math.max(0, Number(data.max_slots_per_person) || 0),
      created_by: currentUser?.id || null,
    })
    .select()
    .single();
  if (error) throw error;
  return row;
};

const updateBoard = async (id, data) => {
  const patch = { updated_at: new Date().toISOString() };
  const has = (k) => Object.prototype.hasOwnProperty.call(data, k);

  if (has('title')) {
    const title = String(data.title || '').trim();
    if (!title) throw { statusCode: 400, message: 'Tên bảng không được để trống' };
    patch.title = title;
  }
  if (has('description')) patch.description = data.description ? String(data.description).trim() : null;
  if (has('week_start')) patch.week_start = toMonday(data.week_start);
  if (has('week_count')) patch.week_count = parseWeekCount(data.week_count);
  if (has('is_open')) patch.is_open = Boolean(data.is_open);
  if (has('opens_at')) patch.opens_at = data.opens_at || null;
  if (has('closes_at')) patch.closes_at = data.closes_at || null;
  if (has('max_slots_per_person')) patch.max_slots_per_person = Math.max(0, Number(data.max_slots_per_person) || 0);
  if (has('slug')) {
    const slug = normalizeSlug(data.slug);
    const { data: other, error } = await supabase
      .from('booking_boards')
      .select('id')
      .eq('slug', slug)
      .neq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (other) throw { statusCode: 409, message: 'Mã link này đã được dùng, chọn mã khác' };
    patch.slug = slug;
  }

  // Thu hẹp phạm vi tuần sẽ làm các lượt giữ chỗ ngoài phạm vi thành mồ côi:
  // không còn hiện trên bảng mà vẫn nằm trong CSDL và trong file CSV.
  if (patch.week_start !== undefined || patch.week_count !== undefined) {
    const { data: current, error: curErr } = await supabase
      .from('booking_boards')
      .select('week_start, week_count')
      .eq('id', id)
      .maybeSingle();
    if (curErr) throw curErr;
    if (!current) throw { statusCode: 404, message: 'Không tìm thấy bảng đăng ký' };

    const newStart = patch.week_start ?? current.week_start;
    const newCount = patch.week_count ?? current.week_count;
    const newEnd = addDays(newStart, newCount * 7 - 1);

    const { data: outside, error: outErr } = await supabase
      .from('booking_entries')
      .select('session_date')
      .eq('board_id', id)
      .neq('status', 'cancelled')
      .or(`session_date.lt.${newStart},session_date.gt.${newEnd}`);
    if (outErr) throw outErr;

    if (outside?.length) {
      const dates = [...new Set(outside.map((r) => r.session_date))].sort();
      throw {
        statusCode: 409,
        message: `Có ${outside.length} lượt giữ chỗ nằm ngoài phạm vi mới (${dates[0]}${dates.length > 1 ? ` … ${dates[dates.length - 1]}` : ''}). Hủy các lượt đó trước, hoặc giữ nguyên phạm vi tuần.`,
      };
    }
  }

  const { data: row, error } = await supabase
    .from('booking_boards')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  if (!row) throw { statusCode: 404, message: 'Không tìm thấy bảng đăng ký' };
  return row;
};

const deleteBoard = async (id) => {
  const { count, error: cErr } = await supabase
    .from('booking_entries')
    .select('id', { count: 'exact', head: true })
    .eq('board_id', id)
    .neq('status', 'cancelled');
  if (cErr) throw cErr;
  if (count > 0) {
    throw {
      statusCode: 409,
      message: `Bảng này đã có ${count} lượt đăng ký. Hãy đóng bảng thay vì xóa, hoặc xóa từng đăng ký trước.`,
    };
  }

  const { error } = await supabase.from('booking_boards').delete().eq('id', id);
  if (error) throw error;
  return { id };
};

/** Nhân bản bảng sang đợt kế tiếp — giữ nguyên bộ ca, bỏ đăng ký cũ. */
const cloneBoard = async (id, data, currentUser) => {
  const { data: source, error } = await supabase
    .from('booking_boards')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!source) throw { statusCode: 404, message: 'Không tìm thấy bảng nguồn' };

  const weekCount = data?.week_count === undefined ? source.week_count : parseWeekCount(data.week_count);
  // Nhảy qua trọn phạm vi bảng nguồn, không phải cứng 7 ngày: bảng 4 tuần thì
  // bản sao phải bắt đầu sau 4 tuần, nếu không hai bảng chồng ngày lên nhau.
  const weekStart = data?.week_start
    ? toMonday(data.week_start)
    : addDays(source.week_start, source.week_count * 7);

  const slug = data?.slug ? normalizeSlug(data.slug) : await makeUniqueSlug();
  if (data?.slug && (await slugTaken(slug))) {
    throw { statusCode: 409, message: 'Mã link này đã được dùng, chọn mã khác' };
  }

  const { data: board, error: insErr } = await supabase
    .from('booking_boards')
    .insert({
      slug,
      title: String(data?.title || `${source.title} (từ ${weekStart})`).trim(),
      description: source.description,
      week_start: weekStart,
      week_count: weekCount,
      is_open: data?.is_open === undefined ? true : Boolean(data.is_open),
      opens_at: null,
      closes_at: null,
      max_slots_per_person: source.max_slots_per_person,
      created_by: currentUser?.id || null,
    })
    .select()
    .single();
  if (insErr) throw insErr;

  const { data: slots, error: slotErr } = await supabase
    .from('booking_slots')
    .select('day_of_week, start_time, end_time, label, teacher_name, room_name, capacity, allow_waitlist, note, is_active, order_index, created_by, price_amount')
    .eq('board_id', source.id);
  if (slotErr) throw slotErr;

  if (slots?.length) {
    const { error: copyErr } = await supabase
      .from('booking_slots')
      .insert(slots.map((s) => ({ ...s, board_id: board.id })));
    if (copyErr) throw copyErr;
  }

  return { ...board, cloned_slots: slots?.length || 0 };
};

const assertBoardExists = async (boardId) => {
  const { data, error } = await supabase
    .from('booking_boards')
    .select('id')
    .eq('id', boardId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw { statusCode: 404, message: 'Không tìm thấy bảng đăng ký' };
};

const createSlot = async (boardId, data, currentUser = null) => {
  await assertBoardExists(boardId);
  const payload = parseSlotPayload(data);
  const { data: row, error } = await supabase
    .from('booking_slots')
    .insert({ ...payload, board_id: boardId, created_by: currentUser?.id || null })
    .select()
    .single();
  if (error) throw error;
  return row;
};

const MAX_BULK_SLOTS = 100;

/**
 * Tạo nhiều ca một lần. Nhận một trong hai dạng:
 *
 * - `days_of_week: [1,3,5]` + một khung giờ chung — cùng một ca lặp lại vài thứ.
 * - `slots: [{ day_of_week, start_time, end_time }, ...]` — các ô rời rạc người
 *   dùng quét trên lưới giờ, mỗi ô một thứ + giờ khác nhau. Các trường còn lại
 *   (tên ca, giáo viên, phòng, sĩ số) dùng chung cho cả lô.
 */
const createSlotsBulk = async (boardId, data, currentUser = null) => {
  await assertBoardExists(boardId);

  const cells = Array.isArray(data.slots) ? data.slots : [];
  const days = Array.isArray(data.days_of_week) ? data.days_of_week : [];

  if (!cells.length && !days.length) {
    throw { statusCode: 400, message: 'Chọn ít nhất một khung giờ' };
  }
  if (cells.length > MAX_BULK_SLOTS || days.length > MAX_BULK_SLOTS) {
    throw { statusCode: 400, message: `Mỗi lần chỉ tạo tối đa ${MAX_BULK_SLOTS} ca` };
  }

  const rows = cells.length
    ? cells.map((cell) => ({
        ...parseSlotPayload({ ...data, ...cell }),
        board_id: boardId,
        created_by: currentUser?.id || null,
      }))
    : days.map((dow) => ({
        ...parseSlotPayload({ ...data, day_of_week: dow }),
        board_id: boardId,
        created_by: currentUser?.id || null,
      }));

  const { data: created, error } = await supabase.from('booking_slots').insert(rows).select();
  if (error) throw error;
  notifyBoard(boardId, 'slot.create');
  return created;
};

const updateSlot = async (id, data) => {
  const payload = parseSlotPayload(data, { partial: true });
  if (!Object.keys(payload).length) throw { statusCode: 400, message: 'Không có gì để cập nhật' };

  // Hạ sĩ số xuống dưới số người đã giữ chỗ sẽ làm bảng hiển thị sai (âm chỗ trống).
  // Phải xét TỪNG NGÀY: tuần này 3 người, tuần sau 8 người thì chặn theo 8.
  if (payload.capacity !== undefined) {
    const { data: rows, error: cErr } = await supabase
      .from('booking_entries')
      .select('session_date')
      .eq('slot_id', id)
      .eq('status', 'confirmed');
    if (cErr) throw cErr;

    const perDate = new Map();
    for (const r of rows || []) perDate.set(r.session_date, (perDate.get(r.session_date) || 0) + 1);
    let worstDate = null;
    let worst = 0;
    for (const [date, n] of perDate) {
      if (n > worst) {
        worst = n;
        worstDate = date;
      }
    }
    if (worst > payload.capacity) {
      throw {
        statusCode: 409,
        message: `Ngày ${worstDate} đã có ${worst} người giữ chỗ, không thể hạ sĩ số xuống ${payload.capacity}`,
      };
    }
  }

  const { data: row, error } = await supabase
    .from('booking_slots')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  if (!row) throw { statusCode: 404, message: 'Không tìm thấy ca học' };
  notifyBoard(row.board_id, 'slot.update');
  return row;
};

const deleteSlot = async (id) => {
  const { data: slotRow } = await supabase
    .from('booking_slots')
    .select('board_id')
    .eq('id', id)
    .maybeSingle();

  const { count, error: cErr } = await supabase
    .from('booking_entries')
    .select('id', { count: 'exact', head: true })
    .eq('slot_id', id)
    .neq('status', 'cancelled');
  if (cErr) throw cErr;
  if (count > 0) {
    throw {
      statusCode: 409,
      message: `Ca này đã có ${count} người đăng ký (tính cả các tuần). Hãy tắt ca thay vì xóa.`,
    };
  }

  const { error } = await supabase.from('booking_slots').delete().eq('id', id);
  if (error) throw error;
  notifyBoard(slotRow?.board_id, 'slot.delete');
  return { id };
};

/** Danh sách đăng ký đầy đủ (có SĐT) để gọi điện chốt lớp — chỉ admin/GV. */
const listRegistrations = async (boardId, queryParams = {}) => {
  const { data: board, error: bErr } = await supabase
    .from('booking_boards')
    .select('id, title, week_start, week_count')
    .eq('id', boardId)
    .maybeSingle();
  if (bErr) throw bErr;
  if (!board) throw { statusCode: 404, message: 'Không tìm thấy bảng đăng ký' };

  let query = supabase
    .from('booking_entries')
    .select(`id, slot_id, session_date, status, created_at, cancelled_at, ${REGISTRANT_EMBED}, slot:booking_slots!booking_entries_slot_id_fkey(day_of_week, start_time, end_time, label, teacher_name, room_name, capacity)`)
    .eq('board_id', boardId);

  if (queryParams.status) query = query.eq('status', queryParams.status);
  else query = query.neq('status', 'cancelled');
  if (queryParams.slot_id) query = query.eq('slot_id', queryParams.slot_id);
  if (queryParams.week) {
    const weeks = weeksOf(board);
    const selected = pickWeek(weeks, queryParams.week);
    query = query.gte('session_date', selected.week_start).lte('session_date', selected.week_end);
  }

  const { data, error } = await query.order('session_date', { ascending: true });
  if (error) throw error;

  const rows = (data || []).map((r) => ({
    id: r.id,
    slot_id: r.slot_id,
    status: r.status,
    created_at: r.created_at,
    cancelled_at: r.cancelled_at,
    registrant_id: r.registrant?.id || null,
    full_name: r.registrant?.full_name || null,
    phone: r.registrant?.phone || null,
    day_of_week: r.slot?.day_of_week ?? null,
    day_label: r.slot ? DAY_LABELS[r.slot.day_of_week] : null,
    date: r.session_date,
    start_time: r.slot ? String(r.slot.start_time).slice(0, 5) : null,
    end_time: r.slot ? String(r.slot.end_time).slice(0, 5) : null,
    slot_label: r.slot?.label || null,
    teacher_name: r.slot?.teacher_name || null,
    room_name: r.slot?.room_name || null,
  }));

  rows.sort((a, b) => {
    const da = a.date || '';
    const db = b.date || '';
    if (da !== db) return da < db ? -1 : 1;
    if (a.start_time !== b.start_time) return (a.start_time || '') < (b.start_time || '') ? -1 : 1;
    return (a.created_at || '') < (b.created_at || '') ? -1 : 1;
  });

  return { board: { ...board, weeks: weeksOf(board) }, data: rows };
};

const csvCell = (value) => {
  const s = value === null || value === undefined ? '' : String(value);
  // Chặn công thức khi mở bằng Excel
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

const exportRegistrationsCsv = async (boardId, queryParams = {}) => {
  const { board, data } = await listRegistrations(boardId, queryParams);
  const header = ['Ngày', 'Thứ', 'Giờ', 'Ca', 'Giáo viên', 'Phòng', 'Họ tên', 'Số điện thoại', 'Trạng thái', 'Thời điểm đăng ký'];
  const lines = [header.map(csvCell).join(',')];

  const statusLabel = { confirmed: 'Đã giữ chỗ', waitlist: 'Hàng chờ', cancelled: 'Đã hủy' };

  for (const r of data) {
    lines.push([
      r.date,
      r.day_label,
      r.start_time && r.end_time ? `${r.start_time}-${r.end_time}` : '',
      r.slot_label,
      r.teacher_name,
      r.room_name,
      r.full_name,
      r.phone,
      statusLabel[r.status] || r.status,
      r.created_at,
    ].map(csvCell).join(','));
  }

  return {
    filename: `dang-ky-${board.week_start}.csv`,
    // BOM để Excel trên Windows đọc đúng tiếng Việt
    content: `﻿${lines.join('\r\n')}\r\n`,
  };
};

/**
 * Danh sách nguyện vọng cho admin, kèm bảng tổng hợp nhu cầu theo từng khung giờ.
 * Admin cần thấy ngay "T2 09:00 có 7 người muốn" để quyết mở ca nào trước.
 */
const listRequests = async (boardId, queryParams = {}) => {
  const { data: board, error: bErr } = await supabase
    .from('booking_boards')
    .select('id, title, week_start, week_count')
    .eq('id', boardId)
    .maybeSingle();
  if (bErr) throw bErr;
  if (!board) throw { statusCode: 404, message: 'Không tìm thấy bảng đăng ký' };

  let query = supabase
    .from('booking_requests')
    .select('id, session_date, start_time, end_time, status, note, session_count, color, is_marked, is_bold, done_at, created_at, review_note, created_slot_id, registrant:booking_registrants!booking_requests_registrant_id_fkey(id, full_name, phone, color)')
    .eq('board_id', boardId);

  if (queryParams.status) query = query.eq('status', queryParams.status);
  else query = query.in('status', ['pending', 'approved']);

  const { data, error } = await query
    .order('session_date', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) throw error;

  const rows = (data || []).map((r) => ({
    id: r.id,
    date: r.session_date,
    day_of_week: new Date(`${r.session_date}T00:00:00Z`).getUTCDay(),
    start_time: String(r.start_time).slice(0, 5),
    end_time: String(r.end_time).slice(0, 5),
    status: r.status,
    note: r.note,
    session_count: r.session_count,
    // Màu của học viên là màu hiển thị; color riêng của buổi chỉ còn là dự phòng
    color: r.registrant?.color || r.color || null,
    is_marked: Boolean(r.is_marked),
    is_bold: Boolean(r.is_bold),
    done_at: r.done_at || null,
    review_note: r.review_note,
    created_slot_id: r.created_slot_id,
    created_at: r.created_at,
    registrant_id: r.registrant?.id || null,
    full_name: r.registrant?.full_name || null,
    phone: r.registrant?.phone || null,
  }));

  // Gộp theo (ngày, giờ) để admin thấy giờ nào đông nhất
  const bucket = new Map();
  for (const r of rows) {
    if (r.status !== 'pending') continue;
    const key = `${r.date}|${r.start_time}`;
    if (!bucket.has(key)) {
      bucket.set(key, {
        key,
        date: r.date,
        day_of_week: r.day_of_week,
        day_label: DAY_LABELS[r.day_of_week],
        start_time: r.start_time,
        end_time: r.end_time,
        count: 0,
        total_sessions: 0,
        color: null,
        people: [],
        request_ids: [],
      });
    }
    const b = bucket.get(key);
    // Màu của cả khung giờ: lấy màu đầu tiên tìm thấy. Admin tô theo khung nên
    // cả nhóm vốn cùng màu; có lệch thì màu nào đặt trước thắng, không trộn.
    if (!b.color && r.color) b.color = r.color;
    b.count += 1;
    b.total_sessions += r.session_count || 1;
    b.people.push({ full_name: r.full_name, phone: r.phone, session_count: r.session_count || 1 });
    b.request_ids.push(r.id);
  }

  const demand = [...bucket.values()].sort(
    (a, b) => b.count - a.count || (a.date < b.date ? -1 : 1) || (a.start_time < b.start_time ? -1 : 1)
  );

  return { board: { ...board, weeks: weeksOf(board) }, data: rows, demand };
};

/** Duyệt hoặc từ chối một lô nguyện vọng. */
const reviewRequests = async (ids, status, currentUser, reviewNote = null) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw { statusCode: 400, message: 'Chưa chọn nguyện vọng nào' };
  }
  if (!['approved', 'rejected'].includes(status)) {
    throw { statusCode: 400, message: 'Trạng thái duyệt không hợp lệ' };
  }

  const { data, error } = await supabase
    .from('booking_requests')
    .update({
      status,
      reviewed_by: currentUser?.id || null,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote ? String(reviewNote).trim().slice(0, 500) : null,
      updated_at: new Date().toISOString(),
    })
    .in('id', ids)
    .eq('status', 'pending')
    .select('id');
  if (error) throw error;

  // Duyệt / từ chối đổi màu trạng thái trên lưới của mọi người đang mở
  const { data: one } = await supabase
    .from('booking_requests')
    .select('board_id')
    .eq('id', ids[0])
    .maybeSingle();
  notifyBoard(one?.board_id, 'request.review');

  return { updated: data?.length || 0, requested: ids.length };
};

/**
 * Tô màu cho một nhóm buổi đã đăng ký. Chỉ admin gọi được (xem booking.routes).
 *
 * Màu là quyết định xếp lớp của trung tâm nên không cho người đăng ký đổi: API
 * công khai không có đường nào ghi vào cột này, và route này nằm sau authorize('admin').
 * Truyền color = null để gỡ màu, buổi quay lại hổ phách "chưa xếp".
 */
const setRequestsColor = async (ids, color) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw { statusCode: 400, message: 'Chưa chọn buổi nào để tô màu' };
  }
  const next = color === null || color === undefined || color === '' ? null : String(color);
  if (next !== null && !PALETTE.includes(next) && next !== DEFAULT_COLOR) {
    throw { statusCode: 400, message: `Màu không hợp lệ: ${next}` };
  }

  const { data, error } = await supabase
    .from('booking_requests')
    .update({ color: next, updated_at: new Date().toISOString() })
    .in('id', ids)
    .select('id');
  if (error) throw error;

  return { updated: data?.length || 0, color: next };
};

/**
 * Mở ca thật từ một nhóm nguyện vọng cùng khung giờ, rồi đánh dấu đã duyệt.
 * Đây là thao tác chính của admin: thấy "T2 09:00 có 7 người muốn" -> mở ca luôn.
 */
const createSlotFromRequests = async (boardId, data, currentUser) => {
  await assertBoardExists(boardId);
  const date = assertSessionDate(data.session_date ?? data.date);
  // Giữ ĐÚNG khung giờ của nguyện vọng, kể cả giờ lẻ như 09:15–09:50
  const { start_time, end_time } = slotRange({
    start_time: data.start_time,
    end_time: data.end_time,
    duration: data.duration,
  });

  // 0=CN..6=T7, trùng đúng quy ước booking_slots.day_of_week
  const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();

  const slot = await createSlot(
    boardId,
    {
      day_of_week: dayOfWeek,
      start_time: start_time.slice(0, 5),
      end_time: end_time.slice(0, 5),
      capacity: data.capacity ?? 10,
      label: data.label ?? null,
      teacher_name: data.teacher_name ?? null,
      room_name: data.room_name ?? null,
      allow_waitlist: data.allow_waitlist ?? false,
      is_active: true,
    },
    currentUser
  );

  // Chỉ duyệt nguyện vọng ĐÚNG ngày + giờ đó; nguyện vọng cùng giờ nhưng tuần
  // khác vẫn để nguyên vì ca vừa mở áp dụng cho mọi tuần nhưng nhu cầu từng
  // tuần có thể khác nhau — để admin tự quyết.
  const { data: approved, error } = await supabase
    .from('booking_requests')
    .update({
      status: 'approved',
      reviewed_by: currentUser?.id || null,
      reviewed_at: new Date().toISOString(),
      created_slot_id: slot.id,
      updated_at: new Date().toISOString(),
    })
    .eq('board_id', boardId)
    .eq('session_date', date)
    .eq('start_time', start_time)
    .eq('status', 'pending')
    .select('id');
  if (error) throw error;

  return { slot, approved_requests: approved?.length || 0 };
};

/** Admin đăng ký hộ (người học gọi điện tới trung tâm). */
const adminAddEntry = async (slotId, data) => {
  const date = assertSessionDate(data.session_date);
  const normalized = normalizePhone(data.phone);
  if (!normalized || !isValidPhone(normalized)) {
    throw { statusCode: 400, message: 'Số điện thoại không hợp lệ. Ví dụ: 0912345678' };
  }
  const name = String(data.full_name || '').trim();

  let { data: registrant, error } = await supabase
    .from('booking_registrants')
    .select('id, phone, full_name')
    .eq('phone', normalized)
    .maybeSingle();
  if (error) throw error;

  if (!registrant) {
    if (!name) throw { statusCode: 400, message: 'Số này chưa có trong hệ thống, cần nhập họ tên' };
    const { data: created, error: insErr } = await supabase
      .from('booking_registrants')
      .insert({ phone: normalized, full_name: name })
      .select('id, phone, full_name')
      .single();
    if (insErr) throw insErr;
    registrant = created;
  }

  const result = await registerSlot(slotId, registrant.id, date);
  return { ...result, registrant };
};

/** Admin hủy chỗ của bất kỳ ai (truyền NULL cho p_registrant_id). */
const adminCancelEntry = async (entryId) => {
  const { data, error } = await supabase.rpc('cancel_booking_entry', {
    p_entry_id: entryId,
    p_registrant_id: null,
  });
  if (error) throw error;
  if (!data?.ok) {
    throw RPC_ERRORS[data?.code] || { statusCode: 400, message: 'Không hủy được, thử lại' };
  }
  const { data: entryRow } = await supabase
    .from('booking_entries')
    .select('slot:booking_slots!booking_entries_slot_id_fkey(board_id)')
    .eq('id', entryId)
    .maybeSingle();
  notifyBoard(entryRow?.slot?.board_id, 'entry.cancel');

  return { entry_id: entryId, promoted_entry_id: data.promoted_entry_id || null };
};

module.exports = {
  // công khai
  identify,
  getPublicBoard,
  registerSlot,
  cancelEntry,
  createRequests,
  cancelRequest,
  getMyRegistrant,
  // quản trị
  listBoards,
  getBoardDetail,
  createBoard,
  updateBoard,
  deleteBoard,
  cloneBoard,
  createSlot,
  createSlotsBulk,
  updateSlot,
  deleteSlot,
  listRegistrations,
  exportRegistrationsCsv,
  listRequests,
  reviewRequests,
  setRequestsColor,
  updateRequest,
  setRegistrantColor,
  logActivity,
  notifyBoard,
  assertNoSelfOverlap,
  actorFromRegistrant,
  isManagerSession,
  getRegistrantBrief,
  getBoardBySlugId: fetchBoardBySlug,
  listBoardStudents,
  listActivity,
  listActivityBySlug,
  listMessages,
  sendMessage,
  toggleReaction,
  createPoll,
  votePoll,
  closePoll,
  deletePoll,
  deleteMessage,
  syncSheetNow,
  sheetsConfigured: sheets.coCauHinh,
  listThreads,
  managerSetRegistrantColor,
  managerSetRegistrantPrice,
  adminCancelRequest,
  createSlotFromRequests,
  adminAddEntry,
  adminCancelEntry,
  // dùng lại ở nơi khác
  toMonday,
  slotDate,
  weeksOf,
  pickWeek,
};
