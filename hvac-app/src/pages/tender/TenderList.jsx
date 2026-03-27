//src/pages/tender/TenderList.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";

import {
  addTender,
  updateTender,
  deleteTender,
  getTenders
} from "../../firebase/tenderService";

import { getLeads } from "../../firebase/leadsService";

import MultiUploadWithDelete from "../leads/LeadsFileUpload";
import StaffSelector from "../../components/layout/StaffSelector";
import { getRolesForSelector } from "../../config/roleAccess";

import {
  collection,
  getDocs
} from "firebase/firestore";

import { db } from "../../firebase/firebase";
import { notifyAssignedStaff } from "../leads/LeadsListHelper";

function cleanData(data) {
  return Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
}

export default function TenderList() {
  const { companyId, user } = useAuth();

  const [tenders, setTenders] = useState([]);
  const [projectList, setProjectList] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [staffList, setStaffList] = useState([]);

  const [formData, setFormData] = useState({
    title: "",
    projectName: "",
    fileUpload: [],
    staffAssigned: [],
    awardedStatus: "Pending",
  });

  /* -----------------------------
     Load staff
  ----------------------------- */
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

  /* -----------------------------
     Staff name map
  ----------------------------- */
  const staffNameMap = useMemo(() => {
    const map = {};
    staffList.forEach(u => {
      map[u.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    });
    return map;
  }, [staffList]);

  /* -----------------------------
     Load projects from leads
  ----------------------------- */
  useEffect(() => {
    if (!companyId) return;

    const loadProjects = async () => {
      const leads = await getLeads(companyId);
      const names = Array.from(new Set(leads.map(l => l.projectName)));
      setProjectList(names);
    };

    loadProjects();
  }, [companyId]);

  /* -----------------------------
     Load tenders (NEWEST FIRST)
  ----------------------------- */
  useEffect(() => {
    if (!companyId) return;

    const loadTenders = async () => {
      const data = await getTenders(companyId);

      const sorted = (data || []).sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      setTenders(sorted);
    };

    loadTenders();
  }, [companyId]);

  /* -----------------------------
     Save / Update
  ----------------------------- */
  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert("Tender title is required");
      return;
    }

    if (!formData.projectName) {
      alert("Project name is required");
      return;
    }

    const creatorName = staffNameMap[user.uid] || "Unknown User";

    const cleaned = {
      ...cleanData(formData),
      staffAssigned: formData.staffAssigned,
    };

    if (!editingId) {
      cleaned.createdBy = {
        uid: user.uid,
        name: creatorName,
      };
    }

    let tenderId;

    if (editingId) {
      await updateTender(companyId, editingId, cleaned);
      tenderId = editingId;
      setEditingId(null);
    } else {
      const docRef = await addTender(companyId, cleaned);
      tenderId = docRef.id;
    }

    console.log("TenderId before notify:", tenderId);
    console.log("Staff assigned:", formData.staffAssigned);

    // Notify staff
    if (formData.staffAssigned.length) {
      await notifyAssignedStaff(
        companyId,
        tenderId,
        cleaned,
        formData.staffAssigned,
        "Tender",
        "Marketing"
      );
    }

    setFormData({
      title: "",
      projectName: "",
      fileUpload: [],
      staffAssigned: [],
      awardedStatus: "Pending",
    });

    const refreshed = await getTenders(companyId);
    setTenders(
      (refreshed || []).sort((a, b) =>
        (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      )
    );
  };

  /* -----------------------------
     Edit
  ----------------------------- */
  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      title: item.title || "",
      projectName: item.projectName || "",
      fileUpload: item.fileUpload || [],
      staffAssigned: item.staffAssigned || [],
      awardedStatus: item.awardedStatus || "Pending",
    });
  };

  /* -----------------------------
     Delete
  ----------------------------- */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this tender?")) return;
    await deleteTender(companyId, id);

    setTenders(prev => prev.filter(t => t.id !== id));
  };

  /* -----------------------------
     JSX
  ----------------------------- */
  return (
    <div className="container py-4">
      <h2 className="mb-4">Tender Management</h2>

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
            <label className="form-label">Tender Title</label>
            <input
              className="form-control"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
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
            <label className="form-label">Project Status</label>
            {["Awarded", "Not Awarded", "Pending"].map(status => (
              <div className="form-check" key={status}>
                <input
                  className="form-check-input"
                  type="radio"
                  checked={formData.awardedStatus === status}
                  onChange={() =>
                    setFormData({ ...formData, awardedStatus: status })
                  }
                />
                <label className="form-check-label">{status}</label>
              </div>
            ))}
          </div>

          <button className="btn btn-primary" onClick={handleSave}>
            {editingId ? "Update Tender" : "Save Tender"}
          </button>

        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <table className="table table-bordered table-hover">
            <thead className="table-light">
              <tr>
                <th>Created By</th>
                <th>Title</th>
                <th>Project</th>
                <th>Files</th>
                <th>Staff Assigned</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {tenders.length ? tenders.map(item => (
                <tr key={item.id}>
                  <td>{item.createdBy?.name || "--"}</td>
                  <td>{item.title}</td>
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
                )
                      : "--"}
                  </td>
                  <td>
                    {(item.staffAssigned || [])
                      .map(uid => staffNameMap[uid] || uid)
                      .join(", ")}
                  </td>
                  <td>{item.awardedStatus}</td>
                  <td>
                    {item.createdAt
                      ? new Date(item.createdAt.seconds * 1000).toLocaleString()
                      : "--"}
                  </td>
                  <td>
                    <button className="btn btn-sm btn-warning me-2" onClick={() => handleEdit(item)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>Delete</button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8" className="text-center">No tender records yet.</td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      </div>
    </div>
  );
}
