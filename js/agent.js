/* ============================================================
   AGENT DASHBOARD — agent.js
   Full B2B agent portal logic: overview, search, bookings,
   wallet, commission, markup manager, profile
   ============================================================ */

// ── Session Guard ──
if (!Utils.requireSession('agent')) {
  throw new Error('Unauthorized: Agent session required.');
}

// ── Global State ──
const session = Storage.getSession();
let agentData = Storage.getAgent(session.userId);
let agentBookings = [];
let allFlightResults = [];
let selectedFareClass = 'economy';
let cancelTargetId = null;

// ── Initialize ──
document.getElementById('agentDisplayName').textContent =
  (agentData && agentData.ownerName) ? agentData.ownerName : (session.name || 'Agent');

// Set min/max date for booking form
const dateInput = document.getElementById('bookDate');
if (dateInput) {
  dateInput.min = Utils.getMinDate();
  dateInput.max = Utils.getMaxDate();
  dateInput.value = Utils.getTodayString();
}

// ── Panel Switching ──
function switchPanel(panelId) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-nav-item').forEach(n => n.classList.remove('active'));

  const panel = document.getElementById(`panel-${panelId}`);
  if (panel) panel.classList.add('active');

  const navItem = document.querySelector(`[data-panel="${panelId}"]`);
  if (navItem) navItem.classList.add('active');

  // Lazy-render each panel
  switch (panelId) {
    case 'overview':      renderOverview(); break;
    case 'book-flight':   renderBookFlight(); break;
    case 'my-bookings':   renderMyBookings(); break;
    case 'wallet':        renderWallet(); break;
    case 'commission':    renderCommissionTracker(); break;
    case 'markup':        renderMarkupManager(); break;
    case 'profile':       renderProfile(); break;
  }
}

// ── Logout ──
function handleLogout() {
  Storage.logout();
  Utils.showToast('Logged out successfully. See you soon! 👋', 'success');
  setTimeout(() => { window.location.href = 'agent-login.html'; }, 800);
}

// ══════════════════════════════════════════════════
// OVERVIEW PANEL
// ══════════════════════════════════════════════════
function renderOverview() {
  agentBookings = Storage.getBookingsByAgent(session.userId);
  const wallet = Storage.getAgentWallet(session.userId);

  // Today's bookings
  const todayStr = Utils.getTodayString();
  const todayBookings = agentBookings.filter(b => b.bookedAt && b.bookedAt.startsWith(todayStr));

  // Total revenue (confirmed)
  const confirmedBookings = agentBookings.filter(b => b.status === 'confirmed');
  const totalRevenue = confirmedBookings.reduce((s, b) => s + (b.totalFare || 0), 0);
  const totalCommission = confirmedBookings.reduce((s, b) => s + (b.agentCommission || 0), 0);

  // Animate counters
  const statToday = document.getElementById('stat-today');
  const statRevenue = document.getElementById('stat-revenue');
  const statComm = document.getElementById('stat-commission');
  const statWallet = document.getElementById('stat-wallet');

  if (statToday) Utils.animateCounter(statToday, todayBookings.length, 800);
  if (statRevenue) statRevenue.textContent = Utils.formatCurrency(totalRevenue);
  if (statComm) statComm.textContent = Utils.formatCurrency(totalCommission);
  if (statWallet) statWallet.textContent = Utils.formatCurrency(wallet.balance);

  // Recent bookings table (last 8)
  const tbody = document.getElementById('recentBookingsTbody');
  if (!tbody) return;

  const recent = agentBookings.slice(0, 8);
  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted);">
      No bookings yet. <a href="#" onclick="switchPanel('book-flight');return false;" style="color:var(--accent-primary);">Book your first flight →</a>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = recent.map(b => `
    <tr>
      <td><span class="pnr-code">${b.pnr}</span></td>
      <td>
        <strong style="color:var(--text-primary);">${b.origin}</strong>
        <span style="color:var(--text-muted);margin:0 0.3rem;">→</span>
        <strong style="color:var(--text-primary);">${b.destination}</strong>
        <div style="font-size:0.72rem;color:var(--text-muted);">${b.flightNumber} · ${b.airlineName}</div>
      </td>
      <td style="white-space:nowrap;">${Utils.formatDate(b.date)}</td>
      <td>${b.passengers && b.passengers.length > 0 ? b.passengers[0].name : '—'}
        ${b.passengers && b.passengers.length > 1 ? `<span style="color:var(--text-muted);font-size:0.72rem;"> +${b.passengers.length - 1} more</span>` : ''}
      </td>
      <td>${Utils.formatCurrency(b.totalFare)}</td>
      <td>${Utils.getStatusBadge(b.status)}</td>
      <td class="${b.agentCommission > 0 ? 'txn-positive' : ''}">${Utils.formatCurrency(b.agentCommission || 0)}</td>
    </tr>
  `).join('');
}

// ══════════════════════════════════════════════════
// BOOK FLIGHT PANEL
// ══════════════════════════════════════════════════
function renderBookFlight() {
  // Show markup indicator
  if (agentData) {
    const rules = Storage.getMarkupRules(session.userId);
    const indicator = document.getElementById('markupIndicator');
    const indicatorText = document.getElementById('markupIndicatorText');
    if (indicator && indicatorText) {
      if (rules.length > 0) {
        const descriptions = rules.map(r => {
          if (r.type === 'flat') return `+₹${r.amount} (${r.applyTo === 'all' ? 'all flights' : r.applyTo})`;
          return `+${r.amount}% (${r.applyTo === 'all' ? 'all flights' : r.applyTo})`;
        });
        indicatorText.textContent = `Active markup rules: ${descriptions.join(', ')} — applied to all booking prices below.`;
        indicator.style.display = 'block';
      } else {
        indicatorText.textContent = 'No markup rules configured. Prices shown at base rates.';
        indicator.style.display = 'block';
      }
    }
  }

  // Setup autocomplete for book-flight search inputs
  setupAutocomplete('bookFrom', 'bookFromDD', 'bookFromCode');
  setupAutocomplete('bookTo', 'bookToDD', 'bookToCode');
}

// Autocomplete engine
function setupAutocomplete(inputId, dropdownId, hiddenId) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  const hidden = document.getElementById(hiddenId);
  if (!input || !dropdown) return;

  // Prevent duplicate listeners
  if (input.dataset.acInit) return;
  input.dataset.acInit = '1';

  input.addEventListener('input', function () {
    const q = this.value.trim().toLowerCase();
    hidden.value = '';
    if (q.length < 1) { dropdown.classList.remove('open'); return; }

    const matches = FlightData.AIRPORTS.filter(a =>
      a.code.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.state.toLowerCase().includes(q)
    ).slice(0, 8);

    if (matches.length === 0) { dropdown.classList.remove('open'); return; }

    dropdown.innerHTML = matches.map(a => `
      <div class="autocomplete-item" onclick="selectAirport('${inputId}', '${dropdownId}', '${hiddenId}', '${a.code}', '${a.city}')">
        <span class="ac-code">${a.code}</span>
        <span class="ac-city"> — ${a.city}</span>
        <div class="ac-name">${a.name}</div>
      </div>
    `).join('');
    dropdown.classList.add('open');
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { dropdown.classList.remove('open'); }
  });

  document.addEventListener('click', function (e) {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });
}

function selectAirport(inputId, dropdownId, hiddenId, code, city) {
  document.getElementById(inputId).value = `${city} (${code})`;
  document.getElementById(hiddenId).value = code;
  document.getElementById(dropdownId).classList.remove('open');
}

function selectClass(cls) {
  selectedFareClass = cls;
  document.querySelectorAll('#classSelector .btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(`cls-${cls}`);
  if (btn) btn.classList.add('active');
  renderFlightCards(allFlightResults);
}

function searchFlights() {
  const fromCode = document.getElementById('bookFromCode').value;
  const toCode = document.getElementById('bookToCode').value;
  const date = document.getElementById('bookDate').value;
  const passengers = parseInt(document.getElementById('bookPassengers').value) || 1;

  if (!fromCode) { Utils.showToast('Please select a departure city.', 'warning'); return; }
  if (!toCode) { Utils.showToast('Please select a destination city.', 'warning'); return; }
  if (fromCode === toCode) { Utils.showToast('Origin and destination cannot be the same.', 'warning'); return; }
  if (!date) { Utils.showToast('Please select a travel date.', 'warning'); return; }

  const btn = document.getElementById('bookSearchBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Searching...'; }

  const area = document.getElementById('flightResultsArea');
  area.innerHTML = `<div class="empty-state"><div class="empty-icon"><div class="spinner" style="margin:auto;"></div></div><h3>Searching flights...</h3></div>`;

  setTimeout(() => {
    allFlightResults = Storage.searchAllFlights(fromCode, toCode, date);

    if (btn) { btn.disabled = false; btn.textContent = '🔍 Search'; }

    // Show class selector
    document.getElementById('classSelector').style.display = 'flex';

    if (allFlightResults.length === 0) {
      area.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">✈</div>
          <h3>No flights found</h3>
          <p>No flights available for ${fromCode} → ${toCode} on ${Utils.formatDate(date)}.<br>Try a different date.</p>
        </div>`;
      return;
    }

    renderFlightCards(allFlightResults, passengers);
  }, 600);
}

function renderFlightCards(flights, passengers) {
  passengers = passengers || parseInt(document.getElementById('bookPassengers').value) || 1;
  const area = document.getElementById('flightResultsArea');
  const date = document.getElementById('bookDate').value;

  // Filter flights that have the selected class
  const available = flights.filter(f => f.prices && f.prices[selectedFareClass] !== undefined);

  if (available.length === 0) {
    area.innerHTML = `<div class="empty-state"><div class="empty-icon">🪑</div><h3>No ${selectedFareClass.replace('_', ' ')} class available</h3><p>Try a different cabin class.</p></div>`;
    return;
  }

  const resultsHtml = available.map(f => {
    const basePrice = f.prices[selectedFareClass];
    const markup = Storage.calculateAgentMarkup(session.userId, f);
    const totalPrice = basePrice + markup;
    const seats = f.availableSeats && f.availableSeats[selectedFareClass] !== undefined
      ? f.availableSeats[selectedFareClass] : '—';

    return `
      <div class="flight-result-card">
        <div class="airline-info">
          <div class="airline-logo-sm" style="background:${f.airlineColor}22;border:1px solid ${f.airlineColor}44;">
            <span>${f.airlineLogo}</span>
          </div>
          <div>
            <div class="airline-name-sm">${f.airlineName}</div>
            <div class="airline-num">${f.flightNumber}</div>
          </div>
        </div>

        <div class="route-info">
          <div class="route-point">
            <div class="route-time">${Utils.formatTime12(f.departureTime)}</div>
            <div class="route-code">${f.origin}</div>
          </div>
          <div class="route-line">
            <div class="route-duration">${Utils.formatDuration(f.duration)}</div>
            <div class="route-line-bar"></div>
            <div class="route-stop">Non-stop</div>
          </div>
          <div class="route-point">
            <div class="route-time">${Utils.formatTime12(f.arrivalTime)}</div>
            <div class="route-code">${f.destination}</div>
          </div>
        </div>

        <div style="text-align:center; min-width:80px;">
          <div style="font-size:0.75rem; color:var(--text-muted);">Seats</div>
          <div style="font-size:1rem; font-weight:700; color:${seats < 10 ? '#ef4444' : '#22c55e'};">${seats}</div>
        </div>

        <div class="flight-price-block">
          ${markup > 0 ? `<div class="flight-price-orig">${Utils.formatCurrency(basePrice)}</div>` : ''}
          <div class="flight-price">${Utils.formatCurrency(totalPrice)}</div>
          <div style="font-size:0.72rem; color:var(--text-muted);">per person · ${selectedFareClass.replace('_', ' ')}</div>
          ${markup > 0 ? `<div class="markup-badge">+${Utils.formatCurrency(markup)} markup</div>` : ''}
          <button class="btn btn-primary btn-sm" style="margin-top:0.6rem; width:100%;"
            onclick="bookThisFlight('${f.id}', '${selectedFareClass}', ${passengers})">
            Book →
          </button>
        </div>
      </div>
    `;
  }).join('');

  const fromAirport = FlightData.getAirport(available[0].origin);
  const toAirport = FlightData.getAirport(available[0].destination);

  area.innerHTML = `
    <div style="margin-bottom:1rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.5rem;">
      <div style="color:var(--text-secondary); font-size:0.875rem;">
        ✈ <strong style="color:var(--text-primary);">${available.length} flights</strong> from
        <strong style="color:var(--text-primary);">${fromAirport ? fromAirport.city : available[0].origin}</strong> to
        <strong style="color:var(--text-primary);">${toAirport ? toAirport.city : available[0].destination}</strong>
        on ${Utils.formatDate(available[0].date)}
      </div>
      <div style="font-size:0.78rem; color:var(--text-muted);">Markup prices shown · ${passengers} passenger${passengers > 1 ? 's' : ''}</div>
    </div>
    ${resultsHtml}
  `;
}

function bookThisFlight(flightId, fareClass, passengers) {
  const date = document.getElementById('bookDate').value;
  const flight = allFlightResults.find(f => f.id === flightId);
  const from = flight ? flight.origin : '';
  const to = flight ? flight.destination : '';
  const url = `booking.html?flightId=${flightId}&class=${fareClass}&passengers=${passengers}&date=${date}&from=${from}&to=${to}&agentId=${session.userId}`;
  window.location.href = url;
}

// ══════════════════════════════════════════════════
// MY BOOKINGS PANEL
// ══════════════════════════════════════════════════
function renderMyBookings() {
  agentBookings = Storage.getBookingsByAgent(session.userId);
  renderBookingsTable(agentBookings);
}

function renderBookingsTable(bookings) {
  const tbody = document.getElementById('myBookingsTbody');
  if (!tbody) return;

  if (bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:2.5rem;color:var(--text-muted);">
      <div style="font-size:2rem;margin-bottom:0.5rem;">📋</div>
      No bookings found. <a href="#" onclick="switchPanel('book-flight');return false;" style="color:var(--accent-primary);">Book your first flight →</a>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = bookings.map(b => {
    const paxNames = b.passengers ? b.passengers.map(p => p.name).join(', ') : '—';
    const canCancel = b.status === 'confirmed';
    return `
      <tr>
        <td><span class="pnr-code">${b.pnr}</span></td>
        <td>
          <strong style="color:var(--text-primary);">${b.origin} → ${b.destination}</strong>
          <div style="font-size:0.72rem;color:var(--text-muted);">${b.flightNumber} · ${Utils.formatClass(b.fareClass)}</div>
        </td>
        <td style="white-space:nowrap;">${Utils.formatDate(b.date)}</td>
        <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${paxNames}">
          ${paxNames}
        </td>
        <td>${Utils.formatCurrency(b.baseFare)}</td>
        <td>${Utils.formatCurrency(b.agentMarkup || 0)}</td>
        <td><strong style="color:var(--text-primary);">${Utils.formatCurrency(b.totalFare)}</strong></td>
        <td class="txn-positive">${Utils.formatCurrency(b.agentCommission || 0)}</td>
        <td>${Utils.getStatusBadge(b.status)}</td>
        <td>
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
            <button class="btn btn-sm btn-secondary" onclick="viewTicket('${b.pnr}')">🎫 View</button>
            ${canCancel ? `<button class="btn btn-sm" style="background:rgba(239,68,68,0.12);color:#ef4444;border:1px solid rgba(239,68,68,0.25);" onclick="initCancelBooking('${b.id}', '${b.pnr}')">✕ Cancel</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterBookings() {
  agentBookings = Storage.getBookingsByAgent(session.userId);
  const query = (document.getElementById('bookingSearch').value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('bookingStatusFilter').value;
  const dateFrom = document.getElementById('bookingDateFrom').value;
  const dateTo = document.getElementById('bookingDateTo').value;

  let filtered = agentBookings;

  if (query) {
    filtered = filtered.filter(b =>
      b.pnr.toLowerCase().includes(query) ||
      b.origin.toLowerCase().includes(query) ||
      b.destination.toLowerCase().includes(query) ||
      b.flightNumber.toLowerCase().includes(query) ||
      (b.passengers && b.passengers.some(p => p.name.toLowerCase().includes(query)))
    );
  }

  if (statusFilter) {
    filtered = filtered.filter(b => b.status === statusFilter);
  }

  if (dateFrom) {
    filtered = filtered.filter(b => b.date >= dateFrom);
  }

  if (dateTo) {
    filtered = filtered.filter(b => b.date <= dateTo);
  }

  renderBookingsTable(filtered);
}

function clearBookingFilters() {
  document.getElementById('bookingSearch').value = '';
  document.getElementById('bookingStatusFilter').value = '';
  document.getElementById('bookingDateFrom').value = '';
  document.getElementById('bookingDateTo').value = '';
  renderMyBookings();
}

function viewTicket(pnr) {
  window.open(`booking.html?pnr=${pnr}`, '_blank');
}

function initCancelBooking(bookingId, pnr) {
  cancelTargetId = bookingId;
  document.getElementById('cancelPNRDisplay').textContent = pnr;
  Utils.openModal('cancelModal');
}

function confirmCancelBooking() {
  if (!cancelTargetId) return;

  const result = Storage.updateBookingStatus(cancelTargetId, 'cancelled');
  Utils.closeModal('cancelModal');

  if (result.success) {
    Utils.showToast('Booking cancelled successfully.', 'success');
    cancelTargetId = null;
    renderMyBookings();
  } else {
    Utils.showToast(result.error || 'Failed to cancel booking.', 'error');
  }
}

// ══════════════════════════════════════════════════
// WALLET PANEL
// ══════════════════════════════════════════════════
function renderWallet() {
  const wallet = Storage.getAgentWallet(session.userId);

  // Animate balance
  const balEl = document.getElementById('walletBalance');
  if (balEl) balEl.textContent = Utils.formatCurrency(wallet.balance);

  const earnedEl = document.getElementById('walletTotalEarned');
  if (earnedEl) earnedEl.textContent = Utils.formatCurrency(wallet.totalEarned);

  const withdrawnEl = document.getElementById('walletTotalWithdrawn');
  if (withdrawnEl) withdrawnEl.textContent = Utils.formatCurrency(wallet.totalWithdrawn);

  const pendingEl = document.getElementById('walletPending');
  if (pendingEl) pendingEl.textContent = Utils.formatCurrency(0); // Placeholder

  // Transactions
  const transactions = Storage.getAgentTransactions(session.userId);
  const tbody = document.getElementById('transactionsTbody');
  if (!tbody) return;

  if (transactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-muted);">No transactions yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = transactions.map(t => {
    const isPositive = t.amount > 0;
    return `
      <tr>
        <td style="white-space:nowrap;">${Utils.formatDateTime(t.date)}</td>
        <td>${t.description}</td>
        <td class="${isPositive ? 'txn-positive' : 'txn-negative'}">
          ${isPositive ? '+' : ''}${Utils.formatCurrency(Math.abs(t.amount))}
        </td>
        <td>${Utils.formatCurrency(t.balance)}</td>
      </tr>
    `;
  }).join('');
}

function requestWithdrawal() {
  const amountInput = document.getElementById('withdrawAmount');
  const amount = parseFloat(amountInput.value);
  const wallet = Storage.getAgentWallet(session.userId);

  if (!amount || isNaN(amount) || amount <= 0) {
    Utils.showToast('Please enter a valid withdrawal amount.', 'warning');
    amountInput.focus();
    return;
  }

  if (amount < 100) {
    Utils.showToast('Minimum withdrawal amount is ₹100.', 'warning');
    return;
  }

  if (amount > wallet.balance) {
    Utils.showToast(`Insufficient balance. Available: ${Utils.formatCurrency(wallet.balance)}`, 'error');
    return;
  }

  const result = Storage.requestWithdrawal(session.userId, amount);

  if (result.success) {
    Utils.showToast(`Withdrawal of ${Utils.formatCurrency(amount)} requested successfully! Will be processed within 2-3 business days.`, 'success', 5000);
    amountInput.value = '';
    renderWallet();
  } else {
    Utils.showToast(result.error || 'Withdrawal failed. Please try again.', 'error');
  }
}

// ══════════════════════════════════════════════════
// COMMISSION TRACKER PANEL
// ══════════════════════════════════════════════════
function renderCommissionTracker() {
  agentBookings = Storage.getBookingsByAgent(session.userId);
  const confirmed = agentBookings.filter(b => b.status === 'confirmed');

  // Date calculations
  const todayStr = Utils.getTodayString();
  const today = new Date(todayStr + 'T00:00:00');
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const commToday = confirmed
    .filter(b => b.bookedAt && b.bookedAt.startsWith(todayStr))
    .reduce((s, b) => s + (b.agentCommission || 0), 0);

  const commWeek = confirmed
    .filter(b => {
      if (!b.bookedAt) return false;
      const d = new Date(b.bookedAt);
      return d >= weekStart;
    })
    .reduce((s, b) => s + (b.agentCommission || 0), 0);

  const commMonth = confirmed
    .filter(b => {
      if (!b.bookedAt) return false;
      const d = new Date(b.bookedAt);
      return d >= monthStart;
    })
    .reduce((s, b) => s + (b.agentCommission || 0), 0);

  const commTodayEl = document.getElementById('commToday');
  const commWeekEl = document.getElementById('commWeek');
  const commMonthEl = document.getElementById('commMonth');

  if (commTodayEl) commTodayEl.textContent = Utils.formatCurrency(commToday);
  if (commWeekEl) commWeekEl.textContent = Utils.formatCurrency(commWeek);
  if (commMonthEl) commMonthEl.textContent = Utils.formatCurrency(commMonth);

  // Bar chart: last 7 days
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    const dayComm = confirmed
      .filter(b => b.bookedAt && b.bookedAt.startsWith(dStr))
      .reduce((s, b) => s + (b.agentCommission || 0), 0);

    last7.push({
      label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      value: dayComm
    });
  }

  Utils.renderBarChart('commissionChart', last7, { height: 180, currency: true, color: 'var(--accent-gradient)' });

  // Commission table
  const tbody = document.getElementById('commissionTbody');
  if (!tbody) return;

  if (agentBookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted);">No bookings yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = agentBookings.map(b => {
    const commRate = agentData ? agentData.commissionRate : 5;
    const commEarned = b.agentCommission || 0;
    return `
      <tr>
        <td><span class="pnr-code">${b.pnr}</span></td>
        <td>${b.origin} → ${b.destination}</td>
        <td style="white-space:nowrap;">${Utils.formatDateTime(b.bookedAt)}</td>
        <td>${Utils.formatCurrency(b.baseFare)}</td>
        <td>${commRate}%</td>
        <td class="${commEarned > 0 ? 'txn-positive' : ''}">${Utils.formatCurrency(commEarned)}</td>
        <td>${Utils.getStatusBadge(b.status)}</td>
      </tr>
    `;
  }).join('');
}

// ══════════════════════════════════════════════════
// MARKUP MANAGER PANEL
// ══════════════════════════════════════════════════
function renderMarkupManager() {
  const rules = Storage.getMarkupRules(session.userId);
  const tbody = document.getElementById('markupRulesTbody');
  const countEl = document.getElementById('rulesCount');

  if (countEl) countEl.textContent = `${rules.length} rule${rules.length !== 1 ? 's' : ''}`;
  if (!tbody) return;

  if (rules.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">
      No markup rules configured yet. Add your first rule above.
    </td></tr>`;
    return;
  }

  const applyToLabels = {
    all: 'All Flights',
    '6E': 'IndiGo (6E)',
    AI: 'Air India (AI)',
    UK: 'Vistara (UK)',
    SG: 'SpiceJet (SG)',
    QP: 'Akasa Air (QP)',
    G8: 'Go First (G8)'
  };

  tbody.innerHTML = rules.map((r, i) => `
    <tr class="markup-rule-row">
      <td style="color:var(--text-muted);">${i + 1}</td>
      <td>
        <span class="badge ${r.type === 'flat' ? 'badge-info' : 'badge-warning'}">
          ${r.type === 'flat' ? '₹ Flat' : '% Percentage'}
        </span>
      </td>
      <td><strong style="color:var(--text-primary);">${r.type === 'flat' ? Utils.formatCurrency(r.amount) : r.amount + '%'}</strong></td>
      <td>${applyToLabels[r.applyTo] || r.applyTo}</td>
      <td style="color:var(--text-muted);">${r.description || (r.type === 'flat' ? `Flat ${Utils.formatCurrency(r.amount)} markup` : `${r.amount}% markup`)}</td>
      <td>
        <button class="btn btn-sm" style="background:rgba(239,68,68,0.12);color:#ef4444;border:1px solid rgba(239,68,68,0.25);"
          onclick="deleteMarkupRule('${r.id}')">🗑 Delete</button>
      </td>
    </tr>
  `).join('');
}

function updateRuleTypeHint() {
  const type = document.getElementById('ruleType').value;
  const label = document.getElementById('ruleAmountLabel');
  const hint = document.getElementById('ruleHint');
  if (label) label.textContent = type === 'flat' ? 'Amount (₹)' : 'Percentage (%)';
  if (hint) {
    hint.textContent = type === 'flat'
      ? '💡 Flat markup adds a fixed ₹ amount to every booking fare.'
      : '💡 Percentage markup adds a % of the base fare to every booking.';
  }
}

function addMarkupRule() {
  const type = document.getElementById('ruleType').value;
  const amount = parseFloat(document.getElementById('ruleAmount').value);
  const applyTo = document.getElementById('ruleApplyTo').value;

  if (!amount || isNaN(amount) || amount <= 0) {
    Utils.showToast('Please enter a valid markup amount.', 'warning');
    return;
  }

  if (type === 'percentage' && amount > 100) {
    Utils.showToast('Percentage cannot exceed 100%.', 'warning');
    return;
  }

  const applyToLabels = {
    all: 'All Flights', '6E': 'IndiGo', AI: 'Air India', UK: 'Vistara',
    SG: 'SpiceJet', QP: 'Akasa Air', G8: 'Go First'
  };

  const rule = {
    type,
    amount,
    applyTo,
    description: `${type === 'flat' ? '₹' + amount : amount + '%'} markup on ${applyToLabels[applyTo] || applyTo}`
  };

  const result = Storage.addMarkupRule(session.userId, rule);

  if (result.success) {
    Utils.showToast('Markup rule added successfully!', 'success');
    document.getElementById('ruleAmount').value = '';
    renderMarkupManager();
  } else {
    Utils.showToast('Failed to add rule. Please try again.', 'error');
  }
}

function deleteMarkupRule(ruleId) {
  if (!confirm('Are you sure you want to delete this markup rule?')) return;

  const result = Storage.removeMarkupRule(session.userId, ruleId);
  if (result.success) {
    Utils.showToast('Markup rule deleted.', 'success');
    renderMarkupManager();
  } else {
    Utils.showToast('Failed to delete rule.', 'error');
  }
}

// ══════════════════════════════════════════════════
// PROFILE PANEL
// ══════════════════════════════════════════════════
function renderProfile() {
  // Refresh agent data
  agentData = Storage.getAgent(session.userId);
  if (!agentData) return;

  // Avatar initial
  const avatar = document.getElementById('profileAvatar');
  if (avatar) avatar.textContent = agentData.agencyName ? agentData.agencyName[0].toUpperCase() : 'A';

  const agencyNameEl = document.getElementById('profileAgencyName');
  if (agencyNameEl) agencyNameEl.textContent = agentData.agencyName || '—';

  const ownerNameEl = document.getElementById('profileOwnerName');
  if (ownerNameEl) ownerNameEl.textContent = agentData.ownerName || '—';

  const statusEl = document.getElementById('profileStatus');
  if (statusEl) statusEl.innerHTML = Utils.getStatusBadge(agentData.status);

  const commRateEl = document.getElementById('profileCommRate');
  if (commRateEl) commRateEl.textContent = (agentData.commissionRate || 5) + '%';

  // Bookings count
  const bkgs = Storage.getBookingsByAgent(session.userId);
  const totalBkEl = document.getElementById('profileTotalBookings');
  if (totalBkEl) totalBkEl.textContent = bkgs.length;

  // Total earned
  const wallet = Storage.getAgentWallet(session.userId);
  const totalEarnedEl = document.getElementById('profileTotalEarned');
  if (totalEarnedEl) totalEarnedEl.textContent = Utils.formatCurrency(wallet.totalEarned);

  // Profile grid
  const grid = document.getElementById('profileDetails');
  if (!grid) return;

  const fields = [
    { label: 'Agency Name', value: agentData.agencyName || '—' },
    { label: 'Owner / Contact', value: agentData.ownerName || '—' },
    { label: 'Email Address', value: agentData.email || '—' },
    { label: 'Phone Number', value: agentData.phone || '—' },
    { label: 'GST Number', value: agentData.gstNumber || '—' },
    { label: 'PAN Number', value: agentData.panNumber || '—' },
    { label: 'City', value: agentData.city || '—' },
    { label: 'State', value: agentData.state || '—' },
    { label: 'Office Address', value: agentData.address || '—' },
    { label: 'Member Since', value: agentData.createdAt ? Utils.formatDate(agentData.createdAt) : '—' },
    { label: 'Agent ID', value: agentData.id || '—' },
  ];

  grid.innerHTML = fields.map(f => `
    <div class="profile-field">
      <label>${f.label}</label>
      <span>${f.value}</span>
    </div>
  `).join('');
}

// ══════════════════════════════════════════════════
// INITIALIZATION — render overview on load
// ══════════════════════════════════════════════════
(function init() {
  renderOverview();
  // Setup autocomplete for book-flight (in case panel is pre-loaded)
  setTimeout(() => {
    setupAutocomplete('bookFrom', 'bookFromDD', 'bookFromCode');
    setupAutocomplete('bookTo', 'bookToDD', 'bookToCode');
  }, 100);
})();
