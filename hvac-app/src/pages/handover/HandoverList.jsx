// src/pages/handover/HandoverList.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";

import { getLeads } from "../../firebase/leadsService";
import {
  addHandover,
  getHandovers,
  updateHandover,
  deleteHandover,
} from "../../firebase/handoverService";

import MultiUploadWithDelete from "../leads/LeadsFileUpload";
import StaffSelector from "../../components/layout/StaffSelector";
import { getRolesForSelector } from "../../config/roleAccess";

import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { notifyAssignedStaff } from "../leads/LeadsListHelper";

/* -----------------------------
   Helper (same as Tender)
----------------------------- */
function cleanData(data) {
  return Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
}

export default function HandoverList() {
  const { companyId, user } = useAuth();
  const [handoverList, setHandoverList] = useState([]);
  const [projectList, setProjectList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    projectName: "",
    fileUpload: [],
    remarks: "",
    staffAssigned: [],
    completionStatus: "Project not Completed",
  });

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
  const notifyStaffForLead = async (companyId, userIds, handoverId, leadData, sourcePage, mainMenu) => {
    if (!userIds || !userIds.length) return;
    await notifyAssignedStaff(companyId, handoverId, leadData, userIds, sourcePage, mainMenu);
  };


  /* -----------------------------
     Load projects
  ----------------------------- */
  useEffect(() => {
    if (!companyId) return;

    const loadProjects = async () => {
      const leads = await getLeads(companyId);
      setProjectList([...new Set(leads.map(l => l.projectName))]);
    };

    loadProjects();
  }, [companyId]);

  /* -----------------------------
     Load handovers (NEWEST FIRST)
  ----------------------------- */
  useEffect(() => {
    if (!companyId) return;

    const loadHandovers = async () => {
      const data = await getHandovers(companyId);

      setHandoverList(
        (data || []).sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        )
      );
    };

    loadHandovers();
  }, [companyId]);

  /* -----------------------------
     Save / Update
  ----------------------------- */
  const handleSave = async () => {
    if (!formData.projectName.trim()) {
      alert("Project name is required");
      return;
    }

    // const creatorName = staffNameMap[user.uid] || user.email || "Unknown User";

    const cleaned = {
      ...cleanData(formData),
      staffAssigned: formData.staffAssigned,
    };

    // only set createdBy on create
    if (!editingId) {
      const creatorName = staffNameMap[user.uid] || "Unknown User";
      cleaned.createdBy = {
        uid: user.uid,
        name: creatorName,
      };
    }

    let id;

    if (editingId) {
      console.log("Editing ID:", editingId);
      await updateHandover(companyId, editingId, cleaned);
      id = editingId;
      setEditingId(null);
    } else {
      const creatorName = staffNameMap[user.uid] || "Unknown User";
      id = await addHandover(companyId, {
        ...cleaned,
        createdBy: {
          uid: user.uid,
          name: creatorName,
        },
      });
    }

    // Notify staff
    try {
      if (companyId && user && staffAssignedIds.length > 0) {
        await notifyStaffForLead(
          companyId,
          staffAssignedIds,
          id,
          cleaned,
          "Handover".trim(),
          "Handover"
        );
      }
    } catch (err) {
      console.warn("Notification failed, lead still saved:", err);
    }

    setFormData({
      projectName: "",
      fileUpload: [],
      remarks: "",
      staffAssigned: [],
      completionStatus: "Project not Completed",
    });

    const refreshed = await getHandovers(companyId);
    setHandoverList(
      (refreshed || []).sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      )
    );
  };

  /* -----------------------------
     Edit
  ----------------------------- */
  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      projectName: item.projectName || "",
      fileUpload: item.fileUpload || [],
      remarks: item.remarks || "",
      staffAssigned: item.staffAssigned || [],
      completionStatus: item.completionStatus || "Project not Completed",
    });
  };

  /* -----------------------------
     Delete
  ----------------------------- */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this handover?")) return;
    await deleteHandover(companyId, id);
    setHandoverList(prev => prev.filter(h => h.id !== id));
  };

  /* -----------------------------
     JSX
  ----------------------------- */
  return (
    <div className="container py-4">
      <h2 className="mb-4">Project Handover</h2>

      <div className="card shadow-sm mb-4">
        <div className="card-body">

          <div className="mb-3">
            <label className="form-label">Project Name</label>
            <select
              className="form-select"
              value={formData.projectName}
              onChange={(e) =>
                setFormData({ ...formData, projectName: e.target.value })
              }
            >
              <option value="">-- Select Project --</option>
              {projectList.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Upload Files</label>
            <MultiUploadWithDelete
              uploadedFiles={formData.fileUpload}
              onFilesChange={(files) =>
                setFormData(prev => ({ ...prev, fileUpload: files }))
              }
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Handover Remarks</label>
            <textarea
              className="form-control"
              rows="3"
              value={formData.remarks}
              onChange={(e) =>
                setFormData({ ...formData, remarks: e.target.value })
              }
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Staff Assigned</label>
            <StaffSelector
              options={getRolesForSelector()}
              value={formData.staffAssigned}
              onChange={(v) =>
                setFormData(prev => ({ ...prev, staffAssigned: v }))
              }
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Completion Status</label>
            {["Project Completed", "Project not Completed"].map(status => (
              <div className="form-check" key={status}>
                <input
                  className="form-check-input"
                  type="radio"
                  checked={formData.completionStatus === status}
                  onChange={() =>
                    setFormData({ ...formData, completionStatus: status })
                  }
                />
                <label className="form-check-label">{status}</label>
              </div>
            ))}
          </div>

          <button className="btn btn-primary" onClick={handleSave}>
            {editingId ? "Update Handover" : "Save Handover"}
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="card shadow-sm">
        <div className="card-body">
          <table className="table table-bordered table-hover">
            <thead className="table-light">
              <tr>
                <th>Created By</th>
                <th>Project</th>
                <th>Remarks</th>
                <th>Staff Assigned</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {handoverList.length ? handoverList.map(item => (
                <tr key={item.id}>
                  <td>{item.createdBy?.name || "--"}</td>
                  <td>{item.projectName}</td>
                  <td>
                {item.fileUpload.length ? (
                  <ul style={{ paddingLeft: 16 }}>
                    {item.fileUpload.map(f => (
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
                  <td>{item.remarks || "--"}</td>
                  <td>
                    {(item.staffAssigned || [])
                      .map(uid => staffNameMap[uid] || uid)
                      .join(", ")}
                  </td>
                  <td>{item.completionStatus}</td>
                  <td>
                    {item.createdAt
                      ? new Date(item.createdAt.seconds * 1000).toLocaleString()
                      : "--"}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-warning me-2"
                      onClick={() => handleEdit(item)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(item.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" className="text-center">
                    No handover records yet.
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      </div>
    </div>
  );
}
