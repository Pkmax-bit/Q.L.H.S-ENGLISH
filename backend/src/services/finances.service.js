const { supabase } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['amount', 'payment_date', 'type', 'category', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const typeFilter = queryParams.type || null;
  const categoryFilter = queryParams.category || null;
  const startDate = queryParams.start_date || null;
  const endDate = queryParams.end_date || null;
  const statusFilter = queryParams.status || null;

  // Count query
  let countQuery = supabase.from('finances').select('id', { count: 'exact', head: true });
  if (search) {
    countQuery = countQuery.or(`description.ilike.%${search}%,category.ilike.%${search}%`);
  }
  if (typeFilter) {
    countQuery = countQuery.eq('type', typeFilter);
  }
  if (categoryFilter) {
    countQuery = countQuery.eq('category', categoryFilter);
  }
  if (statusFilter) {
    countQuery = countQuery.eq('status', statusFilter);
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
      profiles!finances_created_by_fkey(full_name)
    `);

  if (search) {
    dataQuery = dataQuery.or(`description.ilike.%${search}%,category.ilike.%${search}%`);
  }
  if (typeFilter) {
    dataQuery = dataQuery.eq('type', typeFilter);
  }
  if (categoryFilter) {
    dataQuery = dataQuery.eq('category', categoryFilter);
  }
  if (statusFilter) {
    dataQuery = dataQuery.eq('status', statusFilter);
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
    const { profiles, ...rest } = row;
    return {
      ...rest,
      created_by_name: profiles?.full_name || null,
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
      profiles!finances_created_by_fkey(full_name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const { profiles, ...rest } = data;
  return {
    ...rest,
    created_by_name: profiles?.full_name || null,
  };
};

const create = async (data) => {
  const { type, category, amount, description, reference_type, reference_id, payment_date, payment_method, status, created_by } = data;
  const { data: row, error } = await supabase
    .from('finances')
    .insert({
      type,
      category,
      amount,
      description,
      reference_type,
      reference_id,
      payment_date,
      payment_method,
      status: status || 'completed',
      created_by,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
};

const update = async (id, data) => {
  const { type, category, amount, description, reference_type, reference_id, payment_date, payment_method, status } = data;

  const updateObj = {};
  if (type !== undefined) updateObj.type = type;
  if (category !== undefined) updateObj.category = category;
  if (amount !== undefined) updateObj.amount = amount;
  if (description !== undefined) updateObj.description = description;
  if (reference_type !== undefined) updateObj.reference_type = reference_type;
  if (reference_id !== undefined) updateObj.reference_id = reference_id;
  if (payment_date !== undefined) updateObj.payment_date = payment_date;
  if (payment_method !== undefined) updateObj.payment_method = payment_method;
  if (status !== undefined) updateObj.status = status;
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

const getSummary = async (startDate, endDate) => {
  let query = supabase
    .from('finances')
    .select('type, amount, category');

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

    const catKey = `${row.category || 'Uncategorized'}|${row.type}`;
    if (!categoryTotals[catKey]) {
      categoryTotals[catKey] = {
        name: row.category || 'Uncategorized',
        type: row.type,
        total: 0,
      };
    }
    categoryTotals[catKey].total += amount;
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
    .select('type, category, amount, description, payment_date, payment_method, status')
    .order('payment_date', { ascending: false });

  if (search) {
    query = query.or(`description.ilike.%${search}%,category.ilike.%${search}%`);
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
  return data || [];
};

module.exports = {
  getAll, getById, create, update, remove,
  getSummary, getAllForExport,
};
