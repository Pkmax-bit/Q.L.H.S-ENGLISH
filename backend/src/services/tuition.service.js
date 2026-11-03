const { supabase } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');
const { countInclusiveCalendarMonths } = require('../utils/tuitionMonths');
const {
  countScheduledSessions,
  buildCalendarMonthPeriods,
  sessionsCountByMonth,
  invoiceOverlapsPeriod,
  maxDateStr: schedMaxDateStr,
} = require('../utils/scheduleSessions');

const INVOICE_SELECT = `
  *,
  student:profiles!tuition_invoices_student_id_fkey(id, full_name, email, phone),
  class:classes!tuition_invoices_class_id_fkey(id, name)
`;

const mapInvoiceRow = (row) => {
  if (!row) return row;
  const { student, class: cls, ...rest } = row;
  return {
    ...rest,
    student_name: student?.full_name || null,
    student_email: student?.email || null,
    student_phone: student?.phone || null,
    class_name: cls?.name || null,
  };
};

const monthRange = (yearMonth) => {
  const [y, m] = yearMonth.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0));
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { period_start: fmt(start), period_end: fmt(end) };
};

function aggregateStudentInvoices(invoices) {
  return (invoices || []).reduce(
    (acc, inv) => ({
      total: acc.total + (Number(inv.total) || 0),
      paid: acc.paid + (Number(inv.paid_amount) || 0),
      balance: acc.balance + (Number(inv.balance) || 0),
      invoice_count: acc.invoice_count + 1,
    }),
    { total: 0, paid: 0, balance: 0, invoice_count: 0 },
  );
}

function studentFeeStatusFromAgg(agg) {
  if (!agg.invoice_count) return 'no_invoice';
  if (agg.balance <= 0) return 'paid';
  if (agg.paid > 0) return 'partial';
  return 'unpaid';
}

function countStudentsByFeeStatus(enrolledIds, invoicesByStudent) {
  const counts = { paid: 0, partial: 0, unpaid: 0, no_invoice: 0 };
  for (const studentId of enrolledIds) {
    const agg = aggregateStudentInvoices(invoicesByStudent[studentId] || []);
    counts[studentFeeStatusFromAgg(agg)] += 1;
  }
  return counts;
}

const getInvoices = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['created_at', 'period_start', 'due_date', 'total', 'balance', 'status'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';

  const studentId = queryParams.student_id || null;
  const classId = queryParams.class_id || null;
  const status = queryParams.status || null;
  const periodStart = queryParams.period_start || null;
  const periodEnd = queryParams.period_end || null;

  const applyFilters = (q) => {
    if (studentId) q = q.eq('student_id', studentId);
    if (classId) q = q.eq('class_id', classId);
    if (status) q = q.eq('status', status);
    if (periodStart) q = q.gte('period_start', periodStart);
    if (periodEnd) q = q.lte('period_end', periodEnd);
    if (search) q = q.or(`invoice_no.ilike.%${search}%,note.ilike.%${search}%`);
    return q;
  };

  let countQuery = supabase.from('tuition_invoices').select('id', { count: 'exact', head: true });
  countQuery = applyFilters(countQuery);
  const { count: total, error: countError } = await countQuery;
  if (countError) throw countError;

  let dataQuery = supabase.from('tuition_invoices').select(INVOICE_SELECT);
  dataQuery = applyFilters(dataQuery);
  dataQuery = dataQuery
    .order(sort, { ascending: sortOrder === 'ASC' })
    .range(offset, offset + limit - 1);

  const { data, error } = await dataQuery;
  if (error) throw error;

  return {
    data: (data || []).map(mapInvoiceRow),
    pagination: buildPaginationResponse(total || 0, page, limit),
  };
};

const getInvoiceById = async (id) => {
  const { data: invoice, error } = await supabase
    .from('tuition_invoices')
    .select(INVOICE_SELECT)
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const { data: items, error: itemsError } = await supabase
    .from('tuition_invoice_items')
    .select('*')
    .eq('invoice_id', id)
    .order('created_at', { ascending: true });
  if (itemsError) throw itemsError;

  const { data: payments, error: payError } = await supabase
    .from('tuition_payments')
    .select(`
      *,
      collector:profiles!tuition_payments_collected_by_fkey(id, full_name)
    `)
    .eq('invoice_id', id)
    .order('paid_at', { ascending: false });
  if (payError) throw payError;

  return {
    ...mapInvoiceRow(invoice),
    items: items || [],
    payments: (payments || []).map(p => {
      const { collector, ...rest } = p;
      return { ...rest, collected_by_name: collector?.full_name || null };
    }),
  };
};

const createInvoice = async (payload, createdBy) => {
  const {
    student_id, class_id, fee_policy, period_start, period_end,
    due_date, subtotal = 0, discount = 0, note, items = [],
    attachment_urls = [],
  } = payload;

  const total = Number(subtotal) - Number(discount);

  // If items have explicit periods but invoice-level period not provided,
  // derive it from the items.
  let effPeriodStart = period_start;
  let effPeriodEnd = period_end;
  const itemPeriods = items.filter(it => it.period_start && it.period_end);
  if (!effPeriodStart && itemPeriods.length > 0) {
    effPeriodStart = itemPeriods.map(it => it.period_start).sort()[0];
  }
  if (!effPeriodEnd && itemPeriods.length > 0) {
    effPeriodEnd = itemPeriods.map(it => it.period_end).sort().slice(-1)[0];
  }

  const { data: invoice, error } = await supabase
    .from('tuition_invoices')
    .insert({
      student_id,
      class_id,
      fee_policy,
      period_start: effPeriodStart,
      period_end: effPeriodEnd,
      due_date,
      subtotal,
      discount,
      total,
      paid_amount: 0,
      balance: total,
      status: 'unpaid',
      note,
      attachment_urls: Array.isArray(attachment_urls) ? attachment_urls : [],
      created_by: createdBy,
    })
    .select()
    .single();
  if (error) throw error;

  if (items.length > 0) {
    const itemRows = items.map(it => ({
      invoice_id: invoice.id,
      description: it.description,
      quantity: Number(it.quantity || 1),
      unit_price: Number(it.unit_price || 0),
      amount: Number(it.amount ?? (Number(it.quantity || 1) * Number(it.unit_price || 0))),
      period_start: it.period_start || null,
      period_end: it.period_end || null,
      attachment_urls: Array.isArray(it.attachment_urls) ? it.attachment_urls : [],
    }));
    const { error: itemsError } = await supabase.from('tuition_invoice_items').insert(itemRows);
    if (itemsError) throw itemsError;
  }

  return getInvoiceById(invoice.id);
};

const updateInvoice = async (id, payload) => {
  const allowed = ['period_start', 'period_end', 'due_date', 'subtotal', 'discount', 'note', 'status', 'attachment_urls'];
  const updateObj = {};
  for (const k of allowed) if (payload[k] !== undefined) updateObj[k] = payload[k];

  if (updateObj.subtotal !== undefined || updateObj.discount !== undefined) {
    const { data: current } = await supabase
      .from('tuition_invoices').select('subtotal, discount, paid_amount').eq('id', id).single();
    if (current) {
      const sub = updateObj.subtotal !== undefined ? Number(updateObj.subtotal) : Number(current.subtotal);
      const disc = updateObj.discount !== undefined ? Number(updateObj.discount) : Number(current.discount);
      updateObj.total = sub - disc;
      updateObj.balance = updateObj.total - Number(current.paid_amount || 0);
    }
  }
  updateObj.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('tuition_invoices').update(updateObj).eq('id', id).select().single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  if (Array.isArray(payload.items)) {
    for (const it of payload.items) {
      if (!it?.id || it.attachment_urls === undefined) continue;
      const urls = Array.isArray(it.attachment_urls) ? it.attachment_urls : [];
      const { data: row } = await supabase
        .from('tuition_invoice_items')
        .select('id')
        .eq('id', it.id)
        .eq('invoice_id', id)
        .maybeSingle();
      if (!row) continue;
      const { error: itemErr } = await supabase
        .from('tuition_invoice_items')
        .update({ attachment_urls: urls })
        .eq('id', it.id);
      if (itemErr) throw itemErr;
    }
  }

  return getInvoiceById(data.id);
};

const removeInvoice = async (id) => {
  // Collect linked finance ids first (payments will be CASCADE deleted, but
  // finances has ON DELETE SET NULL → would leave orphan ledger rows).
  const { data: linkedPayments } = await supabase
    .from('tuition_payments')
    .select('finance_id')
    .eq('invoice_id', id);

  const { data, error } = await supabase
    .from('tuition_invoices').delete().eq('id', id).select('id').single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const financeIds = (linkedPayments || []).map(p => p.finance_id).filter(Boolean);
  if (financeIds.length > 0) {
    await supabase.from('finances').delete().in('id', financeIds);
  }

  return data;
};

// Generate invoices for one class for a given period (yearMonth = "2026-05")
const generateInvoicesForClass = async (classId, yearMonth, createdBy) => {
  const { data: cls, error: clsError } = await supabase
    .from('classes')
    .select('id, name, fee_policy, fee_amount, billing_day, sessions_per_period, start_date, end_date')
    .eq('id', classId)
    .single();
  if (clsError) throw clsError;
  if (!cls) throw new Error('Class not found');
  if (!cls.fee_policy) throw new Error('Class chưa cấu hình fee_policy');

  const { period_start, period_end } = monthRange(yearMonth);
  const schedules = await fetchClassSchedules(classId);

  // Hạn đóng: ngày hạn trong tháng kỳ; nếu đã qua thì lấy cuối kỳ
  // (tránh HĐ tháng hiện tại vừa sinh đã bị gắn «quá hạn»).
  let dueDate = period_start;
  if (cls.billing_day) {
    const [y, m] = yearMonth.split('-').map(Number);
    const day = Math.min(cls.billing_day, 28);
    dueDate = new Date(Date.UTC(y, m - 1, day)).toISOString().slice(0, 10);
  }
  const todayForDue = todayDateStr();
  if (dueDate < todayForDue && period_end >= todayForDue) {
    dueDate = period_end;
  }

  const { data: enrollments, error: enrollError } = await supabase
    .from('class_students')
    .select('student_id, enrollment_date')
    .eq('class_id', classId);
  if (enrollError) throw enrollError;

  const created = [];
  const skipped = [];

  for (const enr of (enrollments || [])) {
    let unitPrice = Number(cls.fee_amount || 0);
    let qty = 1;
    let description = `Học phí lớp ${cls.name} - ${yearMonth}`;

    if (cls.fee_policy === 'per_session') {
      const activeSchedules = schedules.filter((s) => s.is_active !== false);
      if (activeSchedules.length > 0) {
        const billFrom = maxDateStr(maxDateStr(enr.enrollment_date, cls.start_date), period_start);
        qty = countScheduledSessions(cls, activeSchedules, billFrom, period_end);
      } else {
        qty = Number(cls.sessions_per_period || 0);
      }
      if (qty <= 0) {
        skipped.push({ student_id: enr.student_id, reason: 'no_sessions_in_period' });
        continue;
      }
      description = `Học phí lớp ${cls.name} - ${qty} buổi (${yearMonth})`;
    } else if (cls.fee_policy === 'per_class') {
      description = `Học phí trọn gói lớp ${cls.name}`;
    } else if (cls.fee_policy === 'monthly') {
      const billStart = maxDateStr(enr.enrollment_date, cls.start_date);
      if (billStart > period_end) {
        skipped.push({ student_id: enr.student_id, reason: 'not_enrolled_yet' });
        continue;
      }
    }

    const subtotal = qty * unitPrice;

    // Check duplicate
    const { data: existing } = await supabase
      .from('tuition_invoices')
      .select('id')
      .eq('student_id', enr.student_id)
      .eq('class_id', classId)
      .eq('period_start', period_start)
      .maybeSingle();

    if (existing) {
      skipped.push({ student_id: enr.student_id, reason: 'already_exists' });
      continue;
    }

    try {
      const inv = await createInvoice({
        student_id: enr.student_id,
        class_id: classId,
        fee_policy: cls.fee_policy,
        period_start,
        period_end,
        due_date: dueDate,
        subtotal,
        discount: 0,
        note: null,
        items: [{ description, quantity: qty, unit_price: unitPrice, amount: subtotal }],
      }, createdBy);
      created.push(inv);
    } catch (e) {
      skipped.push({ student_id: enr.student_id, reason: e.message });
    }
  }

  return { created_count: created.length, skipped_count: skipped.length, created, skipped };
};

const generateMonthlyInvoices = async (yearMonth, createdBy) => {
  const { data: classes, error } = await supabase
    .from('classes')
    .select('id')
    .eq('fee_policy', 'monthly');
  if (error) throw error;

  let totalCreated = 0;
  let totalSkipped = 0;
  const byClass = [];
  for (const c of (classes || [])) {
    const r = await generateInvoicesForClass(c.id, yearMonth, createdBy);
    totalCreated += r.created_count;
    totalSkipped += r.skipped_count;
    byClass.push({ class_id: c.id, ...r });
  }
  return { yearMonth, totalCreated, totalSkipped, byClass };
};

const recordPayment = async (invoiceId, payload, collectedBy) => {
  const { data: invoice, error: invError } = await supabase
    .from('tuition_invoices')
    .select('id, balance, status, student_id, class_id')
    .eq('id', invoiceId)
    .single();
  if (invError) {
    if (invError.code === 'PGRST116') return null;
    throw invError;
  }
  if (invoice.status === 'cancelled') {
    throw new Error('Hóa đơn đã hủy, không thể thu tiền');
  }

  const amount = Number(payload.amount);
  if (!amount || amount <= 0) throw new Error('Số tiền không hợp lệ');
  const balance = Number(invoice.balance || 0);
  if (amount > balance + 0.0001) {
    throw new Error(`Số tiền vượt số còn lại (${balance})`);
  }

  // 1. Insert ledger entry first to get finance_id
  const { data: financeRow, error: finErr } = await supabase
    .from('finances')
    .insert({
      type: 'income',
      category: 'Học phí',
      amount,
      description: payload.note || `Thu học phí - HĐ ${invoiceId.slice(0, 8)}`,
      reference_type: 'tuition_invoice',
      reference_id: invoiceId,
      payment_date: payload.paid_at ? payload.paid_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
      payment_method: payload.payment_method || 'cash',
      status: 'completed',
      created_by: collectedBy,
    })
    .select()
    .single();
  if (finErr) throw finErr;

  // 2. Insert tuition_payment (trigger will sync invoice)
  const { data: paymentRow, error: payErr } = await supabase
    .from('tuition_payments')
    .insert({
      invoice_id: invoiceId,
      amount,
      payment_method: payload.payment_method || 'cash',
      paid_at: payload.paid_at || new Date().toISOString(),
      collected_by: collectedBy,
      finance_id: financeRow.id,
      note: payload.note || null,
      transfer_image_url: payload.transfer_image_url || null,
    })
    .select()
    .single();

  if (payErr) {
    // Rollback ledger entry
    await supabase.from('finances').delete().eq('id', financeRow.id);
    throw payErr;
  }

  return {
    payment: paymentRow,
    finance: financeRow,
    invoice: await getInvoiceById(invoiceId),
  };
};

const removePayment = async (paymentId) => {
  const { data: pay, error } = await supabase
    .from('tuition_payments')
    .select('id, finance_id, invoice_id')
    .eq('id', paymentId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const { error: delErr } = await supabase
    .from('tuition_payments').delete().eq('id', paymentId);
  if (delErr) throw delErr;

  if (pay.finance_id) {
    await supabase.from('finances').delete().eq('id', pay.finance_id);
  }

  return { id: paymentId, invoice_id: pay.invoice_id };
};

const getReceivablesReport = async (queryParams) => {
  const classId = queryParams.class_id || null;
  const studentId = queryParams.student_id || null;
  const periodStart = queryParams.period_start || null;
  const periodEnd = queryParams.period_end || null;

  let query = supabase
    .from('tuition_invoices')
    .select(`
      id, invoice_no, student_id, class_id, period_start, period_end,
      due_date, total, paid_amount, balance, status,
      student:profiles!tuition_invoices_student_id_fkey(id, full_name),
      class:classes!tuition_invoices_class_id_fkey(id, name)
    `);

  if (classId) query = query.eq('class_id', classId);
  if (studentId) query = query.eq('student_id', studentId);
  if (periodStart) query = query.gte('period_start', periodStart);
  if (periodEnd) query = query.lte('period_end', periodEnd);
  query = query.neq('status', 'cancelled');

  const { data, error } = await query;
  if (error) throw error;

  const today = new Date().toISOString().slice(0, 10);
  let totalAmount = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let totalOverdue = 0;
  const rows = [];

  for (const r of (data || [])) {
    const total = Number(r.total) || 0;
    const paid = Number(r.paid_amount) || 0;
    const balance = Number(r.balance) || 0;
    totalAmount += total;
    totalPaid += paid;
    totalOutstanding += balance;
    const isOverdue = balance > 0 && r.due_date && r.due_date < today;
    if (isOverdue) totalOverdue += balance;

    rows.push({
      id: r.id,
      invoice_no: r.invoice_no,
      student_name: r.student?.full_name || null,
      class_name: r.class?.name || null,
      period_start: r.period_start,
      period_end: r.period_end,
      due_date: r.due_date,
      total,
      paid_amount: paid,
      balance,
      status: r.status,
      is_overdue: isOverdue,
    });
  }

  return {
    summary: {
      invoice_count: rows.length,
      total_amount: totalAmount,
      total_paid: totalPaid,
      total_outstanding: totalOutstanding,
      total_overdue: totalOverdue,
    },
    rows,
  };
};

/** Công nợ theo học sinh (tổng hợp từ các HĐ còn balance > 0). */
const getStudentsReceivables = async (queryParams) => {
  const classId = queryParams.class_id || null;
  const search = (queryParams.search || '').trim().toLowerCase();
  const overdueOnly =
    queryParams.overdue_only === 'true' || queryParams.overdue_only === true;

  let query = supabase
    .from('tuition_invoices')
    .select(`
      id, invoice_no, student_id, class_id, balance, due_date, status,
      student:profiles!tuition_invoices_student_id_fkey(id, full_name, email, phone),
      class:classes!tuition_invoices_class_id_fkey(id, name)
    `)
    .neq('status', 'cancelled')
    .gt('balance', 0);

  if (classId) query = query.eq('class_id', classId);

  const { data, error } = await query;
  if (error) throw error;

  const today = new Date().toISOString().slice(0, 10);
  const byStudent = new Map();

  for (const r of data || []) {
    const sid = r.student_id;
    if (!byStudent.has(sid)) {
      byStudent.set(sid, {
        student_id: sid,
        student_name: r.student?.full_name || null,
        email: r.student?.email || null,
        phone: r.student?.phone || null,
        open_invoices: 0,
        total_outstanding: 0,
        overdue_outstanding: 0,
        oldest_due_date: null,
        classes: new Set(),
      });
    }
    const row = byStudent.get(sid);
    const bal = Number(r.balance) || 0;
    row.open_invoices += 1;
    row.total_outstanding += bal;
    const isOverdue = r.due_date && r.due_date < today;
    if (isOverdue) row.overdue_outstanding += bal;
    if (r.due_date && (!row.oldest_due_date || r.due_date < row.oldest_due_date)) {
      row.oldest_due_date = r.due_date;
    }
    if (r.class?.name) row.classes.add(r.class.name);
  }

  let rows = Array.from(byStudent.values()).map((s) => ({
    student_id: s.student_id,
    student_name: s.student_name,
    email: s.email,
    phone: s.phone,
    open_invoices: s.open_invoices,
    total_outstanding: Math.round(s.total_outstanding * 100) / 100,
    overdue_outstanding: Math.round(s.overdue_outstanding * 100) / 100,
    oldest_due_date: s.oldest_due_date,
    classes: Array.from(s.classes).join(', '),
    has_overdue: s.overdue_outstanding > 0,
  }));

  if (search) {
    rows = rows.filter(
      (s) =>
        (s.student_name || '').toLowerCase().includes(search) ||
        (s.email || '').toLowerCase().includes(search) ||
        (s.phone || '').includes(queryParams.search.trim())
    );
  }
  if (overdueOnly) rows = rows.filter((s) => s.has_overdue);

  rows.sort((a, b) => b.total_outstanding - a.total_outstanding);

  const summary = {
    student_count: rows.length,
    open_invoices: rows.reduce((n, r) => n + r.open_invoices, 0),
    total_outstanding: Math.round(rows.reduce((n, r) => n + r.total_outstanding, 0) * 100) / 100,
    total_overdue: Math.round(rows.reduce((n, r) => n + r.overdue_outstanding, 0) * 100) / 100,
  };

  return { summary, rows };
};

const getRevenueReport = async (queryParams) => {
  const startDate = queryParams.start_date || null;
  const endDate = queryParams.end_date || null;

  let query = supabase
    .from('tuition_payments')
    .select(`
      amount, paid_at, payment_method,
      invoice:tuition_invoices!tuition_payments_invoice_id_fkey(class_id, class:classes!tuition_invoices_class_id_fkey(id, name))
    `);
  if (startDate) query = query.gte('paid_at', startDate);
  if (endDate) query = query.lte('paid_at', endDate + 'T23:59:59');

  const { data, error } = await query;
  if (error) throw error;

  let total = 0;
  const byMonth = {};
  const byClass = {};
  const byMethod = {};

  for (const p of (data || [])) {
    const amt = Number(p.amount) || 0;
    total += amt;
    const ym = (p.paid_at || '').slice(0, 7);
    byMonth[ym] = (byMonth[ym] || 0) + amt;

    const className = p.invoice?.class?.name || 'Khác';
    byClass[className] = (byClass[className] || 0) + amt;

    const method = p.payment_method || 'other';
    byMethod[method] = (byMethod[method] || 0) + amt;
  }

  return {
    total,
    by_month: Object.entries(byMonth).map(([k, v]) => ({ month: k, amount: v })).sort((a, b) => a.month.localeCompare(b.month)),
    by_class: Object.entries(byClass).map(([k, v]) => ({ name: k, amount: v })).sort((a, b) => b.amount - a.amount),
    by_method: Object.entries(byMethod).map(([k, v]) => ({ method: k, amount: v })),
  };
};

const getStudentLedger = async (studentId) => {
  const { data: invoices, error } = await supabase
    .from('tuition_invoices')
    .select(`
      *,
      class:classes!tuition_invoices_class_id_fkey(id, name)
    `)
    .eq('student_id', studentId)
    .order('period_start', { ascending: false });
  if (error) throw error;

  let totalAmount = 0;
  let totalPaid = 0;
  const list = [];
  for (const inv of (invoices || [])) {
    totalAmount += Number(inv.total) || 0;
    totalPaid += Number(inv.paid_amount) || 0;
    const { class: cls, ...rest } = inv;
    list.push({ ...rest, class_name: cls?.name || null });
  }

  return {
    summary: {
      invoice_count: list.length,
      total_amount: totalAmount,
      total_paid: totalPaid,
      total_outstanding: totalAmount - totalPaid,
    },
    invoices: list,
  };
};

// Aggregate per-class fee status (for Finance "By Class" tab)
const getClassesSummary = async (queryParams) => {
  const yearMonth = queryParams.year_month || null;
  const search = (queryParams.search || '').trim();

  let classQuery = supabase
    .from('classes')
    .select(`
      id, name, status, fee_policy, fee_amount, billing_day, sessions_per_period,
      teacher:profiles!classes_teacher_id_fkey(full_name)
    `)
    .order('created_at', { ascending: false });
  if (search) classQuery = classQuery.ilike('name', `%${search}%`);

  const { data: classes, error: clsErr } = await classQuery;
  if (clsErr) throw clsErr;

  const classIds = (classes || []).map(c => c.id);
  if (classIds.length === 0) return [];

  // Enrollment counts
  const { data: enrollments, error: enrErr } = await supabase
    .from('class_students')
    .select('class_id, student_id')
    .in('class_id', classIds);
  if (enrErr) throw enrErr;
  const enrollByClass = {};
  for (const e of (enrollments || [])) {
    (enrollByClass[e.class_id] ||= new Set()).add(e.student_id);
  }

  // Invoices for these classes (optionally filtered by period)
  let invQuery = supabase
    .from('tuition_invoices')
    .select('id, class_id, student_id, total, paid_amount, balance, status, period_start, period_end, due_date')
    .in('class_id', classIds)
    .neq('status', 'cancelled');
  if (yearMonth && /^\d{4}-\d{2}$/.test(yearMonth)) {
    const { period_start, period_end } = monthRange(yearMonth);
    invQuery = invQuery.gte('period_start', period_start).lte('period_end', period_end);
  }
  const { data: invoices, error: invErr } = await invQuery;
  if (invErr) throw invErr;

  const today = new Date().toISOString().slice(0, 10);
  const invByClassStudent = {};
  const byClass = {};
  for (const inv of (invoices || [])) {
    const studentKey = `${inv.class_id}:${inv.student_id}`;
    (invByClassStudent[studentKey] ||= []).push(inv);

    const slot = (byClass[inv.class_id] ||= {
      total_amount: 0,
      total_paid: 0,
      total_outstanding: 0,
      invoice_count: 0,
      overdue_count: 0,
    });
    slot.invoice_count += 1;
    slot.total_amount += Number(inv.total) || 0;
    slot.total_paid += Number(inv.paid_amount) || 0;
    slot.total_outstanding += Number(inv.balance) || 0;
    if (Number(inv.balance) > 0 && inv.due_date && inv.due_date < today) {
      slot.overdue_count += 1;
    }
  }

  return classes.map(c => {
    const slot = byClass[c.id] || {
      total_amount: 0, total_paid: 0, total_outstanding: 0,
      invoice_count: 0, overdue_count: 0,
    };
    const enrolledSet = enrollByClass[c.id] || new Set();
    const enrolled = enrolledSet.size;
    const invoicesByStudent = {};
    for (const studentId of enrolledSet) {
      invoicesByStudent[studentId] = invByClassStudent[`${c.id}:${studentId}`] || [];
    }
    const statusCounts = countStudentsByFeeStatus(enrolledSet, invoicesByStudent);

    return {
      id: c.id,
      name: c.name,
      status: c.status,
      fee_policy: c.fee_policy,
      fee_amount: Number(c.fee_amount || 0),
      billing_day: c.billing_day,
      sessions_per_period: c.sessions_per_period,
      teacher_name: c.teacher?.full_name || null,
      enrolled_count: enrolled,
      invoice_count: slot.invoice_count,
      paid_count: statusCounts.paid,
      partial_count: statusCounts.partial,
      unpaid_count: statusCounts.unpaid,
      no_invoice_count: statusCounts.no_invoice,
      overdue_count: slot.overdue_count,
      total_amount: slot.total_amount,
      total_paid: slot.total_paid,
      total_outstanding: slot.total_outstanding,
    };
  });
};

// Per-student fee status within a single class (for the "By Class" drill-down)
const getClassStudentsFeeStatus = async (classId, queryParams) => {
  const yearMonth = queryParams.year_month || null;

  const { data: enrollments, error: enrErr } = await supabase
    .from('class_students')
    .select(`
      student_id,
      student:profiles!class_students_student_id_fkey(id, full_name, email, phone)
    `)
    .eq('class_id', classId);
  if (enrErr) throw enrErr;

  let invQuery = supabase
    .from('tuition_invoices')
    .select('id, student_id, total, paid_amount, balance, status, period_start, period_end, due_date, invoice_no')
    .eq('class_id', classId)
    .neq('status', 'cancelled');
  if (yearMonth && /^\d{4}-\d{2}$/.test(yearMonth)) {
    const { period_start, period_end } = monthRange(yearMonth);
    invQuery = invQuery.gte('period_start', period_start).lte('period_end', period_end);
  }
  const { data: invoices, error: invErr } = await invQuery;
  if (invErr) throw invErr;

  const byStudent = {};
  for (const inv of (invoices || [])) {
    const slot = (byStudent[inv.student_id] ||= {
      total: 0, paid: 0, balance: 0, invoices: [],
    });
    slot.total += Number(inv.total) || 0;
    slot.paid += Number(inv.paid_amount) || 0;
    slot.balance += Number(inv.balance) || 0;
    slot.invoices.push(inv);
  }

  return (enrollments || []).map(e => {
    const s = byStudent[e.student_id] || { total: 0, paid: 0, balance: 0, invoices: [] };
    return {
      student_id: e.student_id,
      student_name: e.student?.full_name || null,
      student_email: e.student?.email || null,
      student_phone: e.student?.phone || null,
      invoice_count: s.invoices.length,
      total: s.total,
      paid: s.paid,
      balance: s.balance,
      status: s.invoices.length === 0
        ? 'no_invoice'
        : s.balance <= 0
          ? 'paid'
          : s.paid > 0 ? 'partial' : 'unpaid',
      invoices: s.invoices,
    };
  });
};

function maxDateStr(a, b) {
  const sa = a ? String(a).slice(0, 10) : null;
  const sb = b ? String(b).slice(0, 10) : null;
  if (!sa) return sb;
  if (!sb) return sa;
  return sa >= sb ? sa : sb;
}

function todayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Ngày cuối kỳ tính phí “cả khóa”: ngày kết thúc lớp hoặc hôm nay nếu chưa có kết thúc */
function periodEndThroughCourse(cls) {
  const t = todayDateStr();
  return cls.end_date ? String(cls.end_date).slice(0, 10) : t;
}

/** Ngày cuối kỳ “đến nay”: min(hôm nay, ngày kết thúc lớp nếu có) */
function periodEndThroughToday(cls) {
  const t = todayDateStr();
  if (!cls.end_date) return t;
  const e = String(cls.end_date).slice(0, 10);
  return e < t ? e : t;
}

async function fetchClassSchedules(classId) {
  const { data, error } = await supabase
    .from('schedules')
    .select('id, day_of_week, start_time, end_time, start_date, end_date, is_active')
    .eq('class_id', classId)
    .eq('is_active', true);
  if (error) throw error;
  return data || [];
}

/**
 * Dự kiến học phí theo kỳ [nhập học → periodEndDate] (đồng bộ logic sinh HĐ).
 * schedules: TKB lớp — dùng để đếm buổi thực tế khi fee_policy = per_session.
 */
function projectedFeeForPeriod(cls, enrollmentDateStr, periodEndDateStr, schedules = null) {
  const fee = Number(cls.fee_amount || 0);
  if (!cls.fee_policy || fee <= 0) return { amount: 0, months: null, sessionsFactor: null };

  const enroll = enrollmentDateStr ? String(enrollmentDateStr).slice(0, 10) : periodEndDateStr;
  const startBound = maxDateStr(enroll, cls.start_date);
  const endBound = String(periodEndDateStr).slice(0, 10);

  if (startBound > endBound) {
    return { amount: 0, months: null, sessionsFactor: null };
  }

  if (cls.fee_policy === 'per_class') {
    return { amount: fee, months: null, sessionsFactor: null };
  }

  const months = countInclusiveCalendarMonths(startBound, endBound);
  const m = months === null ? 0 : months;

  if (cls.fee_policy === 'monthly') {
    return { amount: m * fee, months: m, sessionsFactor: null };
  }

  if (cls.fee_policy === 'per_session') {
    const activeSchedules = (schedules || []).filter((s) => s.is_active !== false);
    let sessionsFactor;
    if (activeSchedules.length > 0) {
      sessionsFactor = countScheduledSessions(cls, activeSchedules, startBound, endBound);
    } else {
      const sessionsPerMonth = Number(cls.sessions_per_period || 0);
      sessionsFactor = m * sessionsPerMonth;
    }
    return { amount: sessionsFactor * fee, months: m, sessionsFactor };
  }

  return { amount: 0, months: null, sessionsFactor: null };
}

/** Dự kiến phí một học sinh cho một kỳ tháng (YYYY-MM). */
function projectedFeeForBillingPeriod(cls, enrollmentDateStr, periodStart, periodEnd, schedules = null) {
  const fee = Number(cls.fee_amount || 0);
  if (!cls.fee_policy || fee <= 0) return 0;

  const enroll = enrollmentDateStr ? String(enrollmentDateStr).slice(0, 10) : periodEnd;
  const startBound = maxDateStr(enroll, cls.start_date);
  if (startBound > periodEnd) return 0;

  if (cls.fee_policy === 'per_class') {
    return startBound <= periodEnd ? fee : 0;
  }

  if (cls.fee_policy === 'monthly') {
    const billStart = schedMaxDateStr(startBound, periodStart);
    if (billStart > periodEnd) return 0;
    return fee;
  }

  if (cls.fee_policy === 'per_session') {
    const billStart = schedMaxDateStr(startBound, periodStart);
    if (billStart > periodEnd) return 0;
    const activeSchedules = (schedules || []).filter((s) => s.is_active !== false);
    const sessions = activeSchedules.length > 0
      ? countScheduledSessions(cls, activeSchedules, billStart, periodEnd)
      : Number(cls.sessions_per_period || 0);
    return sessions * fee;
  }

  return 0;
}

function periodPaymentStatus(expected, invoiced, paid, balance) {
  if (expected <= 0 && invoiced <= 0) return 'none';
  if (balance <= 0 && paid > 0) return 'paid';
  if (paid > 0 && balance > 0) return 'partial';
  if (invoiced > 0 && paid <= 0) return 'unpaid';
  if (expected > 0 && invoiced <= 0) return 'no_invoice';
  return 'unpaid';
}

function buildClassBillingPeriods(cls, schedules, enrollments, invoices) {
  const courseStart = cls.start_date ? String(cls.start_date).slice(0, 10) : null;
  const courseEnd = cls.end_date ? String(cls.end_date).slice(0, 10) : todayDateStr();
  if (!courseStart) return [];

  const invList = (invoices || []).filter((i) => i.status !== 'cancelled');

  if (cls.fee_policy === 'per_class') {
    let expected = 0;
    for (const row of enrollments || []) {
      expected += projectedFeeForBillingPeriod(cls, row.enrollment_date, courseStart, courseEnd, schedules);
    }
    let invoiced = 0;
    let paid = 0;
    let balance = 0;
    for (const inv of invList) {
      invoiced += Number(inv.total) || 0;
      paid += Number(inv.paid_amount) || 0;
      balance += Number(inv.balance) || 0;
    }
    const sessionCount = countScheduledSessions(cls, schedules, courseStart, courseEnd);
    return [{
      year_month: null,
      label: 'Trọn khóa',
      period_start: courseStart,
      period_end: courseEnd,
      session_count: sessionCount,
      expected_total: Math.round(expected * 100) / 100,
      invoiced_total: Math.round(invoiced * 100) / 100,
      paid_total: Math.round(paid * 100) / 100,
      balance_total: Math.round(balance * 100) / 100,
      status: periodPaymentStatus(expected, invoiced, paid, balance),
    }];
  }

  const monthPeriods = buildCalendarMonthPeriods(courseStart, courseEnd);
  const sessionsByMonth = sessionsCountByMonth(cls, schedules, courseStart, courseEnd);

  return monthPeriods.map((p) => {
    let expected = 0;
    for (const row of enrollments || []) {
      expected += projectedFeeForBillingPeriod(
        cls, row.enrollment_date, p.period_start, p.period_end, schedules,
      );
    }

    let invoiced = 0;
    let paid = 0;
    let balance = 0;
    for (const inv of invList) {
      if (!invoiceOverlapsPeriod(inv, p.period_start, p.period_end)) continue;
      invoiced += Number(inv.total) || 0;
      paid += Number(inv.paid_amount) || 0;
      balance += Number(inv.balance) || 0;
    }

    const sessionCount = sessionsByMonth[p.year_month] || 0;

    return {
      year_month: p.year_month,
      label: p.label,
      period_start: p.period_start,
      period_end: p.period_end,
      session_count: sessionCount,
      expected_total: Math.round(expected * 100) / 100,
      invoiced_total: Math.round(invoiced * 100) / 100,
      paid_total: Math.round(paid * 100) / 100,
      balance_total: Math.round(balance * 100) / 100,
      status: periodPaymentStatus(expected, invoiced, paid, balance),
    };
  });
}

/**
 * Tổng dự kiến thu vs tổng trên HĐ / đã thu / còn nợ (theo hóa đơn lớp).
 */
const getClassFeeProjection = async (classId, currentUser) => {
  const { data: cls, error: cErr } = await supabase
    .from('classes')
    .select('id, name, teacher_id, fee_policy, fee_amount, sessions_per_period, start_date, end_date, billing_day')
    .eq('id', classId)
    .single();

  if (cErr) {
    if (cErr.code === 'PGRST116') return null;
    throw cErr;
  }
  if (!cls) return null;

  if (currentUser.role !== 'admin' && cls.teacher_id !== currentUser.id) {
    throw { statusCode: 403, message: 'Không có quyền xem thống kê học phí lớp này' };
  }

  const schedules = await fetchClassSchedules(classId);
  const endCourse = periodEndThroughCourse(cls);
  const endToday = periodEndThroughToday(cls);
  const courseStart = cls.start_date ? String(cls.start_date).slice(0, 10) : null;
  const courseEnd = cls.end_date ? String(cls.end_date).slice(0, 10) : null;

  const totalSessionsCourse = courseStart && endCourse
    ? countScheduledSessions(cls, schedules, courseStart, endCourse)
    : 0;
  const totalSessionsToToday = courseStart && endToday
    ? countScheduledSessions(cls, schedules, courseStart, endToday)
    : 0;
  const sessionsByMonth = courseStart && endCourse
    ? sessionsCountByMonth(cls, schedules, courseStart, endCourse)
    : {};
  const uniqueDays = new Set(
    (schedules || []).filter((s) => s.is_active !== false).map((s) => Number(s.day_of_week)),
  );

  const { data: enrollRows, error: eErr } = await supabase
    .from('class_students')
    .select(`
      student_id,
      enrollment_date,
      profiles!class_students_student_id_fkey(full_name)
    `)
    .eq('class_id', classId);
  if (eErr) throw eErr;

  const enrollments = enrollRows || [];
  let expectedCourse = 0;
  let expectedToToday = 0;
  const studentBreakdown = [];

  for (const row of enrollments) {
    const full = projectedFeeForPeriod(cls, row.enrollment_date, endCourse, schedules);
    const todt = projectedFeeForPeriod(cls, row.enrollment_date, endToday, schedules);
    expectedCourse += full.amount;
    expectedToToday += todt.amount;

    studentBreakdown.push({
      student_id: row.student_id,
      student_name: row.profiles?.full_name || null,
      enrollment_date: row.enrollment_date,
      months_full_course: full.months,
      months_to_today: todt.months,
      sessions_full_course: full.sessionsFactor,
      sessions_to_today: todt.sessionsFactor,
      expected_full_course: Math.round(full.amount * 100) / 100,
      expected_to_today: Math.round(todt.amount * 100) / 100,
    });
  }

  const { data: invoices, error: iErr } = await supabase
    .from('tuition_invoices')
    .select('student_id, total, paid_amount, balance, status, period_start, period_end, invoice_no')
    .eq('class_id', classId)
    .neq('status', 'cancelled');
  if (iErr) throw iErr;

  const billingPeriods = buildClassBillingPeriods(cls, schedules, enrollments, invoices || []);

  const byStudentMoney = {};
  const invoicesByStudent = {};
  let invoiceSumTotal = 0;
  let collectedSum = 0;
  let outstandingSum = 0;
  for (const inv of invoices || []) {
    invoiceSumTotal += Number(inv.total) || 0;
    collectedSum += Number(inv.paid_amount) || 0;
    outstandingSum += Number(inv.balance) || 0;
    const sid = inv.student_id;
    (invoicesByStudent[sid] ||= []).push(inv);
    if (!byStudentMoney[sid]) {
      byStudentMoney[sid] = { invoiced: 0, paid: 0, balance: 0 };
    }
    byStudentMoney[sid].invoiced += Number(inv.total) || 0;
    byStudentMoney[sid].paid += Number(inv.paid_amount) || 0;
    byStudentMoney[sid].balance += Number(inv.balance) || 0;
  }

  const enrolledIds = enrollments.map((r) => r.student_id);
  const collectionStats = countStudentsByFeeStatus(enrolledIds, invoicesByStudent);

  for (const row of studentBreakdown) {
    const m = byStudentMoney[row.student_id] || { invoiced: 0, paid: 0, balance: 0 };
    const invs = invoicesByStudent[row.student_id] || [];
    const agg = aggregateStudentInvoices(invs);
    row.invoiced_total = Math.round(m.invoiced * 100) / 100;
    row.paid_total = Math.round(m.paid * 100) / 100;
    row.balance_total = Math.round(m.balance * 100) / 100;
    row.payment_status = studentFeeStatusFromAgg(agg);
    row.gap_expected_to_today_minus_paid = Math.round((row.expected_to_today - m.paid) * 100) / 100;
  }

  const today = todayDateStr();
  const gapCourseVsCollected = expectedCourse - collectedSum;
  const gapToTodayVsCollected = expectedToToday - collectedSum;

  const policyHint = (() => {
    const p = cls.fee_policy;
    if (!p) return 'Chưa cấu hình chế độ phí.';
    if (p === 'per_class') return 'Trọn gói: mỗi học sinh một khoản (tính khi đã trong kỳ).';
    if (p === 'monthly') {
      return `Theo tháng: số tháng lịch từ max(ngày nhập học, ngày bắt đầu lớp) đến ngày chốt kỳ × đơn giá tháng. “Đến nay” = đến ${endToday}. “Cả khóa” = đến ${endCourse}.`;
    }
    if (p === 'per_session') {
      const src = schedules.length > 0 ? 'theo lịch TKB' : `theo cấu hình ${cls.sessions_per_period || 0} buổi/tháng`;
      return `Theo buổi (${src}): tổng ${totalSessionsCourse} buổi cả khóa, ${totalSessionsToToday} buổi đến nay × đơn giá/buổi.`;
    }
    return '';
  })();

  // Lịch tuần chỉ bắt buộc khi tính theo buổi; phí tháng / trọn gói không chặn checklist.
  const scheduleRequired = cls.fee_policy === 'per_session';
  const setupSteps = [
    {
      step: 1,
      key: 'dates',
      label: 'Đặt thời gian lớp',
      done: !!(cls.start_date && cls.end_date),
      optional: false,
      hint: cls.start_date && cls.end_date
        ? `${String(cls.start_date).slice(0, 10)} → ${String(cls.end_date).slice(0, 10)}`
        : 'Cần ngày bắt đầu và kết thúc',
    },
    {
      step: 2,
      key: 'schedule',
      label: scheduleRequired ? 'Tạo lịch học trong tuần' : 'Tạo lịch học trong tuần (tuỳ chọn)',
      done: schedules.length > 0 || !scheduleRequired,
      optional: !scheduleRequired,
      hint: schedules.length > 0
        ? `${schedules.length} ca · ${totalSessionsCourse} buổi cả khóa`
        : scheduleRequired
          ? 'Vào mục Thời khóa biểu để thêm các buổi học trong tuần'
          : 'Không bắt buộc với phí theo tháng / trọn gói',
    },
    {
      step: 3,
      key: 'fee',
      label: 'Cấu hình học phí',
      done: !!(cls.fee_policy && Number(cls.fee_amount) > 0),
      optional: false,
      hint: cls.fee_policy
        ? `${cls.fee_policy === 'monthly' ? 'Theo tháng' : cls.fee_policy === 'per_session' ? 'Theo buổi' : 'Trọn gói'} · ${Number(cls.fee_amount || 0).toLocaleString('vi-VN')}đ`
        : 'Chọn cách tính phí và đơn giá',
    },
    {
      step: 4,
      key: 'students',
      label: 'Thêm học sinh',
      done: enrollments.length > 0,
      optional: false,
      hint: enrollments.length > 0 ? `${enrollments.length} học sinh` : 'Thêm học sinh vào lớp',
    },
  ];

  const invoiceCount = (invoices || []).length;

  return {
    class_id: cls.id,
    name: cls.name,
    fee_policy: cls.fee_policy,
    fee_amount: Number(cls.fee_amount || 0),
    billing_day: cls.billing_day,
    sessions_per_period: cls.sessions_per_period,
    start_date: cls.start_date,
    end_date: cls.end_date,
    period_end_course: endCourse,
    period_end_to_today: endToday,
    projection_end_date: cls.end_date ? String(cls.end_date).slice(0, 10) : todayDateStr(),
    projected_without_official_end: !cls.end_date,
    setup_checklist: setupSteps,
    setup_complete: setupSteps.every((s) => s.done),
    invoice_count: invoiceCount,
    has_invoices: invoiceCount > 0,
    simple_summary: {
      total_sessions: totalSessionsCourse,
      expected_course: Math.round(expectedCourse * 100) / 100,
      collected: Math.round(collectedSum * 100) / 100,
      outstanding: Math.round(outstandingSum * 100) / 100,
      student_count: enrollments.length,
      invoice_count: invoiceCount,
    },
    schedule_summary: {
      schedule_count: schedules.length,
      days_per_week: uniqueDays.size,
      total_sessions_course: totalSessionsCourse,
      total_sessions_to_today: totalSessionsToToday,
      sessions_by_month: sessionsByMonth,
      has_schedule: schedules.length > 0,
    },
    billing_periods: billingPeriods,
    enrolled_count: enrollments.length,
    expected_total: Math.round(expectedCourse * 100) / 100,
    expected_total_course: Math.round(expectedCourse * 100) / 100,
    expected_total_to_today: Math.round(expectedToToday * 100) / 100,
    invoice_total: Math.round(invoiceSumTotal * 100) / 100,
    collected_total: Math.round(collectedSum * 100) / 100,
    outstanding_total: Math.round(outstandingSum * 100) / 100,
    gap_expected_minus_collected: Math.round(gapCourseVsCollected * 100) / 100,
    gap_course_minus_collected: Math.round(gapCourseVsCollected * 100) / 100,
    gap_to_today_minus_collected: Math.round(gapToTodayVsCollected * 100) / 100,
    policy_hint: policyHint,
    collection_stats: {
      paid_count: collectionStats.paid,
      partial_count: collectionStats.partial,
      unpaid_count: collectionStats.unpaid,
      no_invoice_count: collectionStats.no_invoice,
    },
    students: studentBreakdown,
  };
};

module.exports = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  removeInvoice,
  generateInvoicesForClass,
  generateMonthlyInvoices,
  recordPayment,
  removePayment,
  getReceivablesReport,
  getStudentsReceivables,
  getRevenueReport,
  getStudentLedger,
  getClassesSummary,
  getClassStudentsFeeStatus,
  getClassFeeProjection,
};
