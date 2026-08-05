const { supabase } = require('../config/database');
const { loadProfilesByIds } = require('../utils/enrichClassRows');

const syncPayEntryForSession = async (sessionId, createdBy) => {
  const { data: session, error: sErr } = await supabase
    .from('class_sessions')
    .select('id, class_id, session_date, status')
    .eq('id', sessionId)
    .single();
  if (sErr) throw sErr;
  if (!session || session.status !== 'completed') return null;

  const { data: cls, error: cErr } = await supabase
    .from('classes')
    .select('id, name, teacher_id, teacher_pay_policy, teacher_pay_amount')
    .eq('id', session.class_id)
    .single();
  if (cErr) throw cErr;
  if (!cls?.teacher_id || cls.teacher_pay_policy !== 'per_session') return null;
  const amount = Number(cls.teacher_pay_amount || 0);
  if (amount <= 0) return null;

  const { data: teacherAtt, error: attErr } = await supabase
    .from('attendance_records')
    .select('status')
    .eq('session_id', sessionId)
    .eq('profile_id', cls.teacher_id)
    .eq('role', 'teacher')
    .maybeSingle();
  if (attErr) throw attErr;

  const present = teacherAtt && ['present', 'late'].includes(teacherAtt.status);
  if (!present) return null;

  const { data: existing } = await supabase
    .from('teacher_pay_entries')
    .select('id')
    .eq('session_id', sessionId)
    .neq('status', 'cancelled')
    .maybeSingle();

  if (existing) return existing;

  const desc = `Dạy buổi ${session.session_date} — ${cls.name}`;
  const { data: row, error } = await supabase
    .from('teacher_pay_entries')
    .insert({
      teacher_id: cls.teacher_id,
      class_id: cls.id,
      session_id: sessionId,
      pay_policy: 'per_session',
      amount,
      description: desc,
      period_start: session.session_date,
      period_end: session.session_date,
      status: 'pending',
      created_by: createdBy,
    })
    .select()
    .single();
  if (error) throw error;
  return row;
};

const listEntries = async (queryParams) => {
  const teacherId = queryParams.teacher_id || null;
  const classId = queryParams.class_id || null;
  const status = queryParams.status || null;
  const from = queryParams.from || null;
  const to = queryParams.to || null;

  let query = supabase
    .from('teacher_pay_entries')
    .select('*')
    .order('created_at', { ascending: false });

  if (teacherId) query = query.eq('teacher_id', teacherId);
  if (classId) query = query.eq('class_id', classId);
  if (status) query = query.eq('status', status);
  if (from) query = query.gte('period_start', from);
  if (to) query = query.lte('period_end', to);

  const { data, error } = await query.limit(500);
  if (error) throw error;

  const rows = data || [];
  if (!rows.length) return [];

  const teacherMap = await loadProfilesByIds(rows.map((r) => r.teacher_id));
  const classIds = [...new Set(rows.map((r) => r.class_id).filter(Boolean))];
  const sessionIds = [...new Set(rows.map((r) => r.session_id).filter(Boolean))];

  const classMap = new Map();
  if (classIds.length) {
    const { data: classes, error: cErr } = await supabase
      .from('classes')
      .select('id, name')
      .in('id', classIds);
    if (cErr) throw cErr;
    for (const c of classes || []) classMap.set(String(c.id), c);
  }

  const sessionMap = new Map();
  if (sessionIds.length) {
    const { data: sessions, error: sErr } = await supabase
      .from('class_sessions')
      .select('id, session_date')
      .in('id', sessionIds);
    if (sErr) throw sErr;
    for (const s of sessions || []) sessionMap.set(String(s.id), s);
  }

  return rows.map((row) => ({
    ...row,
    teacher_name: teacherMap.get(String(row.teacher_id))?.full_name || null,
    class_name: classMap.get(String(row.class_id))?.name || null,
    session_date: row.session_id
      ? sessionMap.get(String(row.session_id))?.session_date || null
      : null,
  }));
};

const getTeacherSummary = async (teacherId, queryParams) => {
  const from = queryParams.from || null;
  const to = queryParams.to || null;

  const { data: classes, error: clsErr } = await supabase
    .from('classes')
    .select('id, name, teacher_pay_policy, teacher_pay_amount, status')
    .eq('teacher_id', teacherId);
  if (clsErr) throw clsErr;

  const entries = await listEntries({
    teacher_id: teacherId,
    from,
    to,
  });

  let pendingTotal = 0;
  let paidTotal = 0;
  const byClass = {};

  for (const e of entries) {
    const amt = Number(e.amount) || 0;
    if (e.status === 'pending') pendingTotal += amt;
    if (e.status === 'paid') paidTotal += amt;
    const slot = (byClass[e.class_id] ||= {
      class_id: e.class_id,
      class_name: e.class_name,
      pending: 0,
      paid: 0,
      entry_count: 0,
    });
    slot.entry_count += 1;
    if (e.status === 'pending') slot.pending += amt;
    if (e.status === 'paid') slot.paid += amt;
  }

  let sessionQuery = supabase
    .from('class_sessions')
    .select('id, class_id, session_date, status')
    .in('class_id', (classes || []).map((c) => c.id))
    .eq('status', 'completed');
  if (from) sessionQuery = sessionQuery.gte('session_date', from);
  if (to) sessionQuery = sessionQuery.lte('session_date', to);
  const { data: sessions, error: sessErr } = await sessionQuery;
  if (sessErr) throw sessErr;

  const classMap = Object.fromEntries((classes || []).map((c) => [c.id, c]));

  return {
    teacher_id: teacherId,
    classes: (classes || []).map((c) => ({
      ...c,
      teacher_pay_amount: Number(c.teacher_pay_amount || 0),
      pending: byClass[c.id]?.pending || 0,
      paid: byClass[c.id]?.paid || 0,
    })),
    summary: {
      pending_total: Math.round(pendingTotal * 100) / 100,
      paid_total: Math.round(paidTotal * 100) / 100,
      completed_sessions: (sessions || []).length,
      pending_entries: entries.filter((e) => e.status === 'pending').length,
    },
    entries,
    classMap,
  };
};

const generateEntries = async (queryParams, userId) => {
  const teacherId = queryParams.teacher_id || null;
  const classId = queryParams.class_id || null;
  const from = queryParams.from;
  const to = queryParams.to;
  if (!from || !to) throw new Error('from và to là bắt buộc');

  let classQuery = supabase
    .from('classes')
    .select('id, name, teacher_id, teacher_pay_policy, teacher_pay_amount')
    .neq('teacher_pay_policy', 'none')
    .gt('teacher_pay_amount', 0);

  if (teacherId) classQuery = classQuery.eq('teacher_id', teacherId);
  if (classId) classQuery = classQuery.eq('id', classId);

  const { data: classes, error: clsErr } = await classQuery;
  if (clsErr) throw clsErr;

  let created = 0;
  let skipped = 0;

  for (const cls of classes || []) {
    if (cls.teacher_pay_policy === 'per_session') {
      let sessQuery = supabase
        .from('class_sessions')
        .select('id')
        .eq('class_id', cls.id)
        .eq('status', 'completed')
        .gte('session_date', from)
        .lte('session_date', to);

      const { data: sessions, error: sErr } = await sessQuery;
      if (sErr) throw sErr;

      for (const s of sessions || []) {
        const row = await syncPayEntryForSession(s.id, userId);
        if (row) created += 1;
        else skipped += 1;
      }
    } else if (cls.teacher_pay_policy === 'per_class') {
      const { data: existing } = await supabase
        .from('teacher_pay_entries')
        .select('id')
        .eq('class_id', cls.id)
        .eq('teacher_id', cls.teacher_id)
        .eq('pay_policy', 'per_class')
        .eq('period_start', from)
        .eq('period_end', to)
        .neq('status', 'cancelled')
        .maybeSingle();

      if (existing) {
        skipped += 1;
        continue;
      }

      const amount = Number(cls.teacher_pay_amount) || 0;
      const { error } = await supabase.from('teacher_pay_entries').insert({
        teacher_id: cls.teacher_id,
        class_id: cls.id,
        session_id: null,
        pay_policy: 'per_class',
        amount,
        description: `Lương lớp ${cls.name} (${from} → ${to})`,
        period_start: from,
        period_end: to,
        status: 'pending',
        created_by: userId,
      });
      if (error) throw error;
      created += 1;
    }
  }

  return { created, skipped, from, to };
};

const payEntry = async (entryId, payload, userId) => {
  const { data: entry, error } = await supabase
    .from('teacher_pay_entries')
    .select('*')
    .eq('id', entryId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  if (entry.status === 'paid') throw new Error('Khoản chi đã thanh toán');
  if (entry.status === 'cancelled') throw new Error('Khoản chi đã hủy');

  const amount = Number(payload.amount ?? entry.amount);
  if (!amount || amount <= 0) throw new Error('Số tiền không hợp lệ');

  const { data: financeRow, error: finErr } = await supabase
    .from('finances')
    .insert({
      type: 'expense',
      category: 'Lương giáo viên',
      amount,
      description: payload.note || entry.description || 'Chi trả giáo viên',
      reference_type: 'teacher_pay_entry',
      reference_id: entryId,
      payment_date: payload.payment_date || new Date().toISOString().slice(0, 10),
      payment_method: payload.payment_method || 'cash',
      status: 'completed',
      created_by: userId,
    })
    .select()
    .single();
  if (finErr) throw finErr;

  const { data: updated, error: upErr } = await supabase
    .from('teacher_pay_entries')
    .update({
      status: 'paid',
      amount,
      finance_id: financeRow.id,
      paid_at: payload.paid_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', entryId)
    .select()
    .single();

  if (upErr) {
    await supabase.from('finances').delete().eq('id', financeRow.id);
    throw upErr;
  }

  return { entry: updated, finance: financeRow };
};

const getFinanceOverview = async (queryParams) => {
  const from = queryParams.from || null;
  const to = queryParams.to || null;

  let tuitionQuery = supabase
    .from('tuition_payments')
    .select('amount, paid_at');
  if (from) tuitionQuery = tuitionQuery.gte('paid_at', from);
  if (to) tuitionQuery = tuitionQuery.lte('paid_at', to + 'T23:59:59');
  const { data: payments, error: payErr } = await tuitionQuery;
  if (payErr) throw payErr;

  let expenseQuery = supabase
    .from('finances')
    .select('amount, category, type')
    .eq('type', 'expense')
    .eq('status', 'completed');
  if (from) expenseQuery = expenseQuery.gte('payment_date', from);
  if (to) expenseQuery = expenseQuery.lte('payment_date', to);
  const { data: expenses, error: expErr } = await expenseQuery;
  if (expErr) throw expErr;

  const tuitionIncome = (payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const teacherPayExpense = (expenses || [])
    .filter((e) => e.category === 'Lương giáo viên')
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const otherExpense = (expenses || [])
    .filter((e) => e.category !== 'Lương giáo viên')
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const pendingEntries = await listEntries({ status: 'pending' });
  const pendingTeacherPay = pendingEntries.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  return {
    tuition_income: Math.round(tuitionIncome * 100) / 100,
    teacher_pay_expense: Math.round(teacherPayExpense * 100) / 100,
    teacher_pay_pending: Math.round(pendingTeacherPay * 100) / 100,
    other_expense: Math.round(otherExpense * 100) / 100,
    net_from_tuition: Math.round((tuitionIncome - teacherPayExpense) * 100) / 100,
  };
};

module.exports = {
  syncPayEntryForSession,
  listEntries,
  getTeacherSummary,
  generateEntries,
  payEntry,
  getFinanceOverview,
};
