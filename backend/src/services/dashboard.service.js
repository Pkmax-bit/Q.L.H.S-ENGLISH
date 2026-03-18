const { query } = require('../config/database');

const getStats = async () => {
  const results = await Promise.all([
    query('SELECT COUNT(*) as count FROM students WHERE status = $1', ['active']),
    query('SELECT COUNT(*) as count FROM teachers WHERE status = $1', ['active']),
    query('SELECT COUNT(*) as count FROM classes WHERE status = $1', ['active']),
    query('SELECT COUNT(*) as count FROM subjects WHERE is_active = true'),
    query('SELECT COUNT(*) as count FROM facilities WHERE is_active = true'),
    query('SELECT COUNT(*) as count FROM rooms'),
    query(`SELECT
             COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
             COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
           FROM finances
           WHERE payment_date >= date_trunc('month', CURRENT_DATE)
             AND payment_date < date_trunc('month', CURRENT_DATE) + interval '1 month'`),
  ]);

  return {
    active_students: parseInt(results[0].rows[0].count),
    active_teachers: parseInt(results[1].rows[0].count),
    active_classes: parseInt(results[2].rows[0].count),
    active_subjects: parseInt(results[3].rows[0].count),
    active_facilities: parseInt(results[4].rows[0].count),
    total_rooms: parseInt(results[5].rows[0].count),
    monthly_income: parseFloat(results[6].rows[0].total_income),
    monthly_expense: parseFloat(results[6].rows[0].total_expense),
    monthly_net: parseFloat(results[6].rows[0].total_income) - parseFloat(results[6].rows[0].total_expense),
  };
};

const getRecentActivity = async (limitCount = 20) => {
  const activities = [];

  const recentStudents = await query(
    `SELECT 'student_enrolled' as type, full_name as title, created_at
     FROM students ORDER BY created_at DESC LIMIT $1`,
    [Math.ceil(limitCount / 4)]
  );
  activities.push(...recentStudents.rows);

  const recentClasses = await query(
    `SELECT 'class_created' as type, name as title, created_at
     FROM classes ORDER BY created_at DESC LIMIT $1`,
    [Math.ceil(limitCount / 4)]
  );
  activities.push(...recentClasses.rows);

  const recentFinances = await query(
    `SELECT 'finance_' || type as type, description as title, created_at
     FROM finances ORDER BY created_at DESC LIMIT $1`,
    [Math.ceil(limitCount / 4)]
  );
  activities.push(...recentFinances.rows);

  const recentTeachers = await query(
    `SELECT 'teacher_added' as type, full_name as title, created_at
     FROM teachers ORDER BY created_at DESC LIMIT $1`,
    [Math.ceil(limitCount / 4)]
  );
  activities.push(...recentTeachers.rows);

  activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return activities.slice(0, limitCount);
};

module.exports = { getStats, getRecentActivity };
