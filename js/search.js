/* ============================================================
   FLIGHT SEARCH RESULTS — search.js
   Handles filtering, sorting, rendering, and booking flow
   ============================================================ */

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────
  let allFlights = [];          // raw results from Storage
  let filteredFlights = [];     // after filters applied
  let displayedFlights = [];    // after sort applied

  let currentSort = 'price';
  let sortAsc = true;
  let quickFilter = 'cheapest'; // cheapest | fastest | best

  let activeTimeSlots = new Set();     // empty = all allowed
  let activeAirlines = new Set();      // populated on load, empty = all
  let selectedFareClasses = new Set(['economy', 'premium_economy', 'business']);

  let urlParams = {};
  let agentSession = null;
  let agentMarkupRules = [];

  // Cheapest / Fastest / Best indices for badges
  let cheapestFlightId = null;
  let fastestFlightId = null;
  let bestFlightId = null;

  // ── Init ───────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    Utils.initNavbar();
    Utils.initHamburger();

    urlParams = Utils.getUrlParams();
    agentSession = Storage.getSession();

    // Set navbar session
    renderNavSession();

    // Show agent notice if agent logged in
    if (agentSession && agentSession.role === 'agent') {
      document.getElementById('agent-notice').classList.remove('hidden');
      agentMarkupRules = Storage.getMarkupRules(agentSession.userId) || [];
    }

    // Populate summary bar
    updateSummaryBar();

    // Set modify form defaults
    setupModifyForm();

    // Setup autocomplete on modify form
    setupAutocomplete('mod-from', 'mod-from-dropdown');
    setupAutocomplete('mod-to', 'mod-to-dropdown');

    // Set date constraints
    const modDate = document.getElementById('mod-date');
    modDate.min = Utils.getMinDate();
    modDate.max = Utils.getMaxDate();

    // Simulated loading effect (400 ms)
    setTimeout(() => {
      loadFlights();
    }, 400);
  }

  // ── Render navbar session ──────────────────────────────────
  function renderNavSession() {
    const el = document.getElementById('nav-session-area');
    if (!el) return;
    if (agentSession) {
      let role = '👤 User';
      let dashboardUrl = '#';
      if (agentSession.role === 'admin') {
        role = '🛡️ Admin';
        dashboardUrl = 'admin-dashboard.html';
      } else if (agentSession.role === 'agent') {
        role = '🏢 Agent';
        dashboardUrl = 'agent-dashboard.html';
      } else if (agentSession.role === 'supplier') {
        role = '🔌 Supplier';
        dashboardUrl = 'supplier-dashboard.html';
      }
      
      el.innerHTML = `
        <span style="font-size:0.82rem;color:var(--text-muted);">${role}: <a href="${dashboardUrl}" style="color:var(--text-secondary);font-weight:700;text-decoration:none;">${agentSession.name}</a></span>
        <button class="btn btn-sm btn-secondary" onclick="doLogout()" style="margin-left:8px;">Sign out</button>
      `;
    } else {
      el.innerHTML = `<a href="agent-login.html" class="btn btn-sm btn-secondary">Agent Login</a>`;
    }
  }

  window.doLogout = function () {
    Storage.logout();
    window.location.href = 'index.html';
  };

  // ── Update Summary Bar ─────────────────────────────────────
  function updateSummaryBar() {
    const from = urlParams.from || '—';
    const to = urlParams.to || '—';
    const date = urlParams.date || '';
    const pax = urlParams.passengers || '1';
    const cls = urlParams.class || 'economy';

    document.getElementById('sum-from').textContent = from;
    document.getElementById('sum-to').textContent = to;
    document.getElementById('sum-date').textContent = date ? Utils.formatDate(date) : '—';
    document.getElementById('sum-pax').textContent = pax;
    document.getElementById('sum-class').textContent = formatClassName(cls);
  }

  function formatClassName(cls) {
    const map = {
      economy: 'Economy',
      premium_economy: 'Premium Economy',
      business: 'Business'
    };
    return map[cls] || cls;
  }

  // ── Setup Modify Form ──────────────────────────────────────
  function setupModifyForm() {
    const fromInput = document.getElementById('mod-from');
    const toInput = document.getElementById('mod-to');
    const dateInput = document.getElementById('mod-date');
    const paxSelect = document.getElementById('mod-passengers');
    const classSelect = document.getElementById('mod-class');

    if (urlParams.from) {
      const ap = FlightData.getAirport(urlParams.from);
      fromInput.value = ap ? `${ap.city} (${ap.code})` : urlParams.from;
      fromInput.dataset.code = urlParams.from;
    }
    if (urlParams.to) {
      const ap = FlightData.getAirport(urlParams.to);
      toInput.value = ap ? `${ap.city} (${ap.code})` : urlParams.to;
      toInput.dataset.code = urlParams.to;
    }
    if (urlParams.date) dateInput.value = urlParams.date;
    if (urlParams.passengers) paxSelect.value = urlParams.passengers;
    if (urlParams.class) classSelect.value = urlParams.class;
  }

  // ── Toggle Modify Panel ────────────────────────────────────
  window.toggleModifySearch = function () {
    const panel = document.getElementById('modify-search-panel');
    const btn = document.getElementById('modify-toggle-btn');
    if (panel.classList.contains('open')) {
      panel.classList.remove('open');
      btn.textContent = '✏️ Modify Search';
    } else {
      panel.classList.add('open');
      btn.textContent = '✕ Close';
    }
  };

  // ── Modify Search Submit ───────────────────────────────────
  window.modifySearch = function () {
    const fromInput = document.getElementById('mod-from');
    const toInput = document.getElementById('mod-to');
    const date = document.getElementById('mod-date').value;
    const pax = document.getElementById('mod-passengers').value;
    const cls = document.getElementById('mod-class').value;

    const from = fromInput.dataset.code || fromInput.value.trim().split('(')[1]?.replace(')', '').trim() || fromInput.value.trim().toUpperCase();
    const to = toInput.dataset.code || toInput.value.trim().split('(')[1]?.replace(')', '').trim() || toInput.value.trim().toUpperCase();

    if (!from || !to) {
      Utils.showToast('Please enter valid origin and destination.', 'warning');
      return;
    }
    if (!date) {
      Utils.showToast('Please select a date.', 'warning');
      return;
    }
    if (from === to) {
      Utils.showToast('Origin and destination cannot be the same.', 'warning');
      return;
    }

    window.location.href = `search.html?from=${from}&to=${to}&date=${date}&passengers=${pax}&class=${cls}`;
  };

  // ── Load Flights ───────────────────────────────────────────
  function loadFlights() {
    const from = urlParams.from;
    const to = urlParams.to;
    const date = urlParams.date;

    if (!from || !to || !date) {
      showNoResults('Missing search parameters. Please start a new search.');
      hideSkeleton();
      return;
    }

    allFlights = Storage.searchAllFlights(from, to, date) || [];

    hideSkeleton();

    if (allFlights.length === 0) {
      showNoResults();
      document.getElementById('sum-count').textContent = '0 flights found';
      updateQuickFilterTabs([]);
      return;
    }

    // Sort by price initially for cheapest/fastest detection
    const sorted = [...allFlights].sort((a, b) => getPrice(a) - getPrice(b));
    cheapestFlightId = sorted[0]?.id;

    const sortedDur = [...allFlights].sort((a, b) => a.duration - b.duration);
    fastestFlightId = sortedDur[0]?.id;

    // Best value = best price/duration ratio (lower = better)
    const sortedBest = [...allFlights].sort((a, b) => {
      const ratioA = getPrice(a) / a.duration;
      const ratioB = getPrice(b) / b.duration;
      return ratioA - ratioB;
    });
    bestFlightId = sortedBest[0]?.id;

    // Build airline filter list
    buildAirlineFilters();

    // Set price slider range
    const prices = allFlights.map(f => getPrice(f));
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    document.getElementById('price-min-slider').min = minP;
    document.getElementById('price-min-slider').max = maxP;
    document.getElementById('price-min-slider').value = minP;
    document.getElementById('price-max-slider').min = minP;
    document.getElementById('price-max-slider').max = maxP;
    document.getElementById('price-max-slider').value = maxP;
    document.getElementById('price-min-display').textContent = Utils.formatCurrency(minP);
    document.getElementById('price-max-display').textContent = Utils.formatCurrency(maxP);

    // Set duration slider max
    const maxDur = Math.max(...allFlights.map(f => f.duration));
    document.getElementById('duration-slider').max = maxDur + 30;
    document.getElementById('duration-slider').value = maxDur + 30;
    document.getElementById('duration-display').textContent = 'Any';

    updateQuickFilterTabs(allFlights);
    applyFilters();

    Utils.showToast(`Found ${allFlights.length} flight${allFlights.length !== 1 ? 's' : ''} on this route`, 'success');
  }

  // ── Get price for a flight (considering selected class) ────
  function getPrice(flight) {
    const preferredClass = urlParams.class || 'economy';
    const classes = ['economy', 'premium_economy', 'business'];
    let price = null;

    // Try preferred class first
    if (flight.prices[preferredClass] !== undefined) {
      price = flight.prices[preferredClass];
    } else {
      // Fallback to any available class
      for (const cls of classes) {
        if (flight.prices[cls] !== undefined) {
          price = flight.prices[cls];
          break;
        }
      }
    }

    if (price === null) price = 9999999;

    // Apply agent markup if applicable
    if (agentSession && agentSession.role === 'agent') {
      const markup = Storage.calculateAgentMarkup(agentSession.userId, flight);
      price += (markup || 0);
    }

    return price;
  }

  // ── Build Airline Filter Checkboxes ───────────────────────
  function buildAirlineFilters() {
    const airlineCounts = {};
    allFlights.forEach(f => {
      airlineCounts[f.airlineCode] = airlineCounts[f.airlineCode] || { name: f.airlineName, logo: f.airlineLogo, count: 0 };
      airlineCounts[f.airlineCode].count++;
    });

    const container = document.getElementById('airline-filter-list');
    container.innerHTML = '';

    Object.entries(airlineCounts).forEach(([code, info]) => {
      activeAirlines.add(code);
      const label = document.createElement('label');
      label.className = 'form-check';
      label.style.justifyContent = 'space-between';
      label.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
          <input type="checkbox" checked data-airline="${code}" onchange="toggleAirlineFilter(this)" />
          <span>${info.logo} ${info.name}</span>
        </div>
        <span style="font-size:0.75rem;color:var(--text-muted);">${info.count}</span>
      `;
      container.appendChild(label);
    });
  }

  // ── Airline Filter Toggle ──────────────────────────────────
  window.toggleAirlineFilter = function (checkbox) {
    const code = checkbox.dataset.airline;
    if (checkbox.checked) {
      activeAirlines.add(code);
    } else {
      activeAirlines.delete(code);
    }
    applyFilters();
  };

  // ── Time Slot Toggle ───────────────────────────────────────
  window.toggleTimeSlot = function (btn) {
    const slot = btn.dataset.slot;
    if (btn.classList.contains('active')) {
      btn.classList.remove('active');
      activeTimeSlots.delete(slot);
    } else {
      btn.classList.add('active');
      activeTimeSlots.add(slot);
    }
    applyFilters();
  };

  function getTimeSlot(time) {
    const [h] = time.split(':').map(Number);
    if (h >= 5 && h < 9) return 'early';
    if (h >= 9 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    return 'evening';
  }

  // ── Price Range Change ─────────────────────────────────────
  window.onPriceRangeChange = function () {
    const minSlider = document.getElementById('price-min-slider');
    const maxSlider = document.getElementById('price-max-slider');
    let minVal = parseInt(minSlider.value);
    let maxVal = parseInt(maxSlider.value);

    if (minVal > maxVal) {
      [minVal, maxVal] = [maxVal, minVal];
    }

    document.getElementById('price-min-display').textContent = Utils.formatCurrency(minVal);
    document.getElementById('price-max-display').textContent = Utils.formatCurrency(maxVal);
    applyFilters();
  };

  // ── Duration Change ────────────────────────────────────────
  window.onDurationChange = function () {
    const val = parseInt(document.getElementById('duration-slider').value);
    const maxPossible = parseInt(document.getElementById('duration-slider').max);
    document.getElementById('duration-display').textContent = val >= maxPossible ? 'Any' : Utils.formatDuration(val);
    applyFilters();
  };

  // ── Apply All Filters ──────────────────────────────────────
  window.applyFilters = function () {
    const minPrice = parseInt(document.getElementById('price-min-slider').value);
    const maxPrice = parseInt(document.getElementById('price-max-slider').value);
    const maxDur = parseInt(document.getElementById('duration-slider').value);
    const maxDurSliderMax = parseInt(document.getElementById('duration-slider').max);

    const stopNonstop = document.getElementById('stop-nonstop').checked;
    const stop1 = document.getElementById('stop-1').checked;

    const classEco = document.getElementById('class-economy').checked;
    const classPremium = document.getElementById('class-premium').checked;
    const classBiz = document.getElementById('class-business').checked;

    selectedFareClasses = new Set();
    if (classEco) selectedFareClasses.add('economy');
    if (classPremium) selectedFareClasses.add('premium_economy');
    if (classBiz) selectedFareClasses.add('business');

    filteredFlights = allFlights.filter(f => {
      // Airlines
      if (activeAirlines.size > 0 && !activeAirlines.has(f.airlineCode)) return false;

      // Stops
      if (f.stops === 0 && !stopNonstop) return false;
      if (f.stops >= 1 && !stop1) return false;

      // Departure time
      if (activeTimeSlots.size > 0) {
        const slot = getTimeSlot(f.departureTime);
        if (!activeTimeSlots.has(slot)) return false;
      }

      // Duration
      if (maxDur < maxDurSliderMax && f.duration > maxDur) return false;

      // Price
      const price = getPrice(f);
      if (price < minPrice || price > maxPrice) return false;

      // Fare class availability
      const hasAnyClass = [...selectedFareClasses].some(cls => f.classes.includes(cls) && f.prices[cls] !== undefined);
      if (!hasAnyClass) return false;

      return true;
    });

    // Update URL params with filter state (for shareability)
    const url = new URL(window.location.href);
    url.searchParams.set('minPrice', minPrice);
    url.searchParams.set('maxPrice', maxPrice);
    window.history.replaceState({}, '', url.toString());

    applySort();
  };

  // ── Apply Sort ─────────────────────────────────────────────
  function applySort() {
    displayedFlights = [...filteredFlights];

    displayedFlights.sort((a, b) => {
      let comparison = 0;
      switch (currentSort) {
        case 'price':
          comparison = getPrice(a) - getPrice(b);
          break;
        case 'duration':
          comparison = a.duration - b.duration;
          break;
        case 'departure':
          comparison = a.departureTime.localeCompare(b.departureTime);
          break;
        case 'arrival':
          comparison = a.arrivalTime.localeCompare(b.arrivalTime);
          break;
      }
      return sortAsc ? comparison : -comparison;
    });

    renderResults();
  }

  // ── Set Sort ───────────────────────────────────────────────
  window.setSort = function (type, btn) {
    if (currentSort === type) {
      sortAsc = !sortAsc;
    } else {
      currentSort = type;
      sortAsc = true;
    }

    document.querySelectorAll('.sort-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const arrows = { price: '₹', duration: '⏱', departure: '🛫', arrival: '🛬' };
    btn.textContent = `${arrows[type] || ''} ${type.charAt(0).toUpperCase() + type.slice(1)} ${sortAsc ? '↑' : '↓'}`;

    applySort();
  };

  // ── Quick Filter Tabs ──────────────────────────────────────
  window.setQuickFilter = function (type, btn) {
    quickFilter = type;
    document.querySelectorAll('.quick-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    // Quick filters don't remove flights, they just re-sort
    if (type === 'cheapest') {
      currentSort = 'price';
      sortAsc = true;
    } else if (type === 'fastest') {
      currentSort = 'duration';
      sortAsc = true;
    } else if (type === 'best') {
      // Best value: sort by price/duration ratio
      currentSort = 'best';
      sortAsc = true;
    }

    applySort();
  };

  function updateQuickFilterTabs(flights) {
    if (!flights || flights.length === 0) {
      ['cheapest', 'fastest', 'best'].forEach(t => {
        document.getElementById(`qt-${t}-price`).textContent = 'N/A';
        document.getElementById(`qt-${t}-sub`).textContent = 'No flights';
      });
      return;
    }

    // Cheapest
    const cheapest = [...flights].sort((a, b) => getPrice(a) - getPrice(b))[0];
    if (cheapest) {
      document.getElementById('qt-cheapest-price').textContent = Utils.formatCurrency(getPrice(cheapest));
      document.getElementById('qt-cheapest-sub').textContent = Utils.formatDuration(cheapest.duration) + ' · ' + cheapest.airlineName;
    }

    // Fastest
    const fastest = [...flights].sort((a, b) => a.duration - b.duration)[0];
    if (fastest) {
      document.getElementById('qt-fastest-price').textContent = Utils.formatCurrency(getPrice(fastest));
      document.getElementById('qt-fastest-sub').textContent = Utils.formatDuration(fastest.duration) + ' · ' + fastest.airlineName;
    }

    // Best value
    const best = [...flights].sort((a, b) => {
      return (getPrice(a) / a.duration) - (getPrice(b) / b.duration);
    })[0];
    if (best) {
      document.getElementById('qt-best-price').textContent = Utils.formatCurrency(getPrice(best));
      document.getElementById('qt-best-sub').textContent = Utils.formatDuration(best.duration) + ' · ' + best.airlineName;
    }
  }

  // ── Reset Filters ──────────────────────────────────────────
  window.resetFilters = function () {
    // Uncheck time slots
    activeTimeSlots.clear();
    document.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('active'));

    // Re-check all airlines
    document.querySelectorAll('[data-airline]').forEach(cb => {
      cb.checked = true;
      activeAirlines.add(cb.dataset.airline);
    });

    // Re-check stops
    document.getElementById('stop-nonstop').checked = true;
    document.getElementById('stop-1').checked = true;

    // Re-check classes
    document.getElementById('class-economy').checked = true;
    document.getElementById('class-premium').checked = true;
    document.getElementById('class-business').checked = true;

    // Reset price sliders
    const minSlider = document.getElementById('price-min-slider');
    const maxSlider = document.getElementById('price-max-slider');
    minSlider.value = minSlider.min;
    maxSlider.value = maxSlider.max;
    document.getElementById('price-min-display').textContent = Utils.formatCurrency(parseInt(minSlider.min));
    document.getElementById('price-max-display').textContent = Utils.formatCurrency(parseInt(maxSlider.max));

    // Reset duration
    const durSlider = document.getElementById('duration-slider');
    durSlider.value = durSlider.max;
    document.getElementById('duration-display').textContent = 'Any';

    applyFilters();
    Utils.showToast('Filters reset', 'info');
  };

  // ── Render Results ─────────────────────────────────────────
  function renderResults() {
    const container = document.getElementById('results-container');
    const noResults = document.getElementById('no-results');
    const countEl = document.getElementById('results-count');
    const summaryCount = document.getElementById('sum-count');

    hideSkeleton();

    if (displayedFlights.length === 0) {
      container.innerHTML = '';
      noResults.classList.add('visible');
      countEl.textContent = '0 flights found';
      summaryCount.textContent = '0 flights found';
      return;
    }

    noResults.classList.remove('visible');
    countEl.textContent = `${displayedFlights.length} flight${displayedFlights.length !== 1 ? 's' : ''} found`;
    summaryCount.textContent = `${displayedFlights.length} flights`;

    // Build sort for 'best' category
    let sorted = displayedFlights;
    if (quickFilter === 'best' || currentSort === 'best') {
      sorted = [...displayedFlights].sort((a, b) => {
        return (getPrice(a) / a.duration) - (getPrice(b) / b.duration);
      });
    }

    container.innerHTML = '';
    sorted.forEach((flight, idx) => {
      const card = buildFlightCard(flight, idx);
      container.appendChild(card);
    });
  }

  // ── Build Flight Card ──────────────────────────────────────
  function buildFlightCard(flight, index) {
    const isCheapest = flight.id === cheapestFlightId;
    const isFastest = flight.id === fastestFlightId;
    const isBest = flight.id === bestFlightId;

    const wrapper = document.createElement('div');
    wrapper.className = 'flight-result-card animate-fadeInUp';
    wrapper.style.setProperty('--airline-color', flight.airlineColor);
    wrapper.style.animationDelay = `${Math.min(index * 0.06, 0.4)}s`;
    wrapper.style.animationFillMode = 'both';

    if (isCheapest) wrapper.classList.add('cheapest-card');
    else if (isFastest) wrapper.classList.add('fastest-card');

    // Badges
    let badgesHtml = '';
    if (isCheapest) badgesHtml += '<span class="badge-cheapest">💸 Cheapest</span>';
    if (isFastest) badgesHtml += '<span class="badge-fastest">⚡ Fastest</span>';
    if (isBest && !isCheapest && !isFastest) badgesHtml += '<span class="badge-best">⭐ Best Value</span>';

    // Stars
    const stars = '★'.repeat(Math.round(flight.airlineRating)) + '☆'.repeat(5 - Math.round(flight.airlineRating));

    // Duration formatted
    const duration = Utils.formatDuration(flight.duration);

    // Origin / Destination info
    const originCity = flight.originAirport?.city || flight.origin;
    const destCity = flight.destinationAirport?.city || flight.destination;

    // Fare class buttons
    const preferredClass = urlParams.class || 'economy';
    const fareClassesHtml = buildFareClassButtons(flight, preferredClass);

    // Book button
    const bookUrl = `booking.html?flightId=${encodeURIComponent(flight.id)}&class=${encodeURIComponent(preferredClass)}&passengers=${urlParams.passengers || 1}&date=${urlParams.date || flight.date}&from=${encodeURIComponent(flight.origin)}&to=${encodeURIComponent(flight.destination)}`;

    // Stops label
    const stopsClass = flight.stops > 0 ? 'has-stops' : '';
    const stopsText = flight.stops === 0 ? '✦ Non-stop' : `${flight.stops} Stop${flight.stops > 1 ? 's' : ''}`;

    wrapper.innerHTML = `
      ${badgesHtml ? `<div class="card-badges">${badgesHtml}</div>` : ''}

      <div class="card-main">
        <!-- Airline Identity -->
        <div class="airline-identity">
          <div class="airline-logo-box" style="--airline-color:${flight.airlineColor};">
            ${flight.airlineLogo}
          </div>
          <div class="airline-identity-info">
            <div class="airline-name-text">${flight.airlineName}</div>
            <div class="flight-number">${flight.flightNumber}</div>
            <div class="rating-stars" title="${flight.airlineRating}/5">${stars}</div>
          </div>
        </div>

        <!-- Route Visual -->
        <div class="route-visual">
          <div class="route-endpoint">
            <div class="route-time-big">${flight.departureTime}</div>
            <div class="route-airport-code">${flight.origin}</div>
            <div class="route-city-small">${originCity}</div>
          </div>

          <div class="route-timeline">
            <div class="route-duration-label">${duration}</div>
            <div class="route-line-track"></div>
            <div class="route-stops-label ${stopsClass}">${stopsText}</div>
          </div>

          <div class="route-endpoint">
            <div class="route-time-big">${flight.arrivalTime}</div>
            <div class="route-airport-code">${flight.destination}</div>
            <div class="route-city-small">${destCity}</div>
          </div>
        </div>

        <!-- Price Block + Book -->
        <div class="card-price-block">
          <div class="card-price-from">from</div>
          <div class="card-price-main">${Utils.formatCurrency(getPrice(flight))}</div>
          <div class="card-price-sub">per passenger</div>
          <a href="${bookUrl}" class="btn btn-primary btn-sm card-book-btn">Book Now →</a>
        </div>
      </div>

      <!-- Fare Classes -->
      <div class="fare-classes-row">
        ${fareClassesHtml}
      </div>
    `;

    return wrapper;
  }

  // ── Build Fare Class Buttons ───────────────────────────────
  function buildFareClassButtons(flight, preferredClass) {
    const classes = [
      { key: 'economy', label: 'Economy', icon: '🟢' },
      { key: 'premium_economy', label: 'Premium Economy', icon: '🔵' },
      { key: 'business', label: 'Business', icon: '🟣' }
    ];

    return classes.map(cls => {
      if (!flight.classes.includes(cls.key) || flight.prices[cls.key] === undefined) return '';

      const seats = flight.availableSeats[cls.key] || 0;
      let seatDot = '🟢';
      let seatClass = 'seats-high';
      let seatText = `${seats} seats`;

      if (seats < 5) { seatDot = '🔴'; seatClass = 'seats-low'; }
      else if (seats < 15) { seatDot = '🟡'; seatClass = 'seats-mid'; }

      let price = flight.prices[cls.key];
      if (agentSession && agentSession.role === 'agent') {
        price += (Storage.calculateAgentMarkup(agentSession.userId, flight) || 0);
      }

      const isSelected = cls.key === preferredClass ? 'selected-class' : '';
      const pax = parseInt(urlParams.passengers) || 1;
      const bookUrl = `booking.html?flightId=${encodeURIComponent(flight.id)}&class=${encodeURIComponent(cls.key)}&passengers=${pax}&date=${urlParams.date || flight.date}&from=${encodeURIComponent(flight.origin)}&to=${encodeURIComponent(flight.destination)}`;

      return `
        <button class="fare-class-btn ${isSelected}" onclick="window.location.href='${bookUrl}'">
          <div class="fare-class-name">${cls.icon} ${cls.label}</div>
          <div class="fare-class-price">${Utils.formatCurrency(price)}</div>
          <div class="fare-class-seats ${seatClass}">${seatDot} ${seatText}</div>
        </button>
      `;
    }).join('');
  }

  // ── Hide Skeleton ──────────────────────────────────────────
  function hideSkeleton() {
    ['skel-1', 'skel-2', 'skel-3'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  // ── Show No Results ────────────────────────────────────────
  function showNoResults(message) {
    const noResults = document.getElementById('no-results');
    noResults.classList.add('visible');
    if (message) {
      noResults.querySelector('.no-results-sub').textContent = message;
    }
  }

  // ── Airport Autocomplete ───────────────────────────────────
  function setupAutocomplete(inputId, dropdownId) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;

    const airports = FlightData.AIRPORTS;

    input.addEventListener('input', Utils.debounce(() => {
      const query = input.value.trim().toLowerCase();
      if (query.length < 1) {
        dropdown.classList.remove('active');
        return;
      }

      const matches = airports.filter(ap =>
        ap.code.toLowerCase().includes(query) ||
        ap.city.toLowerCase().includes(query) ||
        ap.name.toLowerCase().includes(query) ||
        ap.state.toLowerCase().includes(query)
      ).slice(0, 8);

      if (matches.length === 0) {
        dropdown.classList.remove('active');
        return;
      }

      dropdown.innerHTML = matches.map(ap => `
        <div class="autocomplete-item" onclick="selectAirport('${inputId}', '${dropdownId}', '${ap.code}', '${ap.city}', '${ap.name}')">
          <span class="airport-code">${ap.code}</span>
          <div class="airport-info">
            <div class="airport-name">${ap.city}</div>
            <div class="airport-city">${ap.name}</div>
          </div>
        </div>
      `).join('');

      dropdown.classList.add('active');
    }, 200));

    // Hide on outside click
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });

    input.addEventListener('focus', () => {
      if (input.value.length > 0) input.dispatchEvent(new Event('input'));
    });
  }

  window.selectAirport = function (inputId, dropdownId, code, city, name) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    input.value = `${city} (${code})`;
    input.dataset.code = code;
    dropdown.classList.remove('active');
  };

})();
