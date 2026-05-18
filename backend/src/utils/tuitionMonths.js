/**
 * Số tháng lịch (cả tháng đầu và cuối) từ tháng chứa enrollment_date đến tháng chứa classEndDate.
 * Dùng để ước lượng tháng đóng học phí đến khi lớp kết thúc (monthly).
 */
function countInclusiveCalendarMonths(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return null;
  const s = String(startDateStr).slice(0, 10);
  const e = String(endDateStr).slice(0, 10);
  if (e < s) return 0;
  const [y1, m1] = s.split('-').map(Number);
  const [y2, m2] = e.split('-').map(Number);
  if ([y1, m1, y2, m2].some((x) => Number.isNaN(x))) return null;
  return (y2 - y1) * 12 + (m2 - m1) + 1;
}

module.exports = { countInclusiveCalendarMonths };
