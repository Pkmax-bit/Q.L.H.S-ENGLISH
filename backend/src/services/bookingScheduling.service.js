const { supabase } = require('../config/database');
const { normalizePhone, isValidPhone } = require('../utils/phone');
const bookingService = require('./booking.service');

const REGISTRANT_EMBED =
  'registrant:booking_registrants!booking_pool_items_registrant_id_fkey(id, full_name, phone, color)';

/**
 * Màn xếp lịch của admin: gán người vào ca, mỗi lượt gán kèm một mức giá, gỡ ra
 * thì rơi xuống khu "giờ chờ sắp".
 *
 * Tách khỏi booking.service.js vì đó đã là file lớn phục vụ nhánh công khai;
 * trộn thêm logic quản trị + tiền vào sẽ khó soát chỗ nào lộ dữ liệu ra ngoài.
 */

// ------------------------------------------------------------ mức giá

const listPriceTiers = async (registrantId) => {
  const { data, error } = await supabase
    .from('booking_price_tiers')
    .select('*')
    .eq('registrant_id', registrantId)
    .order('is_default', { ascending: false })
    .order('amount', { ascending: true });
  if (error) throw error;
  return data || [];
};

const parseAmount = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1e12) {
    throw { statusCode: 400, message: 'Số tiền không hợp lệ' };
  }
  // Tiền Việt không dùng phần lẻ; làm tròn để tránh 199999.99999
  return Math.round(n);
};

const createPriceTier = async (registrantId, data, currentUser) => {
  const name = String(data.name || '').trim();
  if (!name) throw { statusCode: 400, message: 'Tên mức giá không được để trống' };
  if (name.length > 80) throw { statusCode: 400, message: 'Tên mức giá tối đa 80 ký tự' };

  const amount = parseAmount(data.amount);
  const isDefault = Boolean(data.is_default);

  // Chỉ một mức mặc định mỗi người — gỡ cờ cũ trước khi đặt cờ mới
  if (isDefault) {
    const { error: clrErr } = await supabase
      .from('booking_price_tiers')
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq('registrant_id', registrantId)
      .eq('is_default', true);
    if (clrErr) throw clrErr;
  }

  const { data: row, error } = await supabase
    .from('booking_price_tiers')
    .insert({
      registrant_id: registrantId,
      name,
      amount,
      is_default: isDefault,
      note: data.note ? String(data.note).trim() : null,
      created_by: currentUser?.id || null,
    })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') {
      throw { statusCode: 409, message: `Người này đã có mức giá tên "${name}"` };
    }
    throw error;
  }
  return row;
};

const updatePriceTier = async (tierId, data) => {
  const patch = { updated_at: new Date().toISOString() };
  const has = (k) => Object.prototype.hasOwnProperty.call(data, k);

  if (has('name')) {
    const name = String(data.name || '').trim();
    if (!name) throw { statusCode: 400, message: 'Tên mức giá không được để trống' };
    patch.name = name;
  }
  if (has('amount')) patch.amount = parseAmount(data.amount);
  if (has('note')) patch.note = data.note ? String(data.note).trim() : null;

  if (has('is_default') && data.is_default) {
    const { data: tier, error: tErr } = await supabase
      .from('booking_price_tiers')
      .select('registrant_id')
      .eq('id', tierId)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!tier) throw { statusCode: 404, message: 'Không tìm thấy mức giá' };

    const { error: clrErr } = await supabase
      .from('booking_price_tiers')
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq('registrant_id', tier.registrant_id)
      .eq('is_default', true);
    if (clrErr) throw clrErr;
    patch.is_default = true;
  } else if (has('is_default')) {
    patch.is_default = false;
  }

  const { data: row, error } = await supabase
    .from('booking_price_tiers')
    .update(patch)
    .eq('id', tierId)
    .select()
    .single();
  if (error) {
    if (error.code === '23505') throw { statusCode: 409, message: 'Trùng tên mức giá' };
    throw error;
  }
  if (!row) throw { statusCode: 404, message: 'Không tìm thấy mức giá' };
  return row;
};

const deletePriceTier = async (tierId) => {
  // Lượt xếp cũ giữ nguyên price_amount (bản sao) nên xóa mức giá không làm mất
  // tiền đã chốt; price_tier_id chỉ chuyển về NULL.
  const { count, error: cErr } = await supabase
    .from('booking_entries')
    .select('id', { count: 'exact', head: true })
    .eq('price_tier_id', tierId)
    .neq('status', 'cancelled');
  if (cErr) throw cErr;

  const { error } = await supabase.from('booking_price_tiers').delete().eq('id', tierId);
  if (error) throw error;
  return { id: tierId, detached_entries: count || 0 };
};

// ------------------------------------------------- quản lý học viên đăng ký

/**
 * Danh sách học viên đã đăng ký kèm số liệu học phí.
 *
 * Gom ở tầng Node thay vì viết một RPC: số người đăng ký của một trung tâm là
 * hàng trăm, không phải hàng triệu — thêm một hàm SQL nữa chỉ làm khó bảo trì.
 * Nếu sau này vượt vài nghìn người thì mới nên đổi sang view/RPC có phân trang.
 */
const listRegistrants = async (queryParams = {}) => {
  const search = String(queryParams.search || '').trim();

  let q = supabase
    .from('booking_registrants')
    .select('id, full_name, phone, color, created_at, last_login_at');
  if (search) {
    const safe = search.replace(/[%,()]/g, '');
    q = q.or(`full_name.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }
  const { data: people, error } = await q.order('created_at', { ascending: false }).limit(500);
  if (error) throw error;

  const ids = (people || []).map((p) => p.id);
  if (ids.length === 0) return [];

  const [{ data: entries, error: eErr }, { data: tiers, error: tErr }] = await Promise.all([
    supabase
      .from('booking_entries')
      .select('registrant_id, status, price_amount, session_date')
      .in('registrant_id', ids)
      .neq('status', 'cancelled'),
    supabase
      .from('booking_price_tiers')
      .select('id, registrant_id, name, amount, is_default')
      .in('registrant_id', ids),
  ]);
  if (eErr) throw eErr;
  if (tErr) throw tErr;

  const stat = new Map(ids.map((id) => [id, { sessions: 0, waitlist: 0, total: 0, unpriced: 0, last_date: null }]));
  for (const e of entries || []) {
    const st = stat.get(e.registrant_id);
    if (!st) continue;
    if (e.status === 'waitlist') st.waitlist += 1;
    else st.sessions += 1;
    if (e.price_amount === null || e.price_amount === undefined) st.unpriced += 1;
    else st.total += Number(e.price_amount) || 0;
    if (!st.last_date || e.session_date > st.last_date) st.last_date = e.session_date;
  }

  const tierMap = new Map(ids.map((id) => [id, []]));
  for (const t of tiers || []) tierMap.get(t.registrant_id)?.push(t);

  return (people || []).map((p) => {
    const st = stat.get(p.id);
    const list = tierMap.get(p.id) || [];
    const def = list.find((t) => t.is_default) || null;
    return {
      ...p,
      session_count: st.sessions,
      waitlist_count: st.waitlist,
      total_amount: st.total,
      // Số buổi đã xếp mà chưa có tiền — đây là thứ admin cần soi để không sót thu
      unpriced_count: st.unpriced,
      last_session_date: st.last_date,
      tier_count: list.length,
      default_tier_name: def?.name || null,
      default_tier_amount: def?.amount ?? null,
    };
  });
};

// ------------------------------------------------------- giờ chờ sắp

const listPool = async (boardId) => {
  const { data, error } = await supabase
    .from('booking_pool_items')
    .select(`id, board_id, registrant_id, price_tier_id, duration_minutes, note, source, created_at, ${REGISTRANT_EMBED}, tier:booking_price_tiers!booking_pool_items_price_tier_id_fkey(id, name, amount)`)
    .eq('board_id', boardId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  return (data || []).map((r) => ({
    id: r.id,
    registrant_id: r.registrant_id,
    full_name: r.registrant?.full_name || null,
    phone: r.registrant?.phone || null,
    color: r.registrant?.color || null,
    price_tier_id: r.price_tier_id,
    price_name: r.tier?.name || null,
    price_amount: r.tier?.amount ?? null,
    duration_minutes: r.duration_minutes,
    note: r.note,
    source: r.source,
    created_at: r.created_at,
  }));
};

/** Thêm người vào khu chờ sắp; SĐT lạ thì tạo luôn bản ghi người đăng ký. */
const addToPool = async (boardId, data, currentUser) => {
  let registrantId = data.registrant_id || null;

  if (!registrantId) {
    const phone = normalizePhone(data.phone);
    if (!phone || !isValidPhone(phone)) {
      throw { statusCode: 400, message: 'Số điện thoại không hợp lệ. Ví dụ: 0912345678' };
    }
    const { data: found, error } = await supabase
      .from('booking_registrants')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();
    if (error) throw error;

    if (found) {
      registrantId = found.id;
    } else {
      const name = String(data.full_name || '').trim();
      if (!name) throw { statusCode: 400, message: 'Số này chưa có trong hệ thống, cần nhập họ tên' };
      const { data: created, error: insErr } = await supabase
        .from('booking_registrants')
        .insert({ phone, full_name: name })
        .select('id')
        .single();
      if (insErr) throw insErr;
      registrantId = created.id;
    }
  }

  const duration = Number(data.duration_minutes ?? 60);
  if (!Number.isInteger(duration) || duration < 5 || duration > 720) {
    throw { statusCode: 400, message: 'Thời lượng phải từ 5 phút đến 12 tiếng' };
  }

  // Chưa chọn mức giá thì lấy mức mặc định của người đó, cho đỡ phải bấm thêm
  let tierId = data.price_tier_id || null;
  if (!tierId) {
    const { data: def } = await supabase
      .from('booking_price_tiers')
      .select('id')
      .eq('registrant_id', registrantId)
      .eq('is_default', true)
      .maybeSingle();
    tierId = def?.id || null;
  }

  const { data: row, error } = await supabase
    .from('booking_pool_items')
    .insert({
      board_id: boardId,
      registrant_id: registrantId,
      price_tier_id: tierId,
      duration_minutes: duration,
      note: data.note ? String(data.note).trim() : null,
      source: data.source || 'manual',
      created_by: currentUser?.id || null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return row;
};

/**
 * Gỡ một buổi đã đăng ký khỏi lưới, thả xuống khu "giờ chờ sắp".
 *
 * Không xóa thẳng: người ta vẫn muốn học, chỉ là giờ đó chưa xếp được. Giữ lại
 * trong pool kèm thời lượng để admin kéo vào khung giờ khác, thay vì bắt học
 * viên đăng ký lại từ đầu.
 *
 * Nguyện vọng gốc chuyển sang 'cancelled' chứ không xóa hàng — còn dấu vết là
 * giờ đó từng có người muốn học, và chỉ mục chặn trùng mới nhả ra cho lần xếp sau.
 */
const detachRequestToPool = async (requestId, currentUser) => {
  const { data: req, error } = await supabase
    .from('booking_requests')
    .select('id, board_id, registrant_id, start_time, end_time, note, status')
    .eq('id', requestId)
    .maybeSingle();
  if (error) throw error;
  if (!req) throw { statusCode: 404, message: 'Không tìm thấy buổi đăng ký này' };
  // Gỡ hai lần cùng một buổi thì chỉ còn lại một mục chờ, không đẻ thêm bản sao:
  // lưới cũ trên màn người khác vẫn còn khối đó, họ kéo lại là ra mục thứ hai.
  if (req.status === 'cancelled') {
    const { data: existing } = await supabase
      .from('booking_pool_items')
      .select('id')
      .eq('board_id', req.board_id)
      .eq('registrant_id', req.registrant_id)
      .eq('source', 'request')
      .limit(1);
    if (existing && existing.length) {
      return { pool_item_id: existing[0].id, request_id: requestId, already: true };
    }
  }

  const toMin = (t) => {
    const [h, m] = String(t).split(':');
    return (Number(h) || 0) * 60 + (Number(m) || 0);
  };
  const duration = Math.min(720, Math.max(5, toMin(req.end_time) - toMin(req.start_time)));

  const { data: item, error: insErr } = await supabase
    .from('booking_pool_items')
    .insert({
      board_id: req.board_id,
      registrant_id: req.registrant_id,
      duration_minutes: duration,
      note: req.note,
      source: 'request',
      created_by: currentUser?.id || null,
    })
    .select('id')
    .single();
  if (insErr) throw insErr;

  const { error: upErr } = await supabase
    .from('booking_requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', requestId);
  if (upErr) throw upErr;

  bookingService.logActivity({
    boardId: req.board_id,
    actor: currentUser
      ? { userId: currentUser.id, name: currentUser.fullName || currentUser.email }
      : await bookingService.actorFromRegistrant(req.registrant_id),
    action: 'request.detach',
    targetId: requestId,
    detail: { gio: `${String(req.start_time).slice(0, 5)}–${String(req.end_time).slice(0, 5)}` },
  });
  bookingService.notifyBoard(req.board_id, 'request.detach');
  return { pool_item_id: item.id, request_id: requestId };
};

/**
 * Ngược lại: kéo một người từ khu chờ vào đúng khung giờ trên lưới.
 *
 * Tạo lại nguyện vọng ở giờ mới rồi bỏ khỏi pool. Thời lượng lấy theo item nên
 * kéo vào 19:00 thì ra đúng 19:00–20:30 nếu người đó cần 90 phút.
 */
const scheduleFromPool = async (itemId, { session_date: sessionDate, start_time: startTime, end_time: endTime }) => {
  const { data: item, error } = await supabase
    .from('booking_pool_items')
    .select('id, board_id, registrant_id, duration_minutes, note')
    .eq('id', itemId)
    .maybeSingle();
  if (error) throw error;
  if (!item) throw { statusCode: 404, message: 'Không tìm thấy mục trong khu chờ' };

  // Chèn thẳng, không mượn createRequests của nhánh công khai: hàm đó nhận slug
  // và chặn khi bảng đã đóng — admin xếp lịch thì bảng đóng hay mở không liên quan.
  const toMin = (t) => {
    const [h, m] = String(t || '').split(':');
    return (Number(h) || 0) * 60 + (Number(m) || 0);
  };
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (total) => {
    const t = Math.max(0, Math.min(24 * 60 - 1, total));
    return `${pad(Math.floor(t / 60))}:${pad(t % 60)}:00`;
  };
  const start = toMin(startTime);
  // end_time có gửi lên thì tôn trọng: đó là lúc người xếp chọn "rút ngắn cho
  // vừa chỗ trống", không được âm thầm kéo dài lại theo thời lượng gốc
  const end = endTime
    ? Math.min(24 * 60 - 1, toMin(endTime))
    : Math.min(24 * 60 - 1, start + (item.duration_minutes || 60));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(sessionDate || ''))) {
    throw { statusCode: 400, message: 'Ngày không hợp lệ' };
  }
  if (end <= start) throw { statusCode: 400, message: 'Giờ kết thúc phải sau giờ bắt đầu' };

  await bookingService.assertNoSelfOverlap(
    item.board_id,
    item.registrant_id,
    sessionDate,
    fmt(start),
    fmt(end)
  );

  const { data: created, error: insErr } = await supabase
    .from('booking_requests')
    .insert({
      board_id: item.board_id,
      registrant_id: item.registrant_id,
      session_date: sessionDate,
      start_time: fmt(start),
      end_time: fmt(end),
      note: item.note,
    })
    .select('id')
    .single();
  if (insErr) {
    if (insErr.code === '23505') {
      throw { statusCode: 409, message: 'Người này đã có buổi ở đúng khung giờ đó' };
    }
    throw insErr;
  }

  const { error: delErr } = await supabase.from('booking_pool_items').delete().eq('id', itemId);
  if (delErr) throw delErr;

  bookingService.logActivity({
    boardId: item.board_id,
    actor: await bookingService.actorFromRegistrant(item.registrant_id),
    action: 'pool.schedule',
    targetId: created.id,
    detail: { ngay: sessionDate, gio: `${fmt(start).slice(0, 5)}–${fmt(end).slice(0, 5)}` },
  });
  bookingService.notifyBoard(item.board_id, 'pool.schedule');
  return { id: created.id, pool_item_id: itemId };
};

/**
 * Ba cửa dành cho phiên CÔNG KHAI của số được đánh dấu quản lý (047).
 *
 * Chỉ là lớp kiểm cờ rồi gọi lại đúng hàm admin dùng — không nhân bản logic,
 * để sửa một chỗ là cả hai đường cùng đổi.
 */
const managerListPool = async (slug, registrantId) => {
  if (!(await bookingService.isManagerSession(registrantId))) {
    throw { statusCode: 403, message: 'Bạn không có quyền xem khu chờ' };
  }
  const board = await bookingService.getBoardBySlugId(slug);
  return listPool(board.id);
};

const managerDetachRequest = async (requestId, registrantId) => {
  if (!(await bookingService.isManagerSession(registrantId))) {
    throw { statusCode: 403, message: 'Bạn không có quyền gỡ buổi học' };
  }
  return detachRequestToPool(requestId, null);
};

const managerRemoveFromPool = async (itemId, registrantId) => {
  if (!(await bookingService.isManagerSession(registrantId))) {
    throw { statusCode: 403, message: 'Bạn không có quyền sửa khu chờ' };
  }
  return removeFromPool(itemId);
};

const managerScheduleFromPool = async (itemId, data, registrantId) => {
  if (!(await bookingService.isManagerSession(registrantId))) {
    throw { statusCode: 403, message: 'Bạn không có quyền xếp lịch' };
  }
  return scheduleFromPool(itemId, data);
};

const removeFromPool = async (itemId) => {
  const { error } = await supabase.from('booking_pool_items').delete().eq('id', itemId);
  if (error) throw error;
  return { id: itemId };
};

// --------------------------------------------------- xếp vào ca / gỡ ra

/**
 * Quyết số tiền cho một lượt xếp, ưu tiên từ riêng đến chung:
 *   1. Mức giá admin chọn tay
 *   2. Mức giá MẶC ĐỊNH của học viên đó
 *   3. Học phí của ca (booking_slots.price_amount)
 *   4. Không có giá
 *
 * Luôn chốt BẢN SAO số tiền vào booking_entries.price_amount — sửa mức giá hay
 * giá ca về sau không được làm đổi tiền của buổi đã xếp.
 */
const resolvePrice = async (registrantId, tierId, slotId = null) => {
  if (tierId) {
    const { data: tier, error } = await supabase
      .from('booking_price_tiers')
      .select('id, registrant_id, amount')
      .eq('id', tierId)
      .maybeSingle();
    if (error) throw error;
    if (!tier) throw { statusCode: 404, message: 'Không tìm thấy mức giá' };
    if (tier.registrant_id !== registrantId) {
      throw { statusCode: 400, message: 'Mức giá này không thuộc về người đang xếp' };
    }
    return { price_tier_id: tier.id, price_amount: tier.amount, price_source: 'tier' };
  }

  const { data: def, error: defErr } = await supabase
    .from('booking_price_tiers')
    .select('id, amount')
    .eq('registrant_id', registrantId)
    .eq('is_default', true)
    .maybeSingle();
  if (defErr) throw defErr;
  if (def) return { price_tier_id: def.id, price_amount: def.amount, price_source: 'default_tier' };

  if (slotId) {
    const { data: slot, error: sErr } = await supabase
      .from('booking_slots')
      .select('price_amount')
      .eq('id', slotId)
      .maybeSingle();
    if (sErr) throw sErr;
    if (slot?.price_amount !== null && slot?.price_amount !== undefined) {
      return { price_tier_id: null, price_amount: slot.price_amount, price_source: 'slot' };
    }
  }

  return { price_tier_id: null, price_amount: null, price_source: 'none' };
};

/**
 * Xếp một người vào ca. Dùng lại đúng hàm giữ chỗ của nhánh công khai để sĩ số
 * vẫn do SQL khóa hàng kiểm tra — admin xếp tay cũng không được vượt sĩ số.
 */
const assignToSlot = async (slotId, data, currentUser) => {
  const { registrant_id: registrantId, session_date: sessionDate } = data;
  if (!registrantId) throw { statusCode: 400, message: 'Thiếu người cần xếp' };

  const booked = await bookingService.registerSlot(slotId, registrantId, sessionDate);
  const { price_source: priceSource, ...price } = await resolvePrice(
    registrantId,
    data.price_tier_id || null,
    slotId
  );

  const { data: entry, error } = await supabase
    .from('booking_entries')
    .update({ ...price, assigned_by: currentUser?.id || null })
    .eq('id', booked.entry_id)
    .select('id, status, session_date, price_tier_id, price_amount')
    .single();
  if (error) throw error;

  // Xếp xong thì bỏ khỏi khu chờ sắp
  if (data.pool_item_id) {
    const { error: delErr } = await supabase
      .from('booking_pool_items')
      .delete()
      .eq('id', data.pool_item_id);
    if (delErr) throw delErr;
  }

  return { ...booked, entry, price_source: priceSource, already_booked: booked.already_booked };
};

/** Đổi mức giá của một lượt đã xếp. */
const updateEntryPrice = async (entryId, tierId) => {
  const { data: entry, error: eErr } = await supabase
    .from('booking_entries')
    .select('id, registrant_id')
    .eq('id', entryId)
    .maybeSingle();
  if (eErr) throw eErr;
  if (!entry) throw { statusCode: 404, message: 'Không tìm thấy lượt xếp này' };

  const { price_source: _src, ...price } = await resolvePrice(entry.registrant_id, tierId || null);

  const { data: row, error } = await supabase
    .from('booking_entries')
    .update(price)
    .eq('id', entryId)
    .select('id, price_tier_id, price_amount')
    .single();
  if (error) throw error;
  return row;
};

/**
 * Gỡ một lượt khỏi ca và đẩy xuống khu chờ sắp.
 *
 * Hủy chỗ qua đúng RPC cancel_booking_entry để người đầu hàng chờ của ca đó
 * được đẩy lên — nếu xóa thẳng bản ghi thì hàng chờ đứng im.
 */
const detachToPool = async (entryId, currentUser) => {
  const { data: entry, error: eErr } = await supabase
    .from('booking_entries')
    .select('id, board_id, slot_id, registrant_id, price_tier_id, status')
    .eq('id', entryId)
    .maybeSingle();
  if (eErr) throw eErr;
  if (!entry) throw { statusCode: 404, message: 'Không tìm thấy lượt xếp này' };
  if (entry.status === 'cancelled') {
    throw { statusCode: 409, message: 'Lượt xếp này đã bị hủy trước đó' };
  }

  const { data: slot, error: sErr } = await supabase
    .from('booking_slots')
    .select('start_time, end_time')
    .eq('id', entry.slot_id)
    .maybeSingle();
  if (sErr) throw sErr;

  const toMin = (t) => {
    const m = String(t || '').match(/^(\d{2}):(\d{2})/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const start = toMin(slot?.start_time);
  const end = toMin(slot?.end_time);
  const duration = start !== null && end !== null ? Math.max(5, Math.min(720, end - start)) : 60;

  const cancelled = await bookingService.adminCancelEntry(entryId);

  const { data: pooled, error: pErr } = await supabase
    .from('booking_pool_items')
    .insert({
      board_id: entry.board_id,
      registrant_id: entry.registrant_id,
      price_tier_id: entry.price_tier_id,
      duration_minutes: duration,
      source: 'removed',
      from_entry_id: entry.id,
      created_by: currentUser?.id || null,
    })
    .select('id')
    .single();
  if (pErr) throw pErr;

  return { entry_id: entryId, pool_item_id: pooled.id, promoted_entry_id: cancelled.promoted_entry_id };
};

/** Chuyển một lượt sang ca khác = gỡ rồi xếp lại, giữ nguyên mức giá. */
const moveEntry = async (entryId, data, currentUser) => {
  const { data: entry, error: eErr } = await supabase
    .from('booking_entries')
    .select('id, registrant_id, price_tier_id, status')
    .eq('id', entryId)
    .maybeSingle();
  if (eErr) throw eErr;
  if (!entry) throw { statusCode: 404, message: 'Không tìm thấy lượt xếp này' };

  const assigned = await assignToSlot(
    data.slot_id,
    {
      registrant_id: entry.registrant_id,
      session_date: data.session_date,
      price_tier_id: entry.price_tier_id,
    },
    currentUser
  );

  // Chỉ hủy chỗ cũ SAU KHI chỗ mới chắc chắn thành công. Hủy trước mà ca mới
  // đầy thì người đó mất cả hai chỗ.
  await bookingService.adminCancelEntry(entryId);

  return { from_entry_id: entryId, to: assigned };
};

module.exports = {
  listRegistrants,
  listPriceTiers,
  createPriceTier,
  updatePriceTier,
  deletePriceTier,
  listPool,
  addToPool,
  removeFromPool,
  detachRequestToPool,
  scheduleFromPool,
  managerListPool,
  managerRemoveFromPool,
  managerDetachRequest,
  managerScheduleFromPool,
  assignToSlot,
  updateEntryPrice,
  detachToPool,
  moveEntry,
};
