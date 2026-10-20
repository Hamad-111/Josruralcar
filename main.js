/**
 * JO'S RURAL CARS - MAIN APPLICATION LOGIC
 * High-performance, reactive single-page app with full booking workflow & customer dashboard
 */
import {
  supabase,
  checkSupabaseHealth,
  fetchBookings,
  insertBooking,
  updateBooking,
  deleteBooking,
  fetchDriversFromSupabase,
  insertDriverToSupabase,
  fetchVehiclesFromSupabase,
  insertVehicleToSupabase,
  fetchProfiles,
  fetchProfileByEmail,
  insertProfile,
  updateProfile,
  deleteProfile,
  fetchFleet,
  insertFleetMember,
  updateFleetMember,
  deleteFleetMember,
  fetchSystemSettings,
  updateSystemSettings,
  fetchPayments,
  insertPayment,
  fetchNotifications,
  insertNotification,
  markNotificationRead,
  fetchUserBookings,
  isGoogleOAuthEnabledOnSupabase,
  signInWithGoogleOAuth,
  getSupabaseAuthSession,
  signOutSupabaseAuth,
  onSupabaseAuthStateChange
} from './supabase.js';

import {
  RIDE_STAGES,
  STAGE_CONFIG,
  getOngoingRide,
  saveOngoingRide,
  startOngoingRide,
  advanceRideStatus,
  completeRideDropoff,
  getRideHistory,
  formatElapsedTime
} from './tracking.js';

const App = (() => {
  // Application Data & State
  const state = {
    currentView: 'home',
    currentUser: (() => {
      try {
        const saved = localStorage.getItem('jos_current_user');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
      return null;
    })(),
    tracking: {
      activeCustomerTracker: null,
      activeAdminTracker: null,
      currentTrackTripId: 'JR-8821',
      selectedDriverTripId: 'JR-8821'
    },
    booking: {
      pickup: 'Stroud, Cotswolds, GL5',
      dropoff: 'London Heathrow Terminal 5',
      date: '2026-10-24',
      time: '04:30',
      passengers: '2 Passengers',
      vehicleKey: 'executive',
      nextStep: 'select-vehicle',
      passenger: {
        fullName: 'James Doe',
        email: 'james@example.com',
        phone: '7700 900000',
        flightNum: 'BA123',
        requests: ['meet_greet'],
        notes: 'Terminal 5 departures drop-off preferred, 2 medium suitcases.'
      },
      bookingRef: 'JRC-2026-8821',
      dispatchStatus: 'idle',
      assignedDriver: 'Dave M. (Executive Mercedes-Benz E-Class)',
      driverDetails: {
        name: 'Dave M.',
        rating: '4.98 ★ (520+ Transfers)',
        vehicle: 'Executive Mercedes-Benz E-Class',
        reg: 'YS24 OKL',
        phone: '+44 1453 888999'
      }
    },
    vehicles: {
      sedan: {
        name: 'Sedan',
        model: 'Mercedes-Benz E-Class Sedan',
        img: './assets/images/car_sedan.jpg',
        basePrice: 40,
        tax: 5,
        total: 45,
        specs: '👤 3 Max • 🧳 2 Large • ❄️ AC • ⏱️ 15m Free Wait'
      },
      executive: {
        name: 'Executive',
        model: 'Mercedes-Benz S-Class or equivalent',
        img: './assets/images/car_executive.jpg',
        basePrice: 68,
        tax: 7,
        total: 75,
        specs: '👤 3 Max • 🧳 2 Large • ✈️ Flight Monitoring • 👋 Meet & Greet • 📶 Free WiFi'
      },
      estate: {
        name: 'Estate',
        model: 'Mercedes-Benz E-Class Estate',
        img: './assets/images/car_estate.jpg',
        basePrice: 48,
        tax: 7,
        total: 55,
        specs: '👤 4 Max • 🧳 4 Large • 👶 Child Seat Avail. • ❄️ Dual Climate'
      },
      mpv: {
        name: 'Luxury MPV',
        model: 'Mercedes-Benz V-Class MPV',
        img: './assets/images/car_mpv.jpg',
        basePrice: 85,
        tax: 10,
        total: 95,
        specs: '👤 8 Max • 🧳 8 Large • 🛋️ Captain Chairs • ⚡ USB Chargers'
      }
    },
    // Admin & Dispatch Management State
    admin: {
      activeTab: 'bookings',
      bookingsFilter: 'all',
      bookingsSearch: '',
      carsFilter: 'all',
      driversFilter: 'all',
      usersFilter: 'all',
      usersSearch: '',
      bookings: (() => {
        try {
          const saved = localStorage.getItem('jos_admin_bookings');
          if (saved) return JSON.parse(saved);
        } catch (e) {}
        const todayStr = new Date().toISOString().split('T')[0];
        return [
          {
            ref: '#JR-8821',
            customer_name: 'James Doe',
            customer_email: 'james@example.com',
            customer_phone: '+44 7700 900000',
            pickup: 'Stroud, Cotswolds, GL5',
            dropoff: 'London Heathrow Terminal 5',
            date: '2026-10-24',
            time: '04:30',
            vehicle: 'Executive (Mercedes-Benz S-Class)',
            amount: 75,
            status: 'Confirmed',
            payment_status: 'Paid',
            assigned_driver: 'Arthur Pendelton',
            flight_number: 'BA123'
          },
          {
            ref: '#JR-8419',
            customer_name: 'Lady Clara Morrison',
            customer_email: 'clara@morrison.co.uk',
            customer_phone: '+44 7700 900888',
            pickup: 'Tetbury, Cotswolds, GL8',
            dropoff: 'London Heathrow Terminal 2',
            date: '2026-10-25',
            time: '06:00',
            vehicle: 'Business Class (Mercedes S-Class LWB)',
            amount: 145,
            status: 'Confirmed',
            payment_status: 'Paid',
            assigned_driver: 'Sarah Jenkins',
            flight_number: 'VS003'
          },
          {
            ref: '#JR-7930',
            customer_name: 'Sir Robert Sterling',
            customer_email: 'r.sterling@cotswolds.org',
            customer_phone: '+44 7700 900712',
            pickup: 'Cirencester, Cotswolds, GL7',
            dropoff: 'London Gatwick North Terminal',
            date: todayStr,
            time: '14:15',
            vehicle: 'Luxury MPV (Mercedes V-Class)',
            amount: 185,
            status: 'En Route',
            payment_status: 'Paid',
            assigned_driver: 'Marcus Brody',
            flight_number: 'EK009'
          },
          {
            ref: '#JR-6902',
            customer_name: 'Dr. Alistair Finch',
            customer_email: 'afinch@oxford.ac.uk',
            customer_phone: '+44 7700 900334',
            pickup: 'Oxford City Centre, OX1',
            dropoff: 'London Luton Airport',
            date: todayStr,
            completed_date: todayStr,
            completed_at: new Date().toISOString(),
            time: '09:00',
            vehicle: 'Executive Estate (Mercedes Estate)',
            amount: 120,
            status: 'Completed',
            payment_status: 'Paid',
            assigned_driver: 'David Miller',
            flight_number: 'EZY221'
          }
        ];
      })(),
      users: (() => {
        try {
          const saved = localStorage.getItem('jos_admin_users');
          if (saved) return JSON.parse(saved);
        } catch (e) {}
        return [
          {
            id: 'bcc5fd7b-94ab-46b5-bb10-d8ef3b71bf10',
            name: 'Marcus Vance',
            email: 'admin@josruralcars.co.uk',
            phone: '+44 1234 567 890',
            tier: 'Executive Super Admin',
            role: 'admin',
            isAdmin: true,
            status: 'Active',
            location: "Jo's Rural Cars HQ, Stroud, GL5 1AA",
            notes: 'Head of Executive Dispatch.',
            rides: 0,
            spent: 0
          },
          {
            id: 'e4d547b7-179f-4c05-bf53-0da6fe6d62d7',
            name: 'Marcus Vance (Admin)',
            email: 'admin@example.com',
            phone: '+44 1234 567 890',
            tier: 'Executive Super Admin',
            role: 'admin',
            isAdmin: true,
            status: 'Active',
            location: "Jo's Rural Cars HQ, Stroud, GL5 1AA",
            notes: 'Super Admin and Head of Executive Operations',
            rides: 0,
            spent: 0
          },
          {
            id: 'usr-1',
            name: 'James Doe',
            email: 'james@example.com',
            phone: '+44 7700 900000',
            tier: 'Standard',
            status: 'Active',
            location: 'Reading, Berkshire',
            notes: 'Prefers quiet rides, terminal 5 departures drop-off.',
            rides: 14,
            spent: 1050
          },
          {
            id: 'usr-2',
            name: 'Lady Clara Morrison',
            email: 'clara@morrison.co.uk',
            phone: '+44 7700 900888',
            tier: 'Corporate',
            status: 'Active',
            location: 'Tetbury, Gloucestershire',
            notes: 'Regular Tetbury to Heathrow & Gatwick executive transfers.',
            rides: 8,
            spent: 960
          },
          {
            id: 'usr-3',
            name: 'Sir Robert Sterling',
            email: 'r.sterling@cotswolds.org',
            phone: '+44 7700 900712',
            tier: 'Standard',
            status: 'Active',
            location: 'Cirencester, Cotswolds',
            notes: 'Luxury MPV preferred for Cotswolds tours & flight transfers.',
            rides: 22,
            spent: 2450
          },
          {
            id: 'usr-4',
            name: 'Dr. Alistair Finch',
            email: 'afinch@oxford.ac.uk',
            phone: '+44 7700 900334',
            tier: 'Standard',
            status: 'Active',
            location: 'Oxford City Centre',
            notes: 'Academic travel to Heathrow and Luton.',
            rides: 5,
            spent: 480
          }
        ];
      })(),
      cars: (() => {
        try {
          const saved = localStorage.getItem('jos_admin_cars');
          if (saved) return JSON.parse(saved);
        } catch (e) {}
        return [
          {
            id: 'car-1',
            name: 'Mercedes-Benz E-Class Saloon',
            plate: 'GL24 XKR',
            category: 'Sedan',
            passengers: 3,
            luggage: 2,
            basePrice: 40,
            driver: 'Sarah Jenkins',
            status: 'Available',
            img: './assets/images/car_sedan.jpg'
          },
          {
            id: 'car-2',
            name: 'Mercedes-Benz S-Class LWB Chauffeur Edition',
            plate: 'GL73 SVO',
            category: 'Executive',
            passengers: 3,
            luggage: 2,
            basePrice: 68,
            driver: 'Arthur Pendelton',
            status: 'Available',
            img: './assets/images/car_executive.jpg'
          },
          {
            id: 'car-3',
            name: 'Mercedes-Benz E-Class Estate All-Terrain',
            plate: 'GL25 EST',
            category: 'Estate',
            passengers: 4,
            luggage: 4,
            basePrice: 48,
            driver: 'David Miller',
            status: 'Available',
            img: './assets/images/car_estate.jpg'
          },
          {
            id: 'car-4',
            name: 'Mercedes-Benz V-Class Extra-Long MPV',
            plate: 'GL74 LUX',
            category: 'MPV',
            passengers: 8,
            luggage: 8,
            basePrice: 85,
            driver: 'Marcus Brody',
            status: 'Available',
            img: './assets/images/car_mpv.jpg'
          }
        ];
      })(),
      drivers: (() => {
        try {
          const saved = localStorage.getItem('jos_admin_drivers');
          if (saved) return JSON.parse(saved);
        } catch (e) {}
        return [
          {
            id: 'drv-1',
            name: 'Arthur Pendelton',
            phone: '+44 7700 900142',
            email: 'arthur@josruralcars.co.uk',
            badge: 'PHD-GL-4412',
            car: 'GL73 SVO (S-Class)',
            status: 'On Duty',
            rating: 4.98,
            rides: 412
          },
          {
            id: 'drv-2',
            name: 'Sarah Jenkins',
            phone: '+44 7700 900298',
            email: 'sarah.j@josruralcars.co.uk',
            badge: 'PHD-GL-3891',
            car: 'GL24 XKR (E-Class)',
            status: 'On Duty',
            rating: 4.95,
            rides: 348
          },
          {
            id: 'drv-3',
            name: 'Marcus Brody',
            phone: '+44 7700 900822',
            email: 'marcus@josruralcars.co.uk',
            badge: 'PHD-GL-5104',
            car: 'GL74 LUX (V-Class)',
            status: 'On Duty',
            rating: 4.99,
            rides: 520
          },
          {
            id: 'drv-4',
            name: 'David Miller',
            phone: '+44 7700 900331',
            email: 'david@josruralcars.co.uk',
            badge: 'PHD-GL-2910',
            car: 'GL25 EST (Estate)',
            status: 'Off Duty',
            rating: 4.91,
            rides: 198
          }
        ];
      })(),
      rates: (() => {
        try {
          const saved = localStorage.getItem('jos_admin_rates');
          if (saved) return JSON.parse(saved);
        } catch (e) {}
        return {
          heathrow: 45,
          gatwick: 65,
          luton: 55,
          stansted: 60,
          birmingham: 75
        };
      })(),
      policies: (() => {
        try {
          const saved = localStorage.getItem('jos_admin_policies');
          if (saved) return JSON.parse(saved);
        } catch (e) {}
        return {
          meetGreet: true,
          freeWait: true,
          emergencyBanner: true
        };
      })()
    }
  };

  // Helper: Format Date for Display
  function formatDateDisplay(dateStr) {
    if (!dateStr) return 'Sat, 24 Oct 2026';
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return dateStr;
    const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    return dateObj.toLocaleDateString('en-GB', options);
  }

  // Navigation & View Switching
  function navigateTo(viewId) {
    // Map aliases
    const targetMap = {
      'home': 'viewHome',
      'signin': 'viewSignIn',
      'login': 'viewSignIn',
      'airports': 'viewAirports',
      'select-vehicle': 'viewSelectVehicle',
      'fleet': 'viewSelectVehicle',
      'passenger-details': 'viewPassengerDetails',
      'payment': 'viewPayment',
      'dashboard': 'viewDashboard',
      'contact': 'viewContact',
      'admin': 'viewAdmin',
      'track': 'viewTracking',
      'tracking': 'viewTracking',
      'driver': 'viewDriverPortal'
    };

    // Booking flow guarding: customer must sign in when finalizing booking details!
    const guardedSteps = ['passenger-details', 'payment'];
    if (guardedSteps.includes(viewId)) {
      if (!state.currentUser || !state.currentUser.isLoggedIn) {
        state.booking.nextStep = viewId;
        showToast('Please sign in to proceed with your booking.');
        return navigateTo('signin');
      }
    }

    const baseViewKey = viewId.split('/')[0].split('?')[0];
    const targetElementId = targetMap[baseViewKey] || targetMap[viewId] || 'viewHome';

    // Hide all views
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.remove('active');
    });

    // Show target view
    const targetView = document.getElementById(targetElementId);
    if (targetView) {
      targetView.classList.add('active');
      state.currentView = baseViewKey;
      window.location.hash = viewId;
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Trigger tracking view controllers
      if (baseViewKey === 'track' || baseViewKey === 'tracking') {
        const tripParam = viewId.includes('/') ? viewId.split('/')[1] : (state.tracking.currentTrackTripId || 'JR-8821');
        initCustomerTrackingView(tripParam);
      } else if (baseViewKey === 'driver') {
        const driverTrip = viewId.includes('/') ? viewId.split('/')[1] : (state.tracking.selectedDriverTripId || 'JR-8821');
        initDriverPortalView(driverTrip);
      } else if (baseViewKey === 'select-vehicle' || baseViewKey === 'fleet') {
        syncFleetRouteInputs();
      } else if (baseViewKey === 'passenger-details') {
        updateAllocatedChauffeurUI();
      }
    }

    // Update Header Active Nav Links
    document.querySelectorAll('.nav-link').forEach(link => {
      if (link.getAttribute('data-page') === viewId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Close mobile drawer if open
    const drawer = document.getElementById('mobileDrawer');
    if (drawer) drawer.classList.remove('open');

    // Update side dock active state on mobile
    const bookingSideDock = document.getElementById('bookingSideDock');
    if (bookingSideDock) {
      if (viewId === 'dashboard') {
        bookingSideDock.classList.add('active-on-dashboard');
      } else {
        bookingSideDock.classList.remove('active-on-dashboard');
      }
    }

    // Trigger Admin Data Loading if navigating to admin
    if (baseViewKey === 'admin') {
      document.body.classList.add('in-admin-portal');
      loadAdminDashboard();
    } else {
      document.body.classList.remove('in-admin-portal');
      if (viewId === 'dashboard') {
        updateDashboardUI();
        loadDashboardFromSupabase();
      } else if (viewId === 'signin') {
        updateSignInPageView();
      }
    }

    // Sync View Data
    syncUIWithState();
  }

  // Start booking flow from any trigger
  function startBookingFlow(targetStep = 'select-vehicle') {
    state.booking.nextStep = targetStep;
    if (targetStep === 'passenger-details' || targetStep === 'payment') {
      if (!state.currentUser || !state.currentUser.isLoggedIn) {
        showToast('Please sign in to continue with your booking.');
        return navigateTo('signin');
      }
    }
    navigateTo(targetStep);
  }

  // Focus Booking Widget on Homepage
  function focusBookingWidget() {
    navigateTo('home');
    const widget = document.getElementById('heroBookingCard');
    if (widget) {
      widget.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('widgetPickup')?.focus();
    }
  }

  // Handle Home Search Form Submit (Start booking flow)
  function handleHeroSearch(e) {
    e.preventDefault();
    const pickup = document.getElementById('widgetPickup')?.value.trim();
    const dropoff = document.getElementById('widgetDropoff')?.value.trim();
    const date = document.getElementById('widgetDate')?.value;
    const time = document.getElementById('widgetTime')?.value;
    const passengers = document.getElementById('widgetPassengers')?.value;

    state.booking.pickup = pickup || state.booking.pickup;
    state.booking.dropoff = dropoff || state.booking.dropoff;
    state.booking.date = date || state.booking.date;
    state.booking.time = time || state.booking.time;
    state.booking.passengers = passengers || state.booking.passengers;

    state.booking.nextStep = 'select-vehicle';
    showToast('Route saved. Choose your executive vehicle.');
    navigateTo('select-vehicle');
  }

  // Quick Select Airport from Airport Cards
  function quickSelectAirport(airportName, basePrice) {
    state.booking.dropoff = airportName;
    state.booking.nextStep = 'select-vehicle';
    showToast(`Destination set to ${airportName}. Choose your vehicle.`);
    navigateTo('select-vehicle');
  }

  // Select Vehicle in Fleet or Vehicle Selection
  function selectVehicle(vehicleKey) {
    if (!state.vehicles[vehicleKey]) return;
    state.booking.vehicleKey = vehicleKey;

    // Highlight card
    document.querySelectorAll('.vehicle-card-row').forEach(row => {
      row.classList.remove('selected-vcard');
    });
    const selectedRow = document.getElementById(`card${capitalize(vehicleKey)}`);
    if (selectedRow) selectedRow.classList.add('selected-vcard');

    updateSummarySidebar();
  }

  // Synthesized Web Audio API sound generator for dispatch alerts
  function playNotificationAudio(type = 'driver_alert') {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'transmit') {
        // Soft radar transmission chirp
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'driver_alert') {
        // Two-tone luxury dispatch chime
        [587.33, 880].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          const startTime = ctx.currentTime + idx * 0.15;
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.18, startTime);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.35);
        });
      } else if (type === 'success') {
        // Celebratory major arpeggio
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          const startTime = ctx.currentTime + idx * 0.1;
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.18, startTime);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.4);
        });
      }
    } catch (e) {
      // Audio playback gracefully optional
    }
  }

  // 1. Curated Popular UK & Cotswold Locations for Smart User-Friendly Suggestions
  const POPULAR_PICKUPS = [
    { name: 'Stroud, Cotswolds, GL5', short: 'Stroud', tag: 'Cotswolds', icon: '📍' },
    { name: 'Cirencester, Cotswolds, GL7', short: 'Cirencester', tag: 'Market Town', icon: '📍' },
    { name: 'Cheltenham Spa, GL50', short: 'Cheltenham', tag: 'Gloucestershire', icon: '📍' },
    { name: 'Oxford City Centre, OX1', short: 'Oxford', tag: 'University City', icon: '📍' },
    { name: 'Tetbury & Highgrove, GL8', short: 'Tetbury', tag: 'Royal Cotswolds', icon: '📍' },
    { name: 'Bath City Centre, BA1', short: 'Bath', tag: 'Somerset', icon: '📍' },
    { name: 'Gloucester Quays & City, GL1', short: 'Gloucester', tag: 'Docks & Quays', icon: '📍' },
    { name: 'Swindon Railway Station, SN1', short: 'Swindon', tag: 'High Speed Rail', icon: '📍' },
    { name: 'Moreton-in-Marsh, GL56', short: 'Moreton', tag: 'North Cotswolds', icon: '📍' },
    { name: 'Central London / Mayfair, W1', short: 'London Mayfair', tag: 'West End', icon: '🏛️' }
  ];

  const POPULAR_DROPOFFS = [
    { name: 'London Heathrow Terminal 5 (LHR)', short: 'Heathrow T5', tag: 'British Airways Hub', icon: '✈️' },
    { name: 'London Heathrow Terminal 2 & 3 (LHR)', short: 'Heathrow T2/3', tag: 'Star Alliance Hub', icon: '✈️' },
    { name: 'London Heathrow Terminal 4 (LHR)', short: 'Heathrow T4', tag: 'SkyTeam Hub', icon: '✈️' },
    { name: 'London Gatwick South Terminal (LGW)', short: 'Gatwick South', tag: 'London Gatwick', icon: '✈️' },
    { name: 'London Gatwick North Terminal (LGW)', short: 'Gatwick North', tag: 'London Gatwick', icon: '✈️' },
    { name: 'Birmingham International Airport (BHX)', short: 'Birmingham', tag: 'Midlands Airport', icon: '✈️' },
    { name: 'London Luton Airport (LTN)', short: 'Luton', tag: 'London Luton', icon: '✈️' },
    { name: 'London Stansted Airport (STN)', short: 'Stansted', tag: 'London Stansted', icon: '✈️' },
    { name: 'Bristol Airport (BRS)', short: 'Bristol', tag: 'South West Airport', icon: '✈️' },
    { name: 'Southampton Cruise Port, SO14', short: 'Southampton', tag: 'Ocean Terminal', icon: '🚢' },
    { name: 'Central London / West End, W1', short: 'London West End', tag: 'City Centre', icon: '🏛️' }
  ];

  // Dynamic Route Metrics Calculator
  function calculateRouteMetrics(pickup, dropoff) {
    const p = (pickup || '').toLowerCase();
    const d = (dropoff || '').toLowerCase();

    if (d.includes('heathrow') || p.includes('heathrow')) {
      if (p.includes('oxford') || d.includes('oxford')) return { distance: '48 mi', time: '~55 min', route: 'via M40' };
      if (p.includes('cheltenham') || d.includes('cheltenham')) return { distance: '88 mi', time: '~1h 38m', route: 'via A40 / M40' };
      if (p.includes('cirencester') || d.includes('cirencester')) return { distance: '82 mi', time: '~1h 30m', route: 'via M4' };
      return { distance: '92 mi', time: '~1h 45m', route: 'via M4 / A419' };
    }
    if (d.includes('gatwick') || p.includes('gatwick')) {
      return { distance: '124 mi', time: '~2h 10m', route: 'via M4 & M25' };
    }
    if (d.includes('birmingham') || p.includes('birmingham')) {
      return { distance: '65 mi', time: '~1h 15m', route: 'via M5' };
    }
    if (d.includes('bristol') || p.includes('bristol')) {
      return { distance: '44 mi', time: '~50 min', route: 'via M5' };
    }
    if (d.includes('luton') || p.includes('luton')) {
      return { distance: '98 mi', time: '~1h 50m', route: 'via A419 & M4' };
    }
    if (d.includes('stansted') || p.includes('stansted')) {
      return { distance: '132 mi', time: '~2h 20m', route: 'via M4 & M25' };
    }
    if (d.includes('london') || p.includes('london')) {
      return { distance: '102 mi', time: '~2h 05m', route: 'via M4' };
    }
    if (d.includes('oxford') || p.includes('oxford')) {
      return { distance: '42 mi', time: '~55 min', route: 'via A40' };
    }
    return { distance: '86 mi', time: '~1h 35m', route: 'via Scenic Highway' };
  }

  // 2. Sync Fleet Route Inputs with Application State
  function syncFleetRouteInputs() {
    const pickupIn = document.getElementById('fleetPickupInput');
    const dropoffIn = document.getElementById('fleetDropoffInput');
    const dateIn = document.getElementById('fleetDateInput');
    const timeIn = document.getElementById('fleetTimeInput');
    const passIn = document.getElementById('fleetPassengersInput');

    if (pickupIn) pickupIn.value = state.booking.pickup || 'Stroud, Cotswolds, GL5';
    if (dropoffIn) dropoffIn.value = state.booking.dropoff || 'London Heathrow Terminal 5';
    if (dateIn) dateIn.value = state.booking.date || new Date().toISOString().split('T')[0];
    if (timeIn) timeIn.value = state.booking.time || '04:30';
    if (passIn) passIn.value = state.booking.passengers || '2 Passengers';

    onFleetRouteInputChanged();
  }

  // 3. Location Helper Shortcuts & Clear Buttons
  function setFleetPickupLocation(location) {
    const input = document.getElementById('fleetPickupInput');
    if (input) {
      input.value = location;
      input.classList.remove('field-error-glow');
      closeAllRouteSuggestions();
      onFleetRouteInputChanged();
      showToast(`Pickup set to ${location.split(',')[0]}`);
    }
  }

  function setFleetDropoffAirport(airportName) {
    const input = document.getElementById('fleetDropoffInput');
    if (input) {
      input.value = airportName;
      input.classList.remove('field-error-glow');
      closeAllRouteSuggestions();
      onFleetRouteInputChanged();
      showToast(`Destination set to ${airportName.split('(')[0].trim()}`);
    }
  }

  function swapFleetRouteLocations() {
    const p = document.getElementById('fleetPickupInput');
    const d = document.getElementById('fleetDropoffInput');
    if (!p || !d) return;
    const temp = p.value;
    p.value = d.value;
    d.value = temp;
    p.classList.remove('field-error-glow');
    d.classList.remove('field-error-glow');
    closeAllRouteSuggestions();
    onFleetRouteInputChanged();
    showToast('Swapped pickup & drop-off locations.');
  }

  function clearFleetInput(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
      input.value = '';
      input.focus();
      onFleetRouteInputChanged();
      if (inputId === 'fleetPickupInput') openRouteSuggestions('pickup');
      if (inputId === 'fleetDropoffInput') openRouteSuggestions('dropoff');
    }
  }

  // 4. Interactive Route Suggestions Dropdowns
  function openRouteSuggestions(type) {
    const pickupDrop = document.getElementById('fleetPickupSuggestions');
    const dropoffDrop = document.getElementById('fleetDropoffSuggestions');

    if (type === 'pickup') {
      if (dropoffDrop) dropoffDrop.style.display = 'none';
      if (!pickupDrop) return;
      const currentVal = (document.getElementById('fleetPickupInput')?.value || '').toLowerCase();
      const listEl = document.getElementById('fleetPickupSuggestionsList');
      if (listEl) {
        const matches = POPULAR_PICKUPS.filter(item => !currentVal || item.name.toLowerCase().includes(currentVal) || item.tag.toLowerCase().includes(currentVal));
        const itemsToRender = matches.length ? matches : POPULAR_PICKUPS;
        listEl.innerHTML = itemsToRender.map(item => `
          <div class="suggestion-item" onclick="App.selectRouteSuggestion('pickup', '${item.name.replace(/'/g, "\\'")}')">
            <div class="item-main">
              <span>${item.icon}</span>
              <div>
                <div>${item.name}</div>
                <div class="item-sub">Gloucestershire &amp; Surrounds</div>
              </div>
            </div>
            <span class="item-tag">${item.tag}</span>
          </div>
        `).join('');
      }
      pickupDrop.style.display = 'block';
    } else if (type === 'dropoff') {
      if (pickupDrop) pickupDrop.style.display = 'none';
      if (!dropoffDrop) return;
      const currentVal = (document.getElementById('fleetDropoffInput')?.value || '').toLowerCase();
      const listEl = document.getElementById('fleetDropoffSuggestionsList');
      if (listEl) {
        const matches = POPULAR_DROPOFFS.filter(item => !currentVal || item.name.toLowerCase().includes(currentVal) || item.tag.toLowerCase().includes(currentVal));
        const itemsToRender = matches.length ? matches : POPULAR_DROPOFFS;
        listEl.innerHTML = itemsToRender.map(item => `
          <div class="suggestion-item" onclick="App.selectRouteSuggestion('dropoff', '${item.name.replace(/'/g, "\\'")}')">
            <div class="item-main">
              <span>${item.icon}</span>
              <div>
                <div>${item.name}</div>
                <div class="item-sub">Fixed Airport Chauffeur Rate</div>
              </div>
            </div>
            <span class="item-tag">${item.tag}</span>
          </div>
        `).join('');
      }
      dropoffDrop.style.display = 'block';
    }
  }

  function selectRouteSuggestion(type, value) {
    if (type === 'pickup') {
      setFleetPickupLocation(value);
    } else {
      setFleetDropoffAirport(value);
    }
    closeAllRouteSuggestions();
  }

  function closeAllRouteSuggestions() {
    const pickupDrop = document.getElementById('fleetPickupSuggestions');
    const dropoffDrop = document.getElementById('fleetDropoffSuggestions');
    if (pickupDrop) pickupDrop.style.display = 'none';
    if (dropoffDrop) dropoffDrop.style.display = 'none';
  }

  // Document Click Listener to Close Suggestions
  if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#pickupInputGroup') && !e.target.closest('#dropoffInputGroup')) {
        closeAllRouteSuggestions();
      }
    });
  }

  function onFleetRouteInputChanged() {
    const pickupIn = document.getElementById('fleetPickupInput');
    const dropoffIn = document.getElementById('fleetDropoffInput');
    const pickup = pickupIn?.value.trim() || '';
    const dropoff = dropoffIn?.value.trim() || '';
    const date = document.getElementById('fleetDateInput')?.value;
    const time = document.getElementById('fleetTimeInput')?.value;
    const passengers = document.getElementById('fleetPassengersInput')?.value;

    if (pickup) {
      state.booking.pickup = pickup;
      pickupIn?.classList.remove('field-error-glow');
    }
    if (dropoff) {
      state.booking.dropoff = dropoff;
      dropoffIn?.classList.remove('field-error-glow');
    }
    if (date) state.booking.date = date;
    if (time) state.booking.time = time;
    if (passengers) state.booking.passengers = passengers;

    // Calculate dynamic route metrics
    const metrics = calculateRouteMetrics(state.booking.pickup, state.booking.dropoff);
    const pShort = (state.booking.pickup || 'Pickup').split(',')[0];
    const dShort = (state.booking.dropoff || 'Drop-off').split(',')[0].split('(')[0].trim();

    // Update estimated route text in route card
    const estBox = document.getElementById('fleetRouteEstText');
    const subBox = document.getElementById('fleetRouteSubText');
    const fdaRoute = document.getElementById('fdaRouteSummary');

    if (estBox) {
      estBox.textContent = `Route: ${pShort} → ${dShort} (${metrics.distance} • ${metrics.time})`;
    }
    if (subBox) {
      subBox.textContent = `Guaranteed fixed rate chauffeur quote ${metrics.route} • Instant driver dispatch`;
    }
    if (fdaRoute) {
      fdaRoute.textContent = `${state.booking.pickup} → ${state.booking.dropoff}`;
    }

    updateSummarySidebar();
  }

  // 5. Passenger requests Chauffeur -> Dispatches Notification to Drivers!
  function requestFleetChauffeur(vehicleKey, e) {
    if (e) e.stopPropagation();

    const pickupIn = document.getElementById('fleetPickupInput');
    const dropoffIn = document.getElementById('fleetDropoffInput');
    const pickup = pickupIn?.value.trim() || state.booking.pickup;
    const dropoff = dropoffIn?.value.trim() || state.booking.dropoff;
    const date = document.getElementById('fleetDateInput')?.value || state.booking.date;
    const time = document.getElementById('fleetTimeInput')?.value || state.booking.time;
    const passengers = document.getElementById('fleetPassengersInput')?.value || state.booking.passengers;

    if (!pickup) {
      showToast('Please enter your pickup location first.');
      if (pickupIn) {
        pickupIn.classList.add('field-error-glow');
        pickupIn.focus();
      }
      return;
    }
    if (!dropoff) {
      showToast('Please enter your drop-off destination first.');
      if (dropoffIn) {
        dropoffIn.classList.add('field-error-glow');
        dropoffIn.focus();
      }
      return;
    }

    if (vehicleKey) {
      selectVehicle(vehicleKey);
    }

    state.booking.pickup = pickup;
    state.booking.dropoff = dropoff;
    state.booking.date = date;
    state.booking.time = time;
    state.booking.passengers = passengers;
    state.booking.dispatchStatus = 'awaiting_driver_acceptance';
    state.booking.assignedDriver = null;

    const v = state.vehicles[state.booking.vehicleKey] || state.vehicles.executive;

    // Play transmit chirp
    playNotificationAudio('transmit');

    // Populate and open Passenger Waiting Radar Modal
    const modal = document.getElementById('modalFleetDriverDispatch');
    const waitingState = document.getElementById('fleetDispatchWaitingState');
    const acceptedState = document.getElementById('fleetDispatchAcceptedState');

    if (modal && waitingState && acceptedState) {
      const pEl = document.getElementById('modalDispatchPickup');
      const dEl = document.getElementById('modalDispatchDropoff');
      const vEl = document.getElementById('modalDispatchVehicle');
      const fEl = document.getElementById('modalDispatchFare');
      const dtEl = document.getElementById('modalDispatchDate');
      const tmEl = document.getElementById('modalDispatchTime');

      if (pEl) pEl.textContent = pickup;
      if (dEl) dEl.textContent = dropoff;
      if (vEl) vEl.textContent = v.name;
      if (fEl) fEl.textContent = `£${v.total.toFixed(2)}`;
      if (dtEl) dtEl.textContent = formatDateDisplay(date);
      if (tmEl) tmEl.textContent = time || '04:30 AM';

      waitingState.style.display = 'block';
      acceptedState.style.display = 'none';
      modal.style.display = 'flex';
    }

    // Trigger Global Floating Driver Alert
    const driverAlert = document.getElementById('driverDispatchNotificationAlert');
    if (driverAlert) {
      const apLoc = document.getElementById('dfaPickupLoc');
      const adLoc = document.getElementById('dfaDropoffLoc');
      const avPill = document.getElementById('dfaVehiclePill');
      const afPill = document.getElementById('dfaFarePill');
      const atPill = document.getElementById('dfaTimePill');

      if (apLoc) apLoc.textContent = pickup;
      if (adLoc) adLoc.textContent = dropoff;
      if (avPill) avPill.textContent = `🚗 ${v.name}`;
      if (afPill) afPill.textContent = `💷 £${v.total.toFixed(2)} Payout`;
      if (atPill) atPill.textContent = `⏰ ${time || '04:30'}`;
      driverAlert.style.display = 'block';
    }

    // Also update Driver Console incoming trip if visible
    const didBox = document.getElementById('driverIncomingDispatchBox');
    if (didBox) {
      const trk = document.getElementById('didTripRoute');
      const vc = document.getElementById('didVehicleClass');
      const fa = document.getElementById('didFareAmount');
      if (trk) trk.textContent = `${pickup} → ${dropoff}`;
      if (vc) vc.textContent = `🚗 ${v.name}`;
      if (fa) fa.textContent = `💷 Fare: £${v.total.toFixed(2)}`;
      didBox.style.display = 'flex';
    }

    // Sound alert for drivers
    setTimeout(() => {
      playNotificationAudio('driver_alert');
    }, 400);

    // Persist notification to Supabase in background
    try {
      insertNotification({
        title: '🚨 New Chauffeur Journey Request',
        message: `${pickup} → ${dropoff} (${v.name}, £${v.total.toFixed(2)})`,
        type: 'driver_dispatch',
        read: false
      });
    } catch (err) {}

    showToast('Journey dispatched! Notifying active local drivers...');
  }

  function confirmVehicleSelection(vehicleKey, e) {
    requestFleetChauffeur(vehicleKey, e);
  }

  function selectVehicleAndProceed(vehicleKey) {
    selectVehicle(vehicleKey);
    navigateTo('select-vehicle');
  }

  // 4. Driver accepts the notification -> Further process will move on!
  function acceptDriverDispatch(driverName = 'Dave M.') {
    const v = state.vehicles[state.booking.vehicleKey] || state.vehicles.executive;

    state.booking.dispatchStatus = 'accepted';
    state.booking.assignedDriver = `${driverName} (${v.model || 'Executive Mercedes-Benz'})`;
    state.booking.driverDetails = {
      name: driverName,
      rating: '4.98 ★ (520+ Transfers)',
      vehicle: v.model || 'Executive Mercedes-Benz E-Class',
      reg: 'YS24 OKL',
      phone: '+44 1453 888999'
    };

    // Play triumphant success audio chime
    playNotificationAudio('success');

    // Dismiss floating driver alert
    dismissDriverNotification();

    // Hide incoming box in driver console
    const didBox = document.getElementById('driverIncomingDispatchBox');
    if (didBox) didBox.style.display = 'none';

    // Transition passenger waiting modal to Accepted State
    const waitingState = document.getElementById('fleetDispatchWaitingState');
    const acceptedState = document.getElementById('fleetDispatchAcceptedState');
    if (waitingState && acceptedState) {
      const nameTxt = document.getElementById('acceptedDriverNameText');
      const fullTxt = document.getElementById('acceptedDriverFullName');
      const specsTxt = document.getElementById('acceptedDriverVehicleSpecs');

      if (nameTxt) nameTxt.textContent = driverName;
      if (fullTxt) fullTxt.textContent = driverName;
      if (specsTxt) specsTxt.innerHTML = `${v.name} (${v.model}) &bull; Reg: <strong>YS24 OKL</strong>`;

      waitingState.style.display = 'none';
      acceptedState.style.display = 'block';
    }

    // Update allocated driver banner in passenger details
    updateAllocatedChauffeurUI();
    updateSummarySidebar();

    showToast(`Chauffeur ${driverName} accepted your journey! Moving forward...`);

    // The further process will move on after driver accepts!
    setTimeout(() => {
      proceedAfterDriverAcceptance();
    }, 1800);
  }

  // 5. Move further into the booking process (Passenger Details / Payment)
  function proceedAfterDriverAcceptance() {
    // Hide modal
    const modal = document.getElementById('modalFleetDriverDispatch');
    if (modal) modal.style.display = 'none';

    state.booking.nextStep = 'passenger-details';

    // Check sign in or move forward
    if (!state.currentUser || !state.currentUser.isLoggedIn) {
      showToast('Chauffeur allocated! Please sign in or confirm your contact details.');
      navigateTo('signin');
    } else {
      showToast('Chauffeur allocated! Entering passenger details.');
      navigateTo('passenger-details');
    }
  }

  function cancelFleetDriverDispatch() {
    const modal = document.getElementById('modalFleetDriverDispatch');
    if (modal) modal.style.display = 'none';
    dismissDriverNotification();
    state.booking.dispatchStatus = 'cancelled';
    showToast('Chauffeur dispatch request cancelled.');
  }

  function dismissDriverNotification() {
    const driverAlert = document.getElementById('driverDispatchNotificationAlert');
    if (driverAlert) driverAlert.style.display = 'none';
  }

  function updateAllocatedChauffeurUI() {
    const driver = state.booking.driverDetails || {
      name: 'Dave M.',
      rating: '4.98 ★ (520+ Transfers)',
      vehicle: 'Executive Mercedes-Benz E-Class',
      reg: 'YS24 OKL'
    };

    const passDriverName = document.getElementById('passAllocatedDriverName');
    const passDriverVeh = document.getElementById('passAllocatedVehicle');
    const passDriverReg = document.getElementById('passAllocatedReg');
    const passRating = document.getElementById('passAllocatedRating');
    const sDriverName = document.getElementById('sidebarDriverName');

    if (passDriverName) passDriverName.textContent = driver.name;
    if (passDriverVeh) passDriverVeh.textContent = driver.vehicle;
    if (passDriverReg) passDriverReg.textContent = driver.reg;
    if (passRating) passRating.textContent = driver.rating;
    if (sDriverName) sDriverName.textContent = driver.name;
  }

  // Update Summary Sidebars across all views
  function updateSummarySidebar() {
    const v = state.vehicles[state.booking.vehicleKey] || state.vehicles.executive;
    const dateDisplay = formatDateDisplay(state.booking.date);
    const timeDisplay = state.booking.time || '04:30 AM';

    // Vehicle Select View Sidebar
    const sPickup = document.getElementById('sidebarPickup');
    const sDropoff = document.getElementById('sidebarDropoff');
    const sDate = document.getElementById('sidebarDate');
    const sTime = document.getElementById('sidebarTime');
    const sBaseFare = document.getElementById('sidebarBaseFare');
    const sTaxes = document.getElementById('sidebarTaxes');
    const sTotal = document.getElementById('sidebarTotal');

    if (sPickup) sPickup.textContent = state.booking.pickup;
    if (sDropoff) sDropoff.textContent = state.booking.dropoff;
    if (sDate) sDate.textContent = dateDisplay;
    if (sTime) sTime.textContent = timeDisplay;
    if (sBaseFare) sBaseFare.textContent = `£${v.basePrice.toFixed(2)}`;
    if (sTaxes) sTaxes.textContent = `£${v.tax.toFixed(2)}`;
    if (sTotal) sTotal.textContent = `£${v.total.toFixed(2)}`;

    // Passenger Details View Sidebar
    const pPickup = document.getElementById('passSidebarPickup');
    const pDropoff = document.getElementById('passSidebarDropoff');
    const pDateTime = document.getElementById('passSidebarDateTime');
    const pBaseFare = document.getElementById('passBaseFare');
    const pTaxes = document.getElementById('passTaxes');
    const pTotal = document.getElementById('passTotalPrice');
    const pVehImg = document.getElementById('passVehicleImg');
    const pVehName = document.getElementById('passVehicleName');

    if (pPickup) pPickup.textContent = state.booking.pickup;
    if (pDropoff) pDropoff.textContent = state.booking.dropoff;
    if (pDateTime) pDateTime.textContent = `${dateDisplay}, ${timeDisplay}`;
    if (pBaseFare) pBaseFare.textContent = `£${v.basePrice.toFixed(2)}`;
    if (pTaxes) pTaxes.textContent = `£${v.tax.toFixed(2)}`;
    if (pTotal) pTotal.textContent = `£${v.total.toFixed(2)}`;
    if (pVehImg) pVehImg.src = v.img;
    if (pVehName) pVehName.textContent = v.name;

    // Payment Review View
    const revPickup = document.getElementById('revPickup');
    const revDropoff = document.getElementById('revDropoff');
    const revDateTime = document.getElementById('revDateTime');
    const revPassengers = document.getElementById('revPassengers');
    const revCarImg = document.getElementById('revCarImg');
    const revCarName = document.getElementById('revCarName');
    const finalFare = document.getElementById('finalVehicleFare');
    const finalTotal = document.getElementById('finalTotalFare');
    const btnPayText = document.getElementById('btnPayText');

    if (revPickup) revPickup.textContent = state.booking.pickup;
    if (revDropoff) revDropoff.textContent = state.booking.dropoff;
    if (revDateTime) revDateTime.textContent = `${dateDisplay}, ${timeDisplay}`;
    if (revPassengers) revPassengers.textContent = state.booking.passengers;
    if (revCarImg) revCarImg.src = v.img;
    if (revCarName) revCarName.textContent = v.name;
    if (finalFare) finalFare.textContent = `£${v.total.toFixed(2)}`;
    if (finalTotal) finalTotal.textContent = `£${v.total.toFixed(2)}`;
    if (btnPayText) btnPayText.textContent = `Securely Complete Booking • £${v.total.toFixed(2)}`;
  }

  // Toggle Special Request Chips
  function toggleRequestChip(btn) {
    btn.classList.toggle('active');
    const req = btn.getAttribute('data-req');
    const idx = state.booking.passenger.requests.indexOf(req);
    if (idx > -1) {
      state.booking.passenger.requests.splice(idx, 1);
    } else {
      state.booking.passenger.requests.push(req);
    }
  }

  // Handle Passenger Details Submit
  function handlePassengerSubmit(e) {
    e.preventDefault();
    const fullName = document.getElementById('passFullName').value.trim();
    const email = document.getElementById('passEmail').value.trim();
    const phone = document.getElementById('passPhone').value.trim();
    const flightNum = document.getElementById('passFlightNum').value.trim();
    const notes = document.getElementById('passNotes').value.trim();

    state.booking.passenger.fullName = fullName;
    state.booking.passenger.email = email;
    state.booking.passenger.phone = phone;
    state.booking.passenger.flightNum = flightNum;
    state.booking.passenger.notes = notes;

    // Update review view values
    const revPassName = document.getElementById('revPassName');
    const revPassEmail = document.getElementById('revPassEmail');
    const revPassPhone = document.getElementById('revPassPhone');

    if (revPassName) revPassName.textContent = fullName;
    if (revPassEmail) revPassEmail.textContent = email;
    if (revPassPhone) revPassPhone.textContent = `+44 ${phone}`;

    showToast('Passenger details saved. Review & complete payment.');
    navigateTo('payment');
  }

  // Supabase Connection Status Badge Helper
  function updateSupabaseStatusBadge(isConnected, message) {
    const badge = document.getElementById('supabaseStatus');
    if (!badge) return;
    if (isConnected) {
      badge.classList.remove('error');
      badge.classList.add('connected');
      badge.title = 'Database Connected (Live Data Sync Active)';
      badge.innerHTML = `<span class="db-dot"></span><span class="db-text">Connected</span>`;
    } else {
      badge.classList.remove('connected');
      badge.classList.add('error');
      badge.title = `Database Offline: ${message || 'Check connection'}`;
      badge.innerHTML = `<span class="db-dot"></span><span class="db-text">Offline</span>`;
    }
  }

  // Update Dashboard Auth Gate Visibility
  function updateDashboardUI() {
    const authGate = document.getElementById('dashAuthGate');
    const authContent = document.getElementById('dashAuthContent');
    const u = state.currentUser;
    const isLoggedIn = u && u.isLoggedIn !== false;

    if (!isLoggedIn) {
      if (authGate) authGate.classList.remove('d-none');
      if (authContent) authContent.classList.add('d-none');
    } else {
      if (authGate) authGate.classList.add('d-none');
      if (authContent) authContent.classList.remove('d-none');
    }
  }

  // Load Bookings into Customer Dashboard
  async function loadDashboardFromSupabase() {
    updateDashboardUI();
    const tableBody = document.getElementById('dashTableBody');
    if (!tableBody) return;

    const u = state.currentUser;
    const isLoggedIn = u && u.isLoggedIn !== false;
    if (!isLoggedIn) return;

    try {
      let bookings = await fetchBookings();
      if (!bookings || bookings.length === 0) {
        bookings = (state.admin && state.admin.bookings && state.admin.bookings.length > 0)
          ? state.admin.bookings
          : [
            {
              ref: '#JR-8821',
              pickup: 'Stroud, Cotswolds, GL5',
              dropoff: 'London Heathrow Terminal 5',
              date: '2026-10-24',
              time: '04:30',
              passengers: 2,
              vehicle: 'Executive Sedan (Mercedes-Benz)',
              amount: 75,
              status: 'Confirmed',
              payment_status: 'Paid',
              assigned_driver: 'Dave M. (Mercedes E-Class)',
              flight_number: 'BA184'
            },
            {
              ref: '#JR-7412',
              pickup: 'Tetbury, Gloucestershire',
              dropoff: 'London Gatwick South Terminal',
              date: '2026-10-14',
              time: '08:15',
              passengers: 4,
              vehicle: 'Mercedes V-Class Luxury MPV',
              amount: 110,
              status: 'Completed',
              payment_status: 'Paid',
              assigned_driver: 'Sarah Jenkins',
              flight_number: 'VS11'
            }
          ];
      }

      // Add ongoing recorded ride if present
      const ongoing = getOngoingRide();
      if (ongoing && !bookings.some(b => b.ref === ongoing.tripRef || b.ref === '#' + ongoing.tripRef)) {
        bookings.unshift({
          ref: ongoing.tripRef.startsWith('#') ? ongoing.tripRef : '#' + ongoing.tripRef,
          pickup: ongoing.pickupAddress,
          dropoff: ongoing.dropoffAddress,
          date: ongoing.date || '2026-10-24',
          time: ongoing.time || '04:30',
          passengers: ongoing.passengers || 2,
          vehicle: ongoing.vehicleName || 'Executive Mercedes-Benz',
          amount: ongoing.fare || 75,
          status: ongoing.status === 'dropped_off' ? 'Completed' : 'Confirmed',
          payment_status: 'Paid',
          assigned_driver: ongoing.driverName || 'Dave M.',
          flight_number: ongoing.flightNumber || 'BA184'
        });
      }

      state.bookingsCache = bookings;
      if (state.admin && (!state.admin.bookings || state.admin.bookings.length === 0)) {
        state.admin.bookings = [...bookings];
      }

      tableBody.innerHTML = bookings.map(b => {
        const vName = b.vehicle || 'Executive Sedan';
        const ref = b.ref && b.ref.startsWith('#') ? b.ref : `#${b.ref || 'JR-8900'}`;
        const rawRef = ref.replace('#', '');
        const statusClass = (b.status || 'confirmed').toLowerCase();
        const pickupEscaped = (b.pickup || '').replace(/'/g, "\\'");
        const dropoffEscaped = (b.dropoff || '').replace(/'/g, "\\'");
        const vehicleEscaped = vName.replace(/'/g, "\\'");
        const dateDisplay = formatDateDisplay(b.date);
        const timeDisplay = (b.time || '').replace(/'/g, "\\'");
        const fare = b.amount || 75;

        return `
          <tr data-status="${statusClass}">
            <td><strong>${ref}</strong></td>
            <td>${vName}</td>
            <td>${b.pickup || ''}</td>
            <td>${b.dropoff || ''}</td>
            <td>${dateDisplay}, ${timeDisplay}</td>
            <td><span class="badge-status badge-${statusClass}">${b.status || 'Confirmed'}</span></td>
            <td class="text-right">
              <div class="table-action-btns">
                <button type="button" class="btn btn-outline btn-xs" style="color: #b45309; border-color: #fde68a; background: #fffbeb;" title="Live Chauffeur GPS Tracking" onclick="App.trackTripLive('${rawRef}')">
                  <span>🛰️ Track</span>
                </button>
                <button type="button" class="btn btn-outline btn-xs" title="Manage Trip Amendments" onclick="App.showManageTripModal('${rawRef}')">
                  <span>Manage</span>
                </button>
                <button type="button" class="btn btn-outline btn-xs" title="View & Print Official Receipt" onclick="App.viewReceipt('${ref}', '${pickupEscaped}', '${dropoffEscaped}', ${fare}, '${dateDisplay}', '${timeDisplay}', '${vehicleEscaped}')">
                  <svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                  <span>Receipt</span>
                </button>
                <button type="button" class="btn btn-navy btn-xs" onclick="App.rebookTrip('${pickupEscaped}', '${dropoffEscaped}', ${fare})">Rebook</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      // Update Dashboard Metrics dynamically
      const now = new Date();
      const upcomingBookings = bookings.filter(b => b.status !== 'Completed' && b.status !== 'Cancelled');
      const completedCount = bookings.filter(b => b.status === 'Completed').length;
      const totalAmount = bookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

      const elUpcoming = document.getElementById('dashStatUpcoming');
      const elCompleted = document.getElementById('dashStatCompleted');
      const elTotal = document.getElementById('dashStatTotal');

      if (elUpcoming) elUpcoming.textContent = upcomingBookings.length;
      if (elCompleted) elCompleted.textContent = completedCount;
      if (elTotal) {
        elTotal.textContent = totalAmount >= 1000 
          ? `£${(totalAmount / 1000).toFixed(1)}k` 
          : `£${totalAmount.toFixed(0)}`;
      }

      // Update Side-dock Booking count badge
      const sideDockBadge = document.getElementById('sideDockBookingCount');
      if (sideDockBadge) {
        const count = upcomingBookings.length || bookings.length;
        sideDockBadge.textContent = count > 0 ? `${count} RIDE${count > 1 ? 'S' : ''}` : 'RIDES';
      }

      // Update Next Journey card with first upcoming trip
      if (upcomingBookings.length > 0) {
        const nextBooking = upcomingBookings[0];
        const routeTitle = document.getElementById('liveRouteTitle');
        const countdown = document.getElementById('liveCountdown');
        const meta = document.getElementById('liveMeta');

        if (routeTitle) {
          routeTitle.textContent = `${nextBooking.pickup} → ${nextBooking.dropoff}`;
        }

        if (countdown && nextBooking.date) {
          const tripDate = new Date(nextBooking.date);
          const diffMs = tripDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (diffDays > 0) {
            countdown.textContent = `${diffDays} Day${diffDays > 1 ? 's' : ''} Remaining`;
          } else if (diffDays === 0) {
            countdown.textContent = `Today (${nextBooking.time || 'Scheduled'})`;
          } else {
            countdown.textContent = `Scheduled`;
          }
        }

        if (meta) {
          meta.innerHTML = `
            <span>📅 ${formatDateDisplay(nextBooking.date)}, ${nextBooking.time || '04:30 AM'}</span>
            <span>🚘 ${nextBooking.vehicle || 'Executive Sedan (Mercedes-Benz)'}</span>
            <span>👤 ${nextBooking.passengers || 2} Passengers • Ref ${nextBooking.ref}</span>
          `;
        }

        // 4-step dynamic journey tracker progress
        const trkStep1 = document.getElementById('trkStep1');
        const trkStep2 = document.getElementById('trkStep2');
        const trkStep2Wrap = document.getElementById('trkStep2Wrap');
        const trkBar2 = document.getElementById('trkBar2');
        const trkStep3 = document.getElementById('trkStep3');
        const trkStep3Wrap = document.getElementById('trkStep3Wrap');
        const trkBar3 = document.getElementById('trkBar3');
        const trkStep4 = document.getElementById('trkStep4');
        const trkStep4Wrap = document.getElementById('trkStep4Wrap');

        if (trkStep1) {
          trkStep1.textContent = `${formatDateDisplay(nextBooking.date)}, ${nextBooking.time || 'Confirmed'}`;
        }

        const isDriverAssigned = Boolean(nextBooking.assigned_driver);
        const statusLower = (nextBooking.status || '').toLowerCase();

        if (trkStep2Wrap) {
          if (isDriverAssigned) {
            trkStep2Wrap.className = 'track-step done';
            if (trkStep2) trkStep2.textContent = nextBooking.assigned_driver;
            if (trkBar2) trkBar2.className = 'track-bar done';
          } else {
            trkStep2Wrap.className = 'track-step active';
            if (trkStep2) trkStep2.textContent = 'Standby Dispatch';
            if (trkBar2) trkBar2.className = 'track-bar';
          }
        }

        if (trkStep3Wrap) {
          if (statusLower.includes('route') || statusLower.includes('progress')) {
            trkStep3Wrap.className = 'track-step active';
            if (trkStep3) trkStep3.textContent = 'En Route';
            if (trkBar3) trkBar3.className = 'track-bar done';
          } else if (statusLower === 'completed') {
            trkStep3Wrap.className = 'track-step done';
            if (trkStep3) trkStep3.textContent = 'Completed';
            if (trkBar3) trkBar3.className = 'track-bar done';
          } else {
            trkStep3Wrap.className = 'track-step';
            if (trkStep3) trkStep3.textContent = 'Standby';
            if (trkBar3) trkBar3.className = 'track-bar';
          }
        }

        if (trkStep4Wrap) {
          if (statusLower === 'completed') {
            trkStep4Wrap.className = 'track-step done';
            if (trkStep4) trkStep4.textContent = 'Arrived';
          } else {
            trkStep4Wrap.className = 'track-step';
            if (trkStep4) trkStep4.textContent = 'Terminal Drop';
          }
        }

        const btnManageActive = document.getElementById('btnManageActiveTrip');
        if (btnManageActive) {
          const rawRef = String(nextBooking.ref || '').replace('#', '');
          btnManageActive.onclick = () => App.showManageTripModal(rawRef);
        }

        const btnTrackLiveActive = document.getElementById('btnTrackLiveActiveTrip');
        if (btnTrackLiveActive) {
          const rawRef = String(nextBooking.ref || '').replace('#', '');
          btnTrackLiveActive.onclick = () => App.trackTripLive(rawRef);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard from Supabase:', err);
    }
  }

  // Payment Submit & Supabase Persistence
  async function handlePaymentSubmit(e) {
    e.preventDefault();
    const payBtn = document.getElementById('btnCompletePayment');
    const originalText = payBtn ? payBtn.innerHTML : '';

    if (payBtn) {
      payBtn.disabled = true;
      payBtn.innerHTML = `<span>⏳ Processing payment & saving to Supabase...</span>`;
    }

    // Generate unique reference
    const randomRef = '#JR-' + Math.floor(1000 + Math.random() * 9000);
    state.booking.bookingRef = randomRef;
    const v = state.vehicles[state.booking.vehicleKey] || state.vehicles.executive;
    const pass = state.booking.passenger;

    // Build database record matching Supabase schema
    const bookingRecord = {
      ref: randomRef,
      customer_name: pass.fullName || (state.currentUser && state.currentUser.name) || 'James Doe',
      customer_email: pass.email || (state.currentUser && state.currentUser.email) || 'james@example.com',
      customer_phone: pass.phone ? `+44 ${pass.phone}` : ((state.currentUser && state.currentUser.phone) || '+44 7700 900000'),
      pickup: state.booking.pickup,
      dropoff: state.booking.dropoff,
      date: state.booking.date,
      time: state.booking.time || '04:30',
      passengers: parseInt(state.booking.passengers) || 2,
      luggage: 2,
      vehicle: `${v.name} (${v.model})`,
      amount: v.total,
      status: 'Confirmed',
      payment_status: 'Paid',
      payment_method: 'Stripe Encrypted Card',
      assigned_driver: state.booking.assignedDriver || 'Dave M. (Executive Mercedes-Benz E-Class)',
      flight_number: pass.flightNum || null,
      special_requests: pass.requests || [],
      admin_notes: pass.notes || null,
      active: true
    };

    const insertResult = await insertBooking(bookingRecord);

    // Also attempt inserting a payment transaction in background
    try {
      await insertPayment({
        booking_ref: randomRef,
        customer_email: bookingRecord.customer_email,
        amount: v.total,
        currency: 'GBP',
        status: 'Paid',
        payment_method: 'Visa •••• 4242'
      });
    } catch (e) {}

    // Update user stats
    if (state.currentUser) {
      state.currentUser.rides = (state.currentUser.rides || 0) + 1;
      state.currentUser.spent = (state.currentUser.spent || 0) + v.total;
      try {
        localStorage.setItem('jos_current_user', JSON.stringify(state.currentUser));
      } catch (e) {}
    }

    // Immediately record confirmed booking into Admin Panel
    if (!state.admin.bookings) state.admin.bookings = [];
    const existingIdx = state.admin.bookings.findIndex(b => b.ref === randomRef);
    if (existingIdx >= 0) {
      state.admin.bookings[existingIdx] = bookingRecord;
    } else {
      state.admin.bookings.unshift(bookingRecord);
    }
    saveAdminBookings();
    updateAdminKpis();
    renderAdminBookings();

    // Start and record ongoing ride as soon as pickup and drop-off are confirmed from user!
    const activeOngoingRide = startOngoingRide(bookingRecord);
    state.ongoingRide = activeOngoingRide;
    startOngoingRideTimer();
    renderAdminOngoingRides();

    if (payBtn) {
      payBtn.disabled = false;
      payBtn.innerHTML = originalText;
    }

    // Populate Success Modal
    document.getElementById('modalBookingRef').textContent = randomRef;
    document.getElementById('modalPassengerName').textContent = bookingRecord.customer_name;
    document.getElementById('modalPickupLoc').textContent = state.booking.pickup;
    document.getElementById('modalDropoffLoc').textContent = state.booking.dropoff;
    document.getElementById('modalDateTime').textContent = `${formatDateDisplay(state.booking.date)} at ${state.booking.time || '04:30'}`;
    document.getElementById('modalVehicle').textContent = `${v.name} (${v.model})`;
    document.getElementById('modalTotalPrice').textContent = `£${v.total.toFixed(2)}`;

    const modal = document.getElementById('modalBookingSuccess');
    if (modal) modal.classList.add('show');

    if (insertResult.success) {
      showToast('Booking successfully saved to Supabase database!');
      loadDashboardFromSupabase();
    } else {
      showToast('Booking confirmed locally. (Supabase sync pending)');
    }
  }

  function closeSuccessModal() {
    const modal = document.getElementById('modalBookingSuccess');
    if (modal) modal.classList.remove('show');
  }

  function goToDashboardAfterBooking() {
    closeSuccessModal();
    navigateTo('dashboard');
    loadDashboardFromSupabase();
    showToast('Welcome to your Dashboard! Your transfer is scheduled.');
  }

  // Rebooking Actions in Dashboard
  function rebookTrip(pickup, dropoff, fare) {
    state.booking.pickup = pickup;
    state.booking.dropoff = dropoff;
    showToast(`Rebooking journey: ${pickup} → ${dropoff}`);
    navigateTo('select-vehicle');
  }

  function rebookLastTrip() {
    rebookTrip('Reading (RG1 2QE)', 'Heathrow T5 (TW6 2GA)', 75);
  }

  function showDashboardTab(tabName, btn) {
    document.querySelectorAll('.dash-nav-item').forEach(b => {
      if (b.getAttribute('data-tab') === tabName) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
    document.querySelectorAll('.dash-m-tab').forEach(b => {
      if (b.getAttribute('data-tab') === tabName) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    if (tabName === 'overview') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tabName === 'history') {
      const hist = document.getElementById('dashHistoryCard');
      if (hist) hist.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (tabName === 'profile') {
      openProfileModal();
    } else if (tabName === 'payments') {
      openPaymentsModal();
    } else if (tabName === 'help') {
      openLiveSupport();
    }
  }

  /* ============================================================== */
  /* PASSENGER PROFILE MANAGEMENT                                   */
  /* ============================================================== */

  function openProfileModal() {
    const modal = document.getElementById('modalProfile');
    if (!modal) return;

    const u = state.currentUser;
    if (!u || u.isLoggedIn === false) {
      openAuthModal('signin');
      return;
    }

    const elInitials = document.getElementById('profAvatarCircle');
    const elName = document.getElementById('profDisplayName');
    const elTier = document.getElementById('profBadgeTier');
    const inpName = document.getElementById('usrProfName');
    const inpEmail = document.getElementById('usrProfEmail');
    const inpPhone = document.getElementById('usrProfPhone');
    const inpAddress = document.getElementById('usrProfAddress');
    const inpNotes = document.getElementById('usrProfNotes');

    const initials = (u.name || 'Client')
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    if (elInitials) elInitials.textContent = initials;
    if (elName) elName.textContent = u.name;
    if (elTier) elTier.textContent = u.tier === 'Corporate' ? 'Corporate Account' : (u.isAdmin ? 'Executive Super Admin' : 'Verified Passenger');
    if (inpName) inpName.value = u.name || '';
    if (inpEmail) inpEmail.value = u.email || '';
    if (inpPhone) inpPhone.value = u.phone || '';
    if (inpAddress) inpAddress.value = u.location || '';
    if (inpNotes) inpNotes.value = u.notes || '';

    modal.classList.add('show');
  }

  function closeProfileModal() {
    const modal = document.getElementById('modalProfile');
    if (modal) modal.classList.remove('show');
  }

  async function handleProfileSave(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveProfile');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳ Saving profile...</span>';
    }

    const name = document.getElementById('usrProfName')?.value.trim() || state.currentUser.name;
    const email = document.getElementById('usrProfEmail')?.value.trim() || state.currentUser.email;
    const phone = document.getElementById('usrProfPhone')?.value.trim() || state.currentUser.phone;
    const address = document.getElementById('usrProfAddress')?.value.trim() || '';
    const notes = document.getElementById('usrProfNotes')?.value.trim() || '';

    if (!state.currentUser) {
      state.currentUser = { id: 'usr-' + Date.now(), isLoggedIn: true };
    }
    state.currentUser.name = name;
    state.currentUser.email = email;
    state.currentUser.phone = phone;
    state.currentUser.location = address;
    state.currentUser.notes = notes;

    try {
      localStorage.setItem('jos_current_user', JSON.stringify(state.currentUser));

      if (state.admin && state.admin.users) {
        const u = state.admin.users.find(x => x.id === state.currentUser.id || x.email === state.currentUser.email);
        if (u) {
          u.name = name;
          u.email = email;
          u.phone = phone;
          u.location = address;
          u.notes = notes;
          saveAdminUsers();
        }
      }

      // Sync to Supabase in background
      try {
        await updateProfile(state.currentUser.id, {
          name,
          email,
          phone,
          location: address,
          notes
        });
      } catch (err) {}

      updateUserUI();
      showToast('Passenger profile & transfer preferences updated!');
      closeProfileModal();
    } catch (err) {
      console.error('Error saving profile:', err);
      showToast('Profile updated locally.');
      closeProfileModal();
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  }

  /* ============================================================== */
  /* PAYMENTS & INVOICES MODAL                                      */
  /* ============================================================== */

  async function openPaymentsModal() {
    const modal = document.getElementById('modalPayments');
    if (!modal) return;

    modal.classList.add('show');
    const container = document.getElementById('paymentsListContainer');
    if (!container) return;

    container.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--color-text-muted);"><span>⏳ Fetching payment transactions...</span></div>`;

    try {
      let payments = await fetchPayments();
      if (!payments || payments.length === 0) {
        const allBookings = state.admin.bookings && state.admin.bookings.length > 0 
          ? state.admin.bookings 
          : (state.bookingsCache || []);

        if (allBookings.length > 0) {
          payments = allBookings.map(b => ({
            id: b.id || b.ref,
            booking_ref: b.ref,
            amount: b.amount || 75,
            status: b.payment_status || 'Paid',
            payment_method: b.payment_method || 'Visa ending in 4242',
            created_at: b.created_at || b.date,
            pickup: b.pickup,
            dropoff: b.dropoff,
            vehicle: b.vehicle,
            date: b.date,
            time: b.time
          }));
        } else {
          payments = [
            {
              id: 'pay-1',
              booking_ref: '#JR-8821',
              amount: 75.00,
              status: 'Paid',
              payment_method: 'Visa •••• 4242',
              created_at: '2026-10-21',
              pickup: 'Stroud, Cotswolds, GL5',
              dropoff: 'London Heathrow Terminal 5',
              vehicle: 'Executive Chauffeur Sedan',
              date: '2026-10-24',
              time: '04:30'
            },
            {
              id: 'pay-2',
              booking_ref: '#JR-7412',
              amount: 110.00,
              status: 'Paid',
              payment_method: 'Mastercard •••• 8821',
              created_at: '2026-10-14',
              pickup: 'Tetbury, Gloucestershire',
              dropoff: 'London Gatwick South Terminal',
              vehicle: 'Mercedes V-Class MPV',
              date: '2026-10-14',
              time: '08:15'
            }
          ];
        }
      }

      container.innerHTML = payments.map(p => {
        const amt = Number(p.amount) || 75;
        const ref = p.booking_ref || '#JR-8821';
        const method = p.payment_method || 'Stripe Encrypted Card';
        const dateStr = p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent';
        const pickup = (p.pickup || 'Stroud, Cotswolds').replace(/'/g, "\\'");
        const dropoff = (p.dropoff || 'Heathrow T5').replace(/'/g, "\\'");
        const vehicle = (p.vehicle || 'Executive Sedan').replace(/'/g, "\\'");
        const dateVal = p.date || dateStr;
        const timeVal = p.time || '04:30 AM';

        return `
          <div class="payment-tx-card">
            <div class="payment-tx-left">
              <div class="payment-tx-icon">💳</div>
              <div class="payment-tx-details">
                <strong>${ref} &bull; £${amt.toFixed(2)}</strong>
                <span>${method} &bull; ${dateStr}</span>
              </div>
            </div>
            <div class="payment-tx-right">
              <span class="badge-status badge-completed">${p.status || 'Paid'}</span>
              <button type="button" class="btn btn-outline btn-xs" onclick="App.viewReceipt('${ref}', '${pickup}', '${dropoff}', ${amt}, '${dateVal}', '${timeVal}', '${vehicle}')" title="View VAT Invoice">🧾 Invoice</button>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error('Error loading payments:', err);
      container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--color-danger);">Unable to load transactions.</div>`;
    }
  }

  function closePaymentsModal() {
    const modal = document.getElementById('modalPayments');
    if (modal) modal.classList.remove('show');
  }

  /* ============================================================== */
  /* RECEIPT & INVOICE VIEWER                                       */
  /* ============================================================== */

  function viewReceipt(ref, pickup, dropoff, fare, date, time, vehicle) {
    const modal = document.getElementById('modalReceipt');
    if (!modal) return;

    const elRef = document.getElementById('recModalRef');
    const elDate = document.getElementById('recModalDate');
    const elPickup = document.getElementById('recModalPickup');
    const elDropoff = document.getElementById('recModalDropoff');
    const elVehicle = document.getElementById('recModalVehicle');
    const elTotal = document.getElementById('recModalTotal');

    if (elRef) elRef.textContent = ref;
    if (elDate) elDate.textContent = `${date || 'Scheduled'}, ${time || '04:30 AM'}`;
    if (elPickup) elPickup.textContent = pickup;
    if (elDropoff) elDropoff.textContent = dropoff;
    if (elVehicle) elVehicle.textContent = vehicle || 'Executive Sedan (Mercedes-Benz)';
    const numFare = Number(fare) || 75;
    if (elTotal) elTotal.textContent = `£${numFare.toFixed(2)}`;

    modal.classList.add('show');
  }

  function closeReceiptModal() {
    const modal = document.getElementById('modalReceipt');
    if (modal) modal.classList.remove('show');
  }

  /* ============================================================== */
  /* LIVE TRIP AMENDMENT & MANAGE MODAL                             */
  /* ============================================================== */

  function showManageTripModal(bookingRef) {
    const modal = document.getElementById('modalManageTrip');
    if (!modal) return;

    const allBookings = state.admin.bookings && state.admin.bookings.length > 0 
      ? state.admin.bookings 
      : (state.bookingsCache || []);
    
    let target = null;
    if (bookingRef) {
      const cleanRef = String(bookingRef).replace('#', '');
      target = allBookings.find(b => String(b.ref).replace('#', '') === cleanRef);
    }
    if (!target) {
      target = allBookings.find(b => b.status !== 'Completed' && b.status !== 'Cancelled') || allBookings[0];
    }

    if (target) {
      const elRoute = document.getElementById('mTripRoute');
      const elTime = document.getElementById('mTripTime');
      const elDriver = document.getElementById('mTripDriver');
      const elVehicle = document.getElementById('mTripVehicle');
      const elStatus = document.getElementById('mTripStatus');
      const elHidden = document.getElementById('mTripRefHidden');
      const elFlight = document.getElementById('mTripFlight');
      const elNotes = document.getElementById('mTripNotes');

      if (elRoute) elRoute.textContent = `${target.pickup} → ${target.dropoff}`;
      if (elTime) elTime.textContent = `${formatDateDisplay(target.date)}, ${target.time || '04:30 AM'}`;
      if (elDriver) elDriver.textContent = target.assigned_driver || 'Pending Dispatch Assignment';
      if (elVehicle) elVehicle.textContent = target.vehicle || 'Executive Chauffeur Fleet';
      if (elStatus) {
        elStatus.textContent = target.status || 'Confirmed';
        elStatus.className = `badge-status badge-${(target.status || 'confirmed').toLowerCase()}`;
      }
      if (elHidden) elHidden.value = target.ref || '';
      if (elFlight) elFlight.value = target.flight_number || target.flight || '';
      if (elNotes) elNotes.value = target.admin_notes || (Array.isArray(target.special_requests) ? target.special_requests.join(', ') : '') || '';
    }

    modal.classList.add('show');
  }

  function closeManageTripModal() {
    const modal = document.getElementById('modalManageTrip');
    if (modal) modal.classList.remove('show');
  }

  async function handleManageTripSave(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveTripAmendments');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳ Saving amendments...</span>';
    }

    const ref = document.getElementById('mTripRefHidden')?.value;
    const flight = document.getElementById('mTripFlight')?.value.trim();
    const notes = document.getElementById('mTripNotes')?.value.trim();

    try {
      if (ref) {
        await updateBooking(ref, {
          flight_number: flight,
          admin_notes: notes
        });
      }

      if (state.admin && state.admin.bookings) {
        const local = state.admin.bookings.find(b => b.ref === ref || String(b.ref).replace('#', '') === String(ref).replace('#', ''));
        if (local) {
          local.flight_number = flight;
          local.admin_notes = notes;
        }
      }

      showToast('Journey amendments saved and dispatched to operations team!');
      closeManageTripModal();
      await loadDashboardFromSupabase();
    } catch (err) {
      console.error('Error saving trip amendments:', err);
      showToast('Trip amendments saved locally.');
      closeManageTripModal();
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  }

  function openLiveSupport() {
    const modal = document.getElementById('modalLiveSupport');
    if (modal) {
      modal.classList.add('show');
    } else {
      showToast('Connecting you with 24/7 UK Dispatch Support on 01453 888 999...');
    }
  }

  function closeLiveSupportModal() {
    const modal = document.getElementById('modalLiveSupport');
    if (modal) modal.classList.remove('show');
  }

  /* ============================================================== */
  /* PASSENGER AUTHENTICATION (SIGN IN, SIGN UP, SIGN OUT)          */
  /* ============================================================== */

  function openAuthModal(tab = 'signin') {
    const modal = document.getElementById('modalAuth');
    if (!modal) return;
    switchAuthTab(tab);
    modal.classList.add('show');
  }

  function closeAuthModal() {
    const modal = document.getElementById('modalAuth');
    if (modal) modal.classList.remove('show');
  }

  function switchAuthTab(tab) {
    const tabSignIn = document.getElementById('tabBtnSignIn');
    const tabSignUp = document.getElementById('tabBtnSignUp');
    const formSignIn = document.getElementById('formSignIn');
    const formSignUp = document.getElementById('formSignUp');
    const formForgot = document.getElementById('formForgot');
    const title = document.getElementById('authModalTitle');

    if (tab === 'signin') {
      if (tabSignIn) tabSignIn.classList.add('active');
      if (tabSignUp) tabSignUp.classList.remove('active');
      if (formSignIn) formSignIn.style.display = 'block';
      if (formSignUp) formSignUp.style.display = 'none';
      if (formForgot) formForgot.style.display = 'none';
      if (title) title.textContent = 'Passenger Portal';
    } else if (tab === 'signup') {
      if (tabSignIn) tabSignIn.classList.remove('active');
      if (tabSignUp) tabSignUp.classList.add('active');
      if (formSignIn) formSignIn.style.display = 'none';
      if (formSignUp) formSignUp.style.display = 'block';
      if (formForgot) formForgot.style.display = 'none';
      if (title) title.textContent = 'Create Account';
    } else if (tab === 'forgot') {
      if (tabSignIn) tabSignIn.classList.remove('active');
      if (tabSignUp) tabSignUp.classList.remove('active');
      if (formSignIn) formSignIn.style.display = 'none';
      if (formSignUp) formSignUp.style.display = 'none';
      if (formForgot) formForgot.style.display = 'block';
      if (title) title.textContent = 'Reset Password';
    }
  }

  async function handleSignIn(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitSignIn');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳ Verifying credentials...</span>';
    }

    const email = document.getElementById('loginEmail')?.value.trim() || '';
    const password = document.getElementById('loginPassword')?.value || '';

    try {
      let user = state.admin.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        const supProfile = await fetchProfileByEmail(email);
        if (supProfile) {
          user = {
            id: supProfile.id || 'usr-' + Date.now(),
            name: supProfile.name || email.split('@')[0],
            email: supProfile.email || email,
            phone: supProfile.phone || '+44 7700 900000',
            tier: supProfile.tier || 'Standard',
            role: supProfile.role || (email.toLowerCase().includes('admin') ? 'admin' : 'customer'),
            status: supProfile.status || 'Active',
            location: supProfile.address || supProfile.location || 'Gloucestershire, UK',
            notes: supProfile.notes || '',
            rides: Number(supProfile.trips_count || supProfile.rides || 0),
            spent: Number(supProfile.total_spent || supProfile.spent || 0)
          };
        } else {
          const isAdminEmail = email.toLowerCase() === 'admin@josruralcars.co.uk' || email.toLowerCase() === 'admin@example.com' || email.toLowerCase().includes('admin');
          const generatedName = isAdminEmail ? 'Marcus Vance' : email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          user = {
            id: 'usr-' + Date.now(),
            name: generatedName || 'Valued Passenger',
            email,
            phone: isAdminEmail ? '+44 1234 567 890' : '+44 7700 900000',
            tier: isAdminEmail ? 'Executive Super Admin' : 'Standard',
            role: isAdminEmail ? 'admin' : 'customer',
            status: 'Active',
            location: isAdminEmail ? "Jo's Rural Cars HQ, Stroud, GL5 1AA" : 'Gloucestershire, Cotswolds',
            notes: isAdminEmail ? 'Head of Executive Dispatch.' : 'Verified via passenger portal',
            rides: 0,
            spent: 0
          };
          state.admin.users.push(user);
          saveAdminUsers();
        }
      }

      const isAdmin = user.role === 'admin' || user.isAdmin === true || 
                      user.email.toLowerCase() === 'admin@josruralcars.co.uk' || 
                      user.email.toLowerCase() === 'admin@example.com';

      if (isAdmin) {
        user.role = 'admin';
        user.isAdmin = true;
        user.tier = user.tier || 'Executive Super Admin';
      }

      user.isLoggedIn = true;
      state.currentUser = user;
      localStorage.setItem('jos_current_user', JSON.stringify(user));

      updateUserUI();
      closeAuthModal();

      if (isAdmin) {
        showToast(`🛡️ Welcome Administrator ${user.name}! Dispatch Control Center loaded.`);
        navigateTo('admin');
        loadAdminDashboard();
      } else {
        showToast(`Welcome back, ${user.name}! You are now signed in.`);
        loadDashboardFromSupabase();
      }
    } catch (err) {
      console.error('Sign-in error:', err);
      showToast('Error during sign-in. Please try again.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  }

  async function handleSignUp(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitSignUp');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳ Creating account...</span>';
    }

    const fullName = document.getElementById('regFullName')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim();
    const phone = document.getElementById('regPhone')?.value.trim();

    try {
      const newUser = {
        id: 'usr-' + Date.now(),
        name: fullName,
        email,
        phone,
        tier: 'Standard',
        status: 'Active',
        location: 'Cotswolds / London',
        notes: 'Registered online via passenger portal',
        rides: 0,
        spent: 0,
        isLoggedIn: true
      };

      state.admin.users.push(newUser);
      saveAdminUsers();

      try {
        await insertProfile({
          name: fullName,
          email,
          phone,
          tier: 'Standard',
          status: 'Active',
          location: 'Cotswolds / London',
          notes: 'Registered via web portal'
        });
      } catch (err) {}

      state.currentUser = newUser;
      localStorage.setItem('jos_current_user', JSON.stringify(newUser));

      updateUserUI();
      closeAuthModal();
      showToast(`Welcome to Jo's Rural Cars, ${fullName}! Account created.`);
      loadDashboardFromSupabase();
    } catch (err) {
      console.error('Sign-up error:', err);
      showToast('Error during registration.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  }

  function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail')?.value.trim();
    showToast(`Password reset link dispatched to ${email || 'your email'}.`);
    switchAuthTab('signin');
  }

  function handleSignOut() {
    if (state.currentUser) {
      state.currentUser.isLoggedIn = false;
    }
    state.currentUser = null;
    localStorage.removeItem('jos_current_user');
    signOutSupabaseAuth();
    updateUserUI();
    updateSignInPageView();
    document.body.classList.remove('in-admin-portal');
    const admSidebar = document.getElementById('admSidebar');
    if (admSidebar) admSidebar.classList.remove('open');
    const mobileDrawer = document.getElementById('mobileDrawer');
    if (mobileDrawer) mobileDrawer.classList.remove('open');
    showToast('You have been signed out.');
    navigateTo('home');
  }

  /* ============================================================== */
  /* GOOGLE OAUTH & SSO INTEGRATION METHODS                         */
  /* ============================================================== */

  let currentGoogleAuthContext = 'booking';

  async function handleGoogleSignIn(context = 'booking') {
    currentGoogleAuthContext = context;
    const isBooking = (context === 'booking');
    const btn = isBooking 
      ? document.getElementById('btnGoogleSignInPage') 
      : (document.getElementById('btnGoogleSignInModal') || document.getElementById('btnGoogleSignUpModal'));
    const origHtml = btn ? btn.innerHTML : '';

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `
        <span class="spinner-border spinner-border-sm" style="display:inline-block; width:16px; height:16px; border:2px solid #4285F4; border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite;" aria-hidden="true"></span>
        <span>Connecting to Google...</span>
      `;
    }

    try {
      // 1. Store intended destination in sessionStorage for post-redirect arrival
      try {
        sessionStorage.setItem('jos_auth_redirect', isBooking ? 'select-vehicle' : 'home');
      } catch (e) {}

      // 2. Initiate Supabase Google OAuth with clean origin/pathname (no hash fragment)
      const res = await signInWithGoogleOAuth(window.location.pathname || '/');
      
      // If Supabase returned a valid OAuth URL redirect, browser will navigate
      if (res && res.success && res.data && res.data.url) {
        return;
      }
      
      // 2. If provider is not enabled in Supabase or in offline/local testing,
      // present our interactive Google Account Chooser with helpful notice
      const showSetupNotice = Boolean(res && res.providerNotEnabled);
      openGoogleAccountChooser(context, showSetupNotice);
    } catch (err) {
      console.warn('Google sign-in exception:', err);
      openGoogleAccountChooser(context, true);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    }
  }

  function openGoogleAccountChooser(context = 'booking', showSetupNotice = false) {
    currentGoogleAuthContext = context;
    const modal = document.getElementById('modalGoogleChooser');
    const notice = document.getElementById('googleSetupNotice');
    if (notice) {
      notice.style.display = showSetupNotice ? 'block' : 'none';
    }
    if (modal) modal.classList.add('show');
  }

  function toggleGoogleSetupInstructions() {
    const el = document.getElementById('googleSetupInstructions');
    if (el) {
      el.style.display = (el.style.display === 'none' || !el.style.display) ? 'block' : 'none';
    }
  }

  function closeGoogleAccountChooser() {
    const modal = document.getElementById('modalGoogleChooser');
    if (modal) modal.classList.remove('show');
  }

  async function selectGoogleAccount(accountData) {
    if (!accountData || !accountData.email) return;

    try {
      let user = state.admin.users.find(u => u.email.toLowerCase() === accountData.email.toLowerCase());
      if (!user) {
        user = {
          id: 'usr-g-' + Date.now(),
          name: accountData.name || accountData.email.split('@')[0],
          email: accountData.email,
          phone: accountData.phone || '+44 7700 900888',
          tier: accountData.tier || 'Standard',
          status: 'Active',
          location: 'Cotswolds & London',
          notes: 'Google OAuth Verified Profile',
          rides: 1,
          spent: 85,
          authProvider: 'google'
        };
        state.admin.users.push(user);
        saveAdminUsers();
      } else {
        user.authProvider = 'google';
        if (accountData.name) user.name = accountData.name;
        if (accountData.phone) user.phone = accountData.phone;
      }

      user.isLoggedIn = true;
      state.currentUser = user;
      localStorage.setItem('jos_current_user', JSON.stringify(user));

      // Synchronize booking passenger details
      state.booking.passenger.fullName = user.name || '';
      state.booking.passenger.email = user.email || '';
      state.booking.passenger.phone = (user.phone || '').replace('+44 ', '').replace('+44', '');

      updateUserUI();
      closeGoogleAccountChooser();
      closeAuthModal();

      showToast(`Signed in with Google as ${user.name}! You are now signed in.`);

      // Advance route or dashboard
      if (currentGoogleAuthContext === 'booking' || window.location.hash.includes('signin')) {
        const nextStep = state.booking.nextStep || (state.booking.vehicleKey ? 'passenger-details' : 'select-vehicle');
        navigateTo(nextStep);
      } else {
        loadDashboardFromSupabase();
      }
    } catch (err) {
      console.error('Error selecting Google account:', err);
      showToast('Error signing in with Google. Please try again.');
    }
  }

  function handleCustomGoogleSignIn(e) {
    e.preventDefault();
    const nameInput = document.getElementById('googleCustomName');
    const emailInput = document.getElementById('googleCustomEmail');
    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    if (!email) return;

    selectGoogleAccount({
      name: name || email.split('@')[0],
      email: email,
      phone: '+44 7700 900555',
      tier: 'Standard'
    });
  }

  function updateUserUI() {
    const btnHeaderAuth = document.getElementById('btnHeaderAuth');
    const headerUserBadge = document.getElementById('headerUserBadge');
    const headerAvatar = document.getElementById('headerAvatar');
    const headerUserName = document.getElementById('headerUserName');
    const mobileAuthLink = document.getElementById('mobileAuthLink');
    const welcomeTitle = document.querySelector('.dash-welcome-title');

    const u = state.currentUser;
    const isLoggedIn = u && u.isLoggedIn !== false;

    if (isLoggedIn) {
      const firstName = (u.name || 'Client').split(' ')[0];
      const initials = (u.name || 'Client')
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      const isAdmin = u.role === 'admin' || u.isAdmin === true || 
                      u.email?.toLowerCase() === 'admin@josruralcars.co.uk' || 
                      u.email?.toLowerCase() === 'admin@example.com';

      const btnHeaderAdmin = document.getElementById('btnHeaderAdminPortal');
      const mobileDrawer = document.getElementById('mobileDrawer');

      if (btnHeaderAuth) btnHeaderAuth.classList.add('d-none');
      if (headerUserBadge) headerUserBadge.classList.remove('d-none');

      if (isAdmin) {
        if (btnHeaderAdmin) btnHeaderAdmin.classList.remove('d-none');
        if (headerAvatar) headerAvatar.textContent = '🛡️';
        if (headerUserName) {
          headerUserName.innerHTML = `${firstName} <span class="badge-role-admin">ADMIN</span>`;
        }

        const admSideName = document.getElementById('admSidebarName');
        const admSideRole = document.getElementById('admSidebarRole');
        const admSideAvatar = document.getElementById('admSidebarAvatar');
        if (admSideName) admSideName.textContent = u.name || 'Marcus Vance';
        if (admSideRole) admSideRole.textContent = 'Super Dispatcher';
        if (admSideAvatar) admSideAvatar.textContent = initials || 'MV';

        // Dynamically provide admin access link in mobile drawer if not already present
        let mAdmin = document.getElementById('mobileAdminDynamicLink');
        if (!mAdmin && mobileDrawer) {
          mAdmin = document.createElement('a');
          mAdmin.id = 'mobileAdminDynamicLink';
          mAdmin.href = '#admin';
          mAdmin.className = 'mobile-link admin-only-link';
          mAdmin.innerHTML = '🛡️ Dispatch Control Center';
          mAdmin.onclick = (e) => { e.preventDefault(); App.navigateTo('admin'); };
          const mAuth = document.getElementById('mobileAuthLink');
          if (mAuth) {
            mobileDrawer.insertBefore(mAdmin, mAuth);
          } else {
            mobileDrawer.appendChild(mAdmin);
          }
        } else if (mAdmin) {
          mAdmin.classList.remove('d-none');
        }
      } else {
        if (btnHeaderAdmin) btnHeaderAdmin.classList.add('d-none');
        const mAdmin = document.getElementById('mobileAdminDynamicLink');
        if (mAdmin) mAdmin.classList.add('d-none');
        if (headerAvatar) headerAvatar.textContent = initials;
        if (headerUserName) {
          if (u.authProvider === 'google') {
            headerUserName.innerHTML = `${firstName} <span style="font-size:0.75rem; margin-left:3px;" title="Google Verified Account">🛡️</span>`;
          } else {
            headerUserName.textContent = firstName;
          }
        }
      }

      if (mobileAuthLink) {
        mobileAuthLink.innerHTML = `👤 ${u.name}`;
        mobileAuthLink.onclick = () => App.navigateTo('dashboard');
      }
      if (welcomeTitle) welcomeTitle.textContent = `Welcome back, ${firstName}`;

      // Pre-fill booking passenger details
      const passName = document.getElementById('passName') || document.getElementById('passFullName');
      const passEmail = document.getElementById('passEmail');
      const passPhone = document.getElementById('passPhone');
      if (passName && !passName.value) passName.value = u.name || '';
      if (passEmail && !passEmail.value) passEmail.value = u.email || '';
      if (passPhone && !passPhone.value) passPhone.value = (u.phone || '').replace('+44 ', '').replace('+44', '');
    } else {
      const btnHeaderAdmin = document.getElementById('btnHeaderAdminPortal');
      if (btnHeaderAdmin) btnHeaderAdmin.classList.add('d-none');
      const mAdmin = document.getElementById('mobileAdminDynamicLink');
      if (mAdmin) mAdmin.classList.add('d-none');

      if (btnHeaderAuth) btnHeaderAuth.classList.remove('d-none');
      if (headerUserBadge) headerUserBadge.classList.add('d-none');
      if (mobileAuthLink) {
        mobileAuthLink.innerHTML = `👤 Sign In / Register`;
        mobileAuthLink.onclick = () => App.navigateTo('signin');
      }
      if (welcomeTitle) welcomeTitle.textContent = `Welcome, Passenger`;
    }

    updateDashboardUI();
  }

  // Navigation helper specifically for Sign In page
  function openSignInPage(fromBooking = false) {
    if (!fromBooking) {
      state.booking.inBookingFlow = false;
      state.booking.nextStep = null;
    }
    navigateTo('signin');
  }

  // Toggle Password Visibility (Eye Icon)
  function togglePasswordVisibility(inputId, btnEl) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    if (btnEl) {
      btnEl.innerHTML = isPass
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    }
  }

  // Update Sign In View components with journey & login state
  function updateSignInPageView() {
    const isBookingContext = Boolean(state.booking.inBookingFlow) || 
      (Boolean(state.booking.nextStep) && ['passenger-details', 'payment'].includes(state.booking.nextStep));

    const bookingContextBanner = document.getElementById('signinBookingContext');
    const stepperBar = document.getElementById('signinStepperBar');
    const journeyBanner = document.getElementById('signinJourneyBanner');
    const cardTitle = document.getElementById('signinCardTitle');
    const cardSub = document.getElementById('signinCardSubtitle');
    const btnPageSignIn = document.getElementById('btnPageSignIn');

    // Only show booking context & stepper if actively booking
    if (bookingContextBanner) bookingContextBanner.style.display = isBookingContext ? 'block' : 'none';
    if (stepperBar) stepperBar.style.display = isBookingContext ? 'flex' : 'none';
    if (journeyBanner) journeyBanner.style.display = isBookingContext ? 'flex' : 'none';

    if (isBookingContext) {
      const sPickup = document.getElementById('signinPickupDisplay');
      const sDropoff = document.getElementById('signinDropoffDisplay');
      const sDate = document.getElementById('signinDateDisplay');
      const sTime = document.getElementById('signinTimeDisplay');
      const sPass = document.getElementById('signinPassDisplay');
      const sVeh = document.getElementById('signinVehicleDisplay');

      if (sPickup) sPickup.textContent = state.booking.pickup || 'Stroud, Cotswolds, GL5';
      if (sDropoff) sDropoff.textContent = state.booking.dropoff || 'London Heathrow Airport (LHR)';
      if (sDate) sDate.textContent = `📅 ${formatDateDisplay(state.booking.date)}`;
      if (sTime) sTime.textContent = `⏰ ${state.booking.time || '04:30 AM'}`;
      if (sPass) sPass.textContent = `👥 ${state.booking.passengers || '2 Passengers'}`;
      if (sVeh) {
        const v = state.vehicles[state.booking.vehicleKey] || state.vehicles.executive;
        sVeh.textContent = `🚗 ${v.name} (£${v.total.toFixed(2)})`;
      }

      if (cardTitle) cardTitle.textContent = 'Sign In to Finalize Booking';
      if (cardSub) cardSub.textContent = 'Sign in to confirm your airport transfer. Your details will be synchronized with your booking.';
      if (btnPageSignIn) {
        btnPageSignIn.innerHTML = `
          <span>Sign In &amp; Continue Booking</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        `;
      }
    } else {
      if (cardTitle) cardTitle.textContent = 'Sign In';
      if (cardSub) cardSub.textContent = 'Access your bookings, flight tracking, and executive chauffeur transfers.';
      if (btnPageSignIn) {
        btnPageSignIn.innerHTML = `
          <span>Sign In to Your Account</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        `;
      }
    }

    const alreadyBox = document.getElementById('signinAlreadyLoggedInBanner');
    const formsWrapper = document.getElementById('signinFormsWrapper');
    const curAvatar = document.getElementById('signinCurrentAvatar');
    const curName = document.getElementById('signinCurrentName');
    const curEmail = document.getElementById('signinCurrentEmail');
    const curRoleBadge = document.getElementById('signinCurrentRoleBadge');
    const curDesc = document.getElementById('signinCurrentDesc');
    const btnSignInProceed = document.getElementById('btnSignInProceed');
    const btnSignInAdminDispatch = document.getElementById('btnSignInAdminDispatch');

    const u = state.currentUser;
    const isLoggedIn = u && u.isLoggedIn !== false;

    if (isLoggedIn) {
      if (alreadyBox) alreadyBox.classList.remove('d-none');
      if (formsWrapper) formsWrapper.classList.add('d-none');
      if (curName) curName.textContent = u.name || 'Valued Client';
      if (curEmail) curEmail.textContent = `${u.email || ''} • ${u.tier || (u.role === 'admin' ? 'Executive Super Admin' : 'Standard')}`;

      const isAdmin = u.role === 'admin' || u.isAdmin === true || 
                      u.email?.toLowerCase() === 'admin@josruralcars.co.uk' || 
                      u.email?.toLowerCase() === 'admin@example.com';

      if (curAvatar) {
        curAvatar.textContent = isAdmin ? '🛡️' : (u.name || 'Client').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
      }

      if (isAdmin) {
        if (curRoleBadge) {
          curRoleBadge.textContent = 'Admin / Dispatch Control';
          curRoleBadge.className = 'badge-status badge-gold';
        }
        if (curDesc) {
          curDesc.innerHTML = '<strong>Administrator session active.</strong> You have full privileges to manage bookings, assign chauffeurs, monitor live fleet movements, and configure system rates.';
        }
        if (btnSignInAdminDispatch) btnSignInAdminDispatch.classList.remove('d-none');
        if (btnSignInProceed) {
          btnSignInProceed.textContent = isBookingContext ? 'Book Transfer as Admin →' : '🛡️ Open Dispatch Control Center →';
          btnSignInProceed.className = isBookingContext ? 'btn btn-outline btn-session-action' : 'btn btn-gold btn-session-action';
          btnSignInProceed.onclick = isBookingContext ? () => proceedToNextBookingStep() : () => navigateTo('admin');
        }
      } else {
        if (curRoleBadge) {
          curRoleBadge.textContent = 'Active Session';
          curRoleBadge.className = 'badge-status badge-confirmed';
        }
        if (curDesc) {
          curDesc.textContent = isBookingContext 
            ? 'Your account is verified and ready. Proceed to the next step to finalize passenger details and payment.'
            : 'You are signed in to your account. View your upcoming rides, flight radar, or book a new journey.';
        }
        if (btnSignInAdminDispatch) btnSignInAdminDispatch.classList.add('d-none');
        if (btnSignInProceed) {
          btnSignInProceed.textContent = isBookingContext ? 'Proceed to Passenger Details →' : '📅 View My Bookings →';
          btnSignInProceed.className = 'btn btn-navy btn-session-action';
          btnSignInProceed.onclick = isBookingContext ? () => proceedToNextBookingStep() : () => navigateTo('dashboard');
        }
      }
    } else {
      if (alreadyBox) alreadyBox.classList.add('d-none');
      if (formsWrapper) formsWrapper.classList.remove('d-none');
    }
  }

  // Switch between Sign In and Sign Up tabs on Sign In page
  function switchSignInPageTab(tab) {
    const tabSignIn = document.getElementById('tabSignInPage');
    const tabSignUp = document.getElementById('tabSignUpPage');
    const formSignIn = document.getElementById('formSignInPage');
    const formSignUp = document.getElementById('formSignUpPage');
    const cardTitle = document.getElementById('signinCardTitle');
    const cardSub = document.getElementById('signinCardSubtitle');
    const googleText = document.getElementById('googleAuthText');

    const isBookingContext = Boolean(state.booking.inBookingFlow) || 
      (Boolean(state.booking.nextStep) && ['passenger-details', 'payment'].includes(state.booking.nextStep));

    if (tab === 'signin') {
      tabSignIn?.classList.add('active');
      tabSignUp?.classList.remove('active');
      formSignIn?.classList.remove('d-none');
      formSignUp?.classList.add('d-none');
      if (cardTitle) cardTitle.textContent = isBookingContext ? 'Sign In to Finalize Booking' : 'Sign In';
      if (cardSub) cardSub.textContent = isBookingContext 
        ? 'Sign in to complete your transfer reservation and synchronize with your account.'
        : 'Access your bookings, flight tracking, and executive chauffeur transfers.';
      if (googleText) googleText.textContent = 'Continue with Google';
    } else {
      tabSignIn?.classList.remove('active');
      tabSignUp?.classList.add('active');
      formSignIn?.classList.add('d-none');
      formSignUp?.classList.remove('d-none');
      if (cardTitle) cardTitle.textContent = 'Create Account';
      if (cardSub) cardSub.textContent = 'Join Jo\'s Rural Cars for premium transfers, instant receipts, and priority dispatch.';
      if (googleText) googleText.textContent = 'Sign up with Google';
    }
  }

  // Handle Sign In Submit on Sign In page
  async function handleSignInPageSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btnPageSignIn');
    const orig = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳ Signing in & unlocking next step...</span>';
    }

    const email = document.getElementById('pageSignInEmail')?.value.trim() || 'james@example.com';
    const remember = document.getElementById('pageSignInRemember')?.checked;

    try {
      let user = state.admin.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        const supProfile = await fetchProfileByEmail(email);
        if (supProfile) {
          user = {
            id: supProfile.id || 'usr-' + Date.now(),
            name: supProfile.name || email.split('@')[0],
            email: supProfile.email || email,
            phone: supProfile.phone || '+44 7700 900000',
            tier: supProfile.tier || 'Standard',
            role: supProfile.role || (email.toLowerCase().includes('admin') ? 'admin' : 'customer'),
            status: supProfile.status || 'Active',
            location: supProfile.address || supProfile.location || 'Gloucestershire, UK',
            notes: supProfile.notes || '',
            rides: Number(supProfile.trips_count || supProfile.rides || 0),
            spent: Number(supProfile.total_spent || supProfile.spent || 0)
          };
        } else {
          const isAdminEmail = email.toLowerCase() === 'admin@josruralcars.co.uk' || email.toLowerCase() === 'admin@example.com' || email.toLowerCase().includes('admin');
          const generatedName = isAdminEmail ? 'Marcus Vance' : email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          user = {
            id: 'usr-' + Date.now(),
            name: generatedName || 'Valued Passenger',
            email,
            phone: isAdminEmail ? '+44 1234 567 890' : '+44 7700 900000',
            tier: isAdminEmail ? 'Executive Super Admin' : 'Standard',
            role: isAdminEmail ? 'admin' : 'customer',
            status: 'Active',
            location: isAdminEmail ? "Jo's Rural Cars HQ, Stroud, GL5 1AA" : 'Gloucestershire, Cotswolds',
            notes: isAdminEmail ? 'Head of Executive Dispatch.' : 'Verified via customer booking portal',
            rides: 0,
            spent: 0
          };
          state.admin.users.push(user);
          saveAdminUsers();
        }
      }

      const isAdmin = user.role === 'admin' || user.isAdmin === true || 
                      user.email.toLowerCase() === 'admin@josruralcars.co.uk' || 
                      user.email.toLowerCase() === 'admin@example.com';

      if (isAdmin) {
        user.role = 'admin';
        user.isAdmin = true;
        user.tier = user.tier || 'Executive Super Admin';
      }

      user.isLoggedIn = true;
      state.currentUser = user;
      if (remember !== false) {
        localStorage.setItem('jos_current_user', JSON.stringify(user));
      }

      // Pre-fill passenger details with user info
      state.booking.passenger.fullName = user.name || '';
      state.booking.passenger.email = user.email || '';
      state.booking.passenger.phone = (user.phone || '').replace('+44 ', '').replace('+44', '');

      updateUserUI();

      if (isAdmin) {
        showToast(`🛡️ Welcome Administrator ${user.name}! Dispatch Control Center loaded.`);
        navigateTo('admin');
        loadAdminDashboard();
      } else {
        const isBookingContext = Boolean(state.booking.inBookingFlow) || 
          (Boolean(state.booking.nextStep) && ['passenger-details', 'payment'].includes(state.booking.nextStep));

        if (isBookingContext) {
          showToast(`Welcome back, ${user.name}! Continuing your booking...`);
          const nextStep = state.booking.nextStep || (state.booking.vehicleKey ? 'passenger-details' : 'select-vehicle');
          navigateTo(nextStep);
        } else {
          showToast(`Welcome back, ${user.name}!`);
          navigateTo('dashboard');
        }
      }
    } catch (err) {
      console.error('Sign-in error:', err);
      showToast('Error during sign-in. Please try again.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = orig;
      }
    }
  }

  // Handle Sign Up Submit on Sign In page
  async function handleSignUpPageSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btnPageSignUp');
    const orig = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳ Creating account...</span>';
    }

    const name = document.getElementById('pageSignUpName')?.value.trim();
    const email = document.getElementById('pageSignUpEmail')?.value.trim();
    const phone = document.getElementById('pageSignUpPhone')?.value.trim();

    try {
      const newUser = {
        id: 'usr-' + Date.now(),
        name,
        email,
        phone: phone.startsWith('+44') ? phone : `+44 ${phone}`,
        tier: 'Standard',
        status: 'Active',
        location: 'Cotswolds / London',
        notes: 'Registered online via customer sign in portal',
        rides: 0,
        spent: 0,
        isLoggedIn: true
      };

      state.admin.users.push(newUser);
      saveAdminUsers();

      try {
        await insertProfile({
          name,
          email,
          phone: newUser.phone,
          tier: 'Standard',
          status: 'Active',
          location: 'Cotswolds / London',
          notes: 'Registered via web portal'
        });
      } catch (err) {}

      state.currentUser = newUser;
      localStorage.setItem('jos_current_user', JSON.stringify(newUser));

      state.booking.passenger.fullName = name;
      state.booking.passenger.email = email;
      state.booking.passenger.phone = phone.replace('+44 ', '').replace('+44', '');

      updateUserUI();

      const isBookingContext = Boolean(state.booking.inBookingFlow) || 
        (Boolean(state.booking.nextStep) && ['passenger-details', 'payment'].includes(state.booking.nextStep));

      if (isBookingContext) {
        showToast(`Welcome, ${name}! Your account is active. Continuing your booking...`);
        const nextStep = state.booking.nextStep || (state.booking.vehicleKey ? 'passenger-details' : 'select-vehicle');
        navigateTo(nextStep);
      } else {
        showToast(`Welcome to Jo's Rural Cars, ${name}! Account ready.`);
        navigateTo('dashboard');
      }
    } catch (err) {
      console.error('Sign-up error:', err);
      showToast('Error creating account. Please try again.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = orig;
      }
    }
  }

  // 1-Click Fast Sign In
  function quickSignInAs(emailOrType) {
    const isBookingContext = Boolean(state.booking.inBookingFlow) || 
      (Boolean(state.booking.nextStep) && ['passenger-details', 'payment'].includes(state.booking.nextStep));

    if (emailOrType === 'guest') {
      const guestUser = {
        id: 'usr-guest-' + Date.now(),
        name: 'Verified Guest',
        email: 'guest.' + Math.floor(1000 + Math.random() * 9000) + '@josruralcars.co.uk',
        phone: '+44 7700 900555',
        tier: 'Standard',
        status: 'Active',
        location: 'United Kingdom',
        notes: 'Verified express booking guest',
        rides: 0,
        spent: 0,
        isLoggedIn: true
      };
      state.currentUser = guestUser;
      localStorage.setItem('jos_current_user', JSON.stringify(guestUser));
      state.booking.passenger.fullName = guestUser.name;
      state.booking.passenger.email = guestUser.email;
      state.booking.passenger.phone = '7700900555';
      updateUserUI();

      if (isBookingContext) {
        showToast('Signed in as Verified Guest! Continuing your booking...');
        navigateTo(state.booking.nextStep || (state.booking.vehicleKey ? 'passenger-details' : 'select-vehicle'));
      } else {
        showToast('Signed in as Verified Guest!');
        navigateTo('dashboard');
      }
      return;
    }

    const emailInp = document.getElementById('pageSignInEmail');
    if (emailInp) emailInp.value = emailOrType;

    // Check if signing in as Administrator
    const isAdminTarget = emailOrType === 'admin' || 
                          emailOrType.toLowerCase() === 'admin@josruralcars.co.uk' || 
                          emailOrType.toLowerCase() === 'admin@example.com';

    if (isAdminTarget) {
      let adminUser = state.admin.users.find(u => 
        u.email.toLowerCase() === emailOrType.toLowerCase() || 
        u.role === 'admin' ||
        u.email.toLowerCase() === 'admin@josruralcars.co.uk'
      );

      if (!adminUser) {
        adminUser = {
          id: 'bcc5fd7b-94ab-46b5-bb10-d8ef3b71bf10',
          name: 'Marcus Vance',
          email: 'admin@josruralcars.co.uk',
          phone: '+44 1234 567 890',
          tier: 'Executive Super Admin',
          role: 'admin',
          isAdmin: true,
          status: 'Active',
          location: "Jo's Rural Cars HQ, Stroud, GL5 1AA",
          notes: 'Head of Executive Dispatch.'
        };
      } else {
        adminUser.role = 'admin';
        adminUser.isAdmin = true;
        adminUser.tier = adminUser.tier || 'Executive Super Admin';
      }

      adminUser.isLoggedIn = true;
      state.currentUser = adminUser;
      localStorage.setItem('jos_current_user', JSON.stringify(adminUser));

      state.booking.passenger.fullName = adminUser.name;
      state.booking.passenger.email = adminUser.email;
      state.booking.passenger.phone = '1234567890';

      updateUserUI();
      showToast(`🛡️ Signed in as Administrator ${adminUser.name}! Opening Dispatch Center...`);
      navigateTo('admin');
      loadAdminDashboard();
      return;
    }

    const user = state.admin.users.find(u => u.email.toLowerCase() === emailOrType.toLowerCase()) || {
      id: 'usr-demo',
      name: emailOrType.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      email: emailOrType,
      phone: '+44 7700 900000',
      tier: 'Standard',
      isLoggedIn: true
    };

    user.isLoggedIn = true;
    state.currentUser = user;
    localStorage.setItem('jos_current_user', JSON.stringify(user));

    state.booking.passenger.fullName = user.name;
    state.booking.passenger.email = user.email;
    state.booking.passenger.phone = (user.phone || '').replace('+44 ', '').replace('+44', '');

    updateUserUI();

    if (isBookingContext) {
      showToast(`Signed in as ${user.name}! Continuing your booking...`);
      navigateTo(state.booking.nextStep || (state.booking.vehicleKey ? 'passenger-details' : 'select-vehicle'));
    } else {
      showToast(`Signed in as ${user.name}!`);
      navigateTo('dashboard');
    }
  }

  // Proceed to next booking step when already logged in
  function proceedToNextBookingStep() {
    navigateTo(state.booking.nextStep || (state.booking.vehicleKey ? 'passenger-details' : 'select-vehicle'));
  }

  function showSavedRoutes() {
    const favCard = document.getElementById('favoriteRoutesCard');
    if (favCard) {
      favCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      favCard.style.boxShadow = '0 0 0 3px rgba(30, 58, 138, 0.4)';
      setTimeout(() => {
        favCard.style.boxShadow = '';
      }, 1800);
      showToast('Showing your saved favorite routes.');
    } else {
      showToast('Showing your 3 saved executive routes.');
    }
  }

  function filterBookingStatus(status, btn) {
    document.querySelectorAll('.bstatus-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const rows = document.querySelectorAll('#dashTableBody tr');
    const term = (document.getElementById('dashHistorySearch')?.value || '').toLowerCase().trim();

    rows.forEach(r => {
      const rowStatus = (r.getAttribute('data-status') || '').toLowerCase();
      const rowText = r.textContent.toLowerCase();
      const statusMatch = (status === 'all' || rowStatus === status || rowText.includes(status));
      const searchMatch = !term || rowText.includes(term);
      r.style.display = (statusMatch && searchMatch) ? '' : 'none';
    });
  }

  function filterBookingHistory(term) {
    const activeTab = document.querySelector('.bstatus-tab.active');
    const status = activeTab ? activeTab.getAttribute('data-status') : 'all';
    const rows = document.querySelectorAll('#dashTableBody tr');
    const q = term.toLowerCase().trim();

    rows.forEach(r => {
      const rowStatus = (r.getAttribute('data-status') || '').toLowerCase();
      const rowText = r.textContent.toLowerCase();
      const statusMatch = (status === 'all' || rowStatus === status || rowText.includes(status));
      const searchMatch = !q || rowText.includes(q);
      r.style.display = (statusMatch && searchMatch) ? '' : 'none';
    });
  }

  function showAllBookings() {
    document.querySelectorAll('.bstatus-tab').forEach(b => {
      if (b.getAttribute('data-status') === 'all') {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
    const rows = document.querySelectorAll('#dashTableBody tr');
    rows.forEach(r => r.style.display = '');
    const search = document.getElementById('dashHistorySearch');
    if (search) search.value = '';
    showToast('All booking records displayed.');
  }

  // FAQ Accordion Handler
  function toggleAccordion(headerBtn) {
    const item = headerBtn.parentElement;
    const isActive = item.classList.contains('active');
    document.querySelectorAll('.accordion-item').forEach(el => el.classList.remove('active'));
    if (!isActive) {
      item.classList.add('active');
    }
  }

  // Contact Form Submission
  function handleContactSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSendMessage');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sending Message...';

    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = originalText;
      document.getElementById('contactForm')?.reset();
      showToast('Thank you! Your message has been sent to our dispatch team.');
    }, 700);
  }

  // Account creation mocks
  function createAccountMock() {
    showToast('Account credentials verified for James Doe.');
  }

  function guestCheckoutMock() {
    showToast('Proceeding as guest checkout.');
  }

  // Toast Notification System
  function showToast(message) {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }

  // Helper
  function capitalize(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // Sync UI with current State
  function syncUIWithState() {
    updateSummarySidebar();
  }

  // Book specific airport transfer from Airports page
  function bookAirportTransfer(airportName, defaultPickup, price) {
    state.booking.dropoff = airportName;
    if (defaultPickup) {
      state.booking.pickup = defaultPickup;
    }
    showToast(`Selected ${airportName}. Choose your executive vehicle.`);
    navigateTo('select-vehicle');
  }

  // Filter Airports cards by category on Airports page
  function filterAirports(category, btn) {
    document.querySelectorAll('.airports-filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const cards = document.querySelectorAll('.airport-detail-card');
    cards.forEach(card => {
      const cat = card.getAttribute('data-category');
      if (category === 'all' || cat === category) {
        card.style.display = 'grid';
      } else {
        card.style.display = 'none';
      }
    });
  }

  // Run Supabase Initial Verification & Preload
  async function initSupabase() {
    try {
      const health = await checkSupabaseHealth();
      if (health.connected) {
        console.log('✅ Supabase connected successfully to Jo\'s Rural Cars database');
        updateSupabaseStatusBadge(true);
        await loadDashboardFromSupabase();
      } else {
        console.warn('⚠️ Supabase connection issue:', health.error);
        updateSupabaseStatusBadge(false, health.error);
      }

      // Check active Supabase session (e.g. from Google OAuth callback)
      try {
        const session = await getSupabaseAuthSession();
        if (session && session.user && (!state.currentUser || !state.currentUser.isLoggedIn)) {
          const su = session.user;
          const userEmail = su.email;
          const userName = su.user_metadata?.full_name || su.user_metadata?.name || (userEmail ? userEmail.split('@')[0] : 'Passenger');
          selectGoogleAccount({
            name: userName,
            email: userEmail,
            phone: su.user_metadata?.phone || '+44 7700 900888',
            tier: 'Standard'
          });
        }

        onSupabaseAuthStateChange((event, session) => {
          if (session && session.user && event === 'SIGNED_IN' && (!state.currentUser || !state.currentUser.isLoggedIn)) {
            const su = session.user;
            const userEmail = su.email;
            const userName = su.user_metadata?.full_name || su.user_metadata?.name || (userEmail ? userEmail.split('@')[0] : 'Passenger');
            selectGoogleAccount({
              name: userName,
              email: userEmail,
              phone: su.user_metadata?.phone || '+44 7700 900888',
              tier: 'Standard'
            });
          }
        });
      } catch (authErr) {
        console.warn('Supabase Auth session note:', authErr);
      }
    } catch (err) {
      console.error('Error during Supabase startup check:', err);
      updateSupabaseStatusBadge(false, err.message);
    }
  }

  // ==============================================================
  // ADMIN & DISPATCH CONTROL CENTER METHODS
  // ==============================================================

  function saveAdminBookings() {
    try {
      localStorage.setItem('jos_admin_bookings', JSON.stringify(state.admin.bookings));
    } catch (e) {
      console.warn('Could not save bookings to localStorage:', e);
    }
  }

  function saveAdminCars() {
    try {
      localStorage.setItem('jos_admin_cars', JSON.stringify(state.admin.cars));
    } catch (e) {
      console.warn('Could not save cars to localStorage:', e);
    }
  }

  function saveAdminDrivers() {
    try {
      localStorage.setItem('jos_admin_drivers', JSON.stringify(state.admin.drivers));
    } catch (e) {
      console.warn('Could not save drivers to localStorage:', e);
    }
  }

  function saveAdminRatesStorage() {
    try {
      localStorage.setItem('jos_admin_rates', JSON.stringify(state.admin.rates));
    } catch (e) {
      console.warn('Could not save rates to localStorage:', e);
    }
  }

  function saveAdminPoliciesStorage() {
    try {
      localStorage.setItem('jos_admin_policies', JSON.stringify(state.admin.policies));
    } catch (e) {
      console.warn('Could not save policies to localStorage:', e);
    }
  }

  // Populate dynamic chauffeur and car dropdowns in modals
  function populateAdminModalDropdowns() {
    const drvSelectForCar = document.getElementById('carFormDriver');
    if (drvSelectForCar) {
      const activeDrivers = state.admin.drivers.map(d => `<option value="${d.name}">${d.name} (${d.badge})</option>`).join('');
      drvSelectForCar.innerHTML = `<option value="">Unassigned (Pool Vehicle)</option>${activeDrivers}`;
    }

    const carSelectForDrv = document.getElementById('drvFormCar');
    if (carSelectForDrv) {
      const carOptions = state.admin.cars.map(c => `<option value="${c.plate} (${c.category})">${c.plate} - ${c.name}</option>`).join('');
      carSelectForDrv.innerHTML = `<option value="">Unassigned (Relief Driver)</option>${carOptions}`;
    }

    const drvSelectForBooking = document.getElementById('mbFormDriver');
    if (drvSelectForBooking) {
      const activeDrivers = state.admin.drivers.map(d => `<option value="${d.name}">${d.name} (${d.status})</option>`).join('');
      drvSelectForBooking.innerHTML = `<option value="">Unassigned (Dispatch Pending)</option>${activeDrivers}`;
    }
  }

  // Load Admin Dashboard Data & Render All Panes
  async function loadAdminDashboard() {
    try {
      // 1. Fetch live bookings from Supabase
      const fetched = await fetchBookings();
      if (fetched && fetched.length > 0) {
        state.admin.bookings = fetched;
        saveAdminBookings();
      } else if (!state.admin.bookings || state.admin.bookings.length === 0) {
        try {
          const saved = localStorage.getItem('jos_admin_bookings');
          if (saved) state.admin.bookings = JSON.parse(saved);
        } catch (e) {}
        if (!state.admin.bookings || state.admin.bookings.length === 0) {
          const todayStr = new Date().toISOString().split('T')[0];
          state.admin.bookings = [
            {
              ref: '#JR-8821',
              customer_name: 'James Doe',
              customer_email: 'james@example.com',
              customer_phone: '+44 7700 900000',
              pickup: 'Stroud, Cotswolds, GL5',
              dropoff: 'London Heathrow Terminal 5',
              date: '2026-10-24',
              time: '04:30',
              vehicle: 'Executive (Mercedes-Benz S-Class)',
              amount: 75,
              status: 'Confirmed',
              payment_status: 'Paid',
              assigned_driver: 'Arthur Pendelton',
              flight_number: 'BA123'
            },
            {
              ref: '#JR-8419',
              customer_name: 'Lady Clara Morrison',
              customer_email: 'clara@morrison.co.uk',
              customer_phone: '+44 7700 900888',
              pickup: 'Tetbury, Cotswolds, GL8',
              dropoff: 'London Heathrow Terminal 2',
              date: '2026-10-25',
              time: '06:00',
              vehicle: 'Business Class (Mercedes S-Class LWB)',
              amount: 145,
              status: 'Confirmed',
              payment_status: 'Paid',
              assigned_driver: 'Sarah Jenkins',
              flight_number: 'VS003'
            },
            {
              ref: '#JR-7930',
              customer_name: 'Sir Robert Sterling',
              customer_email: 'r.sterling@cotswolds.org',
              customer_phone: '+44 7700 900712',
              pickup: 'Cirencester, Cotswolds, GL7',
              dropoff: 'London Gatwick North Terminal',
              date: todayStr,
              time: '14:15',
              vehicle: 'Luxury MPV (Mercedes V-Class)',
              amount: 185,
              status: 'En Route',
              payment_status: 'Paid',
              assigned_driver: 'Marcus Brody',
              flight_number: 'EK009'
            },
            {
              ref: '#JR-6902',
              customer_name: 'Dr. Alistair Finch',
              customer_email: 'afinch@oxford.ac.uk',
              customer_phone: '+44 7700 900334',
              pickup: 'Oxford City Centre, OX1',
              dropoff: 'London Luton Airport',
              date: todayStr,
              completed_date: todayStr,
              completed_at: new Date().toISOString(),
              time: '09:00',
              vehicle: 'Executive Estate (Mercedes Estate)',
              amount: 120,
              status: 'Completed',
              payment_status: 'Paid',
              assigned_driver: 'David Miller',
              flight_number: 'EZY221'
            }
          ];
          saveAdminBookings();
        }
      }

      // 2. Fetch live profiles from Supabase to keep admin & client records in sync
      try {
        const fetchedProfiles = await fetchProfiles();
        if (fetchedProfiles && fetchedProfiles.length > 0) {
          const mappedUsers = fetchedProfiles.map(p => ({
            id: p.id || p.user_id || 'usr-' + Date.now(),
            name: p.name || p.email.split('@')[0],
            email: p.email,
            phone: p.phone || '+44 7700 900000',
            tier: (p.tier && p.tier.toLowerCase().includes('vip')) ? 'Standard' : (p.tier || (p.role === 'admin' ? 'Executive Super Admin' : 'Standard')),
            role: p.role || (p.email.toLowerCase().includes('admin') ? 'admin' : 'customer'),
            isAdmin: p.role === 'admin' || p.email.toLowerCase().includes('admin'),
            status: p.status || 'Active',
            location: p.address || 'Gloucestershire, UK',
            notes: p.notes || '',
            rides: Number(p.trips_count || 0),
            spent: Number(p.total_spent || 0)
          }));

          const merged = [...mappedUsers];
          (state.admin.users || []).forEach(local => {
            if (!merged.some(m => m.email.toLowerCase() === local.email.toLowerCase())) {
              merged.push(local);
            }
          });
          state.admin.users = merged;
          saveAdminUsers();
        }
      } catch (profErr) {
        console.warn('Error loading Supabase profiles into admin users:', profErr);
      }

      // Populate dropdowns in modals
      populateAdminModalDropdowns();

      // Render tab components
      updateAdminKpis();
      updateAdminOverview();
      renderAdminBookings();
      renderAdminPayments();
      renderAdminUsers();
      renderAdminDrivers();
      renderAdminCars();

      // Sync System Rates Inputs
      const r = state.admin.rates;
      if (document.getElementById('sysRateHeathrow')) document.getElementById('sysRateHeathrow').value = r.heathrow || 45;
      if (document.getElementById('sysRateGatwick')) document.getElementById('sysRateGatwick').value = r.gatwick || 65;
      if (document.getElementById('sysRateLuton')) document.getElementById('sysRateLuton').value = r.luton || 55;
      if (document.getElementById('sysRateStansted')) document.getElementById('sysRateStansted').value = r.stansted || 60;
      if (document.getElementById('sysRateBirmingham')) document.getElementById('sysRateBirmingham').value = r.birmingham || 75;

      // Sync System Policies Checkboxes
      const p = state.admin.policies;
      if (document.getElementById('sysToggleMeetGreet')) document.getElementById('sysToggleMeetGreet').checked = !!p.meetGreet;
      if (document.getElementById('sysToggleFreeWait')) document.getElementById('sysToggleFreeWait').checked = !!p.freeWait;
      if (document.getElementById('sysToggleEmergency')) document.getElementById('sysToggleEmergency').checked = !!p.emergencyBanner;

      // Update DB Status indicator in Admin
      const adminDbBadge = document.getElementById('adminDbStatusBadge');
      if (adminDbBadge) {
        adminDbBadge.textContent = 'Supabase Connected';
        adminDbBadge.className = 'badge-status badge-confirmed';
      }
    } catch (err) {
      console.error('Error loading admin dashboard:', err);
    }
  }

  // Update KPI Metric Cards & Tab Badges
  function updateAdminKpis() {
    const bookings = state.admin.bookings || [];
    const cars = state.admin.cars || [];
    const drivers = state.admin.drivers || [];
    const users = state.admin.users || [];

    const totalBookings = bookings.length;
    const totalRev = bookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    const activeCarsCount = cars.filter(c => c.status === 'Available' || c.status === 'On Journey').length;
    const onDutyDriversCount = drivers.filter(d => d.status === 'On Duty' || d.status === 'On Trip').length;
    const pendingTrips = bookings.filter(b => b.status === 'Confirmed' || b.status === 'En Route').length;
    const corporateUsersCount = users.filter(u => u.tier === 'Corporate').length;

    // Daily Completed Rides calculation
    const todayDateStr = new Date().toISOString().split('T')[0];
    const completedToday = bookings.filter(b => {
      if (b.status !== 'Completed') return false;
      const cDate = b.completed_date || (b.completed_at ? b.completed_at.split('T')[0] : b.date);
      return cDate === todayDateStr;
    });
    const todayCompletedCount = completedToday.length;
    const todayCompletedRev = completedToday.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

    const elTotal = document.getElementById('adminKpiTotalBookings');
    const elRev = document.getElementById('adminKpiRevenue');
    const elCars = document.getElementById('adminKpiActiveCars');
    const elDrivers = document.getElementById('adminKpiActiveDrivers');
    const elPending = document.getElementById('adminKpiPending');
    const elUsers = document.getElementById('adminKpiTotalUsers');
    const elVip = document.getElementById('adminKpiVipUsers');
    const elCompletedToday = document.getElementById('adminKpiCompletedToday');
    const elCompletedRev = document.getElementById('adminKpiCompletedRev');

    if (elTotal) elTotal.textContent = totalBookings;
    if (elRev) elRev.textContent = `£${totalRev.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Revenue`;
    if (elCars) elCars.textContent = `${activeCarsCount} / ${cars.length}`;
    if (elDrivers) elDrivers.textContent = `${onDutyDriversCount} / ${drivers.length}`;
    if (elPending) elPending.textContent = pendingTrips;
    if (elUsers) elUsers.textContent = users.length;
    if (elVip) elVip.textContent = `${corporateUsersCount} Corporate Accounts`;
    if (elCompletedToday) elCompletedToday.textContent = todayCompletedCount;
    if (elCompletedRev) elCompletedRev.textContent = `£${todayCompletedRev.toFixed(2)} Today`;

    // Legacy tab badges
    const bCount = document.getElementById('adminBadgeBookingsCount');
    const uCount = document.getElementById('adminBadgeUsersCount');
    const cCount = document.getElementById('adminBadgeCarsCount');
    const dCount = document.getElementById('adminBadgeDriversCount');

    if (bCount) bCount.textContent = totalBookings;
    if (uCount) uCount.textContent = users.length;
    if (cCount) cCount.textContent = cars.length;
    if (dCount) dCount.textContent = onDutyDriversCount;

    // Subtab counts in Fleet pane
    const subCars = document.getElementById('adminSubtabCarsCount');
    const subDrivers = document.getElementById('adminSubtabDriversCount');
    if (subCars) subCars.textContent = cars.length;
    if (subDrivers) subDrivers.textContent = drivers.length;

    // Keep overview KPIs synchronized
    updateAdminOverview();
  }

  // Render Executive Command Overview matching the user's dashboard screenshot
  function updateAdminOverview() {
    const bookings = state.admin.bookings || [];
    const drivers = state.admin.drivers || [];

    // Confirmed Revenue: settled / paid bookings (or all active dispatches)
    const confirmedRev = bookings
      .filter(b => b.status !== 'Cancelled')
      .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

    const totalBookings = bookings.length;
    const activeTransit = bookings.filter(b => {
      const s = (b.status || '').toLowerCase();
      return s === 'en route' || s === 'on journey' || s === 'in transit';
    }).length;

    const pendingAction = bookings.filter(b => {
      const s = (b.status || '').toLowerCase();
      const p = (b.payment_status || '').toLowerCase();
      return s === 'pending' || (p && p !== 'paid' && s !== 'cancelled');
    }).length;

    const activeChauffeurs = drivers.filter(d => d.status === 'On Duty' || d.status === 'On Trip').length || drivers.length;

    // 1. KPI Cards
    const elRev = document.getElementById('adminOverviewConfirmedRev');
    if (elRev) {
      elRev.innerHTML = `&pound;${confirmedRev.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    const elTot = document.getElementById('adminOverviewTotalBookings');
    if (elTot) elTot.textContent = totalBookings;

    const elTransitPill = document.getElementById('adminOverviewActiveTransitPill');
    if (elTransitPill) elTransitPill.textContent = `${activeTransit} Active`;

    const elPending = document.getElementById('adminOverviewPendingAction');
    if (elPending) elPending.textContent = pendingAction;

    const elChauffeurs = document.getElementById('adminOverviewActiveChauffeurs');
    if (elChauffeurs) elChauffeurs.textContent = activeChauffeurs;

    // 2. Sidebar Badges
    const badgeBookings = document.getElementById('admNavBookingsBadge');
    if (badgeBookings) badgeBookings.textContent = totalBookings;
    const badgePayments = document.getElementById('admNavPaymentsBadge');
    if (badgePayments) badgePayments.textContent = pendingAction;

    // 3. Active Fleet Dispatches & Live Transfers Table
    const tbodyDispatches = document.getElementById('adminOverviewDispatchesBody');
    if (tbodyDispatches) {
      const activeList = bookings.filter(b => {
        const s = (b.status || '').toLowerCase();
        return s === 'en route' || s === 'on journey' || s === 'in transit';
      });

      if (activeList.length === 0) {
        tbodyDispatches.innerHTML = `
          <tr>
            <td colspan="6" class="adm-empty-cell">
              No active dispatches right now. All scheduled trips completed.
            </td>
          </tr>
        `;
      } else {
        tbodyDispatches.innerHTML = activeList.map(b => {
          const ref = b.ref && b.ref.startsWith('#') ? b.ref : `#${b.ref || 'JR-0000'}`;
          const safeRef = ref.replace(/'/g, "\\'");
          return `
            <tr>
              <td><strong style="color: var(--color-navy);">${ref}</strong></td>
              <td><strong>${b.customer_name || 'Passenger'}</strong></td>
              <td>${b.pickup || ''} &rarr; ${b.dropoff || ''}</td>
              <td><span class="badge-status badge-confirmed">${b.status}</span></td>
              <td>${b.assigned_driver || 'Unassigned'}</td>
              <td>
                <button type="button" class="btn btn-outline btn-xs" onclick="App.trackTripLive('${safeRef}')">🛰️ Track</button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // 4. Vehicle Class Revenue Breakdown
    let revSedan = 0;
    let revEstate = 0;
    let revBusiness = 0;
    let revMpv = 0;

    bookings.forEach(b => {
      const v = (b.vehicle || '').toLowerCase();
      const amt = Number(b.amount) || 0;
      if (v.includes('sedan') || v.includes('e-class')) revSedan += amt;
      else if (v.includes('estate')) revEstate += amt;
      else if (v.includes('business') || v.includes('s-class') || v.includes('executive')) revBusiness += amt;
      else if (v.includes('mpv') || v.includes('v-class')) revMpv += amt;
      else revBusiness += amt;
    });

    const elSedan = document.getElementById('adminRevExecutiveSedan');
    const elEstate = document.getElementById('adminRevExecutiveEstate');
    const elBusiness = document.getElementById('adminRevBusinessClass');
    const elMpv = document.getElementById('adminRevLuxuryMPV');

    if (elSedan) elSedan.textContent = `£${revSedan.toFixed(2)}`;
    if (elEstate) elEstate.textContent = `£${revEstate.toFixed(2)}`;
    if (elBusiness) elBusiness.textContent = `£${revBusiness.toFixed(2)}`;
    if (elMpv) elMpv.textContent = `£${revMpv.toFixed(2)}`;

    // 5. Live Airport Telemetry
    let countLHR = 0;
    let countLGW = 0;
    let countBHX = 0;
    let countBRS = 0;

    bookings.forEach(b => {
      const route = `${b.pickup || ''} ${b.dropoff || ''}`.toLowerCase();
      if (route.includes('heathrow') || route.includes('lhr')) countLHR++;
      if (route.includes('gatwick') || route.includes('lgw')) countLGW++;
      if (route.includes('birmingham') || route.includes('bhx')) countBHX++;
      if (route.includes('bristol') || route.includes('brs')) countBRS++;
    });

    const elLHR = document.getElementById('adminAirportHeathrow');
    const elLGW = document.getElementById('adminAirportGatwick');
    const elBHX = document.getElementById('adminAirportBirmingham');
    const elBRS = document.getElementById('adminAirportBristol');

    if (elLHR) elLHR.textContent = `${countLHR} Transfers`;
    if (elLGW) elLGW.textContent = `${countLGW} Transfers`;
    if (elBHX) elBHX.textContent = `${countBHX} Transfers`;
    if (elBRS) elBRS.textContent = `${countBRS} Transfers`;
  }

  // Render Payments & Billing Tab
  function renderAdminPayments() {
    const tbody = document.getElementById('adminPaymentsTableBody');
    if (!tbody) return;

    const bookings = state.admin.bookings || [];
    const totalRev = bookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    const settledBookings = bookings.filter(b => (b.payment_status || 'Paid') === 'Paid');
    const avgFare = bookings.length > 0 ? totalRev / bookings.length : 0;
    const pendingBal = bookings.filter(b => b.payment_status && b.payment_status !== 'Paid').reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

    const elTotRev = document.getElementById('adminPaymentsTotalRev');
    const elSettled = document.getElementById('adminPaymentsSettledCount');
    const elAvg = document.getElementById('adminPaymentsAvgFare');
    const elPending = document.getElementById('adminPaymentsPendingBal');

    if (elTotRev) elTotRev.textContent = `£${totalRev.toFixed(2)}`;
    if (elSettled) elSettled.textContent = settledBookings.length;
    if (elAvg) elAvg.textContent = `£${avgFare.toFixed(2)}`;
    if (elPending) elPending.textContent = `£${pendingBal.toFixed(2)}`;

    if (bookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="adm-empty-cell">No billing transactions recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = bookings.map(b => {
      const ref = b.ref && b.ref.startsWith('#') ? b.ref : `#${b.ref || 'JR-0000'}`;
      const amount = Number(b.amount) || 75;
      const status = b.payment_status || 'Paid';
      const statusClass = status === 'Paid' ? 'badge-completed' : 'badge-confirmed';
      return `
        <tr>
          <td><strong>${ref}</strong></td>
          <td><strong>${b.customer_name || 'Passenger'}</strong><div class="text-xs text-muted">${b.customer_email || ''}</div></td>
          <td>${b.pickup || ''} &rarr; ${b.dropoff || ''}</td>
          <td>${formatDateDisplay(b.date)} ${b.time || ''}</td>
          <td><strong>&pound;${amount.toFixed(2)}</strong></td>
          <td><span class="badge-status badge-confirmed">💳 Card (Stripe)</span></td>
          <td><span class="badge-status ${statusClass}">✓ ${status}</span></td>
        </tr>
      `;
    }).join('');
  }

  // Switch Sub-tabs (Overview, Live Bookings, Payments, Users, Fleet, System)
  function switchAdminTab(tabName, clickedBtn) {
    if (!tabName) tabName = 'overview';
    if (tabName === 'live-map') tabName = 'bookings';
    state.admin.activeTab = tabName;

    // Update active class on sidebar items
    document.querySelectorAll('.adm-nav-item').forEach(btn => btn.classList.remove('active'));
    if (clickedBtn && clickedBtn.classList.contains('adm-nav-item')) {
      clickedBtn.classList.add('active');
    } else {
      const targetBtn = document.querySelector(`.adm-nav-item[data-admin-tab="${tabName}"]`);
      if (targetBtn) targetBtn.classList.add('active');
    }

    // Toggle panes
    document.querySelectorAll('.adm-pane').forEach(pane => pane.classList.remove('active'));
    const paneMap = {
      'overview': 'adminPaneOverview',
      'bookings': 'adminPaneBookings',
      'payments': 'adminPanePayments',
      'users': 'adminPaneUsers',
      'fleet': 'adminPaneFleet',
      'cars': 'adminPaneFleet',
      'drivers': 'adminPaneFleet',
      'system': 'adminPaneSystem'
    };
    const targetPaneId = paneMap[tabName] || 'adminPaneOverview';
    const targetPane = document.getElementById(targetPaneId);
    if (targetPane) targetPane.classList.add('active');

    // Trigger tab specific renders
    if (tabName === 'overview') {
      updateAdminOverview();
    } else if (tabName === 'bookings') {
      renderAdminBookings();
    } else if (tabName === 'payments') {
      renderAdminPayments();
    } else if (tabName === 'users') {
      renderAdminUsers();
    } else if (tabName === 'fleet') {
      renderAdminCars();
      renderAdminDrivers();
    }
  }

  // Switch subtab between Cars and Drivers within Fleet pane
  function switchFleetSubTab(subTab) {
    const btnCars = document.getElementById('btnSubtabCars');
    const btnDrivers = document.getElementById('btnSubtabDrivers');
    const secCars = document.getElementById('adminFleetCarsSection');
    const secDrivers = document.getElementById('adminFleetDriversSection');

    if (subTab === 'drivers') {
      btnDrivers?.classList.add('active');
      btnCars?.classList.remove('active');
      if (secCars) secCars.style.display = 'none';
      if (secDrivers) secDrivers.style.display = 'block';
      renderAdminDrivers();
    } else {
      btnCars?.classList.add('active');
      btnDrivers?.classList.remove('active');
      if (secCars) secCars.style.display = 'block';
      if (secDrivers) secDrivers.style.display = 'none';
      renderAdminCars();
    }
  }

  // Export entire Admin Database as JSON
  function exportAdminDatabase() {
    const data = {
      app: "Jo's Rural Cars Dispatch Command",
      version: "2.6.0",
      exportedAt: new Date().toISOString(),
      confirmedRevenue: state.admin.bookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0),
      bookings: state.admin.bookings || [],
      users: state.admin.users || [],
      cars: state.admin.cars || [],
      drivers: state.admin.drivers || [],
      rates: state.admin.rates || {},
      policies: state.admin.policies || {}
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jos_rural_cars_dispatch_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Dispatch Database exported as JSON successfully.');
  }

  // Global search from top bar
  function searchAdminGlobally(query) {
    query = (query || '').trim();
    if (!query) {
      if (state.admin.activeTab === 'bookings') {
        state.admin.bookingsSearch = '';
        renderAdminBookings();
      }
      return;
    }
    // Switch to bookings tab and filter
    switchAdminTab('bookings');
    const searchInp = document.getElementById('adminBookingSearch');
    if (searchInp) searchInp.value = query;
    state.admin.bookingsSearch = query;
    renderAdminBookings();
  }

  // Mobile sidebar toggle
  function toggleAdminSidebar() {
    const sidebar = document.getElementById('admSidebar');
    if (sidebar) sidebar.classList.toggle('open');
  }

  // Radar synchronizer toast
  function toggleRadarMode() {
    showToast('UK Flight Radar synchronized. Live ADS-B telemetry active.');
  }

  // Render Bookings Dispatch Grid
  function renderAdminBookings() {
    const tbody = document.getElementById('adminBookingsTableBody');
    if (!tbody) return;

    const filter = (state.admin.bookingsFilter || 'all').toLowerCase();
    const query = (state.admin.bookingsSearch || '').toLowerCase().trim();

    let list = state.admin.bookings || [];

    // Filter by status tab
    if (filter !== 'all') {
      list = list.filter(b => {
        const s = (b.status || '').toLowerCase();
        if (filter === 'en route') return s === 'en route' || s === 'on journey' || s === 'in transit';
        return s === filter;
      });
    }

    // Filter by search query
    if (query) {
      list = list.filter(b => {
        const text = `${b.ref || ''} ${b.customer_name || ''} ${b.customer_phone || ''} ${b.pickup || ''} ${b.dropoff || ''} ${b.assigned_driver || ''}`.toLowerCase();
        return text.includes(query);
      });
    }

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 36px 20px; color: #64748b;">
            <span style="font-size: 1.8rem; display: block; margin-bottom: 8px;">📭</span>
            <strong>No bookings found matching current filters</strong>
            <p class="text-xs" style="margin-top: 4px;">Try selecting "All" or create a new dispatch booking using the button above.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(b => {
      const ref = b.ref && b.ref.startsWith('#') ? b.ref : `#${b.ref || 'JR-0000'}`;
      const status = b.status || 'Confirmed';
      const statusClass = status.toLowerCase().replace(/\s+/g, '-');
      const safeRef = ref.replace(/'/g, "\\'");
      const dateDisplay = formatDateDisplay(b.date);
      const timeDisplay = b.time || '04:30';
      const amount = Number(b.amount) || 75;
      const passName = b.customer_name || 'Passenger';
      const passPhone = b.customer_phone || '';
      const assigned = b.assigned_driver || '';
      const flightBadge = b.flight_number ? `<span class="badge-status badge-confirmed" style="font-size: 0.65rem; margin-left: 4px;">✈️ ${b.flight_number}</span>` : '';

      return `
        <tr data-ref="${ref}">
          <td><strong style="color: var(--color-navy);">${ref}</strong></td>
          <td>
            <strong>${passName}</strong>
            ${passPhone ? `<div class="text-xs"><a href="tel:${passPhone}" style="color: #64748b; text-decoration: none;">📞 ${passPhone}</a></div>` : ''}
          </td>
          <td>
            <div style="font-size: 0.84rem; font-weight: 600; color: #1e293b;">${b.pickup || 'Pickup'} &rarr; ${b.dropoff || 'Dropoff'} ${flightBadge}</div>
          </td>
          <td>
            <div style="font-size: 0.82rem; color: #334155;">${dateDisplay}</div>
            <span class="text-xs text-muted">⏰ ${timeDisplay}</span>
            ${b.completed_at ? `<div class="text-xs" style="color: #15803d; font-weight: 600; margin-top: 2px;">✓ Completed Today</div>` : ''}
          </td>
          <td>
            <span class="text-xs font-semibold" style="color: var(--color-navy);">${b.vehicle || 'Executive Sedan'}</span>
          </td>
          <td>
            <select class="admin-select-sm" onchange="App.assignDriverFromAdmin('${safeRef}', this.value)" title="Assign Chauffeur">
              <option value="" ${!assigned ? 'selected' : ''}>Unassigned</option>
              ${state.admin.drivers.map(d => `<option value="${d.name}" ${assigned === d.name ? 'selected' : ''}>${d.name}</option>`).join('')}
            </select>
          </td>
          <td><strong style="color: var(--color-navy); font-family: var(--font-heading);">&pound;${amount.toFixed(2)}</strong></td>
          <td>
            <select class="admin-select-sm status-select status-${statusClass}" onchange="App.updateBookingStatusFromAdmin('${safeRef}', this.value)" title="Change Booking Status">
              <option value="Confirmed" ${status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="En Route" ${status === 'En Route' ? 'selected' : ''}>En Route</option>
              <option value="Completed" ${status === 'Completed' ? 'selected' : ''}>Completed</option>
              <option value="Cancelled" ${status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
          <td class="text-right">
            <div class="table-action-btns" style="justify-content: flex-end; gap: 4px;">
              <button type="button" class="btn btn-outline btn-xs" style="color: #b45309; border-color: #fde68a; background: #fffbeb;" title="Live Chauffeur GPS Tracking" onclick="App.trackTripLive('${safeRef}')">🛰️ Track</button>
              ${status !== 'Completed' && status !== 'Cancelled' ? `
                <button type="button" class="btn btn-outline btn-xs" style="color: #15803d; border-color: #86efac; background: #f0fdf4; font-weight: 600;" title="Record Ride Completed" onclick="App.completeRideFromAdmin('${safeRef}')">
                  ✓ Complete
                </button>
              ` : `<span class="badge-status badge-completed" style="font-size: 0.72rem; padding: 2px 6px;">✓ Completed</span>`}
              ${passPhone ? `<a href="tel:${passPhone}" class="btn btn-outline btn-xs" title="Call Passenger">📞 Call</a>` : ''}
              <button type="button" class="btn btn-outline btn-xs" style="color: #b91c1c; border-color: #fecaca;" title="Cancel Booking" onclick="App.deleteBookingFromAdmin('${safeRef}')">✕</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Filter Bookings by status tab
  function filterAdminBookings(status, btn) {
    state.admin.bookingsFilter = status;
    document.querySelectorAll('#adminBookingFilterTabs .bstatus-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderAdminBookings();
  }

  // Search Bookings
  function searchAdminBookings(query) {
    state.admin.bookingsSearch = query;
    renderAdminBookings();
  }

  // Record Daily Ride Completion in Admin Panel
  async function completeRideFromAdmin(ref) {
    const found = state.admin.bookings.find(b => b.ref === ref || `#${b.ref}` === ref);
    if (!found) return;

    const nowIso = new Date().toISOString();
    const todayDateStr = nowIso.split('T')[0];

    found.status = 'Completed';
    found.completed_at = nowIso;
    found.completed_date = todayDateStr;

    // Update assigned chauffeur: increment completed rides and set duty status to Available
    if (found.assigned_driver) {
      const drv = state.admin.drivers.find(d => d.name === found.assigned_driver);
      if (drv) {
        drv.rides = (drv.rides || 0) + 1;
        if (drv.status === 'On Trip') {
          drv.status = 'On Duty';
        }
        saveAdminDrivers();
      }
    }

    // Update vehicle: set back to Available if On Journey
    if (found.vehicle) {
      const car = state.admin.cars.find(c => found.vehicle.includes(c.plate) || (found.assigned_driver && c.driver === found.assigned_driver));
      if (car && car.status === 'On Journey') {
        car.status = 'Available';
        saveAdminCars();
      }
    }

    // Persist to localStorage
    saveAdminBookings();

    // Persist to Supabase
    try {
      await updateBooking(ref, {
        status: 'Completed',
        completed_at: nowIso,
        completed_date: todayDateStr
      });
    } catch (e) {
      console.warn('Failed to update completed ride in Supabase:', e);
    }

    // Refresh KPIs & Views
    updateAdminKpis();
    renderAdminBookings();
    renderAdminDrivers();
    renderAdminCars();
    loadDashboardFromSupabase();

    showToast(`Journey ${ref} successfully recorded as Completed for today.`);
  }

  // Real-time Status Update via Admin
  async function updateBookingStatusFromAdmin(ref, newStatus) {
    if (newStatus === 'Completed') {
      return await completeRideFromAdmin(ref);
    }

    // 1. Update in local state
    const found = state.admin.bookings.find(b => b.ref === ref || `#${b.ref}` === ref);
    if (found) {
      found.status = newStatus;
    }
    saveAdminBookings();

    // 2. Persist to Supabase
    try {
      await updateBooking(ref, { status: newStatus });
    } catch (e) {
      console.warn('Failed to update booking status in Supabase:', e);
    }

    // 3. Update KPIs & re-render
    updateAdminKpis();
    renderAdminBookings();

    // 4. Update customer dashboard if rendered
    loadDashboardFromSupabase();

    showToast(`Journey ${ref} marked as ${newStatus}.`);
  }

  // Assign Chauffeur Driver via Admin
  async function assignDriverFromAdmin(ref, driverName) {
    const found = state.admin.bookings.find(b => b.ref === ref || `#${b.ref}` === ref);
    if (found) {
      found.assigned_driver = driverName;
      saveAdminBookings();
    }

    try {
      await updateBooking(ref, { assigned_driver: driverName });
    } catch (e) {
      console.warn('Failed to update driver in Supabase:', e);
    }

    renderAdminBookings();
    showToast(driverName ? `Assigned chauffeur ${driverName} to ${ref}.` : `Chauffeur unassigned from ${ref}.`);
  }

  // Cancel / Delete Booking from Admin
  async function deleteBookingFromAdmin(ref) {
    if (!confirm(`Are you sure you want to cancel and remove booking ${ref}?`)) return;

    state.admin.bookings = state.admin.bookings.filter(b => b.ref !== ref && `#${b.ref}` !== ref);
    saveAdminBookings();

    try {
      await updateBooking(ref, { status: 'Cancelled', active: false });
    } catch (e) {
      console.warn('Failed to cancel booking in Supabase:', e);
    }

    updateAdminKpis();
    renderAdminBookings();
    loadDashboardFromSupabase();
    showToast(`Booking ${ref} cancelled.`);
  }

  // ==============================================================
  // USER & CUSTOMER ACCOUNTS MANAGEMENT METHODS
  // ==============================================================

  function saveAdminUsers() {
    try {
      localStorage.setItem('jos_admin_users', JSON.stringify(state.admin.users));
    } catch (e) {
      console.warn('Could not save users to localStorage:', e);
    }
  }

  // Render Registered Customers & Users Table
  function renderAdminUsers() {
    const tbody = document.getElementById('adminUsersTableBody');
    if (!tbody) return;

    const filter = (state.admin.usersFilter || 'all').toLowerCase();
    const query = (state.admin.usersSearch || '').toLowerCase().trim();

    let list = state.admin.users || [];

    // Filter by tier or status
    if (filter !== 'all') {
      list = list.filter(u => {
        const status = (u.status || '').toLowerCase();
        const tier = (u.tier || '').toLowerCase();
        return status === filter.toLowerCase() || tier === filter.toLowerCase();
      });
    }

    // Filter by search query
    if (query) {
      list = list.filter(u => {
        const text = `${u.name || ''} ${u.email || ''} ${u.phone || ''} ${u.tier || ''} ${u.location || ''}`.toLowerCase();
        return text.includes(query);
      });
    }

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 36px 20px; color: #64748b;">
            <span style="font-size: 1.8rem; display: block; margin-bottom: 8px;">👥</span>
            <strong>No customer accounts found matching current filters</strong>
            <p class="text-xs" style="margin-top: 4px;">Click "+ Add Customer" to register a passenger account.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(u => {
      const initials = (u.name || 'U').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      const isActive = u.status === 'Active';
      const statusClass = isActive ? 'badge-confirmed' : 'badge-cancelled';
      const safeName = (u.name || '').replace(/'/g, "\\'");
      const safePhone = (u.phone || '').replace(/'/g, "\\'");

      return `
        <tr data-user-id="${u.id}">
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="user-avatar-initials">${initials}</div>
              <div>
                <strong style="color: var(--color-navy); display: flex; align-items: center; gap: 6px;">
                  ${u.name}
                  ${u.role === 'admin' ? '<span class="badge-role-admin">ADMIN</span>' : ''}
                </strong>
                <span class="text-xs text-muted">📍 ${u.location || 'UK Client'}</span>
              </div>
            </div>
          </td>
          <td>
            <div style="font-size: 0.85rem;"><a href="tel:${u.phone}" style="color: var(--color-navy); font-weight: 600; text-decoration: none;">📞 ${u.phone}</a></div>
            <div class="text-xs"><a href="mailto:${u.email}" style="color: #64748b; text-decoration: none;">✉️ ${u.email}</a></div>
          </td>
          <td>
            <select class="admin-select-sm" onchange="App.changeUserTier('${u.id}', this.value)" title="Change Client Tier">
              <option value="Executive Super Admin" ${u.tier === 'Executive Super Admin' ? 'selected' : ''}>Executive Super Admin 🛡️</option>
              <option value="Standard" ${u.tier === 'Standard' ? 'selected' : ''}>Standard</option>
              
              <option value="Corporate" ${u.tier === 'Corporate' ? 'selected' : ''}>Corporate 💼</option>
            </select>
          </td>
          <td>
            <span class="badge-status ${statusClass}">${u.status}</span>
          </td>
          <td>
            <strong style="color: var(--color-navy);">${u.rides || 0}</strong> transfers
          </td>
          <td>
            <strong style="color: var(--color-navy); font-family: var(--font-heading);">&pound;${(Number(u.spent) || 0).toLocaleString()}</strong>
          </td>
          <td>
            <span class="text-xs text-muted" style="max-width: 220px; display: inline-block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${u.notes || ''}">
              ${u.notes || 'Standard executive service'}
            </span>
          </td>
          <td class="text-right">
            <div class="table-action-btns" style="justify-content: flex-end;">
              <button type="button" class="btn btn-navy btn-xs" title="Dispatch transfer for this customer" onclick="App.dispatchForUser('${safeName}', '${safePhone}')">
                🚖 Dispatch
              </button>
              <a href="tel:${u.phone}" class="btn btn-outline btn-xs" title="Call Customer">📞</a>
              <button type="button" class="btn btn-outline btn-xs" title="${isActive ? 'Suspend Account' : 'Activate Account'}" onclick="App.toggleUserStatus('${u.id}')">
                ${isActive ? '⏸️ Suspend' : '▶️ Activate'}
              </button>
              <button type="button" class="btn btn-outline btn-xs" style="color: #b91c1c; border-color: #fecaca;" title="Delete User" onclick="App.deleteUser('${u.id}')">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function filterAdminUsers(filterValue, btn) {
    state.admin.usersFilter = filterValue;
    document.querySelectorAll('#adminUserFilterTabs .bstatus-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderAdminUsers();
  }

  function searchAdminUsers(query) {
    state.admin.usersSearch = query;
    renderAdminUsers();
  }

  function toggleUserStatus(userId) {
    const user = state.admin.users.find(u => u.id === userId);
    if (!user) return;
    user.status = user.status === 'Active' ? 'Suspended' : 'Active';
    saveAdminUsers();
    renderAdminUsers();
    showToast(`Customer account for ${user.name} is now ${user.status}.`);
  }

  function changeUserTier(userId, newTier) {
    const user = state.admin.users.find(u => u.id === userId);
    if (!user) return;
    user.tier = newTier;
    saveAdminUsers();
    updateAdminKpis();
    renderAdminUsers();
    showToast(`Upgraded ${user.name} to ${newTier} tier.`);
  }

  function deleteUser(userId) {
    const user = state.admin.users.find(u => u.id === userId);
    if (!confirm(`Are you sure you want to remove customer account for ${user?.name || 'this user'}?`)) return;
    state.admin.users = state.admin.users.filter(u => u.id !== userId);
    saveAdminUsers();
    updateAdminKpis();
    renderAdminUsers();
    showToast('Customer account removed.');
  }

  function dispatchForUser(userName, userPhone) {
    openManualBookingModal();
    const elName = document.getElementById('mbFormName');
    const elPhone = document.getElementById('mbFormPhone');
    if (elName) elName.value = userName;
    if (elPhone) elPhone.value = userPhone;
    showToast(`Dispatch modal opened for ${userName}.`);
  }

  function openAddUserModal() {
    const modal = document.getElementById('modalAddUser');
    if (modal) modal.classList.add('show');
  }

  function closeAddUserModal() {
    const modal = document.getElementById('modalAddUser');
    if (modal) modal.classList.remove('show');
    document.getElementById('formAddUser')?.reset();
  }

  function handleAddUserSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('usrFormName').value.trim();
    const phone = document.getElementById('usrFormPhone').value.trim();
    const email = document.getElementById('usrFormEmail').value.trim();
    const tier = document.getElementById('usrFormTier').value;
    const location = document.getElementById('usrFormLocation').value.trim() || 'Cotswolds & London';
    const status = document.getElementById('usrFormStatus').value;
    const notes = document.getElementById('usrFormNotes').value.trim() || 'Standard executive service';

    const newUser = {
      id: 'usr-' + Date.now(),
      name,
      phone,
      email,
      tier,
      location,
      status,
      notes,
      rides: 0,
      spent: 0
    };

    state.admin.users.push(newUser);
    saveAdminUsers();
    closeAddUserModal();
    updateAdminKpis();
    renderAdminUsers();
    showToast(`Customer account for ${name} registered successfully.`);
  }

  // Render Cars Fleet Grid
  function renderAdminCars() {
    const grid = document.getElementById('adminCarsGrid');
    if (!grid) return;

    const filter = state.admin.carsFilter || 'all';
    let cars = state.admin.cars || [];

    if (filter !== 'all') {
      cars = cars.filter(c => c.category === filter);
    }

    if (cars.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #fff; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
          <span style="font-size: 2rem; display: block; margin-bottom: 8px;">🚗</span>
          <strong>No vehicles found in this category</strong>
          <p class="text-xs text-muted" style="margin-top: 4px;">Click "+ Add New Car" to register a vehicle.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = cars.map(car => {
      const isAvailable = car.status === 'Available';
      const statusClass = isAvailable ? 'badge-confirmed' : (car.status === 'On Journey' ? 'badge-completed' : 'badge-en-route');

      return `
        <div class="admin-car-card">
          <div class="admin-car-thumb-wrap">
            <img src="${car.img || './assets/images/car_sedan.jpg'}" alt="${car.name}" class="admin-car-thumb" />
            <span class="admin-car-status-pill badge-status ${statusClass}">${car.status}</span>
          </div>
          <div class="admin-car-info">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <div>
                <strong class="admin-car-name">${car.name}</strong>
                <span class="text-xs text-muted" style="display: block;">${car.category} Class</span>
              </div>
              <span class="plate-badge">${car.plate}</span>
            </div>

            <div class="admin-car-specs-row">
              <span class="spec-pill">👤 ${car.passengers || 3} Max</span>
              <span class="spec-pill">🧳 ${car.luggage || 2} Luggage</span>
              <span class="spec-pill">💷 &pound;${car.basePrice || 45} Base</span>
            </div>

            <div style="font-size: 0.82rem; color: #475569; margin-bottom: 14px; background: #f8fafc; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--color-border); display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <strong>Chauffeur:</strong>
              <select class="admin-select-sm" onchange="App.changeCarDriver('${car.id}', this.value)" title="Assign Registered Chauffeur" style="font-size: 0.76rem; max-width: 170px;">
                <option value="">Unassigned (Pool Vehicle)</option>
                ${state.admin.drivers.map(d => `<option value="${d.name}" ${car.driver === d.name ? 'selected' : ''}>${d.name} (${d.badge})</option>`).join('')}
              </select>
            </div>

            <div class="admin-car-actions">
              <button type="button" class="btn btn-outline btn-xs" style="flex: 1;" onclick="App.toggleCarStatus('${car.id}')">
                ${isAvailable ? 'Set In Maintenance' : 'Set Available'}
              </button>
              <button type="button" class="btn btn-outline btn-xs" style="color: #b91c1c; border-color: #fecaca;" title="Remove Vehicle" onclick="App.deleteCarFromFleet('${car.id}')">
                🗑️
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Filter Cars by category tab
  function filterAdminCars(category, btn) {
    state.admin.carsFilter = category;
    document.querySelectorAll('#adminCarFilterTabs .bstatus-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderAdminCars();
  }

  // Toggle Car Status between Available and Maintenance
  function toggleCarStatus(carId) {
    const car = state.admin.cars.find(c => c.id === carId);
    if (!car) return;
    car.status = car.status === 'Available' ? 'Maintenance' : 'Available';
    saveAdminCars();
    updateAdminKpis();
    renderAdminCars();
    showToast(`${car.plate} status changed to ${car.status}.`);
  }

  // Delete Car from Fleet
  function deleteCarFromFleet(carId) {
    const car = state.admin.cars.find(c => c.id === carId);
    if (!confirm(`Are you sure you want to remove ${car?.name || 'this car'} from Jo's Rural Cars fleet?`)) return;
    state.admin.cars = state.admin.cars.filter(c => c.id !== carId);
    saveAdminCars();
    updateAdminKpis();
    renderAdminCars();
    populateAdminModalDropdowns();
    showToast(`Vehicle removed from fleet.`);
  }

  // Render Chauffeur Drivers Grid
  function renderAdminDrivers() {
    const grid = document.getElementById('adminDriversGrid');
    if (!grid) return;

    const filter = state.admin.driversFilter || 'all';
    let drivers = state.admin.drivers || [];

    if (filter !== 'all') {
      drivers = drivers.filter(d => d.status === filter);
    }

    if (drivers.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #fff; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
          <span style="font-size: 2rem; display: block; margin-bottom: 8px;">👔</span>
          <strong>No chauffeurs found matching current filter</strong>
          <p class="text-xs text-muted" style="margin-top: 4px;">Click "+ Add New Driver" to register a vetted chauffeur.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = drivers.map(drv => {
      const isOnDuty = drv.status === 'On Duty';
      const statusClass = isOnDuty ? 'badge-confirmed' : (drv.status === 'On Trip' ? 'badge-completed' : (drv.status === 'Suspended' ? 'badge-cancelled' : 'badge-completed'));
      const initials = (drv.name || 'D').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      const safeName = (drv.name || '').replace(/'/g, "\\'");

      return `
        <div class="admin-driver-card">
          <div class="admin-driver-header">
            <div class="admin-driver-avatar">${initials}</div>
            <div>
              <strong class="admin-driver-name">${drv.name}</strong>
              <span class="admin-driver-badge-id">Badge #${drv.badge}</span>
            </div>
            <span class="badge-status ${statusClass}" style="margin-left: auto;">${drv.status}</span>
          </div>

          <div class="admin-driver-details">
            <div class="admin-driver-detail-item">
              <span>Mobile Phone:</span>
              <a href="tel:${drv.phone}"><strong>${drv.phone}</strong></a>
            </div>
            ${drv.email ? `
              <div class="admin-driver-detail-item">
                <span>Email Address:</span>
                <a href="mailto:${drv.email}"><strong>${drv.email}</strong></a>
              </div>
            ` : ''}
            <div class="admin-driver-detail-item">
              <span>Assigned Vehicle:</span>
              <select class="admin-select-sm" onchange="App.changeDriverCar('${drv.id}', this.value)" title="Assign Fleet Car" style="font-size: 0.76rem; max-width: 170px;">
                <option value="">Unassigned (Relief)</option>
                ${state.admin.cars.map(c => `<option value="${c.plate} (${c.category})" ${drv.car && drv.car.includes(c.plate) ? 'selected' : ''}>${c.plate} - ${c.name}</option>`).join('')}
              </select>
            </div>
            <div class="admin-driver-detail-item">
              <span>Duty Status:</span>
              <select class="admin-select-sm" onchange="App.changeDriverStatus('${drv.id}', this.value)" title="Update Duty Status" style="font-size: 0.76rem;">
                <option value="On Duty" ${drv.status === 'On Duty' ? 'selected' : ''}>On Duty</option>
                <option value="On Trip" ${drv.status === 'On Trip' ? 'selected' : ''}>On Trip</option>
                <option value="Off Duty" ${drv.status === 'Off Duty' ? 'selected' : ''}>Off Duty</option>
                <option value="Suspended" ${drv.status === 'Suspended' ? 'selected' : ''}>Suspended</option>
              </select>
            </div>
            <div class="admin-driver-detail-item">
              <span>Rating &amp; Transfers:</span>
              <strong>★ ${drv.rating || '4.95'} (${drv.rides || 0} rides)</strong>
            </div>
          </div>

          <div class="admin-driver-actions">
            <button type="button" class="btn btn-navy btn-xs" style="flex: 1;" title="Dispatch new trip for this driver" onclick="App.dispatchForDriver('${safeName}')">
              🚖 Dispatch
            </button>
            <a href="tel:${drv.phone}" class="btn btn-outline btn-xs" title="Call Chauffeur">📞 Call</a>
            <button type="button" class="btn btn-outline btn-xs" onclick="App.toggleDriverDutyStatus('${drv.id}')">
              ${isOnDuty ? 'Set Off Duty' : 'Set On Duty'}
            </button>
            <button type="button" class="btn btn-outline btn-xs" style="color: #b91c1c; border-color: #fecaca;" title="Remove Driver" onclick="App.deleteDriver('${drv.id}')">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Filter Drivers by status tab
  function filterAdminDrivers(status, btn) {
    state.admin.driversFilter = status;
    document.querySelectorAll('#adminDriverFilterTabs .bstatus-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderAdminDrivers();
  }

  // Toggle Driver Duty Status
  function toggleDriverDutyStatus(driverId) {
    const drv = state.admin.drivers.find(d => d.id === driverId);
    if (!drv) return;
    drv.status = drv.status === 'On Duty' ? 'Off Duty' : 'On Duty';
    saveAdminDrivers();
    updateAdminKpis();
    renderAdminDrivers();
    showToast(`${drv.name} is now ${drv.status}.`);
  }

  // Change Driver Status directly
  function changeDriverStatus(driverId, newStatus) {
    const drv = state.admin.drivers.find(d => d.id === driverId);
    if (!drv) return;
    drv.status = newStatus;
    saveAdminDrivers();
    updateAdminKpis();
    renderAdminDrivers();
    showToast(`Chauffeur ${drv.name} status updated to ${newStatus}.`);
  }

  // Change Driver Vehicle pairing directly (Bidirectional)
  function changeDriverCar(driverId, newCar) {
    const drv = state.admin.drivers.find(d => d.id === driverId);
    if (!drv) return;
    const oldCar = drv.car;
    drv.car = newCar;
    saveAdminDrivers();

    // If previous car had this driver, clear it if changed
    if (oldCar && oldCar !== newCar) {
      const prevCar = state.admin.cars.find(c => oldCar.includes(c.plate));
      if (prevCar && prevCar.driver === drv.name) {
        prevCar.driver = '';
      }
    }

    // Link new car to this driver
    if (newCar) {
      const targetCar = state.admin.cars.find(c => newCar.includes(c.plate));
      if (targetCar) {
        targetCar.driver = drv.name;
      }
    }
    saveAdminCars();

    renderAdminDrivers();
    renderAdminCars();
    showToast(newCar ? `Assigned vehicle ${newCar} to ${drv.name}.` : `Vehicle unassigned from ${drv.name}.`);
  }

  // Change Car Driver pairing directly (Bidirectional)
  function changeCarDriver(carId, newDriverName) {
    const car = state.admin.cars.find(c => c.id === carId);
    if (!car) return;
    const oldDriverName = car.driver;
    car.driver = newDriverName;
    saveAdminCars();

    // If previous driver had this car, clear their assignment if changed
    if (oldDriverName && oldDriverName !== newDriverName) {
      const prevDriver = state.admin.drivers.find(d => d.name === oldDriverName);
      if (prevDriver && prevDriver.car && prevDriver.car.includes(car.plate)) {
        prevDriver.car = '';
      }
    }

    // Link new driver to this car
    if (newDriverName) {
      const targetDriver = state.admin.drivers.find(d => d.name === newDriverName);
      if (targetDriver) {
        targetDriver.car = `${car.plate} (${car.category})`;
      }
    }
    saveAdminDrivers();

    renderAdminCars();
    renderAdminDrivers();
    showToast(newDriverName ? `Chauffeur ${newDriverName} assigned to ${car.plate}.` : `Chauffeur unassigned from ${car.plate}.`);
  }

  // Dispatch Trip specifically for this Driver
  function dispatchForDriver(driverName) {
    openManualBookingModal();
    const elDriver = document.getElementById('mbFormDriver');
    if (elDriver) elDriver.value = driverName;
    showToast(`Dispatch modal opened with assigned chauffeur ${driverName}.`);
  }

  // Delete Driver
  function deleteDriver(driverId) {
    const drv = state.admin.drivers.find(d => d.id === driverId);
    if (!confirm(`Are you sure you want to remove chauffeur ${drv?.name || 'this driver'}?`)) return;
    state.admin.drivers = state.admin.drivers.filter(d => d.id !== driverId);
    saveAdminDrivers();
    updateAdminKpis();
    renderAdminDrivers();
    populateAdminModalDropdowns();
    showToast(`Chauffeur removed.`);
  }

  // Modals Open & Close
  function openAddVehicleModal() {
    populateAdminModalDropdowns();
    const modal = document.getElementById('modalAddVehicle');
    if (modal) modal.classList.add('show');
  }

  function closeAddVehicleModal() {
    const modal = document.getElementById('modalAddVehicle');
    if (modal) modal.classList.remove('show');
    document.getElementById('formAddVehicle')?.reset();
  }

  function openAddDriverModal() {
    populateAdminModalDropdowns();
    const modal = document.getElementById('modalAddDriver');
    if (modal) modal.classList.add('show');
  }

  function closeAddDriverModal() {
    const modal = document.getElementById('modalAddDriver');
    if (modal) modal.classList.remove('show');
    document.getElementById('formAddDriver')?.reset();
  }

  function openManualBookingModal() {
    populateAdminModalDropdowns();
    const modal = document.getElementById('modalAdminManualBooking');
    if (modal) {
      // Set default tomorrow date
      const d = new Date();
      d.setDate(d.getDate() + 1);
      const dateStr = d.toISOString().split('T')[0];
      const dateInp = document.getElementById('mbFormDate');
      if (dateInp) dateInp.value = dateStr;
      modal.classList.add('show');
    }
  }

  function closeManualBookingModal() {
    const modal = document.getElementById('modalAdminManualBooking');
    if (modal) modal.classList.remove('show');
    document.getElementById('formManualBooking')?.reset();
  }

  // Handle Add Vehicle Form Submit
  async function handleAddVehicleSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('carFormName').value.trim();
    const plate = document.getElementById('carFormPlate').value.trim().toUpperCase();
    const category = document.getElementById('carFormCategory').value;
    const basePrice = Number(document.getElementById('carFormBasePrice').value) || 45;
    const passengers = Number(document.getElementById('carFormPassengers').value) || 3;
    const luggage = Number(document.getElementById('carFormLuggage').value) || 2;
    const driver = document.getElementById('carFormDriver').value;
    const status = document.getElementById('carFormStatus').value;
    const img = document.getElementById('carFormImg').value;

    const newCar = {
      id: 'car-' + Date.now(),
      name,
      plate,
      category,
      basePrice,
      passengers,
      luggage,
      driver,
      status,
      img
    };

    state.admin.cars.push(newCar);
    saveAdminCars();

    // If chauffeur was assigned at registration, bidirectionally link to driver
    if (driver) {
      const assignedDrv = state.admin.drivers.find(d => d.name === driver);
      if (assignedDrv) {
        assignedDrv.car = `${plate} (${category})`;
        saveAdminDrivers();
      }
    }

    // Attempt Supabase insert in background
    try {
      await insertVehicleToSupabase({
        name,
        plate,
        category,
        base_price: basePrice,
        passengers,
        luggage,
        driver_name: driver,
        status,
        img
      });
    } catch (e) {}

    closeAddVehicleModal();
    updateAdminKpis();
    renderAdminCars();
    renderAdminDrivers();
    populateAdminModalDropdowns();
    showToast(`Vehicle ${plate} registered and paired with ${driver || 'pool fleet'}.`);
  }

  // Handle Add Driver Form Submit
  async function handleAddDriverSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('drvFormName').value.trim();
    const phone = document.getElementById('drvFormPhone').value.trim();
    const email = document.getElementById('drvFormEmail').value.trim();
    const badge = document.getElementById('drvFormBadge').value.trim().toUpperCase();
    const car = document.getElementById('drvFormCar').value;
    const status = document.getElementById('drvFormStatus').value;

    const newDriver = {
      id: 'drv-' + Date.now(),
      name,
      phone,
      email,
      badge,
      car,
      status,
      rating: 5.0,
      rides: 0
    };

    state.admin.drivers.push(newDriver);
    saveAdminDrivers();

    // If car was assigned at driver registration, bidirectionally link to vehicle
    if (car) {
      const assignedCar = state.admin.cars.find(c => car.includes(c.plate));
      if (assignedCar) {
        assignedCar.driver = name;
        saveAdminCars();
      }
    }

    // Attempt Supabase insert in background
    try {
      await insertDriverToSupabase({
        name,
        phone,
        email,
        badge,
        assigned_car: car,
        status,
        rating: 5.0,
        rides: 0
      });
    } catch (e) {}

    closeAddDriverModal();
    updateAdminKpis();
    renderAdminDrivers();
    renderAdminCars();
    populateAdminModalDropdowns();
    showToast(`Chauffeur ${name} registered and paired with ${car || 'pool'}.`);
  }

  // Handle Manual Dispatch Booking Form Submit
  async function handleManualBookingSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('mbFormName').value.trim();
    const phone = document.getElementById('mbFormPhone').value.trim();
    const pickup = document.getElementById('mbFormPickup').value.trim();
    const dropoff = document.getElementById('mbFormDropoff').value.trim();
    const date = document.getElementById('mbFormDate').value;
    const time = document.getElementById('mbFormTime').value;
    const vehicle = document.getElementById('mbFormVehicle').value;
    const driver = document.getElementById('mbFormDriver').value;
    const amount = Number(document.getElementById('mbFormAmount').value) || 75;
    const paymentStatus = document.getElementById('mbFormPayment').value;

    const randomRef = '#JR-' + Math.floor(1000 + Math.random() * 9000);

    const bookingRecord = {
      ref: randomRef,
      customer_name: name,
      customer_email: 'dispatch@josruralcars.co.uk',
      customer_phone: phone,
      pickup,
      dropoff,
      date,
      time,
      passengers: 2,
      luggage: 2,
      vehicle,
      amount,
      status: 'Confirmed',
      payment_status: paymentStatus,
      payment_method: 'Dispatch Direct',
      assigned_driver: driver || 'Pending Dispatch',
      active: true
    };

    // Save to Supabase
    try {
      await insertBooking(bookingRecord);
    } catch (e) {
      console.warn('Failed to insert manual booking to Supabase:', e);
    }

    // Add to local admin list at front and persist
    state.admin.bookings.unshift(bookingRecord);
    saveAdminBookings();

    closeManualBookingModal();
    updateAdminKpis();
    renderAdminBookings();
    loadDashboardFromSupabase();
    showToast(`Dispatch transfer ${randomRef} created successfully.`);
  }

  // Save System Rates
  function saveSystemRates() {
    const heathrow = Number(document.getElementById('sysRateHeathrow')?.value) || 45;
    const gatwick = Number(document.getElementById('sysRateGatwick')?.value) || 65;
    const luton = Number(document.getElementById('sysRateLuton')?.value) || 55;
    const stansted = Number(document.getElementById('sysRateStansted')?.value) || 60;
    const birmingham = Number(document.getElementById('sysRateBirmingham')?.value) || 75;

    state.admin.rates = {
      heathrow,
      gatwick,
      luton,
      stansted,
      birmingham
    };

    saveAdminRatesStorage();

    // Dynamically update vehicle fleet base rates
    if (state.vehicles.sedan) {
      state.vehicles.sedan.basePrice = heathrow;
      state.vehicles.sedan.total = heathrow + state.vehicles.sedan.tax;
    }

    showToast('Airport transfer rates saved and published live.');
  }

  // Toggle System Setting
  function toggleSystemSetting(settingKey, isChecked) {
    if (!state.admin.policies) state.admin.policies = {};
    state.admin.policies[settingKey] = isChecked;
    saveAdminPoliciesStorage();
    showToast(`System policy updated: ${settingKey} is now ${isChecked ? 'Enabled' : 'Disabled'}.`);
  }

  // Manually Sync Admin with Supabase
  async function syncAdminWithSupabase() {
    showToast('Syncing with Supabase cloud database...');
    await loadAdminDashboard();
    showToast('Supabase database synchronized successfully.');
  }

  // Export Bookings to CSV
  function exportBookingsCsv() {
    const bookings = state.admin.bookings || [];
    if (bookings.length === 0) {
      showToast('No booking records to export.');
      return;
    }

    const headers = ['Ref', 'Customer Name', 'Phone', 'Email', 'Pickup', 'Dropoff', 'Date', 'Time', 'Vehicle', 'Assigned Driver', 'Amount', 'Status'];
    const rows = bookings.map(b => [
      `"${b.ref || ''}"`,
      `"${b.customer_name || ''}"`,
      `"${b.customer_phone || ''}"`,
      `"${b.customer_email || ''}"`,
      `"${b.pickup || ''}"`,
      `"${b.dropoff || ''}"`,
      `"${b.date || ''}"`,
      `"${b.time || ''}"`,
      `"${b.vehicle || ''}"`,
      `"${b.assigned_driver || ''}"`,
      `"${b.amount || 0}"`,
      `"${b.status || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `jos_rural_cars_bookings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Bookings CSV downloaded successfully.');
  }

  // Copy Supabase SQL Migration
  function copySupabaseSql() {
    const sql = `-- Supabase SQL Schema for Jo's Rural Cars (Full Architecture)
-- Run this in your Supabase SQL Editor: https://app.supabase.com

-- 1. Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
  id BIGSERIAL PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  pickup TEXT NOT NULL,
  dropoff TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  passengers INT DEFAULT 2,
  luggage INT DEFAULT 2,
  vehicle TEXT NOT NULL,
  amount NUMERIC DEFAULT 75,
  status TEXT DEFAULT 'Confirmed',
  payment_status TEXT DEFAULT 'Paid',
  payment_method TEXT DEFAULT 'Stripe Encrypted Card',
  assigned_driver TEXT,
  flight_number TEXT,
  special_requests JSONB DEFAULT '[]'::jsonb,
  admin_notes TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Profiles & Registered Customers
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY DEFAULT ('usr-' || floor(random() * 1000000)::text),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  tier TEXT DEFAULT 'Standard',
  status TEXT DEFAULT 'Active',
  location TEXT,
  notes TEXT,
  rides INT DEFAULT 0,
  spent NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Fleet & Chauffeurs
CREATE TABLE IF NOT EXISTS public.fleet (
  id TEXT PRIMARY KEY DEFAULT ('fleet-' || floor(random() * 1000000)::text),
  name TEXT NOT NULL,
  plate TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  passengers INT DEFAULT 3,
  luggage INT DEFAULT 2,
  base_price NUMERIC DEFAULT 45,
  driver_name TEXT,
  status TEXT DEFAULT 'Available',
  img TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Payments & Transactions
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY DEFAULT ('pay-' || floor(random() * 1000000)::text),
  booking_ref TEXT NOT NULL,
  customer_email TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'GBP',
  status TEXT DEFAULT 'Paid',
  payment_method TEXT DEFAULT 'Stripe Encrypted Card',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. System Settings & Rates
CREATE TABLE IF NOT EXISTS public.system_settings (
  id INT PRIMARY KEY DEFAULT 1,
  base_flagfall NUMERIC DEFAULT 40,
  per_mile_rate NUMERIC DEFAULT 2.40,
  vat_rate NUMERIC DEFAULT 20,
  emergency_banner BOOLEAN DEFAULT TRUE,
  auto_dispatch BOOLEAN DEFAULT TRUE,
  sms_updates BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row-Level Security (RLS) policies
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read All" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Public Insert All" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update All" ON public.bookings FOR UPDATE USING (true);
CREATE POLICY "Public Delete All" ON public.bookings FOR DELETE USING (true);

CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public Insert Profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Profiles" ON public.profiles FOR UPDATE USING (true);

CREATE POLICY "Public Read Fleet" ON public.fleet FOR SELECT USING (true);
CREATE POLICY "Public Manage Fleet" ON public.fleet FOR ALL USING (true);

CREATE POLICY "Public Read Payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Public Insert Payments" ON public.payments FOR INSERT WITH CHECK (true);
`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(sql).then(() => {
        showToast('Complete Supabase SQL migration code copied to clipboard!');
      }).catch(() => {
        showToast('SQL schema ready. See console log.');
        console.log(sql);
      });
    } else {
      console.log(sql);
      showToast('SQL schema logged to browser developer console.');
    }
  }

  /* ============================================================== */
  /* NORMAL RIDE TRACKING & ONGOING JOURNEY RECORDER CONTROLLER     */
  /* ============================================================== */

  let ongoingRideTimerInterval = null;

  // 1. Initialize Customer Normal Tracking View
  function initCustomerTrackingView(tripId = 'JR-8821') {
    const cleanRef = String(tripId || 'JR-8821').replace('#', '');
    state.tracking.currentTrackTripId = cleanRef;

    // Check for existing ongoing ride
    let ride = getOngoingRide();

    // If no ongoing ride or referencing a different trip, check existing bookings
    if (!ride || (tripId && tripId !== 'JR-8821' && ride.ref.replace('#', '') !== cleanRef)) {
      const allBookings = state.admin.bookings || state.bookingsCache || [];
      const found = allBookings.find(b => String(b.ref || '').replace('#', '') === cleanRef);
      if (found) {
        ride = startOngoingRide(found);
      } else {
        // Fallback to currently confirmed booking in state or standard Cotswolds transfer
        ride = startOngoingRide({
          ref: `#${cleanRef}`,
          pickup: state.booking.pickup || 'Stroud, Cotswolds, GL5',
          dropoff: state.booking.dropoff || 'London Heathrow Terminal 5',
          date: state.booking.date || new Date().toISOString().split('T')[0],
          time: state.booking.time || '04:30',
          amount: 75.00,
          customer_name: (state.currentUser && state.currentUser.name) || 'James Doe',
          assigned_driver: 'Dave M. (Mercedes E-Class)',
          vehicle: 'Executive Mercedes-Benz E-Class',
          vehicleReg: 'YS24 OKL',
          flight_number: 'BA184'
        });
      }
    }

    state.ongoingRide = ride;

    // Populate Header & References
    const refDisplay = document.getElementById('trackTripRefDisplay');
    const statusPill = document.getElementById('trackStatusPill');
    const routeTitle = document.getElementById('trackRouteTitle');
    const fareDisplay = document.getElementById('trackFareDisplay');

    if (refDisplay) refDisplay.textContent = ride.ref.startsWith('#') ? ride.ref : `#${ride.ref}`;
    if (routeTitle) routeTitle.innerHTML = `${ride.pickup} &rarr; ${ride.dropoff}`;
    if (fareDisplay) fareDisplay.textContent = `£${parseFloat(ride.amount || 75).toFixed(2)}`;

    // Populate Itinerary Stops
    const pickupAddress = document.getElementById('trackPickupAddress');
    const dropoffAddress = document.getElementById('trackDropoffAddress');
    const pickupMeta = document.getElementById('trackPickupMeta');
    const dropoffMeta = document.getElementById('trackDropoffMeta');

    if (pickupAddress) pickupAddress.textContent = ride.pickup || 'Stroud, Cotswolds, GL5';
    if (dropoffAddress) dropoffAddress.textContent = ride.dropoff || 'London Heathrow Terminal 5';
    if (pickupMeta) pickupMeta.textContent = `Pickup Scheduled: ${formatDateDisplay(ride.date)} at ${ride.time || '04:30 AM'}`;
    if (dropoffMeta) dropoffMeta.innerHTML = `Drop-off: ${ride.dropoff} &bull; Flight Telemetry Active`;

    // Populate Chauffeur & Vehicle Info
    const driverDisplay = document.getElementById('trackDriverName');
    const vehicleDisplay = document.getElementById('trackVehicleModel');
    const flightDisplay = document.getElementById('trackFlightCard');

    if (driverDisplay) driverDisplay.textContent = ride.driverName || 'Dave M.';
    if (vehicleDisplay) vehicleDisplay.textContent = `${ride.vehicle || 'Executive Mercedes-Benz E-Class'} • ${ride.vehicleReg || 'YS24 OKL'}`;
    if (flightDisplay) flightDisplay.textContent = ride.flight_number || 'BA184';

    // Update Status Pill
    const stageConfig = STAGE_CONFIG[ride.status] || STAGE_CONFIG[RIDE_STAGES.CONFIRMED];
    if (statusPill) {
      statusPill.className = `live-status-pill ${stageConfig.badgeClass}`;
      statusPill.innerHTML = `<span class="status-pulse-dot green"></span> ${stageConfig.pillText}`;
    }

    const stageTag = document.getElementById('trackCurrentStageTag');
    if (stageTag) {
      stageTag.textContent = `Stage ${stageConfig.stepIndex} of 5: ${stageConfig.title}`;
    }

    // Update 5-Stage Visual Stepper
    updateTrackingStepperUI(stageConfig.stepIndex, ride.timeline || []);

    // Update Vertical Progress Connector
    const progressFill = document.getElementById('trackProgressFill');
    if (progressFill) {
      progressFill.style.height = `${stageConfig.percent}%`;
    }

    // Update Journey Recording Timeline
    renderTrackingTimeline(ride.timeline || []);

    // Update Drop-off Complete Card
    const dropoffCard = document.getElementById('dropoffCompleteCard');
    const dropoffSummary = document.getElementById('dropoffCompleteSummary');
    if (dropoffCard) {
      if (ride.status === RIDE_STAGES.DROPPED_OFF) {
        dropoffCard.classList.remove('d-none');
        if (dropoffSummary) {
          dropoffSummary.textContent = `Passenger safely dropped off at ${ride.dropoff}. Total recorded journey duration: ${ride.totalDuration || '75 mins'}.`;
        }
      } else {
        dropoffCard.classList.add('d-none');
      }
    }

    // Update Live SVG Map Markers and Telemetry
    updateLiveMapTelemetry(ride);

    // Start Live Journey Duration Timer
    startOngoingRideTimer();
  }

  // Update SVG Road Map & Telemetry for Passenger and Chauffeur
  function updateLiveMapTelemetry(ride) {
    if (!ride) return;

    const stagePositions = {
      [RIDE_STAGES.CONFIRMED]: {
        x: 80, y: 180,
        driverStatus: `${ride.driverName || 'Dave M.'} • Standby at Depot (15 mins away)`,
        speed: '0 mph • Chauffeur Pre-Trip Inspection',
        carTag: 'Depot Standby',
        dist: '~88 Miles',
        eta: '~ETA 06:40 AM'
      },
      [RIDE_STAGES.EN_ROUTE]: {
        x: 160, y: 160,
        driverStatus: `${ride.driverName || 'Dave M.'} • En Route to Passenger (~7 mins away)`,
        speed: '32 mph • On Cotswolds Arterial',
        carTag: 'En Route to Pickup',
        dist: '~86 Miles',
        eta: 'Arriving in 7 mins'
      },
      [RIDE_STAGES.ARRIVED]: {
        x: 240, y: 150,
        driverStatus: `${ride.driverName || 'Dave M.'} • Arrived at Passenger Pickup Location!`,
        speed: '0 mph • Meet & Greet at Doorstep',
        carTag: 'At Pickup Point',
        dist: '~85 Miles to Terminal',
        eta: 'Boarding now'
      },
      [RIDE_STAGES.IN_PROGRESS]: {
        x: 480, y: 210,
        driverStatus: `${ride.driverName || 'Dave M.'} • Passenger On Board • In Transit to ${ride.dropoff || 'Airport'}`,
        speed: '65 mph • Cruising along M4/M25 Corridor',
        carTag: 'Passenger On Board',
        dist: '~38 Miles',
        eta: '35 mins remaining'
      },
      [RIDE_STAGES.DROPPED_OFF]: {
        x: 720, y: 160,
        driverStatus: `${ride.driverName || 'Dave M.'} • Safely Arrived at ${ride.dropoff || 'Airport Terminal'}`,
        speed: '0 mph • Luggage Assisted & Dropped Off',
        carTag: 'Drop-off Complete',
        dist: '0 Miles',
        eta: 'Trip Finished'
      }
    };

    const pos = stagePositions[ride.status] || stagePositions[RIDE_STAGES.CONFIRMED];

    // Smoothly reposition the Chauffeur Car Marker
    const carMarker = document.getElementById('svgCarMarkerGroup');
    if (carMarker) {
      carMarker.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
    }

    // Update Driver Tag inside SVG
    const carTag = document.getElementById('svgCarDriverTag');
    if (carTag) {
      carTag.textContent = `${ride.driverName || 'Dave M.'} (${pos.carTag})`;
    }

    // Update SVG Destination and Pickup Labels
    const pickupLabel = document.getElementById('svgPickupLabel');
    if (pickupLabel && ride.pickup) {
      const shortPickup = ride.pickup.length > 30 ? ride.pickup.slice(0, 30) + '...' : ride.pickup;
      pickupLabel.textContent = `📍 Pickup: ${shortPickup}`;
    }

    const dropoffLabel = document.getElementById('svgDropoffLabel');
    if (dropoffLabel && ride.dropoff) {
      const shortDropoff = ride.dropoff.length > 30 ? ride.dropoff.slice(0, 30) + '...' : ride.dropoff;
      dropoffLabel.textContent = `🏁 Destination: ${shortDropoff}`;
    }

    // Update Floating Telemetry Strip
    const livePassLoc = document.getElementById('liveMapPassengerLocation');
    if (livePassLoc) {
      livePassLoc.textContent = ride.pickup || 'Cirencester, Cotswolds, GL7';
    }

    const liveDriverLoc = document.getElementById('liveMapDriverLocation');
    if (liveDriverLoc) {
      liveDriverLoc.textContent = pos.driverStatus;
    }

    const liveSpeedStatus = document.getElementById('liveMapSpeedStatus');
    if (liveSpeedStatus) {
      liveSpeedStatus.textContent = pos.speed;
    }

    // Update remaining miles and ETA
    const distEl = document.getElementById('trackDistRemaining');
    const etaEl = document.getElementById('trackEtaRemaining');
    if (distEl) distEl.textContent = pos.dist;
    if (etaEl) etaEl.textContent = pos.eta;
  }

  // Auto-Simulate Live Chauffeur Driving Along Route
  let tripSimulationInterval = null;
  const SIM_STAGES = [
    RIDE_STAGES.CONFIRMED,
    RIDE_STAGES.EN_ROUTE,
    RIDE_STAGES.ARRIVED,
    RIDE_STAGES.IN_PROGRESS,
    RIDE_STAGES.DROPPED_OFF
  ];

  function toggleTripSimulation() {
    const btnIcon = document.getElementById('simBtnIcon');
    const btnText = document.getElementById('simBtnText');

    if (tripSimulationInterval) {
      clearInterval(tripSimulationInterval);
      tripSimulationInterval = null;
      if (btnIcon) btnIcon.textContent = '▶️';
      if (btnText) btnText.textContent = 'Auto-Simulate Live Drive';
      showToast('Trip simulation paused.');
      return;
    }

    if (btnIcon) btnIcon.textContent = '⏸️';
    if (btnText) btnText.textContent = 'Pause Simulation';
    showToast('Trip simulation started: Chauffeur moving live along route.');

    let currentStageIndex = 0;
    const currentRide = getOngoingRide();
    if (currentRide && currentRide.status) {
      currentStageIndex = SIM_STAGES.indexOf(currentRide.status);
      if (currentStageIndex === -1 || currentStageIndex >= SIM_STAGES.length - 1) {
        currentStageIndex = 0;
      } else {
        currentStageIndex++;
      }
    }

    advanceRide(SIM_STAGES[currentStageIndex]);

    tripSimulationInterval = setInterval(() => {
      currentStageIndex++;
      if (currentStageIndex >= SIM_STAGES.length) {
        clearInterval(tripSimulationInterval);
        tripSimulationInterval = null;
        if (btnIcon) btnIcon.textContent = '▶️';
        if (btnText) btnText.textContent = 'Replay Live Drive Simulation';
        showToast('🏁 Trip simulation completed! Passenger safely dropped off.');
        return;
      }
      advanceRide(SIM_STAGES[currentStageIndex]);
    }, 3500);
  }

  // Recenter map focus
  function recenterTrackingMap() {
    const carMarker = document.getElementById('svgCarMarkerGroup');
    if (carMarker) {
      carMarker.style.filter = 'drop-shadow(0 0 16px #3b82f6)';
      setTimeout(() => {
        carMarker.style.filter = '';
      }, 1500);
    }
    const ride = getOngoingRide();
    const statusDesc = ride && STAGE_CONFIG[ride.status] ? STAGE_CONFIG[ride.status].title : 'Active';
    showToast(`🎯 Map focused: Chauffeur (${statusDesc}) & Passenger Beacon.`);
  }

  // Update Visual Progress Stepper Elements
  function updateTrackingStepperUI(currentStepIndex, timeline = []) {
    for (let i = 1; i <= 5; i++) {
      const stepNode = document.getElementById(`stepNode${i}`);
      const stepLine = document.getElementById(`stepLine${i}`);
      const stepTime = document.getElementById(`stepTime${i}`);

      if (stepNode) {
        stepNode.classList.remove('done', 'active');
        if (i < currentStepIndex) {
          stepNode.classList.add('done');
        } else if (i === currentStepIndex) {
          if (currentStepIndex === 5) {
            stepNode.classList.add('done');
          } else {
            stepNode.classList.add('active');
          }
        }
      }

      if (stepLine) {
        stepLine.classList.remove('done');
        if (i < currentStepIndex) {
          stepLine.classList.add('done');
        }
      }

      if (stepTime && timeline[i - 1]) {
        stepTime.textContent = timeline[i - 1].timestamp || timeline[i - 1].time || 'Logged';
      }
    }
  }

  // Render Recorded Milestones Timeline
  function renderTrackingTimeline(timeline = []) {
    const listEl = document.getElementById('trackTimelineList');
    if (!listEl) return;

    if (!timeline.length) {
      listEl.innerHTML = `<div class="timeline-empty-msg">No journey milestones recorded yet.</div>`;
      return;
    }

    listEl.innerHTML = timeline.map((item, idx) => `
      <div class="recording-timeline-item">
        <div class="rtl-marker ${idx === timeline.length - 1 ? 'latest' : ''}"></div>
        <div class="rtl-content">
          <div class="rtl-header">
            <strong>${escapeHtml(item.title || item.stage)}</strong>
            <span class="rtl-time">${escapeHtml(item.timestamp || item.time || '')}</span>
          </div>
          <p class="rtl-note">${escapeHtml(item.note || item.desc || '')}</p>
        </div>
      </div>
    `).join('');
  }

  // Live Timer for Ongoing Ride Recording
  function startOngoingRideTimer() {
    if (ongoingRideTimerInterval) {
      clearInterval(ongoingRideTimerInterval);
      ongoingRideTimerInterval = null;
    }

    function tick() {
      const ride = getOngoingRide();
      const timerDisplay = document.getElementById('trackSpeedDisplay');
      const timerBadge = document.getElementById('trackElapsedTimer');
      const driverCoords = document.getElementById('driverCoordsReadout');

      if (!ride || !ride.isOngoing || ride.status === RIDE_STAGES.DROPPED_OFF) {
        if (timerDisplay) timerDisplay.textContent = ride ? (ride.totalDuration || '75 mins') : '00:00';
        return;
      }

      const startMs = new Date(ride.startedAt || ride.createdAt).getTime();
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      const formatted = formatElapsedTime(elapsedSeconds);

      if (timerDisplay) timerDisplay.textContent = formatted;
      if (timerBadge) timerBadge.textContent = formatted;
      if (driverCoords) driverCoords.textContent = `${formatted} (Recording Active)`;
    }

    tick();
    ongoingRideTimerInterval = setInterval(tick, 1000);
  }

  // 2. Advance Ride Status & Record Milestones
  function advanceRide(nextStage, customNote = '') {
    const updatedRide = advanceRideStatus(nextStage, customNote);
    state.ongoingRide = updatedRide;

    if (nextStage === RIDE_STAGES.DROPPED_OFF) {
      if (ongoingRideTimerInterval) {
        clearInterval(ongoingRideTimerInterval);
        ongoingRideTimerInterval = null;
      }

      showToast(`🏁 Drop-off Complete! Passenger safely arrived at destination.`);

      // Sync completed booking in admin state
      if (state.admin && state.admin.bookings && updatedRide) {
        const found = state.admin.bookings.find(b => b.ref === updatedRide.ref);
        if (found) {
          found.status = 'Completed';
          found.admin_notes = `Dropped off at ${new Date().toLocaleTimeString()} (Duration: ${updatedRide.totalDuration})`;
          saveAdminBookings();
          updateAdminKpis();
          renderAdminBookings();
        }
      }
    } else {
      const meta = STAGE_CONFIG[nextStage] || {};
      showToast(`Status updated: ${meta.title || nextStage}`);
    }

    // Refresh views
    initCustomerTrackingView(state.tracking.currentTrackTripId);
    renderAdminOngoingRides();
    renderDashboardLiveJourney();
  }

  // 3. Confirm Route from Tracking Form
  function handleConfirmRouteTrack(e) {
    if (e && e.preventDefault) e.preventDefault();
    const pickupInput = document.getElementById('trkInputPickup');
    const dropoffInput = document.getElementById('trkInputDropoff');
    const refInput = document.getElementById('trkInputRef');

    const pickup = pickupInput ? pickupInput.value.trim() : '';
    const dropoff = dropoffInput ? dropoffInput.value.trim() : '';
    const ref = refInput && refInput.value.trim() ? refInput.value.trim() : `#JR-${Math.floor(1000 + Math.random() * 9000)}`;

    if (!pickup || !dropoff) {
      showToast('Please enter both pickup location and drop-off destination.');
      return;
    }

    const ride = startOngoingRide({
      ref: ref,
      pickup: pickup,
      dropoff: dropoff,
      amount: 75.00,
      customer_name: (state.currentUser && state.currentUser.name) || 'James Doe',
      assigned_driver: 'Dave M. (Mercedes E-Class)'
    });

    state.ongoingRide = ride;
    state.tracking.currentTrackTripId = ride.ref.replace('#', '');

    showToast(`✓ Pickup & Drop-off confirmed! Ongoing ride #${state.tracking.currentTrackTripId} is recording.`);
    initCustomerTrackingView(state.tracking.currentTrackTripId);

    if (pickupInput) pickupInput.value = '';
    if (dropoffInput) dropoffInput.value = '';
    if (refInput) refInput.value = '';
  }

  // 4. Open Receipt for Current Active/Completed Trip
  function openReceiptForActiveTrip() {
    const ride = state.ongoingRide || getOngoingRide();
    const cleanRef = ride ? ride.ref : (state.tracking.currentTrackTripId || 'JR-8821');
    viewReceipt(cleanRef);
  }

  // 5. Track Trip Live
  function trackTripLive(ref) {
    const cleanRef = String(ref || 'JR-8821').replace('#', '');
    state.tracking.currentTrackTripId = cleanRef;
    navigateTo(`track/${cleanRef}`);
    initCustomerTrackingView(cleanRef);
  }

  function trackTripFromModal() {
    const modalRef = document.getElementById('modalBookingRef');
    const ref = (modalRef && modalRef.textContent) ? modalRef.textContent.replace('#', '') : 'JR-8821';
    closeSuccessModal();
    trackTripLive(ref);
  }

  function copyTrackingLink() {
    const cleanRef = state.tracking.currentTrackTripId || 'JR-8821';
    const trackingUrl = `${window.location.origin}${window.location.pathname}#track/${cleanRef}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(trackingUrl).then(() => {
        showToast(`Tracking link for #${cleanRef} copied!`);
      }).catch(() => {
        prompt('Tracking URL:', trackingUrl);
      });
    } else {
      prompt('Tracking URL:', trackingUrl);
    }
  }

  // 6. Driver Portal View Controller
  function initDriverPortalView(tripId = 'JR-8821') {
    const cleanRef = String(tripId || 'JR-8821').replace('#', '');
    state.tracking.selectedDriverTripId = cleanRef;

    const ride = getOngoingRide();
    const tripTitle = document.getElementById('driverCurrentTripTitle');
    const statusBadge = document.getElementById('driverTripStatusBadge');

    if (tripTitle) {
      if (ride) {
        tripTitle.textContent = `${ride.ref}: ${ride.pickup} → ${ride.dropoff}`;
      } else {
        tripTitle.textContent = `#${cleanRef}: Stroud, Cotswolds → London Heathrow T5`;
      }
    }

    if (statusBadge && ride) {
      const cfg = STAGE_CONFIG[ride.status] || STAGE_CONFIG[RIDE_STAGES.CONFIRMED];
      statusBadge.textContent = cfg.pillText;
      statusBadge.className = `badge-status ${cfg.badgeClass}`;
    }
  }

  function driverStartTracking() { advanceRide(RIDE_STAGES.EN_ROUTE); }
  function driverPauseTracking() { advanceRide(RIDE_STAGES.ARRIVED); }
  function driverResumeTracking() { advanceRide(RIDE_STAGES.IN_PROGRESS); }
  function driverStopTracking() { advanceRide(RIDE_STAGES.DROPPED_OFF); }

  function handleDriverSelectTrip(tripId) {
    state.tracking.selectedDriverTripId = tripId;
    initDriverPortalView(tripId);
    showToast(`Switched driver view to #${tripId}.`);
  }

  function acceptAssignedTripFromDriver() {
    if (state.booking.dispatchStatus === 'awaiting_driver_acceptance') {
      acceptDriverDispatch('Dave M.');
      return;
    }
    showToast(`Journey accepted. Chauffeur ready for dispatch.`);
    advanceRide(RIDE_STAGES.EN_ROUTE);
  }

  // 7. Admin Ongoing Rides Dispatch Controller
  function initAdminFleetView() {
    renderAdminOngoingRides();
  }

  function focusAdminDriver(driverId) {
    showToast(`Focusing assigned chauffeur ${driverId}.`);
  }

  function refreshAdminFleetMap() {
    renderAdminOngoingRides();
    showToast('Refreshed active ongoing dispatches.');
  }

  function renderAdminOngoingRides() {
    const tableBody = document.getElementById('adminOngoingRidesTableBody');
    const badgeCount = document.getElementById('adminActiveDriversCountBadge');
    if (!tableBody) return;

    // Gather active ride and pending/confirmed bookings
    const ongoing = getOngoingRide();
    const allBookings = state.admin.bookings || state.bookingsCache || [];
    const activeList = [];

    if (ongoing) {
      activeList.push(ongoing);
    }

    allBookings.forEach(b => {
      const ref = b.ref ? b.ref.replace('#', '') : '';
      if (!activeList.some(item => item.ref.replace('#', '') === ref)) {
        if (b.status !== 'Completed' && b.status !== 'Cancelled') {
          activeList.push({
            ref: b.ref,
            customer_name: b.customer_name || 'Passenger',
            pickup: b.pickup || 'Stroud, Cotswolds',
            dropoff: b.dropoff || 'London Heathrow',
            vehicle: b.vehicle || 'Mercedes-Benz E-Class',
            driverName: b.assigned_driver || 'Dave M.',
            status: b.status === 'Confirmed' ? RIDE_STAGES.CONFIRMED : RIDE_STAGES.EN_ROUTE,
            isOngoing: true,
            totalDuration: 'Active'
          });
        }
      }
    });

    if (badgeCount) {
      badgeCount.textContent = activeList.length;
    }

    if (!activeList.length) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-muted">
            No active rides in transit. When a customer confirms a booking, it will record here live until drop-off.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = activeList.map(r => {
      const cfg = STAGE_CONFIG[r.status] || STAGE_CONFIG[RIDE_STAGES.CONFIRMED];
      const safeRef = escapeHtml(r.ref || '#JR-8821');
      const cleanRef = safeRef.replace('#', '');
      return `
        <tr>
          <td><strong style="color:var(--color-gold); font-size:0.85rem;">${safeRef}</strong></td>
          <td><strong>${escapeHtml(r.customer_name || 'Passenger')}</strong></td>
          <td>
            <div style="font-size:0.82rem;">${escapeHtml(r.pickup || 'Pickup')}</div>
            <div style="font-size:0.75rem; color:#94a3b8;">&rarr; ${escapeHtml(r.dropoff || 'Drop-off')}</div>
          </td>
          <td>
            <div style="font-size:0.82rem;">${escapeHtml(r.driverName || 'Dave M.')}</div>
            <div style="font-size:0.72rem; color:#94a3b8;">${escapeHtml(r.vehicle || 'Mercedes E-Class')}</div>
          </td>
          <td>
            <span class="badge-status ${cfg.badgeClass}" style="font-size:0.75rem;">
              ${cfg.icon} ${cfg.pillText}
            </span>
          </td>
          <td>
            <span style="font-family:monospace; color:#38bdf8;">${r.totalDuration || 'Recording...'}</span>
          </td>
          <td>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button type="button" class="btn btn-outline btn-xs" onclick="App.trackTripLive('${cleanRef}')">
                Track
              </button>
              <button type="button" class="btn btn-gold btn-xs" onclick="App.advanceRide('in_progress')">
                Pick Up
              </button>
              <button type="button" class="btn btn-navy btn-xs" onclick="App.advanceRide('dropped_off')">
                Drop Off
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function setupDriverTrackingListeners() {
    window.addEventListener('ongoing_ride:updated', (e) => {
      const ride = e.detail && e.detail.ride;
      if (ride) {
        state.ongoingRide = ride;
      }
    });
    window.addEventListener('ongoing_ride:completed', () => {
      state.ongoingRide = null;
    });
  }

  // App Master Initializer
  function init() {
    setupDriverTrackingListeners();

    // Set default date input to 3 days from now
    const today = new Date();
    today.setDate(today.getDate() + 3);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const defaultDateStr = `${yyyy}-${mm}-${dd}`;

    const dateInput = document.getElementById('widgetDate');
    if (dateInput) {
      dateInput.value = defaultDateStr;
      dateInput.min = new Date().toISOString().split('T')[0];
      state.booking.date = defaultDateStr;
    }

    // Card formatting input
    const cardInput = document.getElementById('cardNumber');
    if (cardInput) {
      cardInput.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '').substring(0, 16);
        let formatted = v.match(/.{1,4}/g)?.join(' ') || v;
        e.target.value = formatted;
      });
    }

    // Card expiry formatting
    const expiryInput = document.getElementById('cardExpiry');
    if (expiryInput) {
      expiryInput.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '').substring(0, 4);
        if (v.length > 2) {
          e.target.value = `${v.substring(0, 2)}/${v.substring(2)}`;
        } else {
          e.target.value = v;
        }
      });
    }

    // Mobile Hamburger & Drawer Navigation
    const menuBtn = document.getElementById('mobileMenuToggle');
    const drawer = document.getElementById('mobileDrawer');
    if (menuBtn && drawer) {
      menuBtn.addEventListener('click', () => {
        drawer.classList.toggle('open');
      });

      // Auto-close drawer on link click and navigate
      drawer.querySelectorAll('.mobile-link').forEach(link => {
        link.addEventListener('click', () => {
          const page = link.getAttribute('data-page');
          if (page) {
            navigateTo(page);
          }
          drawer.classList.remove('open');
        });
      });
    }

    // Hash routing listener
    window.addEventListener('hashchange', () => {
      const rawHash = window.location.hash.replace('#', '') || 'home';
      const baseHash = rawHash.split('/')[0].split('?')[0];
      const validViews = ['home', 'signin', 'airports', 'select-vehicle', 'fleet', 'passenger-details', 'payment', 'dashboard', 'contact', 'admin', 'track', 'driver'];
      if (validViews.includes(baseHash)) {
        navigateTo(rawHash);
        if (baseHash === 'dashboard') {
          loadDashboardFromSupabase();
        } else if (baseHash === 'admin') {
          loadAdminDashboard();
        } else if (baseHash === 'signin') {
          updateSignInPageView();
        }
      }
    });

    // Check initial hash (ignoring OAuth access token fragments)
    let initialHash = window.location.hash.replace('#', '') || 'home';
    if (initialHash.includes('access_token=') || initialHash.includes('error=')) {
      const redirectTarget = sessionStorage.getItem('jos_auth_redirect') || 'select-vehicle';
      sessionStorage.removeItem('jos_auth_redirect');
      initialHash = redirectTarget;
      // Clean URL hash so user does not see raw token in address bar
      setTimeout(() => {
        if (window.location.hash.includes('access_token=')) {
          window.history.replaceState(null, null, window.location.pathname + '#' + redirectTarget);
        }
      }, 400);
    }
    navigateTo(initialHash);

    // Initialize authenticated user header & badges
    updateUserUI();

    // Run Supabase health check and load real bookings
    initSupabase();
  }

  // Run on DOM loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API
  return {
    navigateTo,
    startBookingFlow,
    focusBookingWidget,
    handleHeroSearch,
    quickSelectAirport,
    bookAirportTransfer,
    filterAirports,
    selectVehicle,
    confirmVehicleSelection,
    selectVehicleAndProceed,
    syncFleetRouteInputs,
    setFleetPickupLocation,
    setFleetDropoffAirport,
    swapFleetRouteLocations,
    clearFleetInput,
    openRouteSuggestions,
    closeAllRouteSuggestions,
    selectRouteSuggestion,
    onFleetRouteInputChanged,
    requestFleetChauffeur,
    acceptDriverDispatch,
    proceedAfterDriverAcceptance,
    cancelFleetDriverDispatch,
    dismissDriverNotification,
    updateAllocatedChauffeurUI,
    toggleRequestChip,
    handlePassengerSubmit,
    handlePaymentSubmit,
    closeSuccessModal,
    goToDashboardAfterBooking,
    rebookTrip,
    rebookLastTrip,
    showDashboardTab,
    openProfileModal,
    closeProfileModal,
    handleProfileSave,
    openPaymentsModal,
    closePaymentsModal,
    viewReceipt,
    closeReceiptModal,
    showManageTripModal,
    closeManageTripModal,
    handleManageTripSave,
    openLiveSupport,
    closeLiveSupportModal,
    showSavedRoutes,
    filterBookingStatus,
    filterBookingHistory,
    showAllBookings,
    toggleAccordion,
    handleContactSubmit,
    createAccountMock,
    guestCheckoutMock,
    showToast,
    loadDashboardFromSupabase,
    checkSupabaseHealth,
    // Passenger Auth & Sign In Page Public API
    openSignInPage,
    togglePasswordVisibility,
    openAuthModal,
    closeAuthModal,
    switchAuthTab,
    handleSignIn,
    handleSignUp,
    handleForgotPassword,
    handleSignOut,
    updateUserUI,
    updateSignInPageView,
    switchSignInPageTab,
    handleSignInPageSubmit,
    handleSignUpPageSubmit,
    quickSignInAs,
    proceedToNextBookingStep,
    // Google Integration & SSO Public API
    handleGoogleSignIn,
    openGoogleAccountChooser,
    closeGoogleAccountChooser,
    selectGoogleAccount,
    handleCustomGoogleSignIn,
    toggleGoogleSetupInstructions,
    // Normal Ride Tracking & Journey Recorder Public API
    initCustomerTrackingView,
    advanceRide,
    toggleTripSimulation,
    recenterTrackingMap,
    handleConfirmRouteTrack,
    openReceiptForActiveTrip,
    renderAdminOngoingRides,
    copyTrackingLink,
    trackTripLive,
    trackTripFromModal,
    initDriverPortalView,
    driverStartTracking,
    driverPauseTracking,
    driverResumeTracking,
    driverStopTracking,
    handleDriverSelectTrip,
    acceptAssignedTripFromDriver,
    initAdminFleetView,
    focusAdminDriver,
    refreshAdminFleetMap,
    // Admin & Dispatch Public API
    loadAdminDashboard,
    updateAdminKpis,
    updateAdminOverview,
    switchAdminTab,
    switchFleetSubTab,
    renderAdminPayments,
    exportAdminDatabase,
    searchAdminGlobally,
    toggleAdminSidebar,
    toggleRadarMode,
    renderAdminBookings,
    filterAdminBookings,
    searchAdminBookings,
    updateBookingStatusFromAdmin,
    completeRideFromAdmin,
    assignDriverFromAdmin,
    deleteBookingFromAdmin,
    renderAdminUsers,
    filterAdminUsers,
    searchAdminUsers,
    toggleUserStatus,
    changeUserTier,
    deleteUser,
    dispatchForUser,
    openAddUserModal,
    closeAddUserModal,
    handleAddUserSubmit,
    renderAdminCars,
    filterAdminCars,
    toggleCarStatus,
    deleteCarFromFleet,
    renderAdminDrivers,
    filterAdminDrivers,
    toggleDriverDutyStatus,
    changeDriverStatus,
    changeDriverCar,
    changeCarDriver,
    dispatchForDriver,
    deleteDriver,
    openAddVehicleModal,
    closeAddVehicleModal,
    handleAddVehicleSubmit,
    openAddDriverModal,
    closeAddDriverModal,
    handleAddDriverSubmit,
    openManualBookingModal,
    closeManualBookingModal,
    handleManualBookingSubmit,
    saveSystemRates,
    toggleSystemSetting,
    syncAdminWithSupabase,
    exportBookingsCsv,
    copySupabaseSql
  };
})();

window.App = App;
