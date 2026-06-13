// src/pages/design/DesignProjects.jsx

import { useMemo, useState, useEffect } from 'react';
import {
  calcPsychrometric,
  calcDuctSizer,
  calcPumpHead,
  calcHvacPipeSize,
  calcExtStaticPressure,
  calcDiffuserSelector,
  calcHeatLoadQuick,
  calcChillerCOP,
  calcCoolingTower,
  calcFixtureUnit,
  calcBoosterPump,
  calcPressureAtFixture,
  calcPipeDesignCheck,
  calcGravityFlowCheck,
  calcSewagePump,
  calcRainwaterDrainage,
  calcGreyWaterCalculator,
  calcPipeThermalExpansion,
  calcWaterHammerSurge,
  calcSprinklerDensity,
  calcSprinklerSpacing,
  calcEquivalentLength,
  calcStandpipeLoss,
  calcConduitSizing,
  calcDesignCheckTool,
  calcGeneratorSizing,
  calcMotorStartingCurrent,
  calcPFCorrection,
  calcCurrent,
  calcLightingLumen,
  calcLuxRecommendation,
  calcEarthingResistance,
  calcBatteryUPS,
  calcEnergyConsumption,
  satP,
} from '../../utils/mepCalculations';
import { getLeads } from "../../firebase/leadsService";
import { useAuth } from "../../contexts/AuthContext";

/* =========================================================
   DISCIPLINE + CALCULATOR CONFIG
========================================================= */
const parameterOptions = [
  { key: 'rh', label: 'Relative Humidity', unit: '%' },
  { key: 'wb', label: 'Wet Bulb', unit: '°F' },
  { key: 'dp', label: 'Dew Point', unit: '°F' },
  { key: 'w', label: 'Humidity Ratio', unit: 'lb/lb' },
];

const sidebarSections = [
  {
    key: 'hvac',
    label: 'Air-Conditioning',
    items: [
      { key: 'psychrometric', label: 'Psychrometric' },
      { key: 'airflow-calc', label: 'Airflow (CFM/TR/ΔT)' },
      //{ key: 'cooling-coil', label: 'Cooling Coil' },
      //{ key: 'ahu-sat', label: 'AHU Supply Air Temp' },
      { key: 'duct-sizer', label: 'Duct Sizer' },
      { key: 'esp', label: 'Ext. Static Pressure' },
      //{ key: 'diffuser', label: 'Diffuser Selector' },
      //{ key: 'fan-power', label: 'Fan Power' },
      //{ key: 'fan-laws', label: 'Fan Laws (VFD)' },
      { key: 'hvac-pipe', label: 'Pipe Sizer (CHW/CW)' },
      { key: 'pump-head', label: 'Pump Head' },
      //{ key: 'heat-load', label: 'Heat Load (Quick)' },
      { key: 'ventilation', label: 'Ventilation + ACH' },
      //{ key: 'fresh-air', label: 'Fresh Air Requirement' },
      //{ key: 'chiller-cop', label: 'Chiller COP / Efficiency' },
      //{ key: 'cooling-tower', label: 'Cooling Tower' },
      { key: 'ref-pipe', label: 'Refrigerant Pipe Sizing' },
      { key: 'condensate', label: 'Condensate Drain' },
      //{ key: 'sanity-check', label: 'Sanity Check Tool' },
      //{ key: 'air-mixing', label: 'Air Mixing (Multi-stream)' },
      //{ key: 'room-press', label: 'Room Pressurization' },
      { key: 'equip-heat', label: 'Equipment Heat Gain' },
      { key: 'heating-load', label: 'Heating Load' },
      //{ key: 'insulation', label: 'Insulation Thickness' },
      { key: 'ach-rec', label: 'ACH Recommendation' },
    ],
  },

  {
    key: 'fire',
    label: 'Fire Fighting',
    items: [
      //{ key: 'k-factor', label: 'K-Factor' },
      { key: 'sprinkler-density', label: 'Density & Flow' },
      //{ key: 'sprinkler-spacing', label: 'Sprinkler Spacing' },
      { key: 'hazen-williams', label: 'Hazen-Williams' },
      //{ key: 'equiv-length', label: 'Equivalent Length' },
      //{ key: 'standpipe', label: 'Standpipe Loss' },
      { key: 'fire-water-demand', label: 'Fire Water Demand' },
      //{ key: 'fire-pipe-check', label: 'Fire Pipe Check' },
      //{ key: 'hydrant-flow', label: 'Hydrant Flow Test' },
      { key: 'fire-pump', label: 'Fire Pump Duty' },
      //{ key: 'pump-suction', label: 'Pump Suction / NPSH' },
      { key: 'fire-tank', label: 'Fire Tank Capacity' },
      { key: 'tank-duration', label: 'Tank Duration' },
      { key: 'hose-coverage', label: 'Hose / Hydrant Coverage' },
      { key: 'dry-pipe-vol', label: 'Dry Pipe Volume' },
    ],
  },

  {
    key: 'elec',
    label: 'Electrical',
    items: [
      { key: 'elec-load', label: 'Load Calculation' },
      //{ key: 'elec-panel', label: 'Panel Load Schedule' },
      { key: 'elec-cable', label: 'Cable Sizing' },
      //{ key: 'elec-derating', label: 'Cable Derating' },
      { key: 'elec-vdrop', label: 'Voltage Drop' },
      //{ key: 'elec-vdopt', label: 'VD Optimization' },
      { key: 'elec-conduit', label: 'Conduit Sizing' },
      //{ key: 'elec-design-check', label: 'Design Check Tool' },
      { key: 'elec-breaker', label: 'Breaker Sizing' },
      // { key: 'elec-sc', label: 'Short Circuit (Basic)' },
      { key: 'elec-transformer', label: 'Transformer Sizing' },
      { key: 'elec-generator', label: 'Generator Sizing' },
      //{ key: 'elec-motor', label: 'Motor Starting Current' },
      //{ key: 'elec-pfc', label: 'PF Correction' },
      { key: 'elec-current', label: 'Current Calculator' },
      { key: 'elec-lighting', label: 'Lighting (Lumen)' },
      { key: 'elec-lux', label: 'Lux Recommendation' },
      //{ key: 'elec-earth', label: 'Earthing Resistance' },
      { key: 'elec-ups', label: 'Battery / UPS' },
      //{ key: 'elec-energy', label: 'Energy Consumption' },
    ],
  },

  {
    key: 'plumbing',
    label: 'Plumbing',
    items: [
      { key: 'water-demand', label: 'Water Demand' },
      //{ key: 'fixture-unit', label: 'Fixture Unit Calc' },
      { key: 'hot-water', label: 'Hot Water System' },
      { key: 'water-pipe', label: 'Supply Pipe Sizer' },
      //{ key: 'booster-pump', label: 'Booster Pump' },
      //{ key: 'pressure-fix', label: 'Pressure at Fixture' },
      { key: 'pipe-check', label: 'Pipe Design Check' },
      { key: 'drainage', label: 'Drainage Sizing' },
      //{ key: 'gravity-flow', label: 'Gravity Flow Check' },
      //{ key: 'sewage-pump', label: 'Sewage Pump' },
      //{ key: 'rainwater', label: 'Rainwater Drainage' },
      { key: 'tank-sizing', label: 'Tank Sizing' },
      { key: 'greywater', label: 'Grey Water Calculator' },
      //{ key: 'pipe-expansion', label: 'Pipe Thermal Expansion' },
      //{ key: 'water-hammer', label: 'Water Hammer (Surge)' },
    ],
  },

];

/* =========================================================
   PAGE META
========================================================= */

const pageMeta = {
  psychrometric: {
    title: 'Psychrometric Calculator',
    subtitle: 'ASHRAE Fundamentals 2021 - Hyland-Wexler Equations',
    description:
      'Calculate complete psychrometric state of moist air from two known properties. Uses full ASHRAE Hyland-Wexler saturation pressure equations.',
    accent: '#2563EB',
  },
  'duct-sizer': {
    title: 'Duct Sizer + Friction Loss',
    subtitle: 'SMACNA HVAC Duct Design Manual · Equal Friction Method',
    description:
      'Size round or rectangular ducts for a target friction rate using the Equal Friction Method with Colebrook-White iteration.',
    accent: '#2563EB',
  },
  'pump-head': {
    title: 'Pump Head Calculator',
    subtitle: 'Darcy-Weisbach + ASHRAE Equivalent Length Method',
    description:
      'Calculate total system head for HVAC water systems including pipe friction, fittings, static head, and equipment losses.',
    accent: '#2563EB',
  },
  'airflow-calc': {
    title: 'Airflow Calculator',
    subtitle: 'CFM from TR, sensible heat, or ΔT method',
    description:
      'Calculate required supply airflow from cooling capacity, sensible heat load, or temperature difference. Three independent methods support common HVAC sizing checks.',
    accent: '#2563EB',
  },
  'cooling-coil': {
    title: 'Cooling Coil Calculator',
    subtitle: 'Coil load, SHR, ADP, bypass factor estimate',
    description:
      'Estimate cooling coil performance from entering and leaving air conditions. Simplified psychrometric coil analysis for quick HVAC design checks.',
    accent: '#2563EB',
  },
  'fan-power': {
    title: 'Fan Power Calculator',
    subtitle: 'Fluid power, shaft power, motor sizing',
    description:
      'Calculate fan power and motor input from airflow, static pressure, and equipment efficiencies.',
    accent: '#2563EB',
  },
  'fan-laws': {
    title: 'Fan Laws Calculator',
    subtitle: 'Affinity laws for speed change effects',
    description:
      'Apply fan affinity laws to calculate new airflow, pressure, and power when fan speed changes.',
    accent: '#2563EB',
  },
  'fresh-air': {
    title: 'Fresh Air Requirement',
    subtitle: 'ASHRAE 62.1 people and area components',
    description:
      'Calculate minimum outdoor air requirement from occupancy and floor area. Includes zone air distribution effectiveness adjustments.',
    accent: '#2563EB',
  },
  'ahu-sat': {
    title: 'AHU Supply Air Temperature',
    subtitle: 'SAT or required airflow from sensible load',
    description:
      'Calculate supply air temperature or required airflow for a given sensible load and room setpoint.',
    accent: '#2563EB',
  },
  'hvac-pipe': {
    title: 'HVAC Pipe Sizer',
    subtitle: 'Chilled water / condenser water pipe selection',
    description:
      'Size HVAC piping using flow, fluid type, temperature, and target pressure drop.',
    accent: '#2563EB',
  },
  ventilation: {
    title: 'Ventilation + ACH Calculator',
    subtitle: 'ASHRAE 62.1 or ACH-based outdoor air sizing',
    description:
      'Calculate ventilation requirements using ASHRAE 62.1 or simplified air change rates.',
    accent: '#2563EB',
  },
  'ref-pipe': {
    title: 'Refrigerant Pipe Sizing',
    subtitle: 'Suction, liquid, or discharge line selection',
    description:
      'Estimate refrigerant line OD and recommended velocity range from system capacity and refrigerant type.',
    accent: '#2563EB',
  },
  condensate: {
    title: 'Condensate Drain Calculator',
    subtitle: 'Condensate flow, pipe size, slope and daily rate',
    description:
      'Estimate condensate drain flow and select a practical pipe size based on cooling load or latent load.',
    accent: '#2563EB',
  },
  'sanity-check': {
    title: 'HVAC Sanity Check Tool',
    subtitle: 'Quick validation of common HVAC design ranges',
    description:
      'Check duct velocity, friction, ESP, pump head, airflow, and chiller efficiency against typical design ranges.',
    accent: '#2563EB',
  },
  'air-mixing': {
    title: 'Air Mixing Calculator',
    subtitle: 'Mixed air condition from two airstreams',
    description:
      'Estimate mixed air dry bulb, wet bulb, humidity ratio, and enthalpy for two inlet air streams.',
    accent: '#2563EB',
  },
  'room-press': {
    title: 'Room Pressurization',
    subtitle: 'Supply/exhaust balance and leakage estimation',
    description:
      'Estimate air leakage, exhaust requirement and pressure direction for positive or negative room pressurization.',
    accent: '#2563EB',
  },
  'equip-heat': {
    title: 'Equipment Heat Gain Calculator',
    subtitle: 'Connected equipment load and radiant fraction',
    description:
      'Estimate equipment heat gain, design thermal load, and total cooling requirement from connected device power.',
    accent: '#2563EB',
  },
  'heating-load': {
    title: 'Heating Load Calculator',
    subtitle: 'Envelope conduction and infiltration load estimate',
    description:
      'Estimate heating load using wall, glazing, and infiltration heat losses for a simple space.',
    accent: '#2563EB',
  },
  insulation: {
    title: 'Insulation Thickness Calculator',
    subtitle: 'Recommended pipe insulation for cold and hot services',
    description:
      'Estimate minimum insulation thickness and condensation risk using temperature difference and dew point.',
    accent: '#2563EB',
  },
  'ach-rec': {
    title: 'ACH Recommendation Guide',
    subtitle: 'Air changes per hour guidance for common spaces',
    description:
      'Provide design air change rates, pressure guidance, and reference standards for typical space types.',
    accent: '#2563EB',
  },
  'water-demand': {
    title: 'Domestic Water Demand',
    subtitle: "Hunter's Method - IPC Table 604.1",
    description:
      'Estimate peak domestic water demand using Hunter\'s Method fixture unit approach per IPC. Enter fixture counts to calculate design peak flow.',
    accent: '#059669',
  },
  'hot-water': {
    title: 'Hot Water System Calculator',
    subtitle: 'Demand · Heater capacity · Storage · Recovery time',
    description:
      'Size hot water heaters and storage tanks for residential, hotel, hospital, and commercial applications based on daily demand and peak draw patterns.',
    accent: '#059669',
  },
  'water-pipe': {
    title: 'Water Supply Pipe Sizer',
    subtitle: 'IPC / ASPE - Velocity & Pressure adequacy method',
    description:
      'Size domestic water supply pipes and verify residual pressure at the most remote fixture using Hazen-Williams with elevation and fitting allowances.',
    accent: '#059669',
  },
  drainage: {
    title: 'Drainage Sizing',
    subtitle: 'IPC Table 702.1 - Drainage Fixture Unit Method',
    description:
      'Size drainage pipes based on drainage fixture units (DFU) per IPC. Select system type and enter fixture counts.',
    accent: '#059669',
  },
  'tank-sizing': {
    title: 'Tank Sizing',
    subtitle: 'Storage Demand Method',
    description:
      'Calculate required water storage tank capacity based on daily demand, peak flow, and storage duration.',
    accent: '#059669',
  },
  'k-factor': {
    title: 'Sprinkler K-Factor Calculator',
    subtitle: 'NFPA 13 - Q = K × √P',
    description:
      'Calculate sprinkler discharge flow from pressure, or required pressure for target flow using NFPA 13 standard K-factor values.',
    accent: '#DC2626',
  },
  'hazen-williams': {
    title: 'Hazen-Williams Friction Loss',
    subtitle: 'Pressure loss calculation for water flow in pipes',
    description:
      'Calculate friction pressure loss for water flowing through pipes using the Hazen-Williams equation with common pipe material coefficients.',
    accent: '#DC2626',
  },
  'fire-water-demand': {
    title: 'Fire Water Demand',
    subtitle: 'Sprinkler, hydrant, hose reel flow summary',
    description:
      'Calculate combined fire water demand from sprinkler flow, hydrants, and hose reels for a simplified fire system estimate.',
    accent: '#DC2626',
  },
  'fire-pipe-check': {
    title: 'Fire Pipe Check',
    subtitle: 'Velocity, friction, pressure and churn review',
    description:
      'Basic fire pipe design check that reviews pipe velocity, friction loss, residual pressure, and churn margins for fire service.',
    accent: '#DC2626',
  },
  'fire-pump': {
    title: 'Fire Pump Duty',
    subtitle: 'Pump head, flow and power estimate',
    description:
      'Estimate fire pump duty by combining required system pressure, suction head and discharge losses, then compute pump power.',
    accent: '#DC2626',
  },
  'pump-suction': {
    title: 'Pump Suction / NPSH',
    subtitle: 'Available NPSH versus manufacturer requirement',
    description:
      'Estimate NPSH available for fire pump suction conditions and compare against manufacturer NPSHr for cavitation safety.',
    accent: '#DC2626',
  },
  'fire-tank': {
    title: 'Fire Tank Capacity',
    subtitle: 'Sprinkler, standpipe and hose storage estimate',
    description:
      'Estimate fire tank capacity based on sprinkler, standpipe and hose stream demand, including makeup supply compensation.',
    accent: '#DC2626',
  },
  'tank-duration': {
    title: 'Tank Duration',
    subtitle: 'Validate tank volume and mains refill',
    description:
      'Check whether a fire tank and mains refill rate can supply the required fire water demand for the selected duration.',
    accent: '#DC2626',
  },
  'hose-coverage': {
    title: 'Hose / Hydrant Coverage',
    subtitle: 'Hose reach, area and obstruction estimate',
    description:
      'Estimate required hose stream coverage for a protected area taking into account hose length, reach and obstruction factor.',
    accent: '#DC2626',
  },
  'hydrant-flow': {
    title: 'Hydrant Flow Test',
    subtitle: 'Flow measurement and projection from pitot data',
    description:
      'Calculate measured hydrant flow from pitot readings and project available flow at a 20 psi residual pressure.',
    accent: '#DC2626',
  },
  'dry-pipe-vol': {
    title: 'Dry Pipe Volume',
    subtitle: 'Air volume and compressor estimate',
    description:
      'Estimate dry pipe system volume, NFPA 13 limits, air-to-water ratio, and required fill air capacity.',
    accent: '#DC2626',
  },
  'elec-load': {
    title: 'Load Calculation',
    subtitle: 'NEC / IEC - General and demand loads',
    description:
      'Calculate connected load and demand load for electrical systems using standard demand factors per NEC or IEC codes.',
    accent: '#FBBF24',
  },
  'elec-cable': {
    title: 'Cable Sizing',
    subtitle: 'Current-carrying capacity and thermal rating',
    description:
      'Size electrical cables based on load current, allow voltage drop, and temperature derating factors.',
    accent: '#FBBF24',
  },
  'elec-vdrop': {
    title: 'Voltage Drop Calculator',
    subtitle: 'NEC Section 3 - Single and three-phase circuits',
    description:
      'Calculate voltage drop for AC and DC circuits, verify compliance with 3% (branch) or 5% (total) limits per NEC recommendations.',
    accent: '#FBBF24',
  },
  'elec-current': {
    title: 'Current Calculator',
    subtitle: 'Active/apparent power and current for 1- and 3-phase systems',
    description:
      'Calculate circuit current, apparent power, and reactive power from kW or kVA input with power factor and phase selection.',
    accent: '#FBBF24',
  },
  'elec-vdopt': {
    title: 'Voltage Drop Optimization',
    subtitle: 'Optimize cable size for current and voltage drop limits',
    description:
      'Compare standard conductor sizes and choose the smallest cable that satisfies allowable voltage drop and ampacity requirements.',
    accent: '#FBBF24',
  },
  'elec-transformer': {
    title: 'Transformer Sizing',
    subtitle: 'Estimate transformer kVA and standard selection',
    description:
      'Calculate required transformer rating with diversity, growth and power factor adjustments.',
    accent: '#FBBF24',
  },
  'elec-breaker': {
    title: 'Circuit Breaker Sizing',
    subtitle: 'Select MCB / MCCB / ACB based on design current and cable ampacity',
    description:
      'Estimate the minimum breaker rating, standard selectable rating, and cable compatibility for a given circuit.',
    accent: '#FBBF24',
  },
  'elec-derating': {
    title: 'Cable Ampacity & Derating',
    subtitle: 'Apply IEC derating factors for ambient temperature, grouping, and burial',
    description:
      'Calculate derated current capacity and identify whether the selected cable size is adequate for the design current.',
    accent: '#FBBF24',
  },
  'elec-conduit': {
    title: 'Conduit Sizing Calculator',
    subtitle: 'Select conduit size from cable fill ratio',
    description:
      'Estimate minimum conduit diameter and fill ratio for a bundle of cables using standard fill limits.',
    accent: '#FBBF24',
  },
  'elec-sc': {
    title: 'Short Circuit Current (Basic)',
    subtitle: 'Simplified transformer fault current estimate',
    description:
      'Estimate symmetrical fault current for a transformer and downstream cable path using an infinite bus assumption.',
    accent: '#FBBF24',
  },
  'elec-panel': {
    title: 'Panel Load Schedule',
    subtitle: 'Dynamic circuit demand schedule',
    description:
      'Build a panel load schedule by entering circuit names, load kW, and demand factors to estimate total connected and demand load.',
    accent: '#FBBF24',
  },
};

const SHF = 1.1;
const H_FACTOR = 4.5;
const FAN_STD_HP = [0.5, 0.75, 1, 1.5, 2, 3, 5, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200];
const CABLE_SIZES_MM2 = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300];
const CU_XLPE_CONDUIT = {
  1.5: 18,
  2.5: 24,
  4: 32,
  6: 41,
  10: 55,
  16: 75,
  25: 95,
  35: 115,
  50: 135,
  70: 170,
  95: 205,
  120: 225,
  150: 255,
  185: 290,
  240: 330,
  300: 367,
};
const CU_XLPE_TRAY = {
  1.5: 18,
  2.5: 25,
  4: 34,
  6: 43,
  10: 60,
  16: 80,
  25: 100,
  35: 125,
  50: 148,
  70: 183,
  95: 220,
  120: 253,
  150: 290,
  185: 329,
  240: 386,
  300: 442,
};
const CU_XLPE_AIR = {
  1.5: 22,
  2.5: 30,
  4: 40,
  6: 51,
  10: 70,
  16: 94,
  25: 119,
  35: 146,
  50: 173,
  70: 213,
  95: 256,
  120: 295,
  150: 336,
  185: 383,
  240: 450,
  300: 514,
};
const AL_XLPE_CONDUIT = {
  1.5: 13,
  2.5: 17,
  4: 24,
  6: 31,
  10: 42,
  16: 56,
  25: 70,
  35: 85,
  50: 100,
  70: 125,
  95: 150,
  120: 170,
  150: 190,
  185: 220,
  240: 250,
};
const CABLE_OD = {
  1.5: 8.5,
  2.5: 9.5,
  4: 10.5,
  6: 11.5,
  10: 13.5,
  16: 15,
  25: 18,
  35: 20,
  50: 23,
  70: 26,
  95: 30,
  120: 33,
  150: 36,
  185: 40,
  240: 45,
  300: 50,
};
const CONDUIT_SIZES = [20, 25, 32, 40, 50, 63, 75, 100];
const STD_MCB = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125];
const STD_MCCB = [100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500];
const STD_ACB = [800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6300];
const TRANSFORMER_STD_SIZES = [25, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000];
const nextStandardSize = (sizes, value) => sizes.find((size) => size >= value) || sizes[sizes.length - 1];

/* =========================================================
   MAIN DESIGN PAGE
========================================================= */

export default function DesignTab() {
  const [activeDiscipline, setActiveDiscipline] = useState('hvac');

  const [activePage, setActivePage] = useState('psychrometric');
  const [dbt, setDbt] = useState('');
  const [paramKey, setParamKey] = useState('rh');
  const [paramValue, setParamValue] = useState('');
  const [atm, setAtm] = useState('101.325');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const { companyId, user, role, displayName } = useAuth();
  const [projectList, setProjectList] = useState([]);

  /* ---------------- LOAD PROJECTS ---------------- */
  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    const load = async () => {
      const leads = await getLeads(companyId);
      const names = Array.from(
        new Set((leads || []).map((l) => l.projectName).filter(Boolean))
      );
      setProjectList(names);
      setLoading(false);
    };
    load();
  }, [companyId]);

  const activeDisciplineData = useMemo(() => {
    return sidebarSections.find(
      (section) => section.key === activeDiscipline
    );
  }, [activeDiscipline]);

  const selectedParam = useMemo(
    () => parameterOptions.find((option) => option.key === paramKey),
    [paramKey]
  );

  const activePageMeta = pageMeta[activePage] || {
    title: 'MEP Calculator',
    subtitle: 'Engineering Tool',
  };

  /* ======================================================
     PAGE COMPONENT MAP
  ===================================================== */

  const handleCalculate = () => {
    setResult({ timestamp: Date.now() });
  };

  const pageComponents = {
    psychrometric: (
      <PsychrometricPage
        dbt={dbt}
        setDbt={setDbt}
        paramKey={paramKey}
        setParamKey={setParamKey}
        paramValue={paramValue}
        setParamValue={setParamValue}
        atm={atm}
        setAtm={setAtm}
        result={result}
        handleCalculate={handleCalculate}
        setResult={setResult}
        selectedParam={selectedParam}
      />
    ),

    'airflow-calc': <AirflowCalcPage />,
    'cooling-coil': <CoolingCoilPage />,
    'fan-power': <FanPowerPage />,
    'fan-laws': <FanLawsPage />,
    'fresh-air': <FreshAirPage />,
    'ahu-sat': <AhuSatPage />,
    'hvac-pipe': <HvacPipePage />,
    'ventilation': <VentilationPage />,
    'duct-sizer': <DuctSizerPage />,
    'pump-head': <PumpHeadPage />,
    'ref-pipe': <RefrigerantPipePage />,
    'condensate': <CondensateDrainPage />,
    'sanity-check': <SanityCheckPage />,
    'air-mixing': <AirMixingPage />,
    'room-press': <RoomPressPage />,
    'equip-heat': <EquipmentHeatPage />,
    'heating-load': <HeatingLoadPage />,
    'insulation': <InsulationPage />,
    'ach-rec': <AchRecommendationPage />,

    'water-demand': <WaterDemandPage />,
    'hot-water': <HotWaterPage />,
    'water-pipe': <WaterPipePage />,
    'drainage': <DrainagePage />,
    'tank-sizing': <TankSizingPage />,

    'k-factor': <KFactorPage />,
    'hazen-williams': <HazenWilliamsPage />,
    'fire-water-demand': <FireWaterDemandPage />,
    'fire-pipe-check': <FirePipeCheckPage />,
    'fire-pump': <FirePumpPage />,
    'pump-suction': <PumpSuctionPage />,
    'fire-tank': <FireTankPage />,
    'tank-duration': <TankDurationPage />,
    'hose-coverage': <HoseCoveragePage />,
    'hydrant-flow': <HydrantFlowPage />,
    'dry-pipe-vol': <DryPipeVolumePage />,

    'elec-panel': <ElecPanelPage />,
    'elec-current': <ElecCurrentPage />,
    'elec-vdopt': <ElecVdOptPage />,
    'elec-transformer': <TransformerPage />,
    'elec-load': <ElecLoadPage />,
    'elec-cable': <ElecCablePage />,
    'elec-breaker': <ElecBreakerPage />,
    'elec-vdrop': <ElecVdropPage />,

    'elec-derating': <ElecDeratingPage />,
    'elec-conduit': <ElecConduitPage />,
    'elec-sc': <ElecSCPage />,
    'esp': <ExtStaticPressurePage />,
    'diffuser': <DiffuserSelectorPage />,
    'heat-load': <HeatLoadQuickPage />,
    'chiller-cop': <ChillerCOPPage />,
    'cooling-tower': <CoolingTowerPage />,
    'fixture-unit': <FixtureUnitPage />,
    'booster-pump': <BoosterPumpPage />,
    'pressure-fix': <PressureAtFixturePage />,
    'pipe-check': <PipeDesignCheckPage />,
    'gravity-flow': <GravityFlowCheckPage />,
    'sewage-pump': <SewagePumpPage />,
    'rainwater': <RainwaterDrainagePage />,
    'greywater': <GreyWaterCalculatorPage />,
    'pipe-expansion': <PipeThermalExpansionPage />,
    'water-hammer': <WaterHammerSurgePage />,
    'sprinkler-density': <SprinklerDensityPage />,
    'sprinkler-spacing': <SprinklerSpacingPage />,
    'equiv-length': <EquivalentLengthPage />,
    'standpipe': <StandpipeLossPage />,
    'elec-design-check': <DesignCheckToolPage />,
    'elec-generator': <GeneratorSizingPage />,
    'elec-motor': <MotorStartingCurrentPage />,
    'elec-pfc': <PFCorrectionPage />,
    'elec-lighting': <LightingLumenPage />,
    'elec-lux': <LuxRecommendationPage />,
    'elec-earth': <EarthingResistancePage />,
    'elec-ups': <BatteryUPSPage />,
    'elec-energy': <EnergyConsumptionPage />,
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "70vh" }}>
        <div className="text-center">
          <div className="spinner-border text-primary" />
          <div className="mt-2">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrapperStyle}>
      {/* =====================================================
          DISCIPLINE BUTTONS
      ===================================================== */}

      <section style={disciplineBarStyle}>
        {sidebarSections.map((section) => (
          <button
            key={section.key}
            type="button"
            onClick={() => {
              setActiveDiscipline(section.key);
              setActivePage(section.items[0].key);
            }}
            style={{
              ...disciplineButtonStyle,

              background:
                activeDiscipline === section.key
                  ? '#2563EB'
                  : '#F3F4F6',

              color:
                activeDiscipline === section.key
                  ? '#FFFFFF'
                  : '#111827',
            }}
          >
            {section.label}
          </button>
        ))}
      </section>

      {/* =====================================================
          CALCULATOR SUBMENU
      ===================================================== */}

      <section style={calculatorTabsStyle}>
        {activeDisciplineData.items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActivePage(item.key)}
            style={{
              ...calculatorTabButtonStyle,

              background:
                activePage === item.key
                  ? '#DBEAFE'
                  : '#FFFFFF',

              color:
                activePage === item.key
                  ? '#1D4ED8'
                  : '#374151',

              border:
                activePage === item.key
                  ? '1px solid #93C5FD'
                  : '1px solid #E5E7EB',
            }}
          >
            {item.label}
          </button>
        ))}
      </section>

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <section style={pageHeaderStyle}>
        <h1 style={pageTitleStyle}>
          {activePageMeta.title}
        </h1>

        <p style={pageSubtitleStyle}>
          {activePageMeta.subtitle}
        </p>
      </section>

      {/* =====================================================
          ACTIVE PAGE CONTENT
      ===================================================== */}

      <section>
        {pageComponents[activePage] || <PlaceholderPage />}
      </section>
    </div>
  );
}



/* =========================================================
   SAMPLE CALCULATOR PAGES
========================================================= */

// ══════════════════════════════════════════════════════════════════════════════
// HVAC
// ══════════════════════════════════════════════════════════════════════════════

function PsychrometricPage({
  dbt,
  setDbt,
  paramKey,
  setParamKey,
  paramValue,
  setParamValue,
  atm,
  setAtm,
  result,
  handleCalculate,
  setResult,
  selectedParam,
}) {
  const calcResult = useMemo(() => {
    if (!selectedParam) {
      return <div>Invalid parameter selected</div>;
    }
    if (!result) return null;
    return calcPsychrometric({
      dbtInput: dbt,
      paramKey,
      paramValue,
      atmPressure: parseFloat(atm) || 101.325,
      isIP: false, // Currently using SI (°C)
    });
  }, [result, dbt, paramKey, paramValue, atm]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Dry Bulb Temperature</label>
            <input
              type="number"
              value={dbt}
              onChange={(event) => setDbt(event.target.value)}
              placeholder="e.g. 25"
              style={inputStyle}
            />
            <span style={inputUnitStyle}>°C</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Known Second Parameter</label>
            <div style={chipRowStyle}>
              {parameterOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setParamKey(option.key)}
                  style={{
                    ...chipStyle,
                    background: option.key === paramKey ? '#2563EB' : '#F3F4F6',
                    color: option.key === paramKey ? '#FFFFFF' : '#111827',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>{selectedParam.label}</label>
            <input
              type="number"
              value={paramValue}
              onChange={(event) => setParamValue(event.target.value)}
              placeholder={`e.g. ${selectedParam.key === 'rh' ? '60' : '15'}`}
              style={inputStyle}
            />
            <span style={inputUnitStyle}>{selectedParam.unit}</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Atmospheric Pressure</label>
            <input
              type="number"
              value={atm}
              onChange={(event) => setAtm(event.target.value)}
              placeholder="e.g. 101.325"
              style={inputStyle}
            />
            <span style={inputUnitStyle}>kPa</span>
          </div>
        </div>
        <button style={calculateButtonStyle} type="button" onClick={handleCalculate}>
          ⚡ Calculate Psychrometric State
        </button>
      </div>

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Results</div>
        </div>
        <div style={panelBodyStyle}>
          {calcResult ? (
            <>
              <ResultRow label="Dry Bulb Temperature" value={`${calcResult.dbt.toFixed(1)} °C`} />
              <ResultRow label="Wet Bulb Temperature" value={`${calcResult.wbt.toFixed(1)} °C`} />
              <ResultRow label="Dew Point Temperature" value={`${calcResult.dp.toFixed(1)} °C`} />
              <ResultRow label="Relative Humidity" value={`${calcResult.rh.toFixed(1)} %`} />
              <ResultRow label="Humidity Ratio" value={`${calcResult.w.toFixed(2)} g/kg`} />
              <ResultRow label="Specific Enthalpy" value={`${calcResult.h.toFixed(2)} kJ/kg`} />
              <ResultRow label="Specific Volume" value={`${calcResult.v.toFixed(4)} m³/kg`} />
              <ResultRow label="Vapor Pressure" value={`${calcResult.pv.toFixed(3)} kPa`} />
              {calcResult.warnings.length > 0 && (
                <div style={resultSummaryStyle}>
                  {calcResult.warnings.map((w, i) => (
                    <div key={i} style={{ marginBottom: i < calcResult.warnings.length - 1 ? 8 : 0 }}>
                      ⚠ {w}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p style={{ color: '#6B7280' }}>Enter values and click the calculate button to see results.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AirflowCalcPage() {
  const [tr, setTr] = useState('10');
  const [cfmtr, setCfmtr] = useState('400');
  const [sh, setSh] = useState('40000');
  const [troom, setTroom] = useState('75');
  const [tsup, setTsup] = useState('55');
  const [q, setQ] = useState('4000');
  const [dt, setDt] = useState('20');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const trN = parseFloat(tr);
    const cfmtrN = parseFloat(cfmtr);
    const shN = parseFloat(sh);
    const troomN = parseFloat(troom);
    const tsupN = parseFloat(tsup);
    const qN = parseFloat(q);
    const dtN = parseFloat(dt);
    if ([trN, cfmtrN, shN, troomN, tsupN, qN, dtN].some((v) => Number.isNaN(v))) {
      setResult(null);
      return;
    }
    const r1 = trN * cfmtrN;
    const deltaT = troomN - tsupN;
    const r2 = deltaT > 0 ? shN / (SHF * deltaT) : null;
    const r3 = qN * SHF * dtN;
    const warnings = [];
    if (r1 < 100) warnings.push('Method 1 result is low. Verify TR and CFM/TR input.');
    if (deltaT < 8) warnings.push('Small ΔT means high airflow. Check room and supply temperatures.');
    if (tsupN > 60) warnings.push('Supply air temperature is high for a cooling application.');
    setResult({ r1, r2, r3, warnings });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Method 1 - From Cooling Capacity</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Cooling capacity</label>
            <input type="number" value={tr} onChange={(e) => setTr(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>TR</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>CFM per TR</label>
            <input type="number" value={cfmtr} onChange={(e) => setCfmtr(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>CFM/TR</span>
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Method 2 - From Sensible Heat</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Sensible heat load</label>
            <input type="number" value={sh} onChange={(e) => setSh(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>BTU/hr</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Room temperature</label>
            <input type="number" value={troom} onChange={(e) => setTroom(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>°F</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Supply air temperature</label>
            <input type="number" value={tsup} onChange={(e) => setTsup(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>°F</span>
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Method 3 - From Known Airflow</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Known airflow</label>
            <input type="number" value={q} onChange={(e) => setQ(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>CFM</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Room − supply ΔT</label>
            <input type="number" value={dt} onChange={(e) => setDt(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>°F</span>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Calculate Airflow
        </button>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelAccentStyle} />
            <div style={panelTitleStyle}>Results</div>
          </div>
          <div style={panelBodyStyle}>
            {result ? (
              <>
                <ResultRow label="Method 1 - From TR" value={`${result.r1.toFixed(0)} CFM`} />
                <ResultRow
                  label="Method 2 - From sensible heat"
                  value={result.r2 ? `${result.r2.toFixed(0)} CFM` : 'Invalid – SAT must be lower than room'}
                />
                <ResultRow label="Method 3 - Capacity of airflow" value={`${(result.r3 / 3412).toFixed(2)} kW`} />
                {result.warnings.length > 0 && (
                  <div style={resultSummaryStyle}>
                    {result.warnings.map((w, idx) => (
                      <div key={idx} style={{ marginBottom: idx < result.warnings.length - 1 ? 8 : 0 }}>
                        ⚠ {w}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: '#6B7280' }}>Enter values and calculate to see airflow results.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DuctSizerPage() {
  const [flow, setFlow] = useState('');
  const [friction, setFriction] = useState('0.08');
  const [shape, setShape] = useState('round');
  const [aspectRatio, setAspectRatio] = useState('2.0');
  const [result, setResult] = useState(null);

  const handleCalculate = () => {
    const res = calcDuctSizer({
      airflow: flow,
      targetFriction: friction,
      ductShape: shape,
      aspectRatio: parseFloat(aspectRatio),
      isIP: false,
    });
    setResult(res);
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Airflow (Q)</label>
            <input
              type="number"
              value={flow}
              onChange={(event) => setFlow(event.target.value)}
              placeholder="e.g. 1000"
              style={inputStyle}
            />
            <span style={inputUnitStyle}>L/s</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Target Friction Rate</label>
            <input
              type="number"
              step="0.01"
              value={friction}
              onChange={(event) => setFriction(event.target.value)}
              placeholder="e.g. 0.82"
              style={inputStyle}
            />
            <span style={inputUnitStyle}>Pa/m</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Duct Shape</label>
            <div style={chipRowStyle}>
              <button
                type="button"
                onClick={() => setShape('round')}
                style={{
                  ...chipStyle,
                  background: shape === 'round' ? '#2563EB' : '#F3F4F6',
                  color: shape === 'round' ? '#FFFFFF' : '#111827',
                }}
              >
                Round
              </button>
              <button
                type="button"
                onClick={() => setShape('rect')}
                style={{
                  ...chipStyle,
                  background: shape === 'rect' ? '#2563EB' : '#F3F4F6',
                  color: shape === 'rect' ? '#FFFFFF' : '#111827',
                }}
              >
                Rectangular
              </button>
            </div>
          </div>
          {shape === 'rect' && (
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Aspect Ratio (W:H)</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                style={inputStyle}
              >
                <option value="1.0">1:1 - Square</option>
                <option value="1.5">1.5:1 - Low profile</option>
                <option value="2.0">2:1 - Standard</option>
                <option value="3.0">3:1 - Wide</option>
                <option value="4.0">4:1 - Very wide</option>
              </select>
            </div>
          )}
        </div>
        <button style={calculateButtonStyle} type="button" onClick={handleCalculate}>
          ⚡ Calculate
        </button>
      </div>

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Results</div>
        </div>
        <div style={panelBodyStyle}>
          {result ? (
            <>
              <ResultRow label={`${shape === 'round' ? 'Diameter' : 'Size'}`} value={result.size} />
              {result.deqSize && <ResultRow label="Equivalent Diameter" value={result.deqSize} />}
              <ResultRow label="Velocity" value={`${result.velocity.toFixed(2)} m/s`} />
              <ResultRow label="Friction Rate" value={`${result.frictionRate.toFixed(3)} Pa/m`} />
              <ResultRow label="Reynolds Number" value={`${Math.round(result.reynolds).toLocaleString()}`} />
              <ResultRow label="Flow Regime" value={result.regime} />
              {result.warnings.length > 0 && (
                <div style={resultSummaryStyle}>
                  {result.warnings.map((w, i) => (
                    <div key={i} style={{ marginBottom: i < result.warnings.length - 1 ? 8 : 0 }}>
                      ⚠ {w}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p style={{ color: '#6B7280' }}>Enter values and click calculate to see results.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PumpHeadPage() {
  const [flow, setFlow] = useState('');
  const [pipeSize, setPipeSize] = useState('62.71');
  const [length, setLength] = useState('');
  const [temp, setTemp] = useState('7');
  const [staticHead, setStaticHead] = useState('0');
  const [equipment, setEquipment] = useState('0');
  const [safetyFactor, setSafetyFactor] = useState('10');
  const [pipeMaterial, setPipeMaterial] = useState('steel');
  const [fittings, setFittings] = useState([
    { name: '90° Elbows', count: 4, ld: 30 },
    { name: '45° Elbows', count: 2, ld: 16 },
    { name: 'Gate Valves', count: 6, ld: 8 },
    { name: 'Globe Valves', count: 2, ld: 340 },
    { name: 'Check Valves', count: 1, ld: 100 },
    { name: 'Balancing Valves', count: 1, ld: 60 },
  ]);
  const [result, setResult] = useState(null);

  const handleFittingChange = (index, newCount) => {
    const updated = [...fittings];
    updated[index].count = Math.max(0, newCount);
    setFittings(updated);
  };

  const handleCalculate = () => {
    const res = calcPumpHead({
      flowRate: flow,
      pipeDiameterMm: parseFloat(pipeSize),
      pipeLength: length,
      fluidTemp: parseFloat(temp),
      staticHead: parseFloat(staticHead) || 0,
      equipmentLoss: parseFloat(equipment) || 0,
      safetyFactor: parseFloat(safetyFactor) || 10,
      fittings,
      pipeMaterial,
      isIP: false,
    });
    setResult(res);
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>System Parameters</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Flow Rate (Q)</label>
            <input
              type="number"
              value={flow}
              onChange={(event) => setFlow(event.target.value)}
              placeholder="e.g. 30"
              style={inputStyle}
            />
            <span style={inputUnitStyle}>L/s</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Pipe Diameter</label>
            <input
              type="number"
              value={pipeSize}
              onChange={(event) => setPipeSize(event.target.value)}
              placeholder="e.g. 62.71"
              style={inputStyle}
            />
            <span style={inputUnitStyle}>mm</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Pipe Material</label>
            <div style={chipRowStyle}>
              {[
                { val: 'steel', label: 'Carbon Steel' },
                { val: 'copper', label: 'Copper' },
                { val: 'galv', label: 'Galv. Steel' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setPipeMaterial(opt.val)}
                  style={{
                    ...chipStyle,
                    background: pipeMaterial === opt.val ? '#2563EB' : '#F3F4F6',
                    color: pipeMaterial === opt.val ? '#FFFFFF' : '#111827',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Pipe Length</label>
            <input
              type="number"
              value={length}
              onChange={(event) => setLength(event.target.value)}
              placeholder="e.g. 100"
              style={inputStyle}
            />
            <span style={inputUnitStyle}>m</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Fluid Temperature</label>
            <input
              type="number"
              value={temp}
              onChange={(event) => setTemp(event.target.value)}
              placeholder="e.g. 7"
              style={inputStyle}
            />
            <span style={inputUnitStyle}>°C</span>
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Head Components</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Static Head</label>
            <input
              type="number"
              value={staticHead}
              onChange={(event) => setStaticHead(event.target.value)}
              placeholder="e.g. 10"
              style={inputStyle}
            />
            <span style={inputUnitStyle}>m</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Equipment Losses</label>
            <input
              type="number"
              value={equipment}
              onChange={(event) => setEquipment(event.target.value)}
              placeholder="e.g. 5"
              style={inputStyle}
            />
            <span style={inputUnitStyle}>m w.g.</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Safety Factor</label>
            <input
              type="number"
              value={safetyFactor}
              onChange={(event) => setSafetyFactor(event.target.value)}
              placeholder="e.g. 10"
              style={inputStyle}
            />
            <span style={inputUnitStyle}>%</span>
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #E5E7EB' }}>
            <label style={labelStyle}>Fittings & Valves</label>
            {fittings.map((fitting, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F0F0F0' }}>
                <div style={{ color: '#111827', fontSize: '0.9rem' }}>{fitting.name}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    style={{
                      border: '1px solid #E5E7EB',
                      background: '#FFF',
                      borderRadius: 6,
                      width: 24,
                      height: 24,
                      cursor: 'pointer',
                      color: '#666',
                    }}
                    onClick={() => handleFittingChange(idx, fitting.count - 1)}
                  >
                    −
                  </button>
                  <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 600 }}>{fitting.count}</span>
                  <button
                    style={{
                      border: '1px solid #E5E7EB',
                      background: '#FFF',
                      borderRadius: 6,
                      width: 24,
                      height: 24,
                      cursor: 'pointer',
                      color: '#666',
                    }}
                    onClick={() => handleFittingChange(idx, fitting.count + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, marginTop: 16 }} type="button" onClick={handleCalculate}>
          ⚡ Calculate Pump Duty
        </button>
      </div>

      {result && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelAccentStyle} />
              <div style={panelTitleStyle}>Pump Duty Point</div>
            </div>
            <div style={{ ...panelBodyStyle, display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 20, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.9rem', color: '#6B7280', marginBottom: 4 }}>Flow</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{parseFloat(flow).toFixed(1)}</div>
                <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>L/s</div>
              </div>
              <div style={{ width: 1, height: 60, background: '#E5E7EB' }} />
              <div>
                <div style={{ fontSize: '0.9rem', color: '#6B7280', marginBottom: 4 }}>Head</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563EB' }}>{result.totalHead.toFixed(1)}</div>
                <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>m w.g.</div>
              </div>
            </div>
          </div>

          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelAccentStyle} />
              <div style={panelTitleStyle}>Head Breakdown</div>
            </div>
            <div style={panelBodyStyle}>
              <ResultRow label="Pipe Friction Loss" value={`${result.pipeHead.toFixed(2)} m`} />
              <ResultRow label="Fitting Losses" value={`${result.fittingHead.toFixed(2)} m`} />
              <ResultRow label="Static Head" value={`${result.staticHead.toFixed(2)} m`} />
              <ResultRow label="Equipment Losses" value={`${result.equipmentHead.toFixed(2)} m`} />
              <ResultRow label="Sub-total" value={`${result.subtotal.toFixed(2)} m`} />
              <div style={{ ...resultRowStyle, fontWeight: 700, color: '#2563EB' }}>
                <div>Total System Head (with SF)</div>
                <div>{`${result.totalHead.toFixed(2)} m`}</div>
              </div>
              {result.warnings.length > 0 && (
                <div style={resultSummaryStyle}>
                  {result.warnings.map((w, i) => (
                    <div key={i} style={{ marginBottom: i < result.warnings.length - 1 ? 8 : 0 }}>
                      ⚠ {w}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CoolingCoilPage() {
  const [edb, setEdb] = useState('80');
  const [ewb, setEwb] = useState('67');
  const [ldb, setLdb] = useState('55');
  const [lwb, setLwb] = useState('54');
  const [cfm, setCfm] = useState('4000');
  const [result, setResult] = useState(null);

  const enthalpyBTU = (tdbF, twbF) => {
    const tdbC = (tdbF - 32) * 5 / 9;
    const twbC = (twbF - 32) * 5 / 9;
    const wsWB = 0.621945 * satP(twbC + 273.15) / (101325 - satP(twbC + 273.15));
    const w = ((2501 - 2.381 * twbC) * wsWB - 1.006 * (tdbC - twbC)) / (2501 + 1.805 * tdbC - 4.186 * twbC);
    return 1.006 * tdbC + Math.max(0, w) * (2501 + 1.805 * tdbC);
  };

  const calculate = () => {
    const edbN = parseFloat(edb);
    const ewbN = parseFloat(ewb);
    const ldbN = parseFloat(ldb);
    const lwbN = parseFloat(lwb);
    const cfmN = parseFloat(cfm);
    if ([edbN, ewbN, ldbN, lwbN, cfmN].some((v) => Number.isNaN(v))) {
      setResult(null);
      return;
    }
    const h1 = enthalpyBTU(edbN, ewbN);
    const h2 = enthalpyBTU(ldbN, lwbN);
    const totalBTU = H_FACTOR * cfmN * (h1 - h2);
    const sensBTU = SHF * cfmN * (edbN - ldbN);
    const latBTU = Math.max(0, totalBTU - sensBTU);
    const shr = totalBTU > 0 ? sensBTU / totalBTU : 1;
    const totalTR = totalBTU / 12000;
    const adpApprox = ldbN - 1.5;
    const bfCalc = Math.max(0.02, Math.min(0.25, (ldbN - adpApprox) / Math.max(1, edbN - adpApprox)));
    const warnings = [];
    if (shr < 0.65) warnings.push('Low SHR. Verify entering wet bulb temperature.');
    if (ldbN >= edbN) warnings.push('Leaving DBT must be lower than entering DBT.');
    if (lwbN > ldbN - 0.5) warnings.push('Leaving WBT close to leaving DBT. Coil likely near saturation.');
    setResult({ totalBTU, sensBTU, latBTU, shr, totalTR, adpApprox, bfCalc, warnings });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Entering Air Conditions</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Entering dry bulb</label>
            <input type="number" value={edb} onChange={(e) => setEdb(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>°F</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Entering wet bulb</label>
            <input type="number" value={ewb} onChange={(e) => setEwb(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>°F</span>
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Leaving Air Conditions</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Leaving dry bulb</label>
            <input type="number" value={ldb} onChange={(e) => setLdb(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>°F</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Leaving wet bulb</label>
            <input type="number" value={lwb} onChange={(e) => setLwb(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>°F</span>
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Airflow</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Supply airflow</label>
            <input type="number" value={cfm} onChange={(e) => setCfm(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>CFM</span>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Calculate Coil Performance
        </button>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelAccentStyle} />
            <div style={panelTitleStyle}>Results</div>
          </div>
          <div style={panelBodyStyle}>
            {result ? (
              <>
                <ResultRow label="Total coil load" value={`${result.totalBTU.toFixed(0)} BTU/hr (${result.totalTR.toFixed(1)} TR)`} />
                <ResultRow label="Sensible load" value={`${result.sensBTU.toFixed(0)} BTU/hr`} />
                <ResultRow label="Latent load" value={`${result.latBTU.toFixed(0)} BTU/hr`} />
                <ResultRow label="SHR" value={result.shr.toFixed(3)} />
                <ResultRow label="Approx. ADP" value={`${result.adpApprox.toFixed(1)} °F`} />
                <ResultRow label="Bypass factor" value={result.bfCalc.toFixed(3)} />
                <ResultRow label="Cooling in TR" value={`${result.totalTR.toFixed(1)} TR`} />
                {result.warnings.length > 0 && (
                  <div style={resultSummaryStyle}>
                    {result.warnings.map((w, idx) => (
                      <div key={idx} style={{ marginBottom: idx < result.warnings.length - 1 ? 8 : 0 }}>
                        ⚠ {w}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: '#6B7280' }}>Enter coil conditions and calculate to see estimated performance.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FanPowerPage() {
  const [cfm, setCfm] = useState('10000');
  const [esp, setEsp] = useState('2.0');
  const [fanEff, setFanEff] = useState('70');
  const [motEff, setMotEff] = useState('90');
  const [drvEff, setDrvEff] = useState('97');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const cfmN = parseFloat(cfm);
    const espN = parseFloat(esp);
    const fanEffN = parseFloat(fanEff) / 100;
    const motEffN = parseFloat(motEff) / 100;
    const drvEffN = parseFloat(drvEff) / 100;
    if ([cfmN, espN, fanEffN, motEffN, drvEffN].some((v) => Number.isNaN(v) || v <= 0)) {
      setResult(null);
      return;
    }
    const airHP = (cfmN * espN) / 6356;
    const shaftHP = airHP / fanEffN;
    const motorHP = shaftHP / (motEffN * drvEffN);
    const airKW = airHP * 0.7457;
    const shaftKW = shaftHP * 0.7457;
    const motorKW = motorHP * 0.7457;
    const overallEff = (airHP / motorHP) * 100;
    const standardHP = FAN_STD_HP.find((h) => h >= motorHP * 1.1) || FAN_STD_HP[FAN_STD_HP.length - 1];
    const warnings = [];
    if (fanEffN < 0.55) warnings.push('Low fan efficiency. High-efficiency fans are typically 65–80%.');
    if (overallEff < 40) warnings.push('Overall system efficiency is low. Verify fan selection and drives.');
    if (espN > 4) warnings.push('Static pressure is high for comfort HVAC. Review duct design.');
    setResult({ airKW, shaftKW, motorKW, airHP, shaftHP, motorHP, overallEff, standardHP, warnings });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Airflow (Q)</label>
            <input type="number" value={cfm} onChange={(e) => setCfm(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>CFM</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Total static pressure</label>
            <input type="number" value={esp} onChange={(e) => setEsp(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>in w.g.</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Fan efficiency</label>
            <input type="number" value={fanEff} onChange={(e) => setFanEff(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>%</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Motor efficiency</label>
            <input type="number" value={motEff} onChange={(e) => setMotEff(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>%</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Drive efficiency</label>
            <input type="number" value={drvEff} onChange={(e) => setDrvEff(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>%</span>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Calculate Fan Power
        </button>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelAccentStyle} />
            <div style={panelTitleStyle}>Results</div>
          </div>
          <div style={panelBodyStyle}>
            {result ? (
              <>
                <ResultRow label="Air (fluid) power" value={`${result.airKW.toFixed(2)} kW (${result.airHP.toFixed(2)} HP)`} />
                <ResultRow label="Fan shaft power" value={`${result.shaftKW.toFixed(2)} kW (${result.shaftHP.toFixed(2)} HP)`} />
                <ResultRow label="Motor input power" value={`${result.motorKW.toFixed(2)} kW (${result.motorHP.toFixed(2)} HP)`} />
                <ResultRow label="Suggested motor size" value={`${result.standardHP} HP (${(result.standardHP * 0.7457).toFixed(1)} kW)`} />
                <ResultRow label="Overall efficiency" value={`${result.overallEff.toFixed(1)}%`} />
                {result.warnings.length > 0 && (
                  <div style={resultSummaryStyle}>
                    {result.warnings.map((w, idx) => (
                      <div key={idx} style={{ marginBottom: idx < result.warnings.length - 1 ? 8 : 0 }}>
                        ⚠ {w}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: '#6B7280' }}>Enter values and calculate to see fan power results.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FanLawsPage() {
  const [q1, setQ1] = useState('10000');
  const [p1, setP1] = useState('2.0');
  const [w1, setW1] = useState('5.5');
  const [speed, setSpeed] = useState('80');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const q1N = parseFloat(q1);
    const p1N = parseFloat(p1);
    const w1N = parseFloat(w1);
    const speedN = parseFloat(speed) / 100;
    if ([q1N, p1N, w1N, speedN].some((v) => Number.isNaN(v))) {
      setResult(null);
      return;
    }
    const q2 = q1N * speedN;
    const p2 = p1N * speedN * speedN;
    const w2 = w1N * speedN * speedN * speedN;
    const saving = w1N - w2;
    const savePct = (saving / w1N) * 100;
    const warnings = [];
    if (speedN < 0.4) warnings.push('Speed below 40% may cause fan stall or unstable operation.');
    if (speedN > 1.0) warnings.push('Over-speed operation. Verify fan and motor rating.');
    setResult({ q2, p2, w2, saving, savePct, warnings, speedN });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Original Operating Point</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Original airflow</label>
            <input type="number" value={q1} onChange={(e) => setQ1(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>CFM</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Original pressure</label>
            <input type="number" value={p1} onChange={(e) => setP1(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>in w.g.</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Original power</label>
            <input type="number" value={w1} onChange={(e) => setW1(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>kW</span>
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>New Speed</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>New speed</label>
            <input type="number" value={speed} onChange={(e) => setSpeed(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>%</span>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Apply Fan Laws
        </button>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelAccentStyle} />
            <div style={panelTitleStyle}>Results</div>
          </div>
          <div style={panelBodyStyle}>
            {result ? (
              <>
                <ResultRow label="Speed ratio" value={`${(result.speedN * 100).toFixed(0)}%`} />
                <ResultRow label="New airflow" value={`${result.q2.toFixed(0)} CFM`} />
                <ResultRow label="New pressure" value={`${result.p2.toFixed(3)} in w.g.`} />
                <ResultRow label="New power" value={`${result.w2.toFixed(3)} kW`} />
                <ResultRow label="Power saved" value={`${result.saving.toFixed(3)} kW`} />
                <ResultRow label="Power reduction" value={`${result.savePct.toFixed(1)}%`} />
                {result.warnings.length > 0 && (
                  <div style={resultSummaryStyle}>
                    {result.warnings.map((w, idx) => (
                      <div key={idx} style={{ marginBottom: idx < result.warnings.length - 1 ? 8 : 0 }}>
                        ⚠ {w}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: '#6B7280' }}>Enter values and calculate to see fan law results.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FreshAirPage() {
  const [space, setSpace] = useState('5,0.06');
  const [area, setArea] = useState('2000');
  const [occ, setOcc] = useState('40');
  const [zones, setZones] = useState('1');
  const [ez, setEz] = useState('1.0');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const [rp, ra] = space.split(',').map(parseFloat);
    const areaN = parseFloat(area);
    const occN = parseFloat(occ);
    const zonesN = parseFloat(zones);
    const ezN = parseFloat(ez);
    if ([rp, ra, areaN, occN, zonesN, ezN].some((v) => Number.isNaN(v) || zonesN <= 0 || ezN <= 0)) {
      setResult(null);
      return;
    }
    const peopleCFM = rp * occN;
    const areaCFM = ra * areaN;
    const vbz = peopleCFM + areaCFM;
    const vz = vbz / ezN;
    const perPerson = occN > 0 ? vz / occN : 0;
    const perArea = areaN > 0 ? vz / areaN : 0;
    const warnings = ['ASHRAE 62.1 values are minimum outdoor air requirements.'];
    if (occN > 0 && peopleCFM / vbz > 0.8) warnings.push('Occupant component dominates ventilation. Verify occupancy assumptions.');
    setResult({ peopleCFM, areaCFM, vz, perPerson, perArea, warnings });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Space Details</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Space type</label>
            <select value={space} onChange={(e) => setSpace(e.target.value)} style={inputStyle}>
              <option value="5,0.06">Office - Open Plan</option>
              <option value="5,0.06">Conference Room</option>
              <option value="10,0.12">Classroom</option>
              <option value="7.5,0.12">Retail</option>
              <option value="7.5,0.18">Dining Area</option>
              <option value="20,0.06">Gym / Fitness</option>
              <option value="7.5,0.06">Lobby</option>
              <option value="0,0.06">Corridor / Storage</option>
              <option value="25,0.06">Hospital - Patient Room</option>
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Floor area</label>
            <input type="number" value={area} onChange={(e) => setArea(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>ft²</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Design occupancy</label>
            <input type="number" value={occ} onChange={(e) => setOcc(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>people</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Number of zones / AHUs</label>
            <input type="number" value={zones} onChange={(e) => setZones(e.target.value)} style={inputStyle} min="1" />
            <span style={inputUnitStyle}>zones</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Zone air distribution effectiveness</label>
            <select value={ez} onChange={(e) => setEz(e.target.value)} style={inputStyle}>
              <option value="1.0">1.0 - Ceiling supply / ceiling return</option>
              <option value="1.2">1.2 - Ceiling supply / floor return</option>
              <option value="0.8">0.8 - Floor supply / ceiling return</option>
              <option value="0.7">0.7 - Ceiling supply within 4.5ft of floor</option>
            </select>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Calculate Fresh Air
        </button>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelAccentStyle} />
            <div style={panelTitleStyle}>Results</div>
          </div>
          <div style={panelBodyStyle}>
            {result ? (
              <>
                <ResultRow label="People component" value={`${result.peopleCFM.toFixed(0)} CFM`} />
                <ResultRow label="Area component" value={`${result.areaCFM.toFixed(0)} CFM`} />
                <ResultRow label="Breathing zone OA rate" value={`${result.vbz.toFixed(0)} CFM`} />
                <ResultRow label="Zone ventilation rate" value={`${result.vz.toFixed(0)} CFM`} />
                <ResultRow label="Per person" value={`${result.perPerson.toFixed(1)} CFM/person`} />
                <ResultRow label="Per area" value={`${result.perArea.toFixed(3)} CFM/ft²`} />
                {result.warnings.length > 0 && (
                  <div style={resultSummaryStyle}>
                    {result.warnings.map((w, idx) => (
                      <div key={idx} style={{ marginBottom: idx < result.warnings.length - 1 ? 8 : 0 }}>
                        ⚠ {w}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: '#6B7280' }}>Enter the space data and calculate to see fresh air requirements.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AhuSatPage() {
  const [mode, setMode] = useState('sat');
  const [load, setLoad] = useState('60000');
  const [roomTemp, setRoomTemp] = useState('75');
  const [cfm, setCfm] = useState('5000');
  const [sat, setSat] = useState('55');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const loadN = parseFloat(load);
    const roomN = parseFloat(roomTemp);
    if (Number.isNaN(loadN) || Number.isNaN(roomN)) {
      setResult(null);
      return;
    }
    if (mode === 'sat') {
      const cfmN = parseFloat(cfm);
      if (Number.isNaN(cfmN) || cfmN <= 0) {
        setResult(null);
        return;
      }
      const satN = roomN - loadN / (SHF * cfmN);
      const dt = roomN - satN;
      const checkTR = (SHF * cfmN * dt) / 12000;
      const warnings = [];
      if (satN > 60) warnings.push('SAT above 60°F. Cooling may be marginal.');
      if (satN < 48) warnings.push('SAT below 48°F. Consider freeze protection or reheat.');
      setResult({ label: 'Required SAT', value: `${satN.toFixed(1)} °F`, dt: `${dt.toFixed(1)} °F`, check: `${checkTR.toFixed(2)} TR`, formula: 'SAT = T_room − Q / (1.1 × CFM)', warnings });
    } else {
      const satN = parseFloat(sat);
      if (Number.isNaN(satN)) {
        setResult(null);
        return;
      }
      const dt = roomN - satN;
      if (dt <= 0) {
        setResult({ label: 'Required Airflow', value: 'Invalid ΔT', dt: '-', check: '-', formula: 'CFM = Q / (1.1 × ΔT)', warnings: ['Supply air must be colder than room air.'] });
        return;
      }
      const cfmN = loadN / (SHF * dt);
      const checkTR = (SHF * cfmN * dt) / 12000;
      const warnings = [];
      setResult({ label: 'Required Airflow', value: `${cfmN.toFixed(0)} CFM`, dt: `${dt.toFixed(1)} °F`, check: `${checkTR.toFixed(2)} TR`, formula: 'CFM = Q / (1.1 × ΔT)', warnings });
    }
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Known Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Solve for</label>
            <div style={chipRowStyle}>
              <button type="button" onClick={() => setMode('sat')} style={{ ...chipStyle, background: mode === 'sat' ? '#2563EB' : '#F3F4F6', color: mode === 'sat' ? '#FFFFFF' : '#111827' }}>
                Supply Air Temp (SAT)
              </button>
              <button type="button" onClick={() => setMode('cfm')} style={{ ...chipStyle, background: mode === 'cfm' ? '#2563EB' : '#F3F4F6', color: mode === 'cfm' ? '#FFFFFF' : '#111827' }}>
                Required Airflow (CFM)
              </button>
            </div>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Room sensible load</label>
            <input type="number" value={load} onChange={(e) => setLoad(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>BTU/hr</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Room setpoint temperature</label>
            <input type="number" value={roomTemp} onChange={(e) => setRoomTemp(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>°F</span>
          </div>
          {mode === 'sat' ? (
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Supply airflow</label>
              <input type="number" value={cfm} onChange={(e) => setCfm(e.target.value)} style={inputStyle} />
              <span style={inputUnitStyle}>CFM</span>
            </div>
          ) : (
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Target SAT</label>
              <input type="number" value={sat} onChange={(e) => setSat(e.target.value)} style={inputStyle} />
              <span style={inputUnitStyle}>°F</span>
            </div>
          )}
        </div>
        <button style={{ ...calculateButtonStyle, marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Calculate
        </button>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelAccentStyle} />
            <div style={panelTitleStyle}>Result</div>
          </div>
          <div style={panelBodyStyle}>
            {result ? (
              <>
                <ResultRow label={result.label} value={result.value} />
                <ResultRow label="Temperature difference (ΔT)" value={result.dt} />
                <ResultRow label="Sensible capacity check" value={result.check} />
                <ResultRow label="Formula used" value={result.formula} />
                {result.warnings && result.warnings.length > 0 && (
                  <div style={resultSummaryStyle}>
                    {result.warnings.map((w, idx) => (
                      <div key={idx} style={{ marginBottom: idx < result.warnings.length - 1 ? 8 : 0 }}>
                        ⚠ {w}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: '#6B7280' }}>Enter values and calculate to see AHU supply air results.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HvacPipePage() {
  const [flow, setFlow] = useState('80');
  const [fluidType, setFluidType] = useState('chw');
  const [temp, setTemp] = useState('44');
  const [pipeRoughness, setPipeRoughness] = useState('0.000046');
  const [targetDp, setTargetDp] = useState('4.0');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const flowN = parseFloat(flow);
    const tempN = parseFloat(temp);
    const dpN = parseFloat(targetDp);
    const roughnessN = parseFloat(pipeRoughness);
    if ([flowN, tempN, dpN, roughnessN].some((v) => Number.isNaN(v))) {
      setResult(null);
      return;
    }
    const res = calcHvacPipeSize({
      flowRate: flowN,
      targetDp: dpN,
      fluidType,
      fluidTemp: tempN,
      pipeRoughness: roughnessN,
      isIP: true,
    });
    setResult(res);
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Flow rate</label>
            <input type="number" value={flow} onChange={(e) => setFlow(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>GPM</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Fluid type</label>
            <select value={fluidType} onChange={(e) => setFluidType(e.target.value)} style={inputStyle}>
              <option value="chw">Chilled Water</option>
              <option value="cw">Condenser Water</option>
              <option value="g25">25% Glycol</option>
              <option value="g40">40% Glycol</option>
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Fluid temperature</label>
            <input type="number" value={temp} onChange={(e) => setTemp(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>°F</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Pipe material roughness</label>
            <select value={pipeRoughness} onChange={(e) => setPipeRoughness(e.target.value)} style={inputStyle}>
              <option value="0.000046">Carbon Steel</option>
              <option value="0.0000015">Copper</option>
              <option value="0.00015">Galvanized Steel</option>
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Target ΔP</label>
            <input type="number" value={targetDp} onChange={(e) => setTargetDp(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>ft w.g./100ft</span>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Size Pipe
        </button>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelAccentStyle} />
            <div style={panelTitleStyle}>Results</div>
          </div>
          <div style={panelBodyStyle}>
            {result ? (
              <>
                <ResultRow label="Selected pipe size" value={`${result.nps} NPS`} />
                <ResultRow label="Internal diameter" value={`${result.idMm.toFixed(0)} mm`} />
                <ResultRow label="Velocity" value={`${result.velocity.toFixed(2)} m/s`} />
                <ResultRow label="Pressure drop" value={`${result.pressureDrop.toFixed(2)} Pa/m`} />
                <ResultRow label="Reynolds number" value={`${Math.round(result.reynolds).toLocaleString()}`} />
                <ResultRow label="Flow regime" value={result.regime} />
                {result.warnings.length > 0 && (
                  <div style={resultSummaryStyle}>
                    {result.warnings.map((w, idx) => (
                      <div key={idx} style={{ marginBottom: idx < result.warnings.length - 1 ? 8 : 0 }}>
                        ⚠ {w}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: '#6B7280' }}>Enter pipe sizing inputs and calculate to see the recommended size.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function VentilationPage() {
  const [mode, setMode] = useState('ashrae');
  const [space, setSpace] = useState('5,0.06');
  const [area, setArea] = useState('2000');
  const [height, setHeight] = useState('10');
  const [occ, setOcc] = useState('40');
  const [ach, setAch] = useState('6');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const areaN = parseFloat(area);
    const heightN = parseFloat(height);
    const occN = parseFloat(occ);
    const achN = parseFloat(ach);
    if ([areaN, heightN].some((v) => Number.isNaN(v) || v <= 0)) {
      setResult(null);
      return;
    }
    if (mode === 'ashrae') {
      const [rp, ra] = space.split(',').map(parseFloat);
      if ([rp, ra, occN].some((v) => Number.isNaN(v))) {
        setResult(null);
        return;
      }
      const peopleCFM = rp * occN;
      const areaCFM = ra * areaN;
      const vbz = peopleCFM + areaCFM;
      const warnings = [];
      if (occN > 0 && peopleCFM / vbz > 0.8) warnings.push('Occupant component dominates ventilation.');
      setResult({
        title: 'ASHRAE 62.1 Result', details: [
          { label: 'People component', value: `${peopleCFM.toFixed(0)} CFM` },
          { label: 'Area component', value: `${areaCFM.toFixed(0)} CFM` },
          { label: 'Breathing zone OA rate', value: `${vbz.toFixed(0)} CFM` },
        ], warnings
      });
    } else {
      if (Number.isNaN(achN) || achN <= 0) {
        setResult(null);
        return;
      }
      const volume = areaN * heightN;
      const flow = (volume * achN) / 60;
      const warnings = [];
      if (achN > 10) warnings.push('High ACH. Verify application and comfort conditions.');
      setResult({
        title: 'ACH Method Result', details: [
          { label: 'Space volume', value: `${volume.toFixed(0)} ft³` },
          { label: 'Target ACH', value: `${achN.toFixed(1)} ACH` },
          { label: 'Required outdoor air', value: `${flow.toFixed(0)} CFM` },
        ], warnings
      });
    }
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Method</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={chipRowStyle}>
            <button type="button" onClick={() => setMode('ashrae')} style={{ ...chipStyle, background: mode === 'ashrae' ? '#2563EB' : '#F3F4F6', color: mode === 'ashrae' ? '#FFFFFF' : '#111827' }}>
              ASHRAE 62.1
            </button>
            <button type="button" onClick={() => setMode('ach')} style={{ ...chipStyle, background: mode === 'ach' ? '#2563EB' : '#F3F4F6', color: mode === 'ach' ? '#FFFFFF' : '#111827' }}>
              ACH Method
            </button>
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Floor area</label>
            <input type="number" value={area} onChange={(e) => setArea(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>ft²</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Ceiling height</label>
            <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>ft</span>
          </div>
          {mode === 'ashrae' ? (
            <>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Space type</label>
                <select value={space} onChange={(e) => setSpace(e.target.value)} style={inputStyle}>
                  <option value="5,0.06">Office - Open Plan</option>
                  <option value="5,0.06">Conference Room</option>
                  <option value="10,0.12">Classroom</option>
                  <option value="7.5,0.12">Retail</option>
                  <option value="7.5,0.18">Dining Area</option>
                  <option value="20,0.06">Gym / Fitness</option>
                  <option value="7.5,0.06">Lobby</option>
                  <option value="0,0.06">Corridor</option>
                </select>
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Occupant count</label>
                <input type="number" value={occ} onChange={(e) => setOcc(e.target.value)} style={inputStyle} />
              </div>
            </>
          ) : (
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Target ACH</label>
              <input type="number" value={ach} onChange={(e) => setAch(e.target.value)} style={inputStyle} />
            </div>
          )}
        </div>
        <button style={{ ...calculateButtonStyle, marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Calculate Ventilation
        </button>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelAccentStyle} />
            <div style={panelTitleStyle}>{result?.title || 'Result'}</div>
          </div>
          <div style={panelBodyStyle}>
            {result ? (
              <>
                {result.details.map((item, idx) => (
                  <ResultRow key={idx} label={item.label} value={item.value} />
                ))}
                {result.warnings.length > 0 && (
                  <div style={resultSummaryStyle}>
                    {result.warnings.map((w, idx) => (
                      <div key={idx} style={{ marginBottom: idx < result.warnings.length - 1 ? 8 : 0 }}>
                        ⚠ {w}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: '#6B7280' }}>Enter inputs and calculate to see ventilation requirements.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RefrigerantPipePage() {
  const [capacity, setCapacity] = useState('20');
  const [refrigerant, setRefrigerant] = useState('R410A');
  const [lineType, setLineType] = useState('suction');
  const [result, setResult] = useState(null);

  const REF_PIPE_DATA = {
    suction: {
      R410A: { ranges: [[0, 3, '12.7'], [3, 6, '15.88'], [6, 12, '19.05'], [12, 20, '22.22'], [20, 35, '28.58'], [35, 60, '34.93'], [60, 100, '41.28']], vel: '12–20 m/s (2400–4000 FPM)' },
      R22: { ranges: [[0, 3, '12.7'], [3, 7, '15.88'], [7, 15, '19.05'], [15, 25, '22.22'], [25, 45, '28.58'], [45, 80, '34.93']], vel: '10–18 m/s' },
      R32: { ranges: [[0, 3, '12.7'], [3, 6, '15.88'], [6, 12, '19.05'], [12, 22, '22.22'], [22, 40, '28.58']], vel: '12–20 m/s' },
      R134a: { ranges: [[0, 3, '15.88'], [3, 7, '19.05'], [7, 15, '22.22'], [15, 30, '28.58'], [30, 55, '34.93']], vel: '8–15 m/s' },
      R407C: { ranges: [[0, 3, '12.7'], [3, 7, '15.88'], [7, 14, '19.05'], [14, 24, '22.22'], [24, 40, '28.58']], vel: '10–18 m/s' },
    },
    liquid: {
      R410A: { ranges: [[0, 5, '9.52'], [5, 12, '12.7'], [12, 25, '15.88'], [25, 50, '19.05'], [50, 100, '22.22']], vel: '0.5–1.5 m/s (100–300 FPM)' },
      R22: { ranges: [[0, 6, '9.52'], [6, 14, '12.7'], [14, 30, '15.88'], [30, 60, '19.05']], vel: '0.5–1.2 m/s' },
      R32: { ranges: [[0, 5, '9.52'], [5, 12, '12.7'], [12, 25, '15.88'], [25, 50, '19.05']], vel: '0.5–1.5 m/s' },
      R134a: { ranges: [[0, 7, '9.52'], [7, 15, '12.7'], [15, 30, '15.88'], [30, 60, '19.05']], vel: '0.5–1.2 m/s' },
      R407C: { ranges: [[0, 6, '9.52'], [6, 14, '12.7'], [14, 28, '15.88'], [28, 55, '19.05']], vel: '0.5–1.2 m/s' },
    },
    discharge: {
      R410A: { ranges: [[0, 3, '9.52'], [3, 6, '12.7'], [6, 12, '15.88'], [12, 22, '19.05'], [22, 40, '22.22'], [40, 70, '28.58']], vel: '12–20 m/s (discharge runs hot)' },
      R22: { ranges: [[0, 4, '9.52'], [4, 8, '12.7'], [8, 16, '15.88'], [16, 30, '19.05'], [30, 55, '22.22']], vel: '10–18 m/s' },
      R32: { ranges: [[0, 3, '9.52'], [3, 6, '12.7'], [6, 12, '15.88'], [12, 22, '19.05'], [22, 40, '22.22']], vel: '12–20 m/s' },
      R134a: { ranges: [[0, 4, '9.52'], [4, 9, '12.7'], [9, 18, '15.88'], [18, 36, '19.05']], vel: '8–16 m/s' },
      R407C: { ranges: [[0, 4, '9.52'], [4, 8, '12.7'], [8, 16, '15.88'], [16, 30, '19.05'], [30, 55, '22.22']], vel: '10–18 m/s' },
    },
  };

  const calculate = () => {
    const trN = parseFloat(capacity);
    if (Number.isNaN(trN)) {
      setResult(null);
      return;
    }
    const lineData = REF_PIPE_DATA[lineType][refrigerant];
    if (!lineData) {
      setResult({ message: 'No data for selected refrigerant/line.', od: null, vel: null });
      return;
    }
    let od = 'Consult manufacturer for larger size';
    for (const range of lineData.ranges) {
      if (trN >= range[0] && trN < range[1]) {
        od = `${range[2]} mm OD`;
        break;
      }
    }
    setResult({ od, vel: lineData.vel, description: `${lineType.charAt(0).toUpperCase() + lineType.slice(1)} line ${refrigerant}` });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Refrigerant Line Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>System capacity</label>
            <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>TR</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Refrigerant</label>
            <select value={refrigerant} onChange={(e) => setRefrigerant(e.target.value)} style={inputStyle}>
              <option value="R410A">R410A</option>
              <option value="R22">R22</option>
              <option value="R32">R32</option>
              <option value="R134a">R134a</option>
              <option value="R407C">R407C</option>
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Line type</label>
            <div style={chipRowStyle}>
              {['suction', 'liquid', 'discharge'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setLineType(type)}
                  style={{
                    ...chipStyle,
                    background: lineType === type ? '#2563EB' : '#F3F4F6',
                    color: lineType === type ? '#FFFFFF' : '#111827',
                  }}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Estimate Pipe Size
        </button>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelAccentStyle} />
            <div style={panelTitleStyle}>Result</div>
          </div>
          <div style={panelBodyStyle}>
            {result ? (
              result.od ? (
                <>
                  <ResultRow label="Line" value={result.description} />
                  <ResultRow label="Recommended OD" value={result.od} />
                  <ResultRow label="Target velocity" value={result.vel} />
                  <p style={{ color: '#6B7280', marginTop: 12 }}>
                    These values are estimation only. Confirm with manufacturer pressure drop charts and refrigerant-specific requirements.
                  </p>
                </>
              ) : (
                <p style={{ color: '#EF4444' }}>{result.message}</p>
              )
            ) : (
              <p style={{ color: '#6B7280' }}>Enter the line data and click calculate to show a recommended refrigerant tube size.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CondensateDrainPage() {
  const [mode, setMode] = useState('tr');
  const [tr, setTr] = useState('10');
  const [latent, setLatent] = useState('36000');
  const [length, setLength] = useState('10');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const trN = parseFloat(tr);
    const latentN = parseFloat(latent);
    const lengthN = parseFloat(length);
    if (Number.isNaN(lengthN) || lengthN <= 0) {
      setResult(null);
      return;
    }
    const latBTU = mode === 'tr' ? (Number.isNaN(trN) ? NaN : trN * 12000 * 0.3) : latentN;
    if (Number.isNaN(latBTU)) {
      setResult(null);
      return;
    }
    const galPerHr = latBTU / 1075 / 8.34;
    const galPerDay = galPerHr * 24;
    const lPerDay = galPerDay * 3.78541;
    let pipeSize = '1½" (38mm) or larger';
    if (galPerHr < 5) pipeSize = '¾" (19mm) min';
    else if (galPerHr < 20) pipeSize = '1" (25mm)';
    else if (galPerHr < 50) pipeSize = '1¼" (32mm)';
    const slopePerM = 20.8;
    const totalDropMm = slopePerM * lengthN;
    setResult({ galPerHr, galPerDay, lPerDay, pipeSize, totalDropMm, lengthN });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Condensate Input</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Mode</label>
            <div style={chipRowStyle}>
              <button
                type="button"
                onClick={() => setMode('tr')}
                style={{
                  ...chipStyle,
                  background: mode === 'tr' ? '#2563EB' : '#F3F4F6',
                  color: mode === 'tr' ? '#FFFFFF' : '#111827',
                }}
              >
                By TR
              </button>
              <button
                type="button"
                onClick={() => setMode('lat')}
                style={{
                  ...chipStyle,
                  background: mode === 'lat' ? '#2563EB' : '#F3F4F6',
                  color: mode === 'lat' ? '#FFFFFF' : '#111827',
                }}
              >
                By latent BTU/hr
              </button>
            </div>
          </div>
          {mode === 'tr' ? (
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Cooling capacity</label>
              <input type="number" value={tr} onChange={(e) => setTr(e.target.value)} style={inputStyle} />
              <span style={inputUnitStyle}>TR</span>
            </div>
          ) : (
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Latent load</label>
              <input type="number" value={latent} onChange={(e) => setLatent(e.target.value)} style={inputStyle} />
              <span style={inputUnitStyle}>BTU/hr</span>
            </div>
          )}
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Drain run length</label>
            <input type="number" value={length} onChange={(e) => setLength(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>m</span>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Estimate Condensate Drain
        </button>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelAccentStyle} />
            <div style={panelTitleStyle}>Results</div>
          </div>
          <div style={panelBodyStyle}>
            {result ? (
              <>
                <ResultRow label="Condensate flow" value={`${result.galPerHr.toFixed(2)} gal/hr (${(result.lPerDay / 24).toFixed(2)} L/min)`} />
                <ResultRow label="Daily condensate" value={`${result.galPerDay.toFixed(1)} gal/day (${result.lPerDay.toFixed(1)} L/day)`} />
                <ResultRow label="Recommended pipe" value={result.pipeSize} />
                <ResultRow label="Minimum slope" value="1/4 in per foot (20.8 mm/m)" />
                <ResultRow label="Estimated drop" value={`${result.totalDropMm.toFixed(0)} mm over ${result.lengthN.toFixed(0)} m`} />
                <p style={{ color: '#6B7280', marginTop: 12 }}>
                  These are guideline estimates for light-commercial condensate drains. Always review actual field conditions and code requirements.
                </p>
              </>
            ) : (
              <p style={{ color: '#6B7280' }}>Enter condensate load data and calculate to see drain sizing guidance.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SanityCheckPage() {
  const [ductVelFPM, setDuctVelFPM] = useState('1400');
  const [ductFR, setDuctFR] = useState('0.08');
  const [esp, setEsp] = useState('1.2');
  const [pipeVelFPS, setPipeVelFPS] = useState('4');
  const [pumpHead, setPumpHead] = useState('35');
  const [cfmtr, setCfmtr] = useState('380');
  const [kwtr, setKwtr] = useState('0.55');
  const [results, setResults] = useState([]);

  const calculate = () => {
    const inputs = [ductVelFPM, ductFR, esp, pipeVelFPS, pumpHead, cfmtr, kwtr].map(parseFloat);
    if (inputs.some((v) => Number.isNaN(v))) {
      setResults([]);
      return;
    }
    const check = (label, val, unit, low, lowWarn, ok1, ok2, high, highWarn, goodRange) => {
      let status;
      if (val < low) status = 'Too Low';
      else if (val < lowWarn) status = 'Low';
      else if (val <= ok2) status = 'Good';
      else if (val <= high) status = 'High';
      else status = 'Too High';
      return { label, value: `${val.toFixed(val < 10 ? 2 : 0)} ${unit}`, status, goodRange };
    };
    const res = [
      check('Supply duct velocity', inputs[0], 'FPM', 100, 500, 800, 2000, 2500, 2800, '800–2000 FPM'),
      check('Duct friction rate', inputs[1], 'in/100ft', 0.02, 0.05, 0.06, 0.1, 0.15, 0.2, '0.06–0.10 in/100ft'),
      check('Total ESP (fan)', inputs[2], 'in w.g.', 0.2, 0.5, 0.8, 2.5, 3.5, 5.0, '0.8–2.5 in w.g.'),
      check('CHW pipe velocity', inputs[3], 'fps', 0.5, 1.5, 2.0, 6.0, 8.0, 12.0, '2–6 fps'),
      check('Pump total head', inputs[4], 'ft', 10, 20, 25, 100, 120, 200, '25–100 ft'),
      check('Airflow per TR', inputs[5], 'CFM/TR', 200, 300, 350, 450, 500, 600, '350–450 CFM/TR'),
      check('Chiller kW/TR', inputs[6], 'kW/TR', 0.25, 0.4, 0.45, 0.75, 0.9, 1.5, '0.45–0.75 kW/TR'),
    ];
    setResults(res);
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Sanity Check Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          {[
            { label: 'Supply duct velocity', value: ductVelFPM, set: setDuctVelFPM, unit: 'FPM' },
            { label: 'Duct friction rate', value: ductFR, set: setDuctFR, unit: 'in/100ft' },
            { label: 'Total ESP (fan)', value: esp, set: setEsp, unit: 'in w.g.' },
            { label: 'CHW pipe velocity', value: pipeVelFPS, set: setPipeVelFPS, unit: 'fps' },
            { label: 'Pump total head', value: pumpHead, set: setPumpHead, unit: 'ft' },
            { label: 'Airflow per TR', value: cfmtr, set: setCfmtr, unit: 'CFM/TR' },
            { label: 'Chiller kW/TR', value: kwtr, set: setKwtr, unit: 'kW/TR' },
          ].map((item) => (
            <div key={item.label} style={inputGroupStyle}>
              <label style={labelStyle}>{item.label}</label>
              <input type="number" value={item.value} onChange={(e) => item.set(e.target.value)} style={inputStyle} />
              <span style={inputUnitStyle}>{item.unit}</span>
            </div>
          ))}
        </div>
        <button style={{ ...calculateButtonStyle, marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Run Sanity Check
        </button>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelAccentStyle} />
            <div style={panelTitleStyle}>Results</div>
          </div>
          <div style={panelBodyStyle}>
            {results.length > 0 ? (
              results.map((item) => (
                <div key={item.label} style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: '#111827' }}>{item.label}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 6 }}>
                    <span>{item.value}</span>
                    <span style={{ color: item.status === 'Good' ? '#16A34A' : item.status.startsWith('Too') ? '#DC2626' : '#D97706' }}>{item.status}</span>
                  </div>
                  <div style={{ color: '#6B7280', marginTop: 4 }}>{item.goodRange}</div>
                </div>
              ))
            ) : (
              <p style={{ color: '#6B7280' }}>Enter values and calculate to see a quick HVAC design check.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AirMixingPage() {
  const [cfm1, setCfm1] = useState('2000');
  const [rh1, setRh1] = useState('50');
  const [t1, setT1] = useState('75');
  const [cfm2, setCfm2] = useState('1000');
  const [rh2, setRh2] = useState('60');
  const [t2, setT2] = useState('80');
  const [result, setResult] = useState(null);

  const wFromRHF = (tF, rh) => {
    const tC = ((tF - 32) * 5) / 9;
    const pws = Math.exp((17.27 * tC) / (tC + 237.3)) * 0.61078;
    return (0.621945 * pws * (rh / 100)) / (101.325 - pws * (rh / 100));
  };

  const hBTU = (tF, W) => {
    const tC = ((tF - 32) * 5) / 9;
    return (1.006 * tC + W * (2501 + 1.86 * tC)) / 2.326;
  };

  const calculate = () => {
    const values = [cfm1, rh1, t1, cfm2, rh2, t2].map(parseFloat);
    if (values.some((v) => Number.isNaN(v))) {
      setResult(null);
      return;
    }
    const cfm1N = parseFloat(cfm1);
    const cfm2N = parseFloat(cfm2);
    const t1N = parseFloat(t1);
    const t2N = parseFloat(t2);
    const W1 = wFromRHF(t1N, parseFloat(rh1));
    const W2 = wFromRHF(t2N, parseFloat(rh2));
    const h1 = hBTU(t1N, W1);
    const h2 = hBTU(t2N, W2);
    const cfmTot = cfm1N + cfm2N;
    const Wm = (cfm1N * W1 + cfm2N * W2) / cfmTot;
    const hm = (cfm1N * h1 + cfm2N * h2) / cfmTot;
    const tMixF = (cfm1N * t1N + cfm2N * t2N) / cfmTot;
    const tMixC = ((tMixF - 32) * 5) / 9;
    const twbC = tMixC - (hBTU(tMixF, Wm) * 2.326 - 1.006 * tMixC - (2501 + 1.86 * tMixC) * Wm) / (2.326 * 1.5);
    setResult({
      totalCFM: cfmTot,
      outdoorAir: `${((cfm2N / cfmTot) * 100).toFixed(0)}%`,
      mdb: `${tMixF.toFixed(1)} °F`,
      mwb: `${(twbC * 9 / 5 + 32).toFixed(1)} °F (approx)`,
      mw: `${(Wm * 7000).toFixed(1)} gr/lb (${(Wm * 1000).toFixed(2)} g/kg)`,
      mh: `${hm.toFixed(2)} BTU/lb (${(hm * 2.326).toFixed(1)} kJ/kg)`,
    });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Stream 1</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Airflow</label>
            <input type="number" value={cfm1} onChange={(e) => setCfm1(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>CFM</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Dry bulb</label>
            <input type="number" value={t1} onChange={(e) => setT1(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>°F</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Relative humidity</label>
            <input type="number" value={rh1} onChange={(e) => setRh1(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>%</span>
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Stream 2</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Airflow</label>
            <input type="number" value={cfm2} onChange={(e) => setCfm2(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>CFM</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Dry bulb</label>
            <input type="number" value={t2} onChange={(e) => setT2(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>°F</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Relative humidity</label>
            <input type="number" value={rh2} onChange={(e) => setRh2(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>%</span>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Calculate Mixed Air
        </button>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelAccentStyle} />
            <div style={panelTitleStyle}>Results</div>
          </div>
          <div style={panelBodyStyle}>
            {result ? (
              <>
                <ResultRow label="Total airflow" value={`${result.totalCFM.toFixed(0)} CFM`} />
                <ResultRow label="Outdoor air fraction" value={result.outdoorAir} />
                <ResultRow label="Mixed dry bulb" value={result.mdb} />
                <ResultRow label="Mixed wet bulb" value={result.mwb} />
                <ResultRow label="Mixed humidity ratio" value={result.mw} />
                <ResultRow label="Mixed enthalpy" value={result.mh} />
              </>
            ) : (
              <p style={{ color: '#6B7280' }}>Enter stream conditions and calculate to see mixed air results.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RoomPressPage() {
  const [dp, setDp] = useState('10');
  const [gap, setGap] = useState('100');
  const [wall, setWall] = useState('200');
  const [supply, setSupply] = useState('800');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const dpN = parseFloat(dp);
    const gapN = parseFloat(gap);
    const wallN = parseFloat(wall);
    const supplyN = parseFloat(supply);
    if ([dpN, gapN, wallN, supplyN].some((v) => Number.isNaN(v))) {
      setResult(null);
      return;
    }
    const totalLeakM2 = (gapN + wallN) * 1e-4;
    const leakM3s = 0.65 * totalLeakM2 * Math.sqrt((2 * Math.abs(dpN)) / 1.2);
    const supplyM3s = supplyN * 4.719e-4;
    const positive = dpN > 0;
    const exhaustM3s = positive ? supplyM3s - leakM3s : supplyM3s + leakM3s;
    const imbalM3s = Math.abs(supplyM3s - exhaustM3s);
    const toCFM = (x) => `${(x / 4.719e-4).toFixed(0)} CFM`;
    const toPa = (x) => `${x.toFixed(1)} Pa`;
    setResult({
      leak: toCFM(leakM3s),
      exhaust: toCFM(exhaustM3s),
      imbalance: `${toCFM(imbalM3s)} (${positive ? 'supply > exhaust' : 'exhaust > supply'})`,
      pressure: toPa(Math.abs(dpN)),
      direction: positive ? 'Positive pressure (supply > exhaust)' : 'Negative pressure (exhaust > supply)',
    });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Room Pressure Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Target differential pressure</label>
            <input type="number" value={dp} onChange={(e) => setDp(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>Pa</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Open leakage area</label>
            <input type="number" value={gap} onChange={(e) => setGap(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>cm²</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Wall leakage equivalent area</label>
            <input type="number" value={wall} onChange={(e) => setWall(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>cm²</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Supply airflow</label>
            <input type="number" value={supply} onChange={(e) => setSupply(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>CFM</span>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Calculate Pressurization
        </button>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelAccentStyle} />
            <div style={panelTitleStyle}>Results</div>
          </div>
          <div style={panelBodyStyle}>
            {result ? (
              <>
                <ResultRow label="Estimated leakage" value={result.leak} />
                <ResultRow label="Required exhaust" value={result.exhaust} />
                <ResultRow label="Air imbalance" value={result.imbalance} />
                <ResultRow label="Differential pressure" value={result.pressure} />
                <ResultRow label="Pressure direction" value={result.direction} />
              </>
            ) : (
              <p style={{ color: '#6B7280' }}>Enter room pressurization inputs and click calculate.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EquipmentHeatPage() {
  const [pcN, setPcN] = useState('10');
  const [monN, setMonN] = useState('6');
  const [prnN, setPrnN] = useState('8');
  const [srvN, setSrvN] = useState('15');
  const [oth, setOth] = useState('50');
  const [div, setDiv] = useState('1.25');
  const [rad, setRad] = useState('0.6');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const pcW = parseFloat(pcN) * 100;
    const monW = parseFloat(monN) * 50;
    const prnW = parseFloat(prnN) * 100;
    const srvW = parseFloat(srvN) * 150;
    const othW = parseFloat(oth);
    const divN = parseFloat(div);
    const radFrac = parseFloat(rad);
    if ([pcW, monW, prnW, srvW, othW, divN, radFrac].some((v) => Number.isNaN(v))) {
      setResult(null);
      return;
    }
    const totalW = pcW + monW + prnW + srvW + othW;
    const designW = totalW * divN;
    const designBTU = designW * 3.412;
    const radBTU = designBTU * radFrac;
    const convBTU = designBTU * (1 - radFrac);
    const tr = designBTU / 12000;
    setResult({ totalW, designW, designBTU, radBTU, convBTU, tr });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Equipment Loads</div>
        </div>
        <div style={panelBodyStyle}>
          {[
            { label: 'PC count', value: pcN, set: setPcN, unit: 'units' },
            { label: 'Monitors', value: monN, set: setMonN, unit: 'units' },
            { label: 'Printers', value: prnN, set: setPrnN, unit: 'units' },
            { label: 'Servers', value: srvN, set: setSrvN, unit: 'units' },
            { label: 'Other equipment', value: oth, set: setOth, unit: 'W' },
            { label: 'Diversity factor', value: div, set: setDiv, unit: '' },
            { label: 'Radiant fraction', value: rad, set: setRad, unit: 'fraction' },
          ].map((item) => (
            <div key={item.label} style={inputGroupStyle}>
              <label style={labelStyle}>{item.label}</label>
              <input type="number" value={item.value} onChange={(e) => item.set(e.target.value)} style={inputStyle} />
              <span style={inputUnitStyle}>{item.unit}</span>
            </div>
          ))}
        </div>
        <button style={{ ...calculateButtonStyle, marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Estimate Equipment Heat
        </button>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelAccentStyle} />
            <div style={panelTitleStyle}>Results</div>
          </div>
          <div style={panelBodyStyle}>
            {result ? (
              <>
                <ResultRow label="Connected equipment" value={`${result.totalW.toFixed(0)} W`} />
                <ResultRow label="Design equipment load" value={`${result.designW.toFixed(0)} W (${result.designBTU.toFixed(0)} BTU/hr)`} />
                <ResultRow label="Radiant heat" value={`${result.radBTU.toFixed(0)} BTU/hr`} />
                <ResultRow label="Convective heat" value={`${result.convBTU.toFixed(0)} BTU/hr`} />
                <ResultRow label="Cooling load" value={`${result.tr.toFixed(2)} TR`} />
              </>
            ) : (
              <p style={{ color: '#6B7280' }}>Enter equipment quantities and calculate to estimate heat gain.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeatingLoadPage() {
  const [area, setArea] = useState('2000');
  const [height, setHeight] = useState('10');
  const [uWall, setUWall] = useState('0.09');
  const [uGlaz, setUGlaz] = useState('1.2');
  const [glaz, setGlaz] = useState('500');
  const [oat, setOat] = useState('32');
  const [iat, setIat] = useState('70');
  const [ach, setAch] = useState('0.5');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const areaN = parseFloat(area);
    const heightN = parseFloat(height);
    const uWallN = parseFloat(uWall);
    const uGlazN = parseFloat(uGlaz);
    const glazN = parseFloat(glaz);
    const oatN = parseFloat(oat);
    const iatN = parseFloat(iat);
    const achN = parseFloat(ach);
    if ([areaN, heightN, uWallN, uGlazN, glazN, oatN, iatN, achN].some((v) => Number.isNaN(v))) {
      setResult(null);
      return;
    }
    const wallArea = Math.sqrt(areaN) * 4 * heightN - glazN + areaN;
    const qCond = uWallN * wallArea * (iatN - oatN);
    const qGlaz = uGlazN * glazN * (iatN - oatN);
    const volFt3 = areaN * heightN;
    const qInfil = 0.018 * achN * volFt3 * (iatN - oatN);
    const qTotal = qCond + qGlaz + qInfil;
    const kw = qTotal * 0.293071 / 1000;
    setResult({ qCond, qGlaz, qInfil, qTotal, kw, areaN, dT: iatN - oatN });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Heating Load Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          {[
            { label: 'Floor area', value: area, set: setArea, unit: 'ft²' },
            { label: 'Ceiling height', value: height, set: setHeight, unit: 'ft' },
            { label: 'Wall U-value', value: uWall, set: setUWall, unit: 'BTU/hr·ft²·°F' },
            { label: 'Glazing U-value', value: uGlaz, set: setUGlaz, unit: 'BTU/hr·ft²·°F' },
            { label: 'Glazing area', value: glaz, set: setGlaz, unit: 'ft²' },
            { label: 'Outdoor design temp', value: oat, set: setOat, unit: '°F' },
            { label: 'Indoor setpoint', value: iat, set: setIat, unit: '°F' },
            { label: 'Infiltration rate', value: ach, set: setAch, unit: 'ACH' },
          ].map((item) => (
            <div key={item.label} style={inputGroupStyle}>
              <label style={labelStyle}>{item.label}</label>
              <input type="number" value={item.value} onChange={(e) => item.set(e.target.value)} style={inputStyle} />
              <span style={inputUnitStyle}>{item.unit}</span>
            </div>
          ))}
        </div>
        <button style={{ ...calculateButtonStyle, marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Estimate Heating Load
        </button>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelAccentStyle} />
            <div style={panelTitleStyle}>Results</div>
          </div>
          <div style={panelBodyStyle}>
            {result ? (
              <>
                <ResultRow label="Wall conduction" value={`${result.qCond.toFixed(0)} BTU/hr`} />
                <ResultRow label="Glazing conduction" value={`${result.qGlaz.toFixed(0)} BTU/hr`} />
                <ResultRow label="Infiltration load" value={`${result.qInfil.toFixed(0)} BTU/hr`} />
                <ResultRow label="Total heating load" value={`${result.qTotal.toFixed(0)} BTU/hr (${result.kw.toFixed(2)} kW)`} />
                <ResultRow label="Load per area" value={`${(result.qTotal / result.areaN).toFixed(1)} BTU/hr/ft²`} />
                {result.dT < 0 && <p style={{ color: '#DC2626', marginTop: 12 }}>Outdoor temperature is above indoor setpoint; use cooling load instead.</p>}
              </>
            ) : (
              <p style={{ color: '#6B7280' }}>Enter envelope and design temperatures then calculate the heating load.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InsulationPage() {
  const [app, setApp] = useState('chw');
  const [tf, setTf] = useState('7');
  const [ta, setTa] = useState('24');
  const [rh, setRh] = useState('60');
  const [k, setK] = useState('0.038');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const tfN = parseFloat(tf);
    const taN = parseFloat(ta);
    const rhN = parseFloat(rh);
    const kN = parseFloat(k);
    if ([tfN, taN, rhN, kN].some((v) => Number.isNaN(v))) {
      setResult(null);
      return;
    }
    const tfC = ((tfN - 32) * 5) / 9;
    const taC = ((taN - 32) * 5) / 9;
    const dpC = (243.04 * (Math.log(rhN / 100) + (17.625 * taC) / (243.04 + taC))) / (17.625 - Math.log(rhN / 100) - (17.625 * taC) / (243.04 + taC));
    const dT = Math.abs(taC - tfC);
    const coldApp = app.includes('chw') || app.includes('supply') || app.includes('ref');
    const hi = 10;
    const tMin = coldApp
      ? Math.max(0, taC !== dpC ? (kN * (dpC - tfC)) / (hi * (taC - dpC)) : 0) * 1000
      : (kN * dT) / hi * 1000;
    const stdSizes = [13, 19, 25, 32, 38, 50, 63, 76, 100];
    const stdThick = stdSizes.find((x) => x >= tMin) || stdSizes[stdSizes.length - 1];
    const heatPerM2 = ((taC - tfC) * kN) / (stdThick / 1000);
    const condOk = coldApp ? dpC < tfC + (stdThick / 1000) * hi / kN * (taC - dpC) : true;
    setResult({
      dewPoint: `${((dpC * 9) / 5 + 32).toFixed(1)} °F`,
      dT: `${dT.toFixed(1)} °F`,
      minThick: `${tMin.toFixed(0)} mm`,
      stdThick: `${stdThick} mm`,
      heatGain: `${heatPerM2.toFixed(1)} W/m²`,
      risk: coldApp ? (condOk ? 'Low condensation risk' : 'Check surface coefficient and insulation detail') : 'Hot service – not condensation sensitive',
    });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Insulation Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Application type</label>
            <select value={app} onChange={(e) => setApp(e.target.value)} style={inputStyle}>
              <option value="chw">Chilled water</option>
              <option value="supply">Supply air duct</option>
              <option value="ref">Refrigerant line</option>
              <option value="hw">Hot water</option>
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Fluid temperature</label>
            <input type="number" value={tf} onChange={(e) => setTf(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>°F</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Ambient temperature</label>
            <input type="number" value={ta} onChange={(e) => setTa(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>°F</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Ambient relative humidity</label>
            <input type="number" value={rh} onChange={(e) => setRh(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>%</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Thermal conductivity (k)</label>
            <input type="number" value={k} onChange={(e) => setK(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>W/m·K</span>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Calculate Insulation
        </button>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelAccentStyle} />
            <div style={panelTitleStyle}>Results</div>
          </div>
          <div style={panelBodyStyle}>
            {result ? (
              <>
                <ResultRow label="Dew point" value={result.dewPoint} />
                <ResultRow label="Temperature difference" value={result.dT} />
                <ResultRow label="Minimum insulation" value={result.minThick} />
                <ResultRow label="Next standard size" value={result.stdThick} />
                <ResultRow label="Heat gain" value={result.heatGain} />
                <ResultRow label="Condensation risk" value={result.risk} />
              </>
            ) : (
              <p style={{ color: '#6B7280' }}>Enter temperatures, humidity, and insulation conductivity then calculate.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AchRecommendationPage() {
  const achData = {
    office: [
      { name: 'Open-plan office', lo: 6, hi: 10, press: 'neutral', std: 'ASHRAE 62.1', note: '0.06 CFM/ft² OA min per ASHRAE' },
      { name: 'Conference room', lo: 8, hi: 12, press: 'neutral', std: 'ASHRAE 62.1', note: 'High occupancy - verify CO₂ levels' },
      { name: 'Reception/lobby', lo: 4, hi: 6, press: '+ve', std: 'CIBSE Guide B', note: '' },
      { name: 'Server/IT room', lo: 20, hi: 60, press: '+ve', std: 'ASHRAE TC 9.9', note: 'Cooling load driven, not ventilation' },
      { name: 'Corridor', lo: 2, hi: 4, press: 'neutral', std: 'ASHRAE 62.1', note: '' },
      { name: 'Toilet/WC', lo: 10, hi: 15, press: '-ve', std: 'ASHRAE 62.1', note: 'Minimum 10 ACH exhaust, negative pressure' },
    ],
    health: [
      { name: 'Operating theatre', lo: 20, hi: 25, press: '+ve', std: 'HTM 03-01', note: 'Min 20 ACH total, +ve pressure' },
      { name: 'Patient ward', lo: 6, hi: 12, press: '+ve', std: 'HTM 03-01', note: '' },
      { name: 'Isolation room (infection)', lo: 12, hi: 12, press: '-ve', std: 'HTM 03-01', note: 'Negative pressure, dedicated exhaust' },
      { name: 'ICU', lo: 15, hi: 20, press: '+ve', std: 'ASHRAE 170', note: '' },
      { name: 'Pharmacy / clean room', lo: 30, hi: 60, press: '+ve', std: 'EU GMP', note: 'Depends on cleanliness class' },
      { name: 'Corridor (clinical)', lo: 6, hi: 10, press: 'neutral', std: 'HTM 03-01', note: '' },
    ],
    industrial: [
      { name: 'General factory floor', lo: 6, hi: 10, press: 'neutral', std: 'ASHRAE 62.1', note: '' },
      { name: 'Paint booth / spray', lo: 100, hi: 200, press: '-ve', std: 'NFPA 33', note: 'Solvent/VOC removal - explosion risk' },
      { name: 'Battery room', lo: 10, hi: 15, press: '-ve', std: 'IEEE 1187', note: 'Hydrogen dilution' },
      { name: 'Chemical lab', lo: 10, hi: 20, press: '-ve', std: 'ASHRAE 62.1', note: 'Fume hood exhausts supplemental' },
      { name: 'Warehouse (general)', lo: 2, hi: 4, press: 'neutral', std: 'ASHRAE 62.1', note: '' },
      { name: 'Clean room (Class 10k)', lo: 60, hi: 100, press: '+ve', std: 'ISO 14644', note: 'Depends on ISO class' },
    ],
    residential: [
      { name: 'Living room', lo: 0.35, hi: 0.5, press: 'neutral', std: 'ASHRAE 62.2', note: '0.35 ACH natural or mech ventilation' },
      { name: 'Bedroom', lo: 0.35, hi: 0.5, press: 'neutral', std: 'ASHRAE 62.2', note: '' },
      { name: 'Kitchen', lo: 5, hi: 10, press: '-ve', std: 'ASHRAE 62.2', note: 'Exhaust hood over cooking area' },
      { name: 'Bathroom', lo: 5, hi: 10, press: '-ve', std: 'ASHRAE 62.2', note: 'Minimum 50 CFM exhaust fan' },
      { name: 'Garage', lo: 6, hi: 10, press: '-ve', std: 'ASHRAE 62.1', note: 'CO dilution' },
      { name: 'Basement', lo: 0.5, hi: 1, press: 'neutral', std: 'ASHRAE 62.2', note: '' },
    ],
    hospitality: [
      { name: 'Hotel guestroom', lo: 2, hi: 4, press: '+ve', std: 'ASHRAE 62.1', note: '' },
      { name: 'Restaurant dining', lo: 8, hi: 12, press: 'neutral', std: 'ASHRAE 62.1', note: '' },
      { name: 'Hotel kitchen', lo: 25, hi: 40, press: '-ve', std: 'ASHRAE 62.1', note: 'Makeup air required for hood exhaust' },
      { name: 'Banquet/conference hall', lo: 8, hi: 12, press: 'neutral', std: 'ASHRAE 62.1', note: 'High occupancy, verify CO₂' },
      { name: 'Fitness centre/gym', lo: 15, hi: 20, press: 'neutral', std: 'ASHRAE 62.1', note: 'High metabolic rate occupants' },
      { name: 'Swimming pool hall', lo: 4, hi: 6, press: '-ve', std: 'ASHRAE 62.1', note: 'Dehumidification driven' },
    ],
  };

  const [category, setCategory] = useState('office');
  const [spaceIndex, setSpaceIndex] = useState(0);
  const [volume, setVolume] = useState('10000');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const volN = parseFloat(volume);
    const idx = parseInt(spaceIndex, 10);
    const spaces = achData[category] || achData.office;
    const space = spaces[idx] || spaces[0];
    if (Number.isNaN(volN) || !space) {
      setResult(null);
      return;
    }
    const mid = (space.lo + space.hi) / 2;
    const cfm = (mid * volN) / 60;
    setResult({
      range: `${space.lo} – ${space.hi} ACH`,
      design: `${mid.toFixed(1)} ACH`,
      cfm: `${cfm.toFixed(0)} CFM`,
      press: space.press === '+ve' ? 'Positive pressure' : space.press === '-ve' ? 'Negative pressure' : 'Neutral / balanced',
      std: space.std,
      note: space.note || 'Standard reference value. Verify with local code.',
      name: space.name,
    });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>ACH Reference</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Building category</label>
            <select value={category} onChange={(e) => { setCategory(e.target.value); setSpaceIndex(0); }} style={inputStyle}>
              {Object.keys(achData).map((cat) => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Space type</label>
            <select value={spaceIndex} onChange={(e) => setSpaceIndex(e.target.value)} style={inputStyle}>
              {(achData[category] || achData.office).map((space, idx) => (
                <option key={space.name} value={idx}>{space.name}</option>
              ))}
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Space volume</label>
            <input type="number" value={volume} onChange={(e) => setVolume(e.target.value)} style={inputStyle} />
            <span style={inputUnitStyle}>ft³</span>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Calculate ACH Recommendation
        </button>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelAccentStyle} />
            <div style={panelTitleStyle}>Results</div>
          </div>
          <div style={panelBodyStyle}>
            {result ? (
              <>
                <ResultRow label="Space type" value={result.name} />
                <ResultRow label="Recommended range" value={result.range} />
                <ResultRow label="Design value" value={result.design} />
                <ResultRow label="Required airflow" value={result.cfm} />
                <ResultRow label="Pressure guidance" value={result.press} />
                <ResultRow label="Reference standard" value={result.std} />
                <ResultRow label="Notes" value={result.note} />
              </>
            ) : (
              <p style={{ color: '#6B7280' }}>Select a space type and enter a volume to see ACH guidance.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExtStaticPressurePage() {
  const [ductFriction, setDuctFriction] = useState('');
  const [ductLength, setDuctLength] = useState('');
  const [equipmentLoss, setEquipmentLoss] = useState('');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcExtStaticPressure({ ductFriction, ductLength, equipmentLoss, fittingLoss: '0', safetyFactor: '10' });
  }, [result, ductFriction, ductLength, equipmentLoss]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}><div style={panelAccentStyle} /><div style={panelTitleStyle}>External Static Pressure</div></div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}><label style={labelStyle}>Duct Friction</label><input type="number" value={ductFriction} onChange={(e) => setDuctFriction(e.target.value)} style={inputStyle} placeholder="in w.g./100ft" /></div>
          <div style={inputGroupStyle}><label style={labelStyle}>Duct Length (ft)</label><input type="number" value={ductLength} onChange={(e) => setDuctLength(e.target.value)} style={inputStyle} /></div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={buttonStyle}>Calculate</button>
        </div>
      </div>
      {calcResult && <div style={panelStyle}><div style={resultRowStyle}><span>ESP</span><span style={resultValueStyle}>{calcResult.esp}"</span></div></div>}
    </div>
  );
}

function DiffuserSelectorPage() {
  const [airflow, setAirflow] = useState('');
  const [throw_, setThrow] = useState('');
  const [ncLimit, setNcLimit] = useState('35');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcDiffuserSelector({ airflow, throwDistance: throw_, ncLimit, isIP: true });
  }, [result, airflow, throw_, ncLimit]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Diffuser Selector</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Airflow (CFM)</label>
            <input type="number" value={airflow} onChange={(e) => setAirflow(e.target.value)} style={inputStyle} placeholder="CFM" />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Throw Distance (ft)</label>
            <input type="number" value={throw_} onChange={(e) => setThrow(e.target.value)} style={inputStyle} placeholder="ft" />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>NC Limit</label>
            <input type="number" value={ncLimit} onChange={(e) => setNcLimit(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>

      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelAccentStyle} />
              <div style={panelTitleStyle}>Diffuser Result</div>
            </div>
            <div style={panelBodyStyle}>
              <ResultRow label="Estimated NC" value={calcResult.estimatedNC} />
              <ResultRow label="Throw Adequate" value={calcResult.throwAdequate ? 'Yes' : 'No'} />
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Recommended Diffusers</div>
                {calcResult.recommendedDiffusers.map((diffuser) => (
                  <ResultRow key={diffuser.type} label={diffuser.type} value={diffuser.suitability} />
                ))}
              </div>
              {calcResult.warnings.length > 0 && (
                <div style={resultSummaryStyle}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Warnings</div>
                  {calcResult.warnings.map((warning) => (
                    <div key={warning} style={{ marginBottom: 6 }}>{warning}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HeatLoadQuickPage() {
  const [wallArea, setWallArea] = useState('');
  const [windowArea, setWindowArea] = useState('');
  const [roofArea, setRoofArea] = useState('');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcHeatLoadQuick({ wallArea, windowArea, roofArea, infiltration: '0', internalHeat: '0', oat: '95', rat: '75', isIP: true });
  }, [result, wallArea, windowArea, roofArea]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Heat Load (Quick)</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Wall Area (ft²)</label>
            <input type="number" value={wallArea} onChange={(e) => setWallArea(e.target.value)} style={inputStyle} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Window Area (ft²)</label>
            <input type="number" value={windowArea} onChange={(e) => setWindowArea(e.target.value)} style={inputStyle} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Roof Area (ft²)</label>
            <input type="number" value={roofArea} onChange={(e) => setRoofArea(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Total Load" value={`${calcResult.totalLoad} BTU/h`} />
          </div>
        </div>
      )}
    </div>
  );
}

function ChillerCOPPage() {
  const [capacity, setCapacity] = useState('');
  const [inputPower, setInputPower] = useState('');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcChillerCOP({ capacity, inputPower, ambientTemp: '85', compressorType: 'centrifugal', isIP: true });
  }, [result, capacity, inputPower]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Chiller COP</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Chiller Capacity (ton)</label>
            <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} style={inputStyle} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Input Power (kW)</label>
            <input type="number" value={inputPower} onChange={(e) => setInputPower(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="COP" value={calcResult.cop} />
          </div>
        </div>
      )}
    </div>
  );
}

function CoolingTowerPage() {
  const [duty, setDuty] = useState('');
  const [cwInlet, setCwInlet] = useState('');
  const [cwOutlet, setCwOutlet] = useState('');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcCoolingTower({ duty, cwInlet, cwOutlet, wetBulbTemp: '75', approach: '5', isIP: true });
  }, [result, duty, cwInlet, cwOutlet]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Cooling Tower</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Duty (ton)</label>
            <input type="number" value={duty} onChange={(e) => setDuty(e.target.value)} style={inputStyle} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>CW Inlet (°F)</label>
            <input type="number" value={cwInlet} onChange={(e) => setCwInlet(e.target.value)} style={inputStyle} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>CW Outlet (°F)</label>
            <input type="number" value={cwOutlet} onChange={(e) => setCwOutlet(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Flow" value={`${calcResult.gpmCW} GPM`} />
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PLUMBING 
// ══════════════════════════════════════════════════════════════════════════════

// Hunter's curve for water demand calculation
const huntersCurve = (fu) => {
  const table = [
    [1, 1], [2, 1.5], [3, 2], [5, 3], [6, 3.5], [10, 5.5], [12, 6], [20, 9], [30, 12],
    [50, 18], [75, 24], [100, 29], [150, 38], [200, 45], [300, 57], [400, 66], [500, 73],
    [600, 79], [750, 87], [1000, 98], [1500, 114], [2000, 127],
  ];
  if (fu <= 0) return 0;
  for (let i = 0; i < table.length - 1; i++) {
    if (fu >= table[i][0] && fu < table[i + 1][0]) {
      return table[i][1] + ((table[i + 1][1] - table[i][1]) * (fu - table[i][0])) / (table[i + 1][0] - table[i][0]);
    }
  }
  return fu >= 2000 ? 127 + (fu - 2000) * 0.03 : 0;
};

const waterDemandFixtures = [
  { name: 'WC (flush valve)', fu: { priv: 6, pub: 10 } },
  { name: 'WC (flush tank)', fu: { priv: 3, pub: 5 } },
  { name: 'Lavatory', fu: { priv: 1, pub: 2 } },
  { name: 'Kitchen Sink', fu: { priv: 2, pub: 4 } },
  { name: 'Bathtub/Shower', fu: { priv: 2, pub: 4 } },
  { name: 'Urinal (flush valve)', fu: { priv: 5, pub: 5 } },
  { name: 'Dishwasher', fu: { priv: 2, pub: 2 } },
  { name: 'Clothes Washer', fu: { priv: 2, pub: 3 } },
];

function WaterDemandPage() {
  const [buildingType, setBuildingType] = useState('priv');
  const [fixtures, setFixtures] = useState(waterDemandFixtures.map(() => 0));
  const [result, setResult] = useState(null);

  const calculate = () => {
    let totalFU = 0;
    const parts = [];
    fixtures.forEach((count, idx) => {
      if (count > 0) {
        const fu = waterDemandFixtures[idx].fu[buildingType] * count;
        totalFU += fu;
        parts.push(`${waterDemandFixtures[idx].name}×${count}=${fu}FU`);
      }
    });
    const gpm = huntersCurve(totalFU);
    setResult({ totalFU, gpm, breakdown: parts.length ? parts.join(', ') : 'No fixtures entered' });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Building Type</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={chipRowStyle}>
            {['Residential', 'Commercial'].map((type, idx) => (
              <button
                key={type}
                type="button"
                onClick={() => setBuildingType(idx === 0 ? 'priv' : 'pub')}
                style={{
                  ...chipStyle,
                  background: (idx === 0 ? buildingType === 'priv' : buildingType === 'pub') ? '#059669' : '#E5E7EB',
                  color: (idx === 0 ? buildingType === 'priv' : buildingType === 'pub') ? '#fff' : '#111827',
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelAccentStyle} />
            <div style={panelTitleStyle}>Fixture Counts</div>
          </div>
          <div style={panelBodyStyle}>
            {waterDemandFixtures.map((fixture, idx) => (
              <div key={fixture.name} style={inputGroupStyle}>
                <label style={labelStyle}>{fixture.name}</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setFixtures((prev) => { const n = [...prev]; n[idx] = Math.max(0, n[idx] - 1); return n; })}
                    style={{ ...chipStyle, background: '#059669', color: '#fff', width: 40 }}
                  >
                    −
                  </button>
                  <span style={{ fontSize: '1.1rem', fontWeight: 600, minWidth: 30, textAlign: 'center' }}>{fixtures[idx]}</span>
                  <button
                    type="button"
                    onClick={() => setFixtures((prev) => { const n = [...prev]; n[idx] += 1; return n; })}
                    style={{ ...chipStyle, background: '#059669', color: '#fff', width: 40 }}
                  >
                    +
                  </button>
                  <span style={{ color: '#6B7280', fontSize: '0.9rem' }}>
                    FU: {fixture.fu[buildingType]} each
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <button style={{ ...calculateButtonStyle, background: '#059669', width: '100%' }} type="button" onClick={calculate}>
          ⚡ Calculate Peak Demand
        </button>
      </div>

      {result && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelAccentStyle} />
              <div style={panelTitleStyle}>Peak Demand Result</div>
            </div>
            <div style={panelBodyStyle}>
              <ResultRow label="Total Fixture Units" value={`${result.totalFU} FU`} />
              <ResultRow label="Peak Demand (Hunter's)" value={`${result.gpm.toFixed(1)} GPM`} />
              <ResultRow label="Fixture Breakdown" value={result.breakdown} />
              <p style={{ color: '#6B7280', marginTop: 12, fontSize: '0.9rem' }}>
                Hunter's curve from IPC Table 604.1 - interpolated for this FU count. Applies to systems with normal fixture use.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HotWaterPage() {
  const [buildingType, setHWType] = useState('50');
  const [occupancy, setOccupancy] = useState('10');
  const [peakFrac, setPeakFrac] = useState('0.5');
  const [tcOld, setTcOld] = useState('60');
  const [thOld, setThOld] = useState('140');
  const [eff, setEff] = useState('85');
  const [storagePct, setStoragePct] = useState('10');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const lpd = parseFloat(buildingType);
    const occ = parseFloat(occupancy) || 1;
    const pf = parseFloat(peakFrac) || 0.5;
    const tc = (parseFloat(tcOld) - 32) * (5 / 9);
    const th = (parseFloat(thOld) - 32) * (5 / 9);
    const eff_dec = parseFloat(eff) / 100 || 0.85;
    const sp = parseFloat(storagePct) / 100 || 0.1;

    if (th <= tc) {
      alert('Hot temperature must be greater than cold temperature');
      return;
    }

    const dailyL = lpd * occ;
    const peakL = dailyL * pf;
    const dT = th - tc;
    const peakLperHr = peakL;
    const kw = (peakLperHr * 4.187 * dT) / (3600 * eff_dec);
    const storageLitres = dailyL * sp;
    const recoveryHr = (storageLitres * 4.187 * dT) / (3600 * kw * eff_dec * 1000);
    const dailyKwh = (dailyL * 4.187 * dT) / (3600 * eff_dec * 1000);

    setResult({
      dailyL: dailyL.toFixed(0),
      peakL: peakL.toFixed(0),
      kw: kw.toFixed(1),
      btu: (kw * 3.412).toFixed(0),
      storageLitres: storageLitres.toFixed(0),
      recoveryMin: (recoveryHr * 60).toFixed(0),
      dailyKwh: dailyKwh.toFixed(1),
      tc: tc.toFixed(1),
      th: th.toFixed(1),
    });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Occupancy & Demand</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Building type</label>
            <select value={buildingType} onChange={(e) => setHWType(e.target.value)} style={inputStyle}>
              <option value="50">Residential / Apartment - 50 L/person/day</option>
              <option value="80">Hotel - 80 L/bed/day</option>
              <option value="120">Hospital - 120 L/bed/day</option>
              <option value="30">Office - 30 L/person/day</option>
              <option value="40">School - 40 L/person/day</option>
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Occupancy count</label>
            <input type="number" value={occupancy} onChange={(e) => setOccupancy(e.target.value)} style={inputStyle} placeholder="e.g. 10" />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Peak fraction of daily demand</label>
            <input type="number" value={peakFrac} onChange={(e) => setPeakFrac(e.target.value)} style={inputStyle} placeholder="e.g. 0.5" />
            <span style={inputUnitStyle}>fraction</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Cold inlet temperature</label>
            <input type="number" value={tcOld} onChange={(e) => setTcOld(e.target.value)} style={inputStyle} placeholder="e.g. 60" />
            <span style={inputUnitStyle}>°F</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Storage temperature</label>
            <input type="number" value={thOld} onChange={(e) => setThOld(e.target.value)} style={inputStyle} placeholder="e.g. 140" />
            <span style={inputUnitStyle}>°F</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Heater efficiency</label>
            <input type="number" value={eff} onChange={(e) => setEff(e.target.value)} style={inputStyle} placeholder="e.g. 85" />
            <span style={inputUnitStyle}>%</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Storage as % of daily demand</label>
            <input type="number" value={storagePct} onChange={(e) => setStoragePct(e.target.value)} style={inputStyle} placeholder="e.g. 10" />
            <span style={inputUnitStyle}>%</span>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, background: '#059669', marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Calculate System
        </button>
      </div>

      {result && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelAccentStyle} />
              <div style={panelTitleStyle}>System Sizing Results</div>
            </div>
            <div style={panelBodyStyle}>
              <ResultRow label="Daily hot water demand" value={`${result.dailyL} L/day`} />
              <ResultRow label="Peak hour draw" value={`${result.peakL} L/hr`} />
              <ResultRow label="Heater capacity" value={`${result.kw} kW (${result.btu} BTU/hr)`} />
              <ResultRow label="Storage tank volume" value={`${result.storageLitres} L`} />
              <ResultRow label="Recovery time (empty to full)" value={`${result.recoveryMin} min`} />
              <ResultRow label="Daily energy consumption" value={`${result.dailyKwh} kWh/day`} />
              <p style={{ color: '#6B7280', marginTop: 12, fontSize: '0.9rem' }}>
                {result.th > 65 ? '⚠ High storage temperature - scalding risk. Use thermostatic mixing valve (TMV) at point of use (≤43°C).' : ''}
                {result.th < 60 ? '⚠ Low storage temperature - Legionella risk. ASHRAE 188-2021 requires storage ≥60°C.' : ''}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WaterPipePage() {
  const [flow, setFlow] = useState('25');
  const [pAvail, setPAvail] = useState('60');
  const [pResid, setPResid] = useState('20');
  const [length, setLength] = useState('120');
  const [fitPct, setFitPct] = useState('20');
  const [elev, setElev] = useState('20');
  const [material, setMaterial] = useState('150');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const Q = parseFloat(flow) || 0;
    const pavail = parseFloat(pAvail) || 0;
    const presid = parseFloat(pResid) || 0;
    const L = parseFloat(length) || 0;
    const fit = (parseFloat(fitPct) || 0) / 100;
    const elevation = parseFloat(elev) || 0;
    const C = parseFloat(material) || 150;

    const Leff = L * (1 + fit);
    const elevLoss = elevation / 2.31;

    const sizes = [
      { nps: '¾"', id: 0.811 },
      { nps: '1"', id: 1.055 },
      { nps: '1¼"', id: 1.265 },
      { nps: '1½"', id: 1.505 },
      { nps: '2"', id: 2.009 },
    ];

    const rows = sizes.map((s) => {
      const hf = (4.52 * Leff * Math.pow(Q, 1.85)) / (Math.pow(C, 1.85) * Math.pow(s.id, 4.87));
      const A = (Math.PI * (s.id / 12) * (s.id / 12)) / 4;
      const v = Q / 448.8 / A;
      const resid = pavail - hf - elevLoss;
      const ok = resid >= presid && v >= 1 && v <= 8;
      return { nps: s.nps, hf, v, resid, ok };
    });

    const rec = rows.find((r) => r.ok);
    setResult({ rows, recommended: rec, elevLoss });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>System Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Design Flow Rate</label>
            <input type="number" value={flow} onChange={(e) => setFlow(e.target.value)} style={inputStyle} placeholder="e.g. 25" />
            <span style={inputUnitStyle}>GPM</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Available Supply Pressure</label>
            <input type="number" value={pAvail} onChange={(e) => setPAvail(e.target.value)} style={inputStyle} placeholder="e.g. 60" />
            <span style={inputUnitStyle}>psi</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Required Residual at Fixture</label>
            <input type="number" value={pResid} onChange={(e) => setPResid(e.target.value)} style={inputStyle} placeholder="e.g. 20" />
            <span style={inputUnitStyle}>psi</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Total Pipe Length</label>
            <input type="number" value={length} onChange={(e) => setLength(e.target.value)} style={inputStyle} placeholder="e.g. 120" />
            <span style={inputUnitStyle}>ft</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Fitting Allowance</label>
            <input type="number" value={fitPct} onChange={(e) => setFitPct(e.target.value)} style={inputStyle} placeholder="e.g. 20" />
            <span style={inputUnitStyle}>% of length</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Elevation Rise</label>
            <input type="number" value={elev} onChange={(e) => setElev(e.target.value)} style={inputStyle} placeholder="e.g. 20" />
            <span style={inputUnitStyle}>ft</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Pipe Material</label>
            <select value={material} onChange={(e) => setMaterial(e.target.value)} style={inputStyle}>
              <option value="150">Copper Type L - C=150</option>
              <option value="150">CPVC - C=150</option>
              <option value="120">Galvanized Steel - C=120</option>
              <option value="130">PEX - C=130</option>
            </select>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, background: '#059669', marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Size Supply Pipe
        </button>
      </div>

      {result && (
        <>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={panelStyle}>
              <div style={panelHeaderStyle}>
                <div style={panelAccentStyle} />
                <div style={panelTitleStyle}>Sizing Analysis - All Options</div>
              </div>
              <div style={panelBodyStyle}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, fontSize: '0.85rem', fontWeight: 700, color: '#6B7280', paddingBottom: 12, borderBottom: '1px solid #E5E7EB' }}>
                  <div>Size</div><div>Velocity</div><div>Friction</div><div>Residual</div><div>Status</div>
                </div>
                {result.rows.map((r) => (
                  <div key={r.nps} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, fontSize: '0.9rem', padding: '8px 0', borderBottom: '1px solid #E5E7EB', background: r.ok ? 'rgba(5,150,105,0.04)' : 'transparent' }}>
                    <div style={{ fontWeight: 600 }}>{r.nps}</div>
                    <div style={{ color: r.v > 8 ? '#D97706' : 'inherit' }}>{r.v.toFixed(2)} fps</div>
                    <div>{r.hf.toFixed(2)} psi</div>
                    <div style={{ color: r.resid >= 20 ? '#059669' : '#DC2626' }}>{r.resid.toFixed(1)} psi</div>
                    <div>{r.ok ? '✓' : '-'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {result.recommended && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={panelStyle}>
                <div style={panelHeaderStyle}>
                  <div style={panelAccentStyle} />
                  <div style={panelTitleStyle}>Recommended Selection</div>
                </div>
                <div style={panelBodyStyle}>
                  <ResultRow label="Recommended Pipe Size" value={result.recommended.nps} />
                  <ResultRow label="Velocity" value={`${result.recommended.v.toFixed(2)} fps`} />
                  <ResultRow label="Friction Loss" value={`${result.recommended.hf.toFixed(2)} psi`} />
                  <ResultRow label="Elevation Pressure Loss" value={`${result.elevLoss.toFixed(2)} psi`} />
                  <ResultRow label="Residual at Remote Fixture" value={`${result.recommended.resid.toFixed(1)} psi`} />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const drainageFixtures = [
  { name: 'WC', dfu: 4 },
  { name: 'Lavatory', dfu: 1 },
  { name: 'Bathtub/Shower', dfu: 2 },
  { name: 'Kitchen Sink', dfu: 2 },
  { name: 'Dishwasher', dfu: 2 },
  { name: 'Clothes Washer', dfu: 3 },
  { name: 'Floor Drain (2")', dfu: 2 },
  { name: 'Urinal', dfu: 4 },
];

const branchSize = (dfu) => { if (dfu <= 1) return 2; if (dfu <= 3) return 3; if (dfu <= 12) return 4; if (dfu <= 160) return 6; return 8; };
const stackSize = (dfu) => { if (dfu <= 2) return 2; if (dfu <= 8) return 3; if (dfu <= 50) return 4; if (dfu <= 256) return 6; return 8; };

function DrainagePage() {
  const [drainType, setDrainType] = useState('branch');
  const [fixtures, setFixtures] = useState(drainageFixtures.map(() => 0));
  const [result, setResult] = useState(null);

  const calculate = () => {
    let total = 0;
    fixtures.forEach((count, idx) => {
      total += drainageFixtures[idx].dfu * count;
    });

    let size;
    if (drainType === 'branch') size = branchSize(total);
    else if (drainType === 'stack') size = stackSize(total);
    else {
      size = stackSize(total);
      if (size < 4) size = 4;
    }

    const slope = drainType === 'branch' ? (size < 3 ? '20.8 mm/m (¼"/ft)' : '10.4 mm/m (⅛"/ft)') : 'N/A (vertical)';
    setResult({ totalDFU: total, size, slope });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>System Type</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={chipRowStyle}>
            {[
              { label: 'Horizontal Branch', val: 'branch' },
              { label: 'Stack', val: 'stack' },
              { label: 'Building Drain', val: 'building' },
            ].map((item) => (
              <button
                key={item.val}
                type="button"
                onClick={() => setDrainType(item.val)}
                style={{
                  ...chipStyle,
                  background: drainType === item.val ? '#059669' : '#E5E7EB',
                  color: drainType === item.val ? '#fff' : '#111827',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelAccentStyle} />
            <div style={panelTitleStyle}>Fixture Counts</div>
          </div>
          <div style={panelBodyStyle}>
            {drainageFixtures.map((fixture, idx) => (
              <div key={fixture.name} style={inputGroupStyle}>
                <label style={labelStyle}>{fixture.name}</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setFixtures((prev) => { const n = [...prev]; n[idx] = Math.max(0, n[idx] - 1); return n; })}
                    style={{ ...chipStyle, background: '#059669', color: '#fff', width: 40 }}
                  >
                    −
                  </button>
                  <span style={{ fontSize: '1.1rem', fontWeight: 600, minWidth: 30, textAlign: 'center' }}>{fixtures[idx]}</span>
                  <button
                    type="button"
                    onClick={() => setFixtures((prev) => { const n = [...prev]; n[idx] += 1; return n; })}
                    style={{ ...chipStyle, background: '#059669', color: '#fff', width: 40 }}
                  >
                    +
                  </button>
                  <span style={{ color: '#6B7280', fontSize: '0.9rem' }}>DFU: {fixture.dfu}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <button style={{ ...calculateButtonStyle, background: '#059669', width: '100%' }} type="button" onClick={calculate}>
          ⚡ Size Drain
        </button>
      </div>

      {result && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelAccentStyle} />
              <div style={panelTitleStyle}>Drainage Result</div>
            </div>
            <div style={panelBodyStyle}>
              <ResultRow label="Total DFU" value={`${result.totalDFU} DFU`} />
              <ResultRow label="Required Pipe Size" value={`${result.size}" NPS (${(result.size * 25.4).toFixed(0)} mm)`} />
              <ResultRow label="Minimum Slope" value={result.slope} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TankSizingPage() {
  const [daily, setDaily] = useState('5000');
  const [days, setDays] = useState('1');
  const [peak, setPeak] = useState('40');
  const [pump, setPump] = useState('30');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const dailyL = parseFloat(daily) * 3.78541 || 0;
    const daysNum = parseFloat(days) || 1;
    const peakGPM = parseFloat(peak) || 0;
    const pumpGPM = parseFloat(pump) || 0;

    const peakL = peakGPM * 3.78541;
    const storage = dailyL * daysNum;
    const breakT = peakL * 30 * 60;
    const rec = Math.max(storage, breakT);
    const fillT = pumpGPM > 0 ? rec / 60 / (pumpGPM * 3.78541) : 0;

    setResult({
      storage: (storage / 3.78541).toFixed(0),
      breakT: (breakT / 3.78541).toFixed(0),
      rec: (rec / 3.78541).toFixed(0),
      fillT: fillT > 0 ? fillT.toFixed(1) : '-',
    });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Tank Sizing Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Daily Water Demand</label>
            <input type="number" value={daily} onChange={(e) => setDaily(e.target.value)} style={inputStyle} placeholder="e.g. 5000" />
            <span style={inputUnitStyle}>gal</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Storage Duration</label>
            <input type="number" value={days} onChange={(e) => setDays(e.target.value)} style={inputStyle} placeholder="e.g. 1" />
            <span style={inputUnitStyle}>days</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Peak Flow Rate</label>
            <input type="number" value={peak} onChange={(e) => setPeak(e.target.value)} style={inputStyle} placeholder="e.g. 40" />
            <span style={inputUnitStyle}>GPM</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Pump Fill Rate</label>
            <input type="number" value={pump} onChange={(e) => setPump(e.target.value)} style={inputStyle} placeholder="e.g. 30" />
            <span style={inputUnitStyle}>GPM</span>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, background: '#059669', marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Size Tank
        </button>
      </div>

      {result && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelAccentStyle} />
              <div style={panelTitleStyle}>Tank Sizing Result</div>
            </div>
            <div style={panelBodyStyle}>
              <ResultRow label="Storage Volume" value={`${result.storage} gal`} />
              <ResultRow label="Break Tank (30-min peak)" value={`${result.breakT} gal`} />
              <ResultRow label="Recommended Capacity" value={`${result.rec} gal`} />
              <ResultRow label="Pump Fill Time" value={`${result.fillT} min`} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FixtureUnitPage() {
  const [toilets, setToilets] = useState('');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcFixtureUnit({ residentialFixtures: JSON.stringify({ toilet: parseFloat(toilets) || 0 }), commercialFixtures: '{}' });
  }, [result, toilets]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Fixture Unit Calc</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Number of Toilets</label>
            <input type="number" value={toilets} onChange={(e) => setToilets(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Total DFU" value={calcResult.totalDFU} />
          </div>
        </div>
      )}
    </div>
  );
}

function BoosterPumpPage() {
  const [designFlow, setDesignFlow] = useState('');
  const [maxPressure, setMaxPressure] = useState('80');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcBoosterPump({ designFlow, minPressure: '20', maxPressure, staticHead: '0', pipeLoss: '0', isIP: true });
  }, [result, designFlow, maxPressure]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Booster Pump</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Design Flow (GPM)</label>
            <input type="number" value={designFlow} onChange={(e) => setDesignFlow(e.target.value)} style={inputStyle} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Max Pressure (psi)</label>
            <input type="number" value={maxPressure} onChange={(e) => setMaxPressure(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Selected HP" value={calcResult.selectedHP} />
          </div>
        </div>
      )}
    </div>
  );
}

function PressureAtFixturePage() {
  const [sourceP, setSourceP] = useState('');
  const [pipeLength, setPipeLength] = useState('');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcPressureAtFixture({ sourceP, staticLift: '0', pipeLength, flowRate: '0', pipeSize: '1', isIP: true });
  }, [result, sourceP, pipeLength]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Pressure at Fixture</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Source Pressure (psi)</label>
            <input type="number" value={sourceP} onChange={(e) => setSourceP(e.target.value)} style={inputStyle} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Pipe Length (ft)</label>
            <input type="number" value={pipeLength} onChange={(e) => setPipeLength(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Residual Pressure" value={`${calcResult.residualPressure} psi`} />
          </div>
        </div>
      )}
    </div>
  );
}

function PipeDesignCheckPage() {
  const [pipeSize, setPipeSize] = useState('1');
  const [flowRate, setFlowRate] = useState('');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcPipeDesignCheck({ pipeSize, flowRate, material: 'copper', isIP: true });
  }, [result, pipeSize, flowRate]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Pipe Design Check</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Pipe Size (in)</label>
            <input type="number" value={pipeSize} onChange={(e) => setPipeSize(e.target.value)} style={inputStyle} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Flow Rate (GPM)</label>
            <input type="number" value={flowRate} onChange={(e) => setFlowRate(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Velocity" value={`${calcResult.velocity} fps`} />
          </div>
        </div>
      )}
    </div>
  );
}

function GravityFlowCheckPage() {
  const [pipeDiameter, setPipeDiameter] = useState('');
  const [staticHead, setStaticHead] = useState('10');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcGravityFlowCheck({ pipeDiameter, pipeLength: '100', staticHead, isIP: true });
  }, [result, pipeDiameter, staticHead]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Gravity Flow Check</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Pipe Diameter (in)</label>
            <input type="number" value={pipeDiameter} onChange={(e) => setPipeDiameter(e.target.value)} style={inputStyle} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Static Head (ft)</label>
            <input type="number" value={staticHead} onChange={(e) => setStaticHead(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Estimated Flow" value={`${calcResult.estimatedFlow} GPM`} />
          </div>
        </div>
      )}
    </div>
  );
}

function SewagePumpPage() {
  const [dailyFlow, setDailyFlow] = useState('');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcSewagePump({ dailyFlow, peakFactor: '3', stationCapacity: '1000', liftHeight: '20', isIP: true });
  }, [result, dailyFlow]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Sewage Pump</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Daily Flow (GPM)</label>
            <input type="number" value={dailyFlow} onChange={(e) => setDailyFlow(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Pump HP" value={calcResult.pumpHP} />
          </div>
        </div>
      )}
    </div>
  );
}

function RainwaterDrainagePage() {
  const [roofArea, setRoofArea] = useState('');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcRainwaterDrainage({ roofArea, rainfall: '2', drainageCoeff: '0.85', pipeSize: '4', isIP: true });
  }, [result, roofArea]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Rainwater Drainage</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Roof Area (ft²)</label>
            <input type="number" value={roofArea} onChange={(e) => setRoofArea(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Runoff Flow" value={`${calcResult.runoffFlow} GPM`} />
          </div>
        </div>
      )}
    </div>
  );
}

function GreyWaterCalculatorPage() {
  const [occupants, setOccupants] = useState('');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcGreyWaterCalculator({ occupants, dailyUsagePerCap: '40', reclaimPercentage: '50' });
  }, [result, occupants]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Grey Water Calculator</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Occupants</label>
            <input type="number" value={occupants} onChange={(e) => setOccupants(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Storage Tank" value={`${calcResult.storageTank} gal`} />
          </div>
        </div>
      )}
    </div>
  );
}

function PipeThermalExpansionPage() {
  const [pipeLength, setPipeLength] = useState('');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcPipeThermalExpansion({ pipeLength, initialTemp: '50', finalTemp: '150', material: 'steel', isIP: true });
  }, [result, pipeLength]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Pipe Thermal Expansion</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Pipe Length (ft)</label>
            <input type="number" value={pipeLength} onChange={(e) => setPipeLength(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Expansion" value={`${calcResult.expansionInches}"`} />
          </div>
        </div>
      )}
    </div>
  );
}

function WaterHammerSurgePage() {
  const [flowVelocity, setFlowVelocity] = useState('4');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcWaterHammerSurge({ flowVelocity, closureTime: '0.1', pipeLength: '100', material: 'copper', isIP: true });
  }, [result, flowVelocity]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Water Hammer (Surge)</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Flow Velocity (fps)</label>
            <input type="number" value={flowVelocity} onChange={(e) => setFlowVelocity(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Surge Pressure" value={`${calcResult.surgePressure} PSI`} />
          </div>
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// ELECTRICAL
// ══════════════════════════════════════════════════════════════════════════════

function ElecBreakerPage() {
  const [ib, setIb] = useState('');
  const [iz, setIz] = useState('');
  const [sf, setSf] = useState('1.25');
  const [cbType, setCbType] = useState('mcb');
  const [showResult, setShowResult] = useState(false);

  const result = useMemo(() => {
    const ibNum = parseFloat(ib) || 0;
    const izNum = parseFloat(iz) || 0;
    const sfNum = parseFloat(sf) || 1.25;
    if (ibNum <= 0 || izNum <= 0) return null;
    const minRating = ibNum * sfNum;
    const ratings = cbType === 'mcb' ? STD_MCB : cbType === 'mccb' ? STD_MCCB : STD_ACB;
    const stdRating = ratings.find((r) => r >= minRating) || ratings[ratings.length - 1];
    const loadingPct = (ibNum / stdRating) * 100;
    const cableOk = stdRating <= izNum;
    const ruleOk = ibNum <= stdRating && stdRating <= izNum;
    return {
      minRating,
      stdRating,
      loadingPct,
      cableOk,
      ruleOk,
      cbType,
      ibNum,
      izNum,
      sfNum,
    };
  }, [ib, iz, sf, cbType]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Circuit Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Design current (A)</label>
            <input
              type="number"
              value={ib}
              onChange={(e) => {
                setIb(e.target.value);
                setShowResult(false);
              }}
              placeholder="e.g. 45"
              style={inputStyle}
            />
            <span style={inputUnitStyle}>A</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Cable ampacity (A)</label>
            <input
              type="number"
              value={iz}
              onChange={(e) => {
                setIz(e.target.value);
                setShowResult(false);
              }}
              placeholder="e.g. 84"
              style={inputStyle}
            />
            <span style={inputUnitStyle}>A</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Safety factor</label>
            <input
              type="number"
              step="0.05"
              min="1.0"
              max="2.0"
              value={sf}
              onChange={(e) => {
                setSf(e.target.value);
                setShowResult(false);
              }}
              placeholder="1.25"
              style={inputStyle}
            />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Breaker type</label>
            <select
              value={cbType}
              onChange={(e) => {
                setCbType(e.target.value);
                setShowResult(false);
              }}
              style={inputStyle}
            >
              <option value="mcb">MCB - up to 125A</option>
              <option value="mccb">MCCB - 100A to 2500A</option>
              <option value="acb">ACB - above 800A</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => setShowResult(true)}
            style={calculateButtonStyle}
          >
            Calculate Breaker
          </button>
        </div>
      </div>

      {showResult && result ? (
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelAccentStyle} />
            <div style={panelTitleStyle}>Breaker Selection</div>
          </div>
          <div style={panelBodyStyle}>
            <ResultRow
              label="Minimum breaker rating"
              value={`${result.minRating.toFixed(1)} A (${result.ibNum.toFixed(0)} A × ${result.sfNum})`}
            />
            <ResultRow
              label="Recommended standard rating"
              value={`${result.stdRating} A ${result.cbType.toUpperCase()}`}
            />
            <ResultRow
              label="Cable ampacity check"
              value={result.cableOk ? `✓ In (${result.stdRating} A) ≤ Iz (${result.izNum} A)` : `✗ In (${result.stdRating} A) > Iz (${result.izNum} A)`}
            />
            <ResultRow
              label="Loading on breaker"
              value={`${result.loadingPct.toFixed(1)}% of breaker rating`}
            />
            <ResultRow
              label="Breaker type"
              value={result.cbType === 'mcb' ? 'MCB (IEC 60898) - up to 125A' : result.cbType === 'mccb' ? 'MCCB (IEC 60947) - 100A to 2500A' : 'ACB - above 800A'}
            />
            <ResultRow
              label="IEC rule check"
              value={result.ruleOk ? '✓ Ib ≤ In ≤ Iz - COMPLIANT' : '✗ Rule violated - check inputs'}
            />
            {result.izNum > 0 && !result.cableOk ? (
              <div style={resultSummaryStyle}>
                <strong>Warning:</strong> Breaker rating {result.stdRating}A exceeds cable ampacity {result.izNum}A. Increase cable size or reduce design current.
              </div>
            ) : null}
            {result.loadingPct < 50 ? (
              <div style={resultSummaryStyle}>
                <strong>Note:</strong> Breaker loading {result.loadingPct.toFixed(0)}% is low. Consider whether a smaller rating is appropriate.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ElecDeratingPage() {
  const [size, setSize] = useState('25');
  const [install, setInstall] = useState('tray');
  const [tempFactor, setTempFactor] = useState('1.00');
  const [groupFactor, setGroupFactor] = useState('0.65');
  const [soilFactor, setSoilFactor] = useState('1.00');
  const [designCurrent, setDesignCurrent] = useState('');
  const [showResult, setShowResult] = useState(false);

  const result = useMemo(() => {
    const ib = parseFloat(designCurrent) || 0;
    const tf = parseFloat(tempFactor) || 1;
    const gf = parseFloat(groupFactor) || 1;
    const sf = parseFloat(soilFactor) || 1;
    const baseTable = install === 'tray' ? CU_XLPE_TRAY : install === 'air' ? CU_XLPE_AIR : CU_XLPE_CONDUIT;
    const baseCap = baseTable[size] || 84;
    const combined = tf * gf * sf;
    const iz = baseCap * combined;
    let adjSize = size;
    if (ib > iz) {
      for (const s of CABLE_SIZES_MM2) {
        const c = (baseTable[s] || 0) * combined;
        if (c >= ib) {
          adjSize = s.toString();
          break;
        }
      }
    }
    const loading = ib > 0 ? (ib / iz) * 100 : 0;
    return {
      ib,
      baseCap,
      tf,
      gf,
      sf,
      combined,
      iz,
      loading,
      adjSize,
      isOverloaded: ib > iz,
    };
  }, [size, install, tempFactor, groupFactor, soilFactor, designCurrent]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Base Cable & Derating Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Cable size</label>
            <select
              value={size}
              onChange={(e) => {
                setSize(e.target.value);
                setShowResult(false);
              }}
              style={inputStyle}
            >
              {CABLE_SIZES_MM2.map((sz) => (
                <option key={sz} value={sz}>{sz} mm²</option>
              ))}
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Installation method</label>
            <select
              value={install}
              onChange={(e) => {
                setInstall(e.target.value);
                setShowResult(false);
              }}
              style={inputStyle}
            >
              <option value="conduit">In conduit / trunking</option>
              <option value="tray">On cable tray</option>
              <option value="air">In free air</option>
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Ambient temperature factor</label>
            <select
              value={tempFactor}
              onChange={(e) => {
                setTempFactor(e.target.value);
                setShowResult(false);
              }}
              style={inputStyle}
            >
              <option value="1.06">25°C - factor 1.06</option>
              <option value="1.00">30°C - factor 1.00</option>
              <option value="0.94">35°C - factor 0.94</option>
              <option value="0.87">40°C - factor 0.87</option>
              <option value="0.79">45°C - factor 0.79</option>
              <option value="0.71">50°C - factor 0.71</option>
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Grouping factor</label>
            <select
              value={groupFactor}
              onChange={(e) => {
                setGroupFactor(e.target.value);
                setShowResult(false);
              }}
              style={inputStyle}
            >
              <option value="1.00">1 circuit - 1.00</option>
              <option value="0.80">2 circuits - 0.80</option>
              <option value="0.70">3 circuits - 0.70</option>
              <option value="0.65">4–5 circuits - 0.65</option>
              <option value="0.60">6–9 circuits - 0.60</option>
              <option value="0.55">10+ circuits - 0.55</option>
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Soil / burial factor</label>
            <select
              value={soilFactor}
              onChange={(e) => {
                setSoilFactor(e.target.value);
                setShowResult(false);
              }}
              style={inputStyle}
            >
              <option value="1.00">N/A (not buried)</option>
              <option value="1.00">Standard soil - 1.00</option>
              <option value="0.90">Dry soil - 0.90</option>
              <option value="0.80">Very dry soil - 0.80</option>
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Design current required</label>
            <input
              type="number"
              value={designCurrent}
              onChange={(e) => {
                setDesignCurrent(e.target.value);
                setShowResult(false);
              }}
              placeholder="e.g. 60"
              style={inputStyle}
            />
            <span style={inputUnitStyle}>A</span>
          </div>
          <button
            type="button"
            onClick={() => setShowResult(true)}
            style={calculateButtonStyle}
          >
            Apply Derating
          </button>
        </div>
      </div>

      {showResult && result ? (
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelAccentStyle} />
            <div style={panelTitleStyle}>Derating Results</div>
          </div>
          <div style={panelBodyStyle}>
            <ResultRow label="Base current capacity (30°C)" value={`${result.baseCap} A`} />
            <ResultRow label="Temperature factor" value={`${result.tf.toFixed(2)} ×`} />
            <ResultRow label="Grouping factor" value={`${result.gf.toFixed(2)} ×`} />
            <ResultRow label="Soil / burial factor" value={`${result.sf.toFixed(2)} ×`} />
            <ResultRow label="Combined derating factor" value={result.combined.toFixed(3)} />
            <ResultRow label="Derated capacity (Iz)" value={`${result.iz.toFixed(1)} A`} />
            <ResultRow label="Design current (Ib)" value={`${result.ib} A`} />
            <ResultRow label="Loading" value={`${result.loading.toFixed(1)}%`} />
            <ResultRow
              label="Adjusted cable size needed"
              value={result.isOverloaded ? `${result.adjSize} mm² required` : `${size} mm² ✓ adequate`}
            />
            {result.isOverloaded ? (
              <div style={resultSummaryStyle}>
                <strong>Warning:</strong> After derating, {size} mm² carries only {result.iz.toFixed(1)} A but design requires {result.ib} A.
              </div>
            ) : result.loading > 80 ? (
              <div style={resultSummaryStyle}>
                <strong>Note:</strong> Cable loading {result.loading.toFixed(1)}% after derating. Consider the next size up for margin.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ElecConduitPage() {
  const [cables, setCables] = useState([
    { sz: '25', qty: 3 },
    { sz: '6', qty: 1 },
  ]);
  const [showResult, setShowResult] = useState(false);

  const updateCable = (index, field, value) => {
    const updated = cables.map((item, idx) =>
      idx === index ? { ...item, [field]: value } : item
    );
    setCables(updated);
    setShowResult(false);
  };

  const addCable = () => {
    setCables([...cables, { sz: '16', qty: 1 }]);
    setShowResult(false);
  };

  const removeCable = (index) => {
    setCables(cables.filter((_, idx) => idx !== index));
    setShowResult(false);
  };

  const result = useMemo(() => {
    const cableCount = cables.reduce((sum, cable) => sum + (parseInt(cable.qty, 10) || 0), 0);
    if (cableCount === 0) return null;
    const totalArea = cables.reduce((sum, cable) => {
      const od = CABLE_OD[parseInt(cable.sz, 10)] || 18;
      const qty = parseInt(cable.qty, 10) || 0;
      return sum + qty * Math.PI * (od / 2) * (od / 2);
    }, 0);
    const maxFill = cableCount === 1 ? 0.31 : cableCount === 2 ? 0.53 : 0.4;
    const conduitArea = totalArea / maxFill;
    const minConduit = CONDUIT_SIZES.find((d) => Math.PI * (d / 2) * (d / 2) >= conduitArea) || CONDUIT_SIZES[CONDUIT_SIZES.length - 1];
    const actualFill = totalArea / (Math.PI * (minConduit / 2) * (minConduit / 2)) * 100;

    return {
      totalArea,
      cableCount,
      maxFill,
      minConduit,
      actualFill,
    };
  }, [cables]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Cables in Conduit</div>
        </div>
        <div style={panelBodyStyle}>
          {cables.map((cable, index) => (
            <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 40px', gap: 10, alignItems: 'center' }}>
              <select
                value={cable.sz}
                onChange={(e) => updateCable(index, 'sz', e.target.value)}
                style={inputStyle}
              >
                {CABLE_SIZES_MM2.map((sz) => (
                  <option key={sz} value={sz}>{sz} mm²</option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={cable.qty}
                onChange={(e) => updateCable(index, 'qty', e.target.value)}
                style={inputStyle}
              />
              <div style={{ color: '#6B7280', fontSize: '0.9rem' }}>Qty</div>
              <button
                type="button"
                onClick={() => removeCable(index)}
                style={{
                  borderRadius: 12,
                  border: '1px solid #E5E7EB',
                  background: '#F8FAFC',
                  cursor: 'pointer',
                  height: 40,
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addCable}
            style={{ ...calculateButtonStyle, background: 'transparent', color: '#D97706', border: '1px dashed #D97706' }}
          >
            + Add Cable
          </button>
          <button
            type="button"
            onClick={() => setShowResult(true)}
            style={calculateButtonStyle}
          >
            Size Conduit
          </button>
        </div>
      </div>

      {showResult && result ? (
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelAccentStyle} />
            <div style={panelTitleStyle}>Conduit Selection</div>
          </div>
          <div style={panelBodyStyle}>
            <ResultRow label="Total cable area" value={`${result.totalArea.toFixed(0)} mm²`} />
            <ResultRow label="Number of cables" value={`${result.cableCount} cable${result.cableCount !== 1 ? 's' : ''}`} />
            <ResultRow label="Max fill ratio allowed" value={`${(result.maxFill * 100).toFixed(0)}%`} />
            <ResultRow label="Minimum conduit size" value={`${result.minConduit} mm nominal`} />
            <ResultRow label="Actual fill ratio" value={`${result.actualFill.toFixed(1)}%`} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ElecSCPage() {
  const [kva, setKva] = useState('1000');
  const [volt, setVolt] = useState('415');
  const [zPct, setZPct] = useState('5');
  const [zcable, setZcable] = useState('0');
  const [showResult, setShowResult] = useState(false);

  const result = useMemo(() => {
    const kvaNum = parseFloat(kva) || 1000;
    const voltNum = parseFloat(volt) || 415;
    const zPctNum = (parseFloat(zPct) || 5) / 100;
    const zCableNum = (parseFloat(zcable) || 0) / 1000;
    const zTx = (voltNum * voltNum) / (kvaNum * 1000) * zPctNum;
    const zTotal = zTx + zCableNum;
    const iSym = voltNum / (Math.sqrt(3) * zTotal) / 1000;
    const iPeak = iSym * 2.5;
    const faultMVA = (Math.sqrt(3) * voltNum * iSym * 1000) / 1e6;
    return {
      zTx,
      iSym,
      iPeak,
      faultMVA,
    };
  }, [kva, volt, zPct, zcable]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Transformer Data</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Transformer rating</label>
            <select
              value={kva}
              onChange={(e) => {
                setKva(e.target.value);
                setShowResult(false);
              }}
              style={inputStyle}
            >
              {[100, 160, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500].map((value) => (
                <option key={value} value={value}>{value} kVA</option>
              ))}
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Secondary voltage</label>
            <select
              value={volt}
              onChange={(e) => {
                setVolt(e.target.value);
                setShowResult(false);
              }}
              style={inputStyle}
            >
              <option value="415">415 V</option>
              <option value="400">400 V</option>
              <option value="480">480 V</option>
              <option value="208">208 V</option>
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Transformer impedance (Z%)</label>
            <select
              value={zPct}
              onChange={(e) => {
                setZPct(e.target.value);
                setShowResult(false);
              }}
              style={inputStyle}
            >
              <option value="4">4% (small TX)</option>
              <option value="5">5% (standard)</option>
              <option value="6">6% (large TX)</option>
              <option value="7">7% (large TX)</option>
              <option value="8">8%</option>
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Cable to fault point</label>
            <input
              type="number"
              value={zcable}
              onChange={(e) => {
                setZcable(e.target.value);
                setShowResult(false);
              }}
              placeholder="mΩ"
              style={inputStyle}
            />
            <span style={inputUnitStyle}>mΩ</span>
          </div>
          <button
            type="button"
            onClick={() => setShowResult(true)}
            style={calculateButtonStyle}
          >
            Estimate Fault Current
          </button>
        </div>
      </div>

      {showResult && result ? (
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelAccentStyle} />
            <div style={panelTitleStyle}>Fault Current (Simplified)</div>
          </div>
          <div style={panelBodyStyle}>
            <ResultRow label="Transformer impedance (Ω)" value={`${(result.zTx * 1000).toFixed(3)} mΩ (TX only)`} />
            <ResultRow label="Symmetrical fault current" value={`${result.iSym.toFixed(2)} kA`} />
            <ResultRow label="Asymmetrical peak" value={`${result.iPeak.toFixed(2)} kA (est. ×2.5)`} />
            <ResultRow label="Fault MVA" value={`${result.faultMVA.toFixed(2)} MVA`} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ElecLoadPage() {
  // Load categories: Lighting, Receptacles, HVAC, Motors, Special loads
  const [ltg, setLtg] = useState('50');
  const [dfLtg, setDfLtg] = useState('1.0');
  const [rec, setRec] = useState('30');
  const [dfRec, setDfRec] = useState('0.5');
  const [hvac, setHvac] = useState('60');
  const [dfHvac, setDfHvac] = useState('0.75');
  const [mot, setMot] = useState('80');
  const [dfMot, setDfMot] = useState('0.7');
  const [spl, setSpl] = useState('0');
  const [dfSpl, setDfSpl] = useState('1.0');
  const [divFactor, setDivFactor] = useState('0.8');
  const [pf, setPF] = useState('0.9');
  const [voltage, setVoltage] = useState('480');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const lVal = parseFloat(ltg) || 0;
    const rVal = parseFloat(rec) || 0;
    const hVal = parseFloat(hvac) || 0;
    const mVal = parseFloat(mot) || 0;
    const sVal = parseFloat(spl) || 0;

    const dfL = parseFloat(dfLtg) || 1.0;
    const dfR = parseFloat(dfRec) || 0.5;
    const dfH = parseFloat(dfHvac) || 0.75;
    const dfM = parseFloat(dfMot) || 0.7;
    const dfS = parseFloat(dfSpl) || 1.0;

    const div = parseFloat(divFactor) || 0.8;
    const pforce = parseFloat(pf) || 0.9;
    const V = parseFloat(voltage) || 480;

    const connected = lVal + rVal + hVal + mVal + sVal;
    const dL = lVal * dfL;
    const dR = rVal * dfR;
    const dH = hVal * dfH;
    const dM = mVal * dfM;
    const dS = sVal * dfS;
    const demandRaw = dL + dR + dH + dM + dS;
    const demand = demandRaw * div;
    const kva = demand / pforce;
    const isThreePhase = V === 208 || V === 480;
    const current = (kva * 1000) / (V * (isThreePhase ? Math.sqrt(3) : 1));

    setResult({
      connected: connected.toFixed(1),
      dL: dL.toFixed(1),
      dR: dR.toFixed(1),
      dH: dH.toFixed(1),
      dM: dM.toFixed(1),
      dS: dS.toFixed(1),
      demandRaw: demandRaw.toFixed(1),
      demand: demand.toFixed(1),
      kva: kva.toFixed(1),
      current: current.toFixed(1),
      phase: isThreePhase ? '3-phase' : '1-phase',
    });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Load Categories</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 80px auto 70px', gap: 12, alignItems: 'center', fontSize: '0.9rem' }}>
            <label style={labelStyle}>Lighting (kW)</label>
            <input type="number" value={ltg} onChange={(e) => setLtg(e.target.value)} style={inputStyle} placeholder="0" />
            <label style={labelStyle}>DF</label>
            <input type="number" value={dfLtg} onChange={(e) => setDfLtg(e.target.value)} step="0.1" style={inputStyle} placeholder="1.0" />

            <label style={labelStyle}>Receptacles (kW)</label>
            <input type="number" value={rec} onChange={(e) => setRec(e.target.value)} style={inputStyle} placeholder="0" />
            <label style={labelStyle}>DF</label>
            <input type="number" value={dfRec} onChange={(e) => setDfRec(e.target.value)} step="0.1" style={inputStyle} placeholder="0.5" />

            <label style={labelStyle}>HVAC (kW)</label>
            <input type="number" value={hvac} onChange={(e) => setHvac(e.target.value)} style={inputStyle} placeholder="0" />
            <label style={labelStyle}>DF</label>
            <input type="number" value={dfHvac} onChange={(e) => setDfHvac(e.target.value)} step="0.1" style={inputStyle} placeholder="0.75" />

            <label style={labelStyle}>Motors (kW)</label>
            <input type="number" value={mot} onChange={(e) => setMot(e.target.value)} style={inputStyle} placeholder="0" />
            <label style={labelStyle}>DF</label>
            <input type="number" value={dfMot} onChange={(e) => setDfMot(e.target.value)} step="0.1" style={inputStyle} placeholder="0.7" />

            <label style={labelStyle}>Special (kW)</label>
            <input type="number" value={spl} onChange={(e) => setSpl(e.target.value)} style={inputStyle} placeholder="0" />
            <label style={labelStyle}>DF</label>
            <input type="number" value={dfSpl} onChange={(e) => setDfSpl(e.target.value)} step="0.1" style={inputStyle} placeholder="1.0" />
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>System Parameters</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Diversity Factor</label>
            <input type="number" value={divFactor} onChange={(e) => setDivFactor(e.target.value)} step="0.05" style={inputStyle} placeholder="0.8" />
            <span style={inputUnitStyle}>fraction</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Power Factor</label>
            <input type="number" value={pf} onChange={(e) => setPF(e.target.value)} step="0.05" style={inputStyle} placeholder="0.9" />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Supply Voltage</label>
            <select value={voltage} onChange={(e) => setVoltage(e.target.value)} style={inputStyle}>
              <option value="120">120V Single Phase</option>
              <option value="208">208V Three Phase</option>
              <option value="277">277V Single Phase</option>
              <option value="480">480V Three Phase</option>
            </select>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, background: '#FBBF24', color: '#111827', marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Calculate Demand
        </button>
      </div>

      {result && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelAccentStyle} />
              <div style={panelTitleStyle}>Load Breakdown</div>
            </div>
            <div style={panelBodyStyle}>
              <ResultRow label="Lighting (with DF)" value={`${result.dL} kW`} />
              <ResultRow label="Receptacles (with DF)" value={`${result.dR} kW`} />
              <ResultRow label="HVAC (with DF)" value={`${result.dH} kW`} />
              <ResultRow label="Motors (with DF)" value={`${result.dM} kW`} />
              <ResultRow label="Special (with DF)" value={`${result.dS} kW`} />
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <div style={panelStyle}>
              <div style={panelHeaderStyle}>
                <div style={panelAccentStyle} />
                <div style={panelTitleStyle}>Total Load Results</div>
              </div>
              <div style={panelBodyStyle}>
                <ResultRow label="Connected Load" value={`${result.connected} kW`} />
                <ResultRow label="Sum of Individual Demand Loads" value={`${result.demandRaw} kW`} />
                <ResultRow label="Total Demand (with Diversity)" value={`${result.demand} kW`} />
                <ResultRow label="Apparent Power (kVA)" value={`${result.kva} kVA`} />
                <ResultRow label="Design Current" value={`${result.current} A (${result.phase})`} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ElecCablePage() {
  const [current, setCurrent] = useState('50');
  const [material, setMaterial] = useState('cu');
  const [tempF, setTempF] = useState('1.0');
  const [groupF, setGroupF] = useState('1.0');
  const [length, setLength] = useState('100');
  const [voltage, setVoltage] = useState('480');
  const [result, setResult] = useState(null);

  const ampacityTable = {
    cu: { '14': 20, '12': 25, '10': 30, '8': 40, '6': 55, '4': 70, '2': 95, '1': 110, '1/0': 125, '2/0': 145, '3/0': 165, '4/0': 195 },
    al: { '12': 20, '10': 25, '8': 30, '6': 40, '4': 55, '2': 70, '1': 85, '1/0': 100, '2/0': 115, '3/0': 135, '4/0': 155 },
  };

  const resistancePerKm = {
    cu: { '14': 12.6, '12': 8.2, '10': 5.2, '8': 2.6, '6': 1.7, '4': 1.0, '2': 0.65, '1': 0.52, '1/0': 0.41, '2/0': 0.32, '3/0': 0.26, '4/0': 0.20 },
    al: { '12': 13.5, '10': 8.6, '8': 4.3, '6': 2.8, '4': 1.7, '2': 1.1, '1': 0.87, '1/0': 0.68, '2/0': 0.54, '3/0': 0.44, '4/0': 0.34 },
  };

  const sizes = ['14', '12', '10', '8', '6', '4', '2', '1', '1/0', '2/0', '3/0', '4/0'];

  const calculate = () => {
    const I = parseFloat(current) || 50;
    const temp = parseFloat(tempF) || 1.0;
    const group = parseFloat(groupF) || 1.0;
    const L = parseFloat(length) || 100;
    const V = parseFloat(voltage) || 480;

    const totalDerate = temp * group;
    const reqCap = I / totalDerate;

    let selectedSize = null;
    const table = ampacityTable[material] || ampacityTable.cu;
    for (const sz of sizes) {
      if ((table[sz] || 0) >= reqCap) {
        selectedSize = sz;
        break;
      }
    }
    if (!selectedSize) selectedSize = 'Parallel cables required';

    const ratedCap = table[selectedSize] || 0;
    const deratedCap = ratedCap * totalDerate;
    const loading = deratedCap > 0 ? (I / deratedCap) * 100 : 0;

    const rTable = resistancePerKm[material] || resistancePerKm.cu;
    const r = rTable[selectedSize] || 0.2;
    const vdV = (Math.sqrt(3) * I * L * (r / 1000)) / 1000;
    const vdPct = (vdV / V) * 100;

    setResult({
      minSize: selectedSize,
      ratedCap: ratedCap.toFixed(0),
      derate: totalDerate.toFixed(3),
      deratedCap: deratedCap.toFixed(1),
      loading: loading.toFixed(1),
      vdV: vdV.toFixed(2),
      vdPct: vdPct.toFixed(2),
      warning: loading > 100 ? 'Overloaded - increase size' : loading > 80 ? 'High loading - consider next size' : 'OK',
    });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Cable Sizing Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Design Current</label>
            <input type="number" value={current} onChange={(e) => setCurrent(e.target.value)} style={inputStyle} placeholder="e.g. 50" />
            <span style={inputUnitStyle}>A</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Conductor Material</label>
            <select value={material} onChange={(e) => setMaterial(e.target.value)} style={inputStyle}>
              <option value="cu">Copper</option>
              <option value="al">Aluminum</option>
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Temperature Derating Factor</label>
            <input type="number" value={tempF} onChange={(e) => setTempF(e.target.value)} step="0.05" style={inputStyle} placeholder="1.0" />
            <span style={inputUnitStyle}>fraction</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Group/Conduit Derating Factor</label>
            <input type="number" value={groupF} onChange={(e) => setGroupF(e.target.value)} step="0.05" style={inputStyle} placeholder="1.0" />
            <span style={inputUnitStyle}>fraction</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Cable Run Length</label>
            <input type="number" value={length} onChange={(e) => setLength(e.target.value)} style={inputStyle} placeholder="e.g. 100" />
            <span style={inputUnitStyle}>m</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>System Voltage</label>
            <input type="number" value={voltage} onChange={(e) => setVoltage(e.target.value)} style={inputStyle} placeholder="e.g. 480" />
            <span style={inputUnitStyle}>V</span>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, background: '#FBBF24', color: '#111827', marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Size Cable
        </button>
      </div>

      {result && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelAccentStyle} />
              <div style={panelTitleStyle}>Cable Selection</div>
            </div>
            <div style={panelBodyStyle}>
              <ResultRow label="Recommended AWG/mm²" value={result.minSize} />
              <ResultRow label="Rated Capacity" value={`${result.ratedCap} A`} />
              <ResultRow label="Total Derating Factor" value={`${result.derate} (temp × group)`} />
              <ResultRow label="Derated Capacity" value={`${result.deratedCap} A`} />
              <ResultRow label="Cable Loading" value={`${result.loading}%`} />
              <ResultRow label="Voltage Drop" value={`${result.vdV} V (${result.vdPct}%)`} />
              {result.warning !== 'OK' && (
                <p style={{ color: result.loading > 100 ? '#DC2626' : '#D97706', marginTop: 12, fontWeight: 600 }}>
                  ⚠ {result.warning}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ElecVdropPage() {
  const [phase, setPhase] = useState('three');
  const [voltage, setVoltage] = useState('480');
  const [current, setElecCurrent] = useState('50');
  const [cableSize, setCableSize] = useState('25');
  const [material, setMaterial] = useState('cu');
  const [temperature, setTemperature] = useState('75');
  const [length, setElecLength] = useState('100');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const I = parseFloat(current) || 50;
    const L = parseFloat(length) || 100;
    const V = parseFloat(voltage) || 480;
    const sz = parseFloat(cableSize) || 25;
    const T = parseFloat(temperature) || 75;

    const rho20 = material === 'cu' ? 0.01724 : 0.02830;
    const alpha = material === 'cu' ? 0.00393 : 0.00403;
    const rhoT = rho20 * (1 + alpha * (T - 20));
    const RcPerKm = (rhoT / sz) * 1000;
    const Rc = rhoT / sz;

    const multFactor = phase === 'three' ? Math.sqrt(3) : 2;
    const vdV = multFactor * I * L * Rc;
    const vdPct = (vdV / V) * 100;
    const recvV = V - vdV;

    const ok3 = vdPct <= 3;
    const ok5 = vdPct <= 5;

    setResult({
      resistance: RcPerKm.toFixed(4),
      vdV: vdV.toFixed(3),
      vdPct: vdPct.toFixed(2),
      recvV: recvV.toFixed(1),
      ok3: ok3 ? '✓ Within 3%' : `✗ Exceeds 3% (${vdPct.toFixed(2)}%)`,
      ok5: ok5 ? '✓ Within 5%' : `✗ EXCEEDS 5% (${vdPct.toFixed(2)}%)`,
      color3: ok3 ? '#059669' : '#D97706',
      color5: ok5 ? '#059669' : '#DC2626',
    });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Circuit Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Phase Type</label>
            <div style={chipRowStyle}>
              {['Three Phase', 'Single Phase'].map((label, idx) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setPhase(idx === 0 ? 'three' : 'single')}
                  style={{
                    ...chipStyle,
                    background: (idx === 0 ? phase === 'three' : phase === 'single') ? '#FBBF24' : '#E5E7EB',
                    color: '#111827',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>System Voltage</label>
            <select value={voltage} onChange={(e) => setVoltage(e.target.value)} style={inputStyle}>
              <option value="120">120V</option>
              <option value="208">208V</option>
              <option value="230">230V</option>
              <option value="277">277V</option>
              <option value="400">400V</option>
              <option value="415">415V</option>
              <option value="480">480V</option>
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Design Current</label>
            <input type="number" value={current} onChange={(e) => setElecCurrent(e.target.value)} style={inputStyle} placeholder="e.g. 50" />
            <span style={inputUnitStyle}>A</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Cable Length (one-way)</label>
            <input type="number" value={length} onChange={(e) => setElecLength(e.target.value)} style={inputStyle} placeholder="e.g. 100" />
            <span style={inputUnitStyle}>m</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Cable Size</label>
            <select value={cableSize} onChange={(e) => setCableSize(e.target.value)} style={inputStyle}>
              <option value="1.5">1.5 mm²</option>
              <option value="2.5">2.5 mm²</option>
              <option value="4">4 mm²</option>
              <option value="6">6 mm²</option>
              <option value="10">10 mm²</option>
              <option value="16">16 mm²</option>
              <option value="25">25 mm²</option>
              <option value="35">35 mm²</option>
              <option value="50">50 mm²</option>
              <option value="70">70 mm²</option>
              <option value="95">95 mm²</option>
              <option value="120">120 mm²</option>
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Conductor Material</label>
            <div style={chipRowStyle}>
              {['Copper', 'Aluminum'].map((label, idx) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setMaterial(idx === 0 ? 'cu' : 'al')}
                  style={{
                    ...chipStyle,
                    background: (idx === 0 ? material === 'cu' : material === 'al') ? '#FBBF24' : '#E5E7EB',
                    color: '#111827',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Operating Temperature</label>
            <input type="number" value={temperature} onChange={(e) => setTemperature(e.target.value)} style={inputStyle} placeholder="e.g. 75" />
            <span style={inputUnitStyle}>°C</span>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, background: '#FBBF24', color: '#111827', marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Calculate Voltage Drop
        </button>
      </div>

      {result && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelAccentStyle} />
              <div style={panelTitleStyle}>Voltage Drop Results</div>
            </div>
            <div style={panelBodyStyle}>
              <ResultRow label="Conductor Resistance at Temperature" value={`${result.resistance} Ω/km`} />
              <ResultRow label="Voltage Drop (V)" value={`${result.vdV} V`} />
              <ResultRow label="Voltage Drop (%)" value={`${result.vdPct}%`} />
              <ResultRow label="Receiving End Voltage" value={`${result.recvV} V`} />
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 500 }}>IEC 3% Limit Status</span>
                  <span style={{ color: result.color3, fontWeight: 700 }}>{result.ok3}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 500 }}>IEC 5% Limit Status</span>
                  <span style={{ color: result.color5, fontWeight: 700 }}>{result.ok5}</span>
                </div>
              </div>
              {result.vdPct > 5 && (
                <p style={{ color: '#DC2626', marginTop: 12, fontWeight: 600 }}>
                  ⚠ Voltage drop exceeds IEC 5% limit. Increase cable size or reduce run length.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ElecCurrentPage() {
  const [phase, setPhase] = useState('three');
  const [mode, setMode] = useState('kw');
  const [power, setPower] = useState('50');
  const [pf, setPf] = useState('0.85');
  const [voltage, setVoltage] = useState('415');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const P = parseFloat(power) || 0;
    const powerFactor = parseFloat(pf) || 0.85;
    const V = parseFloat(voltage) || 415;
    let current = 0;
    let kva = 0;
    let kw = 0;
    let kvar = 0;
    let formula = '';

    if (mode === 'kw') {
      kw = P;
      kva = kw / powerFactor;
      kvar = Math.sqrt(Math.max(0, kva * kva - kw * kw));
      if (phase === 'three') {
        current = (kva * 1000) / (Math.sqrt(3) * V);
        formula = 'I = kW × 1000 / (√3 × V × PF)';
      } else {
        current = (kva * 1000) / V;
        formula = 'I = kW × 1000 / (V × PF)';
      }
    } else {
      kva = P;
      kw = kva * powerFactor;
      kvar = Math.sqrt(Math.max(0, kva * kva - kw * kw));
      if (phase === 'three') {
        current = (kva * 1000) / (Math.sqrt(3) * V);
        formula = 'I = kVA × 1000 / (√3 × V)';
      } else {
        current = (kva * 1000) / V;
        formula = 'I = kVA × 1000 / V';
      }
    }

    setResult({ current: current.toFixed(2), kva: kva.toFixed(2), kw: kw.toFixed(2), kvar: kvar.toFixed(2), formula });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Current Calculator</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Phase</label>
            <div style={chipRowStyle}>
              {['three', 'single'].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPhase(value)}
                  style={{
                    ...chipStyle,
                    background: phase === value ? '#FBBF24' : '#E5E7EB',
                    color: '#111827',
                  }}
                >
                  {value === 'three' ? 'Three Phase' : 'Single Phase'}
                </button>
              ))}
            </div>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Input Mode</label>
            <div style={chipRowStyle}>
              {['kw', 'kva'].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  style={{
                    ...chipStyle,
                    background: mode === value ? '#FBBF24' : '#E5E7EB',
                    color: '#111827',
                  }}
                >
                  {value === 'kw' ? 'kW (active)' : 'kVA (apparent)'}
                </button>
              ))}
            </div>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>{mode === 'kw' ? 'Active Power' : 'Apparent Power'}</label>
            <input type="number" value={power} onChange={(e) => setPower(e.target.value)} style={inputStyle} placeholder="e.g. 50" />
            <span style={inputUnitStyle}>{mode === 'kw' ? 'kW' : 'kVA'}</span>
          </div>
          {mode === 'kw' && (
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Power Factor</label>
              <input type="number" value={pf} onChange={(e) => setPf(e.target.value)} step="0.05" style={inputStyle} placeholder="e.g. 0.85" />
            </div>
          )}
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Voltage</label>
            <select value={voltage} onChange={(e) => setVoltage(e.target.value)} style={inputStyle}>
              <option value="120">120 V</option>
              <option value="208">208 V</option>
              <option value="230">230 V</option>
              <option value="277">277 V</option>
              <option value="400">400 V</option>
              <option value="415">415 V</option>
              <option value="480">480 V</option>
            </select>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, background: '#FBBF24', color: '#111827', marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Calculate Current
        </button>
      </div>

      {result && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelAccentStyle} />
              <div style={panelTitleStyle}>Results</div>
            </div>
            <div style={panelBodyStyle}>
              <ResultRow label="Calculated Current" value={`${result.current} A`} />
              <ResultRow label="Apparent Power" value={`${result.kva} kVA`} />
              <ResultRow label="Active Power" value={`${result.kw} kW`} />
              <ResultRow label="Reactive Power" value={`${result.kvar} kVAR`} />
              <ResultRow label="Calculation Formula" value={result.formula} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ElecVdOptPage() {
  const [ib, setIb] = useState('50');
  const [length, setLength] = useState('100');
  const [voltage, setVoltage] = useState('415');
  const [limit, setLimit] = useState('3');
  const [phase, setPhase] = useState('three');
  const [material, setMaterial] = useState('cu');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const I = parseFloat(ib) || 0;
    const L = parseFloat(length) || 0;
    const V = parseFloat(voltage) || 415;
    const maxPct = parseFloat(limit) || 3;
    const rho20 = material === 'cu' ? 0.01724 : 0.02830;
    const mult = phase === 'three' ? Math.sqrt(3) : 2;
    const table = material === 'cu' ? CU_XLPE_CONDUIT : AL_XLPE_CONDUIT;

    const rows = CABLE_SIZES_MM2.map((sz) => {
      const Rc = rho20 / sz;
      const vdV = mult * I * L * Rc;
      const vdPct = (vdV / V) * 100;
      const cap = table[sz] || 0;
      const capOk = cap >= I;
      const vdOk = vdPct <= maxPct;
      const pass = capOk && vdOk;
      return {
        sz,
        cap,
        vdV: vdV.toFixed(2),
        vdPct: vdPct.toFixed(2),
        capOk,
        vdOk,
        pass,
      };
    });

    const choice = rows.find((r) => r.pass) || rows[rows.length - 1];
    setResult({ choice, rows, voltage: V, phase, limit: maxPct });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Optimization Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Design Current</label>
            <input type="number" value={ib} onChange={(e) => setIb(e.target.value)} style={inputStyle} placeholder="e.g. 50" />
            <span style={inputUnitStyle}>A</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Circuit Length</label>
            <input type="number" value={length} onChange={(e) => setLength(e.target.value)} style={inputStyle} placeholder="e.g. 100" />
            <span style={inputUnitStyle}>m</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>System Voltage</label>
            <input type="number" value={voltage} onChange={(e) => setVoltage(e.target.value)} style={inputStyle} placeholder="e.g. 415" />
            <span style={inputUnitStyle}>V</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Maximum Voltage Drop</label>
            <input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} style={inputStyle} placeholder="e.g. 3" />
            <span style={inputUnitStyle}>%</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Phase</label>
            <div style={chipRowStyle}>
              {['three', 'single'].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPhase(value)}
                  style={{
                    ...chipStyle,
                    background: phase === value ? '#FBBF24' : '#E5E7EB',
                    color: '#111827',
                  }}
                >
                  {value === 'three' ? 'Three Phase' : 'Single Phase'}
                </button>
              ))}
            </div>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Conductor Material</label>
            <div style={chipRowStyle}>
              {['cu', 'al'].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMaterial(value)}
                  style={{
                    ...chipStyle,
                    background: material === value ? '#FBBF24' : '#E5E7EB',
                    color: '#111827',
                  }}
                >
                  {value === 'cu' ? 'Copper' : 'Aluminum'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, background: '#FBBF24', color: '#111827', marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Optimize Cable Size
        </button>
      </div>

      {result && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelAccentStyle} />
              <div style={panelTitleStyle}>Recommended Cable</div>
            </div>
            <div style={panelBodyStyle}>
              <ResultRow label="Selected Size" value={`${result.choice.sz} mm²`} />
              <ResultRow label="Required Rating" value={`${result.choice.cap} A`} />
              <ResultRow label="Voltage Drop" value={`${result.choice.vdPct} %`} />
              <ResultRow label="Voltage Drop (V)" value={`${result.choice.vdV} V`} />
              <ResultRow label="Pass Status" value={result.choice.pass ? 'OK' : 'No standard size satisfies both limits'} />
            </div>
          </div>
          <div style={{ marginTop: 16, gridColumn: '1 / -1' }}>
            <div style={panelStyle}>
              <div style={panelHeaderStyle}>
                <div style={panelAccentStyle} />
                <div style={panelTitleStyle}>Cable Comparison Table</div>
              </div>
              <div style={panelBodyStyle}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 70px 70px', gap: 8, fontWeight: 700, marginBottom: 8 }}>
                  <div>Size (mm²)</div>
                  <div>Iz (A)</div>
                  <div>VD (%)</div>
                  <div>Cap OK</div>
                  <div>Status</div>
                </div>
                {result.rows.map((row) => (
                  <div key={row.sz} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 70px 70px', gap: 8, padding: '6px 0', borderTop: '1px solid #E5E7EB', background: row.pass ? 'rgba(251,191,36,0.08)' : 'transparent' }}>
                    <div>{row.sz}</div>
                    <div>{row.cap}</div>
                    <div>{row.vdPct}</div>
                    <div>{row.capOk ? '✓' : '✗'}</div>
                    <div>{row.pass ? 'OK' : '-'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TransformerPage() {
  const [kw, setKw] = useState('350');
  const [pf, setPf] = useState('0.85');
  const [div, setDiv] = useState('0.80');
  const [fut, setFut] = useState('1.20');
  const [sf, setSf] = useState('10');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const P = parseFloat(kw) || 0;
    const pfVal = parseFloat(pf) || 0.85;
    const divVal = parseFloat(div) || 0.8;
    const futVal = parseFloat(fut) || 1.2;
    const sfVal = 1 + (parseFloat(sf) || 10) / 100;
    const kvaReq = (P * futVal) / (pfVal * divVal) * sfVal;
    const stdSize = nextStandardSize(TRANSFORMER_STD_SIZES, kvaReq);
    const loadPct = (P / (pfVal * divVal)) / stdSize * 100;

    setResult({
      kvaReq: kvaReq.toFixed(1),
      stdSize,
      loadPct: loadPct.toFixed(1),
      headroom: (stdSize - kvaReq).toFixed(1),
    });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Transformer Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Connected Load</label>
            <input type="number" value={kw} onChange={(e) => setKw(e.target.value)} style={inputStyle} placeholder="e.g. 350" />
            <span style={inputUnitStyle}>kW</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Power Factor</label>
            <input type="number" value={pf} onChange={(e) => setPf(e.target.value)} step="0.05" style={inputStyle} placeholder="e.g. 0.85" />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Diversity Factor</label>
            <input type="number" value={div} onChange={(e) => setDiv(e.target.value)} step="0.05" style={inputStyle} placeholder="e.g. 0.80" />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Future Growth Factor</label>
            <input type="number" value={fut} onChange={(e) => setFut(e.target.value)} step="0.05" style={inputStyle} placeholder="e.g. 1.20" />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Safety Margin</label>
            <input type="number" value={sf} onChange={(e) => setSf(e.target.value)} style={inputStyle} placeholder="e.g. 10" />
            <span style={inputUnitStyle}>%</span>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, background: '#FBBF24', color: '#111827', marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Size Transformer
        </button>
      </div>

      {result && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelAccentStyle} />
              <div style={panelTitleStyle}>Transformer Summary</div>
            </div>
            <div style={panelBodyStyle}>
              <ResultRow label="Required kVA" value={`${result.kvaReq} kVA`} />
              <ResultRow label="Standard Size" value={`${result.stdSize} kVA`} />
              <ResultRow label="Load on Standard Size" value={`${result.loadPct} %`} />
              <ResultRow label="Headroom" value={`${result.headroom} kVA`} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ElecPanelPage() {
  const [voltage, setVoltage] = useState('415');
  const [pf, setPf] = useState('0.90');
  const [circuits, setCircuits] = useState([
    { name: 'Lighting L1', kw: '5', df: '0.85' },
    { name: 'Power L1', kw: '10', df: '0.75' },
    { name: 'HVAC AHU-01', kw: '15', df: '0.65' },
    { name: 'Spare', kw: '0', df: '1.0' },
  ]);

  const updateCircuit = (index, field, value) => {
    setCircuits((current) => current.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)));
  };

  const addCircuit = () => {
    setCircuits((current) => [...current, { name: 'New circuit', kw: '0', df: '1.0' }]);
  };

  const removeCircuit = (index) => {
    setCircuits((current) => current.filter((_, idx) => idx !== index));
  };

  const summary = useMemo(() => {
    const connected = circuits.reduce((sum, item) => sum + (parseFloat(item.kw) || 0), 0);
    const demand = circuits.reduce((sum, item) => sum + ((parseFloat(item.kw) || 0) * (parseFloat(item.df) || 1)), 0);
    const kva = demand / (parseFloat(pf) || 1);
    const isThree = ['208', '400', '415', '480'].includes(voltage);
    const current = (kva * 1000) / (isThree ? Math.sqrt(3) * parseFloat(voltage) : parseFloat(voltage));
    return {
      connected: connected.toFixed(1),
      demand: demand.toFixed(1),
      kva: kva.toFixed(1),
      current: current.toFixed(1),
      phase: isThree ? 'Three-phase' : 'Single-phase',
    };
  }, [circuits, pf, voltage]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Panel Circuits</div>
        </div>
        <div style={panelBodyStyle}>
          {circuits.map((circuit, index) => (
            <div key={index} style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 0.8fr 0.6fr', gap: 12, alignItems: 'center', marginBottom: 10 }}>
              <input
                type="text"
                value={circuit.name}
                onChange={(e) => updateCircuit(index, 'name', e.target.value)}
                style={{ ...inputStyle, width: '100%' }}
                placeholder="Circuit name"
              />
              <input
                type="number"
                value={circuit.kw}
                onChange={(e) => updateCircuit(index, 'kw', e.target.value)}
                style={inputStyle}
                placeholder="kW"
              />
              <input
                type="number"
                value={circuit.df}
                onChange={(e) => updateCircuit(index, 'df', e.target.value)}
                step="0.05"
                style={inputStyle}
                placeholder="DF"
              />
              <button type="button" onClick={() => removeCircuit(index)} style={{ ...calculateButtonStyle, background: '#DC2626', padding: '8px 12px' }}>
                ×
              </button>
            </div>
          ))}
          <button type="button" onClick={addCircuit} style={{ ...calculateButtonStyle, background: '#FBBF24', color: '#111827', width: '100%', marginTop: 8 }}>
            + Add Circuit
          </button>
        </div>
      </div>

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Panel Parameters</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Supply Voltage</label>
            <select value={voltage} onChange={(e) => setVoltage(e.target.value)} style={inputStyle}>
              <option value="120">120 V</option>
              <option value="208">208 V</option>
              <option value="230">230 V</option>
              <option value="277">277 V</option>
              <option value="400">400 V</option>
              <option value="415">415 V</option>
              <option value="480">480 V</option>
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Power Factor</label>
            <input type="number" value={pf} onChange={(e) => setPf(e.target.value)} step="0.05" style={inputStyle} placeholder="0.90" />
          </div>
        </div>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelAccentStyle} />
            <div style={panelTitleStyle}>Panel Summary</div>
          </div>
          <div style={panelBodyStyle}>
            <ResultRow label="Connected Load" value={`${summary.connected} kW`} />
            <ResultRow label="Demand Load" value={`${summary.demand} kW`} />
            <ResultRow label="Apparent Power" value={`${summary.kva} kVA`} />
            <ResultRow label="Design Current" value={`${summary.current} A (${summary.phase})`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function GeneratorSizingPage() {
  const [connectedLoad, setConnectedLoad] = useState('');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcGeneratorSizing({ connectedLoad, demandFactor: '0.7', diversityFactor: '1.0', growthFactor: '1.0', pf: '0.8' });
  }, [result, connectedLoad]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Generator Sizing</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Connected Load (kW)</label>
            <input type="number" value={connectedLoad} onChange={(e) => setConnectedLoad(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Required kVA" value={calcResult.selectedGeneratorKVA} />
          </div>
        </div>
      )}
    </div>
  );
}

function MotorStartingCurrentPage() {
  const [motorHP, setMotorHP] = useState('');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcMotorStartingCurrent({ motorHP, voltage: '460', starterType: 'full', isIP: true });
  }, [result, motorHP]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Motor Starting Current</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Motor HP</label>
            <input type="number" value={motorHP} onChange={(e) => setMotorHP(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Inrush Current" value={calcResult.inrushCurrent} />
          </div>
        </div>
      )}
    </div>
  );
}

function PFCorrectionPage() {
  const [activePower, setActivePower] = useState('');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcPFCorrection({ activePower, currentPF: '0.75', targetPF: '0.95', voltage: '460', frequency: '60' });
  }, [result, activePower]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>PF Correction</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Active Power (kW)</label>
            <input type="number" value={activePower} onChange={(e) => setActivePower(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Capacitor kVAR" value={calcResult.capacitorKVAR} />
          </div>
        </div>
      )}
    </div>
  );
}

function LightingLumenPage() {
  const [roomArea, setRoomArea] = useState('');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcLightingLumen({ roomArea, luxRequired: '400', roomType: 'office', maintenanceFactor: '0.8' });
  }, [result, roomArea]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Lighting (Lumen)</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Room Area (ft²)</label>
            <input type="number" value={roomArea} onChange={(e) => setRoomArea(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Lumens Required" value={calcResult.lumensRequired} />
          </div>
        </div>
      )}
    </div>
  );
}

function LuxRecommendationPage() {
  const [spaceType, setSpaceType] = useState('general');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcLuxRecommendation({ spaceType });
  }, [result, spaceType]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Lux Recommendation</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Space Type</label>
            <select value={spaceType} onChange={(e) => setSpaceType(e.target.value)} style={inputStyle}>
              <option value="general">General</option>
              <option value="office">Office</option>
              <option value="retail">Retail</option>
              <option value="warehouse">Warehouse</option>
            </select>
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Recommended Lux" value={calcResult.recommendedLux} />
          </div>
        </div>
      )}
    </div>
  );
}

function EarthingResistancePage() {
  const [rodLength, setRodLength] = useState('');
  const [rodDiameter, setRodDiameter] = useState('');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcEarthingResistance({ rodLength, rodDiameter, soilResistivity: '100', rodCount: '1', isIP: true });
  }, [result, rodLength, rodDiameter]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Earthing Resistance</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Rod Length (ft)</label>
            <input type="number" value={rodLength} onChange={(e) => setRodLength(e.target.value)} style={inputStyle} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Rod Diameter (in)</label>
            <input type="number" value={rodDiameter} onChange={(e) => setRodDiameter(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Total Resistance" value={calcResult.totalResistance} />
          </div>
        </div>
      )}
    </div>
  );
}

function BatteryUPSPage() {
  const [loadPower, setLoadPower] = useState('');
  const [backupDuration, setBackupDuration] = useState('2');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcBatteryUPS({ loadPower, backupDuration, batteryVoltage: '120', roundTripEfficiency: '90' });
  }, [result, loadPower, backupDuration]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Battery / UPS</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Load Power (kW)</label>
            <input type="number" value={loadPower} onChange={(e) => setLoadPower(e.target.value)} style={inputStyle} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Backup Duration (hrs)</label>
            <input type="number" value={backupDuration} onChange={(e) => setBackupDuration(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Battery Capacity" value={`${calcResult.batteryCapacityKWh} kWh`} />
          </div>
        </div>
      )}
    </div>
  );
}

function EnergyConsumptionPage() {
  const [power, setPower] = useState('');
  const [operatingHours, setOperatingHours] = useState('8760');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcEnergyConsumption({ power, operatingHours, peakRate: '0.12', offPeakRate: '0.08', peakPercentage: '50' });
  }, [result, power, operatingHours]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Energy Consumption</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Power (kW)</label>
            <input type="number" value={power} onChange={(e) => setPower(e.target.value)} style={inputStyle} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Operating Hours</label>
            <input type="number" value={operatingHours} onChange={(e) => setOperatingHours(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Total Cost" value={`$${calcResult.totalCost}`} />
          </div>
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// FIRE TOOLS
// ══════════════════════════════════════════════════════════════════════════════

function KFactorPage() {
  const [solveFor, setSolveFor] = useState('Q');
  const [kValue, setKValue] = useState('5.6');
  const [knownValue, setKnownValue] = useState('30');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const K = parseFloat(kValue) || 5.6;
    const known = parseFloat(knownValue) || 0;
    if (known <= 0) {
      alert('Enter a positive value');
      return;
    }

    let res, label, formula;
    if (solveFor === 'Q') {
      res = K * Math.sqrt(known);
      label = 'Discharge Flow (Q)';
      formula = `Q = ${K} × √${known} = ${res.toFixed(2)} GPM`;
    } else {
      res = Math.pow(known / K, 2);
      label = 'Required Pressure (P)';
      formula = `P = (${known}/${K})² = ${res.toFixed(2)} psi`;
    }

    setResult({ label, value: solveFor === 'Q' ? `${res.toFixed(2)} GPM` : `${res.toFixed(2)} psi`, formula, k: K });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Solve For</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={chipRowStyle}>
            {['Flow (Q)', 'Pressure (P)'].map((label, idx) => (
              <button
                key={label}
                type="button"
                onClick={() => setSolveFor(idx === 0 ? 'Q' : 'P')}
                style={{
                  ...chipStyle,
                  background: (idx === 0 ? solveFor === 'Q' : solveFor === 'P') ? '#DC2626' : '#E5E7EB',
                  color: (idx === 0 ? solveFor === 'Q' : solveFor === 'P') ? '#fff' : '#111827',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>K-Factor (NFPA 13)</label>
            <select value={kValue} onChange={(e) => setKValue(e.target.value)} style={inputStyle}>
              <option value="2.8">K-2.8 - Residential</option>
              <option value="4.2">K-4.2</option>
              <option value="5.6">K-5.6 - Standard</option>
              <option value="8.0">K-8.0</option>
              <option value="11.2">K-11.2 - ESFR</option>
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>{solveFor === 'Q' ? 'Pressure (P)' : 'Flow (Q)'}</label>
            <input type="number" value={knownValue} onChange={(e) => setKnownValue(e.target.value)} style={inputStyle} placeholder="e.g. 30" />
            <span style={inputUnitStyle}>{solveFor === 'Q' ? 'psi' : 'GPM'}</span>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, background: '#DC2626', marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Calculate
        </button>
      </div>

      {result && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelAccentStyle} />
              <div style={panelTitleStyle}>Result</div>
            </div>
            <div style={panelBodyStyle}>
              <ResultRow label={result.label} value={result.value} />
              <ResultRow label="K-Factor Used" value={`${result.k} GPM/√psi`} />
              <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 12, padding: 12, marginTop: 12 }}>
                <div style={{ fontSize: '0.9rem', color: '#7F1D1D' }}>{result.formula}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HazenWilliamsPage() {
  const [flow, setFlow] = useState('100');
  const [length, setLength] = useState('200');
  const [diameter, setDiameter] = useState('2');
  const [roughness, setRoughness] = useState('150');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const Q = parseFloat(flow) || 100;
    const L = parseFloat(length) || 200;
    const d = parseFloat(diameter) || 2;
    const C = parseFloat(roughness) || 150;

    // Hazen-Williams: hf (psi per 1000 ft) = 4.52 × Q^1.85 / (C^1.85 × D^4.87)
    const hfPer1000 = (4.52 * Math.pow(Q, 1.85)) / (Math.pow(C, 1.85) * Math.pow(d, 4.87));
    const hfTotal = (hfPer1000 * L) / 1000;

    setResult({ hfPer1000: hfPer1000.toFixed(3), hfTotal: hfTotal.toFixed(2) });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Pipe Parameters</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Flow Rate</label>
            <input type="number" value={flow} onChange={(e) => setFlow(e.target.value)} style={inputStyle} placeholder="e.g. 100" />
            <span style={inputUnitStyle}>GPM</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Pipe Length</label>
            <input type="number" value={length} onChange={(e) => setLength(e.target.value)} style={inputStyle} placeholder="e.g. 200" />
            <span style={inputUnitStyle}>ft</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Pipe Diameter</label>
            <input type="number" value={diameter} onChange={(e) => setDiameter(e.target.value)} style={inputStyle} placeholder="e.g. 2" />
            <span style={inputUnitStyle}>inches</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Roughness Coefficient (C)</label>
            <select value={roughness} onChange={(e) => setRoughness(e.target.value)} style={inputStyle}>
              <option value="100">New Steel Pipe - C=100</option>
              <option value="110">Cast Iron (5-10 yrs) - C=110</option>
              <option value="120">Steel (10-30 yrs) - C=120</option>
              <option value="130">PVC - C=130</option>
              <option value="150">Copper / Galvanized - C=150</option>
            </select>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, background: '#DC2626', marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Calculate Friction Loss
        </button>
      </div>

      {result && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelAccentStyle} />
              <div style={panelTitleStyle}>Friction Loss Results</div>
            </div>
            <div style={panelBodyStyle}>
              <ResultRow label="Loss per 1000 ft" value={`${result.hfPer1000} psi`} />
              <ResultRow label="Total Loss (this run)" value={`${result.hfTotal} psi`} />
              <p style={{ color: '#6B7280', marginTop: 12, fontSize: '0.9rem' }}>
                Hazen-Williams equation: hf = 4.52 × Q^1.85 / (C^1.85 × D^4.87), where hf is in psi per 1000 ft.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function FireWaterDemandPage() {
  const [sprinklerFlow, setSprinklerFlow] = useState('500');
  const [sprinklerPressure, setSprinklerPressure] = useState('100');
  const [hydrantCount, setHydrantCount] = useState('0');
  const [hydrantFlow, setHydrantFlow] = useState('250');
  const [hoseCount, setHoseCount] = useState('0');
  const [hoseFlow, setHoseFlow] = useState('26');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const spFlow = parseFloat(sprinklerFlow) || 0;
    const spPress = parseFloat(sprinklerPressure) || 0;
    const hyCount = parseFloat(hydrantCount) || 0;
    const hyFlow = parseFloat(hydrantFlow) || 0;
    const hsCount = parseFloat(hoseCount) || 0;
    const hsFlow = parseFloat(hoseFlow) || 0;

    const hydrantTotal = hyCount * hyFlow;
    const hoseTotal = hsCount * hsFlow;
    const totalDemand = spFlow + hydrantTotal + hoseTotal;
    const tank60 = totalDemand * 60;
    const tank90 = totalDemand * 90;

    setResult({
      spFlow,
      spPress,
      hydrantTotal,
      hoseTotal,
      totalDemand,
      tank60,
      tank90,
    });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Fire Water Demand Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Sprinkler system flow</label>
            <input type="number" value={sprinklerFlow} onChange={(e) => setSprinklerFlow(e.target.value)} style={inputStyle} placeholder="e.g. 500" />
            <span style={inputUnitStyle}>GPM</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Sprinkler residual pressure required</label>
            <input type="number" value={sprinklerPressure} onChange={(e) => setSprinklerPressure(e.target.value)} style={inputStyle} placeholder="e.g. 100" />
            <span style={inputUnitStyle}>psi</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Number of simultaneous hydrants</label>
            <input type="number" min="0" value={hydrantCount} onChange={(e) => setHydrantCount(e.target.value)} style={inputStyle} placeholder="e.g. 2" />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Flow per hydrant</label>
            <input type="number" value={hydrantFlow} onChange={(e) => setHydrantFlow(e.target.value)} style={inputStyle} placeholder="e.g. 250" />
            <span style={inputUnitStyle}>GPM</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Number of simultaneous hose reels</label>
            <input type="number" min="0" value={hoseCount} onChange={(e) => setHoseCount(e.target.value)} style={inputStyle} placeholder="e.g. 2" />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Flow per hose reel</label>
            <input type="number" value={hoseFlow} onChange={(e) => setHoseFlow(e.target.value)} style={inputStyle} placeholder="e.g. 26" />
            <span style={inputUnitStyle}>GPM</span>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, background: '#DC2626', marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Calculate Total Demand
        </button>
      </div>
      {result && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelAccentStyle} />
              <div style={panelTitleStyle}>Fire Water Demand Summary</div>
            </div>
            <div style={panelBodyStyle}>
              <ResultRow label="Sprinkler flow" value={`${result.spFlow.toFixed(0)} GPM @ ${result.spPress.toFixed(0)} psi`} />
              <ResultRow label="Hydrant flow total" value={`${result.hydrantTotal.toFixed(0)} GPM`} />
              <ResultRow label="Hose reel flow total" value={`${result.hoseTotal.toFixed(0)} GPM`} />
              <ResultRow label="Total fire demand" value={`${result.totalDemand.toFixed(0)} GPM`} />
              <ResultRow label="Required pump flow" value={`${result.totalDemand.toFixed(0)} GPM`} />
              <ResultRow label="60 min tank volume" value={`${result.tank60.toFixed(0)} gal`} />
              <ResultRow label="90 min tank volume" value={`${result.tank90.toFixed(0)} gal`} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FirePumpPage() {
  const [flow, setFlow] = useState('500');
  const [systemPressure, setSystemPressure] = useState('100');
  const [suctionHead, setSuctionHead] = useState('8');
  const [dischargeLoss, setDischargeLoss] = useState('5');
  const [efficiency, setEfficiency] = useState('70');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const Q = parseFloat(flow) || 0;
    const P = parseFloat(systemPressure) || 0;
    const Hd = parseFloat(dischargeLoss) || 0;
    const eff = Math.max(0.01, parseFloat(efficiency) / 100);
    const totalPressure = P + Hd;
    const headFeet = totalPressure * 2.31;
    const bhp = (Q * headFeet) / (3960 * eff);
    setResult({
      flow: Q,
      totalPressure,
      headFeet,
      bhp,
      efficiency: eff * 100,
    });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Fire Pump Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Design flow</label>
            <input type="number" value={flow} onChange={(e) => setFlow(e.target.value)} style={inputStyle} placeholder="e.g. 500" />
            <span style={inputUnitStyle}>GPM</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>System demand pressure</label>
            <input type="number" value={systemPressure} onChange={(e) => setSystemPressure(e.target.value)} style={inputStyle} placeholder="e.g. 100" />
            <span style={inputUnitStyle}>psi</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Suction head / lift</label>
            <input type="number" value={suctionHead} onChange={(e) => setSuctionHead(e.target.value)} style={inputStyle} placeholder="e.g. 8" />
            <span style={inputUnitStyle}>ft</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Discharge pipe loss</label>
            <input type="number" value={dischargeLoss} onChange={(e) => setDischargeLoss(e.target.value)} style={inputStyle} placeholder="e.g. 5" />
            <span style={inputUnitStyle}>psi</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Pump efficiency</label>
            <input type="number" value={efficiency} onChange={(e) => setEfficiency(e.target.value)} style={inputStyle} placeholder="e.g. 70" />
            <span style={inputUnitStyle}>%</span>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, background: '#DC2626', marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Calculate Pump Duty
        </button>
      </div>
      {result && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelAccentStyle} />
              <div style={panelTitleStyle}>Fire Pump Result</div>
            </div>
            <div style={panelBodyStyle}>
              <ResultRow label="Total discharge pressure" value={`${result.totalPressure.toFixed(1)} psi`} />
              <ResultRow label="Equivalent head" value={`${result.headFeet.toFixed(1)} ft`} />
              <ResultRow label="Pump flow" value={`${result.flow.toFixed(1)} GPM`} />
              <ResultRow label="Pump efficiency" value={`${result.efficiency.toFixed(1)} %`} />
              <ResultRow label="Brake horsepower" value={`${result.bhp.toFixed(2)} bhp`} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function approximateVaporPressurePsi(tempF) {
  const tC = (tempF - 32) * 5 / 9;
  const pvkPa = 0.61078 * Math.exp((17.27 * tC) / (tC + 237.3));
  const pvFt = pvkPa * 1000 / (9810 * 0.3048);
  return pvFt;
}

function PumpSuctionPage() {
  const [suctionHead, setSuctionHead] = useState('-5');
  const [frictionLoss, setFrictionLoss] = useState('3');
  const [temperature, setTemperature] = useState('68');
  const [elevation, setElevation] = useState('0');
  const [npshr, setNpshr] = useState('15');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const hs = parseFloat(suctionHead) || -5;
    const hf = parseFloat(frictionLoss) || 0;
    const temp = parseFloat(temperature) || 68;
    const elev = parseFloat(elevation) || 0;
    const required = parseFloat(npshr) || 0;
    const atmHead = 33.9 - (elev / 1000) * 1.13;
    const vapHead = approximateVaporPressurePsi(temp);
    const npsha = atmHead + hs - hf - vapHead;
    const margin = npsha - required;
    let status;
    if (npsha <= 0) status = 'Very low NPSHa; review suction conditions.';
    else if (margin >= 3) status = 'Good margin above NPSHr.';
    else if (margin >= 0) status = 'Marginal margin; confirm with manufacturer.';
    else status = 'Insufficient NPSHa; adjust conditions.';

    setResult({ atmHead, vapHead, hs, hf, npsha, required, margin, status });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Pump Suction Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Suction head / lift</label>
            <input type="number" value={suctionHead} onChange={(e) => setSuctionHead(e.target.value)} style={inputStyle} placeholder="e.g. -5" />
            <span style={inputUnitStyle}>ft (+ flooded, - lift)</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Suction pipe friction loss</label>
            <input type="number" value={frictionLoss} onChange={(e) => setFrictionLoss(e.target.value)} style={inputStyle} placeholder="e.g. 3" />
            <span style={inputUnitStyle}>ft</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Water temperature</label>
            <input type="number" value={temperature} onChange={(e) => setTemperature(e.target.value)} style={inputStyle} placeholder="e.g. 68" />
            <span style={inputUnitStyle}>°F</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Site elevation</label>
            <input type="number" value={elevation} onChange={(e) => setElevation(e.target.value)} style={inputStyle} placeholder="e.g. 0" />
            <span style={inputUnitStyle}>ft</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Manufacturer NPSHr</label>
            <input type="number" value={npshr} onChange={(e) => setNpshr(e.target.value)} style={inputStyle} placeholder="e.g. 15" />
            <span style={inputUnitStyle}>ft</span>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, background: '#DC2626', marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Calculate NPSH
        </button>
      </div>
      {result && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelAccentStyle} />
              <div style={panelTitleStyle}>NPSH Result</div>
            </div>
            <div style={panelBodyStyle}>
              <ResultRow label="Atmospheric head" value={`${result.atmHead.toFixed(2)} ft`} />
              <ResultRow label="Vapor pressure head" value={`${result.vapHead.toFixed(2)} ft`} />
              <ResultRow label="Static suction head" value={`${result.hs.toFixed(2)} ft`} />
              <ResultRow label="Friction losses" value={`${result.hf.toFixed(2)} ft`} />
              <ResultRow label="NPSHa" value={`${result.npsha.toFixed(2)} ft`} />
              <ResultRow label="NPSHr" value={`${result.required.toFixed(2)} ft`} />
              <ResultRow label="Margin" value={`${result.margin.toFixed(2)} ft`} />
              <p style={{ color: '#6B7280', marginTop: 12 }}>{result.status}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FireTankPage() {
  const [sprinklerFlow, setSprinklerFlow] = useState('300');
  const [sprinklerDuration, setSprinklerDuration] = useState('60');
  const [standpipeFlow, setStandpipeFlow] = useState('500');
  const [standpipeDuration, setStandpipeDuration] = useState('30');
  const [hoseFlow, setHoseFlow] = useState('250');
  const [hoseDuration, setHoseDuration] = useState('60');
  const [makeupFlow, setMakeupFlow] = useState('0');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const spFlow = parseFloat(sprinklerFlow) || 0;
    const spDur = parseFloat(sprinklerDuration) || 0;
    const stFlow = parseFloat(standpipeFlow) || 0;
    const stDur = parseFloat(standpipeDuration) || 0;
    const hsFlow = parseFloat(hoseFlow) || 0;
    const hsDur = parseFloat(hoseDuration) || 0;
    const mu = parseFloat(makeupFlow) || 0;
    const sprinklerVolume = spFlow * spDur;
    const standpipeVolume = stFlow * stDur;
    const hoseVolume = hsFlow * hsDur;
    const duration = Math.max(spDur, stDur, hsDur);
    const makeupVolume = mu * duration;
    const totalVolume = Math.max(0, sprinklerVolume + standpipeVolume + hoseVolume - makeupVolume);

    setResult({
      sprinklerVolume,
      standpipeVolume,
      hoseVolume,
      duration,
      makeupVolume,
      totalVolume,
    });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Fire Tank Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Sprinkler system flow</label>
            <input type="number" value={sprinklerFlow} onChange={(e) => setSprinklerFlow(e.target.value)} style={inputStyle} placeholder="e.g. 300" />
            <span style={inputUnitStyle}>GPM</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Sprinkler duration</label>
            <input type="number" value={sprinklerDuration} onChange={(e) => setSprinklerDuration(e.target.value)} style={inputStyle} placeholder="e.g. 60" />
            <span style={inputUnitStyle}>min</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Standpipe demand</label>
            <input type="number" value={standpipeFlow} onChange={(e) => setStandpipeFlow(e.target.value)} style={inputStyle} placeholder="e.g. 500" />
            <span style={inputUnitStyle}>GPM</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Standpipe duration</label>
            <input type="number" value={standpipeDuration} onChange={(e) => setStandpipeDuration(e.target.value)} style={inputStyle} placeholder="e.g. 30" />
            <span style={inputUnitStyle}>min</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Hose stream allowance</label>
            <input type="number" value={hoseFlow} onChange={(e) => setHoseFlow(e.target.value)} style={inputStyle} placeholder="e.g. 250" />
            <span style={inputUnitStyle}>GPM</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Hose stream duration</label>
            <input type="number" value={hoseDuration} onChange={(e) => setHoseDuration(e.target.value)} style={inputStyle} placeholder="e.g. 60" />
            <span style={inputUnitStyle}>min</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Makeup supply</label>
            <input type="number" value={makeupFlow} onChange={(e) => setMakeupFlow(e.target.value)} style={inputStyle} placeholder="e.g. 0" />
            <span style={inputUnitStyle}>GPM</span>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, background: '#DC2626', marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Calculate Tank Capacity
        </button>
      </div>
      {result && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelAccentStyle} />
              <div style={panelTitleStyle}>Fire Tank Results</div>
            </div>
            <div style={panelBodyStyle}>
              <ResultRow label="Sprinkler volume" value={`${result.sprinklerVolume.toFixed(0)} gal`} />
              <ResultRow label="Standpipe volume" value={`${result.standpipeVolume.toFixed(0)} gal`} />
              <ResultRow label="Hose stream volume" value={`${result.hoseVolume.toFixed(0)} gal`} />
              <ResultRow label="Makeup supply" value={`${result.makeupVolume.toFixed(0)} gal`} />
              <ResultRow label="Required tank capacity" value={`${result.totalVolume.toFixed(0)} gal`} />
              <p style={{ color: '#6B7280', marginTop: 12 }}>
                Assumes makeup supply is available for the longest duration ({result.duration.toFixed(0)} min).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TankDurationPage() {
  const [demand, setDemand] = useState('750');
  const [duration, setDuration] = useState('60');
  const [customDuration, setCustomDuration] = useState('60');
  const [tankCapacity, setTankCapacity] = useState('50000');
  const [refillRate, setRefillRate] = useState('100');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const flow = parseFloat(demand) || 0;
    const dur = duration === 'custom' ? parseFloat(customDuration) || 0 : parseFloat(duration) || 0;
    const tank = parseFloat(tankCapacity) || 0;
    const refill = parseFloat(refillRate) || 0;
    const requiredVolume = flow * dur;
    const actualDurMin = flow > 0 ? tank / flow : 0;
    const refillMin = refill > 0 ? tank / refill : Infinity;
    const ok = tank >= requiredVolume;
    const margin = tank - requiredVolume;

    setResult({ requiredVolume, actualDurMin, refillMin, ok, margin, dur });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Tank Duration Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Total fire water demand</label>
            <input type="number" value={demand} onChange={(e) => setDemand(e.target.value)} style={inputStyle} placeholder="e.g. 750" />
            <span style={inputUnitStyle}>GPM</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Required duration</label>
            <select value={duration} onChange={(e) => setDuration(e.target.value)} style={inputStyle}>
              <option value="30">30 min - light hazard</option>
              <option value="60">60 min - ordinary hazard</option>
              <option value="90">90 min - extra hazard</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          {duration === 'custom' && (
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Custom duration</label>
              <input type="number" value={customDuration} onChange={(e) => setCustomDuration(e.target.value)} style={inputStyle} placeholder="e.g. 60" />
              <span style={inputUnitStyle}>min</span>
            </div>
          )}
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Tank capacity</label>
            <input type="number" value={tankCapacity} onChange={(e) => setTankCapacity(e.target.value)} style={inputStyle} placeholder="e.g. 50000" />
            <span style={inputUnitStyle}>gal</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Refill rate</label>
            <input type="number" value={refillRate} onChange={(e) => setRefillRate(e.target.value)} style={inputStyle} placeholder="e.g. 100" />
            <span style={inputUnitStyle}>GPM</span>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, background: '#DC2626', marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Validate Tank
        </button>
      </div>
      {result && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelAccentStyle} />
              <div style={panelTitleStyle}>Tank Duration Result</div>
            </div>
            <div style={panelBodyStyle}>
              <ResultRow label="Required volume" value={`${result.requiredVolume.toFixed(0)} gal`} />
              <ResultRow label="Tank capacity" value={`${(parseFloat(tankCapacity) || 0).toFixed(0)} gal`} />
              <ResultRow label="Equivalent duration" value={`${result.actualDurMin.toFixed(0)} min`} />
              <ResultRow label="Refill time" value={result.refillMin === Infinity ? 'No refill supply' : `${result.refillMin.toFixed(1)} min`} />
              <ResultRow label="Margin" value={`${result.margin.toFixed(0)} gal`} />
              <p style={{ color: result.ok ? '#047857' : '#B91C1C', marginTop: 12 }}>
                {result.ok ? 'Tank capacity meets the required fire demand.' : 'Tank is undersized for the selected duration.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HoseCoveragePage() {
  const [hoseLength, setHoseLength] = useState('100');
  const [reach, setReach] = useState('20');
  const [area, setArea] = useState('10000');
  const [obstruction, setObstruction] = useState('0.8');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const len = parseFloat(hoseLength) || 0;
    const r = parseFloat(reach) || 0;
    const areaVal = parseFloat(area) || 0;
    const obs = Math.min(1, Math.max(0.1, parseFloat(obstruction) || 0.8));
    const effectiveRadius = len + r;
    const coverageArea = Math.PI * effectiveRadius * effectiveRadius;
    const adjustedCoverage = coverageArea * obs;
    const requiredHoses = areaVal > 0 ? Math.max(1, Math.ceil(areaVal / adjustedCoverage)) : 0;

    setResult({ effectiveRadius, coverageArea, adjustedCoverage, requiredHoses, areaVal });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Hose Coverage Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Hose length</label>
            <input type="number" value={hoseLength} onChange={(e) => setHoseLength(e.target.value)} style={inputStyle} placeholder="e.g. 100" />
            <span style={inputUnitStyle}>ft</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Effective reach beyond hose end</label>
            <input type="number" value={reach} onChange={(e) => setReach(e.target.value)} style={inputStyle} placeholder="e.g. 20" />
            <span style={inputUnitStyle}>ft</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Protected area</label>
            <input type="number" value={area} onChange={(e) => setArea(e.target.value)} style={inputStyle} placeholder="e.g. 10000" />
            <span style={inputUnitStyle}>ft²</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Obstruction factor</label>
            <input type="number" value={obstruction} onChange={(e) => setObstruction(e.target.value)} style={inputStyle} placeholder="e.g. 0.8" />
            <span style={inputUnitStyle}>0.1–1.0</span>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, background: '#DC2626', marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Calculate Coverage
        </button>
      </div>
      {result && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelAccentStyle} />
              <div style={panelTitleStyle}>Coverage Result</div>
            </div>
            <div style={panelBodyStyle}>
              <ResultRow label="Effective radius" value={`${result.effectiveRadius.toFixed(1)} ft`} />
              <ResultRow label="Coverage area" value={`${result.coverageArea.toFixed(0)} ft²`} />
              <ResultRow label="Adjusted coverage" value={`${result.adjustedCoverage.toFixed(0)} ft²`} />
              <ResultRow label="Hoses required" value={`${result.requiredHoses}`} />
              <p style={{ color: '#6B7280', marginTop: 12 }}>
                This is a simplified estimate. Use actual system layout and obstructions for final hydraulic design.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FirePipeCheckPage() {
  const [velocity, setVelocity] = useState('8');
  const [friction, setFriction] = useState('0.005');
  const [residual, setResidual] = useState('18');
  const [pumpPressure, setPumpPressure] = useState('150');
  const [churn, setChurn] = useState('175');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const vel = parseFloat(velocity) || 0;
    const fr = parseFloat(friction) || 0;
    const resid = parseFloat(residual) || 0;
    const pump = parseFloat(pumpPressure) || 0;
    const churnPressure = parseFloat(churn) || 0;
    const checks = [];

    const addCheck = (label, value, unit, minWarn, minGood, maxGood, maxWarn, maxFail, advice) => {
      let status = 'Good';
      let color = '#16A34A';
      if (value < minWarn || value > maxWarn) {
        status = 'Too High';
        color = '#DC2626';
      } else if (value < minGood || value > maxGood) {
        status = 'Review';
        color = '#D97706';
      }
      checks.push({ label, value: `${value.toFixed(value < 10 ? 2 : 0)} ${unit}`, status, color, advice });
    };

    addCheck('Pipe velocity', vel, 'fps', 4, 4, 20, 25, 32, 'NFPA 13 recommends 4–20 fps.');
    addCheck('Friction loss per foot', fr, 'psi/ft', 0.002, 0.002, 0.010, 0.015, 0.02, 'Recommend â‰¤ 0.010 psi/ft for fire service.');
    addCheck('Residual pressure', resid, 'psi', 10, 10, 175, 175, 200, 'NFPA 13 minimum 7 psi at remote head.');
    addCheck('Pump discharge', pump, 'psi', 80, 80, 175, 200, 250, 'Ideal 80–175 psi discharge for fire pumps.');
    addCheck('Churn pressure', churnPressure, 'psi', 100, 100, 175, 175, 250, 'Churn should be â‰¤ 175 psi for outlet.');

    const margin = churnPressure - pump;
    const status = pump > churnPressure ? 'Fail: pump exceeds churn pressure.' : 'Pass: basic fire pipe check acceptable.';

    setResult({ checks, margin, status });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Fire Pipe Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Pipe velocity</label>
            <input type="number" value={velocity} onChange={(e) => setVelocity(e.target.value)} style={inputStyle} placeholder="e.g. 8" />
            <span style={inputUnitStyle}>fps</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Friction loss per foot</label>
            <input type="number" step="0.001" value={friction} onChange={(e) => setFriction(e.target.value)} style={inputStyle} placeholder="e.g. 0.005" />
            <span style={inputUnitStyle}>psi/ft</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Residual pressure at remote head</label>
            <input type="number" value={residual} onChange={(e) => setResidual(e.target.value)} style={inputStyle} placeholder="e.g. 18" />
            <span style={inputUnitStyle}>psi</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Pump discharge pressure</label>
            <input type="number" value={pumpPressure} onChange={(e) => setPumpPressure(e.target.value)} style={inputStyle} placeholder="e.g. 150" />
            <span style={inputUnitStyle}>psi</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Max churn pressure</label>
            <input type="number" value={churn} onChange={(e) => setChurn(e.target.value)} style={inputStyle} placeholder="e.g. 175" />
            <span style={inputUnitStyle}>psi</span>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, background: '#DC2626', marginTop: 16 }} type="button" onClick={calculate}>
          🔍 Run Fire Pipe Check
        </button>
      </div>
      {result && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelAccentStyle} />
              <div style={panelTitleStyle}>Fire Pipe Check Results</div>
            </div>
            <div style={panelBodyStyle}>
              <ResultRow label="Churn margin" value={`${result.margin.toFixed(1)} psi`} />
              <div style={{ color: result.margin < 0 ? '#B91C1C' : '#047857', fontWeight: 700, marginBottom: 12 }}>{result.status}</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {result.checks.map((check) => (
                  <div key={check.label} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #E5E7EB' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{check.label}</div>
                      <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>{check.advice}</div>
                    </div>
                    <div style={{ textAlign: 'right', color: check.color, fontWeight: 700 }}>{check.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HydrantFlowPage() {
  const [staticPressure, setStaticPressure] = useState('75');
  const [residualPressure, setResidualPressure] = useState('55');
  const [pitotPressure, setPitotPressure] = useState('20');
  const [diameter, setDiameter] = useState('2.5');
  const [coefficient, setCoefficient] = useState('0.80');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const ps = parseFloat(staticPressure) || 0;
    const pr = parseFloat(residualPressure) || 0;
    const pp = parseFloat(pitotPressure) || 0;
    const d = parseFloat(diameter) || 2.5;
    const cd = parseFloat(coefficient) || 0.8;
    const measuredFlow = 29.84 * cd * d * d * Math.sqrt(pp);
    const drop = ps - pr;
    const projectedFlow = drop > 0 && ps > 20 ? measuredFlow * Math.pow((ps - 20) / drop, 0.54) : 0;

    setResult({ measuredFlow, projectedFlow, ps, pr, drop });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Hydrant Flow Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Static pressure</label>
            <input type="number" value={staticPressure} onChange={(e) => setStaticPressure(e.target.value)} style={inputStyle} placeholder="e.g. 75" />
            <span style={inputUnitStyle}>psi</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Residual pressure</label>
            <input type="number" value={residualPressure} onChange={(e) => setResidualPressure(e.target.value)} style={inputStyle} placeholder="e.g. 55" />
            <span style={inputUnitStyle}>psi</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Pitot pressure</label>
            <input type="number" value={pitotPressure} onChange={(e) => setPitotPressure(e.target.value)} style={inputStyle} placeholder="e.g. 20" />
            <span style={inputUnitStyle}>psi</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Outlet diameter</label>
            <select value={diameter} onChange={(e) => setDiameter(e.target.value)} style={inputStyle}>
              <option value="2.5">2½"</option>
              <option value="4.0">4"</option>
              <option value="6.0">6"</option>
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Discharge coefficient (Cd)</label>
            <select value={coefficient} onChange={(e) => setCoefficient(e.target.value)} style={inputStyle}>
              <option value="0.90">0.90 - smooth</option>
              <option value="0.80">0.80 - square-edged</option>
              <option value="0.70">0.70 - worn/projecting</option>
            </select>
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, background: '#DC2626', marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Calculate Available Flow
        </button>
      </div>
      {result && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelAccentStyle} />
              <div style={panelTitleStyle}>Hydrant Flow Results</div>
            </div>
            <div style={panelBodyStyle}>
              <ResultRow label="Measured flow" value={`${result.measuredFlow.toFixed(0)} GPM`} />
              <ResultRow label="Projected at 20 psi" value={`${result.projectedFlow.toFixed(0)} GPM`} />
              <ResultRow label="Static pressure" value={`${result.ps.toFixed(1)} psi`} />
              <ResultRow label="Residual pressure" value={`${result.pr.toFixed(1)} psi`} />
              <ResultRow label="Pressure drop" value={`${result.drop.toFixed(1)} psi`} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DryPipeVolumePage() {
  const [pipeSize, setPipeSize] = useState('1.5');
  const [pipeLength, setPipeLength] = useState('200');
  const [systemPressure, setSystemPressure] = useState('40');
  const [waterPressure, setWaterPressure] = useState('5');
  const [branchCount, setBranchCount] = useState('0');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const size = parseFloat(pipeSize) || 1.5;
    const len = parseFloat(pipeLength) || 0;
    const sysP = parseFloat(systemPressure) || 0;
    const waterP = parseFloat(waterPressure) || 0;
    const branches = parseFloat(branchCount) || 0;
    const volPerFt = { 1: 0.045, 1.25: 0.078, 1.5: 0.106, 2: 0.174, 2.5: 0.248, 3: 0.383, 4: 0.661 };
    const vpf = volPerFt[size] || 0.106;
    const pipeVol = len * vpf * 1.15;
    const nfpaLimit = 750;
    const ok = pipeVol <= nfpaLimit;
    const airRatio = (sysP + 14.7) / 14.7;
    const timeToWater = pipeVol / 100;
    const compFill = pipeVol / 30;

    setResult({ pipeVol, nfpaLimit, ok, airRatio, timeToWater, compFill, sysP, waterP, branches });
  };

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Dry Pipe Volume Inputs</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Pipe internal size</label>
            <select value={pipeSize} onChange={(e) => setPipeSize(e.target.value)} style={inputStyle}>
              <option value="1">1"</option>
              <option value="1.25">1¼"</option>
              <option value="1.5">1½"</option>
              <option value="2">2"</option>
              <option value="2.5">2½"</option>
              <option value="3">3"</option>
              <option value="4">4"</option>
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Total pipe length</label>
            <input type="number" value={pipeLength} onChange={(e) => setPipeLength(e.target.value)} style={inputStyle} placeholder="e.g. 200" />
            <span style={inputUnitStyle}>ft</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>System air pressure</label>
            <input type="number" value={systemPressure} onChange={(e) => setSystemPressure(e.target.value)} style={inputStyle} placeholder="e.g. 40" />
            <span style={inputUnitStyle}>psi</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Water fill pressure</label>
            <input type="number" value={waterPressure} onChange={(e) => setWaterPressure(e.target.value)} style={inputStyle} placeholder="e.g. 5" />
            <span style={inputUnitStyle}>psi</span>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Number of branch lines</label>
            <input type="number" min="0" value={branchCount} onChange={(e) => setBranchCount(e.target.value)} style={inputStyle} placeholder="e.g. 10" />
          </div>
        </div>
        <button style={{ ...calculateButtonStyle, background: '#DC2626', marginTop: 16 }} type="button" onClick={calculate}>
          ⚡ Calculate Dry Pipe Volume
        </button>
      </div>
      {result && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={panelAccentStyle} />
              <div style={panelTitleStyle}>Dry Pipe Volume Results</div>
            </div>
            <div style={panelBodyStyle}>
              <ResultRow label="Pipe volume" value={`${result.pipeVol.toFixed(0)} gal`} />
              <ResultRow label="NFPA 13 limit" value={`${result.nfpaLimit} gal`} />
              <ResultRow label="Air to water ratio" value={`${result.airRatio.toFixed(1)} : 1`} />
              <ResultRow label="Estimated time to water" value={`~${result.timeToWater.toFixed(1)} min`} />
              <ResultRow label="Required air fill" value={`${result.compFill.toFixed(1)} gal/min`} />
              <ResultRow label="System pressure" value={`${result.sysP.toFixed(1)} psi`} />
              <ResultRow label="Water pressure" value={`${result.waterP.toFixed(1)} psi`} />
              <ResultRow label="Branch lines" value={`${result.branches}`} />
              <p style={{ color: result.ok ? '#047857' : '#B91C1C', marginTop: 12 }}>
                {result.ok ? 'Within standard NFPA 13 volume limits.' : 'System volume exceeds standard NFPA 13 limit; use accelerator or split system.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SprinklerDensityPage() {
  const [numSprinklers, setNumSprinklers] = useState('10');
  const [areaPerSprinkler, setAreaPerSprinkler] = useState('130');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcSprinklerDensity({ occupancy: 'ordinary', areaPerSprinkler, numSprinklers, kFactor: '5.6' });
  }, [result, numSprinklers, areaPerSprinkler]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Sprinkler Density</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Number of Sprinklers</label>
            <input type="number" value={numSprinklers} onChange={(e) => setNumSprinklers(e.target.value)} style={inputStyle} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Area per Sprinkler (ft²)</label>
            <input type="number" value={areaPerSprinkler} onChange={(e) => setAreaPerSprinkler(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Required Flow" value={`${calcResult.requiredFlow} GPM`} />
          </div>
        </div>
      )}
    </div>
  );
}

function SprinklerSpacingPage() {
  const [spacing, setSpacing] = useState('130');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcSprinklerSpacing({ spacing, maxArea: '300' });
  }, [result, spacing]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Sprinkler Spacing</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Spacing (ft²)</label>
            <input type="number" value={spacing} onChange={(e) => setSpacing(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Recommended Spacing" value={calcResult.recommendedSpacing} />
          </div>
        </div>
      )}
    </div>
  );
}

function EquivalentLengthPage() {
  const [pipeLength, setPipeLength] = useState('100');
  const [elbows, setElbows] = useState('0');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcEquivalentLength({ pipeLength, elbows, tees: '0', bends: '0' });
  }, [result, pipeLength, elbows]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Equivalent Length</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Pipe Length (ft)</label>
            <input type="number" value={pipeLength} onChange={(e) => setPipeLength(e.target.value)} style={inputStyle} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Elbows</label>
            <input type="number" value={elbows} onChange={(e) => setElbows(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Equivalent Length" value={`${calcResult.totalEquivalentLength} ft`} />
          </div>
        </div>
      )}
    </div>
  );
}

function StandpipeLossPage() {
  const [pipeLength, setPipeLength] = useState('100');
  const [flowRate, setFlowRate] = useState('500');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcStandpipeLoss({ pipeLength, flowRate, pipeSize: '4' });
  }, [result, pipeLength, flowRate]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Standpipe Loss</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Pipe Length (ft)</label>
            <input type="number" value={pipeLength} onChange={(e) => setPipeLength(e.target.value)} style={inputStyle} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Flow Rate (GPM)</label>
            <input type="number" value={flowRate} onChange={(e) => setFlowRate(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Total Loss" value={`${calcResult.totalLoss} PSI`} />
          </div>
        </div>
      )}
    </div>
  );
}

function DesignCheckToolPage() {
  const [designCurrent, setDesignCurrent] = useState('');
  const [cableAmpacity, setCableAmpacity] = useState('');
  const [result, setResult] = useState(null);

  const calcResult = useMemo(() => {
    if (!result) return null;
    return calcDesignCheckTool({ designCurrent, cableAmpacity, breakerRating: '', voltageDropPercent: '' });
  }, [result, designCurrent, cableAmpacity]);

  return (
    <div style={psychrometricGridStyle}>
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelAccentStyle} />
          <div style={panelTitleStyle}>Design Check Tool</div>
        </div>
        <div style={panelBodyStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Design Current (A)</label>
            <input type="number" value={designCurrent} onChange={(e) => setDesignCurrent(e.target.value)} style={inputStyle} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Cable Ampacity (A)</label>
            <input type="number" value={cableAmpacity} onChange={(e) => setCableAmpacity(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={() => setResult({ ts: Date.now() })} style={calculateButtonStyle}>
            Calculate
          </button>
        </div>
      </div>
      {calcResult && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={panelStyle}>
            <ResultRow label="Design OK" value={calcResult.designOK ? 'Yes' : 'No'} />
          </div>
        </div>
      )}
    </div>
  );
}

function PlaceholderPage() {
  return (
    <div style={cardStyle}>
      <h2>Calculator Coming Soon</h2>
    </div>
  );
}

function ResultRow({ label, value }) {
  return (
    <div style={resultRowStyle}>
      <div>{label}</div>
      <div>{value}</div>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const pageWrapperStyle = {
  padding: 24,
};

const disciplineBarStyle = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  marginBottom: 20,
};

const disciplineButtonStyle = {
  border: 'none',
  borderRadius: 12,
  padding: '12px 18px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '0.95rem',
  transition: '0.2s ease',
};

const calculatorTabsStyle = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  marginBottom: 28,
  paddingBottom: 18,
  borderBottom: '1px solid #E5E7EB',
};

const calculatorTabButtonStyle = {
  borderRadius: 10,
  padding: '10px 14px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.9rem',
  background: '#FFFFFF',
  transition: '0.2s ease',
};

const pageHeaderStyle = {
  marginBottom: 24,
};

const pageTitleStyle = {
  margin: 0,
  fontSize: '2rem',
  fontWeight: 800,
  color: '#111827',
};

const pageSubtitleStyle = {
  marginTop: 6,
  color: '#6B7280',
  fontSize: '1rem',
};

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: 18,
  padding: 24,
  boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
};

const formGridStyle = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(auto-fit,minmax(220px,1fr))',
  gap: 18,
  marginTop: 20,
};

const labelStyle = {
  display: 'block',
  marginBottom: 8,
  fontWeight: 600,
  color: '#374151',
};

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid #D1D5DB',
  fontSize: '0.95rem',
  outline: 'none',
};

const resultCardStyle = {
  marginTop: 24,
  padding: 20,
  borderRadius: 14,
  background: '#EFF6FF',
  border: '1px solid #BFDBFE',
};

const resultValueStyle = {
  fontSize: '2rem',
  fontWeight: 800,
  color: '#1D4ED8',
};

const psychrometricGridStyle = {
  display: 'grid',
  gap: 20,
  gridTemplateColumns: '1.1fr .9fr',
};

const panelStyle = {
  background: '#FFFFFF',
  borderRadius: 24,
  padding: 24,
  boxShadow: '0 1px 4px rgba(15,23,42,0.08)',
  display: 'grid',
  gap: 20,
};

const panelHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const panelAccentStyle = {
  width: 4,
  height: 28,
  background: '#2563EB',
  borderRadius: 999,
};

const panelTitleStyle = {
  fontWeight: 700,
  fontSize: '1rem',
  color: '#111827',
};

const panelBodyStyle = {
  display: 'grid',
  gap: 18,
};

const inputUnitStyle = {
  position: 'absolute',
  right: 14,
  top: 40,
  fontSize: '0.9rem',
  color: '#6B7280',
};

const inputGroupStyle = {
  display: 'grid',
  gap: 6,
  position: 'relative',
};

const calculateButtonStyle = {
  padding: '12px 16px',
  background: '#2563EB',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: 12,
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '0.95rem',
};

const resultSummaryStyle = {
  background: '#F0F9FF',
  border: '1px solid #BFDBFE',
  borderRadius: 12,
  padding: 12,
  color: '#1E3A8A',
  fontSize: '0.9rem',
  marginTop: 12,
};

const resultRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid #E5E7EB',
  paddingBottom: 12,
  marginBottom: 12,
  color: '#111827',
};

const pageShellStyle = {
  display: 'grid',
  gridTemplateColumns: '280px 1fr',
  gap: 20,
  minHeight: '100vh',
  background: '#F8FAFC',
  padding: 24,
  fontFamily: 'system-ui, sans-serif',
};

const sidebarStyle = {
  background: '#FFFFFF',
  borderRadius: 24,
  padding: 20,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
  minHeight: 'calc(100vh - 48px)',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const sidebarHeaderStyle = {
  fontSize: '1.1rem',
  fontWeight: 700,
  color: '#111827',
};

const sidebarSectionStyle = {
  borderTop: '1px solid #E5E7EB',
  paddingTop: 14,
};

const sidebarSectionHeaderStyle = {
  width: '100%',
  border: 'none',
  background: 'transparent',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 0,
  color: '#111827',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '0.95rem',
};

const sidebarItemStyle = {
  width: '100%',
  border: 'none',
  background: 'transparent',
  padding: '10px 12px',
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  cursor: 'pointer',
  color: '#111827',
  textAlign: 'left',
};

const sidebarDotStyle = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: '#CBD5E1',
  flexShrink: 0,
};

const sidebarFooterStyle = {
  marginTop: 'auto',
  borderTop: '1px solid #E5E7EB',
  paddingTop: 14,
  display: 'grid',
  gap: 10,
};

const footerItemStyle = {
  width: '100%',
  border: 'none',
  background: '#F3F4F6',
  borderRadius: 12,
  padding: '10px 14px',
  cursor: 'pointer',
  color: '#111827',
  textAlign: 'left',
};

const chevronStyle = {
  fontSize: '0.85rem',
  color: '#6B7280',
};

const mainContentStyle = {
  display: 'grid',
  gap: 20,
};

const badgeStyle = {
  borderRadius: 9999,
  padding: '10px 18px',
  fontWeight: 700,
  fontSize: '0.9rem',
  alignSelf: 'start',
};

const pageDescriptionCardStyle = {
  background: '#FFFFFF',
  borderRadius: 24,
  padding: 24,
  boxShadow: '0 1px 4px rgba(15,23,42,0.08)',
};

const chipRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
};

const placeholderCardStyle = {
  background: '#F8FAFC',
  borderRadius: 16,
  padding: 18,
  color: '#334155',
};

const chipStyle = {
  padding: '8px 14px',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.9rem',
  fontWeight: 500,
};

const buttonStyle = {
  padding: '12px 16px',
  background: '#2563EB',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: 12,
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '0.95rem',
};































// import React, { useEffect, useState } from "react";
// import { useAuth } from "../../contexts/AuthContext";
// import { getLeads } from "../../firebase/leadsService";
// import {
//   addDesign,
//   getDesigns,
//   deleteDesign,
//   updateDesign,
// } from "../../firebase/designService";
// import MultiUploadWithDelete from "../leads/LeadsFileUpload";
// import StaffSelector from "../../components/layout/StaffSelector";
// import { getRolesForSelector } from "../../config/roleAccess";
// import { useMemo } from "react";
// import { db } from "../../firebase/firebase";
// import { collection, getDocs } from "firebase/firestore";
// import { notifyAssignedStaff } from "../leads/LeadsListHelper";

// function cleanData(data) {
//   return Object.fromEntries(
//     Object.entries(data).filter(([_, v]) => v !== undefined)
//   );
// }

// /* ---------------- LOAD CALCULATION HELPERS ---------------- */
// function calculateLoad(rows) {
//   return rows.map(r => {
//     const area = Number(r.length) * Number(r.width);
//     const load =
//       area * 0.22;

//     let equipment = "Split AC";
//     if (load > 5 && load <= 15) equipment = "Ducted Split";
//     if (load > 15) equipment = "VRF System";

//     return {
//       roomUsage: r.usage,
//       roomArea: area.toFixed(2),
//       coolingKW: load.toFixed(2),
//       equipment,
//     };
//   });
// }

// const ROOM_USAGE_OPTIONS = [
//   { label: "Bedroom", value: 1 },
//   { label: "Sitting Room", value: 2 },
//   { label: "Kitchen", value: 3 },
//   { label: "Office", value: 4 },
//   { label: "Production Room", value: 5 },
//   { label: "Toilet", value: 6 },
//   { label: "Room", value: 7 },
//   { label: "Hall", value: 8 },
// ];

// export default function DesignPage() {
//   const { companyId, user, role, displayName } = useAuth();
//   const [designs, setDesigns] = useState([]);
//   const [design, setDesign] = useState([]); //for sorting only
//   const [projectList, setProjectList] = useState([]);
//   const [editingId, setEditingId] = useState(null);
//   //const [boqFromSheet, setBoqFromSheet] = useState(null);
//   //const [boqRanges, setBoqRanges] = useState(null);
//   const [staffList, setStaffList] = useState([]);
//   const [showBOQ, setShowBOQ] = useState(false);
//   const [loading, setLoading] = useState(false);

//   const [formData, setFormData] = useState({
//     projectName: "",
//     fileUpload: [],
//     staffAssigned: [],
//     loadEntries: [],
//     loadSchedule: [],
//   });

//   const [expandedRows, setExpandedRows] = useState({});
//   const [showLoadTable, setShowLoadTable] = useState(false);
//   const [designInputs, setDesignInputs] = useState({
//     WMU: {
//       "2.6": 0,
//       "3.5": 0,
//       "4.5": 0,
//       "5.6": 0,
//       "7.1": 0,
//       maxPipe: 0,
//     },
//     CST: {
//       "5.6": 0,
//       "7.1": 0,
//       "8.8": 0,
//       "10.6": 0,
//       "14": 0,
//       "16": 0,
//       maxPipe: 0,
//     },
//     CCU: {
//       "5.6": 0,
//       "7.1": 0,
//       "8.8": 0,
//       "10.6": 0,
//       "14": 0,
//       "16": 0,
//       "35": 0,
//       "56": 0,
//       maxPipe: 0,
//     },
//     FLST: {
//       "5.6": 0,
//       "9": 0,
//       "14": 0,
//       "16": 0,
//       maxPipe: 0,
//     },
//     PACKAGE: {
//       "10": 0,
//       "15": 0,
//       "20": 0,
//       "25": 0,
//       "30": 0,
//       "35": 0,
//       "40": 0,
//       cableTray: 0,
//     },
//     OTHER: {
//       inlineFan: 0,
//       discValve: 0,
//       condensate: 0,
//     }
//   });

//   /* ---------------- LOAD PROJECTS ---------------- */
//   useEffect(() => {
//     if (!companyId) return;
//     setLoading(true);
//     const loadProjects = async () => {
//       const leads = await getLeads(companyId);
//       setProjectList([...new Set(leads.map(l => l.projectName))]);
//       setLoading(false);
//     };

//     loadProjects();
//   }, [companyId]);

//   /* ---------------- LOAD DESIGNS ---------------- */
//   useEffect(() => {
//     if (!companyId) return;

//     const fetchDesigns = async () => {
//       const data = await getDesigns(companyId);
//       const sorted = (data || []).sort((a, b) => {
//         const aTime = a.createdAt?.seconds || 0;
//         const bTime = b.createdAt?.seconds || 0;
//         return bTime - aTime;
//       });
//       setDesign(sorted);
//       setDesigns(data || []);
//     };

//     fetchDesigns();
//   }, [companyId]);

//   /* ---------------- LOAD STAFF ---------------- */
//   useEffect(() => {
//     if (!companyId) return;

//     const loadStaff = async () => {
//       const snap = await getDocs(
//         collection(db, "companies", companyId, "users")
//       );

//       setStaffList(
//         snap.docs.map(d => ({ id: d.id, ...d.data() }))
//       );
//     };

//     loadStaff();
//   }, [companyId]);

//   const staffAssignedIds = formData.staffAssigned;

//   const staffNameMap = useMemo(() => {
//     const map = {};
//     staffList.forEach(u => {
//       map[u.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim();
//     });
//     return map;
//   }, [staffList]);

//   // Notify assigned staff helper
//   const notifyStaffForLead = async (companyId, userIds, designId, leadData, sourcePage, mainMenu) => {
//     if (!userIds || !userIds.length) return;
//     await notifyAssignedStaff(companyId, designId, leadData, userIds, sourcePage, mainMenu);
//   };

//   /* ---------------- LOAD ENTRY HANDLERS ---------------- */
//   const addEntry = () => {
//     setFormData(prev => ({
//       ...prev,
//       loadEntries: [
//         ...prev.loadEntries,
//         { usage: "", length: "", width: "", height: "", rooms: "" },
//       ],
//     }));
//   };

//   const removeEntry = index => {
//     setFormData(prev => ({
//       ...prev,
//       loadEntries: prev.loadEntries.filter((_, i) => i !== index),
//     }));
//   };

//   const handleDesignChange = (section, key, value) => {
//     setDesignInputs(prev => ({
//       ...prev,
//       [section]: {
//         ...prev[section],
//         [key]: Number(value),
//       },
//     }));
//   };

//   const SectionTable = ({ title, sectionKey, fields, extraField }) => {
//     return (
//       <div className="card p-3 mb-3">
//         <h5>{title}</h5>

//         <div className="row">
//           {fields.map(field => (
//             <div className="col-md-3 mb-2" key={field}>
//               <label>{field} kW</label>
//               <input
//                 type="number"
//                 className="form-control"
//                 value={designInputs[sectionKey][field]}
//                 onChange={e =>
//                   handleDesignChange(sectionKey, field, e.target.value)
//                 }
//               />
//             </div>
//           ))}

//           {extraField && (
//             <div className="col-md-3 mb-2">
//               <label>{extraField.label}</label>
//               <input
//                 type="number"
//                 className="form-control"
//                 value={designInputs[sectionKey][extraField.key]}
//                 onChange={e =>
//                   handleDesignChange(sectionKey, extraField.key, e.target.value)
//                 }
//               />
//             </div>
//           )}
//         </div>
//       </div>
//     );
//   };

//   const updateDesignInput = (group, key, value) => {
//     setDesignInputs(prev => ({
//       ...prev,
//       [group]: {
//         ...prev[group],
//         [key]: Number(value)
//       }
//     }));
//   };

//   const updateEntry = (index, field, value) => {
//     const updated = [...formData.loadEntries];
//     updated[index][field] = value;
//     setFormData(prev => ({ ...prev, loadEntries: updated }));
//   };

//   const calculateCopper = () => {
//     const result = {
//       "6.35": 0,
//       "9.52": 0,
//       "12.7": 0,
//       "15.88": 0,
//       "19.05": 0,
//       "28.58": 0,
//       "34.9": 0,
//     };

//     const add = (size, qty, length) => {
//       result[size] += qty * length;
//     };

//     // Example mapping (you extend fully)
//     add("6.35", designInputs.WMU["2.6"], designInputs.WMU.maxPipe);
//     add("6.35", designInputs.WMU["3.5"], designInputs.WMU.maxPipe);

//     add("9.52", designInputs.CST["7.1"], designInputs.CST.maxPipe);

//     add("12.7", designInputs.CCU["35"], designInputs.CCU.maxPipe);

//     add("15.88", designInputs.CCU["56"], designInputs.CCU.maxPipe);

//     return result;
//   };

//   const refrigerantTable = [
//     { liq: 9.52, gas: 15.88, factor: 0.053 },
//     { liq: 6.35, gas: 9.52, factor: 0.021 },
//     { liq: 6.35, gas: 12.7, factor: 0.021 },
//     { liq: 6.35, gas: 15.88, factor: 0.0232 },
//     { liq: 9.52, gas: 19.05, factor: 0.0586 },
//     { liq: 12.7, gas: 28.28, factor: 0.113 },
//     { liq: 15.88, gas: 34.9, factor: 0.181 },
//   ];

//   const calculateRefrigerant = (copperTotals) => {
//     return refrigerantTable.map(row => {
//       const pipe = (copperTotals[row.liq] || 0) / 2;

//       return {
//         ...row,
//         pipe,
//         kg: pipe * row.factor
//       };
//     });
//   };

//   const ccuMaterialTable = {
//     "5.6": { supply: 1, return: 1, flex: 3, duct: 6 },
//     "7.1": { supply: 1, return: 1, flex: 3, duct: 6 },
//     "8.8": { supply: 2, return: 2, flex: 6, duct: 8 },
//     "10.6": { supply: 2, return: 2, flex: 6, duct: 9 },
//     "14": { supply: 3, return: 3, flex: 9, duct: 22 },
//     "16": { supply: 4, return: 4, flex: 12, duct: 23 },
//     "35": { supply: 7, return: 7, flex: 21, duct: 31 },
//     "56": { supply: 11, return: 11, flex: 33, duct: 45 },
//   };

//   const packageMaterialTable = {
//     "10": { supply: 7, return: 7, flex: 21, duct: 65 },
//     "15": { supply: 10, return: 10, flex: 30, duct: 88 },
//     "20": { supply: 14, return: 14, flex: 42, duct: 103 },
//     "25": { supply: 17, return: 17, flex: 51, duct: 123 },
//     "30": { supply: 20, return: 20, flex: 60, duct: 132 },
//     "35": { supply: 24, return: 24, flex: 72, duct: 152 },
//     "40": { supply: 28, return: 28, flex: 84, duct: 162 },
//   };

//   const calculateLengths = (copperTotals) => {
//     const totalCopper = Object.values(copperTotals).reduce((a, b) => a + b, 0);

//     return {
//       ductLength:
//         designInputs.PACKAGE["10"] * 20 +
//         designInputs.CCU["5.6"] * 5,

//       extract:
//         designInputs.OTHER.inlineFan * 10,

//       condensate:
//         designInputs.OTHER.condensate *
//         (Object.values(designInputs.CCU).reduce((a, b) => a + b, 0)),

//       copper: totalCopper / 2,
//     };
//   };

//   const buildMechBOQ = ({ copperTotals, refrigerantSummary, lengths }) => {
//     const totalCopper = Object.values(copperTotals).reduce((a, b) => a + b, 0);

//     const totalRefrigerantKg = refrigerantSummary.reduce(
//       (sum, r) => sum + (r.kg || 0),
//       0
//     );

//     return [
//       {
//         category: "THREADED RODS",
//         items: [
//           { name: "10mm by 1m length", unit: "Nrs", qty: Math.ceil(lengths.ductLength / 3) },
//           { name: "8mm by 1m length", unit: "Nrs", qty: Math.ceil(lengths.ductLength / 4) },
//         ],
//       },

//       {
//         category: "ANCHOR BOLTS",
//         items: [
//           { name: "10mm Flush anchor Bolt", unit: "Nrs", qty: Math.ceil(lengths.ductLength / 2) },
//           { name: "8mm Flush anchor Bolt", unit: "Nrs", qty: Math.ceil(lengths.ductLength / 3) },
//         ],
//       },

//       {
//         category: "SCREWS",
//         items: [
//           { name: "Tapping Screw (Long)", unit: "Pcs", qty: Math.ceil(lengths.ductLength * 10) },
//         ],
//       },

//       {
//         category: "NUTS & WASHER",
//         items: [
//           { name: "10mm Nuts&Washer pair", unit: "Pcs", qty: Math.ceil(lengths.ductLength * 2) },
//           { name: "8mm Nuts&Washer pair", unit: "Pcs", qty: Math.ceil(lengths.ductLength * 2) },
//           { name: "Binding Wire", unit: "Bundle", qty: Math.ceil(lengths.ductLength / 50) },
//         ],
//       },

//       {
//         category: "DUCT SEALANT",
//         items: [
//           { name: "Cartons of Sealant (310ml per tube)", unit: "Tubes", qty: Math.ceil(lengths.ductLength / 10) },
//         ],
//       },

//       {
//         category: "MACHINES & CONNECTORS",
//         items: [
//           { name: "Canvas Connector (25m per carton)", unit: "Meters", qty: lengths.ductLength },
//         ],
//       },

//       {
//         category: "CABLES & ELECTRICALS",
//         items: [
//           { name: "2.5mm flex cable 3 core", unit: "Meters", qty: lengths.copper },
//           { name: "4mm flex cable 3 core", unit: "Meters", qty: lengths.copper },
//           { name: "Communication Cable 2.5mm 3core", unit: "Meters", qty: lengths.copper },
//           { name: "Flexible Conduit pipes 75mm", unit: "Meters", qty: lengths.copper },
//         ],
//       },

//       {
//         category: "PVC PLUMBING PIPES & FITTINGS",
//         items: [
//           { name: "Tangit gum 1kg", unit: "kg", qty: Math.ceil(lengths.condensate / 50) },
//           { name: "1'' pipe (3m per length)", unit: "Meters", qty: lengths.condensate },
//           { name: "1'' elbow 90°", unit: "Nos", qty: Math.ceil(lengths.condensate / 3) },
//           { name: "1'' sockets", unit: "Nos", qty: Math.ceil(lengths.condensate / 3) },
//           { name: "1'' elbow 45°", unit: "Nos", qty: Math.ceil(lengths.condensate / 4) },
//           { name: '1" Tee', unit: "Nos", qty: Math.ceil(lengths.condensate / 5) },
//         ],
//       },

//       {
//         category: "GALVANIZED SHEET DUCT & ACCESSORIES",
//         items: [
//           { name: "PID", unit: "Sqm", qty: lengths.ductLength },
//           { name: "G.I sheet (0.6mm) for rings", unit: "Sqm", qty: lengths.ductLength },
//           { name: "Fiberglass (20x1.2)", unit: "Sqm", qty: lengths.ductLength },
//           { name: "Insulated flexible Duct dia 200", unit: "meters", qty: lengths.ductLength },
//           { name: "41x21 U CHANNEL for ductwork", unit: "meters", qty: lengths.ductLength },
//           {
//             name: "Cable tray with cover for ODU piping 300 x 75",
//             unit: "meters",
//             qty: lengths.copper,
//           },
//           { name: "PID & GSS Duct Accessories", unit: "Lot", qty: 1 },
//         ],
//       },

//       {
//         category: "COPPER PIPES",
//         items: [
//           { name: "6.35mm", unit: "Meters", qty: copperTotals["6.35"] || 0 },
//           { name: "9.52mm", unit: "Meters", qty: copperTotals["9.52"] || 0 },
//           { name: "12.7mm", unit: "Meters", qty: copperTotals["12.7"] || 0 },
//           { name: "15.88mm", unit: "Meters", qty: copperTotals["15.88"] || 0 },
//           { name: "19.05mm", unit: "Meters", qty: copperTotals["19.05"] || 0 },
//           { name: "34.9mm", unit: "Meters", qty: copperTotals["34.9"] || 0 },
//         ],
//       },

//       {
//         category: "REFRIGERANT",
//         items: [
//           { name: "R410A (11.3kg per cylinder)", unit: "Kg", qty: totalRefrigerantKg },
//         ],
//       },

//       {
//         category: "AIR TERMINALS",
//         items: [
//           { name: "Turbo 150 200CFM", unit: "Nrs", qty: lengths.extract },
//           { name: "Toilet Extract Valve 100 dia", unit: "Nrs", qty: lengths.extract },
//           { name: "Slot Diffuser", unit: "Nrs", qty: Math.ceil(lengths.ductLength / 5) },
//           { name: "Access Panel", unit: "Nrs", qty: Math.ceil(lengths.ductLength / 10) },
//         ],
//       },

//       {
//         category: "ADDITIONAL WORKS",
//         items: [
//           { name: "AC Hanger for Outdoor Units", unit: "Nrs", qty: 10 },
//           { name: "Testing & Commissioning", unit: "Lot", qty: 1 },
//         ],
//       },

//       {
//         category: "EXTRACT SYSTEM GI DUCT",
//         items: [
//           { name: "G.I sheet", unit: "Sqm", qty: lengths.extract },
//           { name: "Flexible duct dia 100", unit: "meters", qty: lengths.extract },
//           { name: "PVC sleeve 100mm", unit: "meters", qty: lengths.extract },
//         ],
//       },
//     ];
//   };

//   const handleCalculate = () => {
//     const schedule = calculateLoad(formData.loadEntries);

//     setFormData(prev => ({
//       ...prev,
//       loadSchedule: schedule, // ONLY schedule
//     }));

//     setShowLoadTable(true);
//   };

//   const handleSaveLoadDetails = () => {
//     if (!formData.loadEntries.length) {
//       alert("No load data to save");
//       return;
//     }

//     setFormData(prev => ({
//       ...prev,
//       loadEntriesSnapshot: [...prev.loadEntries], // ✅ save a copy to memory
//     }));

//     alert("Load details saved successfully");
//   };

//   // const sendLoadEntriesToSheet = async (entries) => {
//   //   if (!entries.length) {
//   //     alert("No load entries to send");
//   //     return;
//   //   }

//   //   const payload = {
//   //     rows: entries.map(e => ([
//   //       e.usage,
//   //       e.length,
//   //       e.width,
//   //       e.height,
//   //       e.rooms,
//   //     ])),
//   //   };


//   //   try {
//   //     const res = await fetch("http://localhost:4000/sheet", {
//   //       method: "POST",
//   //       headers: { "Content-Type": "application/json" },
//   //       body: JSON.stringify(payload),
//   //     });

//   //     const data = await res.json();

//   //     // ✅ STORE BOQ SNAPSHOT
//   //     setBoqFromSheet(data.boq);
//   //     setBoqRanges(data.ranges);

//   //     console.log("BOQ from sheet saved:", data.boq);
//   //   } catch (err) {
//   //     console.error("Sheet error:", err);
//   //   }
//   // };


//   const handleCalculateAndSend = async () => {
//     // 1️⃣ Do local load calculation
//     handleCalculate();

//     // 2️⃣ Send data to Google Sheet
//     //await sendLoadEntriesToSheet(formData.loadEntries);
//   };


//   /* ---------------- SAVE ---------------- */
//   const handleSave = async () => {
//     if (!formData.projectName) {
//       alert("Project name is required");
//       return;
//     }

//     // if (!boqFromSheet) {
//     //   alert("Please calculate load first");
//     //   return;
//     // }

//     const creatorName = staffNameMap[user.uid] || "Unknown User";

//     const designPayload = {
//       projectName: formData.projectName,
//       fileUpload: formData.fileUpload,
//       staffAssigned: formData.staffAssigned,
//       loadEntries: formData.loadEntries,
//       loadSchedule: formData.loadSchedule,

//       // // ✅ FINAL, IMMUTABLE BOQ SNAPSHOT
//       // boq: boqFromSheet,

//       // // ✅ OPTIONAL: reference only
//       // boqSheet: boqRanges,
//       designInputs,
//       copperSummary: formData.copperSummary,
//       refrigerantSummary: formData.refrigerantSummary,
//       mechBOQ: formData.mechBOQ,

//       //mechBOQ: formData.mechBOQ, // ✅ FULL BOQ STORED

//     };

//     let id;

//     if (editingId) {
//       console.log("Editing ID:", editingId);

//       await updateDesign(companyId, editingId, designPayload);
//       id = editingId;
//       setEditingId(null);
//     } else {
//       const creatorName = staffNameMap[user.uid] || "Unknown User";
//       id = await addDesign(companyId, {
//         ...designPayload,
//         createdBy: {
//           uid: user.uid,
//           name: creatorName,
//         },
//       });
//     }

//     try {
//       if (companyId && user && staffAssignedIds.length > 0) {
//         await notifyStaffForLead(
//           companyId,
//           staffAssignedIds,
//           id,
//           designPayload,
//           "Design".trim(),
//           "Estimation"
//         );
//       }
//     } catch (err) {
//       console.warn("Notification failed, lead still saved:", err);
//     }


//     const refreshed = await getDesigns(companyId);
//     setDesign(
//       (refreshed || []).sort((a, b) =>
//         (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
//       )
//     );
//     setDesigns(refreshed || []);

//     // reset
//     setFormData({
//       projectName: "",
//       fileUpload: [],
//       staffAssigned: [],
//       loadEntries: [],
//       loadSchedule: [],
//     });

//     //setBoqFromSheet(null);
//     //setBoqRanges(null);
//     setShowLoadTable(false);
//   };


//   const usageLabelMap = ROOM_USAGE_OPTIONS.reduce((acc, u) => {
//     acc[u.value] = u.label;
//     return acc;
//   }, {});

//   const handleEdit = (item) => {
//     setEditingId(item.id);
//     setFormData({
//       projectName: item.projectName || "",
//       fileUpload: item.fileUpload || [],
//       staffAssigned: item.staffAssigned || [],
//       loadEntries: item.loadEntries || [],
//       loadSchedule: item.loadSchedule || [],
//     });

//     //setBoqFromSheet(item.boq || null);
//     //setBoqRanges(item.boqSheet || null);
//     setShowLoadTable(true);
//   };

//   // ✅ Save Section A Inputs to memory
//   const handleSaveSectionA = () => {
//     setFormData(prev => ({
//       ...prev,
//       designInputsSnapshot: designInputs, // store snapshot
//     }));

//     alert("Section A details saved successfully");
//   };

//   // ✅ Generate BOQ from Section A ONLY
//   const handleGenerateBOQ = () => {
//     const copper = calculateCopper();
//     const refrigerant = calculateRefrigerant(copper);
//     const lengths = calculateLengths(copper);

//     const mechBOQ = buildMechBOQ({
//       copperTotals: copper,
//       refrigerantSummary: refrigerant,
//       lengths,
//     });

//     setFormData(prev => ({
//       ...prev,
//       copperSummary: copper,
//       refrigerantSummary: refrigerant,
//       mechBOQ,
//     }));

//     alert("BOQ generated successfully, please visit check BOQ Menu");
//   };

//   const canModifyLead = (d) => {
//     if (!user) return false;

//     const isCeo = (role || "").toLowerCase() === "ceo";

//     const isOwner = d.createdBy?.uid === user.uid;

//     return isCeo || isOwner;
//   };

//   if (loading) {
//     return (
//       <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "70vh" }}>
//         <div className="text-center">
//           <div className="spinner-border text-primary" />
//           <div className="mt-2">Loading...</div>
//         </div>
//       </div>
//     );
//   }

//   /* ---------------- UI ---------------- */
//   return (
//     <div className="container mt-4">
//       <h2>Design Management</h2>

//       {/* ---------------- FORM ---------------- */}
//       <div className="card p-3 shadow-sm">

//         <label>Project Name</label>
//         <select
//           className="form-select mb-3"
//           value={formData.projectName}
//           onChange={e =>
//             setFormData(prev => ({ ...prev, projectName: e.target.value }))
//           }
//         >
//           <option value="">-- Select Project --</option>
//           {projectList.map(p => (
//             <option key={p} value={p}>{p}</option>
//           ))}
//         </select>

//         {/* -------- LOAD INPUT -------- */}
//         <h4 className="mt-3">Enter Project Data</h4>
//         <h5 className="mt-3">SECTION A: Enter known quantities to generate an initial BOQ</h5>

//         <div className="container mt-3">

//           <SectionTable
//             title="WMU QTY"
//             sectionKey="WMU"
//             fields={["2.6", "3.5", "4.5", "5.6", "7.1"]}
//             extraField={{ key: "maxPipe", label: "Max Pipe Length (m)" }}
//           />

//           <SectionTable
//             title="CST QTY"
//             sectionKey="CST"
//             fields={["5.6", "7.1", "8.8", "10.6", "14", "16"]}
//             extraField={{ key: "maxPipe", label: "Max Pipe Length (m)" }}
//           />

//           <SectionTable
//             title="CCU QTY"
//             sectionKey="CCU"
//             fields={["5.6", "7.1", "8.8", "10.6", "14", "16", "35", "56"]}
//             extraField={{ key: "maxPipe", label: "Max Pipe Length (m)" }}
//           />

//           <SectionTable
//             title="FLST QTY"
//             sectionKey="FLST"
//             fields={["5.6", "9", "14", "16"]}
//             extraField={{ key: "maxPipe", label: "Max Pipe Length (m)" }}
//           />

//           <SectionTable
//             title="PACKAGE QTY"
//             sectionKey="PACKAGE"
//             fields={["10", "15", "20", "25", "30", "35", "40"]}
//             extraField={{ key: "cableTray", label: "Cable Tray Length (m)" }}
//           />

//           {/* OTHER SECTION */}
//           <div className="card p-3 mb-3">
//             <h5>OTHER QTY</h5>

//             <div className="row">
//               <div className="col-md-4">
//                 <label>Inline Fan</label>
//                 <input
//                   type="number"
//                   className="form-control"
//                   value={designInputs.OTHER.inlineFan}
//                   onChange={e =>
//                     handleDesignChange("OTHER", "inlineFan", e.target.value)
//                   }
//                 />
//               </div>

//               <div className="col-md-4">
//                 <label>Disc Valve</label>
//                 <input
//                   type="number"
//                   className="form-control"
//                   value={designInputs.OTHER.discValve}
//                   onChange={e =>
//                     handleDesignChange("OTHER", "discValve", e.target.value)
//                   }
//                 />
//               </div>

//               <div className="col-md-4">
//                 <label>Max Condensate Line / Unit (m)</label>
//                 <input
//                   type="number"
//                   className="form-control"
//                   value={designInputs.OTHER.condensate}
//                   onChange={e =>
//                     handleDesignChange("OTHER", "condensate", e.target.value)
//                   }
//                 />
//               </div>
//             </div>
//           </div>

//         </div>
//         <div className="mt-3">
//           <button
//             className="btn btn-primary me-2"
//             onClick={handleSaveSectionA}
//           >
//             Save Details
//           </button>

//           <button
//             className="btn btn-warning"
//             onClick={handleGenerateBOQ}
//           >
//             Generate BOQ
//           </button>
//         </div>

//         {/* -------- BOQ TOGGLE -------- */}
//         {formData.mechBOQ && (
//           <div className="mt-4">
//             <button
//               className="btn btn-outline-secondary mb-2"
//               onClick={() => setShowBOQ(prev => !prev)}
//             >
//               {showBOQ ? "Hide BOQ" : "Show BOQ"}
//             </button>

//             {showBOQ && (
//               <>
//                 <h5>Mechanical BOQ</h5>

//                 {formData.mechBOQ.map((section, i) => (
//                   <div key={i} className="mb-3">
//                     <h6>{section.category}</h6>

//                     <table className="table table-sm table-bordered">
//                       <thead>
//                         <tr>
//                           <th>Item</th>
//                           <th>Unit</th>
//                           <th>Qty</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {section.items.map((item, j) => (
//                           <tr key={j}>
//                             <td>{item.name}</td>
//                             <td>{item.unit}</td>
//                             <td>{item.qty}</td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 ))}
//               </>
//             )}
//           </div>
//         )}

//         <h5 className="mt-3">SECTION B: Enter room details to calculated required total cooling capacity & equipment type</h5>

//         {formData.loadEntries.map((row, i) => (
//           <div key={i} className="row g-2 mb-2">
//             <div className="col">
//               <select
//                 className="form-select"
//                 value={row.usage || ""}
//                 onChange={e =>
//                   updateEntry(i, "usage", Number(e.target.value))
//                 }
//               >
//                 <option value="">-- Select Room Usage --</option>
//                 {ROOM_USAGE_OPTIONS.map(opt => (
//                   <option key={opt.value} value={opt.value}>
//                     {opt.label}
//                   </option>
//                 ))}
//               </select>

//             </div>
//             <div className="col">
//               <input className="form-control" placeholder="Length (m)"
//                 value={row.length}
//                 onChange={e => updateEntry(i, "length", e.target.value)} />
//             </div>
//             <div className="col">
//               <input className="form-control" placeholder="Width (m)"
//                 value={row.width}
//                 onChange={e => updateEntry(i, "width", e.target.value)} />
//             </div>
//             <div className="col">
//               <input className="form-control" placeholder="Height (m)"
//                 value={row.height}
//                 onChange={e => updateEntry(i, "height", e.target.value)} />
//             </div>
//             <div className="col">
//               <input className="form-control" placeholder="No. Rooms (qty)"
//                 value={row.rooms}
//                 onChange={e => updateEntry(i, "rooms", e.target.value)} />
//             </div>
//             <div className="col-auto">
//               <button className="btn btn-danger" onClick={() => removeEntry(i)}>−</button>
//             </div>
//           </div>
//         ))}

//         <button className="btn btn-secondary me-2" onClick={addEntry}>＋ Add Room</button>
//         {/* <button className="btn btn-primary" onClick={handleCalculate}>Calculate Load</button>
//         <button className="btn btn-success" onClick={() => sendLoadEntriesToSheet(formData.loadEntries)}>Calculate Load</button> */}
//         <div className="mt-3">
//           <button
//             className="btn btn-success me-2"
//             onClick={handleCalculate}
//           >
//             Calculate Load
//           </button>

//           <button
//             className="btn btn-primary"
//             onClick={handleSaveLoadDetails}
//           >
//             Save Load Details
//           </button>
//         </div>

//         {/* -------- LOAD TABLE -------- */}
//         {showLoadTable && (
//           <div className="mt-3">
//             <button
//               className="btn btn-link"
//               onClick={() => setShowLoadTable(!showLoadTable)}
//             >
//               Toggle Load Schedule
//             </button>

//             <table className="table table-bordered">
//               <thead>
//                 <tr>
//                   <th>Room Usage</th>
//                   <th>Room Area (m2)</th>
//                   <th>Cooling Capacity (kW)</th>
//                   <th>Equipment Type</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {formData.loadSchedule.map((r, i) => (
//                   <tr key={i}>
//                     <td>{usageLabelMap[r.roomUsage] || r.roomUsage}</td>
//                     <td>{r.roomArea}</td>
//                     <td>{r.coolingKW}</td>
//                     <td>{r.equipment}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}

//         {/* -------- FILES -------- */}
//         <label className="mt-3">Upload Files</label>
//         <MultiUploadWithDelete
//           uploadedFiles={formData.fileUpload}
//           onFilesChange={files =>
//             setFormData(prev => ({ ...prev, fileUpload: files }))
//           }
//         />

//         {/* -------- STAFF -------- */}
//         <label className="mt-3">Staff Assigned</label>
//         <StaffSelector
//           options={getRolesForSelector()}
//           value={formData.staffAssigned}
//           onChange={uids =>
//             setFormData(prev => ({ ...prev, staffAssigned: uids }))
//           }
//         />

//         <button className="btn btn-success mt-3" onClick={handleSave}>
//           {editingId ? "Update Design" : "Save Design"}
//         </button>
//       </div>

//       {/* ---------------- SAVED TABLE ---------------- */}
//       <table className="table table-striped mt-4">
//         <thead>
//           <tr>
//             <th>Created By</th>
//             <th>Project</th>
//             <th>Design Data</th>
//             <th>Files</th>
//             <th>Staff Assigned</th>
//             <th>Date</th>
//             <th>Actions</th>
//           </tr>
//         </thead>

//         <tbody>
//           {designs.length ? designs.map(d => {
//             const allowed = canModifyLead(d);
//             return (
//               <tr key={d.id}>
//                 <td>{d.createdBy?.name || "--"}</td>

//                 <td>{d.projectName}</td>
//                 <td>
//                   <button
//                     className="btn btn-sm btn-outline-primary"
//                     onClick={() =>
//                       setExpandedRows(prev => ({
//                         ...prev,
//                         [d.id]: !prev[d.id],
//                       }))
//                     }
//                   >
//                     {expandedRows[d.id] ? "Hide" : "View"} Load Schedule
//                   </button>

//                   {expandedRows[d.id] && (
//                     <table className="table table-sm mt-2">
//                       <thead>
//                         <tr>
//                           <th>Room</th>
//                           <th>Area m2</th>
//                           <th>Cooling Cap kW</th>
//                           <th>Equipment</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {(d.loadSchedule || []).map((r, i) => (
//                           <tr key={i}>
//                             <td>{usageLabelMap[r.roomUsage] || r.roomUsage}</td>
//                             <td>{r.roomArea}</td>
//                             <td>{r.coolingKW}</td>
//                             <td>{r.equipment}</td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   )}
//                 </td>
//                 <td>
//                   {d.fileUpload.length ? (
//                     <ul style={{ paddingLeft: 16 }}>
//                       {d.fileUpload.map(f => (
//                         <li key={f.fileId}>
//                           <button
//                             style={{
//                               background: "none",
//                               border: "none",
//                               color: "#1976d2",
//                               cursor: "pointer",
//                               textDecoration: "underline"
//                             }}
//                             onClick={async () => {
//                               const tokens = JSON.parse(localStorage.getItem("googleTokens"));
//                               const token = tokens?.access_token;

//                               if (!token) {
//                                 alert("You must login first");
//                                 return;
//                               }

//                               const result = await window.electron.downloadFile(f.fileId, token, f.name)

//                               if (!result?.success) {
//                                 alert("Download failed");
//                               }
//                             }}
//                           >
//                             ⬇ {f.name}
//                           </button>
//                         </li>
//                       ))}
//                     </ul>
//                   ) : "--"}
//                 </td>

//                 <td>
//                   {(d.staffAssigned || [])
//                     .map(uid => staffNameMap[uid] || uid)
//                     .join(", ")}
//                 </td>

//                 <td>
//                   {d.createdAt
//                     ? new Date(
//                       d.createdAt.seconds
//                         ? d.createdAt.seconds * 1000
//                         : d.createdAt
//                     ).toLocaleString()
//                     : "--"}
//                 </td>

//                 <td>
//                   <button
//                     className="btn-edit"
//                     onClick={() => allowed && handleEdit(d)}
//                     disabled={!allowed}
//                     style={{
//                       opacity: allowed ? 1 : 0.5,
//                       cursor: allowed ? "pointer" : "not-allowed"
//                     }}
//                   >
//                     Edit
//                   </button>

//                   <button
//                     className="btn-delete"
//                     onClick={async () => {
//                       await deleteDesign(companyId, d.id);
//                       setDesigns(prev => prev.filter(x => x.id !== d.id));
//                     }}
//                     disabled={!allowed}
//                     style={{
//                       opacity: allowed ? 1 : 0.5,
//                       cursor: allowed ? "pointer" : "not-allowed"
//                     }}

//                   >
//                     Delete
//                   </button>
//                 </td>
//               </tr>
//             );
//           }) : (
//             <tr>
//               <td colSpan="6" className="text-center">
//                 No design records yet.
//               </td>
//             </tr>
//           )}
//         </tbody>
//       </table>


//     </div>
//   );
// }
