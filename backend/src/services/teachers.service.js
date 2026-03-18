const { query } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['full_name', 'email', 'status', 'hire_date', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const statusFilter = queryParams.status || null;

  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramIdx = 1;

  if (search) {
    whereClause += ` AND (t.full_name ILIKE $${paramIdx} OR t.email ILIKE $${paramIdx} OR t.phone ILIKE $${paramIdx} OR t.specialization ILIKE $${paramIdx})`;
    params.push(`%${search}%`);
    paramIdx++;
  }

  if (statusFilter) {
    whereClause += ` AND t.status = $${paramIdx}`;
    params.push(statusFilter);
    paramIdx++;
  }

  const countResult = await query(`SELECT COUNT(*) FROM teachers t ${whereClause}`, params);
  const total = parseInt(countResult.rows[0].count);

  const dataResult = await query(
    `SELECT t.*, u.email as user_email
     FROM teachers t
     LEFT JOIN users u ON t.user_id = u.id
     ${whereClause}
     ORDER BY t.${sort} ${sortOrder}
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
    `SELECT t.*, u.email as user_email
     FROM teachers t
     LEFT JOIN users u ON t.user_id = u.id
     WHERE t.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const create = async (data) => {
  const { full_name, phone, email, specialization, status, salary, hire_date, notes, user_id } = data;
  const result = await query(
    `INSERT INTO teachers (full_name, phone, email, specialization, status, salary, hire_date, notes, user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [full_name, phone, email, specialization, status || 'active', salary, hire_date, notes, user_id]
  );
  return result.rows[0];
};

const update = async (id, data) => {
  const { full_name, phone, email, specialization, status, salary, hire_date, notes } = data;
  const result = await query(
    `UPDATE teachers SET
       full_name = COALESCE($1, full_name),
       phone = COALESCE($2, phone),
       email = COALESCE($3, email),
       specialization = COALESCE($4, specialization),
       status = COALESCE($5, status),
       salary = COALESCE($6, salary),
       hire_date = COALESCE($7, hire_date),
       notes = COALESCE($8, notes),
       updated_at = NOW()
     WHERE id = $9
     RETURNING *`,
    [full_name, phone, email, specialization, status, salary, hire_date, notes, id]
  );
  return result.rows[0] || null;
};

const remove = async (id) => {
  const result = await query('DELETE FROM teachers WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
};

const getClasses = async (teacherId) => {
  const result = await query(
    `SELECT c.*, ct.role as teacher_role, s.name as subject_name
     FROM class_teachers ct
     JOIN classes c ON ct.class_id = c.id
     LEFT JOIN subjects s ON c.subject_id = s.id
     WHERE ct.teacher_id = $1
     ORDER BY c.created_at DESC`,
    [teacherId]
  );
  return result.rows;
};

const getSchedule = async (teacherId) => {
  const result = await query(
    `SELECT ss.*, s.name as schedule_name, r.name as room_name,
            sub.name as subject_name, sc.name as class_name
     FROM schedule_slots ss
     JOIN schedules s ON ss.schedule_id = s.id
     JOIN classes sc ON s.class_id = sc.id
     LEFT JOIN rooms r ON ss.room_id = r.id
     LEFT JOIN subjects sub ON ss.subject_id = sub.id
     WHERE ss.teacher_id = $1 AND s.is_active = true
     ORDER BY ss.day_of_week, ss.start_time`,
    [teacherId]
  );
  return result.rows;
};

const getAllForExport = async (queryParams) => {
  const { search } = parsePagination(queryParams);
  let whereClause = 'WHERE 1=1';
  const params = [];

  if (search) {
    whereClause += ` AND (t.full_name ILIKE $1 OR t.email ILIKE $1 OR t.specialization ILIKE $1)`;
    params.push(`%${search}%`);
  }

  const result = await query(
    `SELECT t.full_name, t.email, t.phone, t.specialization, t.status, t.salary, t.hire_date
     FROM teachers t ${whereClause}
     ORDER BY t.full_name`,
    params
  );
  return result.rows;
};

module.exports = { getAll, getById, create, update, remove, getClasses, getSchedule, getAllForExport };
