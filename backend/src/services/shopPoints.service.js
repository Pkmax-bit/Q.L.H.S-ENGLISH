const { supabase } = require('../config/database');

/**
 * Award star points from a graded submission (best-attempt delta).
 * award = round(score); only credits the increase over prior awards for that assignment.
 */
async function awardFromSubmission(submission) {
  if (!submission?.id || !submission?.student_id || !submission?.assignment_id) return null;
  if (submission.status !== 'graded') return null;

  const newScore = Math.max(0, Math.round(Number(submission.score) || 0));
  if (newScore <= 0) return null;

  const studentId = submission.student_id;
  const assignmentId = submission.assignment_id;

  const { data: priorRows, error: priorErr } = await supabase
    .from('student_point_ledger')
    .select('delta')
    .eq('student_id', studentId)
    .eq('assignment_id', assignmentId)
    .eq('reason', 'assignment_score');
  if (priorErr) throw priorErr;

  const prevAwarded = (priorRows || []).reduce((sum, r) => sum + (Number(r.delta) || 0), 0);
  const delta = Math.max(0, newScore - prevAwarded);
  if (delta <= 0) return null;

  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('shop_points_balance, shop_points_earned')
    .eq('id', studentId)
    .single();
  if (pErr) throw pErr;

  const balance = Number(profile?.shop_points_balance) || 0;
  const earned = Number(profile?.shop_points_earned) || 0;
  const newBalance = balance + delta;
  const newEarned = earned + delta;

  const { error: updErr } = await supabase
    .from('profiles')
    .update({
      shop_points_balance: newBalance,
      shop_points_earned: newEarned,
      updated_at: new Date().toISOString(),
    })
    .eq('id', studentId);
  if (updErr) throw updErr;

  const { data: ledger, error: lErr } = await supabase
    .from('student_point_ledger')
    .insert({
      student_id: studentId,
      delta,
      balance_after: newBalance,
      reason: 'assignment_score',
      assignment_id: assignmentId,
      submission_id: submission.id,
      note: `Điểm bài tập (+${delta})`,
    })
    .select('*')
    .single();
  if (lErr) throw lErr;

  return { delta, balance: newBalance, earned: newEarned, ledger };
}

async function getWallet(studentId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('shop_points_balance, shop_points_earned')
    .eq('id', studentId)
    .single();
  if (error) throw error;
  return {
    balance: Number(data?.shop_points_balance) || 0,
    earned: Number(data?.shop_points_earned) || 0,
  };
}

async function listLedger(studentId, limit = 30) {
  const { data, error } = await supabase
    .from('student_point_ledger')
    .select('id, delta, balance_after, reason, assignment_id, submission_id, note, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(Math.min(100, Math.max(1, limit)));
  if (error) throw error;
  return data || [];
}

module.exports = {
  awardFromSubmission,
  getWallet,
  listLedger,
};
