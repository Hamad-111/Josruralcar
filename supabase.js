import { createClient } from '@supabase/supabase-js';

const getEnv = (key) => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}
  return undefined;
};

const supabaseUrl = 
  getEnv('VITE_SUPABASE_URL') || 
  getEnv('NEXT_PUBLIC_SUPABASE_URL') || 
  'https://thwamlzdialhwwsyqiyd.supabase.co';

const supabaseAnonKey = 
  getEnv('VITE_SUPABASE_ANON_KEY') || 
  getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') || 
  'sb_publishable_1kclmq-EVFPWTW_7lh9qIA_vOvECE_T';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Health check connection to Supabase
 */
export async function checkSupabaseHealth() {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .limit(1);

    if (error) {
      console.warn('Supabase health check warning:', error.message);
      return { connected: false, error: error.message };
    }
    return { connected: true, data };
  } catch (err) {
    console.error('Supabase connection error:', err);
    return { connected: false, error: err.message };
  }
}

/**
 * Fetch all bookings from Supabase
 */
export async function fetchBookings() {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookings from Supabase:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Fetch exception:', err);
    return null;
  }
}

/**
 * Insert a new booking into Supabase
 */
export async function insertBooking(bookingRecord) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert([bookingRecord])
      .select()
      .single();

    if (error) {
      console.error('Error saving booking to Supabase:', error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err) {
    console.error('Insert exception:', err);
    return { success: false, error: err.message };
  }
}
