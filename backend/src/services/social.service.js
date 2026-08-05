const path = require('path');
const fs = require('fs');
const { supabase } = require('../config/database');

const UPLOAD_DIR = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads', 'social');
const MAX_BODY = 8000;
const MAX_COMMENT = 4000;

try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch { /* ignore */ }

const PROFILE_PUBLIC = 'id, full_name, avatar_url, cover_url, bio, role, created_at, is_active';

async function fetchProfileMap(ids) {
  const unique = [...new Set((ids || []).filter(Boolean).map(String))];
  if (!unique.length) return new Map();
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_PUBLIC)
    .in('id', unique);
  if (error) throw error;
  return new Map((data || []).map((p) => [String(p.id), p]));
}

async function enrichPosts(posts, viewerId) {
  const ids = (posts || []).map((p) => p.id);
  if (!ids.length) return [];

  const authorIds = (posts || []).map((p) => p.author_id);
  const profileMap = await fetchProfileMap(authorIds);

  const { data: likes, error: lErr } = await supabase
    .from('social_likes')
    .select('post_id, user_id')
    .in('post_id', ids);
  if (lErr) throw lErr;

  const { data: comments, error: cErr } = await supabase
    .from('social_comments')
    .select('post_id')
    .in('post_id', ids);
  if (cErr) throw cErr;

  const likeMap = new Map();
  for (const row of likes || []) {
    if (!likeMap.has(row.post_id)) likeMap.set(row.post_id, []);
    likeMap.get(row.post_id).push(row.user_id);
  }

  const commentCount = new Map();
  for (const row of comments || []) {
    commentCount.set(row.post_id, (commentCount.get(row.post_id) || 0) + 1);
  }

  return posts.map((p) => {
    const likers = likeMap.get(p.id) || [];
    return {
      ...p,
      author: profileMap.get(String(p.author_id)) || null,
      like_count: likers.length,
      liked_by_me: likers.some((uid) => String(uid) === String(viewerId)),
      comment_count: commentCount.get(p.id) || 0,
    };
  });
}

async function listFeed({ viewerId, limit = 20, offset = 0, authorId = null }) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  let query = supabase
    .from('social_posts')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(safeOffset, safeOffset + safeLimit - 1);

  if (authorId) query = query.eq('author_id', authorId);

  const { data, error } = await query;
  if (error) throw error;
  return enrichPosts(data || [], viewerId);
}

async function createPost(userId, { body, image_url = null }) {
  const text = String(body || '').trim();
  if (!text && !image_url) {
    const err = new Error('Nội dung bài viết không được để trống');
    err.status = 400;
    throw err;
  }
  if (text.length > MAX_BODY) {
    const err = new Error(`Nội dung tối đa ${MAX_BODY} ký tự`);
    err.status = 400;
    throw err;
  }

  const { data, error } = await supabase
    .from('social_posts')
    .insert({
      author_id: userId,
      body: text,
      image_url: image_url || null,
    })
    .select('*')
    .single();
  if (error) throw error;

  const [enriched] = await enrichPosts([data], userId);
  return enriched;
}

async function deletePost(userId, postId, role) {
  const { data: post, error } = await supabase
    .from('social_posts')
    .select('id, author_id')
    .eq('id', postId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  if (!post) {
    const err = new Error('Không tìm thấy bài viết');
    err.status = 404;
    throw err;
  }

  const isOwner = String(post.author_id) === String(userId);
  const isAdmin = role === 'admin';
  if (!isOwner && !isAdmin) {
    const err = new Error('Bạn không có quyền xóa bài viết này');
    err.status = 403;
    throw err;
  }

  const { error: uErr } = await supabase
    .from('social_posts')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', postId);
  if (uErr) throw uErr;
  return { ok: true };
}

async function toggleLike(userId, postId) {
  const { data: existing } = await supabase
    .from('social_likes')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase.from('social_likes').delete().eq('post_id', postId).eq('user_id', userId);
    return { liked: false };
  }

  const { error } = await supabase.from('social_likes').insert({ post_id: postId, user_id: userId });
  if (error) throw error;
  return { liked: true };
}

async function listComments(postId) {
  const { data, error } = await supabase
    .from('social_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw error;

  const profileMap = await fetchProfileMap((data || []).map((c) => c.author_id));
  return (data || []).map((c) => ({
    ...c,
    author: profileMap.get(String(c.author_id)) || null,
  }));
}

async function addComment(userId, postId, body) {
  const text = String(body || '').trim();
  if (!text) {
    const err = new Error('Bình luận không được để trống');
    err.status = 400;
    throw err;
  }
  if (text.length > MAX_COMMENT) {
    const err = new Error(`Bình luận tối đa ${MAX_COMMENT} ký tự`);
    err.status = 400;
    throw err;
  }

  const { data: post } = await supabase
    .from('social_posts')
    .select('id')
    .eq('id', postId)
    .is('deleted_at', null)
    .maybeSingle();
  if (!post) {
    const err = new Error('Không tìm thấy bài viết');
    err.status = 404;
    throw err;
  }

  const { data, error } = await supabase
    .from('social_comments')
    .insert({ post_id: postId, author_id: userId, body: text })
    .select('*')
    .single();
  if (error) throw error;

  const profileMap = await fetchProfileMap([userId]);
  return { ...data, author: profileMap.get(String(userId)) || null };
}

async function getClassSummary(userId, role) {
  if (role === 'teacher') {
    const { data } = await supabase
      .from('classes')
      .select('id, name, status')
      .eq('teacher_id', userId)
      .order('name')
      .limit(8);
    return { classes: data || [], label: 'Lớp đang dạy' };
  }
  if (role === 'student') {
    const { data } = await supabase
      .from('class_students')
      .select('classes(id, name, status, profiles!classes_teacher_id_fkey(full_name))')
      .eq('student_id', userId)
      .limit(8);
    const classes = (data || []).map((r) => ({
      id: r.classes?.id,
      name: r.classes?.name,
      status: r.classes?.status,
      teacher_name: r.classes?.profiles?.full_name || null,
    })).filter((c) => c.id);
    return { classes, label: 'Lớp đang học' };
  }
  return { classes: [], label: null };
}

async function getPublicProfile(targetId, viewerId, viewerRole) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`${PROFILE_PUBLIC}, email, phone`)
    .eq('id', targetId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  if (!profile) {
    const err = new Error('Không tìm thấy hồ sơ');
    err.status = 404;
    throw err;
  }

  const isSelf = String(targetId) === String(viewerId);
  const isAdmin = viewerRole === 'admin';

  const { count: postCount } = await supabase
    .from('social_posts')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', targetId)
    .is('deleted_at', null);

  const classSummary = await getClassSummary(targetId, profile.role);

  return {
    id: profile.id,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    cover_url: profile.cover_url,
    bio: profile.bio,
    role: profile.role,
    created_at: profile.created_at,
    post_count: postCount || 0,
    email: (isSelf || isAdmin) ? profile.email : null,
    phone: (isSelf || isAdmin) ? profile.phone : null,
    is_self: isSelf,
    ...classSummary,
  };
}

async function searchMembers(query, limit = 10) {
  const q = String(query || '').trim().replace(/[%_,]/g, '');
  if (q.length < 2) return [];
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 20);
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, email')
    .eq('is_active', true)
    .in('role', ['teacher', 'student', 'admin'])
    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
    .order('full_name')
    .limit(safeLimit);
  if (error) throw error;
  return data || [];
}

async function getFeedStats() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    studentsResult,
    teachersResult,
    classesResult,
    postsTodayResult,
    membersResult,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student').eq('is_active', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher').eq('is_active', true),
    supabase.from('classes').select('id', { count: 'exact', head: true }).neq('status', 'archived'),
    supabase.from('social_posts').select('id', { count: 'exact', head: true }).is('deleted_at', null).gte('created_at', startOfDay.toISOString()),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true).in('role', ['teacher', 'student', 'admin']),
  ]);

  if (studentsResult.error) throw studentsResult.error;
  if (teachersResult.error) throw teachersResult.error;
  if (classesResult.error) throw classesResult.error;
  if (postsTodayResult.error) throw postsTodayResult.error;
  if (membersResult.error) throw membersResult.error;

  return {
    students_count: studentsResult.count || 0,
    teachers_count: teachersResult.count || 0,
    classes_count: classesResult.count || 0,
    posts_today: postsTodayResult.count || 0,
    members_total: membersResult.count || 0,
  };
}

function storeUploadedFile(file) {
  const ext = path.extname(file.originalname || '') || '';
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const dest = path.join(UPLOAD_DIR, safeName);
  fs.writeFileSync(dest, file.buffer);
  return {
    url: `/uploads/social/${safeName}`,
    name: file.originalname || safeName,
    size: file.size,
    mime: file.mimetype || 'application/octet-stream',
  };
}

module.exports = {
  listFeed,
  createPost,
  deletePost,
  toggleLike,
  listComments,
  addComment,
  getPublicProfile,
  searchMembers,
  getFeedStats,
  storeUploadedFile,
};
