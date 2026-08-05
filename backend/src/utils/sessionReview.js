/** Hạn ghi nhận xét / điểm danh sau khi buổi học kết thúc (giờ). */
const REVIEW_DEADLINE_HOURS = 12;

const parseTime = (t) => {
  if (!t) return null;
  const s = String(t).slice(0, 8);
  const [h, m, sec] = s.split(':').map(Number);
  return { h: h || 0, m: m || 0, sec: sec || 0 };
};

/** Thời điểm kết thúc buổi (local wall clock trên session_date). */
const getSessionEndAt = (session) => {
  const [y, mo, d] = String(session.session_date).slice(0, 10).split('-').map(Number);
  const end = parseTime(session.end_time);
  const start = parseTime(session.start_time);
  const t = end || start;
  if (!t) {
    const dt = new Date(y, mo - 1, d, 23, 59, 0, 0);
    return dt;
  }
  let { h, m } = t;
  if (!end && start) {
    h = Math.min(23, start.h + 2);
    m = start.m;
  }
  return new Date(y, mo - 1, d, h, m, 0, 0);
};

const getReviewDeadlineAt = (session) => {
  const end = getSessionEndAt(session);
  return new Date(end.getTime() + REVIEW_DEADLINE_HOURS * 60 * 60 * 1000);
};

const getReviewEditMeta = (session, user) => {
  const deadline = getReviewDeadlineAt(session);
  const now = new Date();
  const canEdit = user?.role === 'admin' || now <= deadline;
  const msLeft = deadline.getTime() - now.getTime();
  return {
    can_edit: canEdit,
    deadline_at: deadline.toISOString(),
    session_end_at: getSessionEndAt(session).toISOString(),
    hours_remaining: canEdit ? Math.max(0, Math.round((msLeft / 3600000) * 10) / 10) : 0,
    deadline_hours: REVIEW_DEADLINE_HOURS,
  };
};

const assertCanEditSessionRecord = (session, user) => {
  const meta = getReviewEditMeta(session, user);
  if (!meta.can_edit) {
    const err = new Error(
      `Đã quá ${REVIEW_DEADLINE_HOURS} giờ sau buổi học. Không thể cập nhật điểm danh hoặc nhận xét.`
    );
    err.statusCode = 403;
    throw err;
  }
  return meta;
};

module.exports = {
  REVIEW_DEADLINE_HOURS,
  getSessionEndAt,
  getReviewDeadlineAt,
  getReviewEditMeta,
  assertCanEditSessionRecord,
};
