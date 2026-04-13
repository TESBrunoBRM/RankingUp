import { supabase } from '../lib/supabase';

export const authService = {
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async register(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    console.log("=== SUPABASE RESPONSE ===", data, error);
    if (error) throw error;
    
    // Fallback: If the database trigger fails to create the profile, we attempt to insert it manually.
    if (data.user) {
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{ id: data.user.id, name: 'Nuevo Usuario' }]);
          
        if (profileError) {
          console.warn('Profile fallback insertion warning:', profileError.message);
        }
      } catch (e) {
        console.log('Profile fallback error:', e);
      }
    }

    return data;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
};
