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
  const [boqFromSheet, setBoqFromSheet] = useState(null);
  const [boqRanges, setBoqRanges] = useState(null);
  const [staffList, setStaffList] = useState([]);


  const [formData, setFormData] = useState({
    projectName: "",
    fileUpload: [],
    staffAssigned: [],
    loadEntries: [],
    loadSchedule: [],
  });

  const [expandedRows, setExpandedRows] = useState({});
  const [showLoadTable, setShowLoadTable] = useState(false);

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

  const updateEntry = (index, field, value) => {
    const updated = [...formData.loadEntries];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, loadEntries: updated }));
  };

  const handleCalculate = () => {
    const schedule = calculateLoad(formData.loadEntries);
    setFormData(prev => ({ ...prev, loadSchedule: schedule }));
    setShowLoadTable(true);
  };

  const sendLoadEntriesToSheet = async (entries) => {
    if (!entries.length) {
      alert("No load entries to send");
      return;
    }

    const payload = {
      rows: entries.map(e => ([
        e.usage,
        e.length,
        e.width,
        e.height,
        e.rooms,
      ])),
    };

    // const e = entries[0];

    // const payload = {
    //   Name1: e.usage,
    //   Name2: e.length,
    //   Name3: e.width,
    //   Name4: e.height,
    //   Name5: e.rooms,
    // };

    try {
      const res = await fetch("http://localhost:4000/sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      // ✅ STORE BOQ SNAPSHOT
      setBoqFromSheet(data.boq);
      setBoqRanges(data.ranges);

      console.log("BOQ from sheet saved:", data.boq);
    } catch (err) {
      console.error("Sheet error:", err);
    }
  };


  const handleCalculateAndSend = async () => {
    // 1️⃣ Do local load calculation
    handleCalculate();

    // 2️⃣ Send data to Google Sheet
    await sendLoadEntriesToSheet(formData.loadEntries);
  };


  /* ---------------- SAVE ---------------- */
  const handleSave = async () => {
    if (!formData.projectName) {
      alert("Project name is required");
      return;
    }

    if (!boqFromSheet) {
      alert("Please calculate load first");
      return;
    }
    const creatorName = staffNameMap[user.uid] || "Unknown User";

    const designPayload = {
      projectName: formData.projectName,
      fileUpload: formData.fileUpload,
      staffAssigned: formData.staffAssigned,
      loadEntries: formData.loadEntries,
      loadSchedule: formData.loadSchedule,

      // ✅ FINAL, IMMUTABLE BOQ SNAPSHOT
      boq: boqFromSheet,

      // ✅ OPTIONAL: reference only
      boqSheet: boqRanges,


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

    setBoqFromSheet(null);
    setBoqRanges(null);
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

    setBoqFromSheet(item.boq || null);
    setBoqRanges(item.boqSheet || null);
    setShowLoadTable(true);
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
        <h5 className="mt-3">Enter Project Data</h5>

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
        <button
          className="btn btn-success"
          onClick={handleCalculateAndSend}
        >
          Calculate Load
        </button>


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
                {(d.fileUpload || []).map(f => (
                  <div key={f.fileId}>
                    <a href={f.url} target="_blank" rel="noreferrer">
                      ⬇ {f.name}
                    </a>
                  </div>
                ))}
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
