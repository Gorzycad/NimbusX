// src/pages/leads/LeadsList.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  addLead,
  updateLead,
  deleteLead,
  getLeads,
} from "../../firebase/leadsService";
import { notifyAssignedStaff } from "./LeadsListHelper";
import "./leads.css";
import { getRolesForSelector } from "../../config/roleAccess";
import StaffSelector from "../../components/layout/StaffSelector";
import { useAuth } from "../../contexts/AuthContext";
import LeadsFileUpload from "./LeadsFileUpload";
import { db } from "../../firebase/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

function cleanData(data) {
  return Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
}

export default function LeadsList() {
  const { companyId, user } = useAuth();

  const [leads, setLeads] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [staffList, setStaffList] = useState([]);

  /* ---------------- LOAD STAFF ---------------- */
  useEffect(() => {
    if (!companyId) return;

    const loadStaff = async () => {
      const snap = await getDocs(
        collection(db, "companies", companyId, "users")
      );

      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setStaffList(list);
    };

    loadStaff();
  }, [companyId]);


  const [formData, setFormData] = useState({
    projectName: "",
    clientName: "",
    email: "",
    phone: "",
    service: "",
    fileUpload: [],
    staffAssigned: [],
  });


  const staffAssignedIds = formData.staffAssigned;

  // Fetch leads once on mount or when companyId changes
  useEffect(() => {
    if (!companyId) return;

    const fetchLeads = async () => {
      const data = await getLeads(companyId);

      const sorted = (data || []).sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime; // NEWEST FIRST
      });

      setLeads(sorted);
    };

    fetchLeads();
  }, [companyId]);


  const staffNameMap = React.useMemo(() => {
    const map = {};
    staffList.forEach((u) => {
      map[u.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    });
    return map;
  }, [staffList]);

  // Notify assigned staff helper
  const notifyStaffForLead = async (companyId, userIds, leadId, leadData, sourcePage, mainMenu) => {
    if (!userIds || !userIds.length) return;
    await notifyAssignedStaff(companyId, leadId, leadData, userIds, sourcePage, mainMenu);
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Inside LeadsList.jsx
  const handleSave = async () => {
    try {
      if (!formData.projectName.trim()) {
        alert("Project Name is required.");
        return;
      }

      const creatorName = staffNameMap[user.uid] || "Unknown User";

      // Clean formData BEFORE sending it to Firestore
      const cleanedFormData = {
        ...cleanData(formData),
        staffAssigned: staffAssignedIds, // store IDs, not names

      };

      // 👇 ADD THIS (only on create)
      if (!editingId) {
        cleanedFormData.createdBy = {
          uid: user.uid,
          name: creatorName,
        };
      }

      let leadId;

      if (editingId) {
        // Update existing lead
        await updateLead(companyId, editingId, cleanedFormData);
        leadId = editingId;
        setEditingId(null);
      } else {
        // Add new lead and get the docRef
        if (!companyId) {
          alert("Company ID not loaded yet");
          return;
        }

        const docRef = await addLead(companyId, cleanedFormData);
        leadId = docRef.id;
      }

      try {
        if (companyId && user && staffAssignedIds.length > 0) {
          await notifyStaffForLead(
            companyId,
            staffAssignedIds,
            leadId,
            cleanedFormData,
            "Leads",
            "Marketing"
          );
        }
      } catch (err) {
        console.warn("Notification failed, lead still saved:", err);
      }


      // Reset form
      setFormData({
        projectName: "",
        clientName: "",
        email: "",
        phone: "",
        service: "",
        fileUpload: [],
        staffAssigned: [],
      });

      // Re-fetch leads once after save
      const data = await getLeads(companyId);

      const sorted = (data || []).sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      setLeads(sorted);

    } catch (err) {
      console.error("Error saving lead:", err);
      alert("Failed to save lead. Check console for details.");
    }
  };


  // Edit lead
  const handleEdit = (lead) => {
    setEditingId(lead.id);
    setFormData({
      projectName: lead.projectName,
      clientName: lead.clientName,
      email: lead.email,
      phone: lead.phone,
      service: lead.service,
      fileUpload: lead.fileUpload || [],
      staffAssigned: lead.staffAssigned || [],
    });
  };

  // Delete lead
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this lead?")) return;
    await deleteLead(companyId, id);
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  const getStaffNamesFromIds = (ids = []) => {
    return ids
      .map((uid) => {
        const user = staffList.find((u) => u.id === uid);
        return user ? `${user.firstName} ${user.lastName}` : uid;
      })
      .join(", ");
  };


  return (
    <div className="leads-container">
      <div className="leads-header">Company Leads</div>

      <div className="lead-form">
        <div>
          <label>Project Name</label>
          <input type="text" name="projectName" value={formData.projectName} onChange={handleChange} />
        </div>
        <div>
          <label>Client Name</label>
          <input type="text" name="clientName" value={formData.clientName} onChange={handleChange} />
        </div>
        <div>
          <label>Email</label>
          <input type="text" name="email" value={formData.email} onChange={handleChange} />
        </div>
        <div>
          <label>Phone</label>
          <input type="text" name="phone" value={formData.phone} onChange={handleChange} />
        </div>
        <div style={{ display: "flex", gap: 30 }}>
          <div style={{ flex: 1 }}>
            <label>Service / Notes</label>
            <textarea name="service" value={formData.service} onChange={handleChange} rows={4} style={{ width: "100%" }} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Upload Files</label>
            <LeadsFileUpload
              uploadedFiles={formData.fileUpload}
              onFilesChange={(files) => {
                setFormData((prev) => {
                  if (JSON.stringify(prev.fileUpload) !== JSON.stringify(files)) {
                    return { ...prev, fileUpload: files };
                  }
                  return prev;
                });
              }}
            />
          </div>

        </div>

        <div className="full-width">
          <StaffSelector
            options={getRolesForSelector()}
            value={formData.staffAssigned}
            onChange={(newVal) => setFormData(prev => ({ ...prev, staffAssigned: newVal }))}
          />
        </div>

        <div className="action-buttons full-width">
          <button className="btn-save" onClick={handleSave}>
            {editingId ? "Update Lead" : "Save Lead"}
          </button>
          {editingId && (
            <button className="btn-edit" onClick={() => {
              setEditingId(null);
              setFormData({
                projectName: "",
                clientName: "",
                email: "",
                phone: "",
                service: "",
                fileUpload: [],
                staffAssigned: [],
              });
            }}>
              Cancel Edit
            </button>
          )}
        </div>
      </div>

      <table className="leads-table">
        <thead>
          <tr>
            <th>Created By</th>
            <th>Project</th>
            <th>Client</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Service</th>
            <th>Files</th>
            <th>Staff Assigned</th>
            <th>Date </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.length ? leads.map(lead => (
            <tr key={lead.id}>
              <td>{lead.createdBy?.name || "--"}</td>
              <td>{lead.projectName}</td>
              <td>{lead.clientName}</td>
              <td>{lead.email}</td>
              <td>{lead.phone}</td>
              <td>{lead.service}</td>
              <td>
                {Array.isArray(lead.fileUpload) && lead.fileUpload.length ? (
                  <ul style={{ paddingLeft: 16 }}>
                    {lead.fileUpload.map(f => (
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
                {(lead.staffAssigned || [])
                  .map((uid) => staffNameMap[uid] || uid)
                  .join(", ")}
              </td>




              <td>{lead.createdAt ? new Date(lead.createdAt.seconds * 1000).toLocaleString() : "--"}</td>
              <td>
                <button className="btn-edit" onClick={() => handleEdit(lead)}>Edit</button>
                <button className="btn-delete" onClick={() => handleDelete(lead.id)}>Delete</button>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan="9" style={{ textAlign: "center", padding: 20 }}>No leads yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
