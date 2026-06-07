/* ============================================================
   SPECIAL FARE — ADMIN DASHBOARD JAVASCRIPT
   Analytics, Inventory, Bookings, Customers, Agents, Settings
   ============================================================ */

// ── Session Guard ──
if (!Utils.requireSession('admin')) {
  throw new Error('Unauthorized');
}

// ── State ──
let currentPanel = 'analytics';
let allBookingsData = [];
let allBookingsFilter = 'all';
let allBookingsSearch = '';
let selectedCommissionAgentId = null;
let bookingDetailId = null;

// ── Sidebar Navigation ──
function initSidebar() {
  const navItems = document.querySelectorAll('.sidebar-nav-item[data-panel]');
  navItems.forEach(item => {
    item.addEventListener('click', function () {
      const panel = this.dataset.panel;
      switchPanel(panel);
    });
  });
}

function switchPanel(panelName) {
  currentPanel = panelName;

  // Update sidebar active state
  document.querySelectorAll('.sidebar-nav-item[data-panel]').forEach(item => {
    item.classList.toggle('active', item.dataset.panel === panelName);
  });

  // Hide all panels
  document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');

  // Show target panel
  const targetPanel = document.getElementById('panel-' + panelName);
  if (targetPanel) {
    targetPanel.style.display = 'block';
    targetPanel.classList.add('animate-fadeIn');
  }

  // Render panel content
  switch (panelName) {
    case 'analytics':  renderAnalytics(); break;
    case 'inventory':  renderInventory(); break;
    case 'bookings':   renderAllBookings(); break;
    case 'customers':  renderCustomers(); break;
    case 'agents':     renderAgents(); break;
    case 'extranet':   renderExtranet(); break;
    case 'customize':  renderCustomize(); break;
    case 'settings':   renderSettings(); break;
  }
}

// ── Update pending agents badge ──
function updatePendingBadge() {
  const agents = Storage.getAllAgents();
  const pending = agents.filter(a => a.status === 'pending').length;
  const badge = document.getElementById('pendingAgentsBadge');
  if (badge) {
    badge.textContent = pending;
    badge.style.display = pending > 0 ? 'inline-flex' : 'none';
  }
}

// ══════════════════════════════════════════════
// ANALYTICS PANEL
// ══════════════════════════════════════════════
function renderAnalytics() {
  const analytics = Storage.getAnalytics();

  // Stat cards
  animateStatCard('statTotalBookings', analytics.totalBookings, '', '');
  animateStatCard('statConfirmed', analytics.confirmedBookings, '', '');
  animateStatCard('statCancelled', analytics.cancelledBookings, '', '');
  animateStatCard('statRevenue', analytics.totalRevenue, '₹', '', true);
  animateStatCard('statAgents', analytics.totalAgents, '', '');
  animateStatCard('statCustomers', analytics.totalCustomers, '', '');

  // Bar chart: last 7 days bookings
  const last7 = analytics.bookingsOverTime.slice(-7);
  const barData = last7.map(d => ({
    label: Utils.formatDateShort(d.date),
    value: d.count
  }));
  Utils.renderBarChart('bookingsBarChart', barData, { height: 180, color: 'var(--accent-gradient)' });

  // Donut chart: revenue by airline
  const airlineEntries = Object.entries(analytics.revenueByAirline);
  if (airlineEntries.length > 0) {
    const donutData = airlineEntries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value: Math.round(value / 1000) }));
    Utils.renderDonutChart('revenueDonutChart', donutData, 'Revenue (₹K)');
  } else {
    document.getElementById('revenueDonutChart').innerHTML = '<div class="empty-state" style="padding:2rem"><div class="empty-state-icon">📊</div><p>No revenue data yet</p></div>';
  }

  // Popular routes table
  renderPopularRoutesTable(analytics.bookingsByRoute, analytics.totalRevenue);
}

function animateStatCard(elementId, value, prefix, suffix, isCurrency) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (isCurrency) {
    // Format as currency without animating (complex format)
    el.textContent = Utils.formatCurrency(value);
  } else {
    Utils.animateCounter(el, value, 1200, prefix, suffix);
  }
}

function renderPopularRoutesTable(bookingsByRoute, totalRevenue) {
  const tbody = document.getElementById('popularRoutesBody');
  if (!tbody) return;

  const routeEntries = Object.entries(bookingsByRoute).sort((a, b) => b[1] - a[1]);

  if (routeEntries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:2rem">No booking data yet</td></tr>';
    return;
  }

  // Get revenue per route from bookings
  const bookings = Storage.getAllBookings();
  const routeRevenue = {};
  bookings.filter(b => b.status === 'confirmed').forEach(b => {
    const key = `${b.origin}-${b.destination}`;
    if (!routeRevenue[key]) routeRevenue[key] = 0;
    routeRevenue[key] += b.totalFare;
  });

  tbody.innerHTML = routeEntries.slice(0, 10).map(([route, count]) => {
    const [from, to] = route.split('-');
    const fromAirport = FlightData.getAirport(from);
    const toAirport = FlightData.getAirport(to);
    const fromCity = fromAirport ? fromAirport.city : from;
    const toCity = toAirport ? toAirport.city : to;
    const rev = routeRevenue[route] || 0;
    return `
      <tr>
        <td>
          <strong>${fromCity} → ${toCity}</strong>
          <div style="font-size:0.78rem;color:var(--text-muted)">${from} → ${to}</div>
        </td>
        <td><span class="badge badge-info">${count}</span></td>
        <td style="color:var(--accent-primary);font-weight:600">${Utils.formatCurrency(rev)}</td>
      </tr>
    `;
  }).join('');
}

// ══════════════════════════════════════════════
// INVENTORY PANEL
// ══════════════════════════════════════════════
function renderInventory() {
  renderCustomFlightsTable();
  renderGeneratedFlightsSummary();
  populateAirportDropdowns();
  populateAirlineDropdown();
  initAddFlightForm();
}

function renderCustomFlightsTable() {
  const flights = Storage.getCustomFlights();
  const tbody = document.getElementById('customFlightsBody');
  if (!tbody) return;

  const countEl = document.getElementById('customFlightsCount');
  if (countEl) countEl.textContent = flights.length;

  if (flights.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:2rem;color:var(--text-muted)">
          <div style="font-size:1.5rem;margin-bottom:8px">✈️</div>
          No custom flights added yet. Use the form below to add one.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = flights.map(f => {
    const originAirport = FlightData.getAirport(f.origin);
    const destAirport = FlightData.getAirport(f.destination);
    return `
      <tr>
        <td>
          <strong>${originAirport ? originAirport.city : f.origin} → ${destAirport ? destAirport.city : f.destination}</strong>
          <div style="font-size:0.76rem;color:var(--text-muted)">${f.origin} → ${f.destination}</div>
        </td>
        <td><code style="background:rgba(255,255,255,0.06);padding:2px 8px;border-radius:6px">${f.flightNumber || '—'}</code></td>
        <td>${Utils.formatDate(f.date)}</td>
        <td>${f.departureTime || '—'}</td>
        <td>${f.airlineCode || '—'}</td>
        <td style="color:var(--accent-primary);font-weight:600">${f.prices && f.prices.economy ? Utils.formatCurrency(f.prices.economy) : '—'}</td>
        <td><span class="badge badge-success">Active</span></td>
        <td>
          <button class="btn btn-sm" style="background:rgba(239,68,68,0.15);color:#fca5a5;border:1px solid rgba(239,68,68,0.3)"
            onclick="deleteCustomFlight('${f.id}')">🗑️ Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

function deleteCustomFlight(id) {
  if (!confirm('Delete this custom flight? This cannot be undone.')) return;
  Storage.removeCustomFlight(id);
  Utils.showToast('Custom flight removed successfully', 'success');
  renderCustomFlightsTable();
}

function renderGeneratedFlightsSummary() {
  const container = document.getElementById('generatedFlightsSummary');
  if (!container) return;

  // Count templates per route
  const routeCounts = {};
  FlightData.SCHEDULE_TEMPLATES.forEach(t => {
    if (!routeCounts[t.route]) routeCounts[t.route] = 0;
    routeCounts[t.route]++;
  });

  const topRoutes = Object.entries(routeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  container.innerHTML = topRoutes.map(([route, count]) => {
    const [from, to] = route.split('-');
    const fromCity = (FlightData.getAirport(from) || { city: from }).city;
    const toCity = (FlightData.getAirport(to) || { city: to }).city;
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0.75rem;background:rgba(255,255,255,0.04);border-radius:10px;margin-bottom:6px">
        <span style="font-size:0.88rem">${fromCity} → ${toCity} <span style="color:var(--text-muted);font-size:0.76rem">(${route})</span></span>
        <span class="badge badge-info">${count} daily</span>
      </div>
    `;
  }).join('');

  const totalEl = document.getElementById('generatedFlightsTotal');
  if (totalEl) totalEl.textContent = FlightData.SCHEDULE_TEMPLATES.length;
}

function populateAirportDropdowns() {
  const origins = document.getElementById('cfOrigin');
  const dests = document.getElementById('cfDestination');
  if (!origins || !dests) return;

  const optionsHtml = FlightData.AIRPORTS.map(a =>
    `<option value="${a.code}">${a.city} (${a.code})</option>`
  ).join('');

  origins.innerHTML = '<option value="">Select Origin Airport</option>' + optionsHtml;
  dests.innerHTML = '<option value="">Select Destination Airport</option>' + optionsHtml;
}

function populateAirlineDropdown() {
  const select = document.getElementById('cfAirlineCode');
  if (!select) return;
  select.innerHTML = '<option value="">Select Airline</option>' +
    FlightData.AIRLINES.map(a =>
      `<option value="${a.code}">${a.logo} ${a.name} (${a.code})</option>`
    ).join('');
}

function initAddFlightForm() {
  const form = document.getElementById('addFlightForm');
  if (!form || form.dataset.initialized) return;
  form.dataset.initialized = 'true';

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Collect values
    const origin = document.getElementById('cfOrigin').value;
    const destination = document.getElementById('cfDestination').value;
    const flightNumber = document.getElementById('cfFlightNumber').value.trim();
    const airlineCode = document.getElementById('cfAirlineCode').value;
    const date = document.getElementById('cfDate').value;
    const departureTime = document.getElementById('cfDepartureTime').value;
    const duration = parseInt(document.getElementById('cfDuration').value) || 120;
    const stops = parseInt(document.getElementById('cfStops').value) || 0;
    const econPrice = parseInt(document.getElementById('cfEconomyPrice').value) || 0;
    const premPrice = parseInt(document.getElementById('cfPremiumPrice').value) || 0;
    const busPrice = parseInt(document.getElementById('cfBusinessPrice').value) || 0;
    const econSeats = parseInt(document.getElementById('cfEconomySeats').value) || 150;
    const premSeats = parseInt(document.getElementById('cfPremiumSeats').value) || 0;
    const busSeats = parseInt(document.getElementById('cfBusinessSeats').value) || 0;

    // Validation
    let errors = [];
    if (!origin) errors.push('Origin airport');
    if (!destination) errors.push('Destination airport');
    if (origin && destination && origin === destination) errors.push('Origin and destination cannot be the same');
    if (!flightNumber) errors.push('Flight number');
    if (!airlineCode) errors.push('Airline');
    if (!date) errors.push('Date');
    if (!departureTime) errors.push('Departure time');
    if (!econPrice || econPrice < 100) errors.push('Economy price (min ₹100)');

    if (errors.length > 0) {
      Utils.showToast('Please fix: ' + errors.slice(0, 2).join(', '), 'error');
      return;
    }

    // Calculate arrival time
    const [depH, depM] = departureTime.split(':').map(Number);
    const arrivalDate = new Date();
    arrivalDate.setHours(depH, depM + duration, 0, 0);
    const arrivalTime = `${String(arrivalDate.getHours()).padStart(2, '0')}:${String(arrivalDate.getMinutes()).padStart(2, '0')}`;

    const prices = { economy: econPrice };
    const availableSeats = { economy: econSeats };
    const classes = ['economy'];

    if (premPrice > 0) {
      prices.premium_economy = premPrice;
      availableSeats.premium_economy = premSeats || 24;
      classes.push('premium_economy');
    }
    if (busPrice > 0) {
      prices.business = busPrice;
      availableSeats.business = busSeats || 12;
      classes.push('business');
    }

    const airline = FlightData.getAirline(airlineCode);
    const originAirport = FlightData.getAirport(origin);
    const destAirport = FlightData.getAirport(destination);

    const flightData = {
      flightNumber,
      airlineCode,
      airlineName: airline ? airline.name : airlineCode,
      airlineLogo: airline ? airline.logo : '✈️',
      airlineColor: airline ? airline.color : '#0ea5e9',
      airlineRating: airline ? airline.rating : 4.0,
      origin,
      destination,
      originAirport,
      destinationAirport: destAirport,
      date,
      departureTime,
      arrivalTime,
      duration,
      distance: 0,
      stops,
      stopText: stops === 0 ? 'Non-stop' : `${stops} stop${stops > 1 ? 's' : ''}`,
      prices,
      availableSeats,
      classes,
      aircraft: 'Custom',
      status: 'scheduled'
    };

    const result = Storage.addCustomFlight(flightData);
    if (result.success) {
      Utils.showToast('✅ Custom flight added successfully!', 'success');
      form.reset();
      document.getElementById('cfDate').min = Utils.getMinDate();
      renderCustomFlightsTable();
    } else {
      Utils.showToast('Failed to add flight. Try again.', 'error');
    }
  });

  // Set min date
  const dateInput = document.getElementById('cfDate');
  if (dateInput) dateInput.min = Utils.getMinDate();
}

// ══════════════════════════════════════════════
// ALL BOOKINGS PANEL
// ══════════════════════════════════════════════
function renderAllBookings() {
  allBookingsData = Storage.getAllBookings();
  renderBookingsTable();
  initBookingsSearch();
  initBookingFilterTabs();
}

function renderBookingsTable() {
  const tbody = document.getElementById('allBookingsBody');
  if (!tbody) return;

  let filtered = allBookingsData;

  // Filter by status tab
  if (allBookingsFilter !== 'all') {
    filtered = filtered.filter(b => b.status === allBookingsFilter);
  }

  // Filter by search
  if (allBookingsSearch.trim()) {
    const q = allBookingsSearch.toLowerCase();
    filtered = filtered.filter(b =>
      b.pnr.toLowerCase().includes(q) ||
      (b.origin + '-' + b.destination).toLowerCase().includes(q) ||
      b.airlineName.toLowerCase().includes(q) ||
      b.passengers.some(p => p.name.toLowerCase().includes(q)) ||
      b.flightNumber.toLowerCase().includes(q)
    );
  }

  const countEl = document.getElementById('bookingsCount');
  if (countEl) countEl.textContent = filtered.length;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center;padding:2rem;color:var(--text-muted)">
          <div style="font-size:1.5rem;margin-bottom:8px">📋</div>
          No bookings found
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(booking => {
    const originAirport = FlightData.getAirport(booking.origin);
    const destAirport = FlightData.getAirport(booking.destination);
    const fromCity = originAirport ? originAirport.city : booking.origin;
    const toCity = destAirport ? destAirport.city : booking.destination;
    const passengerNames = booking.passengers.map(p => p.name).join(', ');

    return `
      <tr>
        <td>
          <strong style="color:var(--accent-primary);cursor:pointer" onclick="viewBookingDetail('${booking.id}')">${booking.pnr}</strong>
        </td>
        <td>
          <span>${fromCity} → ${toCity}</span>
          <div style="font-size:0.76rem;color:var(--text-muted)">${booking.flightNumber}</div>
        </td>
        <td style="font-size:0.85rem">${Utils.formatDate(booking.date)}</td>
        <td style="font-size:0.85rem">${booking.airlineName}</td>
        <td style="font-size:0.82rem;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${passengerNames}">
          ${booking.passengers.length}x — ${booking.passengers[0]?.name || '—'}
        </td>
        <td>${Utils.formatClass(booking.fareClass)}</td>
        <td style="color:var(--accent-primary);font-weight:700">${Utils.formatCurrency(booking.totalFare)}</td>
        <td>${Utils.getStatusBadge(booking.status)}</td>
        <td style="font-size:0.78rem;color:var(--text-muted)">${Utils.formatDateTime(booking.bookedAt)}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-sm" onclick="viewBookingDetail('${booking.id}')" style="padding:4px 10px;font-size:0.78rem">👁 View</button>
            ${booking.status === 'confirmed' ? `
              <button class="btn btn-sm" onclick="cancelBookingWithConfirm('${booking.id}','${booking.pnr}')"
                style="background:rgba(239,68,68,0.15);color:#fca5a5;border:1px solid rgba(239,68,68,0.3);padding:4px 10px;font-size:0.78rem">
                ✕ Cancel
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function initBookingsSearch() {
  const searchEl = document.getElementById('bookingsSearch');
  if (!searchEl || searchEl.dataset.initialized) return;
  searchEl.dataset.initialized = 'true';
  searchEl.addEventListener('input', Utils.debounce(function () {
    allBookingsSearch = this.value;
    renderBookingsTable();
  }, 300));
}

function initBookingFilterTabs() {
  const tabs = document.querySelectorAll('#bookingsFilterTabs .tab-item');
  tabs.forEach(tab => {
    tab.addEventListener('click', function () {
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      allBookingsFilter = this.dataset.filter;
      renderBookingsTable();
    });
  });
}

function cancelBookingWithConfirm(bookingId, pnr) {
  document.getElementById('cancelBookingPNR').textContent = pnr;
  document.getElementById('confirmCancelBtn').onclick = function () {
    const result = Storage.updateBookingStatus(bookingId, 'cancelled');
    if (result.success) {
      Utils.showToast(`Booking ${pnr} cancelled successfully`, 'success');
      Utils.closeModal('cancelConfirmModal');
      // Refresh data
      allBookingsData = Storage.getAllBookings();
      renderBookingsTable();
    } else {
      Utils.showToast('Failed to cancel booking', 'error');
    }
  };
  Utils.openModal('cancelConfirmModal');
}

function viewBookingDetail(bookingId) {
  const booking = Storage.getBooking(bookingId);
  if (!booking) return;

  const originAirport = FlightData.getAirport(booking.origin);
  const destAirport = FlightData.getAirport(booking.destination);
  const fromCity = originAirport ? originAirport.city : booking.origin;
  const toCity = destAirport ? destAirport.city : booking.destination;

  const passengerRows = booking.passengers.map((p, i) => `
    <tr>
      <td>${i + 1}. ${p.name}</td>
      <td>${p.age}</td>
      <td>${p.gender}</td>
      <td>${p.idType}: ${p.idNumber}</td>
      <td>${p.seatPref || '—'}</td>
    </tr>
  `).join('');

  document.getElementById('bookingDetailContent').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem">
      <div class="card-glass" style="padding:1.25rem;border-radius:14px">
        <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:4px">PNR</div>
        <div style="font-size:1.4rem;font-weight:800;color:var(--accent-primary);letter-spacing:2px">${booking.pnr}</div>
        <div style="margin-top:8px">${Utils.getStatusBadge(booking.status)}</div>
      </div>
      <div class="card-glass" style="padding:1.25rem;border-radius:14px">
        <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:4px">Route</div>
        <div style="font-weight:700">${fromCity} → ${toCity}</div>
        <div style="font-size:0.82rem;color:var(--text-muted)">${booking.flightNumber} • ${booking.airlineName}</div>
        <div style="font-size:0.82rem;color:var(--text-secondary)">${Utils.formatDate(booking.date)} • ${Utils.formatTime12(booking.departureTime)} → ${Utils.formatTime12(booking.arrivalTime)}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1.5rem">
      <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:0.85rem">
        <div style="font-size:0.75rem;color:var(--text-muted)">Fare Class</div>
        <div style="font-weight:600;margin-top:4px">${Utils.formatClass(booking.fareClass)}</div>
      </div>
      <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:0.85rem">
        <div style="font-size:0.75rem;color:var(--text-muted)">Payment</div>
        <div style="font-weight:600;margin-top:4px">${booking.paymentMethod || 'UPI'}</div>
      </div>
      <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:0.85rem">
        <div style="font-size:0.75rem;color:var(--text-muted)">Booked At</div>
        <div style="font-weight:600;margin-top:4px;font-size:0.82rem">${Utils.formatDateTime(booking.bookedAt)}</div>
      </div>
    </div>

    <div class="card-glass" style="padding:1.25rem;border-radius:14px;margin-bottom:1.5rem">
      <div style="font-weight:700;margin-bottom:1rem">👥 Passengers (${booking.passengers.length})</div>
      <div class="table-wrapper" style="overflow-x:auto">
        <table class="table" style="width:100%">
          <thead>
            <tr>
              <th>Name</th><th>Age</th><th>Gender</th><th>ID</th><th>Seat Pref</th>
            </tr>
          </thead>
          <tbody>${passengerRows}</tbody>
        </table>
      </div>
    </div>

    <div class="card-glass" style="padding:1.25rem;border-radius:14px">
      <div style="font-weight:700;margin-bottom:1rem">💰 Fare Breakdown</div>
      <div style="display:grid;gap:8px">
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Base Fare</span><span>${Utils.formatCurrency(booking.baseFare)}</span></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Taxes (GST)</span><span>${Utils.formatCurrency(booking.taxes)}</span></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Convenience Fee</span><span>${Utils.formatCurrency(booking.convenienceFee || 250)}</span></div>
        ${booking.agentMarkup ? `<div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Agent Markup</span><span>${Utils.formatCurrency(booking.agentMarkup)}</span></div>` : ''}
        ${booking.agentCommission ? `<div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Agent Commission</span><span style="color:#22c55e">${Utils.formatCurrency(booking.agentCommission)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:8px;font-weight:700;font-size:1.05rem">
          <span>Total</span><span style="color:var(--accent-primary)">${Utils.formatCurrency(booking.totalFare)}</span>
        </div>
      </div>
    </div>

    ${booking.status === 'confirmed' ? `
      <div style="margin-top:1.25rem;display:flex;justify-content:flex-end">
        <button class="btn btn-sm" onclick="cancelBookingWithConfirm('${booking.id}','${booking.pnr}');Utils.closeModal('bookingDetailModal')"
          style="background:rgba(239,68,68,0.15);color:#fca5a5;border:1px solid rgba(239,68,68,0.3)">
          ✕ Cancel This Booking
        </button>
      </div>
    ` : ''}
  `;

  Utils.openModal('bookingDetailModal');
}

// ══════════════════════════════════════════════
// CUSTOMERS PANEL
// ══════════════════════════════════════════════
function renderCustomers() {
  const customers = Storage.getAllCustomers();
  const allBookings = Storage.getAllBookings();
  const tbody = document.getElementById('customersBody');
  if (!tbody) return;

  const searchInput = document.getElementById('customersSearch');
  let search = searchInput ? searchInput.value.toLowerCase() : '';

  let filtered = customers;
  if (search) {
    filtered = customers.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.email.toLowerCase().includes(search) ||
      (c.phone || '').includes(search)
    );
  }

  const countEl = document.getElementById('customersCount');
  if (countEl) countEl.textContent = filtered.length;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted)">No customers found</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(customer => {
    const userBookings = allBookings.filter(b => b.userId === customer.id);
    const totalSpent = userBookings.filter(b => b.status === 'confirmed').reduce((s, b) => s + b.totalFare, 0);
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#0ea5e9,#38bdf8);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;flex-shrink:0">
              ${customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="font-weight:600">${customer.name}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${customer.id}</div>
            </div>
          </div>
        </td>
        <td style="font-size:0.85rem">${customer.email}</td>
        <td style="font-size:0.85rem">${customer.phone || '—'}</td>
        <td><span class="badge badge-info">${userBookings.length}</span></td>
        <td style="color:var(--accent-primary);font-weight:600">${Utils.formatCurrency(totalSpent)}</td>
        <td style="font-size:0.82rem;color:var(--text-muted)">${Utils.formatDate(customer.createdAt)}</td>
        <td>
          <button class="btn btn-sm" onclick="impersonate('${customer.id}', 'customer')"
            style="background:rgba(14, 165, 233,0.15);color:#a5b4fc;border:1px solid rgba(14, 165, 233,0.3);padding:4px 10px;font-size:0.78rem">
            🔑 Login As
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Initialize search listener once
  if (searchInput && !searchInput.dataset.initialized) {
    searchInput.dataset.initialized = 'true';
    searchInput.addEventListener('input', Utils.debounce(() => renderCustomers(), 300));
  }
}

// ══════════════════════════════════════════════
// AGENTS PANEL
// ══════════════════════════════════════════════
function renderAgents() {
  updatePendingBadge();

  const agents = Storage.getAllAgents();
  const allBookings = Storage.getAllBookings();
  const tbody = document.getElementById('agentsBody');
  if (!tbody) return;

  // Determine active filter
  const activeTab = document.querySelector('#agentsFilterTabs .tab-item.active');
  const filter = activeTab ? activeTab.dataset.filter : 'all';

  const search = (document.getElementById('agentsSearch')?.value || '').toLowerCase();

  let filtered = agents;
  if (filter !== 'all') {
    filtered = filtered.filter(a => a.status === filter);
  }
  if (search) {
    filtered = filtered.filter(a =>
      a.agencyName.toLowerCase().includes(search) ||
      a.ownerName.toLowerCase().includes(search) ||
      a.email.toLowerCase().includes(search) ||
      (a.city || '').toLowerCase().includes(search)
    );
  }

  const countEl = document.getElementById('agentsCount');
  if (countEl) countEl.textContent = filtered.length;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-muted)">No agents found</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(agent => {
    const agentBookings = allBookings.filter(b => b.agentId === agent.id);
    const statusBadge = Utils.getStatusBadge(agent.status);
    return `
      <tr>
        <td>
          <div style="font-weight:700">${agent.agencyName}</div>
          <div style="font-size:0.75rem;color:var(--text-muted)">${agent.city || '—'}, ${agent.state || '—'}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${agent.address || ''}">Addr: ${agent.address || '—'}</div>
        </td>
        <td>${agent.ownerName}</td>
        <td style="font-size:0.83rem">${agent.email}</td>
        <td>${agent.city || '—'}</td>
        <td>${statusBadge}</td>
        <td><span class="badge badge-info">${agentBookings.length}</span></td>
        <td>
          <span style="color:var(--accent-primary);font-weight:600">${agent.commissionRate}%</span>
        </td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${agent.status !== 'approved' ? `
              <button class="btn btn-sm" onclick="approveAgent('${agent.id}')"
                style="background:rgba(34,197,94,0.15);color:#86efac;border:1px solid rgba(34,197,94,0.3);padding:4px 10px;font-size:0.78rem">
                ✓ Approve
              </button>
            ` : ''}
            ${agent.status !== 'rejected' ? `
              <button class="btn btn-sm" onclick="rejectAgent('${agent.id}')"
                style="background:rgba(239,68,68,0.15);color:#fca5a5;border:1px solid rgba(239,68,68,0.3);padding:4px 10px;font-size:0.78rem">
                ✕ Reject
              </button>
            ` : ''}
            <button class="btn btn-sm" onclick="openCommissionModal('${agent.id}', ${agent.commissionRate})"
              style="padding:4px 10px;font-size:0.78rem">
              ✏️ Commission
            </button>
            <button class="btn btn-sm" onclick="impersonate('${agent.id}', 'agent')"
              style="background:rgba(14, 165, 233,0.15);color:#a5b4fc;border:1px solid rgba(14, 165, 233,0.3);padding:4px 10px;font-size:0.78rem">
              🔑 Login As
            </button>
            <button class="btn btn-sm" onclick="openWalletModal('${agent.id}')"
              style="background:rgba(245,158,11,0.15);color:#fcd34d;border:1px solid rgba(245,158,11,0.3);padding:4px 10px;font-size:0.78rem">
              💰 Wallet
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  initAgentsFilterTabs();
  initAgentsSearch();
}

function initAgentsFilterTabs() {
  const tabs = document.querySelectorAll('#agentsFilterTabs .tab-item');
  tabs.forEach(tab => {
    if (tab.dataset.listenerAdded) return;
    tab.dataset.listenerAdded = 'true';
    tab.addEventListener('click', function () {
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      renderAgents();
    });
  });
}

function initAgentsSearch() {
  const searchEl = document.getElementById('agentsSearch');
  if (!searchEl || searchEl.dataset.initialized) return;
  searchEl.dataset.initialized = 'true';
  searchEl.addEventListener('input', Utils.debounce(() => renderAgents(), 300));
}

function approveAgent(agentId) {
  const result = Storage.updateAgentStatus(agentId, 'approved');
  if (result.success) {
    Utils.showToast('Agent approved successfully! 🎉', 'success');
    renderAgents();
    updatePendingBadge();
  } else {
    Utils.showToast('Failed to approve agent', 'error');
  }
}

function rejectAgent(agentId) {
  if (!confirm('Are you sure you want to reject this agent?')) return;
  const result = Storage.updateAgentStatus(agentId, 'rejected');
  if (result.success) {
    Utils.showToast('Agent rejected', 'warning');
    renderAgents();
    updatePendingBadge();
  } else {
    Utils.showToast('Failed to reject agent', 'error');
  }
}

function openCommissionModal(agentId, currentRate) {
  selectedCommissionAgentId = agentId;
  const agent = Storage.getAgent(agentId);
  if (!agent) return;

  document.getElementById('commissionAgentName').textContent = agent.agencyName;
  document.getElementById('commissionSlider').value = currentRate;
  document.getElementById('commissionValue').textContent = currentRate + '%';
  Utils.openModal('commissionModal');
}

function updateCommission(agentId, rate) {
  const result = Storage.updateAgentCommission(agentId, rate);
  if (result.success) {
    Utils.showToast(`Commission updated to ${rate}% 💰`, 'success');
    Utils.closeModal('commissionModal');
    renderAgents();
  } else {
    Utils.showToast('Failed to update commission', 'error');
  }
}

// ══════════════════════════════════════════════
// CUSTOMIZE PANEL
// ══════════════════════════════════════════════
function renderCustomize() {
  const settings = Storage.getSettings();

  // Populate form fields
  const fields = {
    'customPromoText': settings.promoText || '',
    'customHeroTitle': settings.heroTitle || '',
    'customHeroSubtitle': settings.heroSubtitle || '',
    'customStatAirports': settings.statAirports || '',
    'customStatAirlines': settings.statAirlines || '',
    'customStatFlights': settings.statDailyFlights || '',
    'customStatRoutes': settings.statRoutes || '',
    'customFeat1Title': settings.feat1Title || '',
    'customFeat1Desc': settings.feat1Desc || '',
    'customFeat2Title': settings.feat2Title || '',
    'customFeat2Desc': settings.feat2Desc || '',
    'customFeat3Title': settings.feat3Title || '',
    'customFeat3Desc': settings.feat3Desc || '',
    'customFeat4Title': settings.feat4Title || '',
    'customFeat4Desc': settings.feat4Desc || '',
    'customFeat5Title': settings.feat5Title || '',
    'customFeat5Desc': settings.feat5Desc || '',
    'customFeat6Title': settings.feat6Title || '',
    'customFeat6Desc': settings.feat6Desc || '',
    'customFooterCompany': settings.footerCompanyName || '',
    'customFooterEmail': settings.footerEmail || '',
    'customFooterAddress': settings.footerAddress || '',
    'customFooterPhone': settings.footerPhone || ''
  };

  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });

  // Init form submit (once)
  const form = document.getElementById('customizeForm');
  if (form && !form.dataset.initialized) {
    form.dataset.initialized = 'true';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const updates = {
        promoText: document.getElementById('customPromoText').value.trim(),
        heroTitle: document.getElementById('customHeroTitle').value.trim(),
        heroSubtitle: document.getElementById('customHeroSubtitle').value.trim(),
        statAirports: parseInt(document.getElementById('customStatAirports').value) || 0,
        statAirlines: parseInt(document.getElementById('customStatAirlines').value) || 0,
        statDailyFlights: parseInt(document.getElementById('customStatFlights').value) || 0,
        statRoutes: parseInt(document.getElementById('customStatRoutes').value) || 0,
        feat1Title: document.getElementById('customFeat1Title').value.trim(),
        feat1Desc: document.getElementById('customFeat1Desc').value.trim(),
        feat2Title: document.getElementById('customFeat2Title').value.trim(),
        feat2Desc: document.getElementById('customFeat2Desc').value.trim(),
        feat3Title: document.getElementById('customFeat3Title').value.trim(),
        feat3Desc: document.getElementById('customFeat3Desc').value.trim(),
        feat4Title: document.getElementById('customFeat4Title').value.trim(),
        feat4Desc: document.getElementById('customFeat4Desc').value.trim(),
        feat5Title: document.getElementById('customFeat5Title').value.trim(),
        feat5Desc: document.getElementById('customFeat5Desc').value.trim(),
        feat6Title: document.getElementById('customFeat6Title').value.trim(),
        feat6Desc: document.getElementById('customFeat6Desc').value.trim(),
        footerCompanyName: document.getElementById('customFooterCompany').value.trim(),
        footerEmail: document.getElementById('customFooterEmail').value.trim(),
        footerAddress: document.getElementById('customFooterAddress').value.trim(),
        footerPhone: document.getElementById('customFooterPhone').value.trim()
      };

      Storage.updateSettings(updates);
      Utils.showToast('Landing page customizations saved! 🎨', 'success');
    });
  }
}

// ══════════════════════════════════════════════
// SETTINGS PANEL
// ══════════════════════════════════════════════
function renderSettings() {
  const settings = Storage.getSettings();

  // Populate form fields
  const fields = {
    'settingGstEconomy': settings.gstEconomy || 5,
    'settingGstBusiness': settings.gstBusiness || 12,
    'settingConvenienceFee': settings.convenienceFee || 250,
    'settingDefaultCommission': settings.defaultCommission || 5,
    'settingMinCommission': settings.minCommission || 2,
    'settingMaxCommission': settings.maxCommission || 12,
    'settingSmepayEnabled': settings.smepayEnabled !== undefined ? String(settings.smepayEnabled) : 'false',
    'settingSmepayMode': settings.smepayMode || 'sandbox',
    'settingSmepayMerchantId': settings.smepayMerchantId || '',
    'settingSmepayApiKey': settings.smepayApiKey || ''
  };

  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });

  // Update slider label
  const slider = document.getElementById('settingDefaultCommission');
  const sliderLabel = document.getElementById('defaultCommissionLabel');
  if (slider && sliderLabel) {
    sliderLabel.textContent = slider.value + '%';
    slider.addEventListener('input', function () {
      sliderLabel.textContent = this.value + '%';
    });
  }

  // Render announcements
  renderAnnouncementsList();

  // Init form submit (once)
  const form = document.getElementById('settingsForm');
  if (form && !form.dataset.initialized) {
    form.dataset.initialized = 'true';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const updates = {
        gstEconomy: parseFloat(document.getElementById('settingGstEconomy').value) || 5,
        gstBusiness: parseFloat(document.getElementById('settingGstBusiness').value) || 12,
        convenienceFee: parseInt(document.getElementById('settingConvenienceFee').value) || 250,
        defaultCommission: parseFloat(document.getElementById('settingDefaultCommission').value) || 5,
        minCommission: parseFloat(document.getElementById('settingMinCommission').value) || 2,
        maxCommission: parseFloat(document.getElementById('settingMaxCommission').value) || 12,
        smepayEnabled: document.getElementById('settingSmepayEnabled').value === 'true',
        smepayMode: document.getElementById('settingSmepayMode').value,
        smepayMerchantId: document.getElementById('settingSmepayMerchantId').value.trim(),
        smepayApiKey: document.getElementById('settingSmepayApiKey').value.trim()
      };

      if (updates.minCommission > updates.maxCommission) {
        Utils.showToast('Min commission cannot exceed max commission', 'error');
        return;
      }

      Storage.updateSettings(updates);
      Utils.showToast('Settings saved successfully! ✅', 'success');
    });
  }

  // Add announcement button
  const addAnnBtn = document.getElementById('addAnnouncementBtn');
  if (addAnnBtn && !addAnnBtn.dataset.initialized) {
    addAnnBtn.dataset.initialized = 'true';
    addAnnBtn.addEventListener('click', function () {
      const input = document.getElementById('announcementInput');
      const text = input ? input.value.trim() : '';
      if (!text) {
        Utils.showToast('Please enter announcement text', 'warning');
        return;
      }
      Storage.addAnnouncement(text);
      input.value = '';
      Utils.showToast('Announcement added! 📢', 'success');
      renderAnnouncementsList();
    });
  }
}

function renderAnnouncementsList() {
  const container = document.getElementById('announcementsList');
  if (!container) return;

  const announcements = Storage.getAnnouncements();

  if (announcements.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.88rem;padding:0.75rem 0">No active announcements.</p>';
    return;
  }

  container.innerHTML = announcements.map(ann => `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:0.85rem;background:rgba(255,255,255,0.04);border-radius:10px;margin-bottom:8px">
      <div>
        <div style="font-size:0.88rem;margin-bottom:4px">${ann.text}</div>
        <div style="font-size:0.74rem;color:var(--text-muted)">${Utils.formatDateTime(ann.createdAt)}</div>
      </div>
      <button class="btn btn-sm" onclick="removeAnnouncement('${ann.id}')"
        style="background:rgba(239,68,68,0.15);color:#fca5a5;border:1px solid rgba(239,68,68,0.3);flex-shrink:0;padding:4px 10px;font-size:0.78rem">
        🗑️
      </button>
    </div>
  `).join('');
}

function removeAnnouncement(id) {
  Storage.removeAnnouncement(id);
  Utils.showToast('Announcement removed', 'success');
  renderAnnouncementsList();
}

// ══════════════════════════════════════════════
// EXTRANET PANEL
// ══════════════════════════════════════════════
function renderExtranet() {
  initExtranetTabs();
  renderPrepurchasedInventoryTable();
  populateExtranetDropdowns();
  initAddPrepurchasedForm();
  renderSuppliersTable();
  initAddSupplierForm();
  initEditSupplierForm();
  renderGroupBookingsTable();
}

function initExtranetTabs() {
  const tabs = document.querySelectorAll('#extranetTabs .tab-item');
  tabs.forEach(tab => {
    if (tab.dataset.listenerAdded) return;
    tab.dataset.listenerAdded = 'true';
    tab.addEventListener('click', function () {
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      const targetTab = this.dataset.tab;
      document.querySelectorAll('.ext-tab-content').forEach(c => {
        c.style.display = c.id === targetTab ? 'block' : 'none';
      });
    });
  });
}

function renderPrepurchasedInventoryTable() {
  const inventory = Storage.getPrepurchasedInventory();
  const tbody = document.getElementById('prepurchasedInventoryBody');
  if (!tbody) return;

  if (inventory.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center;padding:2rem;color:var(--text-muted)">
          <div style="font-size:1.5rem;margin-bottom:8px">🎫</div>
          No pre-purchased inventory blocks allocated yet.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = inventory.map(block => {
    const fillPercent = block.totalSeats > 0 ? Math.round(((block.totalSeats - block.seatsRemaining) / block.totalSeats) * 100) : 0;
    const profit = block.sellingPrice - block.costPrice;
    const marginPct = block.costPrice > 0 ? Math.round((profit / block.costPrice) * 100) : 0;
    
    return `
      <tr>
        <td><strong style="color:var(--accent-primary); letter-spacing: 1px;">${block.pnr}</strong></td>
        <td>
          <div style="font-weight:600">${block.supplierName}</div>
          <div style="font-size:0.75rem;color:var(--text-muted)">ID: ${block.supplierId}</div>
        </td>
        <td style="font-size:0.83rem">
          <strong>${block.airlineName} (${block.flightNumber})</strong>
          <div>${block.origin} → ${block.destination}</div>
          <div style="font-size:0.78rem;color:var(--text-secondary)">${Utils.formatDate(block.date)}</div>
        </td>
        <td>${Utils.formatClass(block.fareClass)}</td>
        <td>
          <div style="font-weight:600">${block.totalSeats} / ${block.seatsRemaining}</div>
          <div style="font-size:0.75rem;color:var(--text-muted)">Remaining</div>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <div style="background:rgba(255,255,255,0.06); border-radius:10px; height:8px; width:60px; overflow:hidden; display:inline-block; border: 1px solid rgba(255,255,255,0.1)">
              <div style="background:var(--accent-gradient); width:${fillPercent}%; height:100%;"></div>
            </div>
            <span style="font-size:0.76rem; font-weight:600">${fillPercent}%</span>
          </div>
        </td>
        <td style="font-size:0.83rem">
          <div>C: ${Utils.formatCurrency(block.costPrice)}</div>
          <div style="color:var(--accent-primary)">S: ${Utils.formatCurrency(block.sellingPrice)}</div>
        </td>
        <td>
          <span style="color:#22c55e; font-weight:700;">+${Utils.formatCurrency(profit)}</span>
          <div style="font-size:0.76rem; color:var(--text-muted)">(${marginPct}%)</div>
        </td>
        <td>
          <button class="btn btn-sm" style="background:rgba(239,68,68,0.15); color:#fca5a5; border:1px solid rgba(239,68,68,0.3); padding: 4px 10px; font-size: 0.78rem;"
            onclick="deletePrepurchasedBlock('${block.id}')">🗑️ Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

function deletePrepurchasedBlock(id) {
  if (!confirm('Are you sure you want to delete this pre-purchased inventory block?')) return;
  Storage.removePrepurchasedBlock(id);
  Utils.showToast('Pre-purchased block deleted successfully', 'success');
  renderPrepurchasedInventoryTable();
  renderGroupBookingsTable();
}

function populateExtranetDropdowns() {
  const supplierSelect = document.getElementById('ppSupplier');
  if (supplierSelect) {
    supplierSelect.innerHTML = '<option value="">Select Supplier</option>' +
      Storage.getSuppliers().map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  }

  const airlineSelect = document.getElementById('ppAirlineCode');
  if (airlineSelect) {
    airlineSelect.innerHTML = '<option value="">Select Airline</option>' +
      FlightData.AIRLINES.map(a => `<option value="${a.code}">${a.logo} ${a.name} (${a.code})</option>`).join('');
  }

  const originSelect = document.getElementById('ppOrigin');
  const destSelect = document.getElementById('ppDestination');
  if (originSelect && destSelect) {
    const optionsHtml = FlightData.AIRPORTS.map(a => `<option value="${a.code}">${a.city} (${a.code})</option>`).join('');
    originSelect.innerHTML = '<option value="">Select Origin</option>' + optionsHtml;
    destSelect.innerHTML = '<option value="">Select Destination</option>' + optionsHtml;
  }

  const ppDate = document.getElementById('ppDate');
  if (ppDate) {
    ppDate.min = Utils.getMinDate();
  }
}

function initAddPrepurchasedForm() {
  const form = document.getElementById('addPrepurchasedForm');
  if (form && !form.dataset.initialized) {
    form.dataset.initialized = 'true';
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const pnr = document.getElementById('ppPnr').value.trim().toUpperCase();
      const supplierId = document.getElementById('ppSupplier').value;
      const airlineCode = document.getElementById('ppAirlineCode').value;
      const flightNumber = document.getElementById('ppFlightNumber').value.trim();
      const origin = document.getElementById('ppOrigin').value;
      const destination = document.getElementById('ppDestination').value;
      const date = document.getElementById('ppDate').value;
      const fareClass = document.getElementById('ppFareClass').value;
      const totalSeats = parseInt(document.getElementById('ppTotalSeats').value) || 0;
      const costPrice = parseInt(document.getElementById('ppCostPrice').value) || 0;
      const sellingPrice = parseInt(document.getElementById('ppSellingPrice').value) || 0;

      let errors = [];
      if (!pnr) errors.push('PNR Code');
      if (!supplierId) errors.push('Supplier');
      if (!airlineCode) errors.push('Airline');
      if (!flightNumber) errors.push('Flight Number');
      if (!origin) errors.push('Origin');
      if (!destination) errors.push('Destination');
      if (origin && destination && origin === destination) errors.push('Origin and destination cannot be the same');
      if (!date) errors.push('Flight Date');
      if (totalSeats <= 0) errors.push('Total Seats');
      if (costPrice <= 0) errors.push('Cost Price');
      if (sellingPrice <= 0) errors.push('Selling Price');
      if (costPrice && sellingPrice && costPrice >= sellingPrice) errors.push('Selling price must exceed cost price');

      if (errors.length > 0) {
        Utils.showToast('Please fix: ' + errors.join(', '), 'error');
        return;
      }

      const supplier = Storage.getSuppliers().find(s => s.id === supplierId);
      const airline = FlightData.getAirline(airlineCode);

      const block = {
        pnr,
        supplierId,
        supplierName: supplier ? supplier.name : 'Unknown',
        airlineCode,
        airlineName: airline ? airline.name : airlineCode,
        flightNumber,
        origin,
        destination,
        date,
        fareClass,
        totalSeats,
        costPrice,
        sellingPrice
      };

      const result = Storage.addPrepurchasedBlock(block);
      if (result.success) {
        Utils.showToast('✅ Pre-purchased block allocated successfully!', 'success');
        form.reset();
        
        // Switch tab back to PNR view
        const tabEl = document.querySelector('#extranetTabs .tab-item[data-tab="ext-pnr"]');
        if (tabEl) tabEl.click();
        
        renderExtranet();
      } else {
        Utils.showToast('Failed to allocate block.', 'error');
      }
    });
  }
}

function renderSuppliersTable() {
  const suppliers = Storage.getSuppliers();
  const tbody = document.getElementById('suppliersTbody');
  if (!tbody) return;

  if (suppliers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:2rem;color:var(--text-muted)">
          No registered suppliers found.
        </td>
      </tr>
    `;
    return;
  }

  const inventory = Storage.getPrepurchasedInventory();

  tbody.innerHTML = suppliers.map(s => {
    const blocks = inventory.filter(b => b.supplierId === s.id);
    const totalBlocks = blocks.length;
    const totalSeats = blocks.reduce((sum, b) => sum + b.totalSeats, 0);
    const seatsSold = blocks.reduce((sum, b) => sum + (b.totalSeats - b.seatsRemaining), 0);
    const status = s.status || 'active';

    const statusBadge = status === 'active' 
      ? '<span style="background:rgba(34,197,94,0.12); color:#4ade80; padding:4px 8px; border-radius:10px; font-size:0.75rem; font-weight:700">Active</span>' 
      : '<span style="background:rgba(239,68,68,0.12); color:#fca5a5; padding:4px 8px; border-radius:10px; font-size:0.75rem; font-weight:700">Suspended</span>';

    const toggleBtnText = status === 'active' ? '🔒 Suspend' : '🔓 Activate';
    const toggleBtnClass = status === 'active' ? 'background:rgba(245,158,11,0.15); color:#fcd34d; border:1px solid rgba(245,158,11,0.3);' : 'background:rgba(34,197,94,0.15); color:#86efac; border:1px solid rgba(34,197,94,0.3);';
    const targetStatus = status === 'active' ? 'suspended' : 'active';

    return `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td>${s.email}</td>
        <td>${s.phone}</td>
        <td>
          <div>${s.city} / ${s.state}</div>
          <div style="font-size:0.75rem;color:var(--text-muted)">PAN: ${s.panNumber || '—'}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${s.address || ''}">Addr: ${s.address || '—'}</div>
        </td>
        <td style="font-size:0.83rem">
          <div>Blocks: <strong>${totalBlocks}</strong></div>
          <div style="color:var(--text-muted)">Seats: ${seatsSold} / ${totalSeats} sold</div>
        </td>
        <td>${statusBadge}</td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-sm" style="padding:4px 8px; font-size:0.75rem; background:rgba(14, 165, 233,0.15); color:#a5b4fc; border:1px solid rgba(14, 165, 233,0.3);"
              onclick="impersonate('${s.id}', 'supplier')">🔑 Login As</button>
            <button class="btn btn-sm" style="padding:4px 8px; font-size:0.75rem; background:rgba(6,182,212,0.15); color:#67e8f9; border:1px solid rgba(6,182,212,0.3);"
              onclick="openEditSupplierModal('${s.id}')">✏️ Edit</button>
            <button class="btn btn-sm" style="padding:4px 8px; font-size:0.75rem; ${toggleBtnClass}"
              onclick="toggleSupplierStatus('${s.id}', '${targetStatus}')">${toggleBtnText}</button>
            <button class="btn btn-sm" style="padding:4px 8px; font-size:0.75rem; background:rgba(239,68,68,0.15); color:#fca5a5; border:1px solid rgba(239,68,68,0.3);"
              onclick="deleteSupplier('${s.id}')">🗑️ Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function initAddSupplierForm() {
  const form = document.getElementById('addSupplierForm');
  if (form && !form.dataset.initialized) {
    form.dataset.initialized = 'true';
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const name = document.getElementById('supName').value.trim();
      const email = document.getElementById('supEmail').value.trim();
      const phone = document.getElementById('supPhone').value.trim();
      const city = document.getElementById('supCity').value.trim();
      const state = document.getElementById('supState').value.trim();
      const panNumber = document.getElementById('supPAN').value.trim().toUpperCase();
      const address = document.getElementById('supAddress').value.trim();

      let errors = [];
      if (!name) errors.push('Supplier Name');
      if (!email || !Utils.validateEmail(email)) errors.push('Valid Email');
      if (!phone || phone.length !== 10) errors.push('10-digit Phone Number');
      if (!city) errors.push('City');
      if (!state) errors.push('State');
      if (!panNumber || !Utils.validatePAN(panNumber)) errors.push('Valid PAN Card (e.g. ABCDE1234F)');
      if (!address) errors.push('Address');

      if (errors.length > 0) {
        Utils.showToast('Please fix: ' + errors.join(', '), 'error');
        return;
      }

      const supplier = {
        name,
        email,
        phone,
        city,
        state,
        panNumber,
        address
      };

      const result = Storage.addSupplier(supplier);
      if (result.success) {
        Utils.showToast('🏢 Supplier registered successfully!', 'success');
        form.reset();
        Utils.closeModal('addSupplierModal');
        renderExtranet();
      } else {
        Utils.showToast('Failed to register supplier.', 'error');
      }
    });
  }
}

function openEditSupplierModal(id) {
  const suppliers = Storage.getSuppliers();
  const s = suppliers.find(x => x.id === id);
  if (!s) return;

  document.getElementById('editSupId').value = s.id;
  document.getElementById('editSupName').value = s.name;
  document.getElementById('editSupEmail').value = s.email;
  document.getElementById('editSupPhone').value = s.phone || '';
  document.getElementById('editSupCity').value = s.city || '';
  document.getElementById('editSupState').value = s.state || '';
  document.getElementById('editSupPAN').value = s.panNumber || '';
  document.getElementById('editSupAddress').value = s.address || '';

  Utils.openModal('editSupplierModal');
}

function initEditSupplierForm() {
  const form = document.getElementById('editSupplierForm');
  if (form && !form.dataset.initialized) {
    form.dataset.initialized = 'true';
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const id = document.getElementById('editSupId').value;
      const name = document.getElementById('editSupName').value.trim();
      const email = document.getElementById('editSupEmail').value.trim();
      const phone = document.getElementById('editSupPhone').value.trim();
      const city = document.getElementById('editSupCity').value.trim();
      const state = document.getElementById('editSupState').value.trim();
      const panNumber = document.getElementById('editSupPAN').value.trim().toUpperCase();
      const address = document.getElementById('editSupAddress').value.trim();

      let errors = [];
      if (!name) errors.push('Supplier Name');
      if (!email || !Utils.validateEmail(email)) errors.push('Valid Email');
      if (!phone || phone.length !== 10) errors.push('10-digit Phone Number');
      if (!city) errors.push('City');
      if (!state) errors.push('State');
      if (!panNumber || !Utils.validatePAN(panNumber)) errors.push('Valid PAN Card (e.g. ABCDE1234F)');
      if (!address) errors.push('Address');

      if (errors.length > 0) {
        Utils.showToast('Please fix: ' + errors.join(', '), 'error');
        return;
      }

      const updates = { name, email, phone, city, state, panNumber, address };
      const result = Storage.updateSupplierDetails(id, updates);
      if (result.success) {
        Utils.showToast('🏢 Supplier coordinates updated successfully!', 'success');
        Utils.closeModal('editSupplierModal');
        renderExtranet();
      } else {
        Utils.showToast(result.error || 'Failed to update supplier.', 'error');
      }
    });
  }
}

function toggleSupplierStatus(id, newStatus) {
  const action = newStatus === 'active' ? 'activate' : 'suspend';
  if (!confirm(`Are you sure you want to ${action} this supplier?`)) return;

  const result = Storage.updateSupplierStatus(id, newStatus);
  if (result.success) {
    Utils.showToast(`🏢 Supplier ${newStatus === 'active' ? 'activated' : 'suspended'}!`, 'success');
    renderExtranet();
  } else {
    Utils.showToast('Failed to change status.', 'error');
  }
}

function deleteSupplier(id) {
  if (!confirm('Warning: Deleting this supplier will permanently delete their account and ALL of their pre-purchased inventory blocks! Continue?')) return;

  const result = Storage.removeSupplier(id);
  if (result.success) {
    Utils.showToast('🗑️ Supplier deleted successfully.', 'success');
    renderExtranet();
  } else {
    Utils.showToast('Failed to delete supplier.', 'error');
  }
}

function renderGroupBookingsTable() {
  const bookings = Storage.getAllBookings();
  const groupBookings = bookings.filter(b => b.isPrepurchased === true);
  const tbody = document.getElementById('groupBookingsTbody');
  if (!tbody) return;

  if (groupBookings.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:2rem;color:var(--text-muted)">
          No group bookings issued under pre-purchased inventory blocks.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = groupBookings.map(b => {
    const block = Storage.getPrepurchasedInventory().find(x => x.id === b.prepurchasedBlockId);
    const groupPnr = block ? block.pnr : (b.pnr || '—');
    const bookingRef = b.id ? b.id.toUpperCase().replace('BK_', 'BK-') : '—';
    const passengerNames = b.passengers.map(p => p.name).join(', ');
    
    return `
      <tr>
        <td><strong style="color:var(--accent-secondary); letter-spacing: 1px;">${groupPnr}</strong></td>
        <td>
          <strong style="color:var(--accent-primary); cursor:pointer;" onclick="viewBookingDetail('${b.id}')">${bookingRef}</strong>
        </td>
        <td style="font-size:0.83rem">
          <strong>${b.origin} → ${b.destination}</strong>
          <div style="font-size:0.75rem;color:var(--text-muted)">${b.flightNumber}</div>
        </td>
        <td>${b.airlineName}</td>
        <td style="font-size:0.82rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${passengerNames}">
          ${b.passengers.length}x — ${b.passengers[0]?.name || '—'}
        </td>
        <td style="color:var(--accent-primary);font-weight:700">${Utils.formatCurrency(b.totalFare)}</td>
        <td>${Utils.getStatusBadge(b.status)}</td>
        <td style="font-size:0.78rem;color:var(--text-muted)">${Utils.formatDateTime(b.bookedAt)}</td>
      </tr>
    `;
  }).join('');
}

// ── Impersonate User ──
function impersonate(userId, role) {
  if (!confirm(`Are you sure you want to log in as this ${role}? You will be signed out from the Admin panel.`)) {
    return;
  }
  const result = Storage.impersonateUser(userId, role);
  if (result.success) {
    Utils.showToast(`Logging in as ${role}...`, 'success');
    setTimeout(() => {
      window.location.href = result.redirect;
    }, 800);
  } else {
    Utils.showToast(result.error || 'Failed to impersonate user.', 'error');
  }
}

// ── B2B Wallet Adjustment Modal & Form ──
function openWalletModal(agentId) {
  const agent = Storage.getAgent(agentId);
  if (!agent) {
    Utils.showToast('Agent not found', 'error');
    return;
  }
  const wallet = Storage.getAgentWallet(agentId);
  
  document.getElementById('adjustAgentId').value = agentId;
  document.getElementById('adjustAgentName').value = `${agent.agencyName} (${agent.ownerName})`;
  document.getElementById('adjustCurrentBalance').textContent = Utils.formatCurrency(wallet.balance);
  document.getElementById('adjustAmount').value = '';
  document.getElementById('adjustDescription').value = '';
  
  Utils.openModal('walletAdjustModal');
}

function initWalletAdjustForm() {
  const form = document.getElementById('walletAdjustForm');
  if (!form || form.dataset.initialized) return;
  form.dataset.initialized = 'true';
  
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    
    const agentId = document.getElementById('adjustAgentId').value;
    const type = document.getElementById('adjustType').value;
    const amount = parseFloat(document.getElementById('adjustAmount').value);
    const description = document.getElementById('adjustDescription').value.trim();
    
    if (isNaN(amount) || amount <= 0) {
      Utils.showToast('Please enter a valid amount greater than 0', 'warning');
      return;
    }
    if (!description) {
      Utils.showToast('Please enter remarks/description', 'warning');
      return;
    }
    
    const result = Storage.adjustAgentWallet(agentId, type, amount, description);
    if (result.success) {
      Utils.showToast(`Wallet adjusted successfully! New balance: ${Utils.formatCurrency(result.balance)}`, 'success');
      Utils.closeModal('walletAdjustModal');
      renderAgents();
    } else {
      Utils.showToast(result.error || 'Failed to adjust wallet', 'error');
    }
  });
}

// Bind to window
window.deletePrepurchasedBlock = deletePrepurchasedBlock;
window.openEditSupplierModal = openEditSupplierModal;
window.toggleSupplierStatus = toggleSupplierStatus;
window.deleteSupplier = deleteSupplier;
window.impersonate = impersonate;
window.openWalletModal = openWalletModal;

// ── Reset Data ──
function initResetDataBtn() {
  const btn = document.getElementById('resetDataBtn');
  if (!btn) return;
  btn.addEventListener('click', function () {
    Utils.openModal('resetConfirmModal');
    document.getElementById('resetConfirmInput').value = '';
  });

  const confirmBtn = document.getElementById('confirmResetBtn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', function () {
      const inputVal = document.getElementById('resetConfirmInput').value.trim();
      if (inputVal !== 'RESET') {
        Utils.showToast('Type exactly "RESET" to confirm', 'error');
        return;
      }
      Storage.resetAllData();
      Utils.closeModal('resetConfirmModal');
      Utils.showToast('All data has been reset to defaults. Reloading...', 'warning');
      setTimeout(() => window.location.reload(), 1500);
    });
  }
}

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function () {
  // Set admin name in navbar
  const session = Storage.getSession();
  const adminNameEl = document.getElementById('adminName');
  if (adminNameEl && session) adminNameEl.textContent = session.name;

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', function () {
    Storage.logout();
    Utils.showToast('Logged out successfully', 'success');
    setTimeout(() => window.location.href = 'admin-login.html', 600);
  });

  // Commission slider
  const commSlider = document.getElementById('commissionSlider');
  if (commSlider) {
    commSlider.addEventListener('input', function () {
      document.getElementById('commissionValue').textContent = this.value + '%';
    });
  }

  // Commission save
  document.getElementById('saveCommissionBtn')?.addEventListener('click', function () {
    if (!selectedCommissionAgentId) return;
    const rate = parseFloat(document.getElementById('commissionSlider').value);
    updateCommission(selectedCommissionAgentId, rate);
  });

  // Init sidebar nav
  initSidebar();

  // Update pending badge
  updatePendingBadge();

  // Init reset data button
  initResetDataBtn();

  // Init wallet adjust form
  initWalletAdjustForm();

  // Load default panel
  switchPanel('analytics');
});


