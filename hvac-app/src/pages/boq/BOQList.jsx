import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getLeads } from "../../firebase/leadsService";
import { addBoq, updateBoq, deleteBoq, getBoqs } from "../../firebase/boqService";
import StaffSelector from "../../components/layout/StaffSelector";
import { getRolesForSelector } from "../../config/roleAccess";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { notifyAssignedStaff } from "../leads/LeadsListHelper";
import { getDesigns } from "../../firebase/designService";


/* role -> key */
function roleNameToKeyLocal(friendlyName) {
  return friendlyName.toUpperCase().replace(/\s+/g, "_");
}

/* fetch users by roles */
async function getUsersByRoles(selectedRoles = [], companyId = null) {
  if (!selectedRoles?.length) return [];
  const roleKeys = selectedRoles.map(roleNameToKeyLocal);
  const usersRef = collection(db, "companies", companyId, "users");
  const q = query(usersRef, where("role", "in", roleKeys));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

export default function BoqPage() {
  const { companyId, user } = useAuth();
  const [boqRows, setBoqRows] = useState([]);
  const [projectList, setProjectList] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openSection, setOpenSection] = useState(null);
  const [designs, setDesigns] = useState([]);
  const [staffList, setStaffList] = useState([]);
  //const [boqs, setBoqs] = useState([]);

  const [formData, setFormData] = useState({
    title: "",
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
        new Set((leads || []).map((l) => l.projectName).filter(Boolean))
      );
      setProjectList(names);
    };
    load();
  }, [companyId]);

  useEffect(() => {
    if (!formData.projectName) return;

    const design = designs.find(
      d => d.projectName === formData.projectName
    );

    if (!design || !design.boq) {
      console.warn("No BOQ found for project:", formData.projectName);
      return;
    }

    setFormData(prev => ({
      ...prev,
      mechanical: structuredClone(design.boq.mechanical || []),
      electrical: structuredClone(design.boq.electrical || []),
      plumbing: structuredClone(design.boq.plumbing || []),
    }));
  }, [formData.projectName, designs]);


  /* ---------------- LOAD BOQ FROM SHEET ---------------- */
  useEffect(() => {
    if (!companyId) return;

    const loadDesigns = async () => {
      const data = await getDesigns(companyId);
      setDesigns(data || []);
    };

    loadDesigns();
  }, [companyId]);

  /* ---------------- LOAD BOQ ON PAGE LOAD ---------------- */
  useEffect(() => {
    if (!companyId) return;

    const loadBOQs = async () => {
      setLoading(true);
      const data = await getBoqs(companyId);
      const sorted = (data || []).sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      setBoqRows(sorted);
      setLoading(false);
    };

    loadBOQs();
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
  const notifyStaffForLead = async (companyId, userIds, boqId, leadData, sourcePage, mainMenu) => {
    if (!userIds || !userIds.length) return;
    await notifyAssignedStaff(companyId, boqId, leadData, userIds, sourcePage, mainMenu);
  };

  /* ---------------- CALCULATE TOTALS ---------------- */
  const sectionTotals = useMemo(() => {
    const calc = (rows) => rows.reduce((s, r) => s + Number(r.qty || 0) * Number(r.rate || 0), 0);
    return {
      mechanical: calc(formData.mechanical),
      electrical: calc(formData.electrical),
      plumbing: calc(formData.plumbing),
      grand: calc(formData.mechanical) + calc(formData.electrical) + calc(formData.plumbing),
    };
  }, [formData]);

  /* ---------------- UPDATE NESTED FIELD ---------------- */
  function updateFormField(path, value) {
    setFormData((prev) => {
      const clone = structuredClone(prev);
      const parts = path.replace(/\]/g, "").split(/\.|\[/).filter(Boolean);
      let cur = clone;
      for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
      cur[parts.at(-1)] = value;
      return clone;
    });
  }

  /* ---------------- ADD / REMOVE ROW ---------------- */
  function addRow(section) {
    setFormData((prev) => {
      const clone = structuredClone(prev);
      clone[section].push({ item: "", qty: 0, unit: "", rate: 0 });
      return clone;
    });
  }

  function removeRow(section, idx) {
    setFormData((prev) => {
      const clone = structuredClone(prev);
      clone[section].splice(idx, 1);
      return clone;
    });
  }

  /* ---------------- SAVE BOQ ---------------- */
  async function handleSave() {
    if (!formData.title.trim()) return alert("Title is required");
    if (!formData.projectName) return alert("Select project");

    const payload = {
      title: formData.title,
      projectName: formData.projectName,
      staffAssigned: formData.staffAssigned,
      mechanical: formData.mechanical,
      electrical: formData.electrical,
      plumbing: formData.plumbing,
      totals: sectionTotals,
    };

    let id;
    if (editingId) {
      id = editingId;
      await updateBoq(companyId, editingId, payload);
      setEditingId(null);
    } else {
      const creatorName = staffNameMap[user.uid] || "Unknown User";
      //id = await addBoq(companyId, payload);
      id = await addBoq(companyId, {
        ...payload,
        createdBy: {
          uid: user.uid,
          name: creatorName,
        },
      });
    }

    /* notify staff */
    try {
      if (companyId && user && staffAssignedIds.length > 0) {
        await notifyStaffForLead(
          companyId,
          staffAssignedIds,
          id,
          payload,
          "BOQ".trim(),
          "Estimation"
        );
      }
    } catch (err) {
      console.warn("Notification failed, lead still saved:", err);
    }

    /* reload saved BOQs */
    //const items = await getBoqs(companyId);
    //setBoqRows(items || []);

    /* reset form */
    setFormData({
      title: "",
      projectName: "",
      staffAssigned: [],
      mechanical: [],
      electrical: [],
      plumbing: [],
    });

    const refreshed = await getBoqs(companyId);
    setBoqRows(
      (refreshed || []).sort((a, b) =>
        (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      )
    );
    setOpenSection(null);
  }

  /* ---------------- EDIT BOQ ---------------- */
  function handleEdit(item) {
    setEditingId(item.id);
    setFormData({
      title: item.title || "",
      projectName: item.projectName || "",
      staffAssigned: item.staffAssigned || [],
      mechanical: structuredClone(item.mechanical || []),
      electrical: structuredClone(item.electrical || []),
      plumbing: structuredClone(item.plumbing || []),
    });
    setOpenSection(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------------- DELETE BOQ ---------------- */
  async function handleDelete(id) {
    if (!window.confirm("Delete this BOQ?")) return;
    await deleteBoq(companyId, id);
    const items = await getBoqs(companyId);
    setBoqRows(items || []);
  }

  /* ---------------- RENDER SECTION TABLE ---------------- */
  function renderSectionEditor(section) {

    if (!openSection || openSection !== section) return null;
    const isCategoryRow = (row) => !row.unit;

    return (
      <div className="card mt-3">
        <div className="card-body">
          <h5 className="card-title mb-3">{section.toUpperCase()} BOQ</h5>
          <table className="table table-bordered table-striped">
            {/* <thead>
              <tr>
                <th>Item</th>
                <th style={{ width: "100px" }}>Qty</th>
                <th>Unit</th>
                <th>Rate</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead> */}
            <thead>
              <tr>
                <th style={{ width: "40%" }}>Item</th>
                <th style={{ width: "8%" }}>Qty</th>
                <th style={{ width: "10%" }}>Unit</th>
                <th style={{ width: "15%" }}>Rate</th>
                <th style={{ width: "17%" }}>Total</th>
                <th style={{ width: "10%" }}></th>
              </tr>
            </thead>

            <tbody>
              {formData[section].map((row, idx) => {
                const rowTotal = Number(row.qty || 0) * Number(row.rate || 0);
                return (
                  // <tr key={idx} className={isCategoryRow(row) ? "table-secondary fw-bold" : ""} >
                  //   <td>
                  //     <input
                  //       className="form-control"
                  //       value={row.item}
                  //       onChange={(e) =>
                  //         updateFormField(`${section}[${idx}].item`, e.target.value)
                  //       }
                  //     />
                  //   </td>
                  <tr key={idx} className={isCategoryRow(row) ? "table-secondary" : ""}>
                    <td>
                      <input
                        className={`form-control ${isCategoryRow(row) ? "fw-bold" : ""}`}
                        value={row.item}
                        onChange={(e) =>
                          updateFormField(`${section}[${idx}].item`, e.target.value)
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        className="form-control"
                        value={isCategoryRow(row) ? "" : row.qty}
                        disabled={isCategoryRow(row)}
                        onChange={(e) =>
                          updateFormField(`${section}[${idx}].qty`, Number(e.target.value))
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="form-control"
                        value={row.unit}
                        disabled={isCategoryRow(row)}
                        onChange={(e) =>
                          updateFormField(`${section}[${idx}].unit`, e.target.value)
                        }
                      />
                    </td>

                    {/* <td>
                      <input
                      type="number"
                        className="form-control"
                        value={isCategoryRow(row) ? "" : row.unit}
                        disabled={isCategoryRow(row)}
                        onChange={(e) =>
                          updateFormField(`${section}[${idx}].unit`, e.target.value)
                        }
                      />
                    </td> */}
                    <td>
                      <input
                        type="number"
                        className="form-control"
                        value={isCategoryRow(row) ? "" : row.rate}
                        disabled={isCategoryRow(row)}
                        onChange={(e) =>
                          updateFormField(`${section}[${idx}].rate`, Number(e.target.value))
                        }
                      />
                    </td>

                    <td>
                      {isCategoryRow(row)
                        ? ""
                        : rowTotal.toLocaleString()}
                    </td>

                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => removeRow(section, idx)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="d-flex justify-content-between mt-3">
            <button className="btn btn-success" onClick={() => addRow(section)}>
              Add Row
            </button>
            <div>
              <strong>Section Total: {sectionTotals[section].toLocaleString()}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- JSX ---------------- */
  return (
    <div className="container py-4">
      <h2 className="mb-4 fw-bold">BOQ Management</h2>

      <div className="card mb-4">
        <div className="card-body">
          {/* form */}
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Title</label>
              <input
                className="form-control"
                value={formData.title}
                onChange={(e) => updateFormField("title", e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Project</label>
              <select
                className="form-select"
                value={formData.projectName}
                onChange={(e) => updateFormField("projectName", e.target.value)}
              >
                <option value="">-- Select project --</option>
                {projectList.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Staff Assigned (roles)</label>
              <StaffSelector
                options={getRolesForSelector()}
                value={formData.staffAssigned}
                onChange={(v) => updateFormField("staffAssigned", v)}
              />
            </div>
          </div>

          {/* section buttons */}
          <div className="d-flex gap-2 mt-4 flex-wrap">
            {["mechanical", "electrical", "plumbing"].map((s) => (
              <button
                key={s}
                className="btn btn-outline-secondary"
                onClick={() =>
                  setOpenSection(openSection === s ? null : s)
                }
              >
                {s.charAt(0).toUpperCase() + s.slice(1)} BOQ – Total:{" "}
                {sectionTotals[s].toLocaleString()}
              </button>
            ))}
            <div className="ms-auto fw-bold">
              Grand Total: {sectionTotals.grand.toLocaleString()}
            </div>
          </div>

          {/* editors */}
          {renderSectionEditor("mechanical")}
          {renderSectionEditor("electrical")}
          {renderSectionEditor("plumbing")}

          {/* save / cancel */}
          <div className="mt-4 d-flex gap-3">
            <button className="btn btn-primary" onClick={handleSave}>
              {editingId ? "Update BOQ" : "Save BOQ"}
            </button>
            {editingId && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setEditingId(null);
                  setFormData({
                    title: "",
                    projectName: "",
                    staffAssigned: [],
                    mechanical: [],
                    electrical: [],
                    plumbing: [],
                  });
                  setOpenSection(null);
                }}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* saved BOQs */}
      <div className="card">
        <div className="card-body">
          <h5 className="mb-3 fw-semibold">Saved BOQs</h5>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <table className="table table-bordered table-striped">
              <thead>
                <tr>
                  <th>Created By</th>
                  <th>Title</th>
                  <th>Project</th>
                  <th>Grand Total</th>
                  <th>Staff Assigned</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {boqRows.map((b) => (
                  <tr key={b.id}>
                    <td>{b.createdBy?.name || "--"}</td>
                    <td>{b.title}</td>
                    <td>{b.projectName}</td>
                    <td>{(b.totals?.grand || 0).toLocaleString()}</td>
                    <td>
                      {(b.staffAssigned || [])
                        .map(uid => staffNameMap[uid] || uid)
                        .join(", ")}
                    </td>
                    <td>
                      {b.createdAt
                        ? new Date(b.createdAt.seconds
                          ? b.createdAt.seconds * 1000
                          : b.createdAt).toLocaleString()
                        : "--"}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-primary me-2"
                        onClick={() => handleEdit(b)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(b.id)}
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
