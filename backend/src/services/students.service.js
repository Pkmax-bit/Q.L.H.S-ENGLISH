const { query } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['full_name', 'email', 'enrollment_date', 'status', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const statusFilter = queryParams.status || null;

  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramIdx = 1;

  if (search) {
    whereClause += ` AND (full_name ILIKE $${paramIdx} OR email ILIKE $${paramIdx} OR phone ILIKE $${paramIdx} OR parent_name ILIKE $${paramIdx})`;
    params.push(`%${search}%`);
    paramIdx++;
  }

  if (statusFilter) {
    whereClause += ` AND status = $${paramIdx}`;
    params.push(statusFilter);
    paramIdx++;
  }

  const countResult = await query(`SELECT COUNT(*) FROM students ${whereClause}`, params);
  const total = parseInt(countResult.rows[0].count);

  const dataResult = await query(
    `SELECT * FROM students ${whereClause}
     ORDER BY ${sort} ${sortOrder}
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset]
  );

  return {
    data: dataResult.rows,
    pagination: buildPaginationResponse(total, page, limit),
  };
};

const getById = async (id) => {
  const result = await query('SELECT * FROM students WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const create = async (data) => {
  const {
    full_name, date_of_birth, gender, phone, parent_phone,
    parent_name, email, address, enrollment_date, status, notes,
  } = data;
  const result = await query(
    `INSERT INTO students (full_name, date_of_birth, gender, phone, parent_phone, parent_name, email, address, enrollment_date, status, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [full_name, date_of_birth, gender, phone, parent_phone, parent_name, email, address, enrollment_date, status || 'active', notes]
  );
  return result.rows[0];
};

const update = async (id, data) => {
  const {
    full_name, date_of_birth, gender, phone, parent_phone,
    parent_name, email, address, enrollment_date, status, notes,
  } = data;
  const result = await query(
    `UPDATE students SET
       full_name = COALESCE($1, full_name),
       date_of_birth = COALESCE($2, date_of_birth),
       gender = COALESCE($3, gender),
       phone = COALESCE($4, phone),
       parent_phone = COALESCE($5, parent_phone),
       parent_name = COALESCE($6, parent_name),
       email = COALESCE($7, email),
       address = COALESCE($8, address),
       enrollment_date = COALESCE($9, enrollment_date),
       status = COALESCE($10, status),
       notes = COALESCE($11, notes),
       updated_at = NOW()
     WHERE id = $12
     RETURNING *`,
    [full_name, date_of_birth, gender, phone, parent_phone, parent_name, email, address, enrollment_date, status, notes, id]
  );
  return result.rows[0] || null;
};

const remove = async (id) => {
  const result = await query('DELETE FROM students WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
};

const getClasses = async (studentId) => {
  const result = await query(
    `SELECT c.*, cs.enrolled_at, s.name as subject_name, t.full_name as teacher_name
     FROM class_students cs
     JOIN classes c ON cs.class_id = c.id
     LEFT JOIN subjects s ON c.subject_id = s.id
     LEFT JOIN teachers t ON c.homeroom_teacher_id = t.id
     WHERE cs.student_id = $1
     ORDER BY c.created_at DESC`,
    [studentId]
  );
  return result.rows;
};

const getAllForExport = async (queryParams) => {
  const { search } = parsePagination(queryParams);
  let whereClause = 'WHERE 1=1';
  const params = [];

  if (search) {
    whereClause += ` AND (full_name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1)`;
    params.push(`%${search}%`);
  }

  const result = await query(
    `SELECT full_name, date_of_birth, gender, phone, parent_phone, parent_name, email, address, enrollment_date, status
     FROM students ${whereClause}
     ORDER BY full_name`,
    params
  );
  return result.rows;
};

module.exports = { getAll, getById, create, update, remove, getClasses, getAllForExport };
