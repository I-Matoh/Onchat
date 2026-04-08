import { supabase } from './supabaseClient';

const createEntity = (tableName) => ({
  list: async () => {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) throw error;
    return data;
  },

  filter: async (filters, orderBy = null, limit = null) => {
    let query = supabase.from(tableName).select('*');
    
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
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
    const { data, error } = await supabase.from(tableName).insert(record).select().single();
    if (error) throw error;
    return data;
  },

  update: async (id, record) => {
    const { data, error } = await supabase.from(tableName).update(record).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  subscribe: (callback) => {
    const channel = supabase
      .channel(`${tableName}_changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, callback)
      .subscribe();
    
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
