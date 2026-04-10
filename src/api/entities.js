import { supabase } from './supabaseClient';

/**
 * createEntity - Factory function for generating CRUD operations for a database table
 * 
 * Each entity gets: list(), filter(), create(), update(), delete(), subscribe()
 * This abstraction keeps the UI layer decoupled from Supabase's direct API.
 * 
 * @param {string} tableName - Name of the database table in Supabase
 * @returns {object} Entity with CRUD methods
 */
const createEntity = (tableName) => ({
  list: async () => {
    // SELECT * from table - returns all records (careful with large tables)
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) throw error;
    return data;
  },

  filter: async (filters, orderBy = null, limit = null) => {
    // SELECT * with WHERE clauses, optional ORDER BY and LIMIT
    let query = supabase.from(tableName).select('*');
    
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);  // Convert each filter to equality condition
    });

    if (orderBy) {
      query = query.order(orderBy, { ascending: true });
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  create: async (record) => {
    // INSERT new record and return the created row
    const { data, error } = await supabase.from(tableName).insert(record).select().single();
    if (error) throw error;
    return data;
  },

  update: async (id, record) => {
    // UPDATE by ID and return the updated row
    const { data, error } = await supabase.from(tableName).update(record).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    // DELETE by ID - Supabase returns empty on success
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  subscribe: (callback) => {
    // Real-time subscription to database changes (INSERT/UPDATE/DELETE)
    const channel = supabase
      .channel(`${tableName}_changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, callback)
      .subscribe();
    
    // Return cleanup function to unsubscribe
    return () => supabase.removeChannel(channel);
  }
});

export const entities = {
  Workspace: createEntity('workspaces'),
  Task: createEntity('tasks'),
  Page: createEntity('pages'),
  Conversation: createEntity('conversations'),
  Message: createEntity('messages'),
};
