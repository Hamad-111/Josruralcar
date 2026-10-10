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

/* ============================================================== */
/* 1. BOOKINGS CRUD OPERATIONS                                    */
/* ============================================================== */

export async function fetchBookings() {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookings:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Fetch bookings exception:', err);
    return null;
  }
}

export async function fetchUserBookings(customerEmail, customerPhone) {
  try {
    let query = supabase.from('bookings').select('*');
    if (customerEmail && customerPhone) {
      query = query.or(`customer_email.eq.${customerEmail},customer_phone.eq.${customerPhone}`);
    } else if (customerEmail) {
      query = query.eq('customer_email', customerEmail);
    } else if (customerPhone) {
      query = query.eq('customer_phone', customerPhone);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching user bookings:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Fetch user bookings exception:', err);
    return null;
  }
}

export async function insertBooking(bookingRecord) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert([bookingRecord])
      .select()
      .single();

    if (error) {
      console.error('Error saving booking to Supabase:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    console.error('Insert booking exception:', err);
    return { success: false, error: err.message };
  }
}

export async function updateBooking(identifier, updates) {
  try {
    let query = supabase.from('bookings').update({ ...updates, updated_at: new Date().toISOString() });
    if (typeof identifier === 'number' || (!isNaN(identifier) && !String(identifier).startsWith('#'))) {
      query = query.eq('id', identifier);
    } else {
      query = query.eq('ref', identifier);
    }

    const { data, error } = await query.select();
    if (error) {
      console.error('Error updating booking:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    console.error('Update booking exception:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteBooking(identifier) {
  try {
    let query = supabase.from('bookings').delete();
    if (typeof identifier === 'number' || (!isNaN(identifier) && !String(identifier).startsWith('#'))) {
      query = query.eq('id', identifier);
    } else {
      query = query.eq('ref', identifier);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error deleting booking:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    console.error('Delete booking exception:', err);
    return { success: false, error: err.message };
  }
}

/* ============================================================== */
/* 2. PROFILES & CUSTOMERS CRUD OPERATIONS                        */
/* ============================================================== */

export async function fetchProfiles() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching profiles:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Fetch profiles exception:', err);
    return null;
  }
}

export async function fetchProfileByEmail(email) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .limit(1)
      .single();

    if (error) return null;
    return data;
  } catch (err) {
    return null;
  }
}

export async function insertProfile(profileRecord) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert([profileRecord])
      .select()
      .single();

    if (error) {
      console.error('Error inserting profile:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function updateProfile(id, updates) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function deleteProfile(id) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting profile:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* ============================================================== */
/* 3. FLEET & CHAUFFEURS CRUD OPERATIONS                          */
/* ============================================================== */

export async function fetchFleet() {
  try {
    const { data, error } = await supabase
      .from('fleet')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching fleet:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Fetch fleet exception:', err);
    return null;
  }
}

export async function insertFleetMember(fleetRecord) {
  try {
    const { data, error } = await supabase
      .from('fleet')
      .insert([fleetRecord])
      .select()
      .single();

    if (error) {
      console.error('Error inserting fleet member:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function updateFleetMember(id, updates) {
  try {
    const { data, error } = await supabase
      .from('fleet')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating fleet member:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function deleteFleetMember(id) {
  try {
    const { data, error } = await supabase
      .from('fleet')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting fleet member:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* ============================================================== */
/* 4. SYSTEM SETTINGS & RATES                                     */
/* ============================================================== */

export async function fetchSystemSettings() {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching system settings:', error);
      return null;
    }
    return data;
  } catch (err) {
    return null;
  }
}

export async function updateSystemSettings(updates) {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select();

    if (error) {
      console.error('Error updating system settings:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* ============================================================== */
/* 5. PAYMENTS & TRANSACTIONS CRUD                                */
/* ============================================================== */

export async function fetchPayments(bookingRef) {
  try {
    let query = supabase.from('payments').select('*');
    if (bookingRef) {
      query = query.eq('booking_ref', bookingRef);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching payments:', error);
      return null;
    }
    return data;
  } catch (err) {
    return null;
  }
}

export async function insertPayment(paymentRecord) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .insert([paymentRecord])
      .select()
      .single();

    if (error) {
      console.error('Error inserting payment:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* ============================================================== */
/* 6. NOTIFICATIONS & INQUIRIES                                   */
/* ============================================================== */

export async function fetchNotifications() {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      return null;
    }
    return data;
  } catch (err) {
    return null;
  }
}

export async function insertNotification(notificationRecord) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([notificationRecord])
      .select()
      .single();

    if (error) {
      console.error('Error inserting notification:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function markNotificationRead(id) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .select();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* ============================================================== */
/* 7. LEGACY / COMPATIBILITY ALIASES                              */
/* ============================================================== */

export async function fetchDriversFromSupabase() {
  try {
    const { data, error } = await supabase.from('drivers').select('*').order('name');
    if (!error && data && data.length > 0) return data;
  } catch (e) {}
  return fetchFleet();
}

export async function insertDriverToSupabase(driverRecord) {
  try {
    const { data, error } = await supabase.from('drivers').insert([driverRecord]).select().single();
    if (!error && data) return data;
  } catch (e) {}
  return insertFleetMember(driverRecord);
}

export async function fetchVehiclesFromSupabase() {
  try {
    const { data, error } = await supabase.from('vehicles').select('*').order('name');
    if (!error && data && data.length > 0) return data;
  } catch (e) {}
  return fetchFleet();
}

export async function insertVehicleToSupabase(vehicleRecord) {
  try {
    const { data, error } = await supabase.from('vehicles').insert([vehicleRecord]).select().single();
    if (!error && data) return data;
  } catch (e) {}
  return insertFleetMember(vehicleRecord);
}

/* ============================================================== */
/* 8. DRIVER LIVE LOCATION & TRACKING CRUD                        */
/* ============================================================== */

export async function upsertDriverLocationToSupabase(locationRecord) {
  try {
    const payload = {
      driver_id: String(locationRecord.driverId || locationRecord.driver_id || ''),
      trip_id: String(locationRecord.tripId || locationRecord.trip_id || '').replace('#', ''),
      latitude: parseFloat(locationRecord.latitude),
      longitude: parseFloat(locationRecord.longitude),
      accuracy: locationRecord.accuracy != null ? parseFloat(locationRecord.accuracy) : null,
      heading: locationRecord.heading != null ? parseFloat(locationRecord.heading) : null,
      speed: locationRecord.speed != null ? parseFloat(locationRecord.speed) : null,
      tracking_status: locationRecord.trackingStatus || locationRecord.tracking_status || 'live',
      timestamp: locationRecord.timestamp || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('driver_locations')
      .upsert([payload], { onConflict: 'trip_id' })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function fetchDriverLocationFromSupabase(tripId) {
  try {
    const cleanTripId = String(tripId).replace('#', '');
    const { data, error } = await supabase
      .from('driver_locations')
      .select('*')
      .eq('trip_id', cleanTripId)
      .limit(1)
      .single();

    if (error) return null;
    return data;
  } catch (err) {
    return null;
  }
}

export async function fetchAllActiveDriverLocationsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('driver_locations')
      .select('*')
      .in('tracking_status', ['live', 'paused'])
      .order('updated_at', { ascending: false });

    if (error) return null;
    return data;
  } catch (err) {
    return null;
  }
}

export function subscribeToTripLocationRealtime(tripId, onUpdate) {
  try {
    const cleanTripId = String(tripId).replace('#', '');
    const channel = supabase
      .channel(`tracking_${cleanTripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_locations',
          filter: `trip_id=eq.${cleanTripId}`
        },
        (payload) => {
          if (onUpdate && payload.new) {
            onUpdate(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    return () => {};
  }
}

/* ============================================================== */
/* 8. GOOGLE OAUTH & SUPABASE AUTH INTEGRATION                    */
/* ============================================================== */

/**
 * Check if Google OAuth provider is actively enabled in Supabase project dashboard
 */
export async function isGoogleOAuthEnabledOnSupabase() {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const settingsUrl = `${supabaseUrl}/auth/v1/settings`;
    const res = await fetch(settingsUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Origin': origin
      }
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data?.external?.google);
  } catch (err) {
    console.warn('Could not inspect Supabase auth settings:', err);
    return false;
  }
}

/**
 * Sign in using Google OAuth via Supabase
 */
export async function signInWithGoogleOAuth(redirectPath = '') {
  try {
    const isEnabled = await isGoogleOAuthEnabledOnSupabase();
    if (!isEnabled) {
      console.warn('Google provider is not enabled in Supabase project dashboard. Fallback to interactive Google sign-in.');
      return {
        success: false,
        providerNotEnabled: true,
        error: 'Unsupported provider: provider is not enabled'
      };
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    // OAuth 2.0 RFC 6749 requires redirect_uri to have no fragment '#'
    const cleanPath = (redirectPath || '').split('#')[0].split('?')[0];
    const path = cleanPath ? (cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath) : currentPath;
    const redirectUrl = origin + (path || '/');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account'
        }
      }
    });

    if (error) {
      console.warn('Supabase Google OAuth warning:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    console.warn('Supabase Google OAuth exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get active Supabase session
 */
export async function getSupabaseAuthSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session;
  } catch (err) {
    return null;
  }
}

/**
 * Sign out from Supabase Auth
 */
export async function signOutSupabaseAuth() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn('Supabase sign-out error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Listen for Supabase Auth state changes
 */
export function onSupabaseAuthStateChange(callback) {
  try {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (callback) callback(event, session);
    });
    return subscription;
  } catch (err) {
    return null;
  }
}
