const jwt = require('jsonwebtoken');
const { supabase } = require('../config/database');
const jwtConfig = require('../config/jwt');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');
const { normalizePhone, isValidPhone, maskName } = require('../utils/phone');
const { assignColors, DEFAULT_COLOR, PALETTE, nextRegistrantColor } = require('../utils/bookingColors');

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
    .select('id, phone, full_name, created_at')
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
      .select('id, phone, full_name')
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
    .select('id, phone, full_name, color')
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

  // Nguyện vọng của chính mình trong bảng này, để lưới đánh dấu ô đã gửi
  const myRequests = [];
  if (registrantId) {
    // Màu khối buổi học = màu của chính học viên này (046), không phải màu
    // tô tay từng buổi nữa
    const { data: me } = await supabase
      .from('booking_registrants')
      .select('color')
      .eq('id', registrantId)
      .maybeSingle();
    const myColor = me?.color || null;
    const { data: reqs, error: reqErr } = await supabase
      .from('booking_requests')
      .select('id, session_date, start_time, end_time, status, session_count, color, note')
      .eq('board_id', board.id)
      .eq('registrant_id', registrantId)
      .in('status', ['pending', 'approved'])
      .order('session_date', { ascending: true });
    if (reqErr) throw reqErr;
    for (const r of reqs || []) {
      myRequests.push({
        id: r.id,
        date: r.session_date,
        start_time: String(r.start_time).slice(0, 5),
        end_time: String(r.end_time).slice(0, 5),
        status: r.status,
        session_count: r.session_count,
        color: myColor || r.color || null,
        note: r.note || null,
      });
    }
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
  return { entry_id: entryId, promoted_entry_id: data.promoted_entry_id || null };
};

/**
 * Gửi nguyện vọng giờ học cho các ô TRỐNG đã chọn.
 *
 * KHÔNG giữ chỗ, không đụng tới sĩ số. Chỉ là lời nhắn "em muốn học giờ này" để
 * trung tâm thấy giờ nào đông rồi mở ca thật.
 */
const createRequests = async (slug, registrantId, cells = []) => {
  const board = await fetchBoardBySlug(slug);
  if (!isAccepting(board)) {
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
    // Xin một giờ đã trôi qua là vô nghĩa, và sẽ làm nhiễu thống kê nhu cầu
    if (date < today) {
      throw { statusCode: 400, message: `Ngày ${date} đã qua, không gửi nguyện vọng được` };
    }

    const sessions = Number(cell.session_count ?? 1);
    if (!Number.isInteger(sessions) || sessions < 1 || sessions > 200) {
      throw { statusCode: 400, message: 'Số buổi phải từ 1 đến 200' };
    }

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

  return { created: created?.length || 0, skipped: rows.length - fresh.length, data: created };
};

/** Người đăng ký tự rút nguyện vọng của mình. */
const cancelRequest = async (requestId, registrantId) => {
  const { data: row, error } = await supabase
    .from('booking_requests')
    .select('id, registrant_id, status')
    .eq('id', requestId)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw { statusCode: 404, message: 'Không tìm thấy nguyện vọng này' };
  if (row.registrant_id !== registrantId) {
    throw { statusCode: 403, message: 'Bạn chỉ có thể rút nguyện vọng của mình' };
  }
  if (row.status === 'cancelled') return { id: requestId };

  const { error: upErr } = await supabase
    .from('booking_requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', requestId);
  if (upErr) throw upErr;
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
const updateRequest = async (requestId, patch = {}, { registrantId = null, canColor = false } = {}) => {
  const { data: row, error } = await supabase
    .from('booking_requests')
    .select('id, registrant_id, status, start_time, end_time')
    .eq('id', requestId)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw { statusCode: 404, message: 'Không tìm thấy buổi đăng ký này' };
  if (registrantId && row.registrant_id !== registrantId) {
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

  if (patch.note !== undefined) {
    const clean = patch.note === null || String(patch.note).trim() === ''
      ? null
      : String(patch.note).trim().slice(0, 500);
    update.note = clean;
  }

  if (patch.session_count !== undefined) {
    const n = Number(patch.session_count);
    if (!Number.isInteger(n) || n < 1 || n > 200) {
      throw { statusCode: 400, message: 'Số buổi phải từ 1 đến 200' };
    }
    update.session_count = n;
  }

  if (patch.registrant_id !== undefined) {
    if (registrantId) throw { statusCode: 403, message: 'Chỉ trung tâm đổi được học viên của buổi' };
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
    if (!canColor) throw { statusCode: 403, message: 'Chỉ quản trị viên đổi được màu' };
    const next = patch.color === null || patch.color === '' ? null : String(patch.color);
    if (next !== null && !PALETTE.includes(next) && next !== DEFAULT_COLOR) {
      throw { statusCode: 400, message: `Màu không hợp lệ: ${next}` };
    }
    update.color = next;
  }

  if (Object.keys(update).length === 1) {
    throw { statusCode: 400, message: 'Không có gì để sửa' };
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
    .select('id, status')
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
  return { id: requestId };
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
  return row;
};

const deleteSlot = async (id) => {
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
    .select('id, session_date, start_time, end_time, status, note, session_count, color, created_at, review_note, created_slot_id, registrant:booking_registrants!booking_requests_registrant_id_fkey(id, full_name, phone, color)')
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
