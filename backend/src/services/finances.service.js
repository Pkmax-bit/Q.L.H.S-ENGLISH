const { supabase } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['amount', 'payment_date', 'type', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const typeFilter = queryParams.type || null;
  const categoryId = queryParams.category_id || null;
  const startDate = queryParams.start_date || null;
  const endDate = queryParams.end_date || null;

  // Count query
  let countQuery = supabase.from('finances').select('id', { count: 'exact', head: true });
  if (search) {
    countQuery = countQuery.ilike('description', `%${search}%`);
  }
  if (typeFilter) {
    countQuery = countQuery.eq('type', typeFilter);
  }
  if (categoryId) {
    countQuery = countQuery.eq('category_id', categoryId);
  }
  if (startDate) {
    countQuery = countQuery.gte('payment_date', startDate);
  }
  if (endDate) {
    countQuery = countQuery.lte('payment_date', endDate);
  }
  const { count: total, error: countError } = await countQuery;
  if (countError) throw countError;

  // Data query
  let dataQuery = supabase
    .from('finances')
    .select(`
      *,
      finance_categories(name, type),
      users!finances_created_by_fkey(full_name)
    `);

  if (search) {
    dataQuery = dataQuery.ilike('description', `%${search}%`);
  }
  if (typeFilter) {
    dataQuery = dataQuery.eq('type', typeFilter);
  }
  if (categoryId) {
    dataQuery = dataQuery.eq('category_id', categoryId);
  }
  if (startDate) {
    dataQuery = dataQuery.gte('payment_date', startDate);
  }
  if (endDate) {
    dataQuery = dataQuery.lte('payment_date', endDate);
  }

  dataQuery = dataQuery
    .order(sort, { ascending: sortOrder === 'ASC' })
    .range(offset, offset + limit - 1);

  const { data, error } = await dataQuery;
  if (error) throw error;

  const rows = (data || []).map(row => {
    const { finance_categories, users, ...rest } = row;
    return {
      ...rest,
      category_name: finance_categories?.name || null,
      category_type: finance_categories?.type || null,
      created_by_name: users?.full_name || null,
    };
  });

  return {
    data: rows,
    pagination: buildPaginationResponse(total || 0, page, limit),
  };
};

const getById = async (id) => {
  const { data, error } = await supabase
    .from('finances')
    .select(`
      *,
      finance_categories(name),
      users!finances_created_by_fkey(full_name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const { finance_categories, users, ...rest } = data;
  return {
    ...rest,
    category_name: finance_categories?.name || null,
    created_by_name: users?.full_name || null,
  };
};

const create = async (data) => {
  const { type, category_id, amount, description, reference_type, reference_id, payment_date, payment_method, receipt_url, created_by } = data;
  const { data: row, error } = await supabase
    .from('finances')
    .insert({
      type,
      category_id,
      amount,
      description,
      reference_type,
      reference_id,
      payment_date,
      payment_method,
      receipt_url,
      created_by,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
};

const update = async (id, data) => {
  const { type, category_id, amount, description, reference_type, reference_id, payment_date, payment_method, receipt_url } = data;

  const updateObj = {};
  if (type !== undefined) updateObj.type = type;
  if (category_id !== undefined) updateObj.category_id = category_id;
  if (amount !== undefined) updateObj.amount = amount;
  if (description !== undefined) updateObj.description = description;
  if (reference_type !== undefined) updateObj.reference_type = reference_type;
  if (reference_id !== undefined) updateObj.reference_id = reference_id;
  if (payment_date !== undefined) updateObj.payment_date = payment_date;
  if (payment_method !== undefined) updateObj.payment_method = payment_method;
  if (receipt_url !== undefined) updateObj.receipt_url = receipt_url;
  updateObj.updated_at = new Date().toISOString();

  const { data: row, error } = await supabase
    .from('finances')
    .update(updateObj)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return row;
};

const remove = async (id) => {
  const { data, error } = await supabase
    .from('finances')
    .delete()
    .eq('id', id)
    .select('id')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

const getCategories = async (typeFilter) => {
  let query = supabase
    .from('finance_categories')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (typeFilter) {
    query = query.eq('type', typeFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

const createCategory = async (data) => {
  const { name, type, description, is_active } = data;
  const { data: row, error } = await supabase
    .from('finance_categories')
    .insert({
      name,
      type,
      description,
      is_active: is_active !== undefined ? is_active : true,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
};

const updateCategory = async (id, data) => {
  const { name, type, description, is_active } = data;

  const updateObj = {};
  if (name !== undefined) updateObj.name = name;
  if (type !== undefined) updateObj.type = type;
  if (description !== undefined) updateObj.description = description;
  if (is_active !== undefined) updateObj.is_active = is_active;

  const { data: row, error } = await supabase
    .from('finance_categories')
    .update(updateObj)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return row;
};

const removeCategory = async (id) => {
  const { data, error } = await supabase
    .from('finance_categories')
    .delete()
    .eq('id', id)
    .select('id')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

const getSummary = async (startDate, endDate) => {
  // Get all finances within date range for aggregation
  let query = supabase
    .from('finances')
    .select('type, amount, category_id, finance_categories(name, type)');

  if (startDate) {
    query = query.gte('payment_date', startDate);
  }
  if (endDate) {
    query = query.lte('payment_date', endDate);
  }

  const { data, error } = await query;
  if (error) throw error;

  let totalIncome = 0;
  let totalExpense = 0;
  let totalTransactions = 0;
  const categoryTotals = {};

  for (const row of (data || [])) {
    totalTransactions++;
    const amount = parseFloat(row.amount) || 0;

    if (row.type === 'income') {
      totalIncome += amount;
    } else {
      totalExpense += amount;
    }

    if (row.finance_categories) {
      const catKey = `${row.finance_categories.name}|${row.finance_categories.type}`;
      if (!categoryTotals[catKey]) {
        categoryTotals[catKey] = {
          name: row.finance_categories.name,
          type: row.finance_categories.type,
          total: 0,
        };
      }
      categoryTotals[catKey].total += amount;
    }
  }

  const byCategory = Object.values(categoryTotals).sort((a, b) => b.total - a.total);

  return {
    total_income: totalIncome,
    total_expense: totalExpense,
    net_balance: totalIncome - totalExpense,
    total_transactions: totalTransactions,
    by_category: byCategory,
  };
};

const getAllForExport = async (queryParams) => {
  const { search } = parsePagination(queryParams);
  const typeFilter = queryParams.type || null;
  const startDate = queryParams.start_date || null;
  const endDate = queryParams.end_date || null;

  let query = supabase
    .from('finances')
    .select(`
      type, amount, description, payment_date, payment_method,
      finance_categories(name)
    `)
    .order('payment_date', { ascending: false });

  if (search) {
    query = query.ilike('description', `%${search}%`);
  }
  if (typeFilter) {
    query = query.eq('type', typeFilter);
  }
  if (startDate) {
    query = query.gte('payment_date', startDate);
  }
  if (endDate) {
    query = query.lte('payment_date', endDate);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(row => {
    const { finance_categories, ...rest } = row;
    return {
      ...rest,
      category: finance_categories?.name || null,
    };
  });
};

module.exports = {
  getAll, getById, create, update, remove,
  getCategories, createCategory, updateCategory, removeCategory,
  getSummary, getAllForExport,
};
