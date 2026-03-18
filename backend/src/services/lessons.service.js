const { query } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['title', 'order_index', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const subjectId = queryParams.subject_id || null;

  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramIdx = 1;

  if (search) {
    whereClause += ` AND (l.title ILIKE $${paramIdx} OR l.content ILIKE $${paramIdx})`;
    params.push(`%${search}%`);
    paramIdx++;
  }

  if (subjectId) {
    whereClause += ` AND l.subject_id = $${paramIdx}`;
    params.push(subjectId);
    paramIdx++;
  }

  const countResult = await query(`SELECT COUNT(*) FROM lessons l ${whereClause}`, params);
  const total = parseInt(countResult.rows[0].count);

  const dataResult = await query(
    `SELECT l.*, s.name as subject_name, u.full_name as created_by_name
     FROM lessons l
     LEFT JOIN subjects s ON l.subject_id = s.id
     LEFT JOIN users u ON l.created_by = u.id
     ${whereClause}
     ORDER BY l.${sort} ${sortOrder}
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset]
  );

  return {
    data: dataResult.rows,
    pagination: buildPaginationResponse(total, page, limit),
  };
};

const getById = async (id) => {
  const result = await query(
    `SELECT l.*, s.name as subject_name, u.full_name as created_by_name
     FROM lessons l
     LEFT JOIN subjects s ON l.subject_id = s.id
     LEFT JOIN users u ON l.created_by = u.id
     WHERE l.id = $1`,
    [id]
  );

  if (result.rows.length === 0) return null;

  const lesson = result.rows[0];

  const attachments = await query(
    'SELECT * FROM lesson_attachments WHERE lesson_id = $1 ORDER BY uploaded_at DESC',
    [id]
  );
  lesson.attachments = attachments.rows;

  return lesson;
};

const create = async (data) => {
  const { title, subject_id, content, youtube_url, drive_url, order_index, created_by } = data;
  const result = await query(
    `INSERT INTO lessons (title, subject_id, content, youtube_url, drive_url, order_index, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [title, subject_id, content, youtube_url, drive_url, order_index, created_by]
  );
  return result.rows[0];
};

const update = async (id, data) => {
  const { title, subject_id, content, youtube_url, drive_url, order_index } = data;
  const result = await query(
    `UPDATE lessons SET
       title = COALESCE($1, title),
       subject_id = COALESCE($2, subject_id),
       content = COALESCE($3, content),
       youtube_url = COALESCE($4, youtube_url),
       drive_url = COALESCE($5, drive_url),
       order_index = COALESCE($6, order_index),
       updated_at = NOW()
     WHERE id = $7
     RETURNING *`,
    [title, subject_id, content, youtube_url, drive_url, order_index, id]
  );
  return result.rows[0] || null;
};

const remove = async (id) => {
  const result = await query('DELETE FROM lessons WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
};

const addAttachment = async (lessonId, fileData) => {
  const { file_name, file_url, file_type, file_size } = fileData;
  const result = await query(
    `INSERT INTO lesson_attachments (lesson_id, file_name, file_url, file_type, file_size)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [lessonId, file_name, file_url, file_type, file_size]
  );
  return result.rows[0];
};

const removeAttachment = async (attachmentId) => {
  const result = await query(
    'DELETE FROM lesson_attachments WHERE id = $1 RETURNING *',
    [attachmentId]
  );
  return result.rows[0] || null;
};

module.exports = { getAll, getById, create, update, remove, addAttachment, removeAttachment };
