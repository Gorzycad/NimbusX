// src/constants/defaultBoqTables.js

// ══════════════════════════════════════════════════════
// MECHANICAL BOQ TABLE
// ══════════════════════════════════════════════════════
export const defaultMechanical = [

  // ─────────────────────────────
  // SUPPORTS & FASTENERS
  // ─────────────────────────────
  { sku: "10mm threaded rods", item: "10mm threaded rods", qty: 1, unit: "nrs", rate: 2300, unitkgs: 0.7, isCategory: false },
  { sku: "8mm threaded rods", item: "8mm threaded rods", qty: 1, unit: "nrs", rate: 1900, unitkgs: 0.6, isCategory: false },
  { sku: "12mm threaded rods", item: "12mm threaded rods", qty: 1, unit: "nrs", rate: 3000, unitkgs: 1.0, isCategory: false },
  { sku: "10mm anchor bolts", item: "10mm anchor bolts", qty: 1, unit: "nrs", rate: 800, unitkgs: 0.2, isCategory: false },
  { sku: "8mm anchor bolts", item: "8mm anchor bolts", qty: 1, unit: "nrs", rate: 800, unitkgs: 0.2, isCategory: false },
  { sku: "12mm anchor bolts", item: "12mm anchor bolts", qty: 1, unit: "nrs", rate: 1200, unitkgs: 0.3, isCategory: false },
  { sku: "Tapping screw", item: "Tapping screw", qty: 1, unit: "nrs", rate: 50, unitkgs: 0.1, isCategory: false },
  { sku: "Self drilling screw", item: "Self drilling screw", qty: 1, unit: "nrs", rate: 70, unitkgs: 0.1, isCategory: false },
  { sku: "10mm nuts&washer pair", item: "10mm nuts&washer pair", qty: 1, unit: "nrs", rate: 200, unitkgs: 0.1, isCategory: false },
  { sku: "8mm nut&washer pair", item: "8mm nut&washer pair", qty: 1, unit: "nrs", rate: 200, unitkgs: 0.1, isCategory: false },
  { sku: "Spring nuts", item: "Spring nuts", qty: 1, unit: "nrs", rate: 300, unitkgs: 0.1, isCategory: false },
  { sku: "U clamps", item: "U clamps", qty: 1, unit: "nrs", rate: 800, unitkgs: 0.3, isCategory: false },
  { sku: "C channel", item: "C channel", qty: 1, unit: "length", rate: 15000, unitkgs: 9, isCategory: false },
  { sku: "Angle iron", item: "Angle iron", qty: 1, unit: "length", rate: 18000, unitkgs: 12, isCategory: false },
  { sku: "Binding wire", item: "Binding wire", qty: 1, unit: "roll", rate: 3000, unitkgs: 3, isCategory: false },

  // ─────────────────────────────
  // DUCT ACCESSORIES
  // ─────────────────────────────
  { sku: "Sealant", item: "Sealant", qty: 1, unit: "tube", rate: 3600, unitkgs: 1, isCategory: false },
  { sku: "Canvas Connector", item: "Canvas Connector", qty: 1, unit: "nrs", rate: 80000, unitkgs: 23, isCategory: false },
  { sku: "Flexible duct", item: "Flexible duct", qty: 1, unit: "m", rate: 12000, unitkgs: 4, isCategory: false },
  { sku: "Volume control damper", item: "Volume control damper", qty: 1, unit: "nrs", rate: 22000, unitkgs: 5, isCategory: false },
  { sku: "Fire damper", item: "Fire damper", qty: 1, unit: "nrs", rate: 85000, unitkgs: 18, isCategory: false },
  { sku: "Access door", item: "Access door", qty: 1, unit: "nrs", rate: 18000, unitkgs: 3, isCategory: false },
  { sku: "Diffuser", item: "Diffuser", qty: 1, unit: "nrs", rate: 14500, unitkgs: 2, isCategory: false },
  { sku: "Linear grille", item: "Linear grille", qty: 1, unit: "nrs", rate: 16000, unitkgs: 2, isCategory: false },
  { sku: "Eggcrate grille", item: "Eggcrate grille", qty: 1, unit: "nrs", rate: 12000, unitkgs: 2, isCategory: false },
  { sku: "Flexible connector", item: "Flexible connector", qty: 1, unit: "nrs", rate: 6000, unitkgs: 1, isCategory: false },

  // ─────────────────────────────
  // PIPEWORK
  // ─────────────────────────────
  { sku: "1inch pipe", item: "1inch pipe", qty: 1, unit: "length", rate: 2900, unitkgs: 2, isCategory: false },
  { sku: "1.5inch pipe", item: "1.5inch pipe", qty: 1, unit: "length", rate: 4800, unitkgs: 4, isCategory: false },
  { sku: "2inch pipe", item: "2inch pipe", qty: 1, unit: "length", rate: 6900, unitkgs: 6, isCategory: false },
  { sku: "3inch pipe", item: "3inch pipe", qty: 1, unit: "length", rate: 13500, unitkgs: 12, isCategory: false },
  { sku: "4inch pipe", item: "4inch pipe", qty: 1, unit: "length", rate: 19500, unitkgs: 16, isCategory: false },

  // ─────────────────────────────
  // PIPE FITTINGS
  // ─────────────────────────────
  { sku: "1inch elbow", item: "1inch elbow", qty: 1, unit: "nrs", rate: 500, unitkgs: 1, isCategory: false },
  { sku: "1inch elbow 45", item: "1inch elbow 45", qty: 1, unit: "nrs", rate: 500, unitkgs: 1, isCategory: false },
  { sku: "1inch socket", item: "1inch socket", qty: 1, unit: "nrs", rate: 500, unitkgs: 1, isCategory: false },
  { sku: "1inch tee", item: "1inch tee", qty: 1, unit: "nrs", rate: 600, unitkgs: 1, isCategory: false },
  { sku: "1inch reducer", item: "1inch reducer", qty: 1, unit: "nrs", rate: 700, unitkgs: 1, isCategory: false },
  { sku: "Ball valve", item: "Ball valve", qty: 1, unit: "nrs", rate: 8500, unitkgs: 2, isCategory: false },
  { sku: "Gate valve", item: "Gate valve", qty: 1, unit: "nrs", rate: 14000, unitkgs: 5, isCategory: false },
  { sku: "Check valve", item: "Check valve", qty: 1, unit: "nrs", rate: 18000, unitkgs: 6, isCategory: false },
  { sku: "Y strainer", item: "Y strainer", qty: 1, unit: "nrs", rate: 22000, unitkgs: 5, isCategory: false },

  // ─────────────────────────────
  // INSULATION
  // ─────────────────────────────
  { sku: "Pipe insulation", item: "Pipe insulation", qty: 1, unit: "m", rate: 2800, unitkgs: 1, isCategory: false },
  { sku: "Duct insulation", item: "Duct insulation", qty: 1, unit: "sqm", rate: 4500, unitkgs: 2, isCategory: false },
  { sku: "Aluminium cladding", item: "Aluminium cladding", qty: 1, unit: "sqm", rate: 12000, unitkgs: 4, isCategory: false },

  // ─────────────────────────────
  // HVAC EQUIPMENT
  // ─────────────────────────────
  { sku: "Split unit AC", item: "Split unit AC", qty: 1, unit: "Units", rate: 450000, unitkgs: 45, isCategory: false },
  { sku: "Cassette AC", item: "Cassette AC", qty: 1, unit: "Units", rate: 850000, unitkgs: 65, isCategory: false },
  { sku: "FCU", item: "Fan Coil Unit", qty: 1, unit: "Units", rate: 750000, unitkgs: 55, isCategory: false },
  { sku: "AHU", item: "Air Handling Unit", qty: 1, unit: "Units", rate: 3500000, unitkgs: 450, isCategory: false },
  { sku: "Exhaust fan", item: "Exhaust fan", qty: 1, unit: "Units", rate: 85000, unitkgs: 8, isCategory: false },
  { sku: "Inline fan", item: "Inline fan", qty: 1, unit: "Units", rate: 160000, unitkgs: 14, isCategory: false },
  { sku: "Centrifugal fan", item: "Centrifugal fan", qty: 1, unit: "Units", rate: 450000, unitkgs: 45, isCategory: false },
];


// ══════════════════════════════════════════════════════
// ELECTRICAL BOQ TABLE
// ══════════════════════════════════════════════════════
export const defaultElectrical = [

  // ─────────────────────────────
  // CABLES
  // ─────────────────────────────
  { sku: "1.5mm single core cable", item: "1.5mm single core cable", qty: 1, unit: "roll", rate: 45000, unitkgs: 12, isCategory: false },
  { sku: "2.5mm single core cable", item: "2.5mm single core cable", qty: 1, unit: "roll", rate: 68000, unitkgs: 16, isCategory: false },
  { sku: "4mm single core cable", item: "4mm single core cable", qty: 1, unit: "roll", rate: 98000, unitkgs: 24, isCategory: false },
  { sku: "6mm single core cable", item: "6mm single core cable", qty: 1, unit: "roll", rate: 145000, unitkgs: 34, isCategory: false },
  { sku: "10mm single core cable", item: "10mm single core cable", qty: 1, unit: "roll", rate: 245000, unitkgs: 52, isCategory: false },
  { sku: "16mm single core cable", item: "16mm single core cable", qty: 1, unit: "roll", rate: 360000, unitkgs: 70, isCategory: false },
  { sku: "25mm single core cable", item: "25mm single core cable", qty: 1, unit: "roll", rate: 520000, unitkgs: 105, isCategory: false },

  // ─────────────────────────────
  // CONDUITS & TRUNKING
  // ─────────────────────────────
  { sku: "20mm PVC conduit", item: "20mm PVC conduit", qty: 1, unit: "length", rate: 1800, unitkgs: 1, isCategory: false },
  { sku: "25mm PVC conduit", item: "25mm PVC conduit", qty: 1, unit: "length", rate: 2500, unitkgs: 1.5, isCategory: false },
  { sku: "32mm PVC conduit", item: "32mm PVC conduit", qty: 1, unit: "length", rate: 3500, unitkgs: 2, isCategory: false },
  { sku: "Cable tray", item: "Cable tray", qty: 1, unit: "length", rate: 18000, unitkgs: 12, isCategory: false },
  { sku: "Cable trunking", item: "Cable trunking", qty: 1, unit: "length", rate: 12000, unitkgs: 8, isCategory: false },
  { sku: "Flexible conduit 75mm", item: "Flexible conduit 75mm", qty: 1, unit: "nrs", rate: 7000, unitkgs: 5, isCategory: false },

  // ─────────────────────────────
  // LIGHTING
  // ─────────────────────────────
  { sku: "Lighting Fixtures", item: "Lighting Fixtures", qty: 1, unit: "Units", rate: 3000, unitkgs: 1, isCategory: false },
  { sku: "LED panel light", item: "LED panel light", qty: 1, unit: "Units", rate: 18500, unitkgs: 2, isCategory: false },
  { sku: "LED batten fitting", item: "LED batten fitting", qty: 1, unit: "Units", rate: 8500, unitkgs: 1, isCategory: false },
  { sku: "Flood light", item: "Flood light", qty: 1, unit: "Units", rate: 28000, unitkgs: 3, isCategory: false },
  { sku: "Street light", item: "Street light", qty: 1, unit: "Units", rate: 85000, unitkgs: 8, isCategory: false },
  { sku: "Emergency light", item: "Emergency light", qty: 1, unit: "Units", rate: 22000, unitkgs: 2, isCategory: false },

  // ─────────────────────────────
  // POWER ACCESSORIES
  // ─────────────────────────────
  { sku: "13A socket outlet", item: "13A socket outlet", qty: 1, unit: "Units", rate: 4500, unitkgs: 0.4, isCategory: false },
  { sku: "15A socket outlet", item: "15A socket outlet", qty: 1, unit: "Units", rate: 6500, unitkgs: 0.5, isCategory: false },
  { sku: "1 gang switch", item: "1 gang switch", qty: 1, unit: "Units", rate: 2500, unitkgs: 0.2, isCategory: false },
  { sku: "2 gang switch", item: "2 gang switch", qty: 1, unit: "Units", rate: 3500, unitkgs: 0.3, isCategory: false },
  { sku: "Fused spur", item: "Fused spur", qty: 1, unit: "Units", rate: 5500, unitkgs: 0.3, isCategory: false },

  // ─────────────────────────────
  // DISTRIBUTION
  // ─────────────────────────────
  { sku: "Distribution Board", item: "Distribution Board", qty: 1, unit: "Units", rate: 26000, unitkgs: 2, isCategory: false },
  { sku: "MCB", item: "MCB", qty: 1, unit: "Units", rate: 4500, unitkgs: 0.2, isCategory: false },
  { sku: "MCCB", item: "MCCB", qty: 1, unit: "Units", rate: 65000, unitkgs: 5, isCategory: false },
  { sku: "RCCB", item: "RCCB", qty: 1, unit: "Units", rate: 24000, unitkgs: 1, isCategory: false },
  { sku: "Isolator", item: "Isolator", qty: 1, unit: "Units", rate: 18000, unitkgs: 2, isCategory: false },
  { sku: "Contactor", item: "Contactor", qty: 1, unit: "Units", rate: 28000, unitkgs: 2, isCategory: false },

  // ─────────────────────────────
  // EARTHING & LIGHTNING
  // ─────────────────────────────
  { sku: "Earth rod", item: "Earth rod", qty: 1, unit: "Units", rate: 18000, unitkgs: 7, isCategory: false },
  { sku: "Earth cable", item: "Earth cable", qty: 1, unit: "roll", rate: 95000, unitkgs: 18, isCategory: false },
  { sku: "Earth pit cover", item: "Earth pit cover", qty: 1, unit: "Units", rate: 12000, unitkgs: 6, isCategory: false },
  { sku: "Lightning arrester", item: "Lightning arrester", qty: 1, unit: "Units", rate: 120000, unitkgs: 10, isCategory: false },
];


// ══════════════════════════════════════════════════════
// PLUMBING BOQ TABLE
// ══════════════════════════════════════════════════════
export const defaultPlumbing = [

  // ─────────────────────────────
  // WATER SUPPLY PIPES
  // ─────────────────────────────
  { sku: "1inch Pipes (PVC)", item: "1inch Pipes (PVC)", qty: 1, unit: "m", rate: 2900, unitkgs: 2, isCategory: false },
  { sku: "0.5inch Pipes (PPR)", item: "0.5inch Pipes (PPR)", qty: 1, unit: "m", rate: 1800, unitkgs: 1, isCategory: false },
  { sku: "0.75inch Pipes (PPR)", item: "0.75inch Pipes (PPR)", qty: 1, unit: "m", rate: 2400, unitkgs: 1.5, isCategory: false },
  { sku: "1inch Pipes (PPR)", item: "1inch Pipes (PPR)", qty: 1, unit: "m", rate: 3400, unitkgs: 2, isCategory: false },
  { sku: "2inch Pipes (PPR)", item: "2inch Pipes (PPR)", qty: 1, unit: "m", rate: 9500, unitkgs: 5, isCategory: false },

  // ─────────────────────────────
  // FITTINGS
  // ─────────────────────────────
  { sku: "1inch elbow", item: "1inch elbow", qty: 1, unit: "nrs", rate: 500, unitkgs: 1, isCategory: false },
  { sku: "1inch tee", item: "1inch tee", qty: 1, unit: "nrs", rate: 600, unitkgs: 1, isCategory: false },
  { sku: "1inch socket", item: "1inch socket", qty: 1, unit: "nrs", rate: 500, unitkgs: 1, isCategory: false },
  { sku: "Reducer", item: "Reducer", qty: 1, unit: "nrs", rate: 700, unitkgs: 1, isCategory: false },
  { sku: "Union", item: "Union", qty: 1, unit: "nrs", rate: 1200, unitkgs: 1, isCategory: false },
  { sku: "Tangit gum 1kg", item: "Tangit gum 1kg", qty: 1, unit: "nrs", rate: 4000, unitkgs: 2, isCategory: false },
  { sku: "PTFE tape", item: "PTFE tape", qty: 1, unit: "roll", rate: 500, unitkgs: 0.1, isCategory: false },

  // ─────────────────────────────
  // VALVES
  // ─────────────────────────────
  { sku: "Ball valve", item: "Ball valve", qty: 1, unit: "nrs", rate: 8500, unitkgs: 2, isCategory: false },
  { sku: "Gate valve", item: "Gate valve", qty: 1, unit: "nrs", rate: 14000, unitkgs: 5, isCategory: false },
  { sku: "Check valve", item: "Check valve", qty: 1, unit: "nrs", rate: 18000, unitkgs: 6, isCategory: false },

  // ─────────────────────────────
  // SANITARY FIXTURES
  // ─────────────────────────────
  { sku: "Water Closet", item: "Water Closet", qty: 1, unit: "Units", rate: 60000, unitkgs: 49, isCategory: false },
  { sku: "Wash hand basin", item: "Wash hand basin", qty: 1, unit: "Units", rate: 28000, unitkgs: 18, isCategory: false },
  { sku: "Kitchen sink", item: "Kitchen sink", qty: 1, unit: "Units", rate: 45000, unitkgs: 15, isCategory: false },
  { sku: "Urinal", item: "Urinal", qty: 1, unit: "Units", rate: 48000, unitkgs: 22, isCategory: false },
  { sku: "Shower mixer", item: "Shower mixer", qty: 1, unit: "Units", rate: 35000, unitkgs: 3, isCategory: false },
  { sku: "Basin mixer", item: "Basin mixer", qty: 1, unit: "Units", rate: 22000, unitkgs: 2, isCategory: false },

  // ─────────────────────────────
  // DRAINAGE
  // ─────────────────────────────
  { sku: "Floor trap", item: "Floor trap", qty: 1, unit: "Units", rate: 6500, unitkgs: 1, isCategory: false },
  { sku: "Gully trap", item: "Gully trap", qty: 1, unit: "Units", rate: 8500, unitkgs: 5, isCategory: false },
  { sku: "Inspection chamber", item: "Inspection chamber", qty: 1, unit: "Units", rate: 45000, unitkgs: 120, isCategory: false },
  { sku: "Manhole cover", item: "Manhole cover", qty: 1, unit: "Units", rate: 28000, unitkgs: 35, isCategory: false },

  // ─────────────────────────────
  // PUMPS & TANKS
  // ─────────────────────────────
  { sku: "Water pump", item: "Water pump", qty: 1, unit: "Units", rate: 180000, unitkgs: 28, isCategory: false },
  { sku: "Pressure vessel", item: "Pressure vessel", qty: 1, unit: "Units", rate: 250000, unitkgs: 45, isCategory: false },
  { sku: "Water storage tank", item: "Water storage tank", qty: 1, unit: "Units", rate: 350000, unitkgs: 85, isCategory: false },
];