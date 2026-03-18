const { supabase } = require('../config/database');

const getStats = async () => {
  const [
    studentsResult,
    teachersResult,
    classesResult,
    subjectsResult,
    facilitiesResult,
    roomsResult,
    financesResult,
  ] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('classes').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('subjects').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('facilities').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('rooms').select('id', { count: 'exact', head: true }),
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
  if (roomsResult.error) throw roomsResult.error;

  return {
    active_students: studentsResult.count || 0,
    active_teachers: teachersResult.count || 0,
    active_classes: classesResult.count || 0,
    active_subjects: subjectsResult.count || 0,
    active_facilities: facilitiesResult.count || 0,
    total_rooms: roomsResult.count || 0,
    monthly_income: financesResult.totalIncome,
    monthly_expense: financesResult.totalExpense,
    monthly_net: financesResult.totalIncome - financesResult.totalExpense,
  };
};

const getRecentActivity = async (limitCount = 20) => {
  const perTable = Math.ceil(limitCount / 4);

  const [studentsRes, classesRes, financesRes, teachersRes] = await Promise.all([
    supabase
      .from('students')
      .select('full_name, created_at')
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
    supabase
      .from('teachers')
      .select('full_name, created_at')
      .order('created_at', { ascending: false })
      .limit(perTable),
  ]);

  if (studentsRes.error) throw studentsRes.error;
  if (classesRes.error) throw classesRes.error;
  if (financesRes.error) throw financesRes.error;
  if (teachersRes.error) throw teachersRes.error;

  const activities = [];

  for (const row of (studentsRes.data || [])) {
    activities.push({
      type: 'student_enrolled',
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

  for (const row of (teachersRes.data || [])) {
    activities.push({
      type: 'teacher_added',
      title: row.full_name,
      created_at: row.created_at,
    });
  }

  activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return activities.slice(0, limitCount);
};

module.exports = { getStats, getRecentActivity };
