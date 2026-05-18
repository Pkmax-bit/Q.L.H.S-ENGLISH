const { supabase } = require('../config/database');

/**
 * Lesson Bundles ("Bộ bài học")
 * Một bundle chứa nhiều bài học (thường là bài học mẫu - is_template=true).
 * Có thể áp dụng cả bộ vào lớp, hoặc chỉ chọn vài bài cụ thể trong bộ.
 */

const getAll = async (queryParams = {}) => {
  const search = queryParams.search || null;
  const subjectId = queryParams.subject_id || null;

  let query = supabase
    .from('lesson_bundles')
    .select(`
      *,
      subjects(id, name, code),
      lesson_bundle_items(id, lesson_id, order_index)
    `)
    .order('created_at', { ascending: false });

  if (search) query = query.ilike('name', `%${search}%`);
  if (subjectId) query = query.eq('subject_id', subjectId);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((b) => ({
    ...b,
    subject_name: b.subjects?.name || null,
    subject_code: b.subjects?.code || null,
    item_count: (b.lesson_bundle_items || []).length,
    subjects: undefined,
  }));
};

const getById = async (id) => {
  const { data: bundle, error } = await supabase
    .from('lesson_bundles')
    .select(`*, subjects(id, name, code)`)
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  // Fetch items with full lesson info, ordered
  const { data: items, error: itemsErr } = await supabase
    .from('lesson_bundle_items')
    .select(`
      id, order_index, created_at,
      lessons:lesson_id(
        id, title, content, content_type, file_url, youtube_url, drive_url,
        is_template, is_published, order_index, created_at
      )
    `)
    .eq('bundle_id', id)
    .order('order_index', { ascending: true });
  if (itemsErr) throw itemsErr;

  return {
    ...bundle,
    subject_name: bundle.subjects?.name || null,
    subject_code: bundle.subjects?.code || null,
    subjects: undefined,
    items: (items || []).map((it) => ({
      item_id: it.id,
      order_index: it.order_index,
      ...(it.lessons || {}),
    })),
  };
};

const create = async ({ name, description, subject_id, lesson_ids }, createdBy) => {
  if (!name || !name.trim()) {
    throw { statusCode: 400, message: 'Tên bộ bài học là bắt buộc' };
  }

  const { data: bundle, error } = await supabase
    .from('lesson_bundles')
    .insert({
      name: name.trim(),
      description: description || null,
      subject_id: subject_id || null,
      created_by: createdBy || null,
    })
    .select()
    .single();
  if (error) throw error;

  if (Array.isArray(lesson_ids) && lesson_ids.length > 0) {
    await addItems(bundle.id, lesson_ids);
  }

  return getById(bundle.id);
};

const update = async (id, { name, description, subject_id }) => {
  const updateObj = { updated_at: new Date().toISOString() };
  if (name !== undefined) updateObj.name = name;
  if (description !== undefined) updateObj.description = description;
  if (subject_id !== undefined) updateObj.subject_id = subject_id || null;

  const { data, error } = await supabase
    .from('lesson_bundles')
    .update(updateObj)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return getById(data.id);
};

const remove = async (id) => {
  const { data, error } = await supabase
    .from('lesson_bundles')
    .delete()
    .eq('id', id)
    .select('id')
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

const addItems = async (bundleId, lessonIds) => {
  if (!Array.isArray(lessonIds) || lessonIds.length === 0) {
    return { added: 0 };
  }

  const { data: existing } = await supabase
    .from('lesson_bundle_items')
    .select('lesson_id, order_index')
    .eq('bundle_id', bundleId);

  const existingIds = new Set((existing || []).map((r) => r.lesson_id));
  const maxOrder = (existing || []).reduce(
    (m, r) => Math.max(m, r.order_index || 0),
    0,
  );

  const toInsert = lessonIds
    .filter((lid) => !existingIds.has(lid))
    .map((lid, i) => ({
      bundle_id: bundleId,
      lesson_id: lid,
      order_index: maxOrder + 1 + i,
    }));

  if (toInsert.length === 0) return { added: 0 };

  const { data, error } = await supabase
    .from('lesson_bundle_items')
    .insert(toInsert)
    .select();
  if (error) throw error;
  return { added: data.length };
};

const removeItem = async (bundleId, lessonId) => {
  const { data, error } = await supabase
    .from('lesson_bundle_items')
    .delete()
    .eq('bundle_id', bundleId)
    .eq('lesson_id', lessonId)
    .select('id')
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

const reorderItems = async (bundleId, orderedLessonIds) => {
  if (!Array.isArray(orderedLessonIds)) return { updated: 0 };
  let updated = 0;
  for (let i = 0; i < orderedLessonIds.length; i++) {
    const { error } = await supabase
      .from('lesson_bundle_items')
      .update({ order_index: i + 1 })
      .eq('bundle_id', bundleId)
      .eq('lesson_id', orderedLessonIds[i]);
    if (error) throw error;
    updated++;
  }
  return { updated };
};

/**
 * Áp dụng bộ bài học vào lớp.
 * - lesson_ids tùy chọn: nếu rỗng/undefined thì áp dụng toàn bộ bài trong bộ.
 *   nếu có thì chỉ áp dụng các bài được chỉ định (phải nằm trong bộ).
 * - Mỗi bài được nhân bản (copy) sang lớp với is_template=false, is_published=false.
 */
const applyToClass = async (bundleId, classId, lessonIds, createdBy) => {
  if (!classId) {
    throw { statusCode: 400, message: 'class_id là bắt buộc' };
  }

  const { data: items, error: iErr } = await supabase
    .from('lesson_bundle_items')
    .select(`order_index, lessons:lesson_id(*)`)
    .eq('bundle_id', bundleId)
    .order('order_index', { ascending: true });
  if (iErr) throw iErr;
  if (!items || items.length === 0) {
    throw { statusCode: 404, message: 'Bộ không có bài học nào' };
  }

  let lessons = items.map((it) => it.lessons).filter(Boolean);
  if (Array.isArray(lessonIds) && lessonIds.length > 0) {
    const allow = new Set(lessonIds);
    lessons = lessons.filter((l) => allow.has(l.id));
  }
  if (lessons.length === 0) {
    throw { statusCode: 400, message: 'Không có bài học hợp lệ để áp dụng' };
  }

  const { data: existing } = await supabase
    .from('lessons')
    .select('order_index')
    .eq('class_id', classId)
    .eq('is_template', false)
    .order('order_index', { ascending: false })
    .limit(1);

  let nextOrder = (existing && existing[0]?.order_index || 0) + 1;

  const copies = lessons.map((t) => ({
    class_id: classId,
    title: t.title,
    content: t.content,
    content_type: t.content_type,
    file_url: t.file_url,
    youtube_url: t.youtube_url,
    drive_url: t.drive_url,
    order_index: nextOrder++,
    is_published: false,
    is_template: false,
    created_by: createdBy || null,
  }));

  const { data: inserted, error: insertErr } = await supabase
    .from('lessons')
    .insert(copies)
    .select();
  if (insertErr) throw insertErr;

  return { created: inserted.length, lessons: inserted };
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  addItems,
  removeItem,
  reorderItems,
  applyToClass,
};
