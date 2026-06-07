/* ============================================================
   FLIGHT BOOKING ENGINE — DATA LAYER
   Indian Airport, Airline, Route seed data & flight generator
   ============================================================ */

const FlightData = (() => {

  // ── Indian Airports Database ──
  const AIRPORTS = [
    { code: 'DEL', city: 'New Delhi', name: 'Indira Gandhi International Airport', state: 'Delhi', tier: 1 },
    { code: 'BOM', city: 'Mumbai', name: 'Chhatrapati Shivaji Maharaj International Airport', state: 'Maharashtra', tier: 1 },
    { code: 'BLR', city: 'Bengaluru', name: 'Kempegowda International Airport', state: 'Karnataka', tier: 1 },
    { code: 'HYD', city: 'Hyderabad', name: 'Rajiv Gandhi International Airport', state: 'Telangana', tier: 1 },
    { code: 'MAA', city: 'Chennai', name: 'Chennai International Airport', state: 'Tamil Nadu', tier: 1 },
    { code: 'CCU', city: 'Kolkata', name: 'Netaji Subhas Chandra Bose International Airport', state: 'West Bengal', tier: 1 },
    { code: 'GOI', city: 'Goa', name: 'Manohar International Airport', state: 'Goa', tier: 1 },
    { code: 'COK', city: 'Kochi', name: 'Cochin International Airport', state: 'Kerala', tier: 1 },
    { code: 'PNQ', city: 'Pune', name: 'Pune Airport', state: 'Maharashtra', tier: 2 },
    { code: 'AMD', city: 'Ahmedabad', name: 'Sardar Vallabhbhai Patel International Airport', state: 'Gujarat', tier: 1 },
    { code: 'JAI', city: 'Jaipur', name: 'Jaipur International Airport', state: 'Rajasthan', tier: 1 },
    { code: 'LKO', city: 'Lucknow', name: 'Chaudhary Charan Singh International Airport', state: 'Uttar Pradesh', tier: 1 },
    { code: 'GAU', city: 'Guwahati', name: 'Lokpriya Gopinath Bordoloi International Airport', state: 'Assam', tier: 2 },
    { code: 'SXR', city: 'Srinagar', name: 'Sheikh ul-Alam International Airport', state: 'Jammu & Kashmir', tier: 2 },
    { code: 'IXC', city: 'Chandigarh', name: 'Chandigarh International Airport', state: 'Punjab', tier: 2 },
    { code: 'VNS', city: 'Varanasi', name: 'Lal Bahadur Shastri International Airport', state: 'Uttar Pradesh', tier: 2 },
    { code: 'PAT', city: 'Patna', name: 'Jay Prakash Narayan International Airport', state: 'Bihar', tier: 2 },
    { code: 'BBI', city: 'Bhubaneswar', name: 'Biju Patnaik International Airport', state: 'Odisha', tier: 2 },
    { code: 'RPR', city: 'Raipur', name: 'Swami Vivekananda Airport', state: 'Chhattisgarh', tier: 2 },
    { code: 'IDR', city: 'Indore', name: 'Devi Ahilyabai Holkar Airport', state: 'Madhya Pradesh', tier: 2 },
    { code: 'NAG', city: 'Nagpur', name: 'Dr. Babasaheb Ambedkar International Airport', state: 'Maharashtra', tier: 2 },
    { code: 'TRV', city: 'Thiruvananthapuram', name: 'Trivandrum International Airport', state: 'Kerala', tier: 2 },
    { code: 'IXB', city: 'Bagdogra', name: 'Bagdogra Airport', state: 'West Bengal', tier: 2 },
    { code: 'DED', city: 'Dehradun', name: 'Jolly Grant Airport', state: 'Uttarakhand', tier: 2 },
    { code: 'IXE', city: 'Mangaluru', name: 'Mangalore International Airport', state: 'Karnataka', tier: 2 },
    { code: 'UDR', city: 'Udaipur', name: 'Maharana Pratap Airport', state: 'Rajasthan', tier: 2 },
    { code: 'IXR', city: 'Ranchi', name: 'Birsa Munda Airport', state: 'Jharkhand', tier: 2 },
    { code: 'VTZ', city: 'Visakhapatnam', name: 'Visakhapatnam Airport', state: 'Andhra Pradesh', tier: 2 }
  ];

  // ── Airlines Database ──
  const AIRLINES = [
    {
      code: '6E', name: 'IndiGo', logo: '🔵', color: '#3F51B5',
      classes: ['economy', 'premium_economy'],
      seatConfig: { economy: 180, premium_economy: 24 },
      rating: 4.2
    },
    {
      code: 'AI', name: 'Air India', logo: '🟠', color: '#E65100',
      classes: ['economy', 'premium_economy', 'business'],
      seatConfig: { economy: 160, premium_economy: 24, business: 12 },
      rating: 3.8
    },
    {
      code: 'SG', name: 'SpiceJet', logo: '🔴', color: '#D32F2F',
      classes: ['economy'],
      seatConfig: { economy: 186 },
      rating: 3.5
    },
    {
      code: 'UK', name: 'Vistara', logo: '🟣', color: '#6A1B9A',
      classes: ['economy', 'premium_economy', 'business'],
      seatConfig: { economy: 150, premium_economy: 24, business: 16 },
      rating: 4.5
    },
    {
      code: 'QP', name: 'Akasa Air', logo: '🟡', color: '#FF6F00',
      classes: ['economy'],
      seatConfig: { economy: 186 },
      rating: 4.0
    },
    {
      code: 'G8', name: 'Go First', logo: '🟢', color: '#2E7D32',
      classes: ['economy'],
      seatConfig: { economy: 180 },
      rating: 3.3
    }
  ];

  // ── Route Definitions with Base Prices (one-way, economy) ──
  const ROUTES = {
    'DEL-BOM': { distance: 1148, basePrice: 4500, duration: 130 },
    'DEL-BLR': { distance: 1740, basePrice: 5200, duration: 165 },
    'DEL-HYD': { distance: 1264, basePrice: 4800, duration: 140 },
    'DEL-MAA': { distance: 1760, basePrice: 5500, duration: 170 },
    'DEL-CCU': { distance: 1305, basePrice: 4600, duration: 135 },
    'DEL-GOI': { distance: 1506, basePrice: 5000, duration: 155 },
    'DEL-COK': { distance: 2067, basePrice: 6000, duration: 190 },
    'DEL-PNQ': { distance: 1172, basePrice: 4200, duration: 130 },
    'DEL-AMD': { distance: 776, basePrice: 3500, duration: 100 },
    'DEL-JAI': { distance: 260, basePrice: 2800, duration: 60 },
    'DEL-LKO': { distance: 510, basePrice: 3000, duration: 75 },
    'DEL-GAU': { distance: 1820, basePrice: 5500, duration: 170 },
    'DEL-SXR': { distance: 641, basePrice: 4000, duration: 90 },
    'DEL-IXC': { distance: 244, basePrice: 2600, duration: 55 },
    'DEL-VNS': { distance: 677, basePrice: 3200, duration: 85 },
    'DEL-PAT': { distance: 995, basePrice: 3800, duration: 110 },
    'DEL-DED': { distance: 235, basePrice: 2800, duration: 55 },
    'BOM-BLR': { distance: 842, basePrice: 3800, duration: 105 },
    'BOM-HYD': { distance: 620, basePrice: 3200, duration: 85 },
    'BOM-MAA': { distance: 1032, basePrice: 4200, duration: 120 },
    'BOM-CCU': { distance: 1661, basePrice: 5500, duration: 165 },
    'BOM-GOI': { distance: 441, basePrice: 2800, duration: 65 },
    'BOM-COK': { distance: 1067, basePrice: 4000, duration: 115 },
    'BOM-PNQ': { distance: 149, basePrice: 2500, duration: 50 },
    'BOM-AMD': { distance: 493, basePrice: 2800, duration: 70 },
    'BOM-JAI': { distance: 957, basePrice: 3800, duration: 120 },
    'BOM-LKO': { distance: 1095, basePrice: 4200, duration: 130 },
    'BOM-NAG': { distance: 648, basePrice: 3200, duration: 90 },
    'BOM-IDR': { distance: 482, basePrice: 3000, duration: 75 },
    'BLR-HYD': { distance: 501, basePrice: 2800, duration: 70 },
    'BLR-MAA': { distance: 284, basePrice: 2500, duration: 55 },
    'BLR-CCU': { distance: 1561, basePrice: 5200, duration: 155 },
    'BLR-GOI': { distance: 440, basePrice: 2800, duration: 70 },
    'BLR-COK': { distance: 479, basePrice: 2600, duration: 65 },
    'BLR-PNQ': { distance: 726, basePrice: 3200, duration: 95 },
    'BLR-TRV': { distance: 586, basePrice: 3000, duration: 75 },
    'BLR-IXE': { distance: 262, basePrice: 2500, duration: 55 },
    'HYD-MAA': { distance: 519, basePrice: 2800, duration: 70 },
    'HYD-CCU': { distance: 1185, basePrice: 4600, duration: 140 },
    'HYD-GOI': { distance: 595, basePrice: 3000, duration: 80 },
    'HYD-VTZ': { distance: 499, basePrice: 2800, duration: 70 },
    'HYD-BBI': { distance: 797, basePrice: 3500, duration: 100 },
    'MAA-COK': { distance: 512, basePrice: 2800, duration: 70 },
    'MAA-TRV': { distance: 610, basePrice: 3000, duration: 80 },
    'CCU-GAU': { distance: 510, basePrice: 2800, duration: 65 },
    'CCU-PAT': { distance: 489, basePrice: 2600, duration: 60 },
    'CCU-BBI': { distance: 375, basePrice: 2500, duration: 55 },
    'CCU-IXB': { distance: 504, basePrice: 2800, duration: 60 },
    'CCU-IXR': { distance: 314, basePrice: 2500, duration: 55 },
    'GOI-COK': { distance: 593, basePrice: 3000, duration: 80 },
    'LKO-PAT': { distance: 554, basePrice: 3000, duration: 70 },
    'JAI-UDR': { distance: 388, basePrice: 2800, duration: 60 },
    'AMD-GOI': { distance: 891, basePrice: 3500, duration: 110 }
  };

  // ── Flight Schedule Templates ──
  // Each template generates a daily flight at the specified departure time
  const SCHEDULE_TEMPLATES = [
    // DEL-BOM (High frequency, 6 daily)
    { route: 'DEL-BOM', airline: '6E', departure: '06:00', flightNum: '6E-2001' },
    { route: 'DEL-BOM', airline: 'AI', departure: '08:30', flightNum: 'AI-801' },
    { route: 'DEL-BOM', airline: 'UK', departure: '10:15', flightNum: 'UK-901' },
    { route: 'DEL-BOM', airline: 'SG', departure: '13:00', flightNum: 'SG-101' },
    { route: 'DEL-BOM', airline: '6E', departure: '16:45', flightNum: '6E-2003' },
    { route: 'DEL-BOM', airline: 'QP', departure: '19:30', flightNum: 'QP-501' },
    // BOM-DEL
    { route: 'BOM-DEL', airline: '6E', departure: '05:30', flightNum: '6E-2002' },
    { route: 'BOM-DEL', airline: 'AI', departure: '09:00', flightNum: 'AI-802' },
    { route: 'BOM-DEL', airline: 'UK', departure: '11:30', flightNum: 'UK-902' },
    { route: 'BOM-DEL', airline: 'SG', departure: '14:15', flightNum: 'SG-102' },
    { route: 'BOM-DEL', airline: '6E', departure: '17:30', flightNum: '6E-2004' },
    { route: 'BOM-DEL', airline: 'QP', departure: '20:45', flightNum: 'QP-502' },
    // DEL-BLR
    { route: 'DEL-BLR', airline: '6E', departure: '06:30', flightNum: '6E-2011' },
    { route: 'DEL-BLR', airline: 'AI', departure: '09:45', flightNum: 'AI-811' },
    { route: 'DEL-BLR', airline: 'UK', departure: '14:00', flightNum: 'UK-911' },
    { route: 'DEL-BLR', airline: 'QP', departure: '18:30', flightNum: 'QP-511' },
    // BLR-DEL
    { route: 'BLR-DEL', airline: '6E', departure: '07:00', flightNum: '6E-2012' },
    { route: 'BLR-DEL', airline: 'AI', departure: '10:30', flightNum: 'AI-812' },
    { route: 'BLR-DEL', airline: 'UK', departure: '15:00', flightNum: 'UK-912' },
    { route: 'BLR-DEL', airline: 'QP', departure: '19:45', flightNum: 'QP-512' },
    // DEL-HYD
    { route: 'DEL-HYD', airline: '6E', departure: '07:15', flightNum: '6E-2021' },
    { route: 'DEL-HYD', airline: 'AI', departure: '11:00', flightNum: 'AI-821' },
    { route: 'DEL-HYD', airline: 'UK', departure: '16:30', flightNum: 'UK-921' },
    // HYD-DEL
    { route: 'HYD-DEL', airline: '6E', departure: '06:45', flightNum: '6E-2022' },
    { route: 'HYD-DEL', airline: 'AI', departure: '12:00', flightNum: 'AI-822' },
    { route: 'HYD-DEL', airline: 'UK', departure: '17:30', flightNum: 'UK-922' },
    // DEL-MAA
    { route: 'DEL-MAA', airline: '6E', departure: '06:00', flightNum: '6E-2031' },
    { route: 'DEL-MAA', airline: 'AI', departure: '10:30', flightNum: 'AI-831' },
    { route: 'DEL-MAA', airline: 'SG', departure: '15:15', flightNum: 'SG-131' },
    // MAA-DEL
    { route: 'MAA-DEL', airline: '6E', departure: '07:30', flightNum: '6E-2032' },
    { route: 'MAA-DEL', airline: 'AI', departure: '11:45', flightNum: 'AI-832' },
    { route: 'MAA-DEL', airline: 'SG', departure: '16:30', flightNum: 'SG-132' },
    // DEL-CCU
    { route: 'DEL-CCU', airline: '6E', departure: '08:00', flightNum: '6E-2041' },
    { route: 'DEL-CCU', airline: 'AI', departure: '12:30', flightNum: 'AI-841' },
    { route: 'DEL-CCU', airline: 'G8', departure: '17:00', flightNum: 'G8-141' },
    // CCU-DEL
    { route: 'CCU-DEL', airline: '6E', departure: '09:15', flightNum: '6E-2042' },
    { route: 'CCU-DEL', airline: 'AI', departure: '13:45', flightNum: 'AI-842' },
    { route: 'CCU-DEL', airline: 'G8', departure: '18:30', flightNum: 'G8-142' },
    // DEL-GOI
    { route: 'DEL-GOI', airline: '6E', departure: '07:30', flightNum: '6E-2051' },
    { route: 'DEL-GOI', airline: 'AI', departure: '13:00', flightNum: 'AI-851' },
    { route: 'DEL-GOI', airline: 'QP', departure: '18:00', flightNum: 'QP-551' },
    // GOI-DEL
    { route: 'GOI-DEL', airline: '6E', departure: '10:30', flightNum: '6E-2052' },
    { route: 'GOI-DEL', airline: 'AI', departure: '15:45', flightNum: 'AI-852' },
    { route: 'GOI-DEL', airline: 'QP', departure: '20:30', flightNum: 'QP-552' },
    // DEL-COK
    { route: 'DEL-COK', airline: 'AI', departure: '08:00', flightNum: 'AI-861' },
    { route: 'DEL-COK', airline: '6E', departure: '14:30', flightNum: '6E-2061' },
    // COK-DEL
    { route: 'COK-DEL', airline: 'AI', departure: '11:00', flightNum: 'AI-862' },
    { route: 'COK-DEL', airline: '6E', departure: '17:30', flightNum: '6E-2062' },
    // BOM-BLR
    { route: 'BOM-BLR', airline: '6E', departure: '06:15', flightNum: '6E-3001' },
    { route: 'BOM-BLR', airline: 'UK', departure: '10:00', flightNum: 'UK-301' },
    { route: 'BOM-BLR', airline: 'SG', departure: '14:30', flightNum: 'SG-301' },
    { route: 'BOM-BLR', airline: 'QP', departure: '19:00', flightNum: 'QP-301' },
    // BLR-BOM
    { route: 'BLR-BOM', airline: '6E', departure: '07:30', flightNum: '6E-3002' },
    { route: 'BLR-BOM', airline: 'UK', departure: '11:45', flightNum: 'UK-302' },
    { route: 'BLR-BOM', airline: 'SG', departure: '16:00', flightNum: 'SG-302' },
    { route: 'BLR-BOM', airline: 'QP', departure: '20:30', flightNum: 'QP-302' },
    // BOM-GOI
    { route: 'BOM-GOI', airline: '6E', departure: '07:00', flightNum: '6E-3011' },
    { route: 'BOM-GOI', airline: 'SG', departure: '12:00', flightNum: 'SG-311' },
    { route: 'BOM-GOI', airline: 'G8', departure: '16:30', flightNum: 'G8-311' },
    // GOI-BOM
    { route: 'GOI-BOM', airline: '6E', departure: '08:30', flightNum: '6E-3012' },
    { route: 'GOI-BOM', airline: 'SG', departure: '13:30', flightNum: 'SG-312' },
    { route: 'GOI-BOM', airline: 'G8', departure: '18:00', flightNum: 'G8-312' },
    // BOM-HYD
    { route: 'BOM-HYD', airline: '6E', departure: '06:30', flightNum: '6E-3021' },
    { route: 'BOM-HYD', airline: 'AI', departure: '11:15', flightNum: 'AI-321' },
    { route: 'BOM-HYD', airline: 'UK', departure: '16:00', flightNum: 'UK-321' },
    // HYD-BOM
    { route: 'HYD-BOM', airline: '6E', departure: '08:00', flightNum: '6E-3022' },
    { route: 'HYD-BOM', airline: 'AI', departure: '13:00', flightNum: 'AI-322' },
    { route: 'HYD-BOM', airline: 'UK', departure: '18:15', flightNum: 'UK-322' },
    // BOM-MAA
    { route: 'BOM-MAA', airline: '6E', departure: '07:45', flightNum: '6E-3031' },
    { route: 'BOM-MAA', airline: 'AI', departure: '13:30', flightNum: 'AI-331' },
    // MAA-BOM
    { route: 'MAA-BOM', airline: '6E', departure: '09:15', flightNum: '6E-3032' },
    { route: 'MAA-BOM', airline: 'AI', departure: '15:00', flightNum: 'AI-332' },
    // BOM-CCU
    { route: 'BOM-CCU', airline: 'AI', departure: '08:30', flightNum: 'AI-341' },
    { route: 'BOM-CCU', airline: '6E', departure: '15:00', flightNum: '6E-3041' },
    // CCU-BOM
    { route: 'CCU-BOM', airline: 'AI', departure: '10:00', flightNum: 'AI-342' },
    { route: 'CCU-BOM', airline: '6E', departure: '16:30', flightNum: '6E-3042' },
    // BOM-PNQ
    { route: 'BOM-PNQ', airline: '6E', departure: '08:00', flightNum: '6E-3051' },
    { route: 'BOM-PNQ', airline: 'SG', departure: '14:00', flightNum: 'SG-351' },
    // PNQ-BOM
    { route: 'PNQ-BOM', airline: '6E', departure: '09:30', flightNum: '6E-3052' },
    { route: 'PNQ-BOM', airline: 'SG', departure: '15:30', flightNum: 'SG-352' },
    // BOM-AMD
    { route: 'BOM-AMD', airline: '6E', departure: '09:00', flightNum: '6E-3061' },
    { route: 'BOM-AMD', airline: 'G8', departure: '15:45', flightNum: 'G8-361' },
    // AMD-BOM
    { route: 'AMD-BOM', airline: '6E', departure: '10:30', flightNum: '6E-3062' },
    { route: 'AMD-BOM', airline: 'G8', departure: '17:15', flightNum: 'G8-362' },
    // BLR-HYD
    { route: 'BLR-HYD', airline: '6E', departure: '07:00', flightNum: '6E-4001' },
    { route: 'BLR-HYD', airline: 'AI', departure: '12:30', flightNum: 'AI-401' },
    // HYD-BLR
    { route: 'HYD-BLR', airline: '6E', departure: '08:30', flightNum: '6E-4002' },
    { route: 'HYD-BLR', airline: 'AI', departure: '14:00', flightNum: 'AI-402' },
    // BLR-MAA
    { route: 'BLR-MAA', airline: '6E', departure: '07:30', flightNum: '6E-4011' },
    { route: 'BLR-MAA', airline: 'UK', departure: '13:00', flightNum: 'UK-411' },
    // MAA-BLR
    { route: 'MAA-BLR', airline: '6E', departure: '09:00', flightNum: '6E-4012' },
    { route: 'MAA-BLR', airline: 'UK', departure: '14:30', flightNum: 'UK-412' },
    // BLR-COK
    { route: 'BLR-COK', airline: '6E', departure: '08:00', flightNum: '6E-4021' },
    { route: 'BLR-COK', airline: 'SG', departure: '14:00', flightNum: 'SG-421' },
    // COK-BLR
    { route: 'COK-BLR', airline: '6E', departure: '10:00', flightNum: '6E-4022' },
    { route: 'COK-BLR', airline: 'SG', departure: '16:00', flightNum: 'SG-422' },
    // BLR-GOI
    { route: 'BLR-GOI', airline: '6E', departure: '09:30', flightNum: '6E-4031' },
    { route: 'BLR-GOI', airline: 'QP', departure: '15:30', flightNum: 'QP-431' },
    // GOI-BLR
    { route: 'GOI-BLR', airline: '6E', departure: '11:00', flightNum: '6E-4032' },
    { route: 'GOI-BLR', airline: 'QP', departure: '17:00', flightNum: 'QP-432' },
    // CCU-GAU
    { route: 'CCU-GAU', airline: '6E', departure: '08:00', flightNum: '6E-5001' },
    { route: 'CCU-GAU', airline: 'AI', departure: '14:30', flightNum: 'AI-501' },
    // GAU-CCU
    { route: 'GAU-CCU', airline: '6E', departure: '10:00', flightNum: '6E-5002' },
    { route: 'GAU-CCU', airline: 'AI', departure: '16:30', flightNum: 'AI-502' },
    // DEL-AMD
    { route: 'DEL-AMD', airline: '6E', departure: '06:45', flightNum: '6E-2071' },
    { route: 'DEL-AMD', airline: 'AI', departure: '12:00', flightNum: 'AI-871' },
    { route: 'DEL-AMD', airline: 'G8', departure: '18:30', flightNum: 'G8-871' },
    // AMD-DEL
    { route: 'AMD-DEL', airline: '6E', departure: '09:00', flightNum: '6E-2072' },
    { route: 'AMD-DEL', airline: 'AI', departure: '14:30', flightNum: 'AI-872' },
    { route: 'AMD-DEL', airline: 'G8', departure: '20:00', flightNum: 'G8-872' },
    // DEL-JAI
    { route: 'DEL-JAI', airline: '6E', departure: '07:00', flightNum: '6E-2081' },
    { route: 'DEL-JAI', airline: 'AI', departure: '11:30', flightNum: 'AI-881' },
    { route: 'DEL-JAI', airline: 'QP', departure: '17:00', flightNum: 'QP-881' },
    // JAI-DEL
    { route: 'JAI-DEL', airline: '6E', departure: '08:15', flightNum: '6E-2082' },
    { route: 'JAI-DEL', airline: 'AI', departure: '13:00', flightNum: 'AI-882' },
    { route: 'JAI-DEL', airline: 'QP', departure: '18:30', flightNum: 'QP-882' },
    // DEL-LKO
    { route: 'DEL-LKO', airline: '6E', departure: '08:30', flightNum: '6E-2091' },
    { route: 'DEL-LKO', airline: 'AI', departure: '14:00', flightNum: 'AI-891' },
    // LKO-DEL
    { route: 'LKO-DEL', airline: '6E', departure: '10:00', flightNum: '6E-2092' },
    { route: 'LKO-DEL', airline: 'AI', departure: '15:30', flightNum: 'AI-892' },
    // HYD-MAA
    { route: 'HYD-MAA', airline: '6E', departure: '07:15', flightNum: '6E-4041' },
    { route: 'HYD-MAA', airline: 'AI', departure: '13:45', flightNum: 'AI-441' },
    // MAA-HYD
    { route: 'MAA-HYD', airline: '6E', departure: '09:00', flightNum: '6E-4042' },
    { route: 'MAA-HYD', airline: 'AI', departure: '15:30', flightNum: 'AI-442' },
    // MAA-COK
    { route: 'MAA-COK', airline: '6E', departure: '08:30', flightNum: '6E-4051' },
    { route: 'MAA-COK', airline: 'SG', departure: '15:00', flightNum: 'SG-451' },
    // COK-MAA
    { route: 'COK-MAA', airline: '6E', departure: '10:00', flightNum: '6E-4052' },
    { route: 'COK-MAA', airline: 'SG', departure: '16:30', flightNum: 'SG-452' },
    // BOM-JAI
    { route: 'BOM-JAI', airline: '6E', departure: '09:30', flightNum: '6E-3071' },
    { route: 'BOM-JAI', airline: 'AI', departure: '16:00', flightNum: 'AI-371' },
    // JAI-BOM
    { route: 'JAI-BOM', airline: '6E', departure: '11:30', flightNum: '6E-3072' },
    { route: 'JAI-BOM', airline: 'AI', departure: '18:00', flightNum: 'AI-372' },
    // Additional regional routes
    { route: 'CCU-PAT', airline: '6E', departure: '09:00', flightNum: '6E-5011' },
    { route: 'PAT-CCU', airline: '6E', departure: '11:00', flightNum: '6E-5012' },
    { route: 'CCU-BBI', airline: '6E', departure: '08:30', flightNum: '6E-5021' },
    { route: 'BBI-CCU', airline: '6E', departure: '10:30', flightNum: '6E-5022' },
    { route: 'DEL-VNS', airline: '6E', departure: '07:45', flightNum: '6E-2101' },
    { route: 'VNS-DEL', airline: '6E', departure: '10:00', flightNum: '6E-2102' },
    { route: 'DEL-PAT', airline: 'AI', departure: '08:00', flightNum: 'AI-901' },
    { route: 'PAT-DEL', airline: 'AI', departure: '11:00', flightNum: 'AI-902' },
    { route: 'BLR-TRV', airline: '6E', departure: '09:00', flightNum: '6E-4061' },
    { route: 'TRV-BLR', airline: '6E', departure: '11:30', flightNum: '6E-4062' },
    { route: 'DEL-IXC', airline: '6E', departure: '08:00', flightNum: '6E-2111' },
    { route: 'IXC-DEL', airline: '6E', departure: '10:15', flightNum: '6E-2112' },
    { route: 'DEL-DED', airline: 'AI', departure: '09:30', flightNum: 'AI-911' },
    { route: 'DED-DEL', airline: 'AI', departure: '11:45', flightNum: 'AI-912' },
    { route: 'BOM-NAG', airline: '6E', departure: '10:00', flightNum: '6E-3081' },
    { route: 'NAG-BOM', airline: '6E', departure: '12:00', flightNum: '6E-3082' },
    { route: 'BOM-LKO', airline: 'AI', departure: '09:00', flightNum: 'AI-381' },
    { route: 'LKO-BOM', airline: 'AI', departure: '12:30', flightNum: 'AI-382' },
    { route: 'BOM-IDR', airline: 'SG', departure: '11:00', flightNum: 'SG-381' },
    { route: 'IDR-BOM', airline: 'SG', departure: '13:30', flightNum: 'SG-382' },
    { route: 'HYD-VTZ', airline: '6E', departure: '08:00', flightNum: '6E-4071' },
    { route: 'VTZ-HYD', airline: '6E', departure: '10:30', flightNum: '6E-4072' },
    { route: 'HYD-BBI', airline: 'AI', departure: '09:00', flightNum: 'AI-461' },
    { route: 'BBI-HYD', airline: 'AI', departure: '12:00', flightNum: 'AI-462' },
    { route: 'GOI-COK', airline: '6E', departure: '10:00', flightNum: '6E-4081' },
    { route: 'COK-GOI', airline: '6E', departure: '12:30', flightNum: '6E-4082' },
    { route: 'DEL-GAU', airline: '6E', departure: '06:30', flightNum: '6E-2121' },
    { route: 'GAU-DEL', airline: '6E', departure: '10:00', flightNum: '6E-2122' },
    { route: 'DEL-SXR', airline: 'AI', departure: '07:00', flightNum: 'AI-921' },
    { route: 'SXR-DEL', airline: 'AI', departure: '09:30', flightNum: 'AI-922' },
    { route: 'DEL-SXR', airline: '6E', departure: '12:00', flightNum: '6E-2131' },
    { route: 'SXR-DEL', airline: '6E', departure: '14:30', flightNum: '6E-2132' },
    { route: 'BLR-CCU', airline: 'AI', departure: '08:00', flightNum: 'AI-411' },
    { route: 'CCU-BLR', airline: 'AI', departure: '11:00', flightNum: 'AI-412' },
    { route: 'JAI-UDR', airline: 'SG', departure: '09:00', flightNum: 'SG-491' },
    { route: 'UDR-JAI', airline: 'SG', departure: '11:30', flightNum: 'SG-492' },
    { route: 'AMD-GOI', airline: '6E', departure: '10:30', flightNum: '6E-3091' },
    { route: 'GOI-AMD', airline: '6E', departure: '13:00', flightNum: '6E-3092' },
    { route: 'CCU-IXB', airline: '6E', departure: '09:30', flightNum: '6E-5031' },
    { route: 'IXB-CCU', airline: '6E', departure: '11:30', flightNum: '6E-5032' },
    { route: 'LKO-PAT', airline: '6E', departure: '10:00', flightNum: '6E-5041' },
    { route: 'PAT-LKO', airline: '6E', departure: '12:30', flightNum: 'QP-542' },
    { route: 'BLR-IXE', airline: '6E', departure: '09:00', flightNum: '6E-4091' },
    { route: 'IXE-BLR', airline: '6E', departure: '11:00', flightNum: '6E-4092' },
    { route: 'MAA-TRV', airline: 'AI', departure: '08:30', flightNum: 'AI-471' },
    { route: 'TRV-MAA', airline: 'AI', departure: '11:00', flightNum: 'AI-472' },
    { route: 'HYD-GOI', airline: '6E', departure: '10:30', flightNum: '6E-4101' },
    { route: 'GOI-HYD', airline: '6E', departure: '13:00', flightNum: '6E-4102' },
    { route: 'HYD-CCU', airline: '6E', departure: '07:00', flightNum: '6E-4111' },
    { route: 'CCU-HYD', airline: '6E', departure: '10:30', flightNum: '6E-4112' },
    { route: 'CCU-IXR', airline: '6E', departure: '08:00', flightNum: '6E-5051' },
    { route: 'IXR-CCU', airline: '6E', departure: '10:00', flightNum: '6E-5052' },
    { route: 'DEL-PNQ', airline: '6E', departure: '08:00', flightNum: '6E-2141' },
    { route: 'PNQ-DEL', airline: '6E', departure: '11:00', flightNum: '6E-2142' },
    { route: 'BLR-PNQ', airline: 'UK', departure: '10:00', flightNum: 'UK-431' },
    { route: 'PNQ-BLR', airline: 'UK', departure: '13:00', flightNum: 'UK-432' },
  ];

  // ── Pricing Configuration ──
  const PRICING = {
    classMultiplier: {
      economy: 1.0,
      premium_economy: 1.8,
      business: 3.5
    },
    // Dynamic pricing factors
    demandMultiplier: {
      low: 0.85,
      medium: 1.0,
      high: 1.25,
      peak: 1.6
    },
    // Days before departure pricing
    advancePurchase: {
      '0-3': 1.8,    // Last minute
      '4-7': 1.5,    // Week before
      '8-14': 1.2,   // 1-2 weeks
      '15-30': 1.0,  // 2-4 weeks (base)
      '31-60': 0.9,  // 1-2 months
      '61+': 0.85    // 2+ months advance
    },
    // Time of day multiplier
    timeMultiplier: {
      earlyMorning: 0.9,  // 5-7 AM
      morning: 1.1,       // 7-10 AM
      midDay: 0.95,       // 10 AM-2 PM
      afternoon: 1.0,     // 2-5 PM
      evening: 1.15,      // 5-8 PM
      night: 0.85         // 8 PM+
    },
    // Taxes
    gst: {
      economy: 0.05,         // 5% GST
      premium_economy: 0.05,
      business: 0.12         // 12% GST
    },
    convenienceFee: 250,
    // Commission for B2B agents (percentage)
    defaultAgentCommission: 5,
    minAgentCommission: 2,
    maxAgentCommission: 12
  };

  // ── Meal Options ──
  const MEALS = [
    { id: 'veg_meal', name: 'Vegetarian Meal', price: 350, emoji: '🥗' },
    { id: 'nonveg_meal', name: 'Non-Veg Meal', price: 400, emoji: '🍗' },
    { id: 'jain_meal', name: 'Jain Meal', price: 350, emoji: '🥙' },
    { id: 'continental', name: 'Continental Meal', price: 450, emoji: '🥐' },
    { id: 'snack_box', name: 'Snack Box', price: 200, emoji: '🥪' },
    { id: 'no_meal', name: 'No Meal', price: 0, emoji: '❌' }
  ];

  // ── Baggage Options ──
  const BAGGAGE = [
    { id: 'bag_0', name: 'No Extra Baggage', weight: 0, price: 0 },
    { id: 'bag_5', name: '+5 kg', weight: 5, price: 500 },
    { id: 'bag_10', name: '+10 kg', weight: 10, price: 900 },
    { id: 'bag_15', name: '+15 kg', weight: 15, price: 1300 },
    { id: 'bag_20', name: '+20 kg', weight: 20, price: 1700 },
    { id: 'bag_30', name: '+30 kg', weight: 30, price: 2500 }
  ];

  // ── Default Admin Credentials ──
  const DEFAULT_ADMIN = {
    id: 'admin_001',
    username: 'admin',
    password: 'admin123',
    name: 'System Administrator',
    role: 'admin',
    email: 'admin@specialfare.in',
    createdAt: new Date().toISOString()
  };

  // ── Helper: Get route info (handles both directions) ──
  function getRouteInfo(from, to) {
    const key1 = `${from}-${to}`;
    const key2 = `${to}-${from}`;
    return ROUTES[key1] || ROUTES[key2] || null;
  }

  // ── Helper: Get airline by code ──
  function getAirline(code) {
    return AIRLINES.find(a => a.code === code);
  }

  // ── Helper: Get airport by code ──
  function getAirport(code) {
    return AIRPORTS.find(a => a.code === code);
  }

  // ── Helper: Calculate dynamic price ──
  function calculatePrice(basePrice, fareClass, daysUntilDeparture, departureHour) {
    let price = basePrice;

    // Class multiplier
    price *= PRICING.classMultiplier[fareClass] || 1;

    // Advance purchase multiplier
    if (daysUntilDeparture <= 3) price *= PRICING.advancePurchase['0-3'];
    else if (daysUntilDeparture <= 7) price *= PRICING.advancePurchase['4-7'];
    else if (daysUntilDeparture <= 14) price *= PRICING.advancePurchase['8-14'];
    else if (daysUntilDeparture <= 30) price *= PRICING.advancePurchase['15-30'];
    else if (daysUntilDeparture <= 60) price *= PRICING.advancePurchase['31-60'];
    else price *= PRICING.advancePurchase['61+'];

    // Time of day
    if (departureHour >= 5 && departureHour < 7) price *= PRICING.timeMultiplier.earlyMorning;
    else if (departureHour >= 7 && departureHour < 10) price *= PRICING.timeMultiplier.morning;
    else if (departureHour >= 10 && departureHour < 14) price *= PRICING.timeMultiplier.midDay;
    else if (departureHour >= 14 && departureHour < 17) price *= PRICING.timeMultiplier.afternoon;
    else if (departureHour >= 17 && departureHour < 20) price *= PRICING.timeMultiplier.evening;
    else price *= PRICING.timeMultiplier.night;

    // Add some randomness (±10%)
    const randomFactor = 0.9 + Math.random() * 0.2;
    price *= randomFactor;

    return Math.round(price / 50) * 50; // Round to nearest 50
  }

  // ── Generate Flights for a Date ──
  function generateFlightsForDate(date) {
    const flights = [];
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const targetDate = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntil = Math.max(0, Math.floor((targetDate - today) / (1000 * 60 * 60 * 24)));

    SCHEDULE_TEMPLATES.forEach((template, idx) => {
      const [origin, dest] = template.route.split('-');
      const routeKey = `${origin}-${dest}`;
      const routeInfo = getRouteInfo(origin, dest);
      if (!routeInfo) return;

      const airline = getAirline(template.airline);
      if (!airline) return;

      const [depH, depM] = template.departure.split(':').map(Number);
      const departureTime = new Date(targetDate);
      departureTime.setHours(depH, depM, 0, 0);

      const arrivalTime = new Date(departureTime);
      arrivalTime.setMinutes(arrivalTime.getMinutes() + routeInfo.duration);

      // Generate prices for each class
      const prices = {};
      const availableSeats = {};

      airline.classes.forEach(cls => {
        prices[cls] = calculatePrice(routeInfo.basePrice, cls, daysUntil, depH);
        // Random seat availability (50-100% of capacity)
        const totalSeats = airline.seatConfig[cls];
        const occupancy = 0.3 + Math.random() * 0.5;
        availableSeats[cls] = Math.floor(totalSeats * (1 - occupancy));
      });

      const flightId = `FL_${dateStr.replace(/-/g, '')}_${template.flightNum.replace('-', '')}_${idx}`;

      flights.push({
        id: flightId,
        flightNumber: template.flightNum,
        airlineCode: airline.code,
        airlineName: airline.name,
        airlineLogo: airline.logo,
        airlineColor: airline.color,
        airlineRating: airline.rating,
        origin: origin,
        destination: dest,
        originAirport: getAirport(origin),
        destinationAirport: getAirport(dest),
        date: dateStr,
        departureTime: `${String(depH).padStart(2, '0')}:${String(depM).padStart(2, '0')}`,
        arrivalTime: `${String(arrivalTime.getHours()).padStart(2, '0')}:${String(arrivalTime.getMinutes()).padStart(2, '0')}`,
        duration: routeInfo.duration,
        distance: routeInfo.distance,
        stops: 0,
        stopText: 'Non-stop',
        prices: prices,
        availableSeats: availableSeats,
        classes: airline.classes,
        aircraft: 'A320',
        status: 'scheduled'
      });
    });

    return flights;
  }

  // ── Search Flights ──
  function searchFlights(origin, destination, date) {
    const allFlights = generateFlightsForDate(date);
    return allFlights.filter(f => f.origin === origin && f.destination === destination);
  }

  // ── Get Popular Routes ──
  function getPopularRoutes() {
    const popular = [
      { from: 'DEL', to: 'BOM', tag: 'Most Popular' },
      { from: 'BLR', to: 'DEL', tag: 'Business Route' },
      { from: 'DEL', to: 'GOI', tag: 'Vacation' },
      { from: 'BOM', to: 'BLR', tag: 'Tech Corridor' },
      { from: 'HYD', to: 'DEL', tag: 'Trending' },
      { from: 'DEL', to: 'SXR', tag: 'Scenic' },
      { from: 'CCU', to: 'BLR', tag: 'Long Haul' },
      { from: 'BOM', to: 'GOI', tag: 'Weekend Getaway' }
    ];

    return popular.map(r => {
      const route = getRouteInfo(r.from, r.to);
      return {
        from: getAirport(r.from),
        to: getAirport(r.to),
        basePrice: route ? route.basePrice : 4000,
        duration: route ? route.duration : 120,
        tag: r.tag
      };
    });
  }

  // ── Public API ──
  return {
    AIRPORTS,
    AIRLINES,
    ROUTES,
    SCHEDULE_TEMPLATES,
    PRICING,
    MEALS,
    BAGGAGE,
    DEFAULT_ADMIN,
    getAirline,
    getAirport,
    getRouteInfo,
    calculatePrice,
    generateFlightsForDate,
    searchFlights,
    getPopularRoutes
  };

})();
