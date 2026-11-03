const { supabase } = require('../config/database');

const getMine = async (userId, { classId } = {}) => {
  let query = supabase
    .from('lesson_progress')
    .select('*')
    .eq('user_id', userId);

  if (classId) {
    const { data: lessonRows, error: lessonError } = await supabase
      .from('lessons')
      .select('id')
      .eq('class_id', classId);
    if (lessonError) throw lessonError;
    const ids = (lessonRows || []).map((row) => row.id);
    if (ids.length === 0) return [];
    query = query.in('lesson_id', ids);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

const getOne = async (userId, lessonId) => {
  const { data, error } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

const upsert = async (userId, lessonId, payload = {}) => {
  const existing = await getOne(userId, lessonId);
  const now = new Date().toISOString();
  const status = payload.status === 'completed' || payload.status === 'in_progress'
    ? payload.status
    : (existing?.status || 'in_progress');

  const row = {
    user_id: userId,
    lesson_id: lessonId,
    status,
    current_step: payload.current_step ?? existing?.current_step ?? null,
    completed_steps: payload.completed_steps ?? existing?.completed_steps ?? [],
    answers: payload.answers ?? existing?.answers ?? {},
    practice_score: payload.practice_score ?? existing?.practice_score ?? null,
    practice_total: payload.practice_total ?? existing?.practice_total ?? null,
    completed_at: status === 'completed' ? (existing?.completed_at || now) : null,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('lesson_progress')
    .upsert(row, { onConflict: 'user_id,lesson_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
};

module.exports = { getMine, getOne, upsert };
