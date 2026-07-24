// src/utils/mepCalculations.js
// ════════════════════════════════════════════════════════════════
// MEP CALCULATOR UTILITIES & FUNCTIONS
// Physics, conversions, and calculator logic adapted for React
// ════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────
// UNIT CONVERSION FUNCTIONS
// ──────────────────────────────────────────────────────────────

export const fToC = (f) => ((f - 32) * 5) / 9;
export const cToF = (c) => (c * 9) / 5 + 32;

// ──────────────────────────────────────────────────────────────
// PHYSICS & PSYCHROMETRIC FUNCTIONS (ASHRAE Hyland-Wexler)
// ──────────────────────────────────────────────────────────────

/**
 * Saturation pressure (Pa) at absolute temperature T (K)
 * ASHRAE Hyland-Wexler equations for water
 */
export const satP = (tK) => {
  if (tK >= 273.15) {
    const c8 = -5.8002206e3,
      c9 = 1.3914993,
      c10 = -4.864e-2,
      c11 = 4.1764768e-5,
      c12 = -1.4452093e-8,
      c13 = 6.5459673;
    return Math.exp(c8 / tK + c9 + c10 * tK + c11 * tK ** 2 + c12 * tK ** 3 + c13 * Math.log(tK));
  }
  const c1 = -5.6745359e3,
    c2 = 6.3925247,
    c3 = -9.677843e-3,
    c4 = 6.2215701e-7,
    c5 = 2.0747825e-9,
    c6 = -9.484024e-13,
    c7 = 4.1635019;
  return Math.exp(c1 / tK + c2 + c3 * tK + c4 * tK ** 2 + c5 * tK ** 3 + c6 * tK ** 4 + c7 * Math.log(tK));
};

/**
 * Humidity ratio (kg/kg) from Relative Humidity
 */
export const wFromRH = (tC, rh, p) => {
  const pws = satP(tC + 273.15);
  return (0.621945 * (rh / 100) * pws) / (p - (rh / 100) * pws);
};

/**
 * Humidity ratio (kg/kg) from Wet Bulb temperature
 */
export const wFromWB = (td, tw, p) => {
  const ws = (0.621945 * satP(tw + 273.15)) / (p - satP(tw + 273.15));
  return ((2501 - 2.381 * tw) * ws - 1.006 * (td - tw)) / (2501 + 1.805 * td - 4.186 * tw);
};

/**
 * Humidity ratio (kg/kg) from Dew Point temperature
 */
export const wFromDP = (dp, p) => {
  const pws = satP(dp + 273.15);
  return (0.621945 * pws) / (p - pws);
};

/**
 * Dew Point temperature (°C) from humidity ratio and pressure
 */
export const dewPt = (w, p) => {
  const pw = (w * p) / (0.621945 + w);
  let lo = -60,
    hi = 80;
  for (let i = 0; i < 100; i++) {
    const m = (lo + hi) / 2;
    satP(m + 273.15) < pw ? (lo = m) : (hi = m);
    if (hi - lo < 0.001) break;
  }
  return (lo + hi) / 2;
};

/**
 * Wet Bulb temperature (°C) from dry bulb, humidity ratio, and pressure
 */
export const wetBulb = (td, w, p) => {
  let lo = -60,
    hi = td;
  for (let i = 0; i < 100; i++) {
    const m = (lo + hi) / 2;
    wFromWB(td, m, p) < w ? (lo = m) : (hi = m);
    if (hi - lo < 0.001) break;
  }
  return (lo + hi) / 2;
};

// ──────────────────────────────────────────────────────────────
// WATER PROPERTIES (for pipe sizing, pump head, etc.)
// ──────────────────────────────────────────────────────────────

/**
 * Water density (kg/m³) as function of temperature (°C)
 * Valid 0-100°C
 */
export const waterDens = (tC) => {
  return (
    999.842594 +
    6.793952e-2 * tC -
    9.09529e-3 * tC ** 2 +
    1.001685e-4 * tC ** 3 -
    1.120083e-6 * tC ** 4 +
    6.536332e-9 * tC ** 5
  );
};

/**
 * Water dynamic viscosity (Pa·s) as function of temperature (°C)
 * Andrade equation
 */
export const waterVisc = (tC) => {
  return 2.414e-5 * Math.pow(10, 247.8 / (tC + 406.15));
};

// ──────────────────────────────────────────────────────────────
// FRICTION FACTOR CALCULATION (Colebrook-White iteration)
// ──────────────────────────────────────────────────────────────

/**
 * Colebrook-White friction factor for turbulent flow
 * Re: Reynolds number
 * relR: relative roughness (k/D)
 */
export const colebrook = (Re, relR) => {
  if (Re <= 0) return 0.1;
  if (Re < 2300) return 64 / Re; // Laminar: Hagen-Poiseuille

  // Turbulent: Colebrook-White with iteration
  let f = 0.25 / Math.pow(Math.log(relR / 3.7 + 5.74 / Math.pow(Re, 0.9)) / Math.LN10, 2);
  for (let i = 0; i < 80; i++) {
    const r = (-2 * Math.log((relR / 3.7) + 2.51 / (Re * Math.sqrt(f)))) / Math.LN10;
    const fn = 1 / (r * r);
    if (Math.abs(fn - f) < 1e-10) {
      f = fn;
      break;
    }
    f = fn;
  }
  return f;
};

// ──────────────────────────────────────────────────────────────
// PSYCHROMETRIC CALCULATOR
// ──────────────────────────────────────────────────────────────

/**
 * Calculate complete psychrometric state from two known properties
 * Returns: { dbt, wbt, dp, rh, w, h, v, pv, warnings: [] }
 */
export const calcPsychrometric = ({
  dbtInput = '', // Dry bulb temperature (°C or °F)
  paramKey = 'rh', // 'rh', 'wb', 'dp', 'w'
  paramValue = '', // Parameter value
  atmPressure = 101.325, // kPa
  isIP = false, // true for Fahrenheit, false for Celsius
}) => {
  const dbt = parseFloat(dbtInput);
  const pv = parseFloat(paramValue);
  const pAtm = atmPressure * 1000; // Convert to Pa

  if (isNaN(dbt) || isNaN(pv)) return null;

  const tC = isIP ? fToC(dbt) : dbt;
  let w;

  if (paramKey === 'rh') w = wFromRH(tC, pv, pAtm);
  else if (paramKey === 'wb') w = wFromWB(tC, isIP ? fToC(pv) : pv, pAtm);
  else if (paramKey === 'dp') w = wFromDP(isIP ? fToC(pv) : pv, pAtm);
  else w = isIP ? pv / 7000 : pv / 1000; // Direct humidity ratio

  if (w < 0) w = 0;

  const pws = satP(tC + 273.15);
  const pw = (w * pAtm) / (0.621945 + w);
  const rh = Math.min(100, (pw / pws) * 100);
  const dp = dewPt(w, pAtm);
  const wb = wetBulb(tC, w, pAtm);
  const h = 1.006 * tC + w * (2501 + 1.805 * tC);
  const v = (0.287042 * (tC + 273.15) * (1 + 1.607858 * w)) / (pAtm / 1000);

  const warnings = [];
  if (rh > 90) warnings.push(`RH ${rh.toFixed(1)}% - Near saturation. Condensation risk on cold surfaces.`);
  if (rh < 20) warnings.push(`RH ${rh.toFixed(1)}% - Very dry air. Check comfort and static electricity concerns.`);
  if (tC > 40) warnings.push(`DBT ${tC.toFixed(1)}°C - High temperature. Verify application.`);

  return {
    dbt: isIP ? cToF(tC) : tC,
    wbt: isIP ? cToF(wb) : wb,
    dp: isIP ? cToF(dp) : dp,
    rh,
    w: isIP ? w * 7000 : w * 1000, // gr/lb or g/kg
    h: isIP ? h / 2.326 : h, // BTU/lb or kJ/kg
    v: isIP ? v * 0.062428 : v, // ft³/lb or m³/kg
    pv: isIP ? (pw / 6894.76) : (pw / 1000), // psi or kPa
    warnings,
  };
};

// ──────────────────────────────────────────────────────────────
// DUCT SIZER (Equal Friction Method, Darcy-Weisbach)
// ──────────────────────────────────────────────────────────────

/**
 * Calculate duct sizing using equal friction method
 * Returns: { diameter, velocity, frictionRate, reynolds, frictionFactor, regime, warnings: [] }
 */
export const calcDuctSizer = ({
  airflow = '', // CFM or L/s
  targetFriction = '', // in w.g./100ft or Pa/m
  ductShape = 'round', // 'round' or 'rect'
  aspectRatio = 2.0, // Width:Height for rectangular (ignored if round)
  isIP = true,
}) => {
  const Q = isIP ? parseFloat(airflow) * 4.71947e-4 : parseFloat(airflow) * 1e-3; // m³/s
  const frRaw = parseFloat(targetFriction);
  const frPaM = isIP ? frRaw * 8.16828 : frRaw; // Pa/m

  if (isNaN(Q) || isNaN(frRaw) || Q <= 0 || frRaw <= 0) return null;

  const rho = 1.204; // air density at sea level, 15°C
  const mu = 1.81e-5; // dynamic viscosity
  const eps = 0.00009; // roughness (m)

  // Binary search for diameter using Darcy-Weisbach
  let lo = 0.05,
    hi = 2.0;
  for (let i = 0; i < 100; i++) {
    const D = (lo + hi) / 2;
    const A = (Math.PI * D * D) / 4;
    const v = Q / A;
    const Re = (rho * v * D) / mu;
    const f = colebrook(Re, eps / D);
    const dP = (f * rho * v * v) / (2 * D);
    dP > frPaM ? (lo = D) : (hi = D);
    if (hi - lo < 0.0001) break;
  }
  const calcD = (lo + hi) / 2;

  const warnings = [];

  if (ductShape === 'round') {
    const stdMm = [100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400, 450, 500, 550, 600, 650, 700, 750, 800, 900, 1000, 1100, 1200];
    const stdMmVal = stdMm.find((d) => d / 1000 >= calcD) || 1200;
    const D = stdMmVal / 1000;
    const A = (Math.PI * D * D) / 4;
    const v = Q / A;
    const Re = (rho * v * D) / mu;
    const f = colebrook(Re, eps / D);
    const dPM = (f * rho * v * v) / (2 * D);
    const vFpm = v / 0.00508;

    if (vFpm > 2500) warnings.push(`High velocity: ${vFpm.toFixed(0)} FPM - Review pressure class`);
    else if (vFpm < 300) warnings.push(`Low velocity: ${vFpm.toFixed(0)} FPM - Settling risk`);

    return {
      size: isIP ? `${(stdMmVal / 25.4).toFixed(0)}"` : `${stdMmVal}mm`,
      velocity: isIP ? vFpm : v,
      frictionRate: isIP ? dPM / 8.16828 : dPM,
      //reynolds: Re,
      frictionFactor: f,
      //regime: Re < 2300 ? 'Laminar' : Re < 4000 ? 'Transitional' : 'Turbulent',
      warnings,
    };
  } else {
    // Rectangular duct (Huebscher formula)
    const AR = aspectRatio;
    const Deq = calcD;
    const b = (Deq * Math.pow(AR + 1, 0.25)) / (1.3 * Math.pow(AR, 0.625));
    const a = AR * b;

    // Round to standard dimensions (25mm increments)
    const aRound = Math.ceil(a * 1000 / 25) * 0.025;
    const bRound = Math.ceil(b * 1000 / 25) * 0.025;

    const DeqStd = (1.3 * Math.pow(aRound * bRound, 0.625)) / Math.pow(aRound + bRound, 0.25);
    const Aduct = aRound * bRound;
    const v = Q / Aduct;
    const Re = (rho * v * DeqStd) / mu;
    const f = colebrook(Re, eps / DeqStd);
    const dPM = (f * rho * v * v) / (2 * DeqStd);
    const vFpm = v / 0.00508;

    if (vFpm > 2000) warnings.push(`High velocity: ${vFpm.toFixed(0)} FPM - Max 1500–2000 FPM recommended`);
    else if (vFpm < 300) warnings.push(`Low velocity: ${vFpm.toFixed(0)} FPM - Settling risk`);
    if (AR > 4) warnings.push(`High aspect ratio: ${AR.toFixed(1)}:1 - SMACNA recommends ≤4:1`);

    const toMM = (val) => isIP ? `${(val / 0.0254).toFixed(0)}"` : `${(val * 1000).toFixed(0)}mm`;

    return {
      size: `${toMM(aRound)} × ${toMM(bRound)}`,
      deqSize: isIP ? `${(DeqStd / 0.0254).toFixed(1)}"` : `${(DeqStd * 1000).toFixed(0)}mm`,
      velocity: isIP ? vFpm : v,
      frictionRate: isIP ? dPM / 8.16828 : dPM,
      //reynolds: Re,
      frictionFactor: f,
      //regime: Re < 2300 ? 'Laminar' : Re < 4000 ? 'Transitional' : 'Turbulent',
      warnings,
    };
  }
};

// ──────────────────────────────────────────────────────────────
// PUMP HEAD CALCULATOR (Darcy-Weisbach + ASHRAE Equivalent Length)
// ──────────────────────────────────────────────────────────────

export const calcPumpHead = ({
  flowRate = '', // GPM or L/min
  pipeDiameterMm = 62.71, // ID in mm
  pipeLength = '', // ft or m
  fluidTemp = 44, // °F or °C
  staticHead = 0, // ft or m
  equipmentLoss = 0, // ft w.g. or m w.g.
  safetyFactor = 10, // %
  fittings = [], // [{ name, count, ld }...]
  pipeMaterial = 'steel', // 'steel', 'copper', 'galv'
  isIP = false,
}) => {
  const Q = isIP ? parseFloat(flowRate) * 6.30902e-5 : parseFloat(flowRate) * 1e-3; // m³/s
  const D = pipeDiameterMm / 1000; // m
  const L = isIP ? parseFloat(pipeLength) * 0.3048 : parseFloat(pipeLength); // m
  const tC = isIP ? fToC(fluidTemp) : fluidTemp;

  if (isNaN(Q) || isNaN(L) || Q <= 0 || L <= 0) return null;

  // Pipe roughness
  const epsilon = {
    steel: 0.000046,
    copper: 0.0000015,
    galv: 0.00015,
  }[pipeMaterial] || 0.000046;

  const A = (Math.PI * D * D) / 4;
  const rho = waterDens(tC);
  const mu = waterVisc(tC);
  const g = 9.80665;

  const v = Q / A;
  const Re = (rho * v * D) / mu;
  const f = colebrook(Re, epsilon / D);

  const hPipe = f * (L / D) * (v * v) / (2 * g);

  // Fitting losses (equivalent length method)
  let leq = 0;
  fittings.forEach((ft) => {
    leq += ft.count * ft.ld * D;
  });
  const hFit = f * (leq / D) * (v * v) / (2 * g);

  const stat = isIP ? staticHead * 0.3048 : staticHead;
  const eq = isIP ? equipmentLoss * 0.3048 : equipmentLoss;

  const sub = hPipe + hFit + stat + eq;
  const tot = sub * (1 + safetyFactor / 100);

  const warnings = [];
  const vFps = v / 0.3048;
  if (vFps < 2) warnings.push(`Low velocity: ${vFps.toFixed(2)} fps - Sedimentation/air pocket risk`);
  else if (vFps > 8) warnings.push(`High velocity: ${vFps.toFixed(2)} fps - Pipe erosion risk`);
  if (safetyFactor > 20) warnings.push(`High safety factor: ${safetyFactor}% - Pump oversizing risk`);

  return {
    pipeHead: hPipe,
    fittingHead: hFit,
    staticHead: stat,
    equipmentHead: eq,
    subtotal: sub,
    totalHead: tot,
    velocity: v,
    reynolds: Re,
    frictionFactor: f,
    equivalentLength: leq,
    warnings,
  };
};

// ──────────────────────────────────────────────────────────────
// HVAC PIPE SIZER (Pressure drop iteration)
// ──────────────────────────────────────────────────────────────

export const pipeTable = {
  0.5: 15.8,
  0.75: 20.93,
  1.0: 26.64,
  1.25: 35.05,
  1.5: 40.89,
  2.0: 52.5,
  2.5: 62.71,
  3.0: 77.93,
  3.5: 90.12,
  4.0: 102.26,
  5.0: 128.19,
  6.0: 154.05,
  8.0: 202.72,
  10.0: 254.46,
  12.0: 303.23,
};

/**
 * Calculate HVAC pipe size (CHW/CW) for target pressure drop
 */
export const calcHvacPipeSize = ({
  flowRate = '', // GPM or L/s
  targetDp = '', // ft w.g./100ft or Pa/m
  fluidType = 'chw', // 'chw', 'cw', 'g25', 'g40'
  fluidTemp = '', // °F or °C
  pipeRoughness = 0.046, // absolute roughness in mm
  isIP = false,
}) => {
  const Q = isIP ? parseFloat(flowRate) * 6.30902e-5 : parseFloat(flowRate) * 1e-3; // m³/s
  const tRaw = parseFloat(fluidTemp);
  const tC = isIP ? fToC(tRaw) : tRaw;

  const glycolVisc = { chw: 1, cw: 1, g25: 1.8, g40: 2.6 }[fluidType] || 1;
  const glycolDens = { chw: 1, cw: 1, g25: 1.03, g40: 1.05 }[fluidType] || 1;

  const targetDpPaM = isIP ? parseFloat(targetDp) * 22.62 : parseFloat(targetDp);

  if (isNaN(Q) || isNaN(targetDpPaM) || Q <= 0) return null;

  const rho = waterDens(tC) * glycolDens;
  const mu = waterVisc(tC) * glycolVisc;
  const eps = (pipeRoughness || 0.046) / 1000; // mm to m

  let chosen = null;
  for (const [nps, idMm] of Object.entries(pipeTable)) {
    const D = idMm / 1000;
    const A = (Math.PI * D * D) / 4;
    const v = Q / A;
    const Re = (rho * v * D) / mu;
    const f = colebrook(Re, eps / D);
    const dp = (f * rho * v * v) / (2 * D);

    if (dp <= targetDpPaM * 1.05) {
      chosen = { nps, D, v, Re, f, dp };
      break;
    }
  }

  if (!chosen) {
    const last = Object.entries(pipeTable).pop();
    const D = last[1] / 1000;
    const A = (Math.PI * D * D) / 4;
    const v = Q / A;
    const Re = (rho * v * D) / mu;
    const f = colebrook(Re, eps / D);
    const dp = (f * rho * v * v) / (2 * D);
    chosen = { nps: last[0], D, v, Re, f, dp };
  }

  const vFps = chosen.v / 0.3048;
  const warnings = [];
  if (vFps < 2) warnings.push(`Low velocity: ${vFps.toFixed(2)} fps - Air pocket/sedimentation risk`);
  if (vFps > 8) warnings.push(`High velocity: ${vFps.toFixed(2)} fps - Erosion risk`);

  return {
    nps: chosen.nps,
    idMm: chosen.D * 1000,
    velocity: chosen.v,
    pressureDrop: chosen.dp,
    reynolds: chosen.Re,
    regime: chosen.Re < 2300 ? 'Laminar' : chosen.Re < 4000 ? 'Transitional' : 'Turbulent',
    warnings,
  };
};

// ════════════════════════════════════════════════════════════════
// HVAC CALCULATORS - REMAINING FUNCTIONS
// ════════════════════════════════════════════════════════════════

/**
 * External Static Pressure (ESP) Calculator
 * Calculates required ESP for HVAC systems
 */
export const calcExtStaticPressure = ({
  ductFriction = '',     // Pa/m
  ductLength = '',       // m
  equipmentLoss = '',    // Pa
  fittingLoss = '',       // Pa
  safetyFactor = 10,     // %
}) => {
  const fr = parseFloat(ductFriction) || 0;
  const len = parseFloat(ductLength) || 0;
  const eq = parseFloat(equipmentLoss) || 0;
  const fit = parseFloat(fittingLoss) || 0;

  if (isNaN(fr) || isNaN(len)) return null;

  // Pressure loss in straight duct
  const ductLoss = fr * len;

  // Total duct resistance
  const totalFriction = ductLoss + fit;

  // Total static pressure before safety factor
  const subtotal = totalFriction + eq;

  // Design ESP
  const esp = subtotal * (1 + safetyFactor / 100);

  const warnings = [];

  if (esp > 1000)
    warnings.push(
      `High ESP: ${esp.toFixed(0)} Pa - Check duct sizing or fan selection`
    );

  if (esp < 50)
    warnings.push(
      `Low ESP: ${esp.toFixed(0)} Pa - Verify input values`
    );

  return {
    ductLoss: ductLoss.toFixed(1),
    equipmentLoss: eq.toFixed(1),
    fittingLoss: fit.toFixed(1),
    totalFriction: totalFriction.toFixed(1),
    subtotal: subtotal.toFixed(1),
    esp: esp.toFixed(1),
    warnings,
  };
};

/**
 * Diffuser Selector Calculator
 * Select diffuser based on throw, airflow, and NC
 */
export const calcDiffuserSelector = ({
  airflow = '', // CFM
  throwDistance = '', // ft (throw distance)
  ncLimit = '', // Noise Criteria
  isIP = false,
}) => {
  const cfm = parseFloat(airflow) || 0;
  const throwFt = parseFloat(throwDistance) || 0;
  const nc = parseFloat(ncLimit) || 35;

  if (isNaN(cfm) || isNaN(throwFt)) return null;

  // Simplified diffuser selection logic
  // Typical diffuser throw ≈ 1-1.5 CFM/throw ft
  const requiredThrow = cfm / 1.0;
  const throwAdequate = throwFt >= requiredThrow * 0.8;

  // Approximate NC from CFM
  const estimatedNC = 30 + Math.log10(cfm / 100) * 5;

  const warnings = [];
  if (!throwAdequate) warnings.push(`Throw insufficient: Need ~${requiredThrow.toFixed(0)} ft throw for ${cfm} CFM`);
  if (estimatedNC > nc) warnings.push(`NC estimate ${estimatedNC.toFixed(1)} exceeds limit of ${nc}`);

  const diffuserTypes = [
    { type: 'Linear Bar Grille', suitability: throwFt > 15 ? 'Good' : 'Fair' },
    { type: 'Square Ceiling', suitability: throwFt > 10 && cfm < 2000 ? 'Good' : 'Fair' },
    { type: 'Round Ceiling', suitability: throwFt > 8 ? 'Good' : 'Fair' },
    { type: 'Rectangular Slot', suitability: throwFt > 12 ? 'Good' : 'Fair' },
  ];

  return {
    airflow: cfm,
    throw: throwFt,
    ncLimit: nc,
    estimatedNC: estimatedNC.toFixed(1),
    throwAdequate,
    recommendedDiffusers: diffuserTypes,
    warnings,
  };
};

/**
 * Heat Load (Quick) - CLTD Method
 */
export const calcHeatLoadQuick = ({
  wallArea = '', // sqft
  windowArea = '', // sqft
  roofArea = '', // sqft
  infiltration = '', // CFM
  internalHeat = '', // BTU/h (lights, equipment, people)
  oat = '', // Outside air temp (°F)
  rat = '', // Room air temp (°F)
  isIP = false,
}) => {
  const wA = parseFloat(wallArea) || 0;
  const winA = parseFloat(windowArea) || 0;
  const rA = parseFloat(roofArea) || 0;
  const infil = parseFloat(infiltration) || 0;
  const intHeat = parseFloat(internalHeat) || 0;
  const oatF = parseFloat(oat) || 95;
  const ratF = parseFloat(rat) || 75;

  if (isNaN(wA) || isNaN(oatF)) return null;

  const deltaT = oatF - ratF;

  // Simplified CLTD approach
  const wallCLTD = 12; // Typical CLTD for walls
  const windowCLTD = 18; // Typical CLTD for windows
  const roofCLTD = 35; // Typical CLTD for roofs

  const wallLoad = wA * 1 * (deltaT + wallCLTD); // U ~1 for typical wall
  const windowLoad = winA * 1.1 * (deltaT + windowCLTD);
  const roofLoad = rA * 0.08 * (deltaT + roofCLTD);

  const infiltLoad = infil * 1.08 * 0.6 * deltaT; // cfm * 1.08 * 0.6 * ΔT

  const totalSensible = wallLoad + windowLoad + roofLoad + infiltLoad;
  const totalWithInternal = totalSensible + intHeat;

  const warnings = [];
  if (totalWithInternal > 100000) warnings.push(`Large load: ${totalWithInternal.toFixed(0)} BTU/h - Verify inputs`);

  return {
    wallLoad: wallLoad.toFixed(0),
    windowLoad: windowLoad.toFixed(0),
    roofLoad: roofLoad.toFixed(0),
    infiltrationLoad: infiltLoad.toFixed(0),
    internalLoad: intHeat.toFixed(0),
    totalSensible: totalSensible.toFixed(0),
    totalLoad: totalWithInternal.toFixed(0),
    warnings,
  };
};

/**
 * Chiller COP / Efficiency Calculator
 */
export const calcChillerCOP = ({
  capacity = '', // Tons
  inputPower = '', // kW
  ambientTemp = '', // °F
  refrigerant = 'R410A',
  compressorType = 'centrifugal',
  isIP = false,
}) => {
  const tons = parseFloat(capacity) || 0;
  const kw = parseFloat(inputPower) || 0;
  const tAmb = parseFloat(ambientTemp) || 85;

  if (isNaN(tons) || isNaN(kw) || tons <= 0 || kw <= 0) return null;

  const tonToKw = tons * 3.516; // 1 ton = 3.516 kW
  const cop = tonToKw / kw;
  const eer = cop * 3.412; // EER = COP × 3.412

  // Typical COP ranges by compressor type
  const typicalCOP = {
    centrifugal: 4.5,
    screw: 4.0,
    scroll: 3.5,
  }[compressorType] || 4.0;

  const copEfficiency = (cop / typicalCOP) * 100;

  const warnings = [];
  if (cop < 2.5) warnings.push(`Low COP: ${cop.toFixed(2)} - Check for fouling or overload`);
  if (tAmb > 95) warnings.push(`High ambient: ${tAmb}°F - Verify condenser performance`);

  return {
    capacity: tons,
    inputPower: kw,
    cop: cop.toFixed(2),
    eer: eer.toFixed(2),
    copEfficiency: copEfficiency.toFixed(1),
    typicalCOP,
    warnings,
  };
};

/**
 * Cooling Tower Calculator
 */
export const calcCoolingTower = ({
  duty = '', // BTU/h
  cwInlet = '', // °F
  cwOutlet = '', // °F
  wetBulbTemp = '', // °F (ambient wet bulb)
  approach = '', // °F (CWT - WBT)
  isIP = false,
}) => {
  const dutyBtu = parseFloat(duty) || 0;
  const cwIn = parseFloat(cwInlet) || 0;
  const cwOut = parseFloat(cwOutlet) || 0;
  const wb = parseFloat(wetBulbTemp) || 0;
  const app = parseFloat(approach) || 0;

  if (isNaN(dutyBtu) || isNaN(cwIn) || isNaN(cwOut)) return null;

  const range = cwIn - cwOut;
  const cwtDesign = wb + app;
  const ltdFull = cwIn - wb;

  // Flow calculation: Q = Duty / (8.34 * range * density correction)
  const gpmCW = dutyBtu / (500 * range);

  const warnings = [];
  if (app < 3) warnings.push(`Tight approach: ${app}°F - May require larger tower`);
  if (range < 10) warnings.push(`Low range: ${range}°F - Poor efficiency`);
  if (range > 25) warnings.push(`High range: ${range}°F - Verify condenser temperature`);

  return {
    duty: dutyBtu.toFixed(0),
    range: range.toFixed(1),
    gpmCW: gpmCW.toFixed(0),
    cwtDesign: cwtDesign.toFixed(1),
    approach: app.toFixed(1),
    ltdFull: ltdFull.toFixed(1),
    warnings,
  };
};

// ════════════════════════════════════════════════════════════════
// PLUMBING CALCULATORS - REMAINING FUNCTIONS
// ════════════════════════════════════════════════════════════════

/**
 * Fixture Unit Calculator - Hunter's Method
 */
export const calcFixtureUnit = ({
  residentialFixtures = '{}', // { fixture: count }
  commercialFixtures = '{}',
  isIP = false,
}) => {
  try {
    const resFix = JSON.parse(residentialFixtures);
    //const comFix = JSON.parse(commercialFixtures);

    const fixtureUnits = {
      toilet: 3,
      urinal: 1,
      lavatory: 1,
      shower: 2,
      tub: 2,
      sink: 2,
      bidet: 1,
    };

    let totalDFU = 0;
    let summary = {};

    Object.keys(resFix).forEach((fix) => {
      if (fixtureUnits[fix]) {
        const dfu = (resFix[fix] || 0) * fixtureUnits[fix];
        totalDFU += dfu;
        summary[fix] = { count: resFix[fix], dfu };
      }
    });

    // Convert DFU to flow: Q ≈ 15 + 0.5 * DFU (GPM)
    const flowGPM = 15 + 0.5 * totalDFU;

    const warnings = [];
    if (totalDFU > 200) warnings.push(`High fixture unit count: ${totalDFU} - Verify main line size`);

    return {
      totalDFU,
      estimatedFlow: flowGPM.toFixed(1),
      summary,
      warnings,
    };
  } catch (e) {
    return null;
  }
};

/**
 * Booster Pump Sizing
 */
export const calcBoosterPump = ({
  designFlow = '', // GPM
  minPressure = '', // PSI
  maxPressure = '', // PSI
  staticHead = '', // ft
  pipeLoss = '', // PSI
  isIP = false,
}) => {
  const gpm = parseFloat(designFlow) || 0;
  //const minP = parseFloat(minPressure) || 20;
  const maxP = parseFloat(maxPressure) || 80;
  const statHead = parseFloat(staticHead) || 0;
  const pLoss = parseFloat(pipeLoss) || 0;

  if (isNaN(gpm)) return null;

  const headFt = (statHead || 0) + (pLoss * 2.31 || 0); // Convert PSI to ft
  const pumpHead = (maxP * 2.31) + headFt;

  const motorHP = (gpm * pumpHead) / (3960 * 0.85); // 3960 = GPM·ft·lb/(hp·min), assume 85% eff

  // Standard motor sizes
  const standardHP = [0.5, 0.75, 1, 1.5, 2, 3, 5, 7.5, 10, 15, 20];
  const selectedHP = standardHP.find((hp) => hp >= motorHP) || 20;

  const warnings = [];
  if (motorHP < 0.5) warnings.push(`Motor oversized: Select 0.5 HP minimum`);
  if (selectedHP > motorHP * 2) warnings.push(`Selected motor ${selectedHP} HP is much larger than calculated ${motorHP.toFixed(2)} HP`);

  return {
    designFlow: gpm,
    requiredHead: pumpHead.toFixed(1),
    motorHP: motorHP.toFixed(2),
    selectedHP,
    warnings,
  };
};

/**
 * Pressure at Fixture Calculator
 */
export const calcPressureAtFixture = ({
  sourceP = '', // PSI
  staticLift = '', // ft (negative for drop)
  pipeLength = '', // ft
  flowRate = '', // GPM
  pipeSize = '', // inches
  isIP = false,
}) => {
  const sourcePSI = parseFloat(sourceP) || 0;
  const lift = parseFloat(staticLift) || 0;
  const len = parseFloat(pipeLength) || 0;
  const gpm = parseFloat(flowRate) || 0;
  const pipeSizeIn = parseFloat(pipeSize) || 1;

  if (isNaN(sourcePSI)) return null;

  // Simplified friction loss using Hazen-Williams
  const c = 150; // Friction coefficient
  const d = pipeSizeIn / 12; // Convert to ft
  //const v = gpm / (0.785 * d * d);
  const frictionLoss = (10.67 * Math.pow(gpm, 1.852) * len) / (Math.pow(c, 1.852) * Math.pow(d, 4.8704));

  const staticPressure = (lift / 2.31);
  const pressureAtFixture = sourcePSI - frictionLoss - staticPressure;

  const warnings = [];
  if (pressureAtFixture < 20) warnings.push(`Low pressure: ${pressureAtFixture.toFixed(1)} PSI - May be inadequate`);
  if (pressureAtFixture > 80) warnings.push(`High pressure: ${pressureAtFixture.toFixed(1)} PSI - PRV recommended`);

  return {
    sourcePressure: sourcePSI,
    staticHead: staticPressure.toFixed(2),
    frictionLoss: frictionLoss.toFixed(2),
    residualPressure: pressureAtFixture.toFixed(2),
    warnings,
  };
};

/**
 * Pipe Design Check - Verify sizing adequacy
 */
export const calcPipeDesignCheck = ({
  pipeSize = '', // inches
  flowRate = '', // GPM
  material = 'copper', // copper, steel, pvc
  isIP = false,
}) => {
  const d = parseFloat(pipeSize) || 1;
  const gpm = parseFloat(flowRate) || 0;
  const c = { copper: 150, steel: 140, pvc: 150 }[material] || 150;

  if (isNaN(d) || isNaN(gpm)) return null;

  // Velocity check
  const areaInSq = 0.785 * d * d;
  const velFps = gpm / (0.3208 * areaInSq);

  // Friction loss per 100 ft
  const fl100 = (10.67 * Math.pow(gpm, 1.852)) / (Math.pow(c, 1.852) * Math.pow(d, 4.8704));

  //const warnings = [];
  const issues = [];

  if (velFps < 2) {
    issues.push('Low velocity - risk of sedimentation');
  } else if (velFps > 8) {
    issues.push('High velocity - erosion/noise risk');
  }

  if (fl100 > 10) {
    issues.push('High friction loss - consider larger pipe');
  }

  const warnings_arr = issues.length > 0 ? [issues.join('; ')] : [];

  return {
    pipeSize: d,
    flowRate: gpm,
    velocity: velFps.toFixed(2),
    velocityAdequate: velFps >= 2 && velFps <= 8,
    friction100ft: fl100.toFixed(2),
    frictionAdequate: fl100 <= 10,
    issues,
    warnings: warnings_arr,
  };
};

/**
 * Gravity Flow Check
 */
export const calcGravityFlowCheck = ({
  pipeDiameter = '', // inches
  pipeLength = '', // ft
  staticHead = '', // ft
  isIP = false,
}) => {
  const d = parseFloat(pipeDiameter) || 1;
  const len = parseFloat(pipeLength) || 100;
  const head = parseFloat(staticHead) || 10;

  if (isNaN(d) || isNaN(head)) return null;

  // Manning's equation for gravity flow (simplified)
  const n = 0.009; // Manning coefficient for typical pipe
  const slope = head / len;
  const a = 0.785 * d * d;
  const p = 3.14159 * d;
  const rh = a / p;

  const flowCFS = (1.486 * a * Math.pow(rh, 0.667) * Math.sqrt(slope)) / n;
  const flowGPM = flowCFS * 448.8;

  const warnings = [];
  if (slope < 0.01) warnings.push(`Low slope: ${(slope * 100).toFixed(2)}% - May be inadequate for gravity flow`);
  if (flowGPM < 10) warnings.push(`Low gravity flow: ${flowGPM.toFixed(1)} GPM - May need booster pump`);

  return {
    pipeDiameter: d,
    pipeLength: len,
    staticHead: head,
    slope: (slope * 100).toFixed(3),
    estimatedFlow: flowGPM.toFixed(1),
    warnings,
  };
};

/**
 * Sewage Pump Sizing
 */
export const calcSewagePump = ({
  dailyFlow = '', // GPD
  peakFactor = '', // typically 2-4
  stationCapacity = '', // gallons
  pumpCycles = '', // cycles per day (typical: 4-6)
  liftHeight = '', // ft
  isIP = false,
}) => {
  const gpd = parseFloat(dailyFlow) || 0;
  const peakFac = parseFloat(peakFactor) || 3;
  const stnCap = parseFloat(stationCapacity) || 1000;
  //const cycles = parseFloat(pumpCycles) || 4;
  const lift = parseFloat(liftHeight) || 20;

  if (isNaN(gpd)) return null;

  const peakGPM = (gpd * peakFac) / (24 * 60);
  const pumpGPM = (gpd / 24 / 60) * peakFac;
  //const runtimeHours = (gpd / 24) / (pumpGPM * 60);

  // Pump head calculation (simplified)
  const pumpHeadFt = lift + 15; // lift + friction/pressure allowance
  const pumpHP = (pumpGPM * pumpHeadFt) / (3960 * 0.75); // 75% efficiency

  const warnings = [];
  if (peakFac > 4) warnings.push(`High peak factor: ${peakFac} - Verify load calculation`);

  return {
    peakGPM: peakGPM.toFixed(1),
    pumpGPM: pumpGPM.toFixed(1),
    pumpHeadFt: pumpHeadFt.toFixed(1),
    pumpHP: pumpHP.toFixed(2),
    stationRetentionTime: ((stnCap / pumpGPM) / 60).toFixed(2),
    warnings,
  };
};

/**
 * Rainwater Drainage Calculator
 */
export const calcRainwaterDrainage = ({
  roofArea = '', // sqft
  rainfall = '', // in/hr (intensity)
  drainageCoeff = '', // runoff coefficient (0.7-1.0)
  pipeSize = '', // inches
  isIP = false,
}) => {
  const area = parseFloat(roofArea) || 0;
  const rf = parseFloat(rainfall) || 2;
  const coeff = parseFloat(drainageCoeff) || 0.85;
  const d = parseFloat(pipeSize) || 4;

  if (isNaN(area) || isNaN(rf)) return null;

  const flowGPM = (area * rf * coeff) / 96.3; // 96.3 converts to GPM
  const pipeCapacity = 0.3208 * d * d * 10; // Rough approximation for horizontal pipes

  const adequatePipe = pipeCapacity >= (flowGPM / 60);

  const warnings = [];
  if (!adequatePipe) warnings.push(`Pipe undersized: Need ~${Math.ceil(d + 1)}" pipe for this flow`);

  return {
    roofArea: area,
    rainfalIntensity: rf,
    runoffFlow: flowGPM.toFixed(1),
    pipeSize: d,
    pipeAdequate: adequatePipe,
    warnings,
  };
};

/**
 * Grey Water Calculator
 */
export const calcGreyWaterCalculator = ({
  occupants = '', // number of people
  dailyUsagePerCap = '', // GPD per person (typical: 30-50)
  reclaimPercentage = '', // % of greywater to reclaim
  isIP = false,
}) => {
  const occ = parseFloat(occupants) || 0;
  const dailyUse = parseFloat(dailyUsagePerCap) || 40;
  const reclaim = parseFloat(reclaimPercentage) || 50;

  if (isNaN(occ)) return null;

  const totalDailyWater = occ * dailyUse;
  const reclaimableWater = (totalDailyWater * reclaim) / 100;

  // Storage tank sizing (2-3 days retention)
  const storageTankGal = reclaimableWater * 2.5;

  const warnings = [];
  if (reclaim > 80) warnings.push(`High reclaim rate: ${reclaim}% - Verify water source segregation`);

  return {
    totalDailyWater: totalDailyWater.toFixed(0),
    reclaimableWater: reclaimableWater.toFixed(0),
    storageTank: storageTankGal.toFixed(0),
    warnings,
  };
};

/**
 * Pipe Thermal Expansion Calculator
 */
export const calcPipeThermalExpansion = ({
  pipeLength = '', // ft
  initialTemp = '', // °F
  finalTemp = '', // °F
  material = 'steel', // steel, copper, pvc
  isIP = false,
}) => {
  const len = parseFloat(pipeLength) || 0;
  const t1 = parseFloat(initialTemp) || 50;
  const t2 = parseFloat(finalTemp) || 150;

  if (isNaN(len)) return null;

  const coeff = { steel: 6.1e-6, copper: 9.2e-6, pvc: 35e-6 }[material] || 6.1e-6;
  const deltaT = t2 - t1;
  const expansion = len * coeff * deltaT; // inches

  const warnings = [];
  if (expansion > 1) warnings.push(`Significant expansion: ${expansion.toFixed(2)}" - Verify expansion loop design`);
  if (material === 'pvc' && expansion > 0.5) warnings.push(`PVC expansion: ${expansion.toFixed(2)}" - Use swing connector or flex loop`);

  return {
    pipeLength: len,
    materialCoeff: coeff,
    deltaTemp: deltaT,
    expansionInches: expansion.toFixed(3),
    warnings,
  };
};

/**
 * Water Hammer Surge Calculator
 */
export const calcWaterHammerSurge = ({
  flowVelocity = '', // ft/s
  closureTime = '', // sec (valve closure time)
  pipeLength = '', // ft
  material = 'copper',
  isIP = false,
}) => {
  const v = parseFloat(flowVelocity) || 4;
  const tc = parseFloat(closureTime) || 0.1;
  const len = parseFloat(pipeLength) || 100;

  if (isNaN(v)) return null;

  // Wave speed in pipe (simplified)
  const waveSpeed = { steel: 3500, copper: 4600, pvc: 1200 }[material] || 3500; // ft/s

  // Joukowsky equation: ΔP = ρ × c × Δv
  // Simplified: ΔP (psi) ≈ (v × waveSpeed) / 1500
  const surgePressure = (v * waveSpeed) / 1500;

  const reflected = (len * 2) / waveSpeed; // Time for surge to reflect
  const rapidClosure = tc < reflected * 0.5;

  const warnings = [];
  if (surgePressure > 100) warnings.push(`High surge pressure: ${surgePressure.toFixed(1)} PSI - Install relief valve`);
  if (rapidClosure) warnings.push(`Rapid closure detected - Increased surge risk`);

  return {
    flowVelocity: v,
    surgePressure: surgePressure.toFixed(2),
    waveSpeed,
    reflectionTime: reflected.toFixed(3),
    rapidClosure,
    warnings,
  };
};

// ════════════════════════════════════════════════════════════════
// FIRE FIGHTING CALCULATORS
// ════════════════════════════════════════════════════════════════

/**
 * Sprinkler Density & Flow Calculator
 */
export const calcSprinklerDensity = ({
  occupancy = '', // light, ordinary, extra
  areaPerSprinkler = '', // sqft
  numSprinklers = '', // number of sprinklers
  kFactor = '', // sprinkler k-factor (GPM/sqrt(PSI))
  isIP = false,
}) => {
  const area = parseFloat(areaPerSprinkler) || 130;
  const num = parseFloat(numSprinklers) || 10;
  const k = parseFloat(kFactor) || 5.6;

  if (isNaN(area) || isNaN(num)) return null;

  // NFPA 13 design densities
  const densities = {
    light: 0.1,
    ordinary: 0.15,
    extra: 0.25,
  };
  const density = densities[occupancy] || 0.15; // GPM/sqft

  const totalArea = area * num;
  const requiredFlow = totalArea * density; // GPM

  // Calculate required pressure for sprinklers
  // Q = K × √P, so P = (Q/K)²
  const pressurePerSprinkler = Math.pow(requiredFlow / (num * k), 2);

  const warnings = [];
  if (pressurePerSprinkler < 7) warnings.push(`Low pressure: ${pressurePerSprinkler.toFixed(1)} PSI - May affect discharge pattern`);
  if (pressurePerSprinkler > 100) warnings.push(`High pressure: ${pressurePerSprinkler.toFixed(1)} PSI - May require pressure reducing valve`);

  return {
    density: density.toFixed(3),
    totalArea: totalArea.toFixed(0),
    requiredFlow: requiredFlow.toFixed(1),
    pressurePerSprinkler: pressurePerSprinkler.toFixed(1),
    warnings,
  };
};

/**
 * Sprinkler Spacing Calculator
 */
export const calcSprinklerSpacing = ({
  spacing = '', // spacing in ft (typically 100, 130, 225 sqft)
  maxArea = '', // max coverage area sqft
  isIP = false,
}) => {
  const sp = parseFloat(spacing) || 130;
  const maxA = parseFloat(maxArea) || 300;

  if (isNaN(sp)) return null;

  const maxSpacing = Math.sqrt(maxA);
  const recommendedSpacing = Math.min(sp, maxSpacing);

  const warnings = [];
  if (sp > 225) warnings.push(`Large spacing: ${sp} sqft - Verify with NFPA 13`);
  if (sp > maxSpacing) warnings.push(`Spacing exceeds max: ${maxSpacing.toFixed(0)} sqft`);

  return {
    spacing: sp,
    maxAllowable: maxSpacing.toFixed(1),
    recommendedSpacing: recommendedSpacing.toFixed(1),
    warnings,
  };
};

/**
 * Equivalent Length Calculator (Fire Pipe)
 */
export const calcEquivalentLength = ({
  pipeLength = '', // actual pipe length in ft
  elbows = '', // 90° elbows
  tees = '', // tees
  bends = '', // long radius bends
  isIP = false,
}) => {
  const len = parseFloat(pipeLength) || 0;
  const elb = parseFloat(elbows) || 0;
  const te = parseFloat(tees) || 0;
  const ben = parseFloat(bends) || 0;

  if (isNaN(len)) return null;

  // Equivalent length multipliers
  const elbLE = elb * 32;
  const teeLE = te * 60;
  const bendLE = ben * 20;

  const totalEquivLength = len + elbLE + teeLE + bendLE;

  return {
    actualLength: len,
    elbowEquiv: elbLE.toFixed(0),
    teeEquiv: teeLE.toFixed(0),
    bendEquiv: bendLE.toFixed(0),
    totalEquivalentLength: totalEquivLength.toFixed(0),
  };
};

/**
 * Standpipe Loss Calculator
 */
export const calcStandpipeLoss = ({
  pipeLength = '', // ft (vertical rise)
  flowRate = '', // GPM
  pipeSize = '', // inches
  isIP = false,
}) => {
  const len = parseFloat(pipeLength) || 100;
  const gpm = parseFloat(flowRate) || 500;
  const d = parseFloat(pipeSize) || 4;

  if (isNaN(len) || isNaN(gpm)) return null;

  // Hazen-Williams friction loss simplified
  const c = 130; // Steel pipe
  const fl100 = (10.67 * Math.pow(gpm, 1.852)) / (Math.pow(c, 1.852) * Math.pow(d, 4.8704));
  const frictionLoss = (fl100 * len) / 100;

  const elevationLoss = len / 2.31; // PSI per foot of elevation

  const totalLoss = frictionLoss + elevationLoss;

  const warnings = [];
  if (totalLoss > 50) warnings.push(`High standpipe loss: ${totalLoss.toFixed(1)} PSI - Verify pump capability`);

  return {
    frictionLoss: frictionLoss.toFixed(2),
    elevationLoss: elevationLoss.toFixed(2),
    totalLoss: totalLoss.toFixed(2),
    warnings,
  };
};

// ════════════════════════════════════════════════════════════════
// ELECTRICAL CALCULATORS
// ════════════════════════════════════════════════════════════════

/**
 * Conduit Sizing Calculator
 */
export const calcConduitSizing = ({
  cableSize1 = '', // mm² (multiple cables)
  cableSize2 = '',
  cableSize3 = '',
  cableSize4 = '',
  installationType = 'conduit', // conduit, tray, buried
  fillRatio = 0.4, // 40% for single, 50% for multiple
  isIP = false,
}) => {
  const sizes = [cableSize1, cableSize2, cableSize3, cableSize4]
    .filter((s) => s && parseFloat(s))
    .map((s) => parseFloat(s));

  if (sizes.length === 0) return null;

  // Simplified OD estimation (mm for single core cable)
  const cableOD = {
    1.5: 8.5,
    2.5: 9.5,
    4: 10.5,
    6: 11.5,
    10: 13.5,
    16: 15,
    25: 18,
    35: 20,
  };

  const totalArea = sizes.reduce((sum, size) => {
    const od = cableOD[size] || 10;
    return sum + Math.PI * Math.pow(od / 2, 2);
  }, 0);

  const requiredArea = totalArea / fillRatio;
  const requiredConduitOD = Math.sqrt((requiredArea * 4) / Math.PI);

  // Standard conduit sizes
  const stdConduits = [20, 25, 32, 40, 50, 63, 75, 100];
  const selected = stdConduits.find((c) => c >= requiredConduitOD) || 100;

  return {
    cableCount: sizes.length,
    totalCableArea: totalArea.toFixed(1),
    fillRatio: (fillRatio * 100).toFixed(0),
    requiredConduitOD: requiredConduitOD.toFixed(1),
    selectedConduit: selected,
  };
};

/**
 * Design Check Tool - Cable and Breaker Verification
 */
export const calcDesignCheckTool = ({
  designCurrent = '', // Amperes
  cableAmpacity = '', // Amperes
  breakerRating = '', // Amperes
  voltageDropPercent = '', // %
  isIP = false,
}) => {
  const ic = parseFloat(designCurrent) || 0;
  const ca = parseFloat(cableAmpacity) || 0;
  const br = parseFloat(breakerRating) || 0;
  const vd = parseFloat(voltageDropPercent) || 0;

  if (isNaN(ic)) return null;

  const cableAdequate = ca >= ic;
  const breakerAdequate = br >= ic * 1.25; // Breaker typically 125% of design current
  const voltageDropAdequate = vd <= 3; // 3% for branch circuit

  const issues = [];
  if (!cableAdequate) issues.push(`Cable undersized: ${ca}A < ${ic}A`);
  if (!breakerAdequate) issues.push(`Breaker undersized: ${br}A < ${(ic * 1.25).toFixed(0)}A`);
  if (!voltageDropAdequate) issues.push(`Voltage drop excessive: ${vd}% > 3%`);

  const designOK = cableAdequate && breakerAdequate && voltageDropAdequate;

  return {
    designCurrent: ic,
    cableAdequate,
    breakerAdequate,
    voltageDropAdequate,
    designOK,
    issues,
  };
};

/**
 * Generator Sizing Calculator
 */
export const calcGeneratorSizing = ({
  connectedLoad = '', // kW
  demandFactor = '', // 0.5-1.0
  diversityFactor = '', // typically 1.0-1.3
  growthFactor = '', // for future load, 1.0-1.2
  pf = '', // power factor
  isIP = false,
}) => {
  const cl = parseFloat(connectedLoad) || 0;
  const df = parseFloat(demandFactor) || 0.7;
  const div = parseFloat(diversityFactor) || 1.0;
  const gf = parseFloat(growthFactor) || 1.0;
  const pwr = parseFloat(pf) || 0.8;

  if (isNaN(cl)) return null;

  const demandLoad = cl * df;
  const adjustedLoad = demandLoad * div * gf;
  const genKVA = adjustedLoad / pwr;

  // Standard generator sizes
  const stdSizes = [10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 250, 300];
  const selected = stdSizes.find((s) => s >= genKVA) || 300;

  return {
    connectedLoad: cl.toFixed(1),
    demandLoad: demandLoad.toFixed(1),
    adjustedLoad: adjustedLoad.toFixed(1),
    requiredKVA: genKVA.toFixed(1),
    selectedGeneratorKVA: selected,
  };
};

/**
 * Motor Starting Current Calculator (Inrush)
 */
export const calcMotorStartingCurrent = ({
  motorHP = '', // Horsepower
  voltage = '', // Volts
  starterType = 'full', // full, soft, vfd
  isIP = false,
}) => {
  const hp = parseFloat(motorHP) || 1;
  const vnom = parseFloat(voltage) || 460;

  if (isNaN(hp)) return null;

  // Full load current (typical: ~1A per HP for 460V 3-phase)
  const flc = hp * 746 / (vnom * 0.866); // Simplified
  const inrushFactors = {
    full: 6.0,
    soft: 2.0,
    vfd: 1.5,
  };
  const inrush = flc * (inrushFactors[starterType] || 6);

  const warnings = [];
  if (starterType === 'full') warnings.push(`Full voltage start causes ${inrush.toFixed(0)}A inrush - Consider soft starter`);

  return {
    motorHP: hp,
    fullLoadCurrent: flc.toFixed(2),
    inrushMultiplier: inrushFactors[starterType] || 6,
    inrushCurrent: inrush.toFixed(2),
    warnings,
  };
};

/**
 * Power Factor Correction Calculator
 */
export const calcPFCorrection = ({
  activePower = '', // kW
  currentPF = '', // existing power factor (0.6-0.95)
  targetPF = '', // desired power factor (0.9-0.95)
  voltage = '', // V
  frequency = '', // 50 or 60 Hz
  isIP = false,
}) => {
  const kw = parseFloat(activePower) || 100;
  const pf1 = parseFloat(currentPF) || 0.75;
  const pf2 = parseFloat(targetPF) || 0.95;
  const v = parseFloat(voltage) || 460;
  const f = parseFloat(frequency) || 60;

  if (isNaN(kw)) return null;

  const reac1 = kw * (Math.sqrt(1 / (pf1 * pf1)) - 1);
  const reac2 = kw * (Math.sqrt(1 / (pf2 * pf2)) - 1);
  const qcap = reac1 - reac2; // kVAR to add

  // Capacitor size in µF
  const capacitance = (qcap * 1000000) / (2 * Math.PI * f * v * v);

  return {
    currentPF: pf1,
    targetPF: pf2,
    capacitorKVAR: qcap.toFixed(2),
    capacitanceMicroF: capacitance.toFixed(0),
  };
};

/**
 * Current Calculator - AC 1-phase and 3-phase
 */
export const calcCurrent = ({
  powerType = 'active', // active or apparent (kW or kVA)
  powerValue = '', // kW or kVA
  voltage = '', // Volts
  phase = '3', // '1' or '3'
  pf = '', // power factor for 1-phase
  isIP = false,
}) => {
  const power = parseFloat(powerValue) || 0;
  const v = parseFloat(voltage) || 460;
  const ph = parseFloat(phase) || 3;
  const powerFactor = parseFloat(pf) || 1.0;

  if (isNaN(power)) return null;

  const kva = powerType === 'active' ? power / powerFactor : power;
  const current =
    ph === 1 ? (kva * 1000) / v : (kva * 1000) / (v * 1.732 * powerFactor);

  return {
    power: power.toFixed(2),
    powerType,
    kVA: kva.toFixed(2),
    voltage: v,
    phase: ph === 1 ? '1-phase' : '3-phase',
    current: current.toFixed(2),
  };
};

/**
 * Lighting Lumen Calculator
 */
export const calcLightingLumen = ({
  roomArea = '', // sqft
  luxRequired = '', // lux (typical 300-500)
  roomType = 'office', // office, retail, warehouse
  maintenanceFactor = '', // 0.7-0.9
  isIP = false,
}) => {
  const area = parseFloat(roomArea) || 100;
  const lux = parseFloat(luxRequired) || 400;
  const mf = parseFloat(maintenanceFactor) || 0.8;

  if (isNaN(area)) return null;

  // Convert sqft to m²
  const areaSqm = area / 10.764;

  // Lumens required = Lux × Area / MF
  const lumensRequired = (lux * areaSqm) / mf;

  // Typical lumens per watt
  const efficiencies = {
    office: 100,
    retail: 120,
    warehouse: 80,
  };
  const lumPerWatt = efficiencies[roomType] || 100;

  const powerRequired = lumensRequired / lumPerWatt;

  return {
    roomArea: area,
    roomAreaSqm: areaSqm.toFixed(1),
    luxRequired: lux,
    maintenanceFactor: mf,
    lumensRequired: lumensRequired.toFixed(0),
    lumensPerWatt: lumPerWatt,
    powerRequired: powerRequired.toFixed(1),
  };
};

/**
 * Lux Recommendation Guide
 */
export const calcLuxRecommendation = ({
  spaceType = 'general', // general, detailed, precision
  isIP = false,
}) => {
  const recommendations = {
    general: { lux: 300, notes: 'General office, corridors, lobbies' },
    detailed: { lux: 500, notes: 'Detailed office work, retail, kitchens' },
    precision: { lux: 750, notes: 'Precision work, quality control, medical' },
    outdoor: { lux: 100, notes: 'Outdoor parking, pathways' },
    emergency: { lux: 50, notes: 'Emergency lighting, stairwells' },
  };

  const rec = recommendations[spaceType] || recommendations.general;

  return {
    spaceType,
    recommendedLux: rec.lux,
    notes: rec.notes,
  };
};

/**
 * Earthing Resistance Calculator
 */
export const calcEarthingResistance = ({
  rodLength = '', // ft or m
  rodDiameter = '', // inches or mm
  soilResistivity = '', // Ohm·m (typical 50-200)
  rodCount = '', // number of rods
  rodSpacing = '', // ft or m (spacing between rods)
  isIP = false,
}) => {
  const len = isIP ? parseFloat(rodLength) * 0.3048 : parseFloat(rodLength);
  const diam = isIP ? parseFloat(rodDiameter) * 25.4 : parseFloat(rodDiameter);
  const rho = parseFloat(soilResistivity) || 100;
  const numRods = parseFloat(rodCount) || 1;
  //const spacing = isIP ? parseFloat(rodSpacing) * 0.3048 : parseFloat(rodSpacing);

  if (isNaN(len) || isNaN(diam)) return null;

  // Resistance for single rod: R = (ρ / 2πL) × ln(8L / d)
  const r = (rho / (2 * Math.PI * len)) * Math.log((8 * len) / diam);

  // Multiple rods with spacing
  const totalR = numRods === 1 ? r : r / Math.sqrt(numRods);

  const warnings = [];
  if (totalR > 10) warnings.push(`High earthing resistance: ${totalR.toFixed(2)} Ω - Consider more rods or lower resistivity soil`);

  return {
    singleRodResistance: r.toFixed(2),
    totalResistance: totalR.toFixed(2),
    numRods,
    warnings,
  };
};

/**
 * Battery / UPS Calculator
 */
export const calcBatteryUPS = ({
  loadPower = '', // kW
  backupDuration = '', // hours
  batteryVoltage = '', // V (12, 24, 48, 120, 240)
  roundTripEfficiency = '', // % (typical 85-95)
  isIP = false,
}) => {
  const kw = parseFloat(loadPower) || 10;
  const hours = parseFloat(backupDuration) || 2;
  const bv = parseFloat(batteryVoltage) || 120;
  const eff = parseFloat(roundTripEfficiency) || 90;

  if (isNaN(kw)) return null;

  const energyNeeded = kw * hours; // kWh
  const batteryCapacity = energyNeeded / (eff / 100); // Accounting for efficiency loss

  // Amp-hour capacity: Ah = kWh × 1000 / V
  const ahCapacity = (batteryCapacity * 1000) / bv;

  return {
    loadPower: kw,
    backupDuration: hours,
    energyNeeded: energyNeeded.toFixed(2),
    batteryCapacityKWh: batteryCapacity.toFixed(2),
    ampHourCapacity: ahCapacity.toFixed(0),
    batteryVoltage: bv,
  };
};

/**
 * Energy Consumption Calculator
 */
export const calcEnergyConsumption = ({
  power = '', // kW
  operatingHours = '', // hours per year
  peakRate = '', // $/kWh during peak
  offPeakRate = '', // $/kWh off-peak
  peakPercentage = '', // % of time at peak
  isIP = false,
}) => {
  const kw = parseFloat(power) || 50;
  const hours = parseFloat(operatingHours) || 8760;
  const peakR = parseFloat(peakRate) || 0.12;
  const offPeakR = parseFloat(offPeakRate) || 0.08;
  const peakPct = parseFloat(peakPercentage) || 50;

  if (isNaN(kw)) return null;

  const totalEnergy = kw * hours; // kWh
  const peakEnergy = (totalEnergy * peakPct) / 100;
  const offPeakEnergy = totalEnergy - peakEnergy;

  const peakCost = peakEnergy * peakR;
  const offPeakCost = offPeakEnergy * offPeakR;
  const totalCost = peakCost + offPeakCost;

  return {
    powerKW: kw,
    annualHours: hours,
    totalEnergy: totalEnergy.toFixed(0),
    peakEnergy: peakEnergy.toFixed(0),
    offPeakEnergy: offPeakEnergy.toFixed(0),
    peakCost: peakCost.toFixed(2),
    offPeakCost: offPeakCost.toFixed(2),
    totalCost: totalCost.toFixed(2),
  };
};

