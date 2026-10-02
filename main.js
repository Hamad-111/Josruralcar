/**
 * JO'S RURAL CARS - MAIN APPLICATION LOGIC
 * High-performance, reactive single-page app with full booking workflow & customer dashboard
 */
import { supabase, checkSupabaseHealth, fetchBookings, insertBooking } from './supabase.js';

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
      'contact': 'viewContact'
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
        const fare = b.amount || 75;

        return `
          <tr>
            <td><strong>${ref}</strong></td>
            <td>${vName}</td>
            <td>${b.pickup || ''}</td>
            <td>${b.dropoff || ''}</td>
            <td>${formatDateDisplay(b.date)}, ${b.time || ''}</td>
            <td><span class="badge-status badge-${statusClass}">${b.status || 'Confirmed'}</span></td>
            <td>
              <button class="btn btn-navy btn-xs" onclick="App.rebookTrip('${pickupEscaped}', '${dropoffEscaped}', ${fare})">Rebook</button>
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

  function showDashboardTab(tabName) {
    showToast(`Switched to ${capitalize(tabName)} tab`);
  }

  function showManageTripModal() {
    showToast('Your driver Dave M. is confirmed. Contact: +44 7700 900123');
  }

  function openLiveSupport() {
    showToast('Connecting you with 24/7 UK Dispatch Support...');
  }

  function showSavedRoutes() {
    showToast('Showing your 3 saved executive routes.');
  }

  function filterBookingHistory(term) {
    const rows = document.querySelectorAll('#dashTableBody tr');
    const q = term.toLowerCase().trim();
    rows.forEach(r => {
      const text = r.textContent.toLowerCase();
      r.style.display = text.includes(q) ? '' : 'none';
    });
  }

  function showAllBookings() {
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
      if (['home', 'airports', 'select-vehicle', 'fleet', 'passenger-details', 'payment', 'dashboard', 'contact'].includes(hash)) {
        navigateTo(hash);
        if (hash === 'dashboard') {
          loadDashboardFromSupabase();
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
    showManageTripModal,
    openLiveSupport,
    showSavedRoutes,
    filterBookingHistory,
    showAllBookings,
    toggleAccordion,
    handleContactSubmit,
    createAccountMock,
    guestCheckoutMock,
    showToast,
    loadDashboardFromSupabase,
    checkSupabaseHealth
  };
})();

window.App = App;
