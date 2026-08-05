const { supabase } = require('../config/database');
const { toDateKey, buildStreakPayload } = require('../utils/streak');

async function fetchYearRevenueChart() {
  const year = new Date().getFullYear();
  const start = `${year}-01-01`;
  const end = `${year + 1}-01-01`;

  const { data, error } = await supabase
    .from('finances')
    .select('type, amount, payment_date')
    .gte('payment_date', start)
    .lt('payment_date', end);

  if (error) throw error;

  const chart = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income: 0,
    expense: 0,
  }));

  for (const row of data || []) {
    const month = new Date(row.payment_date).getMonth();
    const amount = parseFloat(row.amount) || 0;
    if (row.type === 'income') chart[month].income += amount;
    else chart[month].expense += amount;
  }

  return chart;
}

const getStats = async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];

  const [
    studentsResult,
    teachersResult,
    classesResult,
    subjectsResult,
    facilitiesResult,
    financesMonthRes,
    pendingEnrollRes,
    revenueChart,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student').eq('is_active', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher').eq('is_active', true),
    supabase.from('classes').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('subjects').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('facilities').select('id', { count: 'exact', head: true }),
    supabase.from('finances').select('type, amount').gte('payment_date', startOfMonth).lt('payment_date', startOfNextMonth),
    supabase.from('enrollment_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    fetchYearRevenueChart(),
  ]);

  for (const r of [studentsResult, teachersResult, classesResult, subjectsResult, facilitiesResult, pendingEnrollRes]) {
    if (r.error) throw r.error;
  }
  if (financesMonthRes.error) throw financesMonthRes.error;

  let monthlyIncome = 0;
  let monthlyExpense = 0;
  for (const row of financesMonthRes.data || []) {
    const amount = parseFloat(row.amount) || 0;
    if (row.type === 'income') monthlyIncome += amount;
    else monthlyExpense += amount;
  }

  const students = studentsResult.count || 0;
  const teachers = teachersResult.count || 0;
  const classes = classesResult.count || 0;

  return {
    active_students: students,
    active_teachers: teachers,
    active_classes: classes,
    active_subjects: subjectsResult.count || 0,
    total_facilities: facilitiesResult.count || 0,
    monthly_income: monthlyIncome,
    monthly_expense: monthlyExpense,
    monthly_net: monthlyIncome - monthlyExpense,
    pending_enrollments: pendingEnrollRes.count || 0,
    // Keys cho DashboardStats component
    students,
    teachers,
    classes,
    revenue: monthlyIncome,
    revenueChart,
  };
};

const ACTIVITY_LABELS = {
  student_enrolled: (t) => `Học sinh mới: ${t}`,
  teacher_added: (t) => `Giáo viên mới: ${t}`,
  class_created: (t) => `Lớp mới: ${t}`,
  finance_income: (t) => `Thu: ${t || 'Khoản thu'}`,
  finance_expense: (t) => `Chi: ${t || 'Khoản chi'}`,
};

const getRecentActivity = async (limitCount = 20) => {
  const perTable = Math.ceil(limitCount / 3);

  const [studentsRes, classesRes, financesRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, role, created_at')
      .in('role', ['student', 'teacher'])
      .order('created_at', { ascending: false })
      .limit(perTable),
    supabase
      .from('classes')
      .select('name, created_at')
      .order('created_at', { ascending: false })
      .limit(perTable),
    supabase
      .from('finances')
      .select('type, description, created_at')
      .order('created_at', { ascending: false })
      .limit(perTable),
  ]);

  if (studentsRes.error) throw studentsRes.error;
  if (classesRes.error) throw classesRes.error;
  if (financesRes.error) throw financesRes.error;

  const activities = [];

  for (const row of studentsRes.data || []) {
    const type = row.role === 'teacher' ? 'teacher_added' : 'student_enrolled';
    activities.push({
      type,
      title: row.full_name,
      description: ACTIVITY_LABELS[type](row.full_name),
      created_at: row.created_at,
      createdAt: row.created_at,
    });
  }

  for (const row of classesRes.data || []) {
    activities.push({
      type: 'class_created',
      title: row.name,
      description: ACTIVITY_LABELS.class_created(row.name),
      created_at: row.created_at,
      createdAt: row.created_at,
    });
  }

  for (const row of financesRes.data || []) {
    const type = `finance_${row.type}`;
    const labelFn = ACTIVITY_LABELS[type] || ((t) => t);
    activities.push({
      type,
      title: row.description,
      description: labelFn(row.description),
      created_at: row.created_at,
      createdAt: row.created_at,
    });
  }

  activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return activities.slice(0, limitCount);
};

async function collectStudentActivityDates(studentId) {
  const dates = [];
  const { data: subs } = await supabase
    .from('submissions')
    .select('started_at, submitted_at, created_at')
    .eq('student_id', studentId);

  for (const s of subs || []) {
    dates.push(toDateKey(s.started_at), toDateKey(s.submitted_at), toDateKey(s.created_at));
  }

  const { data: attendance } = await supabase
    .from('attendance_records')
    .select('marked_at, created_at')
    .eq('profile_id', studentId)
    .eq('status', 'present');

  for (const a of attendance || []) {
    dates.push(toDateKey(a.marked_at), toDateKey(a.created_at));
  }

  return dates;
}

async function collectTeacherActivityDates(teacherId) {
  const dates = [];

  const { data: graded } = await supabase
    .from('submissions')
    .select('graded_at')
    .eq('graded_by', teacherId)
    .not('graded_at', 'is', null);

  for (const g of graded || []) {
    dates.push(toDateKey(g.graded_at));
  }

  const { data: reviews } = await supabase
    .from('class_sessions')
    .select('review_submitted_at, session_date, created_at')
    .eq('review_submitted_by', teacherId);

  for (const r of reviews || []) {
    dates.push(toDateKey(r.review_submitted_at), toDateKey(r.session_date), toDateKey(r.created_at));
  }

  const { data: marked } = await supabase
    .from('attendance_records')
    .select('marked_at, created_at')
    .eq('marked_by', teacherId);

  for (const m of marked || []) {
    dates.push(toDateKey(m.marked_at), toDateKey(m.created_at));
  }

  return dates;
}

/* ===== TEACHER DASHBOARD ===== */
async function getTeacherDashboard(teacherId) {
  const { data: classes, error: cErr } = await supabase
    .from('classes')
    .select('id, name, status, max_students')
    .eq('teacher_id', teacherId)
    .eq('status', 'active');
  if (cErr) throw cErr;

  const classIds = (classes || []).map((c) => c.id);

  let studentCount = 0;
  if (classIds.length > 0) {
    const { count } = await supabase
      .from('class_students')
      .select('id', { count: 'exact', head: true })
      .in('class_id', classIds);
    studentCount = count || 0;
  }

  let lessonCount = 0;
  let assignmentCount = 0;
  let pendingGrading = 0;
  if (classIds.length > 0) {
    const [lRes, aRes] = await Promise.all([
      supabase.from('lessons').select('id', { count: 'exact', head: true }).in('class_id', classIds),
      supabase.from('assignments').select('id').in('class_id', classIds),
    ]);
    lessonCount = lRes.count || 0;
    const assignmentIds = (aRes.data || []).map((a) => a.id);
    assignmentCount = assignmentIds.length;

    if (assignmentIds.length > 0) {
      const { count: pCount } = await supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .in('assignment_id', assignmentIds)
        .eq('status', 'submitted');
      pendingGrading = pCount || 0;
    }
  }

  let pendingRequests = 0;
  if (classIds.length > 0) {
    const { count } = await supabase
      .from('enrollment_requests')
      .select('id', { count: 'exact', head: true })
      .in('class_id', classIds)
      .eq('status', 'pending');
    pendingRequests = count || 0;
  }

  const activityDates = await collectTeacherActivityDates(teacherId);
  const streak = buildStreakPayload(activityDates);

  return {
    stats: {
      classes: classIds.length,
      students: studentCount,
      lessons: lessonCount,
      assignments: assignmentCount,
      pending_grading: pendingGrading,
      pending_requests: pendingRequests,
    },
    streak,
    classes: classes || [],
  };
}

/* ===== STUDENT DASHBOARD ===== */
async function getStudentDashboard(studentId) {
  const { data: enrollments, error: eErr } = await supabase
    .from('class_students')
    .select('class_id, classes(id, name, status, teacher_id, profiles!classes_teacher_id_fkey(full_name))')
    .eq('student_id', studentId);
  if (eErr) throw eErr;

  const classes = (enrollments || []).map((e) => ({
    id: e.classes?.id || e.class_id,
    name: e.classes?.name || '',
    teacher_name: e.classes?.profiles?.full_name || '',
  }));
  const classIds = classes.map((c) => c.id);

  let totalAssignments = 0;
  let todoAssignments = 0;
  let completedAssignments = 0;
  let avgScore = null;
  let totalScore = 0;
  let gradedCount = 0;
  let upcomingDeadlines = [];

  if (classIds.length > 0) {
    const { data: assignments } = await supabase
      .from('assignments')
      .select('id, title, class_id, due_date, total_points, is_published')
      .in('class_id', classIds)
      .eq('is_published', true);
    totalAssignments = (assignments || []).length;
    const assignmentIds = (assignments || []).map((a) => a.id);

    if (assignmentIds.length > 0) {
      const { data: subs } = await supabase
        .from('submissions')
        .select('id, assignment_id, status, score')
        .eq('student_id', studentId)
        .in('assignment_id', assignmentIds);

      const subMap = {};
      for (const s of subs || []) {
        subMap[s.assignment_id] = s;
      }

      completedAssignments = (subs || []).filter(
        (s) => s.status === 'submitted' || s.status === 'graded'
      ).length;
      todoAssignments = totalAssignments - completedAssignments;

      for (const s of subs || []) {
        if (s.status === 'graded' && s.score !== null) {
          totalScore += parseFloat(s.score);
          gradedCount += 1;
        }
      }
      if (gradedCount > 0) avgScore = (totalScore / gradedCount).toFixed(1);

      const now = new Date();
      upcomingDeadlines = (assignments || [])
        .filter((a) => a.due_date && new Date(a.due_date) > now && !subMap[a.id])
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .slice(0, 5)
        .map((a) => ({ id: a.id, title: a.title, due_date: a.due_date }));
    }
  }

  const activityDates = await collectStudentActivityDates(studentId);
  const streak = buildStreakPayload(activityDates);

  return {
    stats: {
      classes: classes.length,
      total_assignments: totalAssignments,
      todo_assignments: todoAssignments,
      completed_assignments: completedAssignments,
      avg_score: avgScore,
      graded_count: gradedCount,
    },
    streak,
    classes,
    upcoming_deadlines: upcomingDeadlines,
  };
}

module.exports = {
  getStats,
  getRecentActivity,
  getTeacherDashboard,
  getStudentDashboard,
};
