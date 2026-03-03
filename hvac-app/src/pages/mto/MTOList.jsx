// src/pages/mto/MTOList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getLeads } from "../../firebase/leadsService";
import { getBoqs } from "../../firebase/boqService";
import {
  addMto,
  getMtos,
  updateMto,
  deleteMto,
} from "../../firebase/mtoService";
import StaffSelector from "../../components/layout/StaffSelector";
import { getRolesForSelector } from "../../config/roleAccess";
import { notifyAssignedStaff } from "../leads/LeadsListHelper";
import { db } from "../../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function MtoPage() {
  const { companyId, user } = useAuth();
  const [projectList, setProjectList] = useState([]);
  const [mtos, setMtos] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState([]);

  const [formData, setFormData] = useState({
    projectName: "",
    staffAssigned: [],
    mechanical: [],
    electrical: [],
    plumbing: [],
  });

  /* ---------------- LOAD PROJECTS ---------------- */
  useEffect(() => {
    if (!companyId) return;

    const load = async () => {
      const leads = await getLeads(companyId);
      const names = Array.from(
        new Set((leads || []).map(l => l.projectName).filter(Boolean))
      );
      setProjectList(names);
    };

    load();
  }, [companyId]);

  /* ---------------- LOAD BOQ WHEN PROJECT SELECTED ---------------- */
  useEffect(() => {
    if (!companyId || !formData.projectName) return;

    const loadBoqForProject = async () => {
      const boqs = await getBoqs(companyId);

      const projectBoqs = boqs
        .filter(b => b.projectName === formData.projectName)
        .sort(
          (a, b) =>
            (b.createdAt?.seconds || 0) -
            (a.createdAt?.seconds || 0)
        );

      if (!projectBoqs.length) {
        setFormData(p => ({
          ...p,
          mechanical: [],
          electrical: [],
          plumbing: [],
        }));
        return;
      }

      const latest = projectBoqs[0];

      const stripRate = rows =>
        (rows || []).map(r => ({
          item: r.item || "",
          qty: r.qty || 0,
          unit: r.unit || "",
        }));

      setFormData(p => ({
        ...p,
        mechanical: stripRate(latest.mechanical),
        electrical: stripRate(latest.electrical),
        plumbing: stripRate(latest.plumbing),
      }));
    };

    loadBoqForProject();
  }, [companyId, formData.projectName]);

  /* ---------------- LOAD MTOS ---------------- */
  useEffect(() => {
    if (!companyId) return;

    const load = async () => {
      setLoading(true);
      const data = await getMtos(companyId);
      setMtos(data || []);
      setLoading(false);
    };

    load();
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
  const notifyStaffForLead = async (companyId, userIds, takeoffsId, leadData, sourcePage, mainMenu) => {
    if (!userIds || !userIds.length) return;
    await notifyAssignedStaff(companyId, takeoffsId, leadData, userIds, sourcePage, mainMenu);
  };

  /* ---------------- UPDATE FIELD ---------------- */
  function updateField(path, value) {
    setFormData(prev => {
      const clone = structuredClone(prev);
      const parts = path.replace(/\]/g, "").split(/\.|\[/).filter(Boolean);
      let cur = clone;
      for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
      cur[parts.at(-1)] = value;
      return clone;
    });
  }

  function addRow(section) {
    updateField(section, [
      ...formData[section],
      { item: "", qty: 0, unit: "" },
    ]);
  }

  function removeRow(section, idx) {
    const rows = formData[section].filter((_, i) => i !== idx);
    updateField(section, rows);
  }

  /* ---------------- SAVE ---------------- */
  async function handleSave() {
    if (!formData.projectName) {
      alert("Select project");
      return;
    }

    const payload = {
      ...formData,
      createdBy: {
        uid: user.uid,
        name: user.displayName || "Unknown",
      },
    };

    let id;

    if (editingId) {
      await updateMto(companyId, editingId, payload);
      id = editingId;
      setEditingId(null);
    } else {
      //await addMto(companyId, payload);
      const creatorName = staffNameMap[user.uid] || "Unknown User";
      id = await addMto(companyId, {
        ...payload,
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
          payload,
          "Takeoffs".trim(),
          "Estimation"
        );
      }
    } catch (err) {
      console.warn("Notification failed, lead still saved:", err);
    }

    const refreshed = await getMtos(companyId);
    setMtos(refreshed || []);

    setFormData({
      projectName: "",
      staffAssigned: [],
      mechanical: [],
      electrical: [],
      plumbing: [],
    });
  }

  /* ---------------- EDIT ---------------- */
  function handleEdit(item) {
    setEditingId(item.id);
    setFormData({
      projectName: item.projectName,
      staffAssigned: item.staffAssigned || [],
      mechanical: structuredClone(item.mechanical || []),
      electrical: structuredClone(item.electrical || []),
      plumbing: structuredClone(item.plumbing || []),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------------- DELETE ---------------- */
  async function handleDelete(id) {
    if (!window.confirm("Delete this MTO?")) return;
    await deleteMto(companyId, id);
    const refreshed = await getMtos(companyId);
    setMtos(refreshed || []);
  }

  /* ---------------- RENDER SECTION ---------------- */
  function renderSection(section) {
    return (
      <div className="mt-4">
        <h5 className="text-capitalize">{section} Takeoff</h5>

        <table className="table table-bordered table-sm">
          <thead>
            <tr>
              <th>Item</th>
              <th style={{ width: 100 }}>Qty</th>
              <th style={{ width: 120 }}>Unit</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>

          <tbody>
            {formData[section].map((row, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    className="form-control"
                    value={row.item}
                    onChange={e =>
                      updateField(`${section}[${idx}].item`, e.target.value)
                    }
                  />
                </td>

                <td>
                  <input
                    type="number"
                    className="form-control"
                    value={row.qty}
                    onChange={e =>
                      updateField(
                        `${section}[${idx}].qty`,
                        Number(e.target.value)
                      )
                    }
                  />
                </td>

                <td>
                  <input
                    className="form-control"
                    value={row.unit}
                    onChange={e =>
                      updateField(`${section}[${idx}].unit`, e.target.value)
                    }
                  />
                </td>

                <td className="text-center">
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => removeRow(section, idx)}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          className="btn btn-success btn-sm"
          onClick={() => addRow(section)}
        >
          + Add Row
        </button>
      </div>
    );
  }

  /* ---------------- JSX ---------------- */
  return (
    <div className="container py-4">
      <h2 className="mb-4 fw-bold">Material Takeoff (MTO)</h2>

      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Project</label>
              <select
                className="form-select"
                value={formData.projectName}
                onChange={e =>
                  setFormData({ ...formData, projectName: e.target.value })
                }
              >
                <option value="">-- Select Project --</option>
                {projectList.map(p => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="col-md-8">
              <label className="form-label">Staff Assigned</label>
              <StaffSelector
                options={getRolesForSelector()}
                value={formData.staffAssigned}
                onChange={uids =>
                  setFormData(prev => ({ ...prev, staffAssigned: uids }))
                }
              />
            </div>
          </div>

          {renderSection("mechanical")}
          {renderSection("electrical")}
          {renderSection("plumbing")}

          <button className="btn btn-primary mt-4" onClick={handleSave}>
            {editingId ? "Update MTO" : "Save MTO"}
          </button>
        </div>
      </div>

      {/* SAVED MTOS */}
      <div className="card">
        <div className="card-body">
          <h5 className="fw-semibold mb-3">Saved MTOs</h5>

          {loading ? (
            <div>Loading...</div>
          ) : (
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>Created By</th>
                  <th>Project</th>
                  <th>Staff Assigned</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {mtos.map(m => (
                  <tr key={m.id}>
                    <td>{m.createdBy?.name || "--"}</td>
                    <td>{m.projectName}</td>
                    <td>
                      {(m.staffAssigned || [])
                        .map(uid => staffNameMap[uid] || uid)
                        .join(", ")}
                    </td>
                    <td>
                      {m.createdAt
                        ? new Date(
                          m.createdAt.seconds
                            ? m.createdAt.seconds * 1000
                            : m.createdAt
                        ).toLocaleString()
                        : "--"}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-primary me-2"
                        onClick={() => handleEdit(m)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(m.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
