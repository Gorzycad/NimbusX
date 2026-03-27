// src/pages/design/DesignProjects.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getLeads } from "../../firebase/leadsService";
import {
  addDesign,
  getDesigns,
  deleteDesign,
  updateDesign,
} from "../../firebase/designService";
import MultiUploadWithDelete from "../leads/LeadsFileUpload";
import StaffSelector from "../../components/layout/StaffSelector";
import { getRolesForSelector } from "../../config/roleAccess";
import { useMemo } from "react";
import { db } from "../../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";
import { notifyAssignedStaff } from "../leads/LeadsListHelper";

function cleanData(data) {
  return Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
}

/* ---------------- LOAD CALCULATION HELPERS ---------------- */
function calculateLoad(rows) {
  return rows.map(r => {
    const area = Number(r.length) * Number(r.width);
    const load =
      area * 0.22;

    let equipment = "Split AC";
    if (load > 5 && load <= 15) equipment = "Ducted Split";
    if (load > 15) equipment = "VRF System";

    return {
      roomUsage: r.usage,
      roomArea: area.toFixed(2),
      coolingKW: load.toFixed(2),
      equipment,
    };
  });
}

const ROOM_USAGE_OPTIONS = [
  { label: "Bedroom", value: 1 },
  { label: "Sitting Room", value: 2 },
  { label: "Kitchen", value: 3 },
  { label: "Office", value: 4 },
  { label: "Production Room", value: 5 },
  { label: "Toilet", value: 6 },
  { label: "Room", value: 7 },
  { label: "Hall", value: 8 },
];

export default function DesignPage() {
  const { companyId, user } = useAuth();
  const [designs, setDesigns] = useState([]);
  const [design, setDesign] = useState([]); //for sorting only
  const [projectList, setProjectList] = useState([]);
  const [editingId, setEditingId] = useState(null);
  //const [boqFromSheet, setBoqFromSheet] = useState(null);
  //const [boqRanges, setBoqRanges] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [showBOQ, setShowBOQ] = useState(false);

  const [formData, setFormData] = useState({
    projectName: "",
    fileUpload: [],
    staffAssigned: [],
    loadEntries: [],
    loadSchedule: [],
  });

  const [expandedRows, setExpandedRows] = useState({});
  const [showLoadTable, setShowLoadTable] = useState(false);
  const [designInputs, setDesignInputs] = useState({
    WMU: {
      "2.6": 0,
      "3.5": 0,
      "4.5": 0,
      "5.6": 0,
      "7.1": 0,
      maxPipe: 0,
    },
    CST: {
      "5.6": 0,
      "7.1": 0,
      "8.8": 0,
      "10.6": 0,
      "14": 0,
      "16": 0,
      maxPipe: 0,
    },
    CCU: {
      "5.6": 0,
      "7.1": 0,
      "8.8": 0,
      "10.6": 0,
      "14": 0,
      "16": 0,
      "35": 0,
      "56": 0,
      maxPipe: 0,
    },
    FLST: {
      "5.6": 0,
      "9": 0,
      "14": 0,
      "16": 0,
      maxPipe: 0,
    },
    PACKAGE: {
      "10": 0,
      "15": 0,
      "20": 0,
      "25": 0,
      "30": 0,
      "35": 0,
      "40": 0,
      cableTray: 0,
    },
    OTHER: {
      inlineFan: 0,
      discValve: 0,
      condensate: 0,
    }
  });

  /* ---------------- LOAD PROJECTS ---------------- */
  useEffect(() => {
    if (!companyId) return;

    const loadProjects = async () => {
      const leads = await getLeads(companyId);
      setProjectList([...new Set(leads.map(l => l.projectName))]);
    };

    loadProjects();
  }, [companyId]);

  /* ---------------- LOAD DESIGNS ---------------- */
  useEffect(() => {
    if (!companyId) return;

    const fetchDesigns = async () => {
      const data = await getDesigns(companyId);
      const sorted = (data || []).sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
      setDesign(sorted);
      setDesigns(data || []);
    };

    fetchDesigns();
  }, [companyId]);

  /* ---------------- LOAD STAFF ---------------- */
  useEffect(() => {
    if (!companyId) return;

    const loadStaff = async () => {
      const snap = await getDocs(
        collection(db, "companies", companyId, "users")
      );

      setStaffList(
        snap.docs.map(d => ({ id: d.id, ...d.data() }))
      );
    };

    loadStaff();
  }, [companyId]);

  const staffAssignedIds = formData.staffAssigned;

  const staffNameMap = useMemo(() => {
    const map = {};
    staffList.forEach(u => {
      map[u.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    });
    return map;
  }, [staffList]);

  // Notify assigned staff helper
  const notifyStaffForLead = async (companyId, userIds, designId, leadData, sourcePage, mainMenu) => {
    if (!userIds || !userIds.length) return;
    await notifyAssignedStaff(companyId, designId, leadData, userIds, sourcePage, mainMenu);
  };

  /* ---------------- LOAD ENTRY HANDLERS ---------------- */
  const addEntry = () => {
    setFormData(prev => ({
      ...prev,
      loadEntries: [
        ...prev.loadEntries,
        { usage: "", length: "", width: "", height: "", rooms: "" },
      ],
    }));
  };

  const removeEntry = index => {
    setFormData(prev => ({
      ...prev,
      loadEntries: prev.loadEntries.filter((_, i) => i !== index),
    }));
  };

  const handleDesignChange = (section, key, value) => {
    setDesignInputs(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: Number(value),
      },
    }));
  };

  const SectionTable = ({ title, sectionKey, fields, extraField }) => {
    return (
      <div className="card p-3 mb-3">
        <h5>{title}</h5>

        <div className="row">
          {fields.map(field => (
            <div className="col-md-3 mb-2" key={field}>
              <label>{field} kW</label>
              <input
                type="number"
                className="form-control"
                value={designInputs[sectionKey][field]}
                onChange={e =>
                  handleDesignChange(sectionKey, field, e.target.value)
                }
              />
            </div>
          ))}

          {extraField && (
            <div className="col-md-3 mb-2">
              <label>{extraField.label}</label>
              <input
                type="number"
                className="form-control"
                value={designInputs[sectionKey][extraField.key]}
                onChange={e =>
                  handleDesignChange(sectionKey, extraField.key, e.target.value)
                }
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const updateDesignInput = (group, key, value) => {
    setDesignInputs(prev => ({
      ...prev,
      [group]: {
        ...prev[group],
        [key]: Number(value)
      }
    }));
  };

  const updateEntry = (index, field, value) => {
    const updated = [...formData.loadEntries];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, loadEntries: updated }));
  };

  const calculateCopper = () => {
    const result = {
      "6.35": 0,
      "9.52": 0,
      "12.7": 0,
      "15.88": 0,
      "19.05": 0,
      "28.58": 0,
      "34.9": 0,
    };

    const add = (size, qty, length) => {
      result[size] += qty * length;
    };

    // Example mapping (you extend fully)
    add("6.35", designInputs.WMU["2.6"], designInputs.WMU.maxPipe);
    add("6.35", designInputs.WMU["3.5"], designInputs.WMU.maxPipe);

    add("9.52", designInputs.CST["7.1"], designInputs.CST.maxPipe);

    add("12.7", designInputs.CCU["35"], designInputs.CCU.maxPipe);

    add("15.88", designInputs.CCU["56"], designInputs.CCU.maxPipe);

    return result;
  };

  const refrigerantTable = [
    { liq: 9.52, gas: 15.88, factor: 0.053 },
    { liq: 6.35, gas: 9.52, factor: 0.021 },
    { liq: 6.35, gas: 12.7, factor: 0.021 },
    { liq: 6.35, gas: 15.88, factor: 0.0232 },
    { liq: 9.52, gas: 19.05, factor: 0.0586 },
    { liq: 12.7, gas: 28.28, factor: 0.113 },
    { liq: 15.88, gas: 34.9, factor: 0.181 },
  ];

  const calculateRefrigerant = (copperTotals) => {
    return refrigerantTable.map(row => {
      const pipe = (copperTotals[row.liq] || 0) / 2;

      return {
        ...row,
        pipe,
        kg: pipe * row.factor
      };
    });
  };

  const ccuMaterialTable = {
    "5.6": { supply: 1, return: 1, flex: 3, duct: 6 },
    "7.1": { supply: 1, return: 1, flex: 3, duct: 6 },
    "8.8": { supply: 2, return: 2, flex: 6, duct: 8 },
    "10.6": { supply: 2, return: 2, flex: 6, duct: 9 },
    "14": { supply: 3, return: 3, flex: 9, duct: 22 },
    "16": { supply: 4, return: 4, flex: 12, duct: 23 },
    "35": { supply: 7, return: 7, flex: 21, duct: 31 },
    "56": { supply: 11, return: 11, flex: 33, duct: 45 },
  };

  const packageMaterialTable = {
    "10": { supply: 7, return: 7, flex: 21, duct: 65 },
    "15": { supply: 10, return: 10, flex: 30, duct: 88 },
    "20": { supply: 14, return: 14, flex: 42, duct: 103 },
    "25": { supply: 17, return: 17, flex: 51, duct: 123 },
    "30": { supply: 20, return: 20, flex: 60, duct: 132 },
    "35": { supply: 24, return: 24, flex: 72, duct: 152 },
    "40": { supply: 28, return: 28, flex: 84, duct: 162 },
  };

  const calculateLengths = (copperTotals) => {
    const totalCopper = Object.values(copperTotals).reduce((a, b) => a + b, 0);

    return {
      ductLength:
        designInputs.PACKAGE["10"] * 20 +
        designInputs.CCU["5.6"] * 5,

      extract:
        designInputs.OTHER.inlineFan * 10,

      condensate:
        designInputs.OTHER.condensate *
        (Object.values(designInputs.CCU).reduce((a, b) => a + b, 0)),

      copper: totalCopper / 2,
    };
  };

  const buildMechBOQ = ({ copperTotals, refrigerantSummary, lengths }) => {
    const totalCopper = Object.values(copperTotals).reduce((a, b) => a + b, 0);

    const totalRefrigerantKg = refrigerantSummary.reduce(
      (sum, r) => sum + (r.kg || 0),
      0
    );

    return [
      {
        category: "THREADED RODS",
        items: [
          { name: "10mm by 1m length", unit: "Nrs", qty: Math.ceil(lengths.ductLength / 3) },
          { name: "8mm by 1m length", unit: "Nrs", qty: Math.ceil(lengths.ductLength / 4) },
        ],
      },

      {
        category: "ANCHOR BOLTS",
        items: [
          { name: "10mm Flush anchor Bolt", unit: "Nrs", qty: Math.ceil(lengths.ductLength / 2) },
          { name: "8mm Flush anchor Bolt", unit: "Nrs", qty: Math.ceil(lengths.ductLength / 3) },
        ],
      },

      {
        category: "SCREWS",
        items: [
          { name: "Tapping Screw (Long)", unit: "Pcs", qty: Math.ceil(lengths.ductLength * 10) },
        ],
      },

      {
        category: "NUTS & WASHER",
        items: [
          { name: "10mm Nuts&Washer pair", unit: "Pcs", qty: Math.ceil(lengths.ductLength * 2) },
          { name: "8mm Nuts&Washer pair", unit: "Pcs", qty: Math.ceil(lengths.ductLength * 2) },
          { name: "Binding Wire", unit: "Bundle", qty: Math.ceil(lengths.ductLength / 50) },
        ],
      },

      {
        category: "DUCT SEALANT",
        items: [
          { name: "Cartons of Sealant (310ml per tube)", unit: "Tubes", qty: Math.ceil(lengths.ductLength / 10) },
        ],
      },

      {
        category: "MACHINES & CONNECTORS",
        items: [
          { name: "Canvas Connector (25m per carton)", unit: "Meters", qty: lengths.ductLength },
        ],
      },

      {
        category: "CABLES & ELECTRICALS",
        items: [
          { name: "2.5mm flex cable 3 core", unit: "Meters", qty: lengths.copper },
          { name: "4mm flex cable 3 core", unit: "Meters", qty: lengths.copper },
          { name: "Communication Cable 2.5mm 3core", unit: "Meters", qty: lengths.copper },
          { name: "Flexible Conduit pipes 75mm", unit: "Meters", qty: lengths.copper },
        ],
      },

      {
        category: "PVC PLUMBING PIPES & FITTINGS",
        items: [
          { name: "Tangit gum 1kg", unit: "kg", qty: Math.ceil(lengths.condensate / 50) },
          { name: "1'' pipe (3m per length)", unit: "Meters", qty: lengths.condensate },
          { name: "1'' elbow 90°", unit: "Nos", qty: Math.ceil(lengths.condensate / 3) },
          { name: "1'' sockets", unit: "Nos", qty: Math.ceil(lengths.condensate / 3) },
          { name: "1'' elbow 45°", unit: "Nos", qty: Math.ceil(lengths.condensate / 4) },
          { name: '1" Tee', unit: "Nos", qty: Math.ceil(lengths.condensate / 5) },
        ],
      },

      {
        category: "GALVANIZED SHEET DUCT & ACCESSORIES",
        items: [
          { name: "PID", unit: "Sqm", qty: lengths.ductLength },
          { name: "G.I sheet (0.6mm) for rings", unit: "Sqm", qty: lengths.ductLength },
          { name: "Fiberglass (20x1.2)", unit: "Sqm", qty: lengths.ductLength },
          { name: "Insulated flexible Duct dia 200", unit: "meters", qty: lengths.ductLength },
          { name: "41x21 U CHANNEL for ductwork", unit: "meters", qty: lengths.ductLength },
          {
            name: "Cable tray with cover for ODU piping 300 x 75",
            unit: "meters",
            qty: lengths.copper,
          },
          { name: "PID & GSS Duct Accessories", unit: "Lot", qty: 1 },
        ],
      },

      {
        category: "COPPER PIPES",
        items: [
          { name: "6.35mm", unit: "Meters", qty: copperTotals["6.35"] || 0 },
          { name: "9.52mm", unit: "Meters", qty: copperTotals["9.52"] || 0 },
          { name: "12.7mm", unit: "Meters", qty: copperTotals["12.7"] || 0 },
          { name: "15.88mm", unit: "Meters", qty: copperTotals["15.88"] || 0 },
          { name: "19.05mm", unit: "Meters", qty: copperTotals["19.05"] || 0 },
          { name: "34.9mm", unit: "Meters", qty: copperTotals["34.9"] || 0 },
        ],
      },

      {
        category: "REFRIGERANT",
        items: [
          { name: "R410A (11.3kg per cylinder)", unit: "Kg", qty: totalRefrigerantKg },
        ],
      },

      {
        category: "AIR TERMINALS",
        items: [
          { name: "Turbo 150 200CFM", unit: "Nrs", qty: lengths.extract },
          { name: "Toilet Extract Valve 100 dia", unit: "Nrs", qty: lengths.extract },
          { name: "Slot Diffuser", unit: "Nrs", qty: Math.ceil(lengths.ductLength / 5) },
          { name: "Access Panel", unit: "Nrs", qty: Math.ceil(lengths.ductLength / 10) },
        ],
      },

      {
        category: "ADDITIONAL WORKS",
        items: [
          { name: "AC Hanger for Outdoor Units", unit: "Nrs", qty: 10 },
          { name: "Testing & Commissioning", unit: "Lot", qty: 1 },
        ],
      },

      {
        category: "EXTRACT SYSTEM GI DUCT",
        items: [
          { name: "G.I sheet", unit: "Sqm", qty: lengths.extract },
          { name: "Flexible duct dia 100", unit: "meters", qty: lengths.extract },
          { name: "PVC sleeve 100mm", unit: "meters", qty: lengths.extract },
        ],
      },
    ];
  };

  const handleCalculate = () => {
    const schedule = calculateLoad(formData.loadEntries);

    setFormData(prev => ({
      ...prev,
      loadSchedule: schedule, // ONLY schedule
    }));

    setShowLoadTable(true);
  };

  const handleSaveLoadDetails = () => {
  if (!formData.loadEntries.length) {
    alert("No load data to save");
    return;
  }

  setFormData(prev => ({
    ...prev,
    loadEntriesSnapshot: [...prev.loadEntries], // ✅ save a copy to memory
  }));

  alert("Load details saved successfully");
};

  // const sendLoadEntriesToSheet = async (entries) => {
  //   if (!entries.length) {
  //     alert("No load entries to send");
  //     return;
  //   }

  //   const payload = {
  //     rows: entries.map(e => ([
  //       e.usage,
  //       e.length,
  //       e.width,
  //       e.height,
  //       e.rooms,
  //     ])),
  //   };


  //   try {
  //     const res = await fetch("http://localhost:4000/sheet", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify(payload),
  //     });

  //     const data = await res.json();

  //     // ✅ STORE BOQ SNAPSHOT
  //     setBoqFromSheet(data.boq);
  //     setBoqRanges(data.ranges);

  //     console.log("BOQ from sheet saved:", data.boq);
  //   } catch (err) {
  //     console.error("Sheet error:", err);
  //   }
  // };


  const handleCalculateAndSend = async () => {
    // 1️⃣ Do local load calculation
    handleCalculate();

    // 2️⃣ Send data to Google Sheet
    //await sendLoadEntriesToSheet(formData.loadEntries);
  };


  /* ---------------- SAVE ---------------- */
  const handleSave = async () => {
    if (!formData.projectName) {
      alert("Project name is required");
      return;
    }

    // if (!boqFromSheet) {
    //   alert("Please calculate load first");
    //   return;
    // }

    const creatorName = staffNameMap[user.uid] || "Unknown User";

    const designPayload = {
      projectName: formData.projectName,
      fileUpload: formData.fileUpload,
      staffAssigned: formData.staffAssigned,
      loadEntries: formData.loadEntries,
      loadSchedule: formData.loadSchedule,

      // // ✅ FINAL, IMMUTABLE BOQ SNAPSHOT
      // boq: boqFromSheet,

      // // ✅ OPTIONAL: reference only
      // boqSheet: boqRanges,
      designInputs,
      copperSummary: formData.copperSummary,
      refrigerantSummary: formData.refrigerantSummary,
      mechBOQ: formData.mechBOQ,

      //mechBOQ: formData.mechBOQ, // ✅ FULL BOQ STORED

    };

    let id;

    if (editingId) {
      console.log("Editing ID:", editingId);

      await updateDesign(companyId, editingId, designPayload);
      id = editingId;
      setEditingId(null);
    } else {
      const creatorName = staffNameMap[user.uid] || "Unknown User";
      id = await addDesign(companyId, {
        ...designPayload,
        createdBy: {
          uid: user.uid,
          name: creatorName,
        },
      });
    }

    try {
      if (companyId && user && staffAssignedIds.length > 0) {
        await notifyStaffForLead(
          companyId,
          staffAssignedIds,
          id,
          designPayload,
          "Design".trim(),
          "Estimation"
        );
      }
    } catch (err) {
      console.warn("Notification failed, lead still saved:", err);
    }


    const refreshed = await getDesigns(companyId);
    setDesign(
      (refreshed || []).sort((a, b) =>
        (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      )
    );
    setDesigns(refreshed || []);

    // reset
    setFormData({
      projectName: "",
      fileUpload: [],
      staffAssigned: [],
      loadEntries: [],
      loadSchedule: [],
    });

    //setBoqFromSheet(null);
    //setBoqRanges(null);
    setShowLoadTable(false);
  };


  const usageLabelMap = ROOM_USAGE_OPTIONS.reduce((acc, u) => {
    acc[u.value] = u.label;
    return acc;
  }, {});

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      projectName: item.projectName || "",
      fileUpload: item.fileUpload || [],
      staffAssigned: item.staffAssigned || [],
      loadEntries: item.loadEntries || [],
      loadSchedule: item.loadSchedule || [],
    });

    //setBoqFromSheet(item.boq || null);
    //setBoqRanges(item.boqSheet || null);
    setShowLoadTable(true);
  };

  // ✅ Save Section A Inputs to memory
  const handleSaveSectionA = () => {
    setFormData(prev => ({
      ...prev,
      designInputsSnapshot: designInputs, // store snapshot
    }));

    alert("Section A details saved successfully");
  };

  // ✅ Generate BOQ from Section A ONLY
  const handleGenerateBOQ = () => {
    const copper = calculateCopper();
    const refrigerant = calculateRefrigerant(copper);
    const lengths = calculateLengths(copper);

    const mechBOQ = buildMechBOQ({
      copperTotals: copper,
      refrigerantSummary: refrigerant,
      lengths,
    });

    setFormData(prev => ({
      ...prev,
      copperSummary: copper,
      refrigerantSummary: refrigerant,
      mechBOQ,
    }));

    alert("BOQ generated successfully, please visit check BOQ Menu");
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="container mt-4">
      <h2>Design Management</h2>

      {/* ---------------- FORM ---------------- */}
      <div className="card p-3 shadow-sm">

        <label>Project Name</label>
        <select
          className="form-select mb-3"
          value={formData.projectName}
          onChange={e =>
            setFormData(prev => ({ ...prev, projectName: e.target.value }))
          }
        >
          <option value="">-- Select Project --</option>
          {projectList.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        {/* -------- LOAD INPUT -------- */}
        <h4 className="mt-3">Enter Project Data</h4>
        <h5 className="mt-3">SECTION A: Enter known quantities to generate an initial BOQ</h5>

        <div className="container mt-3">

          <SectionTable
            title="WMU QTY"
            sectionKey="WMU"
            fields={["2.6", "3.5", "4.5", "5.6", "7.1"]}
            extraField={{ key: "maxPipe", label: "Max Pipe Length (m)" }}
          />

          <SectionTable
            title="CST QTY"
            sectionKey="CST"
            fields={["5.6", "7.1", "8.8", "10.6", "14", "16"]}
            extraField={{ key: "maxPipe", label: "Max Pipe Length (m)" }}
          />

          <SectionTable
            title="CCU QTY"
            sectionKey="CCU"
            fields={["5.6", "7.1", "8.8", "10.6", "14", "16", "35", "56"]}
            extraField={{ key: "maxPipe", label: "Max Pipe Length (m)" }}
          />

          <SectionTable
            title="FLST QTY"
            sectionKey="FLST"
            fields={["5.6", "9", "14", "16"]}
            extraField={{ key: "maxPipe", label: "Max Pipe Length (m)" }}
          />

          <SectionTable
            title="PACKAGE QTY"
            sectionKey="PACKAGE"
            fields={["10", "15", "20", "25", "30", "35", "40"]}
            extraField={{ key: "cableTray", label: "Cable Tray Length (m)" }}
          />

          {/* OTHER SECTION */}
          <div className="card p-3 mb-3">
            <h5>OTHER QTY</h5>

            <div className="row">
              <div className="col-md-4">
                <label>Inline Fan</label>
                <input
                  type="number"
                  className="form-control"
                  value={designInputs.OTHER.inlineFan}
                  onChange={e =>
                    handleDesignChange("OTHER", "inlineFan", e.target.value)
                  }
                />
              </div>

              <div className="col-md-4">
                <label>Disc Valve</label>
                <input
                  type="number"
                  className="form-control"
                  value={designInputs.OTHER.discValve}
                  onChange={e =>
                    handleDesignChange("OTHER", "discValve", e.target.value)
                  }
                />
              </div>

              <div className="col-md-4">
                <label>Max Condensate Line / Unit (m)</label>
                <input
                  type="number"
                  className="form-control"
                  value={designInputs.OTHER.condensate}
                  onChange={e =>
                    handleDesignChange("OTHER", "condensate", e.target.value)
                  }
                />
              </div>
            </div>
          </div>

        </div>
        <div className="mt-3">
          <button
            className="btn btn-primary me-2"
            onClick={handleSaveSectionA}
          >
            Save Details
          </button>

          <button
            className="btn btn-warning"
            onClick={handleGenerateBOQ}
          >
            Generate BOQ
          </button>
        </div>

        {/* -------- BOQ TOGGLE -------- */}
        {formData.mechBOQ && (
          <div className="mt-4">
            <button
              className="btn btn-outline-secondary mb-2"
              onClick={() => setShowBOQ(prev => !prev)}
            >
              {showBOQ ? "Hide BOQ" : "Show BOQ"}
            </button>

            {showBOQ && (
              <>
                <h5>Mechanical BOQ</h5>

                {formData.mechBOQ.map((section, i) => (
                  <div key={i} className="mb-3">
                    <h6>{section.category}</h6>

                    <table className="table table-sm table-bordered">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Unit</th>
                          <th>Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.items.map((item, j) => (
                          <tr key={j}>
                            <td>{item.name}</td>
                            <td>{item.unit}</td>
                            <td>{item.qty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        <h5 className="mt-3">SECTION B: Enter room details to calculated required total cooling capacity & equipment type</h5>

        {formData.loadEntries.map((row, i) => (
          <div key={i} className="row g-2 mb-2">
            <div className="col">
              <select
                className="form-select"
                value={row.usage || ""}
                onChange={e =>
                  updateEntry(i, "usage", Number(e.target.value))
                }
              >
                <option value="">-- Select Room Usage --</option>
                {ROOM_USAGE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

            </div>
            <div className="col">
              <input className="form-control" placeholder="Length (m)"
                value={row.length}
                onChange={e => updateEntry(i, "length", e.target.value)} />
            </div>
            <div className="col">
              <input className="form-control" placeholder="Width (m)"
                value={row.width}
                onChange={e => updateEntry(i, "width", e.target.value)} />
            </div>
            <div className="col">
              <input className="form-control" placeholder="Height (m)"
                value={row.height}
                onChange={e => updateEntry(i, "height", e.target.value)} />
            </div>
            <div className="col">
              <input className="form-control" placeholder="No. Rooms (qty)"
                value={row.rooms}
                onChange={e => updateEntry(i, "rooms", e.target.value)} />
            </div>
            <div className="col-auto">
              <button className="btn btn-danger" onClick={() => removeEntry(i)}>−</button>
            </div>
          </div>
        ))}

        <button className="btn btn-secondary me-2" onClick={addEntry}>＋ Add Room</button>
        {/* <button className="btn btn-primary" onClick={handleCalculate}>Calculate Load</button>
        <button className="btn btn-success" onClick={() => sendLoadEntriesToSheet(formData.loadEntries)}>Calculate Load</button> */}
        <div className="mt-3">
          <button
            className="btn btn-success me-2"
            onClick={handleCalculate}
          >
            Calculate Load
          </button>

          <button
            className="btn btn-primary"
            onClick={handleSaveLoadDetails}
          >
            Save Load Details
          </button>
        </div>

        {/* -------- LOAD TABLE -------- */}
        {showLoadTable && (
          <div className="mt-3">
            <button
              className="btn btn-link"
              onClick={() => setShowLoadTable(!showLoadTable)}
            >
              Toggle Load Schedule
            </button>

            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>Room Usage</th>
                  <th>Room Area (m2)</th>
                  <th>Cooling Capacity (kW)</th>
                  <th>Equipment Type</th>
                </tr>
              </thead>
              <tbody>
                {formData.loadSchedule.map((r, i) => (
                  <tr key={i}>
                    <td>{usageLabelMap[r.roomUsage] || r.roomUsage}</td>
                    <td>{r.roomArea}</td>
                    <td>{r.coolingKW}</td>
                    <td>{r.equipment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* -------- FILES -------- */}
        <label className="mt-3">Upload Files</label>
        <MultiUploadWithDelete
          uploadedFiles={formData.fileUpload}
          onFilesChange={files =>
            setFormData(prev => ({ ...prev, fileUpload: files }))
          }
        />

        {/* -------- STAFF -------- */}
        <label className="mt-3">Staff Assigned</label>
        <StaffSelector
          options={getRolesForSelector()}
          value={formData.staffAssigned}
          onChange={uids =>
            setFormData(prev => ({ ...prev, staffAssigned: uids }))
          }
        />

        <button className="btn btn-success mt-3" onClick={handleSave}>
          {editingId ? "Update Design" : "Save Design"}
        </button>
      </div>

      {/* ---------------- SAVED TABLE ---------------- */}
      <table className="table table-striped mt-4">
        <thead>
          <tr>
            <th>Created By</th>
            <th>Project</th>
            <th>Design Data</th>
            <th>Files</th>
            <th>Staff Assigned</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {designs.length ? designs.map(d => (
            <tr key={d.id}>
              <td>{d.createdBy?.name || "--"}</td>

              <td>{d.projectName}</td>
              <td>
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() =>
                    setExpandedRows(prev => ({
                      ...prev,
                      [d.id]: !prev[d.id],
                    }))
                  }
                >
                  {expandedRows[d.id] ? "Hide" : "View"} Load Schedule
                </button>

                {expandedRows[d.id] && (
                  <table className="table table-sm mt-2">
                    <thead>
                      <tr>
                        <th>Room</th>
                        <th>Area m2</th>
                        <th>Cooling Cap kW</th>
                        <th>Equipment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(d.loadSchedule || []).map((r, i) => (
                        <tr key={i}>
                          <td>{usageLabelMap[r.roomUsage] || r.roomUsage}</td>
                          <td>{r.roomArea}</td>
                          <td>{r.coolingKW}</td>
                          <td>{r.equipment}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </td>
              <td>
                {d.fileUpload.length ? (
                  <ul style={{ paddingLeft: 16 }}>
                    {d.fileUpload.map(f => (
                      <li key={f.fileId}>
                        <button
                          style={{
                            background: "none",
                            border: "none",
                            color: "#1976d2",
                            cursor: "pointer",
                            textDecoration: "underline"
                          }}
                          onClick={async () => {
                            const tokens = JSON.parse(localStorage.getItem("googleTokens"));
                            const token = tokens?.access_token;

                            if (!token) {
                              alert("You must login first");
                              return;
                            }

                            const result = await window.electron.downloadFile(f.fileId, token, f.name)

                            if (!result?.success) {
                              alert("Download failed");
                            }
                          }}
                        >
                          ⬇ {f.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : "--"}
              </td>

              <td>
                {(d.staffAssigned || [])
                  .map(uid => staffNameMap[uid] || uid)
                  .join(", ")}
              </td>

              <td>
                {d.createdAt
                  ? new Date(
                    d.createdAt.seconds
                      ? d.createdAt.seconds * 1000
                      : d.createdAt
                  ).toLocaleString()
                  : "--"}
              </td>

              <td>
                <button
                  className="btn btn-sm btn-outline-primary me-2"
                  onClick={() => handleEdit(d)}
                >
                  Edit
                </button>

                <button
                  className="btn btn-sm btn-danger"
                  onClick={async () => {
                    await deleteDesign(companyId, d.id);
                    setDesigns(prev => prev.filter(x => x.id !== d.id));
                  }}

                >
                  Delete
                </button>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan="6" className="text-center">
                No design records yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>


    </div>
  );
}
