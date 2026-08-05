function parseLocalDate(dateStr) {
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatLocalDate(d) {
  const x = d instanceof Date ? d : parseLocalDate(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

function isSlotActiveOnDate(slot, classInfo, dateStr) {
  const jsDay = parseLocalDate(dateStr).getDay();
  if (Number(slot.day_of_week) !== jsDay) return false;

  const slotStart = slot.start_date ? String(slot.start_date).slice(0, 10) : null;
  const slotEnd = slot.end_date ? String(slot.end_date).slice(0, 10) : null;
  const classStart = classInfo?.start_date ? String(classInfo.start_date).slice(0, 10) : null;
  const classEnd = classInfo?.end_date ? String(classInfo.end_date).slice(0, 10) : null;

  if (slotStart && dateStr < slotStart) return false;
  if (slotEnd && dateStr > slotEnd) return false;
  if (classStart && dateStr < classStart) return false;
  if (classEnd && dateStr > classEnd) return false;
  return true;
}

/** Đếm số buổi học theo lịch TKB trong khoảng [fromDate, toDate]. */
function countScheduledSessions(classInfo, schedules, fromDate, toDate) {
  if (!fromDate || !toDate || toDate < fromDate) return 0;
  const activeSchedules = (schedules || []).filter((s) => s.is_active !== false);
  if (activeSchedules.length === 0) return 0;

  let count = 0;
  for (let d = parseLocalDate(fromDate); ; d.setDate(d.getDate() + 1)) {
    const dateStr = formatLocalDate(d);
    if (dateStr > toDate) break;
    for (const sch of activeSchedules) {
      if (isSlotActiveOnDate(sch, classInfo, dateStr)) count += 1;
    }
  }
  return count;
}

/** Danh sách buổi học theo lịch: { session_date, day_of_week, schedule_id } */
function listScheduledSessions(classInfo, schedules, fromDate, toDate) {
  if (!fromDate || !toDate || toDate < fromDate) return [];
  const activeSchedules = (schedules || []).filter((s) => s.is_active !== false);
  if (activeSchedules.length === 0) return [];

  const sessions = [];
  for (let d = parseLocalDate(fromDate); ; d.setDate(d.getDate() + 1)) {
    const dateStr = formatLocalDate(d);
    if (dateStr > toDate) break;
    for (const sch of activeSchedules) {
      if (isSlotActiveOnDate(sch, classInfo, dateStr)) {
        sessions.push({
          session_date: dateStr,
          day_of_week: sch.day_of_week,
          schedule_id: sch.id,
        });
      }
    }
  }
  return sessions;
}

function monthRange(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0));
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { period_start: fmt(start), period_end: fmt(end) };
}

/** Các kỳ tháng lịch từ fromDate đến toDate (cả tháng đầu và cuối). */
function buildCalendarMonthPeriods(fromDateStr, toDateStr) {
  if (!fromDateStr || !toDateStr) return [];
  const from = String(fromDateStr).slice(0, 10);
  const to = String(toDateStr).slice(0, 10);
  if (to < from) return [];

  const periods = [];
  const [y1, m1] = from.split('-').map(Number);
  const [y2, m2] = to.split('-').map(Number);
  let y = y1;
  let m = m1;

  while (y < y2 || (y === y2 && m <= m2)) {
    const ym = `${y}-${String(m).padStart(2, '0')}`;
    const { period_start, period_end } = monthRange(ym);
    const effStart = period_start < from ? from : period_start;
    const effEnd = period_end > to ? to : period_end;
    periods.push({
      year_month: ym,
      label: `Tháng ${m}/${y}`,
      period_start: effStart,
      period_end: effEnd,
    });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return periods;
}

/** Gom số buổi theo tháng (YYYY-MM). */
function sessionsCountByMonth(classInfo, schedules, fromDate, toDate) {
  const sessions = listScheduledSessions(classInfo, schedules, fromDate, toDate);
  const byMonth = {};
  for (const s of sessions) {
    const ym = s.session_date.slice(0, 7);
    byMonth[ym] = (byMonth[ym] || 0) + 1;
  }
  return byMonth;
}

function maxDateStr(a, b) {
  const sa = a ? String(a).slice(0, 10) : null;
  const sb = b ? String(b).slice(0, 10) : null;
  if (!sa) return sb;
  if (!sb) return sa;
  return sa >= sb ? sa : sb;
}

function minDateStr(a, b) {
  const sa = a ? String(a).slice(0, 10) : null;
  const sb = b ? String(b).slice(0, 10) : null;
  if (!sa) return sb;
  if (!sb) return sa;
  return sa <= sb ? sa : sb;
}

/** Hóa đơn thuộc kỳ nếu period_start/period_end giao với kỳ billing. */
function invoiceOverlapsPeriod(invoice, periodStart, periodEnd) {
  const invStart = invoice.period_start ? String(invoice.period_start).slice(0, 10) : null;
  const invEnd = invoice.period_end ? String(invoice.period_end).slice(0, 10) : invStart;
  if (!invStart) return false;
  return invStart <= periodEnd && invEnd >= periodStart;
}

module.exports = {
  formatLocalDate,
  isSlotActiveOnDate,
  countScheduledSessions,
  listScheduledSessions,
  buildCalendarMonthPeriods,
  sessionsCountByMonth,
  monthRange,
  maxDateStr,
  minDateStr,
  invoiceOverlapsPeriod,
};
