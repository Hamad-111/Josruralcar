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
  insertVehicleToSupabase
} from './supabase.js';

const App = (() => {
  // Application Data & State
  const state = {
    currentView: 'home',
    booking: {
      pickup: 'Stroud, Cotswolds, GL5',
      dropoff: 'London Heathrow Terminal 5',
      date: '2026-10-24',
      time: '04:30',
      passengers: '2 Passengers',
      vehicleKey: 'executive',
      passenger: {
        fullName: 'James Doe',
        email: 'james@example.com',
        phone: '7700 900000',
        flightNum: 'BA123',
        requests: ['meet_greet'],
        notes: 'Terminal 5 departures drop-off preferred, 2 medium suitcases.'
      },
      bookingRef: 'JRC-2026-8821'
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
      bookings: [],
      users: (() => {
        try {
          const saved = localStorage.getItem('jos_admin_users');
          if (saved) return JSON.parse(saved);
        } catch (e) {}
        return [
          {
            id: 'usr-1',
            name: 'James Doe',
            email: 'james@example.com',
            phone: '+44 7700 900000',
            tier: 'Gold VIP',
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
            tier: 'Gold VIP',
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
      'airports': 'viewAirports',
      'select-vehicle': 'viewSelectVehicle',
      'fleet': 'viewSelectVehicle',
      'passenger-details': 'viewPassengerDetails',
      'payment': 'viewPayment',
      'dashboard': 'viewDashboard',
      'contact': 'viewContact',
      'admin': 'viewAdmin'
    };

    const targetElementId = targetMap[viewId] || 'viewHome';

    // Hide all views
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.remove('active');
    });

    // Show target view
    const targetView = document.getElementById(targetElementId);
    if (targetView) {
      targetView.classList.add('active');
      state.currentView = viewId;
      window.location.hash = viewId;
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    if (viewId === 'admin') {
      loadAdminDashboard();
    } else if (viewId === 'dashboard') {
      loadDashboardFromSupabase();
    }

    // Sync View Data
    syncUIWithState();
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

  // Handle Home Search Form Submit
  function handleHeroSearch(e) {
    e.preventDefault();
    const pickup = document.getElementById('widgetPickup').value.trim();
    const dropoff = document.getElementById('widgetDropoff').value.trim();
    const date = document.getElementById('widgetDate').value;
    const time = document.getElementById('widgetTime').value;
    const passengers = document.getElementById('widgetPassengers').value;

    state.booking.pickup = pickup || state.booking.pickup;
    state.booking.dropoff = dropoff || state.booking.dropoff;
    state.booking.date = date || state.booking.date;
    state.booking.time = time || state.booking.time;
    state.booking.passengers = passengers || state.booking.passengers;

    showToast('Route updated. Choose your vehicle.');
    navigateTo('select-vehicle');
  }

  // Quick Select Airport from Airport Cards
  function quickSelectAirport(airportName, basePrice) {
    state.booking.dropoff = airportName;
    showToast(`Destination set to ${airportName}`);
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

  function confirmVehicleSelection(vehicleKey, e) {
    if (e) e.stopPropagation();
    selectVehicle(vehicleKey);
    navigateTo('passenger-details');
  }

  function selectVehicleAndProceed(vehicleKey) {
    selectVehicle(vehicleKey);
    navigateTo('select-vehicle');
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
      badge.title = 'Supabase Database Connected (Live Data Sync Active)';
      badge.innerHTML = `<span class="db-dot"></span><span class="db-text">🟢 Supabase Live</span>`;
    } else {
      badge.classList.remove('connected');
      badge.classList.add('error');
      badge.title = `Supabase DB Offline: ${message || 'Check connection'}`;
      badge.innerHTML = `<span class="db-dot"></span><span class="db-text">🔴 DB Offline</span>`;
    }
  }

  // Load Bookings from Supabase into Customer Dashboard
  async function loadDashboardFromSupabase() {
    const tableBody = document.getElementById('dashTableBody');
    if (!tableBody) return;

    try {
      const bookings = await fetchBookings();
      if (!bookings || bookings.length === 0) return;

      tableBody.innerHTML = bookings.map(b => {
        const vName = b.vehicle || 'Executive Sedan';
        const ref = b.ref && b.ref.startsWith('#') ? b.ref : `#${b.ref || 'JR-8900'}`;
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
      customer_name: pass.fullName || 'James Doe',
      customer_email: pass.email || 'james@example.com',
      customer_phone: pass.phone ? `+44 ${pass.phone}` : '+44 7700 900000',
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
      assigned_driver: 'Dave M. (Mercedes E-Class)',
      flight_number: pass.flightNum || null,
      special_requests: pass.requests || [],
      admin_notes: pass.notes || null,
      active: true
    };

    const insertResult = await insertBooking(bookingRecord);

    if (payBtn) {
      payBtn.disabled = false;
      payBtn.innerHTML = originalText;
    }

    // Populate Success Modal
    document.getElementById('modalBookingRef').textContent = randomRef;
    document.getElementById('modalPassengerName').textContent = pass.fullName || 'James Doe';
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
      const modal = document.getElementById('modalProfile');
      if (modal) modal.classList.add('show');
    } else if (tabName === 'payments') {
      const modal = document.getElementById('modalPayments');
      if (modal) modal.classList.add('show');
    } else if (tabName === 'help') {
      openLiveSupport();
    }
  }

  function closeProfileModal() {
    const modal = document.getElementById('modalProfile');
    if (modal) modal.classList.remove('show');
  }

  function closePaymentsModal() {
    const modal = document.getElementById('modalPayments');
    if (modal) modal.classList.remove('show');
  }

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

  function showManageTripModal() {
    const modal = document.getElementById('modalManageTrip');
    if (modal) {
      modal.classList.add('show');
    } else {
      showToast('Assigned Driver: Dave M. (Mercedes E-Class, LG74 WXN) • +44 7700 900123');
    }
  }

  function closeManageTripModal() {
    const modal = document.getElementById('modalManageTrip');
    if (modal) modal.classList.remove('show');
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
    } catch (err) {
      console.error('Error during Supabase startup check:', err);
      updateSupabaseStatusBadge(false, err.message);
    }
  }

  // ==============================================================
  // ADMIN & DISPATCH CONTROL CENTER METHODS
  // ==============================================================

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
      } else if (!state.admin.bookings || state.admin.bookings.length === 0) {
        // Fallback default seed bookings if empty
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
            date: '2026-10-23',
            time: '14:15',
            vehicle: 'Luxury MPV (Mercedes V-Class)',
            amount: 185,
            status: 'En Route',
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
            date: '2026-10-18',
            time: '09:00',
            vehicle: 'Executive Estate (Mercedes Estate)',
            amount: 120,
            status: 'Completed',
            assigned_driver: 'David Miller',
            flight_number: 'EZY221'
          }
        ];
      }

      // Populate dropdowns in modals
      populateAdminModalDropdowns();

      // Render tab components
      updateAdminKpis();
      renderAdminBookings();
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

  // Update 5 KPI Metric Cards & Tab Badges
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
    const vipUsersCount = users.filter(u => u.tier === 'Gold VIP' || u.tier === 'Corporate').length;

    const elTotal = document.getElementById('adminKpiTotalBookings');
    const elRev = document.getElementById('adminKpiRevenue');
    const elCars = document.getElementById('adminKpiActiveCars');
    const elDrivers = document.getElementById('adminKpiActiveDrivers');
    const elPending = document.getElementById('adminKpiPending');
    const elUsers = document.getElementById('adminKpiTotalUsers');
    const elVip = document.getElementById('adminKpiVipUsers');

    if (elTotal) elTotal.textContent = totalBookings;
    if (elRev) elRev.textContent = `£${totalRev.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Revenue`;
    if (elCars) elCars.textContent = `${activeCarsCount} / ${cars.length}`;
    if (elDrivers) elDrivers.textContent = `${onDutyDriversCount} / ${drivers.length}`;
    if (elPending) elPending.textContent = pendingTrips;
    if (elUsers) elUsers.textContent = users.length;
    if (elVip) elVip.textContent = `${vipUsersCount} VIP Tiers Active`;

    // Badges in Sub-tab buttons
    const bCount = document.getElementById('adminBadgeBookingsCount');
    const uCount = document.getElementById('adminBadgeUsersCount');
    const cCount = document.getElementById('adminBadgeCarsCount');
    const dCount = document.getElementById('adminBadgeDriversCount');

    if (bCount) bCount.textContent = totalBookings;
    if (uCount) uCount.textContent = users.length;
    if (cCount) cCount.textContent = cars.length;
    if (dCount) dCount.textContent = onDutyDriversCount;
  }

  // Switch Sub-tabs (Live Bookings, Users, Drivers, Cars, System)
  function switchAdminTab(tabName, clickedBtn) {
    state.admin.activeTab = tabName;

    // Update buttons in navbar
    document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));
    if (clickedBtn) {
      clickedBtn.classList.add('active');
    } else {
      const targetBtn = document.querySelector(`.admin-tab-btn[data-admin-tab="${tabName}"]`);
      if (targetBtn) targetBtn.classList.add('active');
    }

    // Toggle panes
    document.querySelectorAll('.admin-tab-pane').forEach(pane => pane.classList.remove('active'));
    const paneMap = {
      'bookings': 'adminPaneBookings',
      'users': 'adminPaneUsers',
      'drivers': 'adminPaneDrivers',
      'cars': 'adminPaneCars',
      'system': 'adminPaneSystem'
    };
    const targetPaneId = paneMap[tabName] || 'adminPaneBookings';
    const targetPane = document.getElementById(targetPaneId);
    if (targetPane) targetPane.classList.add('active');
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
            <div class="table-action-btns" style="justify-content: flex-end;">
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

  // Real-time Status Update via Admin
  async function updateBookingStatusFromAdmin(ref, newStatus) {
    // 1. Update in local state
    const found = state.admin.bookings.find(b => b.ref === ref || `#${b.ref}` === ref);
    if (found) {
      found.status = newStatus;
    }

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
            <p class="text-xs" style="margin-top: 4px;">Click "+ Add Customer" to register a client or VIP passenger account.</p>
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
                <strong style="color: var(--color-navy); display: block;">${u.name}</strong>
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
              <option value="Standard" ${u.tier === 'Standard' ? 'selected' : ''}>Standard</option>
              <option value="Gold VIP" ${u.tier === 'Gold VIP' ? 'selected' : ''}>Gold VIP 👑</option>
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

            <div style="font-size: 0.82rem; color: #475569; margin-bottom: 14px; background: #f8fafc; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--color-border);">
              <strong>Chauffeur:</strong> <span>${car.driver || 'Unassigned (Pool Vehicle)'}</span>
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

  // Change Driver Vehicle pairing directly
  function changeDriverCar(driverId, newCar) {
    const drv = state.admin.drivers.find(d => d.id === driverId);
    if (!drv) return;
    drv.car = newCar;
    saveAdminDrivers();
    renderAdminDrivers();
    showToast(`Assigned ${newCar || 'Relief vehicle'} to ${drv.name}.`);
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
    populateAdminModalDropdowns();
    showToast(`Vehicle ${plate} successfully added to fleet.`);
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
    populateAdminModalDropdowns();
    showToast(`Chauffeur ${name} registered with badge ${badge}.`);
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

    // Add to local admin list at front
    state.admin.bookings.unshift(bookingRecord);

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
    const sql = `-- Supabase SQL Schema for Jo's Rural Cars Admin & Dispatch
CREATE TABLE IF NOT EXISTS public.drivers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  badge TEXT NOT NULL,
  assigned_car TEXT,
  status TEXT DEFAULT 'On Duty',
  rating NUMERIC DEFAULT 5.0,
  rides INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vehicles (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  plate TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  base_price NUMERIC DEFAULT 45,
  passengers INT DEFAULT 3,
  luggage INT DEFAULT 2,
  driver_name TEXT,
  status TEXT DEFAULT 'Available',
  img TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS assigned_driver TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS flight_number TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS special_requests JSONB;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS admin_notes TEXT;
`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(sql).then(() => {
        showToast('Supabase SQL migration code copied to clipboard!');
      }).catch(() => {
        showToast('SQL schema ready. See console log.');
        console.log(sql);
      });
    } else {
      console.log(sql);
      showToast('SQL schema logged to browser developer console.');
    }
  }

  // Initialize App
  function init() {
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
      const hash = window.location.hash.replace('#', '') || 'home';
      if (['home', 'airports', 'select-vehicle', 'fleet', 'passenger-details', 'payment', 'dashboard', 'contact', 'admin'].includes(hash)) {
        navigateTo(hash);
        if (hash === 'dashboard') {
          loadDashboardFromSupabase();
        } else if (hash === 'admin') {
          loadAdminDashboard();
        }
      }
    });

    // Check initial hash
    const initialHash = window.location.hash.replace('#', '') || 'home';
    navigateTo(initialHash);

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
    focusBookingWidget,
    handleHeroSearch,
    quickSelectAirport,
    bookAirportTransfer,
    filterAirports,
    selectVehicle,
    confirmVehicleSelection,
    selectVehicleAndProceed,
    toggleRequestChip,
    handlePassengerSubmit,
    handlePaymentSubmit,
    closeSuccessModal,
    goToDashboardAfterBooking,
    rebookTrip,
    rebookLastTrip,
    showDashboardTab,
    closeProfileModal,
    closePaymentsModal,
    viewReceipt,
    closeReceiptModal,
    showManageTripModal,
    closeManageTripModal,
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
    // Admin & Dispatch Public API
    loadAdminDashboard,
    updateAdminKpis,
    switchAdminTab,
    renderAdminBookings,
    filterAdminBookings,
    searchAdminBookings,
    updateBookingStatusFromAdmin,
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
