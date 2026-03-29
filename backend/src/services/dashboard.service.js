const { supabase } = require('../config/database');

const getStats = async () => {
  const [
    studentsResult,
    teachersResult,
    classesResult,
    subjectsResult,
    facilitiesResult,
    financesResult,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student').eq('is_active', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher').eq('is_active', true),
    supabase.from('classes').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('subjects').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('facilities').select('id', { count: 'exact', head: true }),
    // Get current month finances
    (async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('finances')
        .select('type, amount')
        .gte('payment_date', startOfMonth)
        .lt('payment_date', startOfNextMonth);

      if (error) throw error;

      let totalIncome = 0;
      let totalExpense = 0;
      for (const row of (data || [])) {
        const amount = parseFloat(row.amount) || 0;
        if (row.type === 'income') {
          totalIncome += amount;
        } else {
          totalExpense += amount;
        }
      }

      return { totalIncome, totalExpense };
    })(),
  ]);

  if (studentsResult.error) throw studentsResult.error;
  if (teachersResult.error) throw teachersResult.error;
  if (classesResult.error) throw classesResult.error;
  if (subjectsResult.error) throw subjectsResult.error;
  if (facilitiesResult.error) throw facilitiesResult.error;

  return {
    active_students: studentsResult.count || 0,
    active_teachers: teachersResult.count || 0,
    active_classes: classesResult.count || 0,
    active_subjects: subjectsResult.count || 0,
    total_facilities: facilitiesResult.count || 0,
    monthly_income: financesResult.totalIncome,
    monthly_expense: financesResult.totalExpense,
    monthly_net: financesResult.totalIncome - financesResult.totalExpense,
  };
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

  for (const row of (studentsRes.data || [])) {
    activities.push({
      type: row.role === 'teacher' ? 'teacher_added' : 'student_enrolled',
      title: row.full_name,
      created_at: row.created_at,
    });
  }

  for (const row of (classesRes.data || [])) {
    activities.push({
      type: 'class_created',
      title: row.name,
      created_at: row.created_at,
    });
  }

  for (const row of (financesRes.data || [])) {
    activities.push({
      type: `finance_${row.type}`,
      title: row.description,
      created_at: row.created_at,
    });
  }

  activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return activities.slice(0, limitCount);
};

module.exports = { getStats, getRecentActivity, getTeacherDashboard, getStudentDashboard };

/* ===== TEACHER DASHBOARD ===== */
async function getTeacherDashboard(teacherId) {
  // Classes I teach
  const { data: classes, error: cErr } = await supabase
    .from('classes').select('id, name, status, max_students')
    .eq('teacher_id', teacherId).eq('status', 'active');
  if (cErr) throw cErr;

  const classIds = (classes || []).map(c => c.id);

  // Student count
  let studentCount = 0;
  if (classIds.length > 0) {
    const { count } = await supabase.from('class_students')
      .select('id', { count: 'exact', head: true }).in('class_id', classIds);
    studentCount = count || 0;
  }

  // Lessons & Assignments
  let lessonCount = 0, assignmentCount = 0, pendingGrading = 0;
  if (classIds.length > 0) {
    const [lRes, aRes] = await Promise.all([
      supabase.from('lessons').select('id', { count: 'exact', head: true }).in('class_id', classIds),
      supabase.from('assignments').select('id').in('class_id', classIds),
    ]);
    lessonCount = lRes.count || 0;
    const assignmentIds = (aRes.data || []).map(a => a.id);
    assignmentCount = assignmentIds.length;

    if (assignmentIds.length > 0) {
      const { count: pCount } = await supabase.from('submissions')
        .select('id', { count: 'exact', head: true })
        .in('assignment_id', assignmentIds).eq('status', 'submitted');
      pendingGrading = pCount || 0;
    }
  }

  // Pending enrollment requests
  let pendingRequests = 0;
  if (classIds.length > 0) {
    const { count } = await supabase.from('enrollment_requests')
      .select('id', { count: 'exact', head: true })
      .in('class_id', classIds).eq('status', 'pending');
    pendingRequests = count || 0;
  }

  return {
    stats: {
      classes: classIds.length,
      students: studentCount,
      lessons: lessonCount,
      assignments: assignmentCount,
      pending_grading: pendingGrading,
      pending_requests: pendingRequests,
    },
    classes: classes || [],
  };
}

/* ===== STUDENT DASHBOARD ===== */
async function getStudentDashboard(studentId) {
  // My classes
  const { data: enrollments, error: eErr } = await supabase
    .from('class_students')
    .select('class_id, classes(id, name, status, teacher_id, profiles!classes_teacher_id_fkey(full_name))')
    .eq('student_id', studentId);
  if (eErr) throw eErr;

  const classes = (enrollments || []).map(e => ({
    id: e.classes?.id || e.class_id,
    name: e.classes?.name || '',
    teacher_name: e.classes?.profiles?.full_name || '',
  }));
  const classIds = classes.map(c => c.id);

  // Assignments in my classes
  let totalAssignments = 0, todoAssignments = 0, completedAssignments = 0;
  let avgScore = null, totalScore = 0, gradedCount = 0;
  let upcomingDeadlines = [];

  if (classIds.length > 0) {
    const { data: assignments } = await supabase
      .from('assignments').select('id, title, class_id, due_date, total_points, is_published')
      .in('class_id', classIds).eq('is_published', true);
    totalAssignments = (assignments || []).length;
    const assignmentIds = (assignments || []).map(a => a.id);

    // My submissions
    if (assignmentIds.length > 0) {
      const { data: subs } = await supabase
        .from('submissions').select('id, assignment_id, status, score')
        .eq('student_id', studentId).in('assignment_id', assignmentIds);

      const subMap = {};
      for (const s of (subs || [])) { subMap[s.assignment_id] = s; }

      completedAssignments = (subs || []).filter(s => s.status === 'submitted' || s.status === 'graded').length;
      todoAssignments = totalAssignments - completedAssignments;

      for (const s of (subs || [])) {
        if (s.status === 'graded' && s.score !== null) {
          totalScore += parseFloat(s.score);
          gradedCount++;
        }
      }
      if (gradedCount > 0) avgScore = (totalScore / gradedCount).toFixed(1);

      // Upcoming deadlines
      const now = new Date();
      upcomingDeadlines = (assignments || [])
        .filter(a => a.due_date && new Date(a.due_date) > now && !subMap[a.id])
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .slice(0, 5)
        .map(a => ({ id: a.id, title: a.title, due_date: a.due_date }));
    }
  }

  return {
    stats: {
      classes: classes.length,
      total_assignments: totalAssignments,
      todo_assignments: todoAssignments,
      completed_assignments: completedAssignments,
      avg_score: avgScore,
      graded_count: gradedCount,
    },
    classes,
    upcoming_deadlines: upcomingDeadlines,
  };
}
