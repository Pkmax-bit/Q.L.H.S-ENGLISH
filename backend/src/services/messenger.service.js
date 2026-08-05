const path = require('path');
const fs = require('fs');
const { supabase } = require('../config/database');
const { getIO } = require('../socket');

const UPLOAD_DIR = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads', 'messenger-chat');

try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch { /* ignore */ }

function directPairKey(a, b) {
  return [String(a), String(b)].sort().join(':');
}

async function fetchPeerProfile(peerId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, email, is_active')
    .eq('id', peerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Học sinh ↔ giáo viên cùng lớp; admin nhắn được với mọi người. */
async function assertCanDirectMessage(userId, peerId, role) {
  if (String(peerId) === String(userId)) {
    const err = new Error('Không thể chat với chính mình');
    err.status = 400;
    throw err;
  }

  const peer = await fetchPeerProfile(peerId);
  if (!peer || peer.is_active === false) {
    const err = new Error('Không tìm thấy người nhận');
    err.status = 404;
    throw err;
  }

  if (role === 'admin') return peer;

  if (role === 'student') {
    if (peer.role === 'admin') return peer;
    if (peer.role !== 'teacher') {
      const err = new Error('Học sinh chỉ có thể nhắn tin với giáo viên hoặc quản trị viên');
      err.status = 403;
      throw err;
    }
    const { data: rows, error } = await supabase
      .from('class_students')
      .select('class_id, classes(id, teacher_id)')
      .eq('student_id', userId);
    if (error) throw error;
    const allowed = (rows || []).some((row) => String(row.classes?.teacher_id) === String(peerId));
    if (!allowed) {
      const err = new Error('Bạn chỉ có thể nhắn tin với giáo viên dạy lớp của mình');
      err.status = 403;
      throw err;
    }
    return peer;
  }

  if (role === 'teacher') {
    if (peer.role === 'admin' || peer.role === 'teacher') return peer;
    if (peer.role !== 'student') {
      const err = new Error('Không thể nhắn tin với tài khoản này');
      err.status = 403;
      throw err;
    }
    const { data: classes, error: cErr } = await supabase
      .from('classes')
      .select('id')
      .eq('teacher_id', userId);
    if (cErr) throw cErr;
    const classIds = (classes || []).map((c) => c.id);
    if (!classIds.length) {
      const err = new Error('Bạn chưa có lớp học để nhắn tin với học sinh');
      err.status = 403;
      throw err;
    }
    const { data: enrolled, error: eErr } = await supabase
      .from('class_students')
      .select('id')
      .eq('student_id', peerId)
      .in('class_id', classIds)
      .limit(1);
    if (eErr) throw eErr;
    if (!(enrolled || []).length) {
      const err = new Error('Bạn chỉ có thể nhắn tin với học sinh trong lớp mình dạy');
      err.status = 403;
      throw err;
    }
    return peer;
  }

  const err = new Error('Không có quyền nhắn tin');
  err.status = 403;
  throw err;
}

async function buildClassContactMap(userId, role) {
  const byUser = new Map();

  const addUser = (profileId, className) => {
    if (!profileId || String(profileId) === String(userId)) return;
    const key = String(profileId);
    const prev = byUser.get(key) || { class_names: [] };
    if (className && !prev.class_names.includes(className)) {
      prev.class_names.push(className);
    }
    byUser.set(key, prev);
  };

  if (role === 'student') {
    const { data: rows, error } = await supabase
      .from('class_students')
      .select('class_id, classes(id, name, teacher_id)')
      .eq('student_id', userId);
    if (error) throw error;
    for (const row of rows || []) {
      const cls = row.classes;
      addUser(cls?.teacher_id, cls?.name);
    }
  } else if (role === 'teacher') {
    const { data: classes, error: cErr } = await supabase
      .from('classes')
      .select('id, name')
      .eq('teacher_id', userId);
    if (cErr) throw cErr;
    const classIds = (classes || []).map((c) => c.id);
    const classNameById = new Map((classes || []).map((c) => [c.id, c.name]));
    if (classIds.length) {
      const { data: enrollments, error: eErr } = await supabase
        .from('class_students')
        .select('student_id, class_id')
        .in('class_id', classIds);
      if (eErr) throw eErr;
      for (const row of enrollments || []) {
        addUser(row.student_id, classNameById.get(row.class_id));
      }
    }
  }

  return byUser;
}

async function assertGroupMember(groupId, userId) {
  const { data } = await supabase
    .from('messenger_group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

async function fetchProfileMap(ids) {
  const unique = [...new Set((ids || []).filter(Boolean).map(String))];
  if (!unique.length) return new Map();
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role')
    .in('id', unique);
  return new Map((data || []).map((p) => [String(p.id), p]));
}

async function fetchMessageById(id) {
  const { data, error } = await supabase
    .from('messenger_group_messages')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const profileMap = await fetchProfileMap([data.user_id]);
  return {
    ...data,
    user: profileMap.get(String(data.user_id)) || null,
  };
}

function emitToGroup(groupId, event, payload) {
  try {
    getIO().to(`messenger_group:${groupId}`).emit(event, payload);
  } catch {
    /* socket chưa init */
  }
}

async function enrichDirectGroup(group, viewerId) {
  const { data: mems } = await supabase
    .from('messenger_group_members')
    .select('user_id')
    .eq('group_id', group.id);
  const peerId = (mems || []).map((m) => m.user_id).find((id) => String(id) !== String(viewerId));
  let peer = null;
  if (peerId) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role')
      .eq('id', peerId)
      .maybeSingle();
    peer = data;
  }
  return {
    ...group,
    peer_id: peer?.id || null,
    peer_name: peer?.full_name || null,
    peer_avatar: peer?.avatar_url || null,
    display_name: peer?.full_name || group.name,
  };
}

async function getGroupStats(groupIds, userId) {
  const stats = new Map();
  if (!groupIds.length) return stats;

  const { data: receipts } = await supabase
    .from('messenger_read_receipts')
    .select('group_id, last_read_at')
    .eq('user_id', userId)
    .in('group_id', groupIds);
  const readMap = new Map((receipts || []).map((r) => [r.group_id, r.last_read_at]));

  for (const gid of groupIds) {
    const { count: messageCount } = await supabase
      .from('messenger_group_messages')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', gid);

    const { data: lastMsg } = await supabase
      .from('messenger_group_messages')
      .select('content, created_at, user_id, is_system, attachment_url, attachments')
      .eq('group_id', gid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastRead = readMap.get(gid);
    let unreadCount = 0;
    if (lastRead) {
      const { count } = await supabase
        .from('messenger_group_messages')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', gid)
        .gt('created_at', lastRead)
        .neq('user_id', userId);
      unreadCount = count || 0;
    } else if (messageCount) {
      const { count } = await supabase
        .from('messenger_group_messages')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', gid)
        .neq('user_id', userId);
      unreadCount = count || 0;
    }

    let preview = lastMsg?.content || null;
    if (!preview && lastMsg?.attachment_url) preview = '📎 Tệp đính kèm';
    if (!preview && Array.isArray(lastMsg?.attachments) && lastMsg.attachments.length) preview = '📎 Tệp đính kèm';

    stats.set(gid, {
      message_count: messageCount || 0,
      last_message_at: lastMsg?.created_at || null,
      last_message: preview,
      last_user_id: lastMsg?.user_id || null,
      unread_count: unreadCount,
    });
  }
  return stats;
}

async function listGroups(userId) {
  const { data: memberships, error } = await supabase
    .from('messenger_group_members')
    .select('group_id, role')
    .eq('user_id', userId);
  if (error) throw error;

  const ids = (memberships || []).map((m) => m.group_id);
  if (!ids.length) return [];

  const { data: groups, error: gErr } = await supabase
    .from('messenger_groups')
    .select('*')
    .in('id', ids)
    .order('created_at', { ascending: false });
  if (gErr) throw gErr;

  const statsMap = await getGroupStats(ids, userId);
  const roleMap = new Map((memberships || []).map((m) => [m.group_id, m.role]));

  const enriched = [];
  for (const g of groups || []) {
    const stats = statsMap.get(g.id) || {};
    let row = {
      ...g,
      role: roleMap.get(g.id) || 'member',
      message_count: stats.message_count || 0,
      last_message_at: stats.last_message_at,
      last_message: stats.last_message,
      last_user_id: stats.last_user_id,
      unread_count: stats.unread_count || 0,
      display_name: g.name,
    };
    if (g.is_direct) {
      row = await enrichDirectGroup(row, userId);
    }
    enriched.push(row);
  }

  enriched.sort((a, b) => {
    const ta = a.last_message_at || a.created_at;
    const tb = b.last_message_at || b.created_at;
    return new Date(tb) - new Date(ta);
  });

  return enriched;
}

async function createGroup({ name, memberIds, createdBy, classId = null }) {
  const uniqueMembers = [...new Set([createdBy, ...(memberIds || [])].map(String))];

  const { data: group, error: gErr } = await supabase
    .from('messenger_groups')
    .insert({
      name,
      created_by: createdBy,
      class_id: classId,
      is_direct: false,
    })
    .select('*')
    .single();
  if (gErr) throw gErr;

  const memberRows = uniqueMembers.map((uid) => ({
    group_id: group.id,
    user_id: uid,
    role: String(uid) === String(createdBy) ? 'leader' : 'member',
    added_by: createdBy,
  }));

  const { error: mErr } = await supabase.from('messenger_group_members').insert(memberRows);
  if (mErr) {
    await supabase.from('messenger_groups').delete().eq('id', group.id);
    throw mErr;
  }

  const { data: creator } = await supabase.from('profiles').select('full_name').eq('id', createdBy).single();
  await supabase.from('messenger_group_messages').insert({
    group_id: group.id,
    user_id: createdBy,
    content: `${creator?.full_name || 'Ai đó'} đã tạo nhóm «${name}»`,
    message_type: 'system',
    is_system: true,
  });

  return group;
}

async function createDirectChat(userId, peerId, userRole = 'student') {
  await assertCanDirectMessage(userId, peerId, userRole);

  const key = directPairKey(userId, peerId);
  const { data: existing } = await supabase
    .from('messenger_groups')
    .select('*')
    .eq('direct_pair_key', key)
    .maybeSingle();
  if (existing) return enrichDirectGroup(existing, userId);

  const { data: me } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
  const { data: peer } = await supabase.from('profiles').select('full_name').eq('id', peerId).single();
  const name = `${me?.full_name || 'Bạn'} — ${peer?.full_name || 'Thành viên'}`;

  const { data: group, error: gErr } = await supabase
    .from('messenger_groups')
    .insert({
      name,
      created_by: userId,
      is_direct: true,
      direct_pair_key: key,
    })
    .select('*')
    .single();
  if (gErr) throw gErr;

  const { error: mErr } = await supabase.from('messenger_group_members').insert([
    { group_id: group.id, user_id: userId, role: 'member', added_by: userId },
    { group_id: group.id, user_id: peerId, role: 'member', added_by: userId },
  ]);
  if (mErr) {
    await supabase.from('messenger_groups').delete().eq('id', group.id);
    throw mErr;
  }

  await supabase.from('messenger_group_messages').insert({
    group_id: group.id,
    user_id: userId,
    content: 'Bắt đầu trò chuyện',
    message_type: 'system',
    is_system: true,
  });

  return enrichDirectGroup(group, userId);
}

async function ensureClassChat(classId, userId, userRole) {
  const { data: cls, error: cErr } = await supabase
    .from('classes')
    .select('id, name, teacher_id')
    .eq('id', classId)
    .single();
  if (cErr || !cls) {
    const err = new Error('Không tìm thấy lớp học');
    err.status = 404;
    throw err;
  }

  const { data: existing } = await supabase
    .from('messenger_groups')
    .select('*')
    .eq('class_id', classId)
    .maybeSingle();
  if (existing) {
    const ok = await assertGroupMember(existing.id, userId);
    if (!ok && userRole !== 'admin') {
      const err = new Error('Bạn không thuộc nhóm chat lớp này');
      err.status = 403;
      throw err;
    }
    if (!ok && userRole === 'admin') {
      await supabase.from('messenger_group_members').upsert({
        group_id: existing.id,
        user_id: userId,
        role: 'member',
        added_by: userId,
      }, { onConflict: 'group_id,user_id' });
    }
    return existing;
  }

  const { data: students } = await supabase
    .from('class_students')
    .select('student_id')
    .eq('class_id', classId);
  const memberIds = [
    cls.teacher_id,
    ...(students || []).map((s) => s.student_id),
  ].filter(Boolean);

  const isTeacher = String(cls.teacher_id) === String(userId);
  const isStudent = (students || []).some((s) => String(s.student_id) === String(userId));
  if (userRole !== 'admin' && !isTeacher && !isStudent) {
    const err = new Error('Bạn không có quyền mở chat lớp này');
    err.status = 403;
    throw err;
  }

  return createGroup({
    name: `Lớp: ${cls.name}`,
    memberIds,
    createdBy: userId,
    classId,
  });
}

async function getMessages(groupId, userId) {
  const ok = await assertGroupMember(groupId, userId);
  if (!ok) {
    const err = new Error('Bạn không thuộc nhóm này');
    err.status = 403;
    throw err;
  }

  const { data, error } = await supabase
    .from('messenger_group_messages')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) throw error;

  const profileMap = await fetchProfileMap((data || []).map((m) => m.user_id));
  return (data || []).map((m) => ({
    ...m,
    user: profileMap.get(String(m.user_id)) || null,
  }));
}

async function sendMessage(groupId, userId, { content, reply_to = null, attachment = null }) {
  const ok = await assertGroupMember(groupId, userId);
  if (!ok) {
    const err = new Error('Bạn không thuộc nhóm này');
    err.status = 403;
    throw err;
  }

  const text = (content || '').trim();
  if (!text && !attachment) {
    const err = new Error('Thiếu nội dung');
    err.status = 400;
    throw err;
  }

  const row = {
    group_id: groupId,
    user_id: userId,
    content: text || null,
    message_type: attachment ? 'file' : 'text',
    reply_to: reply_to || null,
  };

  if (attachment) {
    row.attachment_url = attachment.url;
    row.attachment_name = attachment.name;
    row.attachment_size = attachment.size;
    row.attachment_mime = attachment.mime;
    row.attachments = [attachment];
  }

  const { data: inserted, error } = await supabase
    .from('messenger_group_messages')
    .insert(row)
    .select('id')
    .single();
  if (error) throw error;

  const full = await fetchMessageById(inserted.id);
  emitToGroup(groupId, 'messenger_group:chat', full);
  return full;
}

async function markRead(groupId, userId) {
  const ok = await assertGroupMember(groupId, userId);
  if (!ok) {
    const err = new Error('Bạn không thuộc nhóm này');
    err.status = 403;
    throw err;
  }

  const last_read_at = new Date().toISOString();
  const { error } = await supabase.from('messenger_read_receipts').upsert(
    { group_id: groupId, user_id: userId, last_read_at },
    { onConflict: 'group_id,user_id' },
  );
  if (error) throw error;

  emitToGroup(groupId, 'messenger_group:read', { group_id: groupId, user_id: userId, last_read_at });
  return { ok: true, last_read_at };
}

async function listContacts(userId, role) {
  const classMap = await buildClassContactMap(userId, role);

  if (role === 'admin') {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role, email')
      .eq('is_active', true)
      .neq('id', userId)
      .in('role', ['teacher', 'student', 'admin'])
      .order('full_name')
      .limit(300);
    if (error) throw error;
    return (data || []).map((p) => ({ ...p, class_names: [] }));
  }

  const allowedIds = [...classMap.keys()];
  const extraRoles = role === 'student' ? ['admin'] : ['admin', 'teacher'];
  const { data: extras, error: extraErr } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, email')
    .eq('is_active', true)
    .neq('id', userId)
    .in('role', extraRoles);
  if (extraErr) throw extraErr;

  const idSet = new Set(allowedIds);
  for (const p of extras || []) idSet.add(String(p.id));

  if (!idSet.size) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, email')
    .eq('is_active', true)
    .in('id', [...idSet])
    .order('full_name');
  if (error) throw error;

  return (data || []).map((p) => ({
    ...p,
    class_names: classMap.get(String(p.id))?.class_names || [],
  }));
}

function storeUploadedFile(file) {
  const ext = path.extname(file.originalname || '') || '';
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const dest = path.join(UPLOAD_DIR, safeName);
  fs.writeFileSync(dest, file.buffer);
  const url = `/uploads/messenger-chat/${safeName}`;
  return {
    url,
    name: file.originalname || safeName,
    size: file.size,
    mime: file.mimetype || 'application/octet-stream',
  };
}

module.exports = {
  listGroups,
  createGroup,
  createDirectChat,
  ensureClassChat,
  getMessages,
  sendMessage,
  markRead,
  listContacts,
  storeUploadedFile,
  assertGroupMember,
  enrichDirectGroup,
};
