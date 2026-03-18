const { query } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['title', 'type', 'total_points', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const subjectId = queryParams.subject_id || null;
  const typeFilter = queryParams.type || null;

  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramIdx = 1;

  if (search) {
    whereClause += ` AND (a.title ILIKE $${paramIdx} OR a.content ILIKE $${paramIdx})`;
    params.push(`%${search}%`);
    paramIdx++;
  }

  if (subjectId) {
    whereClause += ` AND a.subject_id = $${paramIdx}`;
    params.push(subjectId);
    paramIdx++;
  }

  if (typeFilter) {
    whereClause += ` AND a.type = $${paramIdx}`;
    params.push(typeFilter);
    paramIdx++;
  }

  const countResult = await query(`SELECT COUNT(*) FROM assignments a ${whereClause}`, params);
  const total = parseInt(countResult.rows[0].count);

  const dataResult = await query(
    `SELECT a.*, s.name as subject_name, u.full_name as created_by_name,
            (SELECT COUNT(*) FROM assignment_questions aq WHERE aq.assignment_id = a.id) as question_count
     FROM assignments a
     LEFT JOIN subjects s ON a.subject_id = s.id
     LEFT JOIN users u ON a.created_by = u.id
     ${whereClause}
     ORDER BY a.${sort} ${sortOrder}
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
    `SELECT a.*, s.name as subject_name, u.full_name as created_by_name
     FROM assignments a
     LEFT JOIN subjects s ON a.subject_id = s.id
     LEFT JOIN users u ON a.created_by = u.id
     WHERE a.id = $1`,
    [id]
  );

  if (result.rows.length === 0) return null;

  const assignment = result.rows[0];

  const questions = await query(
    'SELECT * FROM assignment_questions WHERE assignment_id = $1 ORDER BY order_index',
    [id]
  );

  for (const question of questions.rows) {
    const options = await query(
      'SELECT * FROM question_options WHERE question_id = $1 ORDER BY order_index',
      [question.id]
    );
    question.options = options.rows;
  }
  assignment.questions = questions.rows;

  const attachments = await query(
    'SELECT * FROM assignment_attachments WHERE assignment_id = $1 ORDER BY uploaded_at DESC',
    [id]
  );
  assignment.attachments = attachments.rows;

  return assignment;
};

const create = async (data) => {
  const { title, subject_id, type, content, youtube_url, drive_url, total_points, created_by } = data;
  const result = await query(
    `INSERT INTO assignments (title, subject_id, type, content, youtube_url, drive_url, total_points, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [title, subject_id, type, content, youtube_url, drive_url, total_points, created_by]
  );
  return result.rows[0];
};

const update = async (id, data) => {
  const { title, subject_id, type, content, youtube_url, drive_url, total_points } = data;
  const result = await query(
    `UPDATE assignments SET
       title = COALESCE($1, title),
       subject_id = COALESCE($2, subject_id),
       type = COALESCE($3, type),
       content = COALESCE($4, content),
       youtube_url = COALESCE($5, youtube_url),
       drive_url = COALESCE($6, drive_url),
       total_points = COALESCE($7, total_points),
       updated_at = NOW()
     WHERE id = $8
     RETURNING *`,
    [title, subject_id, type, content, youtube_url, drive_url, total_points, id]
  );
  return result.rows[0] || null;
};

const remove = async (id) => {
  const result = await query('DELETE FROM assignments WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
};

const addQuestion = async (assignmentId, data) => {
  const { question_text, type, points, order_index } = data;
  const result = await query(
    `INSERT INTO assignment_questions (assignment_id, question_text, type, points, order_index)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [assignmentId, question_text, type, points, order_index]
  );
  return result.rows[0];
};

const updateQuestion = async (questionId, data) => {
  const { question_text, type, points, order_index } = data;
  const result = await query(
    `UPDATE assignment_questions SET
       question_text = COALESCE($1, question_text),
       type = COALESCE($2, type),
       points = COALESCE($3, points),
       order_index = COALESCE($4, order_index)
     WHERE id = $5
     RETURNING *`,
    [question_text, type, points, order_index, questionId]
  );
  return result.rows[0] || null;
};

const removeQuestion = async (questionId) => {
  const result = await query('DELETE FROM assignment_questions WHERE id = $1 RETURNING id', [questionId]);
  return result.rows[0] || null;
};

const addOption = async (questionId, data) => {
  const { option_text, is_correct, order_index } = data;
  const result = await query(
    `INSERT INTO question_options (question_id, option_text, is_correct, order_index)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [questionId, option_text, is_correct || false, order_index]
  );
  return result.rows[0];
};

const updateOption = async (optionId, data) => {
  const { option_text, is_correct, order_index } = data;
  const result = await query(
    `UPDATE question_options SET
       option_text = COALESCE($1, option_text),
       is_correct = COALESCE($2, is_correct),
       order_index = COALESCE($3, order_index)
     WHERE id = $4
     RETURNING *`,
    [option_text, is_correct, order_index, optionId]
  );
  return result.rows[0] || null;
};

const removeOption = async (optionId) => {
  const result = await query('DELETE FROM question_options WHERE id = $1 RETURNING id', [optionId]);
  return result.rows[0] || null;
};

const addAttachment = async (assignmentId, fileData) => {
  const { file_name, file_url, file_type, file_size } = fileData;
  const result = await query(
    `INSERT INTO assignment_attachments (assignment_id, file_name, file_url, file_type, file_size)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [assignmentId, file_name, file_url, file_type, file_size]
  );
  return result.rows[0];
};

const removeAttachment = async (attachmentId) => {
  const result = await query('DELETE FROM assignment_attachments WHERE id = $1 RETURNING *', [attachmentId]);
  return result.rows[0] || null;
};

module.exports = {
  getAll, getById, create, update, remove,
  addQuestion, updateQuestion, removeQuestion,
  addOption, updateOption, removeOption,
  addAttachment, removeAttachment,
};
