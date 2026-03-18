const { query } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['name', 'code', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';

  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramIdx = 1;

  if (search) {
    whereClause += ` AND (name ILIKE $${paramIdx} OR code ILIKE $${paramIdx} OR description ILIKE $${paramIdx})`;
    params.push(`%${search}%`);
    paramIdx++;
  }

  if (queryParams.is_active !== undefined) {
    whereClause += ` AND is_active = $${paramIdx}`;
    params.push(queryParams.is_active === 'true');
    paramIdx++;
  }

  const countResult = await query(`SELECT COUNT(*) FROM subjects ${whereClause}`, params);
  const total = parseInt(countResult.rows[0].count);

  const dataResult = await query(
    `SELECT * FROM subjects ${whereClause}
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
  const result = await query('SELECT * FROM subjects WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const create = async (data) => {
  const { code, name, description, is_active } = data;
  const result = await query(
    'INSERT INTO subjects (code, name, description, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
    [code, name, description, is_active !== undefined ? is_active : true]
  );
  return result.rows[0];
};

const update = async (id, data) => {
  const { code, name, description, is_active } = data;
  const result = await query(
    `UPDATE subjects SET
       code = COALESCE($1, code),
       name = COALESCE($2, name),
       description = COALESCE($3, description),
       is_active = COALESCE($4, is_active),
       updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [code, name, description, is_active, id]
  );
  return result.rows[0] || null;
};

const remove = async (id) => {
  const result = await query('DELETE FROM subjects WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
};

module.exports = { getAll, getById, create, update, remove };
