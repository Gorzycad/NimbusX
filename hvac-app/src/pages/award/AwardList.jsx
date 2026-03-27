// src/pages/awards/AwardPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";

import {
  addAward,
  updateAward,
  deleteAward,
  getAwards,
} from "../../firebase/awardService";

import { getLeads } from "../../firebase/leadsService";
import { updateTenderAwardStatus } from "../../firebase/tenderService";

import MultiUploadWithDelete from "../leads/LeadsFileUpload";
import StaffSelector from "../../components/layout/StaffSelector";
import { getRolesForSelector } from "../../config/roleAccess";

import { notifyAssignedStaff } from "../leads/LeadsListHelper";
import { useCallback } from "react";

import { db } from "../../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";

function cleanData(data) {
  return Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
}

export default function AwardPage() {
  const { companyId, user } = useAuth();

  const [awards, setAwards] = useState([]);
  const [projectList, setProjectList] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [staffList, setStaffList] = useState([]);

  const [formData, setFormData] = useState({
    projectName: "",
    fileUpload: [],
    staffAssigned: [],
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

  const handleFilesChange = useCallback((files) => {
    setFormData(prev => ({
      ...prev,
      fileUpload: files,
    }));
  }, []);

  /* ---------------- STAFF NAME MAP ---------------- */
  const staffNameMap = useMemo(() => {
    const map = {};
    staffList.forEach(u => {
      map[u.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    });
    return map;
  }, [staffList]);

  /* ---------------- LOAD PROJECTS ---------------- */
  useEffect(() => {
    if (!companyId) return;

    const loadProjects = async () => {
      const leads = await getLeads(companyId);
      const names = Array.from(new Set(leads.map(l => l.projectName)));
      setProjectList(names);
    };

    loadProjects();
  }, [companyId]);

  /* ---------------- LOAD AWARDS ---------------- */
  useEffect(() => {
    if (!companyId) return;

    const fetchAwards = async () => {
      const data = await getAwards(companyId);
      setAwards(
        (data || []).sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        )
      );
    };

    fetchAwards();
  }, [companyId]);

  /* ---------------- SAVE / UPDATE ---------------- */
  const handleSave = async () => {
    if (!formData.projectName.trim()) {
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

    let awardId;

    if (editingId) {
      await updateAward(companyId, editingId, cleaned);
      awardId = editingId;
      setEditingId(null);
    } else {
      const docRef = await addAward(companyId, cleaned);
      awardId = docRef.id;
    }

    // 🔁 Update Tender status (same as before)
    await updateTenderAwardStatus(
      companyId,
      formData.projectName,
      "Awarded"
    );

    console.log("AwardId before notify:", awardId);
    console.log("Staff assigned:", formData.staffAssigned);


    // 🔔 Notify staff — SAME PATTERN AS TENDERLIST
    if (formData.staffAssigned.length) {
      await notifyAssignedStaff(
        companyId,
        awardId,
        cleaned,
        formData.staffAssigned,
        "Award",
        "Marketing"
      );
    }

    setFormData({
      projectName: "",
      fileUpload: [],
      staffAssigned: [],
    });

    const refreshed = await getAwards(companyId);
    setAwards(
      (refreshed || []).sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      )
    );
  };

  /* ---------------- EDIT ---------------- */
  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      projectName: item.projectName || "",
      fileUpload: item.fileUpload || [],
      staffAssigned: item.staffAssigned || [],
    });
  };

  /* ---------------- DELETE ---------------- */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this award?")) return;
    await deleteAward(companyId, id);
    setAwards(prev => prev.filter(a => a.id !== id));
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="container mt-4">
      <h2>Project Award Management</h2>

      <div className="card p-3 shadow-sm">
        <label>Project Name</label>
        <select
          className="form-select mb-3"
          value={formData.projectName}
          onChange={e =>
            setFormData({ ...formData, projectName: e.target.value })
          }
        >
          <option value="">-- Select Project --</option>
          {projectList.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <label>Upload Files</label>
        <MultiUploadWithDelete
          uploadedFiles={formData.fileUpload}
          onFilesChange={handleFilesChange}
        />



        <label className="mt-3">Staff Assigned</label>
        <StaffSelector
          options={getRolesForSelector()}
          value={formData.staffAssigned}
          onChange={uids =>
            setFormData(prev => ({ ...prev, staffAssigned: uids }))
          }
        />

        <button className="btn btn-primary mt-3" onClick={handleSave}>
          {editingId ? "Update Award" : "Save Award"}
        </button>
      </div>

      <table className="table table-striped mt-4">
        <thead>
          <tr>
            <th>Created By</th>
            <th>Project</th>
            <th>Files</th>
            <th>Staff Assigned</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {awards.length ? awards.map(a => (
            <tr key={a.id}>
              <td>{a.createdBy?.name || "--"}</td>
              <td>{a.projectName}</td>
              <td>
                {a.fileUpload.length ? (
                  <ul style={{ paddingLeft: 16 }}>
                    {a.fileUpload.map(f => (
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
                {(a.staffAssigned || [])
                  .map(uid => staffNameMap[uid] || uid)
                  .join(", ")}
              </td>
              <td>
                {a.createdAt
                  ? new Date(a.createdAt.seconds * 1000).toLocaleString()
                  : "--"}
              </td>
              <td>
                <button onClick={() => handleEdit(a)}>Edit</button>
                <button onClick={() => handleDelete(a.id)}>Delete</button>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan="6" className="text-center">
                No award records yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
