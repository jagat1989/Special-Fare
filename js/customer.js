/**
 * CUSTOMER DASHBOARD CONTROLLER
 * Handles B2C Customer session verification, booking list rendering, 
 * cancellation actions, and profile details update.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Guard role
  if (!Utils.requireSession('customer')) return;

  const session = Storage.getSession('customer');
  let customerBookings = [];
  let cancelTargetId = null;

  // Set visual greetings
  const displayNameEl = document.getElementById('customerDisplayName');
  if (displayNameEl) {
    displayNameEl.textContent = session.name || 'User';
  }

  // Load and cache bookings on start
  loadDashboardData();

  // Initialize Profile form on start
  initProfileForm();

  // Export functions to window scope for onclick binding
  window.switchTab = function (tabId) {
    // Nav Items
    document.querySelectorAll('.sidebar-nav-item').forEach(el => {
      if (el.dataset.tab === tabId) el.classList.add('active');
      else el.classList.remove('active');
    });

    // Content Panels
    document.querySelectorAll('.panel').forEach(el => {
      if (el.id === `panel-${tabId}`) el.classList.add('active');
      else el.classList.remove('active');
    });

    if (tabId === 'overview') {
      renderOverview();
    } else if (tabId === 'bookings') {
      renderMyBookings();
    } else if (tabId === 'profile') {
      initProfileForm();
    }
  };

  window.handleLogout = function () {
    Storage.logout('customer');
    Utils.showToast('Logged out successfully', 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  };

  // ── Load Data ────────────────────────────────────────────────────────────
  function loadDashboardData() {
    customerBookings = Storage.getBookingsByUser(session.userId) || [];
    renderOverview();
  }

  // ── Overview Tab ─────────────────────────────────────────────────────────
  function renderOverview() {
    const totalBookingsEl = document.getElementById('stat-total-bookings');
    const activeBookingsEl = document.getElementById('stat-active-bookings');
    const tbody = document.getElementById('recent-bookings-tbody');

    const total = customerBookings.length;
    const todayStr = new Date().toISOString().split('T')[0];
    const active = customerBookings.filter(b => b.travelDate >= todayStr && b.status === 'confirmed').length;

    if (totalBookingsEl) totalBookingsEl.textContent = total;
    if (activeBookingsEl) activeBookingsEl.textContent = active;

    if (!tbody) return;

    if (total === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">No bookings found</td></tr>`;
      return;
    }

    // Render top 5 recent bookings
    const recent = customerBookings.slice(0, 5);
    tbody.innerHTML = recent.map(b => {
      const routeStr = `${b.from} → ${b.to}`;
      const paxCount = b.passengers ? b.passengers.length : 1;
      const statusBadge = getStatusBadge(b.status);
      const totalPaid = Utils.formatCurrency(b.totalFare);
      const travelDate = new Date(b.travelDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      return `
        <tr>
          <td><span class="pnr-code">${b.pnr}</span></td>
          <td><strong>${routeStr}</strong></td>
          <td>${travelDate}</td>
          <td style="text-transform: capitalize;">${b.fareClass}</td>
          <td>${paxCount} pax</td>
          <td><strong>${totalPaid}</strong></td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');
  }

  // ── My Bookings Tab ──────────────────────────────────────────────────────
  window.renderMyBookings = function () {
    const tbody = document.getElementById('bookings-tbody');
    if (!tbody) return;

    if (customerBookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:2rem; color:var(--text-muted);">No bookings found</td></tr>`;
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    tbody.innerHTML = customerBookings.map(b => {
      const routeStr = `${b.from} → ${b.to}`;
      const paxCount = b.passengers ? b.passengers.length : 1;
      const statusBadge = getStatusBadge(b.status);
      const totalPaid = Utils.formatCurrency(b.totalFare);
      const travelDate = new Date(b.travelDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const flightLabel = b.flightNumber ? b.flightNumber : 'Direct';
      
      const isUpcoming = b.travelDate >= todayStr;
      const canCancel = isUpcoming && b.status === 'confirmed';

      return `
        <tr>
          <td><span class="pnr-code">${b.pnr}</span></td>
          <td><strong>${flightLabel}</strong></td>
          <td><strong>${routeStr}</strong></td>
          <td>${travelDate}</td>
          <td style="text-transform: capitalize;">${b.fareClass}</td>
          <td>${paxCount} pax</td>
          <td><strong>${totalPaid}</strong></td>
          <td>${statusBadge}</td>
          <td>
            <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
              <a href="booking.html?pnr=${b.pnr}" class="btn btn-secondary btn-sm" style="text-decoration:none; padding:0.3rem 0.6rem;">📄 View</a>
              ${canCancel ? `<button class="btn btn-sm" style="background:rgba(239,68,68,0.12); color:#ef4444; border:1px solid rgba(239,68,68,0.25); padding:0.3rem 0.6rem;" onclick="initCancelBooking('${b.id}', '${b.pnr}')">✕ Cancel</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  };

  // ── Filters & Search ─────────────────────────────────────────────────────
  window.filterBookings = function () {
    const searchVal = (document.getElementById('search-pnr')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('filter-status')?.value || '';
    const dateVal = document.getElementById('filter-date')?.value || '';

    let filtered = customerBookings;

    if (searchVal) {
      filtered = filtered.filter(b => 
        b.pnr.toLowerCase().includes(searchVal) ||
        b.from.toLowerCase().includes(searchVal) ||
        b.to.toLowerCase().includes(searchVal) ||
        (b.flightNumber && b.flightNumber.toLowerCase().includes(searchVal))
      );
    }

    if (statusVal) {
      filtered = filtered.filter(b => b.status === statusVal);
    }

    if (dateVal) {
      filtered = filtered.filter(b => b.travelDate === dateVal);
    }

    const tbody = document.getElementById('bookings-tbody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:2rem; color:var(--text-muted);">No matching bookings found</td></tr>`;
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    tbody.innerHTML = filtered.map(b => {
      const routeStr = `${b.from} → ${b.to}`;
      const paxCount = b.passengers ? b.passengers.length : 1;
      const statusBadge = getStatusBadge(b.status);
      const totalPaid = Utils.formatCurrency(b.totalFare);
      const travelDate = new Date(b.travelDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const flightLabel = b.flightNumber ? b.flightNumber : 'Direct';
      
      const isUpcoming = b.travelDate >= todayStr;
      const canCancel = isUpcoming && b.status === 'confirmed';

      return `
        <tr>
          <td><span class="pnr-code">${b.pnr}</span></td>
          <td><strong>${flightLabel}</strong></td>
          <td><strong>${routeStr}</strong></td>
          <td>${travelDate}</td>
          <td style="text-transform: capitalize;">${b.fareClass}</td>
          <td>${paxCount} pax</td>
          <td><strong>${totalPaid}</strong></td>
          <td>${statusBadge}</td>
          <td>
            <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
              <a href="booking.html?pnr=${b.pnr}" class="btn btn-secondary btn-sm" style="text-decoration:none; padding:0.3rem 0.6rem;">📄 View</a>
              ${canCancel ? `<button class="btn btn-sm" style="background:rgba(239,68,68,0.12); color:#ef4444; border:1px solid rgba(239,68,68,0.25); padding:0.3rem 0.6rem;" onclick="initCancelBooking('${b.id}', '${b.pnr}')">✕ Cancel</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  };

  window.clearFilters = function () {
    const searchInput = document.getElementById('search-pnr');
    const statusSelect = document.getElementById('filter-status');
    const dateInput = document.getElementById('filter-date');

    if (searchInput) searchInput.value = '';
    if (statusSelect) statusSelect.value = '';
    if (dateInput) dateInput.value = '';

    renderMyBookings();
  };

  // ── Cancel Booking Actions ───────────────────────────────────────────────
  window.initCancelBooking = function (bookingId, pnr) {
    cancelTargetId = bookingId;
    const pnrDisplay = document.getElementById('cancelPNRDisplay');
    if (pnrDisplay) pnrDisplay.textContent = pnr;
    Utils.openModal('cancelModal');
  };

  window.confirmCancelBooking = function () {
    if (!cancelTargetId) return;

    const result = Storage.updateBookingStatus(cancelTargetId, 'cancelled');
    Utils.closeModal('cancelModal');

    if (result.success) {
      Utils.showToast('Flight booking cancelled successfully.', 'success');
      loadDashboardData(); // Reload stats and table
      // If we are currently on bookings tab, refresh bookings table
      const bookingsPanel = document.getElementById('panel-bookings');
      if (bookingsPanel && bookingsPanel.classList.contains('active')) {
        renderMyBookings();
      }
      cancelTargetId = null;
    } else {
      Utils.showToast(result.error || 'Failed to cancel flight booking.', 'error');
    }
  };

  // ── Profile Settings Form ────────────────────────────────────────────────
  function initProfileForm() {
    const customer = Storage.getCustomer(session.userId);
    if (!customer) return;

    const nameInput = document.getElementById('prof-name');
    const phoneInput = document.getElementById('prof-phone');
    const emailInput = document.getElementById('prof-email');
    const passInput = document.getElementById('prof-pass');
    const confirmInput = document.getElementById('prof-confirm');

    if (nameInput) nameInput.value = customer.name || '';
    if (phoneInput) phoneInput.value = customer.phone || '';
    if (emailInput) emailInput.value = customer.email || '';
    if (passInput) passInput.value = '';
    if (confirmInput) confirmInput.value = '';
  }

  window.saveProfile = function () {
    const name = document.getElementById('prof-name')?.value.trim();
    const phone = document.getElementById('prof-phone')?.value.trim();
    const email = document.getElementById('prof-email')?.value.trim();
    const password = document.getElementById('prof-pass')?.value;
    const confirm = document.getElementById('prof-confirm')?.value;

    // Validation
    if (!name) {
      Utils.showToast('Please enter your full name', 'error');
      return;
    }

    if (!phone || !Utils.validatePhone(phone)) {
      Utils.showToast('Please enter a valid 10-digit phone number', 'error');
      return;
    }

    if (!email || !Utils.validateEmail(email)) {
      Utils.showToast('Please enter a valid email address', 'error');
      return;
    }

    const updateData = { name, phone, email };

    if (password) {
      if (password.length < 6) {
        Utils.showToast('Password must be at least 6 characters long', 'error');
        return;
      }
      if (password !== confirm) {
        Utils.showToast('Passwords do not match', 'error');
        return;
      }
      updateData.password = password;
    }

    const result = Storage.updateCustomerProfile(session.userId, updateData);
    if (result.success) {
      Utils.showToast('Profile updated successfully!', 'success');
      
      // Update displays
      const sessionUpdated = Storage.getSession('customer');
      if (displayNameEl) {
        displayNameEl.textContent = sessionUpdated.name || 'User';
      }
      
      // Clear passwords
      const passInput = document.getElementById('prof-pass');
      const confirmInput = document.getElementById('prof-confirm');
      if (passInput) passInput.value = '';
      if (confirmInput) confirmInput.value = '';
    } else {
      Utils.showToast(result.error || 'Failed to update profile', 'error');
    }
  };

  // ── Helper functions ─────────────────────────────────────────────────────
  function getStatusBadge(status) {
    if (status === 'confirmed') return '<span class="badge badge-success">Confirmed</span>';
    if (status === 'cancelled') return '<span class="badge badge-danger">Cancelled</span>';
    return `<span class="badge badge-warning">${status}</span>`;
  }
  // Real-time synchronization across tabs/windows
  window.addEventListener('storage', function (e) {
    if (e.key === 'skywings_session_customer' && !e.newValue) {
      window.location.href = 'index.html';
      return;
    }
    if (['skywings_bookings', 'skywings_users'].includes(e.key)) {
      loadDashboardData();
      const profileTab = document.getElementById('panel-profile');
      if (profileTab && profileTab.classList.contains('active')) {
        initProfileForm();
      }
    }
  });
});
