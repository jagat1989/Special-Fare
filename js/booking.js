/* ============================================================
   FLIGHT BOOKING ENGINE — BOOKING FLOW CONTROLLER
   Multi-step booking: Review → Passengers → Add-ons → Payment → Confirmation
   ============================================================ */

const BookingFlow = (() => {

  // ── Application State ──
  const state = {
    currentStep: 1,
    flight: null,
    fareClass: 'economy',
    numPassengers: 1,
    passengers: [],
    contact: { email: '', phone: '' },
    meal: 'no_meal',
    baggage: 'bag_0',
    selectedSeats: [],
    paymentMethod: 'upi',
    fareSummary: null,
    addonTotal: 0,
    totalFare: 0,
    agentMarkup: 0,
    agentCommission: 0,
    confirmedBooking: null,
    seatMapRef: null
  };

  // ── URL Params ──
  const params = Utils.getUrlParams();
  const flightIdParam = params.flightId || null;
  const pnrParam = params.pnr || null;
  const classParam = params.class || 'economy';
  const passengersParam = parseInt(params.passengers || '1', 10);

  // ── Session ──
  const session = Storage.getSession();

  // ─────────────────────────────────────────
  //  INITIALIZATION
  // ─────────────────────────────────────────

  function init() {
    // Hydrate navbar
    renderNavUser();

    // Init navbar scroll effect & hamburger
    Utils.initNavbar();
    Utils.initHamburger();

    // Init payment tabs
    initPaymentTabs();

    if (pnrParam) {
      // View existing booking — jump to step 5
      const booking = Storage.getBooking(pnrParam);
      if (!booking) {
        Utils.showToast('Booking not found for PNR: ' + pnrParam, 'error');
        return;
      }
      state.confirmedBooking = booking;
      // hide stepper
      document.getElementById('booking-stepper').style.display = 'none';
      document.getElementById('page-title').textContent = 'Your Booking';
      document.getElementById('page-subtitle').textContent = 'PNR: ' + booking.pnr;
      renderConfirmation(booking);
      showStep(5);
      return;
    }

    if (!flightIdParam) {
      Utils.showToast('No flight selected. Redirecting...', 'error');
      setTimeout(() => window.location.href = 'index.html', 1500);
      return;
    }

    // Set state from URL params
    state.fareClass = classParam;
    state.numPassengers = Math.max(1, Math.min(9, passengersParam));

    // Load flight
    loadFlight();

    // Real-time synchronization across tabs/windows
    window.addEventListener('storage', function (e) {
      if (['skywings_session_customer', 'skywings_session_agent', 'skywings_session_supplier', 'skywings_session_admin', 'skywings_settings'].includes(e.key)) {
        window.location.reload();
      }
    });
  }

  function renderNavUser() {
    const area = document.getElementById('nav-user-area');
    if (!area) return;
    if (session) {
      let role = '👤 User';
      let dashboardUrl = 'customer-dashboard.html';
      if (session.role === 'admin') {
        role = '🛡️ Admin';
        dashboardUrl = 'admin-dashboard.html';
      } else if (session.role === 'agent') {
        role = '🏢 Agent';
        dashboardUrl = 'agent-dashboard.html';
      } else if (session.role === 'supplier') {
        role = '🔌 Supplier';
        dashboardUrl = 'supplier-dashboard.html';
      }

      area.innerHTML = `
        <span style="font-size:0.875rem;color:var(--text-secondary);margin-right:8px">
          ${role}: <a href="${dashboardUrl}" style="color:var(--text-primary);font-weight:700;text-decoration:none;">${session.name}</a>
        </span>
        <button class="btn btn-sm btn-secondary" onclick="Storage.logout();window.location.href='index.html'">
          Logout
        </button>
      `;
    } else {
      area.innerHTML = `<a href="agent-login.html" class="btn btn-sm btn-secondary">Agent Login</a>`;
    }
  }

  function loadFlight() {
    // We need the flight. Reconstruct from stored search params or search broadly.
    // The flightId encodes date: FL_YYYYMMDD_FlightNum_idx
    const parts = flightIdParam.split('_');
    let date = null;
    let origin = null, destination = null;

    // Try to get from URL search params (from search.html navigation)
    date = params.date || null;
    origin = params.from || null;
    destination = params.to || null;

    // If we have enough info, search
    if (date && origin && destination) {
      const flights = Storage.searchAllFlights(origin, destination, date);
      state.flight = flights.find(f => f.id === flightIdParam) || null;
    }

    // Fallback: try to parse date from flight ID (format: FL_YYYYMMDD_...)
    if (!state.flight && parts.length >= 2 && parts[1] && parts[1].length === 8) {
      const rawDate = parts[1]; // YYYYMMDD
      date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;

      // We need to search all routes — scan all airports
      const airports = FlightData.AIRPORTS;
      outer:
      for (let i = 0; i < airports.length; i++) {
        for (let j = 0; j < airports.length; j++) {
          if (i === j) continue;
          const results = Storage.searchAllFlights(airports[i].code, airports[j].code, date);
          const found = results.find(f => f.id === flightIdParam);
          if (found) {
            state.flight = found;
            break outer;
          }
        }
      }
    }

    if (!state.flight) {
      Utils.showToast('Flight not found. Please search again.', 'error');
      setTimeout(() => window.location.href = 'index.html', 2000);
      return;
    }

    // Validate fare class
    if (!state.flight.classes.includes(state.fareClass)) {
      state.fareClass = state.flight.classes[0];
    }

    // Agent markup
    if (session && session.role === 'agent') {
      state.agentMarkup = Storage.calculateAgentMarkup(session.userId, state.flight);
      const agent = Storage.getAgent(session.userId);
      if (agent) {
        const baseFare = state.flight.prices[state.fareClass] * state.numPassengers;
        state.agentCommission = Math.round(baseFare * agent.commissionRate / 100);
      }
      // Show agent note
      const noteEl = document.getElementById('agent-booking-note');
      const nameEl = document.getElementById('agent-name-note');
      if (noteEl) { noteEl.classList.remove('hidden'); }
      if (nameEl && agent) { nameEl.textContent = agent.agencyName; }
    }

    // Calculate fare summary
    const baseFare = state.flight.prices[state.fareClass] * state.numPassengers;
    state.fareSummary = Utils.calculateFareSummary(baseFare, state.fareClass, state.agentMarkup);
    state.totalFare = state.fareSummary.total;

    // Render step 1
    renderStep1();

    // Pre-populate passenger forms (for later steps)
    buildPassengerForms();

    // Pre-fill contact email if session
    if (session && session.email) {
      const emailEl = document.getElementById('contact-email');
      if (emailEl) emailEl.value = session.email;
    }
  }

  // ─────────────────────────────────────────
  //  STEP 1: Review Flight
  // ─────────────────────────────────────────

  function renderStep1() {
    const f = state.flight;
    const fs = state.fareSummary;

    // Flight card
    const logoEl = document.getElementById('rev-airline-logo');
    if (logoEl) logoEl.textContent = f.airlineLogo;

    setText('rev-airline-name', f.airlineName);
    setText('rev-flight-number', f.flightNumber);
    setText('rev-dep-time', f.departureTime);
    setText('rev-arr-time', f.arrivalTime);
    setText('rev-origin', f.origin);
    setText('rev-destination', f.destination);
    setText('rev-origin-city', f.originAirport ? f.originAirport.city : f.origin);
    setText('rev-dest-city', f.destinationAirport ? f.destinationAirport.city : f.destination);
    setText('rev-duration', Utils.formatDuration(f.duration));
    setText('rev-stops', f.stopText || 'Non-stop');
    setText('rev-date', Utils.formatDateFull(f.date));
    setText('rev-aircraft', f.aircraft || 'A320');
    setText('rev-rating', '⭐ ' + (f.airlineRating || '—'));

    // Fare class badge
    const classBadge = document.getElementById('rev-class-badge');
    if (classBadge) {
      const classMap = { economy: 'badge-info', premium_economy: 'badge-primary', business: 'badge-warning' };
      classBadge.innerHTML = `<span class="badge ${classMap[state.fareClass] || 'badge-neutral'}">${Utils.formatClass(state.fareClass)}</span>`;
    }

    // Fare breakdown table
    setText('fb-pax-label', `(× ${state.numPassengers})`);
    setText('fb-base', Utils.formatCurrency(fs.baseFare));
    setText('fb-gst-pct', fs.gstRate);
    setText('fb-gst', Utils.formatCurrency(fs.taxes));
    setText('fb-conv', Utils.formatCurrency(fs.convenienceFee));
    setText('fb-total', Utils.formatCurrency(fs.total));
    setText('fb-pax-count', state.numPassengers);
    setText('fb-gst-note', `${fs.gstRate}%`);

    if (fs.agentMarkup > 0) {
      const markupRow = document.getElementById('fb-markup-row');
      if (markupRow) markupRow.classList.remove('hidden');
      setText('fb-markup', Utils.formatCurrency(fs.agentMarkup));
    }

    // Sidebar
    const origCity = f.originAirport ? f.originAirport.city : f.origin;
    const destCity = f.destinationAirport ? f.destinationAirport.city : f.destination;
    setText('sb-route', `${f.origin} → ${f.destination}`);
    setText('sb-date', Utils.formatDate(f.date));
    setText('sb-class', Utils.formatClass(state.fareClass).replace(/^[^\s]+\s/, ''));
    setText('sb-pax', state.numPassengers + ' Passenger(s)');
    setText('sb-total', Utils.formatCurrency(fs.total));
  }

  // ─────────────────────────────────────────
  //  STEP 2: Passenger Forms
  // ─────────────────────────────────────────

  function buildPassengerForms() {
    const container = document.getElementById('passenger-forms-container');
    if (!container) return;
    container.innerHTML = '';

    for (let i = 1; i <= state.numPassengers; i++) {
      const block = document.createElement('div');
      block.className = 'passenger-block';
      block.innerHTML = `
        <div class="passenger-block-header">
          <div class="passenger-num-badge">${i}</div>
          <div>
            <div class="font-semibold">Passenger ${i}</div>
            <div class="text-xs" style="color:var(--text-muted)">${i === 1 ? 'Primary Passenger' : 'Additional Passenger'}</div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="p${i}-name">Full Name *</label>
            <input type="text" id="p${i}-name" class="form-control" placeholder="As on travel document" />
            <div class="form-error" id="p${i}-name-error"></div>
          </div>
          <div class="form-group">
            <label class="form-label" for="p${i}-age">Age *</label>
            <input type="number" id="p${i}-age" class="form-control" placeholder="e.g. 28" min="1" max="120" />
            <div class="form-error" id="p${i}-age-error"></div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="p${i}-gender">Gender *</label>
            <select id="p${i}-gender" class="form-control">
              <option value="">— Select —</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <div class="form-error" id="p${i}-gender-error"></div>
          </div>
        </div>
      `;
      container.appendChild(block);
    }

    // Sidebar summary for step 2
    updateStep2Sidebar();
  }


  function updateStep2Sidebar() {
    const f = state.flight;
    if (!f) return;
    setText('sb2-route', `${f.origin} → ${f.destination}`);
    setText('sb2-date', Utils.formatDate(f.date));
    setText('sb2-class', Utils.formatClass(state.fareClass).replace(/^[^\s]+\s/, ''));
    setText('sb2-total', Utils.formatCurrency(state.totalFare));
  }

  function validatePassengerForms() {
    let valid = true;
    const passengers = [];

    for (let i = 1; i <= state.numPassengers; i++) {
      const name = getVal(`p${i}-name`).trim();
      const age = parseInt(getVal(`p${i}-age`), 10);
      const gender = getVal(`p${i}-gender`);

      // Validate name
      clearError(`p${i}-name-error`);
      if (!name || name.length < 2) {
        showError(`p${i}-name-error`, 'Please enter a valid full name.');
        valid = false;
      } else if (!/^[a-zA-Z\s]+$/.test(name)) {
        showError(`p${i}-name-error`, 'Name should contain only letters and spaces.');
        valid = false;
      }

      // Validate age
      clearError(`p${i}-age-error`);
      if (isNaN(age) || age < 1 || age > 120) {
        showError(`p${i}-age-error`, 'Please enter a valid age (1-120).');
        valid = false;
      }

      // Validate gender
      clearError(`p${i}-gender-error`);
      if (!gender) {
        showError(`p${i}-gender-error`, 'Please select a gender.');
        valid = false;
      }

      passengers.push({ name, age, gender });
    }

    // Validate contact
    const email = getVal('contact-email').trim();
    const phone = getVal('contact-phone').trim();

    clearError('contact-email-error');
    clearError('contact-phone-error');

    const emailEl = document.getElementById('contact-email');
    const phoneEl = document.getElementById('contact-phone');

    if (!email || !Utils.validateEmail(email)) {
      if (emailEl) emailEl.classList.add('error');
      Utils.showToast('Please enter a valid email address.', 'error');
      valid = false;
    } else {
      if (emailEl) emailEl.classList.remove('error');
    }

    if (!phone || !Utils.validatePhone(phone)) {
      if (phoneEl) phoneEl.classList.add('error');
      Utils.showToast('Please enter a valid 10-digit mobile number.', 'error');
      valid = false;
    } else {
      if (phoneEl) phoneEl.classList.remove('error');
    }

    if (valid) {
      state.passengers = passengers;
      state.contact = { email, phone };
    }

    return valid;
  }

  // Add-ons step removed — addon/seat functions are no longer used.
  // totalFare is calculated directly from fareSummary in renderStep4.




  // ─────────────────────────────────────────
  //  STEP 4: Payment
  // ─────────────────────────────────────────

  function initPaymentTabs() {
    const tabs = document.querySelectorAll('#payment-tabs .tab-item');
    const contents = document.querySelectorAll('#tab-upi, #tab-card, #tab-netbank');
    const methodMap = { 'tab-upi': 'upi', 'tab-card': 'card', 'tab-netbank': 'netbanking' };

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const target = document.getElementById(tab.dataset.tab);
        if (target) target.classList.add('active');
        state.paymentMethod = methodMap[tab.dataset.tab] || 'upi';
      });
    });
  }

  function renderStep4() {
    const f = state.flight;
    if (!f) return;
    const fs = state.fareSummary;
    const mealObj = FlightData.MEALS.find(m => m.id === state.meal) || { name: 'No Meal' };
    const bagObj = FlightData.BAGGAGE.find(b => b.id === state.baggage) || { name: 'None' };

    setText('psb-flight', f.flightNumber);
    setText('psb-route', `${f.origin} → ${f.destination}`);
    setText('psb-date', Utils.formatDate(f.date));
    setText('psb-class', Utils.formatClass(state.fareClass).replace(/^[^\s]+\s/, ''));
    setText('psb-pax', state.numPassengers + ' Passenger(s)');
    setText('psb-meal', mealObj.name);
    setText('psb-bag', bagObj.name);
    setText('psb-base', Utils.formatCurrency(fs.baseFare));
    setText('psb-tax', Utils.formatCurrency(fs.taxes));
    setText('psb-conv', Utils.formatCurrency(fs.convenienceFee));

    const addonEl = document.getElementById('psb-addon');
    if (addonEl) addonEl.textContent = state.addonTotal > 0 ? Utils.formatCurrency(state.addonTotal) : '—';

    if (fs.agentMarkup > 0) {
      const markupRow = document.getElementById('psb-markup-row');
      if (markupRow) markupRow.style.display = 'flex';
      setText('psb-markup', Utils.formatCurrency(fs.agentMarkup));
    }

    setText('psb-total', Utils.formatCurrency(state.totalFare));
    setText('pay-btn-amount', Utils.formatCurrency(state.totalFare));

    // Smepay payment gateway integration indicator
    const settings = Storage.getSettings();
    const isSmepay = settings.smepayEnabled === true;
    let smepayIndicator = document.getElementById('smepay-indicator-alert');

    if (isSmepay) {
      if (!smepayIndicator) {
        smepayIndicator = document.createElement('div');
        smepayIndicator.id = 'smepay-indicator-alert';
        smepayIndicator.className = 'alert alert-info';
        smepayIndicator.style.display = 'flex';
        smepayIndicator.style.alignItems = 'center';
        smepayIndicator.style.gap = '10px';
        smepayIndicator.style.marginBottom = '1.5rem';
        smepayIndicator.style.background = 'rgba(6, 182, 212, 0.1)';
        smepayIndicator.style.borderColor = 'rgba(6, 182, 212, 0.2)';
        smepayIndicator.style.color = '#22d3ee';
        
        const tabsWrap = document.querySelector('.payment-tabs-wrap');
        if (tabsWrap) {
          tabsWrap.parentNode.insertBefore(smepayIndicator, tabsWrap);
        }
      }
      smepayIndicator.innerHTML = `
        <span style="font-size:1.3rem; flex-shrink:0;">💳</span>
        <div style="font-size:0.88rem; line-height:1.4;">
          <strong>Smepay Active:</strong> Payments processed securely via Smepay Gateway in <strong>${settings.smepayMode.toUpperCase()}</strong> mode.<br>
          <span style="font-size:0.75rem; color:rgba(255,255,255,0.6)">Merchant ID: <code>${settings.smepayMerchantId}</code></span>
        </div>
      `;
    } else {
      if (smepayIndicator) smepayIndicator.remove();
    }
  }

  function verifyUPI() {
    const upiId = getVal('upi-id').trim();
    const errEl = document.getElementById('upi-error');
    if (!upiId) {
      if (errEl) errEl.textContent = 'Please enter a UPI ID.';
      return;
    }
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/;
    if (!upiRegex.test(upiId)) {
      if (errEl) errEl.textContent = 'Invalid UPI ID. Example: name@upi, number@ybl';
      return;
    }
    if (errEl) errEl.textContent = '';
    Utils.showToast('✅ UPI ID verified successfully!', 'success');
  }

  function formatCardNumber(input) {
    let value = input.value.replace(/\D/g, '');
    value = value.match(/.{1,4}/g)?.join('  ') || value;
    input.value = value;
  }

  function formatExpiry(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.slice(0, 2) + ' / ' + value.slice(2, 4);
    }
    input.value = value;
  }

  function validatePayment() {
    let valid = true;

    if (state.paymentMethod === 'upi') {
      const upiId = getVal('upi-id').trim();
      const errEl = document.getElementById('upi-error');
      const upiRegex = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/;
      if (!upiId) {
        if (errEl) errEl.textContent = 'Please enter a UPI ID.';
        valid = false;
      } else if (!upiRegex.test(upiId)) {
        if (errEl) errEl.textContent = 'Invalid UPI ID format.';
        valid = false;
      } else {
        if (errEl) errEl.textContent = '';
      }
    }

    if (state.paymentMethod === 'card') {
      const cardNum = getVal('card-number').replace(/\s/g, '');
      const expiry = getVal('card-expiry');
      const cvv = getVal('card-cvv');
      const name = getVal('card-name').trim();

      clearFieldDisplay('card-number-error');
      clearFieldDisplay('card-expiry-error');
      clearFieldDisplay('card-cvv-error');
      clearFieldDisplay('card-name-error');

      if (!cardNum || cardNum.length < 15) {
        showError('card-number-error', 'Enter a valid card number (15-16 digits).');
        valid = false;
      }
      if (!expiry || expiry.replace(/\s\/\s/, '').length < 4) {
        showError('card-expiry-error', 'Enter a valid expiry (MM / YY).');
        valid = false;
      }
      if (!cvv || cvv.length < 3) {
        showError('card-cvv-error', 'Enter a valid CVV (3-4 digits).');
        valid = false;
      }
      if (!name || name.length < 2) {
        showError('card-name-error', 'Please enter the name on your card.');
        valid = false;
      }
    }

    if (state.paymentMethod === 'netbanking') {
      const bank = getVal('bank-select');
      const errEl = document.getElementById('bank-error');
      if (!bank) {
        if (errEl) errEl.textContent = 'Please select your bank.';
        valid = false;
      } else {
        if (errEl) errEl.textContent = '';
      }
    }

    return valid;
  }

  function processPayment() {
    if (!validatePayment()) return;

    const settings = Storage.getSettings();
    const isSmepay = settings.smepayEnabled === true;

    // Show spinner
    const spinner = document.getElementById('payment-spinner');
    if (spinner) {
      spinner.classList.add('active');
      const textEl = spinner.querySelector('p');
      if (textEl) {
        if (isSmepay) {
          textEl.textContent = `Connecting to Smepay Gateway [${settings.smepayMode.toUpperCase()}]...`;
        } else {
          textEl.textContent = 'Processing payment...';
        }
      }
    }

    // Simulate 2.5 second payment processing
    setTimeout(() => {
      if (spinner) {
        spinner.classList.remove('active');
        const textEl = spinner.querySelector('p');
        if (textEl) textEl.textContent = 'Processing payment...';
      }
      createBooking();
    }, 2500);
  }

  // ─────────────────────────────────────────
  //  Create Booking
  // ─────────────────────────────────────────

  function createBooking() {
    const f = state.flight;
    const fs = state.fareSummary;

    const userId = (session && session.userId) ? session.userId : 'guest_' + Date.now();
    const userType = (session && session.role) ? session.role : 'customer';
    const agentId = (session && session.role === 'agent') ? session.userId : null;

    const bookingData = {
      userId,
      userType,
      agentId,
      flightNumber: f.flightNumber,
      airlineCode: f.airlineCode,
      airlineName: f.airlineName,
      origin: f.origin,
      destination: f.destination,
      date: f.date,
      departureTime: f.departureTime,
      arrivalTime: f.arrivalTime,
      fareClass: state.fareClass,
      passengers: state.passengers,
      baseFare: fs.baseFare,
      taxes: fs.taxes,
      convenienceFee: fs.convenienceFee,
      agentMarkup: fs.agentMarkup,
      agentCommission: state.agentCommission,
      totalFare: state.totalFare,
      paymentMethod: state.paymentMethod,
      meal: state.meal,
      extraBaggage: state.baggage,
      seatNumbers: state.selectedSeats
    };

    const result = Storage.createBooking(bookingData);

    if (!result.success) {
      Utils.showToast('Booking failed: ' + (result.error || 'Unknown error'), 'error');
      return;
    }

    state.confirmedBooking = result.booking;
    Utils.showToast('🎉 Booking confirmed! PNR: ' + result.booking.pnr, 'success', 6000);
    renderConfirmation(result.booking);
    goToStep(5);

    // Send confirmation email
    try {
      const ticketUrl = `${window.location.origin}${window.location.pathname}?pnr=${result.booking.pnr}`;
      const pnames = result.booking.passengers.map(p => {
        let seatInfo = p.seat ? `, Seat: ${p.seat}` : '';
        return `${p.name} (Age: ${p.age}, Gender: ${p.gender}${seatInfo})`;
      }).join('<br>');

      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="background: linear-gradient(135deg, #0ea5e9, #2563eb); color: white; padding: 24px; text-align: center;">
            <h2 style="margin: 0; font-size: 24px;">Flight Booking Confirmed!</h2>
            <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Booking Confirmed — PNR: <strong>${result.booking.pnr}</strong></p>
          </div>
          <div style="padding: 24px; color: #333; line-height: 1.6;">
            <p>Dear Customer,</p>
            <p>Thank you for choosing Special Fare. Your flight booking is confirmed! Here are your flight details:</p>
            
            <h4 style="border-bottom: 2px solid #0ea5e9; padding-bottom: 6px; color: #1e3a8a; margin-top: 24px; margin-bottom: 10px;">✈ FLIGHT INFORMATION</h4>
            <table cellpadding="6" cellspacing="0" style="width: 100%; font-size: 14px;">
              <tr style="background: #f9fafb;"><td><strong>Flight Number</strong></td><td>${result.booking.airlineName} (${result.booking.flightNumber})</td></tr>
              <tr><td><strong>Route</strong></td><td>${result.booking.origin} → ${result.booking.destination}</td></tr>
              <tr style="background: #f9fafb;"><td><strong>Date</strong></td><td>${Utils.formatDate(result.booking.date)}</td></tr>
              <tr><td><strong>Departure</strong></td><td>${result.booking.departureTime}</td></tr>
              <tr style="background: #f9fafb;"><td><strong>Arrival</strong></td><td>${result.booking.arrivalTime}</td></tr>
              <tr><td><strong>Class</strong></td><td>${Utils.formatClass(result.booking.fareClass)}</td></tr>
            </table>
            
            <h4 style="border-bottom: 2px solid #0ea5e9; padding-bottom: 6px; color: #1e3a8a; margin-top: 24px; margin-bottom: 10px;">👥 PASSENGERS</h4>
            <div style="font-size: 14px; background: #f9fafb; padding: 12px; border-radius: 6px; border-left: 4px solid #0ea5e9; line-height: 1.8;">
              ${pnames}
            </div>
            
            <h4 style="border-bottom: 2px solid #0ea5e9; padding-bottom: 6px; color: #1e3a8a; margin-top: 24px; margin-bottom: 10px;">💳 FARE SUMMARY</h4>
            <table cellpadding="6" cellspacing="0" style="width: 100%; font-size: 14px;">
              <tr style="background: #f9fafb;"><td>Base Fare</td><td style="text-align: right;">${Utils.formatCurrency(result.booking.baseFare)}</td></tr>
              <tr><td>Taxes & GST</td><td style="text-align: right;">${Utils.formatCurrency(result.booking.taxes)}</td></tr>
              <tr style="background: #f9fafb;"><td>Convenience Fee</td><td style="text-align: right;">${Utils.formatCurrency(result.booking.convenienceFee)}</td></tr>
              ${result.booking.agentMarkup ? `<tr><td>Agent Markup</td><td style="text-align: right;">${Utils.formatCurrency(result.booking.agentMarkup)}</td></tr>` : ''}
              <tr style="font-weight: bold; border-top: 2px solid #0ea5e9;">
                <td style="padding-top: 10px;">Total Paid</td>
                <td style="text-align: right; color: #2563eb; font-size: 16px; padding-top: 10px;">${Utils.formatCurrency(result.booking.totalFare)}</td>
              </tr>
            </table>
            
            <div style="margin-top: 30px; text-align: center;">
              <a href="${ticketUrl}" style="background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View / Print E-Ticket</a>
            </div>
          </div>
          <div style="background: #f3f4f6; text-align: center; padding: 16px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
            © ${new Date().getFullYear()} Special Fare. All rights reserved.<br>
            For assistance, email us at <a href="mailto:info@specialfare.in" style="color: #0ea5e9; text-decoration: none;">info@specialfare.in</a>
          </div>
        </div>
      `;

      // 1. Send email to B2C customer/passenger contact email
      if (state.contact && state.contact.email) {
        Utils.sendEmail({
          to: state.contact.email,
          subject: `Booking Confirmed - PNR: ${result.booking.pnr} - Special Fare`,
          body: emailBody
        });
      }

      // 2. Send email copy to B2B Agent if booked by an agent
      if (result.booking.agentId) {
        const agent = Storage.getAgent(result.booking.agentId);
        if (agent && agent.email && (!state.contact || agent.email !== state.contact.email)) {
          Utils.sendEmail({
            to: agent.email,
            subject: `B2B Booking Confirmed - PNR: ${result.booking.pnr} - Special Fare`,
            body: emailBody.replace('Dear Customer', `Dear Partner (${agent.agencyName})`)
          });
        }
      }
    } catch (e) {
      console.error('Failed to send booking confirmation email:', e);
    }
  }

  // ─────────────────────────────────────────
  //  STEP 5: Confirmation
  // ─────────────────────────────────────────

  function renderConfirmation(booking) {
    const f = state.flight || {};
    const fs = state.fareSummary || {};
    const originAirport = f.originAirport || FlightData.getAirport(booking.origin) || {};
    const destAirport = f.destinationAirport || FlightData.getAirport(booking.destination) || {};

    // PNR
    setText('conf-pnr', booking.pnr);
    setText('tk-pnr',   booking.pnr);

    // Issued date
    const issuedDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    setText('tk-issued-date', issuedDate);

    // Airline info
    const airlineLogo = f.airlineLogo || booking.airlineLogo || '✈';
    setText('tk-airline-logo', airlineLogo);
    setText('tk-airline', booking.airlineName || '—');
    setText('tk-flight-num', booking.flightNumber || '—');

    // Class pill
    const classMap = { economy: 'Economy', premium_economy: 'Prem. Economy', business: 'Business' };
    const className = classMap[booking.fareClass] || booking.fareClass || 'Economy';
    setText('tk-class-pill', className);
    setText('tk-class', className);

    // Route
    setText('tk-origin',        booking.origin || '—');
    setText('tk-origin-city',   originAirport.city || booking.origin || '—');
    setText('tk-origin-airport', originAirport.name || '—');
    setText('tk-dep-time',      booking.departureTime || '—');

    setText('tk-dest',         booking.destination || '—');
    setText('tk-dest-city',    destAirport.city || booking.destination || '—');
    setText('tk-dest-airport', destAirport.name || '—');
    setText('tk-arr-time',     booking.arrivalTime || '—');

    const duration = (f && f.duration) ? Utils.formatDuration(f.duration) : '—';
    setText('tk-duration', duration);
    setText('tk-stops', (f && f.stops === 0) ? 'Non-stop ✈' : (f.stopText || 'Non-stop ✈'));

    // Details grid
    setText('tk-date',      Utils.formatDateFull ? Utils.formatDateFull(booking.date) : Utils.formatDate(booking.date));
    setText('tk-arr-date-placeholder', Utils.formatDateFull ? Utils.formatDateFull(booking.date) : Utils.formatDate(booking.date));
    setText('tk-pax-count', (booking.passengers ? booking.passengers.length : 1) + ' Passenger(s)');

    // Fare breakdown
    setText('tk-base-fare', Utils.formatCurrency(fs.baseFare || booking.baseFare || 0));
    setText('tk-taxes',     Utils.formatCurrency((fs.taxes || booking.taxes || 0) + (fs.convenienceFee || booking.convenienceFee || 0)));
    setText('tk-total',     Utils.formatCurrency(booking.totalFare || 0));

    // Terminal numbers mapping
    const getTerminal = (code) => {
      let terminals = { DEL: 'Terminal 3', BOM: 'Terminal 2', BLR: 'Terminal 2', HYD: 'Main Terminal', CCU: 'Terminal 1', MAA: 'Terminal 1' };
      return terminals[code] || 'Terminal 1';
    };
    setText('tk-origin-terminal', getTerminal(booking.origin));
    setText('tk-dest-terminal', getTerminal(booking.destination));

    // Seat number selection fallback
    let seatText = (booking.seatNumbers && booking.seatNumbers.length > 0) ? booking.seatNumbers.join(', ') : '18K';
    setText('tk-seat-info', seatText);

    // Class letter codes
    const classCodeMap = { economy: 'M', premium_economy: 'PE', business: 'J' };
    const classLetter = classCodeMap[booking.fareClass] || 'M';
    setText('tk-class-code', `${className} (${classLetter})`);

    // Payment methods mapping
    const payMethodMap = {
      upi: 'UPI (Instant Transfer)',
      card: 'Visa Credit Card (ending in *4321)',
      netbanking: 'Net Banking'
    };
    setText('tk-payment-method', payMethodMap[booking.paymentMethod] || 'Visa Credit Card (ending in *4321)');

    // Dynamic timing calculator
    let depTimeStr = booking.departureTime || '02:15 AM';
    let depHr = 2, depMin = 15;
    let timeMatch = depTimeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (timeMatch) {
      depHr = parseInt(timeMatch[1], 10);
      depMin = parseInt(timeMatch[2], 10);
      if (timeMatch[3] && timeMatch[3].toUpperCase() === 'PM' && depHr < 12) depHr += 12;
      if (timeMatch[3] && timeMatch[3].toUpperCase() === 'AM' && depHr === 12) depHr = 0;
    }
    
    let depDate = new Date(booking.date + 'T00:00:00');
    if (isNaN(depDate.getTime())) {
      depDate = new Date();
    }
    depDate.setHours(depHr, depMin, 0, 0);
    
    // Check-in opens 3 hours prior
    let checkinOpen = new Date(depDate.getTime() - 3 * 60 * 60 * 1000);
    // Security closes 1 hour prior
    let securityClose = new Date(depDate.getTime() - 1 * 60 * 60 * 1000);
    // Boarding closes 30 minutes prior
    let gateClose = new Date(depDate.getTime() - 30 * 60 * 1000);
    
    const formatTime12 = (d) => {
      let h = d.getHours();
      let m = d.getMinutes();
      let ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12;
      let mStr = m < 10 ? '0' + m : m;
      let hStr = h < 10 ? '0' + h : h;
      return `${hStr}:${mStr} ${ampm}`;
    };
    
    const formatDateShort = (d) => {
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    };
    
    setText('tk-time-checkin', formatTime12(checkinOpen));
    setText('tk-date-checkin', formatDateShort(checkinOpen));
    setText('tk-time-security', formatTime12(securityClose));
    setText('tk-date-security', formatDateShort(securityClose));
    setText('tk-time-gate', formatTime12(gateClose));
    setText('tk-date-gate', formatDateShort(gateClose));

    // Passenger details table rendering
    const paxList = document.getElementById('tk-passenger-list');
    if (paxList && booking.passengers) {
      const hashCode = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(hash);
      };
      
      paxList.innerHTML = `
        <table class="eticket-pax-table">
          <thead>
            <tr>
              <th>Passenger Name</th>
              <th>Baggage Allowance</th>
            </tr>
          </thead>
          <tbody>
            ${booking.passengers.map((p, i) => {
              let allowance = (booking.fareClass === 'business') ? '2 x 32kg (Checked) + 7kg Cabin' : '1 x 25kg (Checked) + 7kg Cabin';
              return `
                <tr>
                  <td><strong>${p.name.toUpperCase()}</strong> (${p.gender || ''}, Age ${p.age || '—'})</td>
                  <td>${allowance}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }

    // Agent commission note
    if (session && session.role === 'agent' && booking.agentCommission > 0) {
      Utils.showToast(`💰 Commission of ${Utils.formatCurrency(booking.agentCommission)} credited to your wallet!`, 'success', 7000);
    }
  }

  function printTicket() {
    // Ensure the confirmation step is visible before printing
    document.querySelectorAll('.step-content').forEach(el => el.style.display = '');
    const step5 = document.getElementById('step-5');
    if (step5) step5.style.display = 'block';
    setTimeout(() => window.print(), 100);
  }


  function copyPNR() {
    const pnr = document.getElementById('conf-pnr');
    if (pnr) {
      Utils.copyToClipboard(pnr.textContent, '✅ PNR copied to clipboard!');
    }
  }

  // ─────────────────────────────────────────
  //  STEP NAVIGATION
  // ─────────────────────────────────────────

  function goToStep(stepNum) {
    // Validate before advancing
    if (stepNum > state.currentStep) {
      if (!canAdvanceTo(stepNum)) return;
    }

    // Update step content
    document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`step-${stepNum}`);
    if (target) {
      target.classList.add('active');
      // Scroll to top of booking wrapper
      document.querySelector('.booking-wrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Update stepper indicators
    updateStepIndicators(stepNum);

    state.currentStep = stepNum;

    // Step-specific actions
    if (stepNum === 4) {
      renderStep4();
    }
  }

  function canAdvanceTo(stepNum) {
    // No validation when going back (stepNum < currentStep handled by buttons)
    if (stepNum === 3) {
      // Coming from step 2
      return true; // will be validated on button click
    }
    return true;
  }

  function validateAndNext(fromStep) {
    if (fromStep === 2) {
      if (!validatePassengerForms()) return;
      goToStep(4);
    }
  }

  function updateStepIndicators(activeStep) {
    // Visual steps: 1=Review, 2=Passengers, 4=Payment, 5=Confirmation
    const visualSteps = [1, 2, 4, 5];
    visualSteps.forEach((realStep, visualIndex) => {
      const visualNum = visualIndex + 1;
      const stepEl = document.getElementById(`step-ind-${realStep}`);
      const numEl = stepEl ? stepEl.querySelector('.step-number') : null;
      if (!stepEl) return;

      stepEl.classList.remove('active', 'completed');

      if (realStep < activeStep) {
        stepEl.classList.add('completed');
        if (numEl) numEl.textContent = '✓';
      } else if (realStep === activeStep) {
        stepEl.classList.add('active');
        if (numEl) numEl.textContent = visualNum;
      } else {
        if (numEl) numEl.textContent = visualNum;
      }
    });

    // Connectors: conn-1 (1→2), conn-2 (2→4), conn-3 (4→5)
    const connMap = { 1: 1, 2: 2, 4: 3 };
    [1, 2, 4].forEach(realStep => {
      const connNum = connMap[realStep];
      const conn = document.getElementById(`conn-${connNum}`);
      if (conn) {
        conn.classList.remove('completed', 'active');
        // Find next step in visual order
        const visualSteps2 = [1, 2, 4, 5];
        const currentIdx = visualSteps2.indexOf(realStep);
        const nextReal = visualSteps2[currentIdx + 1];
        if (nextReal && nextReal <= activeStep) {
          conn.classList.add('completed');
        }
      }
    });
  }

  // ─────────────────────────────────────────
  //  UTILITIES
  // ─────────────────────────────────────────

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
  }

  function clearError(id) {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  }

  function clearFieldDisplay(id) {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  }

  // ─────────────────────────────────────────
  //  PUBLIC API
  // ─────────────────────────────────────────

  return {
    init,
    goToStep,
    validateAndNext,
    verifyUPI,
    formatCardNumber,
    formatExpiry,
    processPayment,
    copyPNR,
    printTicket,
    state
  };

})();

// Auto-init
document.addEventListener('DOMContentLoaded', () => BookingFlow.init());


