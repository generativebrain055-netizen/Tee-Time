/**
 * Repository Migration Template
 * Use this as a guide to migrate remaining repositories to Supabase REST API
 */

const { supabaseAdmin, handleError } = require("../config/supabase");

// ============================================================================
// BASIC CRUD OPERATIONS
// ============================================================================

// CREATE
const create = async (data) => {
  try {
    const { data: result, error } = await supabaseAdmin
      .from("table_name")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  } catch (error) {
    handleError(error, "create");
  }
};

// READ - Single record
const findById = async (id) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("table_name")
      .select("*")
      .eq("id", id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
    return data || null;
  } catch (error) {
    handleError(error, "findById");
  }
};

// READ - Multiple records with filters
const findMany = async (filters = {}) => {
  try {
    let query = supabaseAdmin.from("table_name").select("*");

    // Apply filters
    if (filters.userId) query = query.eq("user_id", filters.userId);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.limit) query = query.limit(filters.limit);

    // Ordering
    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    handleError(error, "findMany");
  }
};

// UPDATE
const update = async (id, updates) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("table_name")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleError(error, "update");
  }
};

// DELETE
const deleteRecord = async (id) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("table_name")
      .delete()
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleError(error, "delete");
  }
};

// ============================================================================
// JOINS / FOREIGN KEY RELATIONSHIPS
// ============================================================================

const findWithRelations = async (id) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("table_name")
      .select(`
        *,
        related_table (
          id,
          name,
          other_field
        )
      `)
      .eq("id", id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    handleError(error, "findWithRelations");
  }
};

// ============================================================================
// COMPLEX QUERIES
// ============================================================================

// Counting
const count = async (filters = {}) => {
  try {
    let query = supabaseAdmin
      .from("table_name")
      .select("*", { count: 'exact', head: true });

    if (filters.status) query = query.eq("status", filters.status);

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  } catch (error) {
    handleError(error, "count");
  }
};

// Filtering with OR conditions
const findWithOrConditions = async (value1, value2) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("table_name")
      .select("*")
      .or(`field1.eq.${value1},field2.eq.${value2}`);

    if (error) throw error;
    return data || [];
  } catch (error) {
    handleError(error, "findWithOrConditions");
  }
};

// Date range queries
const findByDateRange = async (startDate, endDate) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("table_name")
      .select("*")
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    handleError(error, "findByDateRange");
  }
};

// ============================================================================
// TRANSACTIONS / ATOMIC OPERATIONS
// ============================================================================

/**
 * For complex atomic operations, create a PostgreSQL function:
 * 
 * CREATE OR REPLACE FUNCTION my_atomic_operation(
 *   p_param1 UUID,
 *   p_param2 TEXT
 * ) RETURNS JSON AS $$
 * DECLARE
 *   v_result JSON;
 * BEGIN
 *   -- Your transaction logic here
 *   -- Multiple INSERT/UPDATE/DELETE statements
 *   
 *   RETURN v_result;
 * END;
 * $$ LANGUAGE plpgsql;
 */

const atomicOperation = async (param1, param2) => {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('my_atomic_operation', {
        p_param1: param1,
        p_param2: param2
      });

    if (error) throw error;
    return data;
  } catch (error) {
    handleError(error, "atomicOperation");
  }
};

// ============================================================================
// BULK OPERATIONS
// ============================================================================

const bulkInsert = async (records) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("table_name")
      .insert(records)
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    handleError(error, "bulkInsert");
  }
};

const bulkUpdate = async (updates) => {
  try {
    // Note: Supabase doesn't support bulk updates with different values per row
    // You'll need to either:
    // 1. Loop and update individually
    // 2. Create a PostgreSQL function
    // 3. Use upsert with conflict resolution

    const promises = updates.map(({ id, data }) =>
      supabaseAdmin
        .from("table_name")
        .update(data)
        .eq("id", id)
    );

    await Promise.all(promises);
    return true;
  } catch (error) {
    handleError(error, "bulkUpdate");
  }
};

// ============================================================================
// COMMON PATTERNS
// ============================================================================

// Soft delete
const softDelete = async (id) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("table_name")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleError(error, "softDelete");
  }
};

// Check existence
const exists = async (field, value) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("table_name")
      .select("id", { count: 'exact', head: true })
      .eq(field, value);

    if (error) throw error;
    return data !== null;
  } catch (error) {
    handleError(error, "exists");
  }
};

// Pagination
const paginate = async (page = 1, pageSize = 20, filters = {}) => {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin
      .from("table_name")
      .select("*", { count: 'exact' })
      .range(from, to);

    if (filters.status) query = query.eq("status", filters.status);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    };
  } catch (error) {
    handleError(error, "paginate");
  }
};

module.exports = {
  create,
  findById,
  findMany,
  update,
  deleteRecord,
  findWithRelations,
  count,
  findWithOrConditions,
  findByDateRange,
  atomicOperation,
  bulkInsert,
  bulkUpdate,
  softDelete,
  exists,
  paginate,
};
