/* ============================================================
   FLIGHT BOOKING ENGINE — STORAGE LAYER
   LocalStorage CRUD, Session Management, Search Engine
   ============================================================ */

const Storage = (() => {

  const KEYS = {
    INITIALIZED: 'specialfare_initialized_v4',
    USERS: 'skywings_users',
    AGENTS: 'skywings_agents',
    ADMINS: 'skywings_admins',
    BOOKINGS: 'skywings_bookings',
    AGENT_WALLETS: 'skywings_agent_wallets',
    AGENT_TRANSACTIONS: 'skywings_agent_transactions',
    MARKUP_RULES: 'skywings_markup_rules',
    SESSION: 'skywings_session',
    SETTINGS: 'skywings_settings',
    ANNOUNCEMENTS: 'skywings_announcements',
    CUSTOM_FLIGHTS: 'skywings_custom_flights',
    SUPPLIERS: 'skywings_suppliers',
    PREPURCHASED_INVENTORY: 'skywings_prepurchased_inventory'
  };

  // ── LocalStorage Helpers ──
  function _get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Storage read error:', key, e);
      return null;
    }
  }

  function _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage write error:', key, e);
      return false;
    }
  }

  function _remove(key) {
    localStorage.removeItem(key);
  }

  // ── Initialize System ──
  function initialize() {
    if (_get(KEYS.INITIALIZED)) return;

    // Seed admin
    _set(KEYS.ADMINS, [FlightData.DEFAULT_ADMIN]);

    // Seed demo users
    _set(KEYS.USERS, [
      {
        id: 'user_demo_001',
        name: 'Rajesh Kumar',
        email: 'rajesh@example.com',
        password: 'demo123',
        phone: '9876543210',
        role: 'customer',
        createdAt: new Date().toISOString()
      }
    ]);

    // Seed demo agent
    _set(KEYS.AGENTS, [
      {
        id: 'agent_demo_001',
        agencyName: 'TravelMax India',
        ownerName: 'Priya Sharma',
        email: 'priya@travelmax.in',
        password: 'agent123',
        phone: '9898989898',
        gstNumber: '27AADCT1234F1ZP',
        panNumber: 'ABCDE1234F',
        city: 'Mumbai',
        state: 'Maharashtra',
        status: 'approved',
        commissionRate: 5,
        role: 'agent',
        createdAt: new Date().toISOString()
      },
      {
        id: 'agent_demo_002',
        agencyName: 'Bharat Travels',
        ownerName: 'Amit Patel',
        email: 'amit@bharattravels.in',
        password: 'agent123',
        phone: '9797979797',
        gstNumber: '24AADCT5678G1ZQ',
        panNumber: 'FGHIJ5678K',
        city: 'Ahmedabad',
        state: 'Gujarat',
        status: 'pending',
        commissionRate: 5,
        role: 'agent',
        createdAt: new Date().toISOString()
      }
    ]);

    // Seed wallets
    _set(KEYS.AGENT_WALLETS, {
      'agent_demo_001': { balance: 50000, totalEarned: 125000, totalWithdrawn: 75000 },
      'agent_demo_002': { balance: 0, totalEarned: 0, totalWithdrawn: 0 }
    });

    // Seed transactions
    _set(KEYS.AGENT_TRANSACTIONS, {
      'agent_demo_001': [
        { id: 'txn_001', type: 'commission', amount: 2500, description: 'Commission: PNR ABC123', date: new Date(Date.now() - 86400000 * 2).toISOString(), balance: 50000 },
        { id: 'txn_002', type: 'commission', amount: 3200, description: 'Commission: PNR DEF456', date: new Date(Date.now() - 86400000).toISOString(), balance: 47500 }
      ]
    });

    // Seed demo bookings
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 7);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    _set(KEYS.BOOKINGS, []);

    // Default markup rules
    _set(KEYS.MARKUP_RULES, {
      'agent_demo_001': [
        { id: 'mr_001', type: 'flat', amount: 200, applyTo: 'all', description: 'Default markup ₹200' }
      ]
    });

    // Default settings
    _set(KEYS.SETTINGS, {
      gstEconomy: 5,
      gstBusiness: 12,
      convenienceFee: 250,
      defaultCommission: 5,
      minCommission: 2,
      maxCommission: 12,
      announcement: '',
      maintenanceMode: false,
      smepayEnabled: false,
      smepayMerchantId: 'SME_DEMO_MERCHANT',
      smepayApiKey: 'sme_sk_test_51N2xDemoKey',
      smepayMode: 'sandbox'
    });

    _set(KEYS.ANNOUNCEMENTS, []);
    _set(KEYS.CUSTOM_FLIGHTS, []);

    // Seed B2B suppliers
    _set(KEYS.SUPPLIERS, [
      { id: 'sup_indigo', name: 'IndiGo Bulk Desk', email: 'bulk@indigo.in', password: 'supplier123', phone: '9900112233', city: 'Gurugram', state: 'Haryana', status: 'active', createdAt: new Date().toISOString() },
      { id: 'sup_airindia', name: 'Air India Group Sales', email: 'groups@airindia.in', password: 'supplier123', phone: '9900445566', city: 'New Delhi', state: 'Delhi', status: 'active', createdAt: new Date().toISOString() },
      { id: 'sup_vistara', name: 'Vistara Charter Ops', email: 'charter@vistara.com', password: 'supplier123', phone: '9900778899', city: 'Gurugram', state: 'Haryana', status: 'active', createdAt: new Date().toISOString() }
    ]);

    // Seed default pre-purchased PNR blocks
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    _set(KEYS.PREPURCHASED_INVENTORY, []);

    _set(KEYS.INITIALIZED, true);
  }

  // ═══════════════════════════════════════
  // SESSION MANAGEMENT
  // ═══════════════════════════════════════

  function login(email, password, role) {
    let users;
    if (role === 'admin') {
      users = _get(KEYS.ADMINS) || [];
      const admin = users.find(u => u.username === email && u.password === password);
      if (admin) {
        _set(KEYS.SESSION, { userId: admin.id, role: 'admin', name: admin.name, email: admin.username });
        return { success: true, user: admin };
      }
    } else if (role === 'agent') {
      users = _get(KEYS.AGENTS) || [];
      const agent = users.find(u => u.email === email && u.password === password);
      if (agent) {
        if (agent.status !== 'approved') {
          return { success: false, error: `Your account is ${agent.status}. Please wait for admin approval.` };
        }
        _set(KEYS.SESSION, { userId: agent.id, role: 'agent', name: agent.ownerName, email: agent.email, agencyName: agent.agencyName });
        return { success: true, user: agent };
      }
    } else if (role === 'supplier') {
      users = _get(KEYS.SUPPLIERS) || [];
      const supplier = users.find(u => u.email === email && u.password === password);
      if (supplier) {
        if (supplier.status && supplier.status !== 'active') {
          return { success: false, error: `Your account is ${supplier.status}. Contact administrator support.` };
        }
        _set(KEYS.SESSION, { userId: supplier.id, role: 'supplier', name: supplier.name, email: supplier.email });
        return { success: true, user: supplier };
      }
    } else {
      users = _get(KEYS.USERS) || [];
      const user = users.find(u => u.email === email && u.password === password);
      if (user) {
        _set(KEYS.SESSION, { userId: user.id, role: 'customer', name: user.name, email: user.email });
        return { success: true, user };
      }
    }
    return { success: false, error: 'Invalid email or password.' };
  }

  function logout() {
    _remove(KEYS.SESSION);
  }

  function getSession() {
    return _get(KEYS.SESSION);
  }

  function isLoggedIn() {
    return !!_get(KEYS.SESSION);
  }

  function getCurrentUserRole() {
    const session = getSession();
    return session ? session.role : null;
  }

  // ═══════════════════════════════════════
  // USER MANAGEMENT
  // ═══════════════════════════════════════

  function registerCustomer(data) {
    const users = _get(KEYS.USERS) || [];
    if (users.find(u => u.email === data.email)) {
      return { success: false, error: 'Email already registered.' };
    }
    const user = {
      id: 'user_' + Date.now(),
      name: data.name,
      email: data.email,
      password: data.password,
      phone: data.phone || '',
      role: 'customer',
      createdAt: new Date().toISOString()
    };
    users.push(user);
    _set(KEYS.USERS, users);
    return { success: true, user };
  }

  function registerAgent(data) {
    const agents = _get(KEYS.AGENTS) || [];
    if (agents.find(a => a.email === data.email)) {
      return { success: false, error: 'Email already registered.' };
    }
    const agent = {
      id: 'agent_' + Date.now(),
      agencyName: data.agencyName,
      ownerName: data.ownerName,
      email: data.email,
      password: data.password,
      phone: data.phone,
      gstNumber: data.gstNumber || '',
      panNumber: data.panNumber || '',
      city: data.city || '',
      state: data.state || '',
      address: data.address || '',
      status: 'pending',
      commissionRate: 5,
      role: 'agent',
      createdAt: new Date().toISOString()
    };
    agents.push(agent);
    _set(KEYS.AGENTS, agents);

    // Initialize wallet
    const wallets = _get(KEYS.AGENT_WALLETS) || {};
    wallets[agent.id] = { balance: 0, totalEarned: 0, totalWithdrawn: 0 };
    _set(KEYS.AGENT_WALLETS, wallets);

    // Initialize transactions
    const transactions = _get(KEYS.AGENT_TRANSACTIONS) || {};
    transactions[agent.id] = [];
    _set(KEYS.AGENT_TRANSACTIONS, transactions);

    // Initialize markup rules
    const markups = _get(KEYS.MARKUP_RULES) || {};
    markups[agent.id] = [];
    _set(KEYS.MARKUP_RULES, markups);

    return { success: true, agent };
  }

  function getAllCustomers() {
    return _get(KEYS.USERS) || [];
  }

  function getAllAgents() {
    return _get(KEYS.AGENTS) || [];
  }

  function updateAgentStatus(agentId, status) {
    const agents = _get(KEYS.AGENTS) || [];
    const idx = agents.findIndex(a => a.id === agentId);
    if (idx === -1) return { success: false, error: 'Agent not found.' };
    agents[idx].status = status;
    _set(KEYS.AGENTS, agents);
    return { success: true, agent: agents[idx] };
  }

  function updateAgentCommission(agentId, rate) {
    const agents = _get(KEYS.AGENTS) || [];
    const idx = agents.findIndex(a => a.id === agentId);
    if (idx === -1) return { success: false, error: 'Agent not found.' };
    agents[idx].commissionRate = rate;
    _set(KEYS.AGENTS, agents);
    return { success: true };
  }

  function getAgent(agentId) {
    const agents = _get(KEYS.AGENTS) || [];
    return agents.find(a => a.id === agentId) || null;
  }

  function getCustomer(userId) {
    const users = _get(KEYS.USERS) || [];
    return users.find(u => u.id === userId) || null;
  }

  // ═══════════════════════════════════════
  // BOOKING MANAGEMENT
  // ═══════════════════════════════════════

  function generatePNR() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let pnr = 'SPF';
    for (let i = 0; i < 5; i++) {
      pnr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pnr;
  }

  function createBooking(bookingData) {
    const bookings = _get(KEYS.BOOKINGS) || [];

    // Check if there is pre-purchased group inventory available
    const block = getAvailablePrepurchasedBlock(
      bookingData.airlineCode,
      bookingData.flightNumber,
      bookingData.date,
      bookingData.fareClass,
      bookingData.passengers.length
    );

    let pnr;
    let isPrepurchased = false;
    let prepurchasedBlockId = null;

    if (block) {
      pnr = block.pnr;
      isPrepurchased = true;
      prepurchasedBlockId = block.id;
      // Deduct seats from the pre-purchased block
      deductPrepurchasedSeats(block.id, bookingData.passengers.length);
    } else {
      pnr = generatePNR();
    }

    const booking = {
      id: 'bk_' + Date.now(),
      pnr: pnr,
      isPrepurchased: isPrepurchased,
      prepurchasedBlockId: prepurchasedBlockId,
      userId: bookingData.userId,
      userType: bookingData.userType || 'customer',
      agentId: bookingData.agentId || null,
      flightNumber: bookingData.flightNumber,
      airlineCode: bookingData.airlineCode,
      airlineName: bookingData.airlineName,
      origin: bookingData.origin,
      destination: bookingData.destination,
      date: bookingData.date,
      departureTime: bookingData.departureTime,
      arrivalTime: bookingData.arrivalTime,
      fareClass: bookingData.fareClass,
      passengers: bookingData.passengers,
      baseFare: bookingData.baseFare,
      taxes: bookingData.taxes,
      convenienceFee: bookingData.convenienceFee || 250,
      agentMarkup: bookingData.agentMarkup || 0,
      agentCommission: bookingData.agentCommission || 0,
      totalFare: bookingData.totalFare,
      status: 'confirmed',
      paymentMethod: bookingData.paymentMethod || 'UPI',
      bookedAt: new Date().toISOString(),
      meal: bookingData.meal || 'no_meal',
      extraBaggage: bookingData.extraBaggage || 'bag_0',
      seatNumbers: bookingData.seatNumbers || []
    };

    bookings.push(booking);
    _set(KEYS.BOOKINGS, bookings);

    // If agent booking, add commission to wallet
    if (booking.agentId && booking.agentCommission > 0) {
      addAgentCommission(booking.agentId, booking.agentCommission, pnr);
    }

    return { success: true, booking };
  }

  function getBooking(bookingId) {
    const bookings = _get(KEYS.BOOKINGS) || [];
    return bookings.find(b => b.id === bookingId || b.pnr === bookingId) || null;
  }

  function getBookingsByUser(userId) {
    const bookings = _get(KEYS.BOOKINGS) || [];
    return bookings.filter(b => b.userId === userId).sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt));
  }

  function getBookingsByAgent(agentId) {
    const bookings = _get(KEYS.BOOKINGS) || [];
    return bookings.filter(b => b.agentId === agentId).sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt));
  }

  function getAllBookings() {
    const bookings = _get(KEYS.BOOKINGS) || [];
    return bookings.sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt));
  }

  function updateBookingStatus(bookingId, status) {
    const bookings = _get(KEYS.BOOKINGS) || [];
    const idx = bookings.findIndex(b => b.id === bookingId || b.pnr === bookingId);
    if (idx === -1) return { success: false, error: 'Booking not found.' };
    
    const oldStatus = bookings[idx].status;
    bookings[idx].status = status;
    
    if (status === 'cancelled') {
      bookings[idx].cancelledAt = new Date().toISOString();
      
      // If it was a pre-purchased group booking, return the seats to the inventory block
      if (bookings[idx].isPrepurchased && bookings[idx].prepurchasedBlockId && oldStatus !== 'cancelled') {
        const inventory = getPrepurchasedInventory();
        const blockIdx = inventory.findIndex(b => b.id === bookings[idx].prepurchasedBlockId);
        if (blockIdx !== -1) {
          inventory[blockIdx].seatsRemaining = Math.min(
            inventory[blockIdx].totalSeats,
            inventory[blockIdx].seatsRemaining + bookings[idx].passengers.length
          );
          _set(KEYS.PREPURCHASED_INVENTORY, inventory);
        }
      }
    }
    _set(KEYS.BOOKINGS, bookings);
    return { success: true, booking: bookings[idx] };
  }

  function searchBookings(query) {
    const bookings = _get(KEYS.BOOKINGS) || [];
    const q = query.toLowerCase();
    return bookings.filter(b =>
      b.pnr.toLowerCase().includes(q) ||
      b.origin.toLowerCase().includes(q) ||
      b.destination.toLowerCase().includes(q) ||
      b.flightNumber.toLowerCase().includes(q) ||
      b.passengers.some(p => p.name.toLowerCase().includes(q))
    );
  }

  // ═══════════════════════════════════════
  // AGENT WALLET & COMMISSION
  // ═══════════════════════════════════════

  function getAgentWallet(agentId) {
    const wallets = _get(KEYS.AGENT_WALLETS) || {};
    return wallets[agentId] || { balance: 0, totalEarned: 0, totalWithdrawn: 0 };
  }

  function addAgentCommission(agentId, amount, pnr) {
    const wallets = _get(KEYS.AGENT_WALLETS) || {};
    if (!wallets[agentId]) {
      wallets[agentId] = { balance: 0, totalEarned: 0, totalWithdrawn: 0 };
    }
    wallets[agentId].balance += amount;
    wallets[agentId].totalEarned += amount;
    _set(KEYS.AGENT_WALLETS, wallets);

    // Add transaction
    const transactions = _get(KEYS.AGENT_TRANSACTIONS) || {};
    if (!transactions[agentId]) transactions[agentId] = [];
    transactions[agentId].unshift({
      id: 'txn_' + Date.now(),
      type: 'commission',
      amount: amount,
      description: `Commission earned: PNR ${pnr}`,
      date: new Date().toISOString(),
      balance: wallets[agentId].balance
    });
    _set(KEYS.AGENT_TRANSACTIONS, transactions);
  }

  function requestWithdrawal(agentId, amount) {
    const wallets = _get(KEYS.AGENT_WALLETS) || {};
    if (!wallets[agentId] || wallets[agentId].balance < amount) {
      return { success: false, error: 'Insufficient balance.' };
    }
    wallets[agentId].balance -= amount;
    wallets[agentId].totalWithdrawn += amount;
    _set(KEYS.AGENT_WALLETS, wallets);

    const transactions = _get(KEYS.AGENT_TRANSACTIONS) || {};
    if (!transactions[agentId]) transactions[agentId] = [];
    transactions[agentId].unshift({
      id: 'txn_' + Date.now(),
      type: 'withdrawal',
      amount: -amount,
      description: `Withdrawal processed: ₹${amount.toLocaleString('en-IN')}`,
      date: new Date().toISOString(),
      balance: wallets[agentId].balance
    });
    _set(KEYS.AGENT_TRANSACTIONS, transactions);

    return { success: true, newBalance: wallets[agentId].balance };
  }

  function getAgentTransactions(agentId) {
    const transactions = _get(KEYS.AGENT_TRANSACTIONS) || {};
    return transactions[agentId] || [];
  }

  function adjustAgentWallet(agentId, type, amount, description) {
    const wallets = _get(KEYS.AGENT_WALLETS) || {};
    if (!wallets[agentId]) {
      wallets[agentId] = { balance: 0, totalEarned: 0, totalWithdrawn: 0 };
    }

    if (type === 'debit') {
      if (wallets[agentId].balance < amount) {
        return { success: false, error: 'Insufficient wallet balance.' };
      }
      wallets[agentId].balance -= amount;
      wallets[agentId].totalWithdrawn += amount;
    } else {
      wallets[agentId].balance += amount;
      wallets[agentId].totalEarned += amount;
    }

    _set(KEYS.AGENT_WALLETS, wallets);

    const transactions = _get(KEYS.AGENT_TRANSACTIONS) || {};
    if (!transactions[agentId]) transactions[agentId] = [];
    transactions[agentId].unshift({
      id: 'txn_' + Date.now(),
      type: type,
      amount: type === 'debit' ? -amount : amount,
      description: description || `Admin adjustment: ${type === 'debit' ? 'Debit' : 'Credit'}`,
      date: new Date().toISOString(),
      balance: wallets[agentId].balance
    });
    _set(KEYS.AGENT_TRANSACTIONS, transactions);

    return { success: true, balance: wallets[agentId].balance };
  }

  function impersonateUser(userId, role) {
    if (role === 'customer') {
      const users = _get(KEYS.USERS) || [];
      const user = users.find(u => u.id === userId);
      if (user) {
        _set(KEYS.SESSION, { userId: user.id, role: 'customer', name: user.name, email: user.email });
        return { success: true, redirect: 'index.html' };
      }
    } else if (role === 'agent') {
      const agents = _get(KEYS.AGENTS) || [];
      const agent = agents.find(u => u.id === userId);
      if (agent) {
        _set(KEYS.SESSION, { userId: agent.id, role: 'agent', name: agent.ownerName, email: agent.email, agencyName: agent.agencyName });
        return { success: true, redirect: 'agent-dashboard.html' };
      }
    } else if (role === 'supplier') {
      const suppliers = _get(KEYS.SUPPLIERS) || [];
      const supplier = suppliers.find(u => u.id === userId);
      if (supplier) {
        _set(KEYS.SESSION, { userId: supplier.id, role: 'supplier', name: supplier.name, email: supplier.email });
        return { success: true, redirect: 'supplier-dashboard.html' };
      }
    }
    return { success: false, error: 'User not found.' };
  }

  // ═══════════════════════════════════════
  // MARKUP RULES
  // ═══════════════════════════════════════

  function getMarkupRules(agentId) {
    const markups = _get(KEYS.MARKUP_RULES) || {};
    return markups[agentId] || [];
  }

  function addMarkupRule(agentId, rule) {
    const markups = _get(KEYS.MARKUP_RULES) || {};
    if (!markups[agentId]) markups[agentId] = [];
    rule.id = 'mr_' + Date.now();
    markups[agentId].push(rule);
    _set(KEYS.MARKUP_RULES, markups);
    return { success: true, rule };
  }

  function removeMarkupRule(agentId, ruleId) {
    const markups = _get(KEYS.MARKUP_RULES) || {};
    if (!markups[agentId]) return { success: false };
    markups[agentId] = markups[agentId].filter(r => r.id !== ruleId);
    _set(KEYS.MARKUP_RULES, markups);
    return { success: true };
  }

  function calculateAgentMarkup(agentId, flight) {
    const rules = getMarkupRules(agentId);
    let totalMarkup = 0;
    rules.forEach(rule => {
      if (rule.applyTo === 'all' ||
        rule.applyTo === flight.airlineCode ||
        rule.applyTo === `${flight.origin}-${flight.destination}`) {
        if (rule.type === 'flat') {
          totalMarkup += rule.amount;
        } else if (rule.type === 'percentage') {
          totalMarkup += Math.round(flight.prices.economy * rule.amount / 100);
        }
      }
    });
    return totalMarkup;
  }

  // ═══════════════════════════════════════
  // B2B PRE-PURCHASED INVENTORY
  // ═══════════════════════════════════════

  function getSuppliers() {
    return _get(KEYS.SUPPLIERS) || [];
  }

  function addSupplier(sup) {
    const suppliers = getSuppliers();
    sup.id = 'sup_' + Date.now();
    sup.createdAt = new Date().toISOString();
    suppliers.push(sup);
    _set(KEYS.SUPPLIERS, suppliers);
    return { success: true, supplier: sup };
  }

  function registerSupplier(sup) {
    const suppliers = getSuppliers();
    if (suppliers.find(s => s.email === sup.email)) {
      return { success: false, error: 'Email already registered.' };
    }
    sup.id = 'sup_' + Date.now();
    sup.status = 'active';
    sup.createdAt = new Date().toISOString();
    suppliers.push(sup);
    _set(KEYS.SUPPLIERS, suppliers);
    return { success: true, supplier: sup };
  }

  function removeSupplier(id) {
    let suppliers = getSuppliers();
    suppliers = suppliers.filter(s => s.id !== id);
    _set(KEYS.SUPPLIERS, suppliers);
    
    // Also clean up their pre-purchased inventory blocks
    let inventory = getPrepurchasedInventory();
    inventory = inventory.filter(b => b.supplierId !== id);
    _set(KEYS.PREPURCHASED_INVENTORY, inventory);
    
    return { success: true };
  }

  function updateSupplierStatus(id, status) {
    const suppliers = getSuppliers();
    const supplier = suppliers.find(s => s.id === id);
    if (supplier) {
      supplier.status = status;
      _set(KEYS.SUPPLIERS, suppliers);
      return { success: true, supplier };
    }
    return { success: false, error: 'Supplier not found' };
  }

  function updateSupplierDetails(id, details) {
    const suppliers = getSuppliers();
    const supplier = suppliers.find(s => s.id === id);
    if (supplier) {
      if (details.email && details.email !== supplier.email) {
        if (suppliers.some(s => s.email === details.email)) {
          return { success: false, error: 'Email already in use.' };
        }
      }
      Object.assign(supplier, details);
      _set(KEYS.SUPPLIERS, suppliers);
      return { success: true, supplier };
    }
    return { success: false, error: 'Supplier not found' };
  }

  function getPrepurchasedInventory() {
    return _get(KEYS.PREPURCHASED_INVENTORY) || [];
  }

  function addPrepurchasedBlock(block) {
    const inventory = getPrepurchasedInventory();
    block.id = 'pp_' + Date.now();
    block.seatsRemaining = block.totalSeats;
    block.createdAt = new Date().toISOString();
    inventory.push(block);
    _set(KEYS.PREPURCHASED_INVENTORY, inventory);
    return { success: true, block };
  }

  function removePrepurchasedBlock(blockId) {
    let inventory = getPrepurchasedInventory();
    inventory = inventory.filter(b => b.id !== blockId);
    _set(KEYS.PREPURCHASED_INVENTORY, inventory);
    return { success: true };
  }

  function getAvailablePrepurchasedBlock(airlineCode, flightNumber, date, fareClass, paxCount) {
    const inventory = getPrepurchasedInventory();
    return inventory.find(b =>
      b.airlineCode === airlineCode &&
      b.flightNumber === flightNumber &&
      b.date === date &&
      b.fareClass === fareClass &&
      b.seatsRemaining >= paxCount
    ) || null;
  }

  function deductPrepurchasedSeats(blockId, count) {
    const inventory = getPrepurchasedInventory();
    const idx = inventory.findIndex(b => b.id === blockId);
    if (idx !== -1) {
      inventory[idx].seatsRemaining = Math.max(0, inventory[idx].seatsRemaining - count);
      _set(KEYS.PREPURCHASED_INVENTORY, inventory);
      return true;
    }
    return false;
  }

  // ═══════════════════════════════════════
  // ADMIN: CUSTOM FLIGHTS & SETTINGS
  // ═══════════════════════════════════════

  function addCustomFlight(flightData) {
    const flights = _get(KEYS.CUSTOM_FLIGHTS) || [];
    flightData.id = 'cf_' + Date.now();
    flightData.isCustom = true;
    flights.push(flightData);
    _set(KEYS.CUSTOM_FLIGHTS, flights);
    return { success: true, flight: flightData };
  }

  function removeCustomFlight(flightId) {
    let flights = _get(KEYS.CUSTOM_FLIGHTS) || [];
    flights = flights.filter(f => f.id !== flightId);
    _set(KEYS.CUSTOM_FLIGHTS, flights);
    return { success: true };
  }

  function getCustomFlights() {
    return _get(KEYS.CUSTOM_FLIGHTS) || [];
  }

  function getSettings() {
    const settings = _get(KEYS.SETTINGS) || {};
    const defaults = {
      heroTitle: "India's Most Trusted<br><span class=\"text-gradient\">Flight Search Engine</span>",
      heroSubtitle: "Search, compare, and book flights across 28 Indian airports with a fully self-managed inventory of 6 major airlines. Real-time pricing, instant confirmations, and zero hidden charges.",
      promoCode: "SPECIALFARE500",
      promoText: "🎉 <strong>Special Offer:</strong> Get flat ₹500 off on your first booking! Use code <strong>SPECIALFARE500</strong> &nbsp;|&nbsp; 🔒 Secure Payments &nbsp;|&nbsp; ✈ Real-time Availability",
      statAirports: 28,
      statAirlines: 6,
      statDailyFlights: 200,
      statRoutes: 50,
      feat1Title: "Best Fares Guaranteed",
      feat1Desc: "Dynamic pricing engine scans all available fares across our 6 airline partners. No markup, no hidden fees — just transparent pricing with full GST breakdowns.",
      feat2Title: "Instant Booking",
      feat2Desc: "From search to confirmation in under 60 seconds. Automated PNR generation, instant e-tickets, and real-time seat assignment for a seamless experience.",
      feat3Title: "Real-time Seat Availability",
      feat3Desc: "Live seat inventory across Economy, Premium Economy, and Business classes. Interactive seat map lets you choose your preferred seat at booking.",
      feat4Title: "B2B Travel Agent Portal",
      feat4Desc: "Full-featured travel agent dashboard with custom markup rules, commission tracking, wallet management, and dedicated B2B booking capabilities.",
      feat5Title: "Mobile-First Design",
      feat5Desc: "Fully responsive interface designed for modern devices. Search and book from any screen size with the same premium experience across all platforms.",
      feat6Title: "Secure & Reliable",
      feat6Desc: "Enterprise-grade security for every transaction. Role-based access control for customers, agents, and admins with complete audit trails.",
      footerCompanyName: "Special Fare Aviation Pvt. Ltd.",
      footerAddress: "Chailengta, LTV, Dhalai Tripur",
      footerPhone: "+91 7001507011",
      footerEmail: "support@specialfare.in",
      smepayEnabled: false,
      smepayMerchantId: "SME_DEMO_MERCHANT",
      smepayApiKey: "sme_sk_test_51N2xDemoKey",
      smepayMode: "sandbox"
    };
    return Object.assign({}, defaults, settings);
  }

  function updateSettings(updates) {
    const settings = _get(KEYS.SETTINGS) || {};
    Object.assign(settings, updates);
    _set(KEYS.SETTINGS, settings);
    return { success: true, settings };
  }

  function addAnnouncement(text) {
    const announcements = _get(KEYS.ANNOUNCEMENTS) || [];
    announcements.unshift({
      id: 'ann_' + Date.now(),
      text: text,
      createdAt: new Date().toISOString(),
      active: true
    });
    _set(KEYS.ANNOUNCEMENTS, announcements);
    return { success: true };
  }

  function getAnnouncements() {
    return (_get(KEYS.ANNOUNCEMENTS) || []).filter(a => a.active);
  }

  function removeAnnouncement(id) {
    let announcements = _get(KEYS.ANNOUNCEMENTS) || [];
    announcements = announcements.filter(a => a.id !== id);
    _set(KEYS.ANNOUNCEMENTS, announcements);
    return { success: true };
  }

  // ═══════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════

  function getAnalytics() {
    const bookings = getAllBookings();
    const agents = getAllAgents();
    const customers = getAllCustomers();

    const confirmed = bookings.filter(b => b.status === 'confirmed');
    const cancelled = bookings.filter(b => b.status === 'cancelled');

    const totalRevenue = confirmed.reduce((sum, b) => sum + b.totalFare, 0);
    const totalCommissions = confirmed.reduce((sum, b) => sum + (b.agentCommission || 0), 0);

    // Revenue by airline
    const revenueByAirline = {};
    confirmed.forEach(b => {
      if (!revenueByAirline[b.airlineName]) revenueByAirline[b.airlineName] = 0;
      revenueByAirline[b.airlineName] += b.totalFare;
    });

    // Bookings by route
    const bookingsByRoute = {};
    confirmed.forEach(b => {
      const route = `${b.origin}-${b.destination}`;
      if (!bookingsByRoute[route]) bookingsByRoute[route] = 0;
      bookingsByRoute[route]++;
    });

    // Bookings over time (last 30 days)
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = confirmed.filter(b => b.bookedAt.startsWith(dateStr)).length;
      last30Days.push({ date: dateStr, count });
    }

    return {
      totalBookings: bookings.length,
      confirmedBookings: confirmed.length,
      cancelledBookings: cancelled.length,
      totalRevenue,
      totalCommissions,
      totalAgents: agents.length,
      approvedAgents: agents.filter(a => a.status === 'approved').length,
      pendingAgents: agents.filter(a => a.status === 'pending').length,
      totalCustomers: customers.length,
      revenueByAirline,
      bookingsByRoute,
      bookingsOverTime: last30Days
    };
  }

  // ═══════════════════════════════════════
  // FLIGHT SEARCH (Only Admin Custom Flights & Supplier Pre-purchased Blocks)
  // ═══════════════════════════════════════

  function searchAllFlights(origin, destination, date) {
    // 1. Get all custom flights uploaded by Admin that match origin, destination, date
    const customFlights = getCustomFlights();
    let matchingCustom = customFlights.filter(f =>
      f.origin === origin && f.destination === destination && f.date === date
    );

    // Deep copy to prevent mutating the database state directly
    matchingCustom = JSON.parse(JSON.stringify(matchingCustom));

    // 2. Get all supplier pre-purchased inventory blocks matching origin, destination, date
    const supplierBlocks = getPrepurchasedInventory();
    const matchingBlocks = supplierBlocks.filter(b =>
      b.origin === origin && b.destination === destination && b.date === date && b.seatsRemaining > 0
    );

    // 3. Group matching supplier blocks by flight key (airlineCode + flightNumber)
    const groupedBlocks = {};
    matchingBlocks.forEach(block => {
      const key = `${block.airlineCode}_${block.flightNumber}`;
      if (!groupedBlocks[key]) {
        groupedBlocks[key] = [];
      }
      groupedBlocks[key].push(block);
    });

    // 4. Merge supplier blocks into existing custom flights or create dynamic flights
    for (const key in groupedBlocks) {
      const blocks = groupedBlocks[key];
      const firstBlock = blocks[0];

      // Check if there is a matching custom flight
      const customFlightIndex = matchingCustom.findIndex(cf =>
        cf.airlineCode === firstBlock.airlineCode && cf.flightNumber === firstBlock.flightNumber
      );

      if (customFlightIndex !== -1) {
        // Merge supplier blocks into existing custom flight (overriding prices & available seats)
        const cf = matchingCustom[customFlightIndex];
        blocks.forEach(block => {
          cf.prices[block.fareClass] = block.sellingPrice;
          cf.availableSeats[block.fareClass] = block.seatsRemaining;
          if (!cf.classes.includes(block.fareClass)) {
            cf.classes.push(block.fareClass);
          }
        });
      } else {
        // Create a new dynamic flight from supplier blocks
        const airline = FlightData.getAirline(firstBlock.airlineCode);
        const originAirport = FlightData.getAirport(firstBlock.origin);
        const destAirport = FlightData.getAirport(firstBlock.destination);
        const routeInfo = FlightData.getRouteInfo(firstBlock.origin, firstBlock.destination);
        const duration = routeInfo ? routeInfo.duration : 120;
        
        // Find schedule template for departure time if exists
        const template = FlightData.SCHEDULE_TEMPLATES.find(t => t.flightNum === firstBlock.flightNumber);
        const departureTime = template ? template.departure : '12:00';
        
        // Calculate arrival time
        const [depH, depM] = departureTime.split(':').map(Number);
        const arrivalDate = new Date();
        arrivalDate.setHours(depH, depM + duration, 0, 0);
        const arrivalTime = `${String(arrivalDate.getHours()).padStart(2, '0')}:${String(arrivalDate.getMinutes()).padStart(2, '0')}`;
        
        const prices = {};
        const availableSeats = {};
        const classes = [];

        blocks.forEach(block => {
          prices[block.fareClass] = block.sellingPrice;
          availableSeats[block.fareClass] = block.seatsRemaining;
          classes.push(block.fareClass);
        });

        // Unique deterministic stable ID for supplier flights
        const flightId = `sf_${firstBlock.airlineCode}_${firstBlock.flightNumber.replace('-', '')}_${firstBlock.date.replace(/-/g, '')}`;

        const newFlight = {
          id: flightId,
          flightNumber: firstBlock.flightNumber,
          airlineCode: firstBlock.airlineCode,
          airlineName: airline ? airline.name : firstBlock.airlineCode,
          airlineLogo: airline ? airline.logo : '✈️',
          airlineColor: airline ? airline.color : '#0ea5e9',
          airlineRating: airline ? airline.rating : 4.0,
          origin: firstBlock.origin,
          destination: firstBlock.destination,
          originAirport,
          destinationAirport: destAirport,
          date: firstBlock.date,
          departureTime,
          arrivalTime,
          duration,
          distance: routeInfo ? routeInfo.distance : 0,
          stops: 0,
          stopText: 'Non-stop',
          prices,
          availableSeats,
          classes,
          aircraft: 'Supplier Block',
          status: 'scheduled'
        };
        matchingCustom.push(newFlight);
      }
    }

    return matchingCustom;
  }

  // ── Forgot / Reset Password ──
  function verifyEmailExists(email, role) {
    let key;
    if (role === 'admin') {
      key = KEYS.ADMINS;
    } else if (role === 'agent') {
      key = KEYS.AGENTS;
    } else if (role === 'supplier') {
      key = KEYS.SUPPLIERS;
    } else {
      key = KEYS.USERS;
    }

    const list = _get(key) || [];
    return list.some(u => (role === 'admin' ? u.username : u.email) === email);
  }

  function resetUserPassword(email, role, newPassword) {
    let key;
    if (role === 'admin') {
      key = KEYS.ADMINS;
    } else if (role === 'agent') {
      key = KEYS.AGENTS;
    } else if (role === 'supplier') {
      key = KEYS.SUPPLIERS;
    } else {
      key = KEYS.USERS;
    }

    const list = _get(key) || [];
    const idx = list.findIndex(u => (role === 'admin' ? u.username : u.email) === email);
    if (idx === -1) return { success: false, error: 'Email address not found.' };

    list[idx].password = newPassword;
    _set(key, list);
    return { success: true };
  }

  // ── Reset all data ──
  function resetAllData() {
    Object.values(KEYS).forEach(key => _remove(key));
    initialize();
  }

  // ── Public API ──
  return {
    initialize,
    // Session
    login,
    logout,
    getSession,
    isLoggedIn,
    getCurrentUserRole,
    // Users
    registerCustomer,
    registerAgent,
    getAllCustomers,
    getAllAgents,
    getAgent,
    getCustomer,
    updateAgentStatus,
    updateAgentCommission,
    // Bookings
    createBooking,
    getBooking,
    getBookingsByUser,
    getBookingsByAgent,
    getAllBookings,
    updateBookingStatus,
    searchBookings,
    generatePNR,
    // Agent Wallet
    getAgentWallet,
    addAgentCommission,
    requestWithdrawal,
    getAgentTransactions,
    // Markup
    getMarkupRules,
    addMarkupRule,
    removeMarkupRule,
    calculateAgentMarkup,
    // Admin
    addCustomFlight,
    removeCustomFlight,
    getCustomFlights,
    getSettings,
    updateSettings,
    addAnnouncement,
    getAnnouncements,
    removeAnnouncement,
    // Analytics
    getAnalytics,
    // Search
    searchAllFlights,
    // B2B Pre-purchased
    getSuppliers,
    addSupplier,
    registerSupplier,
    removeSupplier,
    updateSupplierStatus,
    updateSupplierDetails,
    getPrepurchasedInventory,
    addPrepurchasedBlock,
    removePrepurchasedBlock,
    getAvailablePrepurchasedBlock,
    deductPrepurchasedSeats,
    // Impersonate and Adjust
    impersonateUser,
    adjustAgentWallet,
    // Reset
    resetAllData,
    // Password Recovery
    verifyEmailExists,
    resetUserPassword
  };

})();

// Auto-initialize on load
Storage.initialize();

