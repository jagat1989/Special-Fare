/* ============================================================
   SPECIAL FARE — SUPPLIER EXTRANET CONTROLLER
   Overview, Deploy Inventory, My Inventory, Booking History
   ============================================================ */

// ── Session Guard ──
if (!Utils.requireSession('supplier')) {
  throw new Error('Unauthorized');
}

// ── State ──
let currentPanel = 'overview';
const sessionSupplier = Storage.getSession('supplier');

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

  // Update sidebar active class
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
    case 'overview':   renderOverview(); break;
    case 'deploy':     renderDeploy(); break;
    case 'inventory':  renderInventory(); break;
    case 'bookings':   renderBookings(); break;
    case 'profile':    renderProfile(); break;
  }
}

// ══════════════════════════════════════════════
// OVERVIEW PANEL
// ══════════════════════════════════════════════
function renderOverview() {
  const inventory = Storage.getPrepurchasedInventory().filter(b => b.supplierId === sessionSupplier.userId);
  const bookings = Storage.getAllBookings().filter(b => b.isPrepurchased === true && b.prepurchasedBlockId && inventory.some(i => i.id === b.prepurchasedBlockId));

  const totalBlocks = inventory.length;
  const totalSeats = inventory.reduce((sum, b) => sum + b.totalSeats, 0);
  const seatsSold = inventory.reduce((sum, b) => sum + (b.totalSeats - b.seatsRemaining), 0);
  
  // Financial metrics
  let totalCost = 0;
  let totalRevenue = 0;
  
  inventory.forEach(block => {
    const sold = block.totalSeats - block.seatsRemaining;
    totalCost += block.costPrice * sold;
    totalRevenue += block.sellingPrice * sold;
  });

  const estimatedMargin = totalRevenue - totalCost;

  // Set stats counters
  animateStatCard('statTotalBlocks', totalBlocks);
  animateStatCard('statTotalSeats', totalSeats);
  animateStatCard('statSeatsSold', seatsSold);
  animateStatCard('statRevenue', totalRevenue, '₹');
  animateStatCard('statCost', totalCost, '₹');
  animateStatCard('statMargin', estimatedMargin, '₹');

  // Draw chart
  const chartEl = document.getElementById('blocksFillChart');
  if (chartEl) {
    if (inventory.length === 0) {
      chartEl.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted)">No active inventory blocks to display.</div>';
    } else {
      const chartData = inventory.map(b => ({
        label: b.pnr,
        value: b.totalSeats - b.seatsRemaining
      }));
      Utils.renderBarChart('blocksFillChart', chartData, { height: 180, color: 'linear-gradient(135deg, #06b6d4, #0891b2)' });
    }
  }
}

function animateStatCard(elementId, value, prefix = '') {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (prefix === '₹') {
    el.textContent = Utils.formatCurrency(value);
  } else {
    Utils.animateCounter(el, value, 1200, prefix);
  }
}

// ══════════════════════════════════════════════
// DEPLOY PANEL
// ══════════════════════════════════════════════
function renderDeploy() {
  populateDropdowns();
  initDeployForm();
}

function populateDropdowns() {
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

function initDeployForm() {
  const form = document.getElementById('deployForm');
  if (!form || form.dataset.initialized) return;
  form.dataset.initialized = 'true';

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const pnr = document.getElementById('ppPnr').value.trim().toUpperCase();
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

    const airline = FlightData.getAirline(airlineCode);

    const block = {
      pnr,
      supplierId: sessionSupplier.userId,
      supplierName: sessionSupplier.name,
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
      switchPanel('inventory');
    } else {
      Utils.showToast('Failed to deploy block.', 'error');
    }
  });
}

// ══════════════════════════════════════════════
// INVENTORY PANEL
// ══════════════════════════════════════════════
function renderInventory() {
  const inventory = Storage.getPrepurchasedInventory().filter(b => b.supplierId === sessionSupplier.userId);
  const tbody = document.getElementById('inventoryBody');
  if (!tbody) return;

  const countEl = document.getElementById('blocksCount');
  if (countEl) countEl.textContent = `${inventory.length} blocks`;

  if (inventory.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:2rem;color:var(--text-muted)">
          <div style="font-size:1.5rem;margin-bottom:8px">🎫</div>
          No active pre-purchased inventory blocks. Use "Deploy Inventory" to add.
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
        <td><strong style="color:var(--accent-secondary); letter-spacing: 1px;">${block.pnr}</strong></td>
        <td style="font-size:0.83rem">
          <strong>${block.airlineName} (${block.flightNumber})</strong>
          <div>${block.origin} → ${block.destination}</div>
          <div style="font-size:0.75rem;color:var(--text-secondary)">${Utils.formatDate(block.date)}</div>
        </td>
        <td>${Utils.formatClass(block.fareClass)}</td>
        <td>
          <div style="font-weight:600">${block.totalSeats} / ${block.seatsRemaining}</div>
          <div style="font-size:0.75rem;color:var(--text-muted)">Remaining</div>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <div style="background:rgba(255,255,255,0.06); border-radius:10px; height:8px; width:60px; overflow:hidden; display:inline-block; border: 1px solid rgba(255,255,255,0.1)">
              <div style="background:linear-gradient(135deg, #06b6d4, #0891b2); width:${fillPercent}%; height:100%;"></div>
            </div>
            <span style="font-size:0.76rem; font-weight:600">${fillPercent}%</span>
          </div>
        </td>
        <td style="font-size:0.83rem">
          <div>C: ${Utils.formatCurrency(block.costPrice)}</div>
          <div style="color:var(--accent-secondary)">S: ${Utils.formatCurrency(block.sellingPrice)}</div>
        </td>
        <td>
          <span style="color:#22c55e; font-weight:700;">+${Utils.formatCurrency(profit)}</span>
          <div style="font-size:0.76rem; color:var(--text-muted)">(${marginPct}%)</div>
        </td>
        <td>
          <button class="btn btn-sm" style="background:rgba(239,68,68,0.15); color:#fca5a5; border:1px solid rgba(239,68,68,0.3); padding: 4px 10px; font-size: 0.78rem;"
            onclick="deleteSupplierBlock('${block.id}')">🗑️ Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

function deleteSupplierBlock(id) {
  if (!confirm('Are you sure you want to delete this inventory block? This cannot be undone.')) return;
  Storage.removePrepurchasedBlock(id);
  Utils.showToast('Block deleted successfully.', 'success');
  renderInventory();
}

// ══════════════════════════════════════════════
// BOOKINGS PANEL
// ══════════════════════════════════════════════
function renderBookings() {
  const inventory = Storage.getPrepurchasedInventory().filter(b => b.supplierId === sessionSupplier.userId);
  const bookings = Storage.getAllBookings().filter(b => b.isPrepurchased === true && b.prepurchasedBlockId && inventory.some(i => i.id === b.prepurchasedBlockId));
  
  const tbody = document.getElementById('bookingsBody');
  if (!tbody) return;

  const countBadge = document.getElementById('bookingsCountBadge');
  if (countBadge) countBadge.textContent = `${bookings.length} bookings`;

  if (bookings.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:2rem;color:var(--text-muted)">
          No bookings have been issued under your inventory blocks yet.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = bookings.map(b => {
    const block = inventory.find(i => i.id === b.prepurchasedBlockId);
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
        <td>${Utils.formatClass(b.fareClass)}</td>
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
        <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:4px">PNR Reference</div>
        <div style="font-size:1.4rem;font-weight:800;color:var(--accent-secondary);letter-spacing:2px">${booking.pnr}</div>
        <div style="margin-top:8px">${Utils.getStatusBadge(booking.status)}</div>
      </div>
      <div class="card-glass" style="padding:1.25rem;border-radius:14px">
        <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:4px">Route Details</div>
        <div style="font-weight:700">${fromCity} → ${toCity}</div>
        <div style="font-size:0.82rem;color:var(--text-muted)">${booking.flightNumber} • ${booking.airlineName}</div>
        <div style="font-size:0.82rem;color:var(--text-secondary)">${Utils.formatDate(booking.date)} • ${Utils.formatTime12(booking.departureTime)} → ${Utils.formatTime12(booking.arrivalTime)}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1.5rem">
      <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:0.85rem">
        <div style="font-size:0.75rem;color:var(--text-muted)">Fare Cabin</div>
        <div style="font-weight:600;margin-top:4px">${Utils.formatClass(booking.fareClass)}</div>
      </div>
      <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:0.85rem">
        <div style="font-size:0.75rem;color:var(--text-muted)">Payment Method</div>
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
              <th>Name</th><th>Age</th><th>Gender</th><th>ID Coordinates</th><th>Seat Pref</th>
            </tr>
          </thead>
          <tbody>${passengerRows}</tbody>
        </table>
      </div>
    </div>
  `;

  Utils.openModal('bookingDetailModal');
}

// ══════════════════════════════════════════════
// PROFILE PANEL
// ══════════════════════════════════════════════
function renderProfile() {
  document.getElementById('profId').textContent = sessionSupplier.userId;
  document.getElementById('profName').textContent = sessionSupplier.name;
  document.getElementById('profEmail').textContent = sessionSupplier.email;
  
  const suppliers = Storage.getSuppliers();
  const currentDetails = suppliers.find(s => s.id === sessionSupplier.userId) || {};
  
  document.getElementById('profPhone').textContent = currentDetails.phone || '—';
  
  const location = currentDetails.city && currentDetails.state ? `${currentDetails.city}, ${currentDetails.state}` : '—';
  document.getElementById('profLocation').textContent = location;

  const profPAN = document.getElementById('profPAN');
  if (profPAN) profPAN.textContent = currentDetails.panNumber || '—';

  const profAddress = document.getElementById('profAddress');
  if (profAddress) profAddress.textContent = currentDetails.address || '—';
}

// Bind globals
window.deleteSupplierBlock = deleteSupplierBlock;
window.viewBookingDetail = viewBookingDetail;

// ── Bootstrap ──
document.addEventListener('DOMContentLoaded', function () {
  // Set supplier name in navbar
  const session = Storage.getSession('supplier');
  const nameEl = document.getElementById('supplierName');
  if (nameEl && session) nameEl.textContent = session.name;

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', function () {
    Storage.logout('supplier');
    Utils.showToast('Logged out successfully', 'success');
    setTimeout(() => window.location.href = 'supplier-login.html', 600);
  });

  // Init sidebar
  initSidebar();

  // Real-time synchronization across tabs/windows
  window.addEventListener('storage', function (e) {
    if (e.key === 'skywings_session_supplier' && !e.newValue) {
      window.location.href = 'supplier-login.html';
      return;
    }
    if (['skywings_prepurchased_inventory', 'skywings_suppliers', 'skywings_bookings'].includes(e.key)) {
      switchPanel(currentPanel);
    }
  });

  // Load default panel
  switchPanel('overview');
});


