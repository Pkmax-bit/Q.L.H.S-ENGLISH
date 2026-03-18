const { query } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['name', 'status', 'start_date', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const statusFilter = queryParams.status || null;

  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramIdx = 1;

  if (search) {
    whereClause += ` AND (c.name ILIKE $${paramIdx} OR c.notes ILIKE $${paramIdx})`;
    params.push(`%${search}%`);
    paramIdx++;
  }

  if (statusFilter) {
    whereClause += ` AND c.status = $${paramIdx}`;
    params.push(statusFilter);
    paramIdx++;
  }

  const countResult = await query(`SELECT COUNT(*) FROM classes c ${whereClause}`, params);
  const total = parseInt(countResult.rows[0].count);

  const dataResult = await query(
    `SELECT c.*, s.name as subject_name, s.code as subject_code,
            t.full_name as homeroom_teacher_name,
            (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) as student_count
     FROM classes c
     LEFT JOIN subjects s ON c.subject_id = s.id
     LEFT JOIN teachers t ON c.homeroom_teacher_id = t.id
     ${whereClause}
     ORDER BY c.${sort} ${sortOrder}
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
    `SELECT c.*, s.name as subject_name, s.code as subject_code,
            t.full_name as homeroom_teacher_name,
            (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) as student_count
     FROM classes c
     LEFT JOIN subjects s ON c.subject_id = s.id
     LEFT JOIN teachers t ON c.homeroom_teacher_id = t.id
     WHERE c.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const create = async (data) => {
  const { name, subject_id, homeroom_teacher_id, max_students, status, start_date, end_date, notes } = data;
  const result = await query(
    `INSERT INTO classes (name, subject_id, homeroom_teacher_id, max_students, status, start_date, end_date, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [name, subject_id, homeroom_teacher_id, max_students || 30, status || 'active', start_date, end_date, notes]
  );
  return result.rows[0];
};

const update = async (id, data) => {
  const { name, subject_id, homeroom_teacher_id, max_students, status, start_date, end_date, notes } = data;
  const result = await query(
    `UPDATE classes SET
       name = COALESCE($1, name),
       subject_id = COALESCE($2, subject_id),
       homeroom_teacher_id = COALESCE($3, homeroom_teacher_id),
       max_students = COALESCE($4, max_students),
       status = COALESCE($5, status),
       start_date = COALESCE($6, start_date),
       end_date = COALESCE($7, end_date),
       notes = COALESCE($8, notes),
       updated_at = NOW()
     WHERE id = $9
     RETURNING *`,
    [name, subject_id, homeroom_teacher_id, max_students, status, start_date, end_date, notes, id]
  );
  return result.rows[0] || null;
};

const remove = async (id) => {
  const result = await query('DELETE FROM classes WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
};

const getStudents = async (classId) => {
  const result = await query(
    `SELECT s.*, cs.enrolled_at
     FROM class_students cs
     JOIN students s ON cs.student_id = s.id
     WHERE cs.class_id = $1
     ORDER BY s.full_name`,
    [classId]
  );
  return result.rows;
};

const addStudent = async (classId, studentId) => {
  const classInfo = await query(
    'SELECT max_students, (SELECT COUNT(*) FROM class_students WHERE class_id = $1) as current_count FROM classes WHERE id = $1',
    [classId]
  );
  if (classInfo.rows.length === 0) throw { statusCode: 404, message: 'Class not found' };
  if (parseInt(classInfo.rows[0].current_count) >= classInfo.rows[0].max_students) {
    throw { statusCode: 400, message: 'Class is full' };
  }

  const result = await query(
    'INSERT INTO class_students (class_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
    [classId, studentId]
  );
  return result.rows[0];
};

const removeStudent = async (classId, studentId) => {
  const result = await query(
    'DELETE FROM class_students WHERE class_id = $1 AND student_id = $2 RETURNING *',
    [classId, studentId]
  );
  return result.rows[0] || null;
};

const getTeachers = async (classId) => {
  const result = await query(
    `SELECT t.*, ct.role as class_role
     FROM class_teachers ct
     JOIN teachers t ON ct.teacher_id = t.id
     WHERE ct.class_id = $1
     ORDER BY t.full_name`,
    [classId]
  );
  return result.rows;
};

const addTeacher = async (classId, teacherId, role = 'instructor') => {
  const result = await query(
    'INSERT INTO class_teachers (class_id, teacher_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING *',
    [classId, teacherId, role]
  );
  return result.rows[0];
};

const removeTeacher = async (classId, teacherId) => {
  const result = await query(
    'DELETE FROM class_teachers WHERE class_id = $1 AND teacher_id = $2 RETURNING *',
    [classId, teacherId]
  );
  return result.rows[0] || null;
};

module.exports = {
  getAll, getById, create, update, remove,
  getStudents, addStudent, removeStudent,
  getTeachers, addTeacher, removeTeacher,
};
