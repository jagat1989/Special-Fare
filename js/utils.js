/* ============================================================
   FLIGHT BOOKING ENGINE — UTILITIES
   Formatters, Toasts, Modals, Validators, Chart Helpers
   ============================================================ */

const Utils = (() => {

  // ── Currency Formatter (Indian Number System) ──
  function formatCurrency(amount) {
    if (isNaN(amount)) return '₹0';
    return '₹' + Number(amount).toLocaleString('en-IN');
  }

  // ── Date Formatter ──
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  function formatDateFull(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    return date.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }

  function formatDateTime(isoStr) {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    return date.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  function getTodayString() {
    return new Date().toISOString().split('T')[0];
  }

  function getMinDate() {
    return getTodayString();
  }

  function getMaxDate() {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  }

  function getDayOfWeek(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-IN', { weekday: 'short' });
  }

  // ── Duration Formatter ──
  function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  // ── Time Formatter ──
  function formatTime12(time24) {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  }

  // ── PNR Generator (fallback if storage not available) ──
  function generatePNR() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let pnr = 'SPF';
    for (let i = 0; i < 5; i++) {
      pnr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pnr;
  }

  // ── Validators ──
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePhone(phone) {
    return /^[6-9]\d{9}$/.test(phone.replace(/\s/g, ''));
  }

  function validateAadhaar(aadhaar) {
    return /^\d{4}\s?\d{4}\s?\d{4}$/.test(aadhaar);
  }

  function validatePAN(pan) {
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase());
  }

  function validatePassport(passport) {
    return /^[A-Z][0-9]{7}$/.test(passport.toUpperCase());
  }

  function validateGST(gst) {
    return /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(gst.toUpperCase());
  }

  function validateRequired(value) {
    return value !== null && value !== undefined && String(value).trim() !== '';
  }

  function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.classList.add('error');
    let errorEl = field.parentElement.querySelector('.form-error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'form-error';
      field.parentElement.appendChild(errorEl);
    }
    errorEl.textContent = message;
  }

  function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.classList.remove('error');
    const errorEl = field.parentElement.querySelector('.form-error');
    if (errorEl) errorEl.textContent = '';
  }

  function clearAllErrors(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.querySelectorAll('.form-error').forEach(el => el.textContent = '');
    form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
  }

  // ── Toast Notifications ──
  let toastContainer = null;

  function _getToastContainer() {
    if (!toastContainer) {
      toastContainer = document.getElementById('toast-container');
      if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
      }
    }
    return toastContainer;
  }

  function showToast(message, type = 'info', duration = 4000) {
    const container = _getToastContainer();
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);

    return toast;
  }

  // ── Modal Manager ──
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
      m.classList.remove('active');
    });
    document.body.style.overflow = '';
  }

  // Close modal on overlay click
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  // ── Loading Overlay ──
  let loadingOverlay = null;

  function showLoading(text = 'Processing...') {
    if (!loadingOverlay) {
      loadingOverlay = document.createElement('div');
      loadingOverlay.className = 'loading-overlay';
      loadingOverlay.innerHTML = `
        <div class="spinner"></div>
        <p class="loading-text">${text}</p>
      `;
      document.body.appendChild(loadingOverlay);
    } else {
      loadingOverlay.querySelector('.loading-text').textContent = text;
      loadingOverlay.style.display = 'flex';
    }
  }

  function hideLoading() {
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
  }

  // ── Debounce / Throttle ──
  function debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function throttle(fn, limit = 100) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  // ── URL Params ──
  function getUrlParams() {
    const params = {};
    new URLSearchParams(window.location.search).forEach((v, k) => params[k] = v);
    return params;
  }

  function buildUrl(base, params) {
    const url = new URL(base, window.location.origin);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return url.pathname + url.search;
  }

  // ── Animated Counter ──
  function animateCounter(element, target, duration = 1500, prefix = '', suffix = '') {
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);
      element.textContent = prefix + current.toLocaleString('en-IN') + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  // ── Intersection Observer for Animations ──
  function observeElements(selector, className = 'animate-fadeInUp') {
    const elements = document.querySelectorAll(selector);
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add(className);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    elements.forEach(el => observer.observe(el));
  }

  // ── Status Badge HTML ──
  function getStatusBadge(status) {
    const map = {
      confirmed: '<span class="badge badge-success">✓ Confirmed</span>',
      cancelled: '<span class="badge badge-danger">✕ Cancelled</span>',
      pending: '<span class="badge badge-warning">⏳ Pending</span>',
      refunded: '<span class="badge badge-info">↩ Refunded</span>',
      approved: '<span class="badge badge-success">✓ Approved</span>',
      rejected: '<span class="badge badge-danger">✕ Rejected</span>'
    };
    return map[status] || `<span class="badge badge-neutral">${status}</span>`;
  }

  // ── Class Name Formatter ──
  function formatClass(cls) {
    const map = {
      economy: '🟢 Economy',
      premium_economy: '🔵 Premium Economy',
      business: '🟣 Business'
    };
    return map[cls] || cls;
  }

  // ── Seat Map Generator ──
  function generateSeatMap(rows, cols, occupiedSeats = [], fareClass = 'economy') {
    const container = document.createElement('div');
    container.className = 'seat-map';

    const classColors = {
      economy: 'available',
      premium_economy: 'available',
      business: 'available'
    };

    // Header row letters
    const headerRow = document.createElement('div');
    headerRow.className = 'seat-row';
    headerRow.innerHTML = '<div class="seat aisle"></div>';
    const letters = cols === 6 ? ['A', 'B', 'C', '', 'D', 'E', 'F'] : ['A', 'B', '', 'C', 'D'];
    letters.forEach(l => {
      const cell = document.createElement('div');
      cell.style.cssText = 'width:32px;text-align:center;font-size:0.7rem;color:var(--text-muted);font-weight:600;';
      cell.textContent = l;
      headerRow.appendChild(cell);
    });
    container.appendChild(headerRow);

    const selectedSeats = new Set();

    for (let row = 1; row <= rows; row++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'seat-row';

      // Row number
      const rowNum = document.createElement('div');
      rowNum.style.cssText = 'width:24px;font-size:0.7rem;color:var(--text-muted);text-align:right;padding-right:4px;';
      rowNum.textContent = row;
      rowEl.appendChild(rowNum);

      const colLetters = cols === 6 ? ['A', 'B', 'C', 'AISLE', 'D', 'E', 'F'] : ['A', 'B', 'AISLE', 'C', 'D'];

      colLetters.forEach(col => {
        if (col === 'AISLE') {
          const aisle = document.createElement('div');
          aisle.className = 'seat aisle';
          rowEl.appendChild(aisle);
          return;
        }

        const seatId = `${row}${col}`;
        const seat = document.createElement('div');
        seat.dataset.seat = seatId;

        if (occupiedSeats.includes(seatId)) {
          seat.className = 'seat occupied';
          seat.title = 'Occupied';
        } else {
          seat.className = 'seat available';
          seat.title = seatId;
          seat.addEventListener('click', () => {
            if (selectedSeats.has(seatId)) {
              selectedSeats.delete(seatId);
              seat.className = 'seat available';
            } else {
              selectedSeats.add(seatId);
              seat.className = 'seat selected';
            }
            container.dispatchEvent(new CustomEvent('seatChange', { detail: Array.from(selectedSeats) }));
          });
        }

        seat.textContent = seatId;
        rowEl.appendChild(seat);
      });

      container.appendChild(rowEl);
    }

    // Legend
    const legend = document.createElement('div');
    legend.className = 'seat-legend';
    legend.innerHTML = `
      <div class="seat-legend-item"><div class="dot available-dot"></div>Available</div>
      <div class="seat-legend-item"><div class="dot occupied-dot"></div>Occupied</div>
      <div class="seat-legend-item"><div class="dot selected-dot"></div>Selected</div>
    `;
    container.appendChild(legend);

    container.getSelectedSeats = () => Array.from(selectedSeats);

    return container;
  }

  // ── Bar Chart Renderer ──
  function renderBarChart(containerId, data, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const maxVal = Math.max(...data.map(d => d.value), 1);
    const { height = 200, color = 'var(--accent-gradient)' } = options;

    container.innerHTML = `
      <div class="bar-chart" style="height:${height}px">
        ${data.map(d => `
          <div class="bar-item">
            <div class="bar-value">${d.value > 0 ? (options.currency ? formatCurrency(d.value) : d.value) : ''}</div>
            <div class="bar" style="height:${Math.max((d.value / maxVal) * 100, d.value > 0 ? 5 : 0)}%;background:${color};" title="${d.label}: ${d.value}"></div>
            <div class="bar-label">${d.label}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ── Donut Chart Renderer ──
  function renderDonutChart(containerId, data, centerLabel = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const total = data.reduce((s, d) => s + d.value, 0);
    const colors = ['#0ea5e9', '#38bdf8', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];

    let cumulativePct = 0;
    const gradient = data.map((d, i) => {
      const pct = (d.value / total) * 100;
      const start = cumulativePct;
      cumulativePct += pct;
      return `${colors[i % colors.length]} ${start}% ${cumulativePct}%`;
    }).join(', ');

    container.innerHTML = `
      <div class="donut-chart" style="background: conic-gradient(${gradient || 'var(--border) 0% 100%'});">
        <div class="donut-center">
          <div class="donut-value">${total > 0 ? total.toLocaleString('en-IN') : '0'}</div>
          <div class="donut-label">${centerLabel}</div>
        </div>
      </div>
      <div class="chart-legend">
        ${data.map((d, i) => `
          <div class="legend-item">
            <div class="legend-dot" style="background:${colors[i % colors.length]}"></div>
            <span>${d.label}: <strong>${d.value}</strong></span>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ── Navbar scroll effect ──
  function initNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    window.addEventListener('scroll', throttle(() => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    }, 100));
  }

  // ── Hamburger menu ──
  function initHamburger() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (!hamburger || !navLinks) return;
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
    });
  }

  // ── Tabs ──
  function initTabs(tabsContainerId) {
    const container = document.getElementById(tabsContainerId) || document;
    const tabs = container.querySelectorAll('.tab-item');
    const contents = container.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const targetContent = container.querySelector(`#${target}`);
        if (targetContent) targetContent.classList.add('active');
      });
    });
  }

  // ── Print Ticket ──
  function printTicket(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Special Fare Ticket</title>
          <link rel="stylesheet" href="css/index.css">
          <style>
            body { background: white; color: #333; padding: 20px; }
            .ticket { border: 2px solid #333; background: white; }
            .ticket-header { background: #0ea5e9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          </style>
        </head>
        <body>${el.outerHTML}<script>window.print();window.close();<\/script></body>
      </html>
    `);
    win.document.close();
  }

  // ── Copy to clipboard ──
  function copyToClipboard(text, successMsg = 'Copied!') {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => showToast(successMsg, 'success'));
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(successMsg, 'success');
    }
  }

  // ── Session guard ──
  function requireSession(role) {
    const session = Storage.getSession();
    if (!session) {
      if (role === 'admin') window.location.href = 'admin-login.html';
      else if (role === 'agent') window.location.href = 'agent-login.html';
      else window.location.href = 'index.html';
      return false;
    }
    if (role && session.role !== role) {
      showToast('Unauthorized access. Redirecting...', 'error');
      setTimeout(() => {
        if (role === 'admin') window.location.href = 'admin-login.html';
        else if (role === 'agent') window.location.href = 'agent-login.html';
        else window.location.href = 'index.html';
      }, 1500);
      return false;
    }
    return true;
  }

  // ── Fare Calculation ──
  function calculateFareSummary(baseFare, fareClass, agentMarkup = 0) {
    const settings = Storage.getSettings();
    const gstRate = fareClass === 'business' ?
      (settings.gstBusiness || 12) / 100 :
      (settings.gstEconomy || 5) / 100;
    const convenienceFee = settings.convenienceFee || 250;
    const taxes = Math.round(baseFare * gstRate);
    const totalBeforeMarkup = baseFare + taxes + convenienceFee;
    const total = totalBeforeMarkup + agentMarkup;

    return {
      baseFare,
      taxes,
      gstRate: gstRate * 100,
      convenienceFee,
      agentMarkup,
      total
    };
  }

  // ── Public API ──
  return {
    formatCurrency,
    formatDate,
    formatDateShort,
    formatDateFull,
    formatDateTime,
    formatDuration,
    formatTime12,
    getTodayString,
    getMinDate,
    getMaxDate,
    getDayOfWeek,
    generatePNR,
    validateEmail,
    validatePhone,
    validateAadhaar,
    validatePAN,
    validatePassport,
    validateGST,
    validateRequired,
    showFieldError,
    clearFieldError,
    clearAllErrors,
    showToast,
    openModal,
    closeModal,
    closeAllModals,
    showLoading,
    hideLoading,
    debounce,
    throttle,
    getUrlParams,
    buildUrl,
    animateCounter,
    observeElements,
    getStatusBadge,
    formatClass,
    generateSeatMap,
    renderBarChart,
    renderDonutChart,
    initNavbar,
    initHamburger,
    initTabs,
    printTicket,
    copyToClipboard,
    requireSession,
    calculateFareSummary
  };

})();

