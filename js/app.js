/* ============================================================
   SPECIAL FARE — LANDING PAGE JAVASCRIPT (app.js)
   Airport autocomplete, search form, popular routes,
   animated counters, session-based nav, modals
   ============================================================ */

'use strict';

// ── State ──────────────────────────────────────────────────────────────────
const App = (() => {
  let fromCode = '';
  let toCode   = '';
  let passengers = 1;
  let tripType = 'one-way';

  // ── Init ────────────────────────────────────────────────────────────────
  function init() {
    Utils.initNavbar();
    Utils.initHamburger();
    initLoginDropdown();
    initSearchTabs();
    initDateDefaults();
    initPassengerCounter();
    initAutocomplete('from-input', 'from-dropdown', (code) => { fromCode = code; });
    initAutocomplete('to-input',   'to-dropdown',   (code) => { toCode   = code; });
    initSwapButton();
    initSearchForm();
    applyLandingPageCustomizations();
    renderFeatures();
    renderPopularRoutes();
    renderAirlines();
    initCounterAnimations();
    initSessionNav();
    initCustomerLogin();
    initCustomerRegister();

    // Close autocomplete dropdowns on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#from-field-wrapper') &&
          !e.target.closest('#to-input') &&
          !e.target.closest('#to-dropdown')) {
        closeAllDropdowns();
      }
    });

    // Observe animated elements
    Utils.observeElements('.feature-card', 'animate-fadeInUp');
    Utils.observeElements('.route-card',   'animate-fadeInUp');
  }

  // ── Login Dropdown ───────────────────────────────────────────────────────
  function initLoginDropdown() {
    const dropdown = document.getElementById('login-dropdown');
    const toggle   = document.getElementById('login-toggle');
    if (!dropdown || !toggle) return;

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#login-dropdown')) {
        dropdown.classList.remove('open');
      }
    });

    // Customer login button in dropdown
    const custBtn = document.getElementById('customer-login-btn');
    if (custBtn) {
      custBtn.addEventListener('click', (e) => {
        e.preventDefault();
        dropdown.classList.remove('open');
        Utils.openModal('customer-login-modal');
      });
    }
  }

  // ── Search Tabs ──────────────────────────────────────────────────────────
  function initSearchTabs() {
    const tabs = document.querySelectorAll('.search-tab');
    const returnGroup = document.getElementById('return-date-group');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        tripType = tab.dataset.trip;

        if (tripType === 'round-trip') {
          returnGroup.classList.add('visible');
          // Update search fields grid to accommodate return date
          const sf = document.getElementById('search-fields');
          if (sf) sf.style.gridTemplateColumns = '1fr 1fr 1fr 1fr 1fr 1fr auto';
        } else {
          returnGroup.classList.remove('visible');
          const sf = document.getElementById('search-fields');
          if (sf) sf.style.gridTemplateColumns = '';
        }
      });
    });
  }

  // ── Date Defaults ────────────────────────────────────────────────────────
  function initDateDefaults() {
    const dateInput   = document.getElementById('travel-date');
    const returnInput = document.getElementById('return-date');
    if (!dateInput) return;

    const today   = new Date();
    const minDate = today.toISOString().split('T')[0];

    // Default: 7 days from today
    const defaultDate = new Date(today);
    defaultDate.setDate(defaultDate.getDate() + 7);
    const defaultStr = defaultDate.toISOString().split('T')[0];

    // Max: 1 year from now
    const maxDate = new Date(today);
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    const maxStr = maxDate.toISOString().split('T')[0];

    dateInput.min   = minDate;
    dateInput.max   = maxStr;
    dateInput.value = defaultStr;

    if (returnInput) {
      // Return default: 10 days from today
      const returnDefault = new Date(today);
      returnDefault.setDate(returnDefault.getDate() + 10);
      returnInput.min   = defaultStr;
      returnInput.max   = maxStr;
      returnInput.value = returnDefault.toISOString().split('T')[0];

      // Keep return date >= departure date
      dateInput.addEventListener('change', () => {
        returnInput.min = dateInput.value;
        if (returnInput.value < dateInput.value) {
          returnInput.value = dateInput.value;
        }
      });
    }
  }

  // ── Passenger Counter ────────────────────────────────────────────────────
  function initPassengerCounter() {
    const minusBtn = document.getElementById('pax-minus');
    const plusBtn  = document.getElementById('pax-plus');
    const countEl  = document.getElementById('pax-count');
    const hidden   = document.getElementById('passengers-hidden');

    function updateDisplay() {
      if (countEl) countEl.textContent = passengers;
      if (hidden) hidden.value = passengers;
    }

    if (minusBtn) {
      minusBtn.addEventListener('click', () => {
        if (passengers > 1) {
          passengers--;
          updateDisplay();
        }
      });
    }

    if (plusBtn) {
      plusBtn.addEventListener('click', () => {
        if (passengers < 9) {
          passengers++;
          updateDisplay();
        }
      });
    }
  }

  // ── Airport Autocomplete ─────────────────────────────────────────────────
  function initAutocomplete(inputId, dropdownId, onSelect) {
    const input    = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;

    let selectedIndex = -1;
    let currentResults = [];

    const search = Utils.debounce((query) => {
      const q = query.trim().toLowerCase();
      if (q.length < 1) {
        hideDropdown(dropdown);
        return;
      }

      currentResults = FlightData.AIRPORTS.filter(a =>
        a.code.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.state.toLowerCase().includes(q)
      ).slice(0, 10);

      if (currentResults.length === 0) {
        hideDropdown(dropdown);
        return;
      }

      renderDropdown(dropdown, currentResults, input, onSelect);
      selectedIndex = -1;
    }, 150);

    input.addEventListener('input', (e) => {
      onSelect(''); // clear code when typing
      search(e.target.value);
    });

    input.addEventListener('focus', () => {
      if (input.value.trim().length >= 1) {
        search(input.value);
      } else {
        // Show popular airports on focus
        const popular = FlightData.AIRPORTS.filter(a => a.tier === 1).slice(0, 8);
        renderDropdown(dropdown, popular, input, onSelect);
      }
    });

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
      const items = dropdown.querySelectorAll('.autocomplete-item');
      if (!items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelectedItem(items, selectedIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelectedItem(items, selectedIndex);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && currentResults[selectedIndex]) {
          selectAirport(currentResults[selectedIndex], input, dropdown, onSelect);
        } else if (currentResults.length > 0) {
          selectAirport(currentResults[0], input, dropdown, onSelect);
        }
      } else if (e.key === 'Escape') {
        hideDropdown(dropdown);
      }
    });
  }

  function renderDropdown(dropdown, airports, input, onSelect) {
    dropdown.innerHTML = airports.map((a, i) => `
      <div class="autocomplete-item" data-index="${i}" data-code="${a.code}">
        <span class="airport-code">${a.code}</span>
        <div class="airport-info">
          <div class="airport-name">${a.city}</div>
          <div class="airport-city">${a.name}</div>
        </div>
        ${a.tier === 1 ? '<span class="badge badge-info" style="font-size:0.65rem;">Major</span>' : ''}
      </div>
    `).join('');

    dropdown.querySelectorAll('.autocomplete-item').forEach((item, i) => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectAirport(airports[i], input, dropdown, onSelect);
      });
    });

    dropdown.classList.add('active');
  }

  function selectAirport(airport, input, dropdown, onSelect) {
    input.value = `${airport.city} (${airport.code})`;
    onSelect(airport.code);
    hideDropdown(dropdown);
  }

  function updateSelectedItem(items, index) {
    items.forEach(item => item.classList.remove('selected'));
    if (index >= 0 && items[index]) {
      items[index].classList.add('selected');
      items[index].scrollIntoView({ block: 'nearest' });
    }
  }

  function hideDropdown(dropdown) {
    dropdown.classList.remove('active');
    dropdown.innerHTML = '';
  }

  function closeAllDropdowns() {
    document.querySelectorAll('.autocomplete-dropdown').forEach(d => {
      d.classList.remove('active');
    });
  }

  // ── Swap Button ──────────────────────────────────────────────────────────
  function initSwapButton() {
    const swapBtn = document.getElementById('swap-btn');
    const fromInput = document.getElementById('from-input');
    const toInput   = document.getElementById('to-input');
    if (!swapBtn || !fromInput || !toInput) return;

    swapBtn.addEventListener('click', () => {
      const tmpVal  = fromInput.value;
      const tmpCode = fromCode;

      fromInput.value = toInput.value;
      fromCode = toCode;

      toInput.value = tmpVal;
      toCode = tmpCode;

      // Visual feedback
      swapBtn.style.transform = 'translateY(-50%) rotate(180deg)';
      setTimeout(() => {
        swapBtn.style.transform = 'translateY(-50%) rotate(0deg)';
      }, 300);
    });
  }

  // ── Search Form Submission ────────────────────────────────────────────────
  function initSearchForm() {
    const searchBtn = document.getElementById('search-btn');
    if (!searchBtn) return;

    searchBtn.addEventListener('click', submitSearch);
    document.getElementById('search-box')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.target.closest('.autocomplete-dropdown')) {
        submitSearch();
      }
    });
  }

  function submitSearch() {
    const fromInput = document.getElementById('from-input');
    const toInput   = document.getElementById('to-input');
    const dateInput = document.getElementById('travel-date');
    const classEl   = document.getElementById('travel-class');

    let valid = true;

    // Validate From
    if (!fromCode) {
      Utils.showToast('Please select a valid departure airport', 'error');
      fromInput?.classList.add('error');
      setTimeout(() => fromInput?.classList.remove('error'), 2000);
      valid = false;
    }

    // Validate To
    if (!toCode) {
      Utils.showToast('Please select a valid destination airport', 'error');
      toInput?.classList.add('error');
      setTimeout(() => toInput?.classList.remove('error'), 2000);
      valid = false;
    }

    // Same airport check
    if (fromCode && toCode && fromCode === toCode) {
      Utils.showToast('Departure and destination airports cannot be the same', 'warning');
      valid = false;
    }

    // Validate date
    if (!dateInput?.value) {
      Utils.showToast('Please select a travel date', 'error');
      valid = false;
    }

    if (!valid) return;

    const date      = dateInput.value;
    const fareClass = classEl?.value || 'economy';

    // Show loading state
    const btn = document.getElementById('search-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px;"></span> Searching...';
    }

    // Navigate to search page
    setTimeout(() => {
      const params = new URLSearchParams({
        from:       fromCode,
        to:         toCode,
        date:       date,
        passengers: passengers,
        class:      fareClass
      });
      window.location.href = `search.html?${params.toString()}`;
    }, 600);
  }

  // ── Quick Search Fill ─────────────────────────────────────────────────────
  window.fillQuickSearch = function(from, to) {
    const fromAirport = FlightData.getAirport(from);
    const toAirport   = FlightData.getAirport(to);
    if (!fromAirport || !toAirport) return;

    const fromInput = document.getElementById('from-input');
    const toInput   = document.getElementById('to-input');
    if (fromInput) fromInput.value = `${fromAirport.city} (${fromAirport.code})`;
    if (toInput)   toInput.value   = `${toAirport.city} (${toAirport.code})`;
    fromCode = from;
    toCode   = to;

    Utils.showToast(`Route set: ${fromAirport.city} → ${toAirport.city}`, 'success');

    // Scroll to search box on mobile
    document.getElementById('search-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // ── Popular Routes ────────────────────────────────────────────────────────
  function renderPopularRoutes() {
    const grid = document.getElementById('routes-grid');
    if (!grid) return;

    const routes = FlightData.getPopularRoutes();
    const tagColorMap = {
      'Most Popular':   'badge-warning',
      'Business Route': 'badge-info',
      'Vacation':       'badge-success',
      'Tech Corridor':  'badge-primary',
      'Trending':       'badge-danger',
      'Scenic':         'badge-success',
      'Long Haul':      'badge-info',
      'Weekend Getaway':'badge-warning'
    };

    const routeIcons = {
      'DEL-BOM': '🏙️',
      'BLR-DEL': '💼',
      'DEL-GOI': '🏖️',
      'BOM-BLR': '💻',
      'HYD-DEL': '📈',
      'DEL-SXR': '🏔️',
      'CCU-BLR': '✈️',
      'BOM-GOI': '🌴'
    };

    grid.innerHTML = routes.map((route, i) => {
      const fromCode = route.from.code;
      const toCode   = route.to.code;
      const routeKey = `${fromCode}-${toCode}`;
      const icon     = routeIcons[routeKey] || '✈️';
      const badgeCls = tagColorMap[route.tag] || 'badge-primary';
      const duration = Utils.formatDuration(route.duration);
      const price    = Utils.formatCurrency(route.basePrice);

      // Get default date (7 days from now)
      const dt = new Date();
      dt.setDate(dt.getDate() + 7);
      const dateStr = dt.toISOString().split('T')[0];

      return `
        <div class="route-card animate-fadeInUp animate-delay-${(i % 5) + 1}"
             onclick="navigateToRoute('${fromCode}', '${toCode}', '${dateStr}')"
             role="button" tabindex="0"
             onkeydown="if(event.key==='Enter') navigateToRoute('${fromCode}','${toCode}','${dateStr}')">
          <div class="route-card-content">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-md);">
              <span style="font-size:2rem;">${icon}</span>
              <span class="badge ${badgeCls}">${route.tag}</span>
            </div>
            <div class="route-cities">
              <div class="route-city-name">${route.from.city}</div>
              <span class="route-arrow">→</span>
              <div class="route-city-name">${route.to.city}</div>
            </div>
            <div style="display:flex;align-items:center;gap:var(--space-md);margin-bottom:var(--space-sm);">
              <div style="font-size:0.8rem;color:var(--text-muted);">
                <span style="margin-right:var(--space-sm);">🛫 ${fromCode}</span>
                <span>🛬 ${toCode}</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:var(--space-md);padding-top:var(--space-md);border-top:1px solid var(--border-light);">
              <div>
                <div class="route-price">
                  <span class="from-label">From </span>${price}
                </div>
                <div style="font-size:0.75rem;color:var(--text-muted);">Economy · One Way</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:0.85rem;font-weight:600;color:var(--text-secondary);">⏱ ${duration}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);">Non-stop</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  window.navigateToRoute = function(from, to, date) {
    const params = new URLSearchParams({ from, to, date, passengers: 1, class: 'economy' });
    window.location.href = `search.html?${params.toString()}`;
  };

  // ── Airlines Strip ────────────────────────────────────────────────────────
  function renderAirlines() {
    const strip = document.getElementById('airlines-strip');
    if (!strip) return;

    strip.innerHTML = FlightData.AIRLINES.map(airline => `
      <div class="airline-item">
        <span class="logo">${airline.logo}</span>
        <div>
          <div class="name">${airline.name}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">${'★'.repeat(Math.floor(airline.rating))} ${airline.rating}</div>
        </div>
      </div>
    `).join('');
  }

  // ── Animated Counters ─────────────────────────────────────────────────────
  function initCounterAnimations() {
    const settings = Storage.getSettings();
    const counters = [
      { id: 'stat-airports', target: parseInt(settings.statAirports) || FlightData.AIRPORTS.length,        suffix: '+' },
      { id: 'stat-airlines', target: parseInt(settings.statAirlines) || FlightData.AIRLINES.length,         suffix: ''  },
      { id: 'stat-flights',  target: parseInt(settings.statDailyFlights) || 200,                                suffix: '+' },
      { id: 'stat-routes',   target: parseInt(settings.statRoutes) || Object.keys(FlightData.ROUTES).length, suffix: '+' }
    ];

    let animated = false;

    const statsStrip = document.querySelector('.stats-strip');
    if (!statsStrip) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !animated) {
          animated = true;
          counters.forEach(({ id, target, suffix }) => {
            const el = document.getElementById(id);
            if (el) Utils.animateCounter(el, target, 1800, '', suffix);
          });
          observer.disconnect();
        }
      });
    }, { threshold: 0.3 });

    observer.observe(statsStrip);
  }

  // ── Session-based Nav ─────────────────────────────────────────────────────
  function initSessionNav() {
    const session = Storage.getSession();
    if (!session) return;

    // Hide login dropdown if logged in
    const loginDropdown = document.getElementById('login-dropdown');
    if (loginDropdown) {
      loginDropdown.style.display = 'none';
    }

    // Show session nav link
    const sessionNavLink = document.getElementById('session-nav-link');
    const sessionPageLink = document.getElementById('session-page-link');

    if (sessionNavLink && sessionPageLink) {
      sessionNavLink.style.display = 'block';

      if (session.role === 'admin') {
        sessionPageLink.textContent = '⚙️ Admin Panel';
        sessionPageLink.href = 'admin-dashboard.html';
      } else if (session.role === 'agent') {
        sessionPageLink.textContent = '🏢 Agent Dashboard';
        sessionPageLink.href = 'agent-dashboard.html';
      } else if (session.role === 'supplier') {
        sessionPageLink.textContent = '🔌 Supplier Dashboard';
        sessionPageLink.href = 'supplier-dashboard.html';
      } else {
        sessionPageLink.textContent = `👤 ${session.name || 'My Account'}`;
        sessionPageLink.href = 'customer-dashboard.html';
      }

      // Replace login button with user greeting + logout
      const navActions = document.querySelector('.nav-actions');
      if (navActions) {
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn btn-secondary btn-sm';
        logoutBtn.innerHTML = '← Logout';
        logoutBtn.addEventListener('click', () => {
          Storage.logout();
          Utils.showToast('Logged out successfully', 'success');
          setTimeout(() => window.location.reload(), 1000);
        });
        navActions.appendChild(logoutBtn);
      }
    }
  }

  // ── Customer Login Modal ──────────────────────────────────────────────────
  function initCustomerLogin() {
    const loginBtn = document.getElementById('cust-login-btn');
    const registerBtn = document.getElementById('cust-register-btn');

    const forgotLink = document.getElementById('cust-forgot-link');
    const backBtn = document.getElementById('cust-forgot-back-btn');
    const sendBtn = document.getElementById('cust-forgot-send-btn');
    const verifyBtn = document.getElementById('cust-forgot-verify-btn');
    const resetBtn = document.getElementById('cust-forgot-reset-btn');

    const loginFormView = document.getElementById('cust-login-form-view');
    const forgotView = document.getElementById('cust-forgot-view');
    const step1 = document.getElementById('cust-forgot-step1');
    const step2 = document.getElementById('cust-forgot-step2');
    const step3 = document.getElementById('cust-forgot-step3');
    const modalTitle = document.querySelector('#customer-login-modal .modal-title');

    let forgotEmail = '';
    let currentOTP = '123456';

    function showStep(stepNum) {
      step1.style.display = stepNum === 1 ? 'block' : 'none';
      step2.style.display = stepNum === 2 ? 'block' : 'none';
      step3.style.display = stepNum === 3 ? 'block' : 'none';
    }

    function resetForgotFlow() {
      if (modalTitle) modalTitle.innerHTML = '👤 Customer Login';
      loginFormView.style.display = 'block';
      forgotView.style.display = 'none';
      const fEmail = document.getElementById('cust-forgot-email');
      const fOtp = document.getElementById('cust-forgot-otp');
      const fNewpass = document.getElementById('cust-forgot-newpass');
      const fConfpass = document.getElementById('cust-forgot-confpass');
      if (fEmail) fEmail.value = '';
      if (fOtp) fOtp.value = '';
      if (fNewpass) fNewpass.value = '';
      if (fConfpass) fConfpass.value = '';
      forgotEmail = '';
      showStep(1);
    }

    // Reset when opening via customer-login-btn
    const custLoginBtnToggle = document.getElementById('customer-login-btn');
    if (custLoginBtnToggle) {
      custLoginBtnToggle.addEventListener('click', () => {
        resetForgotFlow();
      });
    }

    // Reset when clicking modal close
    const modalCloseBtn = document.querySelector('#customer-login-modal .modal-close');
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', () => {
        resetForgotFlow();
      });
    }

    // Reset when clicking outside modal
    document.addEventListener('click', (e) => {
      if (e.target.id === 'customer-login-modal') {
        resetForgotFlow();
      }
    });

    if (forgotLink) {
      forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (modalTitle) modalTitle.innerHTML = '🔑 Reset Password';
        loginFormView.style.display = 'none';
        forgotView.style.display = 'block';
        showStep(1);
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        resetForgotFlow();
      });
    }

    // Step 1: Send OTP
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        const email = document.getElementById('cust-forgot-email')?.value.trim();
        if (!email) {
          Utils.showToast('Please enter your email address', 'warning');
          return;
        }
        if (!Utils.validateEmail(email)) {
          Utils.showToast('Please enter a valid email address', 'error');
          return;
        }

        // Verify email exists in Storage
        if (!Storage.verifyEmailExists(email, 'customer')) {
          Utils.showToast('Email address not registered', 'error');
          return;
        }

        forgotEmail = email;
        sendBtn.disabled = true;
        sendBtn.innerHTML = '⏳ Sending OTP...';

        // Generate dynamic 6-digit OTP
        currentOTP = Math.floor(100000 + Math.random() * 900000).toString();
        const settings = Storage.getSettings();
        const hasSmtp = settings.smtpUsername && settings.smtpPassword;

        setTimeout(() => {
          sendBtn.disabled = false;
          sendBtn.innerHTML = 'Send OTP Code →';

          if (hasSmtp) {
            Utils.sendEmail({
              to: email,
              subject: 'One-Time Password (OTP) for Password Reset - Special Fare',
              body: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                  <div style="background: linear-gradient(135deg, #0ea5e9, #2563eb); color: white; padding: 24px; text-align: center;">
                    <h2 style="margin: 0; font-size: 24px;">Password Reset Verification</h2>
                  </div>
                  <div style="padding: 24px; color: #333; line-height: 1.6;">
                    <p>Dear Customer,</p>
                    <p>We received a request to reset the password for your Special Fare customer account.</p>
                    <p>Your One-Time Password (OTP) code is:</p>
                    <div style="text-align: center; margin: 20px 0;">
                      <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb; background: #f3f4f6; padding: 10px 20px; border-radius: 6px; display: inline-block;">${currentOTP}</span>
                    </div>
                    <p>This code is valid for 10 minutes. If you did not request a password reset, please ignore this email.</p>
                    <p>Best regards,<br>Special Fare Team</p>
                  </div>
                  <div style="background: #f3f4f6; text-align: center; padding: 16px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
                    © ${new Date().getFullYear()} Special Fare. All rights reserved.<br>
                    For assistance, email us at <a href="mailto:info@specialfare.in" style="color: #0ea5e9; text-decoration: none;">info@specialfare.in</a>
                  </div>
                </div>
              `
            });
            Utils.showToast('Verification code has been sent to your email address.', 'success', 6000);
          } else {
            Utils.showToast('SMTP Mailer is not configured. Simulation OTP code: ' + currentOTP, 'warning', 10000);
          }
          showStep(2);
        }, 800);
      });
    }

    // Step 2: Verify OTP
    if (verifyBtn) {
      verifyBtn.addEventListener('click', () => {
        const otp = document.getElementById('cust-forgot-otp')?.value.trim();
        if (!otp) {
          Utils.showToast('Please enter the verification code', 'warning');
          return;
        }
        if (otp !== currentOTP) {
          Utils.showToast('Incorrect verification code. Hint: ' + currentOTP, 'error');
          return;
        }

        showStep(3);
      });
    }

    // Step 3: Reset Password
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const newpass = document.getElementById('cust-forgot-newpass')?.value;
        const confpass = document.getElementById('cust-forgot-confpass')?.value;

        if (!newpass || !confpass) {
          Utils.showToast('Please fill in all fields', 'warning');
          return;
        }
        if (newpass.length < 6) {
          Utils.showToast('Password must be at least 6 characters', 'error');
          return;
        }
        if (newpass !== confpass) {
          Utils.showToast('Passwords do not match', 'error');
          return;
        }

        resetBtn.disabled = true;
        resetBtn.innerHTML = '⏳ Resetting...';

        setTimeout(() => {
          const res = Storage.resetUserPassword(forgotEmail, 'customer', newpass);
          resetBtn.disabled = false;
          resetBtn.innerHTML = 'Reset Password & Login →';

          if (res.success) {
            Utils.showToast('Password reset successfully! Please log in.', 'success');
            resetForgotFlow();
            const custEmailEl = document.getElementById('cust-email');
            if (custEmailEl) custEmailEl.value = forgotEmail;
          } else {
            Utils.showToast(res.error || 'Password reset failed.', 'error');
          }
        }, 800);
      });
    }

    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        const email    = document.getElementById('cust-email')?.value.trim();
        const password = document.getElementById('cust-password')?.value.trim();

        if (!email || !password) {
          Utils.showToast('Please fill in all fields', 'warning');
          return;
        }

        if (!Utils.validateEmail(email)) {
          Utils.showToast('Please enter a valid email address', 'error');
          return;
        }

        const result = Storage.login(email, password, 'customer');
        if (result.success) {
          Utils.closeModal('customer-login-modal');
          Utils.showToast(`Welcome back, ${result.user.name}! 👋`, 'success');
          setTimeout(() => window.location.reload(), 1200);
        } else {
          Utils.showToast(result.error || 'Invalid credentials. Please try again.', 'error');
        }
      });

      // Enter key on password field
      document.getElementById('cust-password')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') loginBtn.click();
      });
    }

    if (registerBtn) {
      registerBtn.addEventListener('click', () => {
        Utils.closeModal('customer-login-modal');
        Utils.openModal('customer-register-modal');
      });
    }
  }

  // ── Customer Register Modal ───────────────────────────────────────────────
  function initCustomerRegister() {
    const submitBtn = document.getElementById('reg-submit-btn');
    if (!submitBtn) return;

    submitBtn.addEventListener('click', () => {
      const name     = document.getElementById('reg-name')?.value.trim();
      const phone    = document.getElementById('reg-phone')?.value.trim();
      const email    = document.getElementById('reg-email')?.value.trim();
      const password = document.getElementById('reg-password')?.value.trim();

      // Validation
      if (!name || !phone || !email || !password) {
        Utils.showToast('Please fill in all fields', 'warning');
        return;
      }

      if (!Utils.validateEmail(email)) {
        Utils.showToast('Please enter a valid email address', 'error');
        return;
      }

      if (!Utils.validatePhone(phone)) {
        Utils.showToast('Please enter a valid 10-digit Indian mobile number', 'error');
        return;
      }

      if (password.length < 6) {
        Utils.showToast('Password must be at least 6 characters', 'error');
        return;
      }

      const result = Storage.registerCustomer({ name, phone, email, password });
      if (result.success) {
        Utils.closeModal('customer-register-modal');
        Utils.showToast(`Account created! Welcome, ${name}! 🎉`, 'success');

        // Send welcome email
        Utils.sendEmail({
          to: email,
          subject: 'Welcome to Special Fare!',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              <div style="background: linear-gradient(135deg, #0ea5e9, #2563eb); color: white; padding: 24px; text-align: center;">
                <h2 style="margin: 0; font-size: 24px;">Welcome to Special Fare!</h2>
              </div>
              <div style="padding: 24px; color: #333; line-height: 1.6;">
                <p>Dear ${name},</p>
                <p>Thank you for registering with Special Fare. Your customer account has been created successfully.</p>
                <p>You can now search and book flights at the best rates.</p>
                <p>Best regards,<br>Special Fare Team</p>
              </div>
              <div style="background: #f3f4f6; text-align: center; padding: 16px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
                © ${new Date().getFullYear()} Special Fare. All rights reserved.<br>
                For assistance, email us at <a href="mailto:info@specialfare.in" style="color: #0ea5e9; text-decoration: none;">info@specialfare.in</a>
              </div>
            </div>
          `
        });

        // Auto-login
        const loginResult = Storage.login(email, password, 'customer');
        if (loginResult.success) {
          setTimeout(() => window.location.reload(), 1200);
        }
      } else {
        Utils.showToast(result.error || 'Registration failed. Please try again.', 'error');
      }
    });
  }

  // ── Apply Landing Page Customizations from Admin ──
  function applyLandingPageCustomizations() {
    const settings = Storage.getSettings();

    // 1. Announcement Bar
    const announceBar = document.querySelector('.announce-bar');
    if (announceBar && settings.promoText) {
      announceBar.innerHTML = settings.promoText;
    }



    // 4. Footer Copyright / Details
    const footerCopyright = document.getElementById('footer-copyright');
    if (footerCopyright) {
      footerCopyright.innerHTML = `© 2026 ${settings.footerCompanyName || 'Special Fare Aviation Pvt. Ltd.'} | ${settings.footerAddress || 'Chailengta, LTV, Dhalai Tripur'} | Phone: ${settings.footerPhone || '+91 7001507011'}. All rights reserved.`;
    }
  }

  // ── Dynamic Features Section ──
  function renderFeatures() {
    const grid = document.getElementById('features-grid');
    if (!grid) return;
    const settings = Storage.getSettings();
    const features = [
      { icon: "💰", title: settings.feat1Title || "Best Fares Guaranteed", desc: settings.feat1Desc || "Dynamic pricing engine scans all available fares across our 6 airline partners. No markup, no hidden fees — just transparent pricing with full GST breakdowns." },
      { icon: "⚡", title: settings.feat2Title || "Instant Booking", desc: settings.feat2Desc || "From search to confirmation in under 60 seconds. Automated PNR generation, instant e-tickets, and real-time seat assignment for a seamless experience." },
      { icon: "🪑", title: settings.feat3Title || "Real-time Seat Availability", desc: settings.feat3Desc || "Live seat inventory across Economy, Premium Economy, and Business classes. Interactive seat map lets you choose your preferred seat at booking." },
      { icon: "🤝", title: settings.feat4Title || "B2B Travel Agent Portal", desc: settings.feat4Desc || "Full-featured travel agent dashboard with custom markup rules, commission tracking, wallet management, and dedicated B2B booking capabilities." },
      { icon: "📱", title: settings.feat5Title || "Mobile-First Design", desc: settings.feat5Desc || "Fully responsive interface designed for modern devices. Search and book from any screen size with the same premium experience across all platforms." },
      { icon: "🔒", title: settings.feat6Title || "Secure & Reliable", desc: settings.feat6Desc || "Enterprise-grade security for every transaction. Role-based access control for customers, agents, and admins with complete audit trails." }
    ];
    
    grid.innerHTML = features.map((f, i) => `
      <div class="feature-card animate-fadeInUp animate-delay-${(i % 3) + 1}">
        <div class="feature-icon">${f.icon}</div>
        <h3 class="feature-title">${f.title}</h3>
        <p class="feature-desc">${f.desc}</p>
      </div>
    `).join('');
  }

  // ── Public ───────────────────────────────────────────────────────────────
  return { init };

})();

// ── Bootstrap on DOM Ready ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', App.init);


