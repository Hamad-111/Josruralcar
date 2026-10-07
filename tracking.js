/**
 * Jo's Rural Cars - Normal Ride Tracking & Journey Recorder
 * 
 * Clean, dependable tracking system for confirmed UK airport transfers.
 * Records the ongoing ride from the moment pickup & drop-off are confirmed
 * until the passenger is safely dropped off at their destination.
 */

import { supabase } from './supabase.js';

/* ============================================================== */
/* 1. CONSTANTS & STAGES                                          */
/* ============================================================== */

export const RIDE_STAGES = {
  CONFIRMED: 'confirmed',
  EN_ROUTE: 'en_route',
  ARRIVED: 'arrived',
  IN_PROGRESS: 'in_progress',
  DROPPED_OFF: 'dropped_off'
};

export const STAGE_CONFIG = {
  [RIDE_STAGES.CONFIRMED]: {
    stepIndex: 1,
    title: 'Booking Confirmed',
    subtitle: 'Chauffeur Allocated & On Standby',
    badgeClass: 'badge-confirmed',
    pillText: 'Booking Confirmed',
    icon: '✓',
    percent: 15
  },
  [RIDE_STAGES.EN_ROUTE]: {
    stepIndex: 2,
    title: 'Chauffeur En Route',
    subtitle: 'Heading to Pickup Location',
    badgeClass: 'badge-enroute',
    pillText: 'Chauffeur On The Way',
    icon: '🚗',
    percent: 40
  },
  [RIDE_STAGES.ARRIVED]: {
    stepIndex: 3,
    title: 'Arrived at Pickup',
    subtitle: 'Chauffeur Waiting at Address',
    badgeClass: 'badge-arrived',
    pillText: 'Chauffeur at Pickup',
    icon: '📍',
    percent: 65
  },
  [RIDE_STAGES.IN_PROGRESS]: {
    stepIndex: 4,
    title: 'Journey In Progress',
    subtitle: 'En Route to Destination',
    badgeClass: 'badge-inprogress',
    pillText: 'On Board • In Transit',
    icon: '🛣️',
    percent: 85
  },
  [RIDE_STAGES.DROPPED_OFF]: {
    stepIndex: 5,
    title: 'Dropped Off & Completed',
    subtitle: 'Safely Arrived at Destination',
    badgeClass: 'badge-completed',
    pillText: 'Drop-off Complete',
    icon: '🏁',
    percent: 100
  }
};

const STORAGE_KEY_ONGOING = 'jos_ongoing_ride';
const STORAGE_KEY_HISTORY = 'jos_completed_rides';

/* ============================================================== */
/* 2. ONGOING RIDE MANAGEMENT                                     */
/* ============================================================== */

/**
 * Get currently active ongoing ride from local storage
 */
export function getOngoingRide() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ONGOING);
    if (!raw) return null;
    const ride = JSON.parse(raw);
    return ride && ride.isOngoing ? ride : null;
  } catch (e) {
    console.error('[Tracking] Error reading ongoing ride:', e);
    return null;
  }
}

/**
 * Save ongoing ride state
 */
export function saveOngoingRide(ride) {
  try {
    if (!ride) {
      localStorage.removeItem(STORAGE_KEY_ONGOING);
    } else {
      localStorage.setItem(STORAGE_KEY_ONGOING, JSON.stringify(ride));
    }
    // Dispatch system-wide event for reactive UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ongoing_ride:updated', { detail: { ride } }));
    }
  } catch (e) {
    console.error('[Tracking] Error saving ongoing ride:', e);
  }
}

/**
 * Start and record a new ongoing ride when pickup & drop-off are confirmed
 */
export function startOngoingRide(bookingData = {}) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const ref = bookingData.ref || `#JR-${Math.floor(1000 + Math.random() * 9000)}`;

  const rideRecord = {
    ref: ref.startsWith('#') ? ref : `#${ref}`,
    pickup: bookingData.pickup || 'Stroud, Cotswolds, GL5',
    dropoff: bookingData.dropoff || 'London Heathrow Terminal 5',
    date: bookingData.date || now.toISOString().split('T')[0],
    time: bookingData.time || timeStr,
    customer_name: bookingData.customer_name || 'James Doe',
    customer_phone: bookingData.customer_phone || '+44 7700 900000',
    customer_email: bookingData.customer_email || 'james@example.com',
    vehicle: bookingData.vehicle || 'Executive Mercedes-Benz E-Class',
    vehicleReg: bookingData.vehicleReg || 'YS24 OKL',
    driverName: bookingData.assigned_driver || bookingData.driverName || 'Dave M.',
    driverRating: '4.98 ★ (520+ Transfers)',
    driverPhone: '+44 1453 888999',
    flight_number: bookingData.flight_number || 'BA184',
    amount: bookingData.amount || 75.00,
    currency: 'GBP',
    status: RIDE_STAGES.CONFIRMED,
    isOngoing: true,
    createdAt: now.toISOString(),
    startedAt: now.toISOString(),
    pickedUpAt: null,
    droppedOffAt: null,
    elapsedSeconds: 0,
    timeline: [
      {
        stage: RIDE_STAGES.CONFIRMED,
        title: 'Pickup & Drop-off Confirmed',
        timestamp: timeStr,
        note: `Journey confirmed: ${bookingData.pickup || 'Stroud'} → ${bookingData.dropoff || 'Heathrow T5'}`
      }
    ]
  };

  saveOngoingRide(rideRecord);
  return rideRecord;
}

/**
 * Advance status of ongoing ride
 */
export function advanceRideStatus(nextStage, customNote = '') {
  let ride = getOngoingRide();
  if (!ride) {
    // If no ongoing ride, create one with default confirmed route
    ride = startOngoingRide();
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  ride.status = nextStage;

  if (nextStage === RIDE_STAGES.ARRIVED && !ride.arrivedAt) {
    ride.arrivedAt = now.toISOString();
  }

  if (nextStage === RIDE_STAGES.IN_PROGRESS && !ride.pickedUpAt) {
    ride.pickedUpAt = now.toISOString();
  }

  if (nextStage === RIDE_STAGES.DROPPED_OFF) {
    return completeRideDropoff(customNote);
  }

  const stageMeta = STAGE_CONFIG[nextStage] || { title: nextStage };
  ride.timeline.push({
    stage: nextStage,
    title: stageMeta.title,
    timestamp: timeStr,
    note: customNote || stageMeta.subtitle
  });

  saveOngoingRide(ride);
  return ride;
}

/**
 * Complete drop-off and finalize the recording
 */
export function completeRideDropoff(customNote = '') {
  let ride = getOngoingRide();
  if (!ride) return null;

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  ride.status = RIDE_STAGES.DROPPED_OFF;
  ride.isOngoing = false;
  ride.droppedOffAt = now.toISOString();

  // Calculate total ride duration
  let durationMinutes = 75; // standard average
  if (ride.startedAt) {
    const startMs = new Date(ride.startedAt).getTime();
    const endMs = now.getTime();
    durationMinutes = Math.max(1, Math.round((endMs - startMs) / (1000 * 60)));
  }
  ride.totalDuration = `${durationMinutes} mins`;

  ride.timeline.push({
    stage: RIDE_STAGES.DROPPED_OFF,
    title: 'Dropped Off at Destination',
    timestamp: timeStr,
    note: customNote || `Passenger safely dropped off at ${ride.dropoff}`
  });

  // Archive in completed rides history
  archiveCompletedRide(ride);

  // Clear ongoing ride state
  saveOngoingRide(null);

  // Sync completed booking status in Supabase if online
  syncDropoffToSupabase(ride);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ongoing_ride:completed', { detail: { ride } }));
  }

  return ride;
}

/**
 * Archive ride into completed history
 */
function archiveCompletedRide(ride) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    const history = raw ? JSON.parse(raw) : [];
    history.unshift(ride);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history.slice(0, 50)));
  } catch (e) {
    console.error('[Tracking] Error archiving ride:', e);
  }
}

/**
 * Sync dropoff status to Supabase
 */
async function syncDropoffToSupabase(ride) {
  try {
    if (!supabase || !ride.ref) return;
    const cleanRef = ride.ref.replace('#', '');
    await supabase
      .from('bookings')
      .update({
        status: 'Completed',
        admin_notes: `Drop-off completed at ${new Date().toLocaleTimeString()} • Duration: ${ride.totalDuration}`
      })
      .eq('ref', `#${cleanRef}`);
  } catch (e) {
    console.warn('[Tracking] Supabase dropoff sync skipped:', e);
  }
}

/**
 * Fetch completed ride history
 */
export function getRideHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Format elapsed seconds to mm:ss or hh:mm:ss
 */
export function formatElapsedTime(totalSeconds = 0) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

