const { query } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['name', 'capacity', 'status', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const facilityId = queryParams.facility_id || null;
  const statusFilter = queryParams.status || null;

  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramIdx = 1;

  if (search) {
    whereClause += ` AND (r.name ILIKE $${paramIdx} OR r.equipment ILIKE $${paramIdx})`;
    params.push(`%${search}%`);
    paramIdx++;
  }

  if (facilityId) {
    whereClause += ` AND r.facility_id = $${paramIdx}`;
    params.push(facilityId);
    paramIdx++;
  }

  if (statusFilter) {
    whereClause += ` AND r.status = $${paramIdx}`;
    params.push(statusFilter);
    paramIdx++;
  }

  const countResult = await query(`SELECT COUNT(*) FROM rooms r ${whereClause}`, params);
  const total = parseInt(countResult.rows[0].count);

  const dataResult = await query(
    `SELECT r.*, f.name as facility_name
     FROM rooms r
     JOIN facilities f ON r.facility_id = f.id
     ${whereClause}
     ORDER BY r.${sort} ${sortOrder}
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
    `SELECT r.*, f.name as facility_name
     FROM rooms r
     JOIN facilities f ON r.facility_id = f.id
     WHERE r.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const create = async (data) => {
  const { facility_id, name, capacity, equipment, status } = data;
  const result = await query(
    `INSERT INTO rooms (facility_id, name, capacity, equipment, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [facility_id, name, capacity, equipment, status || 'available']
  );
  return result.rows[0];
};

const update = async (id, data) => {
  const { facility_id, name, capacity, equipment, status } = data;
  const result = await query(
    `UPDATE rooms SET
       facility_id = COALESCE($1, facility_id),
       name = COALESCE($2, name),
       capacity = COALESCE($3, capacity),
       equipment = COALESCE($4, equipment),
       status = COALESCE($5, status),
       updated_at = NOW()
     WHERE id = $6
     RETURNING *`,
    [facility_id, name, capacity, equipment, status, id]
  );
  return result.rows[0] || null;
};

const remove = async (id) => {
  const result = await query('DELETE FROM rooms WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
};

module.exports = { getAll, getById, create, update, remove };
