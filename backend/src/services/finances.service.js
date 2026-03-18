const { query } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['amount', 'payment_date', 'type', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const typeFilter = queryParams.type || null;
  const categoryId = queryParams.category_id || null;
  const startDate = queryParams.start_date || null;
  const endDate = queryParams.end_date || null;

  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramIdx = 1;

  if (search) {
    whereClause += ` AND (f.description ILIKE $${paramIdx} OR fc.name ILIKE $${paramIdx})`;
    params.push(`%${search}%`);
    paramIdx++;
  }

  if (typeFilter) {
    whereClause += ` AND f.type = $${paramIdx}`;
    params.push(typeFilter);
    paramIdx++;
  }

  if (categoryId) {
    whereClause += ` AND f.category_id = $${paramIdx}`;
    params.push(categoryId);
    paramIdx++;
  }

  if (startDate) {
    whereClause += ` AND f.payment_date >= $${paramIdx}`;
    params.push(startDate);
    paramIdx++;
  }

  if (endDate) {
    whereClause += ` AND f.payment_date <= $${paramIdx}`;
    params.push(endDate);
    paramIdx++;
  }

  const countResult = await query(
    `SELECT COUNT(*) FROM finances f LEFT JOIN finance_categories fc ON f.category_id = fc.id ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  const dataResult = await query(
    `SELECT f.*, fc.name as category_name, fc.type as category_type, u.full_name as created_by_name
     FROM finances f
     LEFT JOIN finance_categories fc ON f.category_id = fc.id
     LEFT JOIN users u ON f.created_by = u.id
     ${whereClause}
     ORDER BY f.${sort} ${sortOrder}
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
    `SELECT f.*, fc.name as category_name, u.full_name as created_by_name
     FROM finances f
     LEFT JOIN finance_categories fc ON f.category_id = fc.id
     LEFT JOIN users u ON f.created_by = u.id
     WHERE f.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const create = async (data) => {
  const { type, category_id, amount, description, reference_type, reference_id, payment_date, payment_method, receipt_url, created_by } = data;
  const result = await query(
    `INSERT INTO finances (type, category_id, amount, description, reference_type, reference_id, payment_date, payment_method, receipt_url, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [type, category_id, amount, description, reference_type, reference_id, payment_date, payment_method, receipt_url, created_by]
  );
  return result.rows[0];
};

const update = async (id, data) => {
  const { type, category_id, amount, description, reference_type, reference_id, payment_date, payment_method, receipt_url } = data;
  const result = await query(
    `UPDATE finances SET
       type = COALESCE($1, type),
       category_id = COALESCE($2, category_id),
       amount = COALESCE($3, amount),
       description = COALESCE($4, description),
       reference_type = COALESCE($5, reference_type),
       reference_id = COALESCE($6, reference_id),
       payment_date = COALESCE($7, payment_date),
       payment_method = COALESCE($8, payment_method),
       receipt_url = COALESCE($9, receipt_url),
       updated_at = NOW()
     WHERE id = $10
     RETURNING *`,
    [type, category_id, amount, description, reference_type, reference_id, payment_date, payment_method, receipt_url, id]
  );
  return result.rows[0] || null;
};

const remove = async (id) => {
  const result = await query('DELETE FROM finances WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
};

const getCategories = async (typeFilter) => {
  let sql = 'SELECT * FROM finance_categories WHERE is_active = true';
  const params = [];
  if (typeFilter) {
    sql += ' AND type = $1';
    params.push(typeFilter);
  }
  sql += ' ORDER BY name';
  const result = await query(sql, params);
  return result.rows;
};

const createCategory = async (data) => {
  const { name, type, description, is_active } = data;
  const result = await query(
    'INSERT INTO finance_categories (name, type, description, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, type, description, is_active !== undefined ? is_active : true]
  );
  return result.rows[0];
};

const updateCategory = async (id, data) => {
  const { name, type, description, is_active } = data;
  const result = await query(
    `UPDATE finance_categories SET
       name = COALESCE($1, name),
       type = COALESCE($2, type),
       description = COALESCE($3, description),
       is_active = COALESCE($4, is_active)
     WHERE id = $5
     RETURNING *`,
    [name, type, description, is_active, id]
  );
  return result.rows[0] || null;
};

const removeCategory = async (id) => {
  const result = await query('DELETE FROM finance_categories WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
};

const getSummary = async (startDate, endDate) => {
  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramIdx = 1;

  if (startDate) {
    whereClause += ` AND payment_date >= $${paramIdx}`;
    params.push(startDate);
    paramIdx++;
  }

  if (endDate) {
    whereClause += ` AND payment_date <= $${paramIdx}`;
    params.push(endDate);
    paramIdx++;
  }

  const result = await query(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as net_balance,
       COUNT(*) as total_transactions
     FROM finances ${whereClause}`,
    params
  );

  const byCategory = await query(
    `SELECT fc.name, fc.type, COALESCE(SUM(f.amount), 0) as total
     FROM finances f
     JOIN finance_categories fc ON f.category_id = fc.id
     ${whereClause.replace(/payment_date/g, 'f.payment_date')}
     GROUP BY fc.name, fc.type
     ORDER BY total DESC`,
    params
  );

  return {
    ...result.rows[0],
    by_category: byCategory.rows,
  };
};

const getAllForExport = async (queryParams) => {
  const { search } = parsePagination(queryParams);
  const typeFilter = queryParams.type || null;
  const startDate = queryParams.start_date || null;
  const endDate = queryParams.end_date || null;

  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramIdx = 1;

  if (search) {
    whereClause += ` AND (f.description ILIKE $${paramIdx})`;
    params.push(`%${search}%`);
    paramIdx++;
  }

  if (typeFilter) {
    whereClause += ` AND f.type = $${paramIdx}`;
    params.push(typeFilter);
    paramIdx++;
  }

  if (startDate) {
    whereClause += ` AND f.payment_date >= $${paramIdx}`;
    params.push(startDate);
    paramIdx++;
  }

  if (endDate) {
    whereClause += ` AND f.payment_date <= $${paramIdx}`;
    params.push(endDate);
    paramIdx++;
  }

  const result = await query(
    `SELECT f.type, fc.name as category, f.amount, f.description, f.payment_date, f.payment_method
     FROM finances f
     LEFT JOIN finance_categories fc ON f.category_id = fc.id
     ${whereClause}
     ORDER BY f.payment_date DESC`,
    params
  );
  return result.rows;
};

module.exports = {
  getAll, getById, create, update, remove,
  getCategories, createCategory, updateCategory, removeCategory,
  getSummary, getAllForExport,
};
