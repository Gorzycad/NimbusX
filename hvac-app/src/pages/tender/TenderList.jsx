// // src/pages/tender/TenderList.jsx
// import React, { useEffect, useState, useMemo } from "react";
// import { useAuth } from "../../contexts/AuthContext";

// import { getLeads } from "../../firebase/leadsService";
// import {
//   addTender,
//   updateTender,
//   deleteTender,
//   getTenders
// } from "../../firebase/tenderService";

// import MultiUploadWithDelete from "../leads/LeadsFileUpload";
// import StaffSelector from "../../components/layout/StaffSelector";

// import {
//   getRolesForSelector,
//   roleNameToKey
// } from "../../config/roleAccess";

// import {
//   collection,
//   query,
//   where,
//   getDocs
// } from "firebase/firestore";

// import { db } from "../../firebase/firebase";
// import { notifyAssignedStaff } from "../leads/LeadsListHelper";

// function cleanData(data) {
//   return Object.fromEntries(
//     Object.entries(data).filter(([_, v]) => v !== undefined)
//   );
// }





// export default function TenderPage() {
//   const { companyId, user } = useAuth();

//   const [tenders, setTenders] = useState([]);
//   const [projectList, setProjectList] = useState([]);
//   const [editingId, setEditingId] = useState(null);
//   const [staffList, setStaffList] = useState([]);

//   const [formData, setFormData] = useState({
//     title: "",
//     projectName: "",
//     fileUpload: "",
//     staffAssigned: [],
//     awardedStatus: "Not Awarded",
//   });


//   const staffAssignedIds = formData.staffAssigned;

//   // -----------------------------
//   // Load project dropdown
//   // -----------------------------
//   useEffect(() => {
//     if (!companyId) return;

//     const loadProjects = async () => {
//       const allLeads = await getLeads(companyId);
//       const names = Array.from(new Set(allLeads.map(l => l.projectName)));
//       setProjectList(names);
//     };

//     loadProjects();
//   }, [companyId]);

//   // -----------------------------
//   // Load existing tenders
//   // -----------------------------
//   useEffect(() => {
//     if (!companyId) return;

//     const loadTenders = async () => {
//       const items = await getTenders(companyId);
//       setTenders(items || []);
//     };

//     loadTenders();
//   }, [companyId]);

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


//   const staffNameMap = React.useMemo(() => {
//     const map = {};
//     staffList.forEach((u) => {
//       map[u.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim();
//     });
//     return map;
//   }, [staffList]);

//   async function notifyStaffForTender(companyId, selectedRoles, tenderId, tenderData, sourcePage, mainMenu) {
//     const users = await getUsersByRoles(selectedRoles);
//     const assignedUserIds = users.map((u) => u.uid);

//     if (assignedUserIds.length === 0) {
//       console.warn("No users for roles:", selectedRoles);
//       return;
//     }

//     await notifyAssignedStaff(companyId, tenderId, tenderData, assignedUserIds, sourcePage, mainMenu);
//   }


//   async function getUsersByRoles(selectedRoles = []) {
//     if (!selectedRoles || selectedRoles.length === 0) return [];

//     const roleKeys = selectedRoles.map(roleNameToKey);

//     const usersRef = collection(db, "companies", companyId, "users");
//     const q = query(usersRef, where("role", "in", roleKeys));

//     const snap = await getDocs(q);
//     return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
//   }

//   // -----------------------------
//   // Save or update
//   // -----------------------------
//   const handleSave = async () => {
//     if (!formData.title.trim()) {
//       alert("Please enter tender title");
//       return;
//     }

//     if (!formData.projectName) {
//       alert("Please select project name");
//       return;
//     }

//     const creatorName = staffNameMap[user.uid] || "Unknown User";

//     //const cleaned = cleanData(formData);

//     // Clean formData BEFORE sending it to Firestore
//     const cleaned = {
//       ...cleanData(formData),
//       staffAssigned: staffAssignedIds, // store IDs, not names

//     };

//     // 👇 ADD THIS (only on create)
//     if (!editingId) {
//       cleaned.createdBy = {
//         uid: user.uid,
//         name: creatorName,
//       };
//     }

//     let tenderId;

//     if (editingId) {
//       await updateTender(companyId, editingId, cleaned);
//       tenderId = editingId;
//       setEditingId(null);
//     } else {
//       tenderId = await addTender(companyId, cleaned);
//     }

//     await notifyStaffForTender(
//       companyId,
//       formData.staffAssigned,
//       tenderId,
//       cleaned,
//       "Tender",
//       "Marketing"
//     );

//     setFormData({
//       title: "",
//       projectName: "",
//       fileUpload: "",
//       staffAssigned: [],
//       awardedStatus: "Not Awarded",
//     });

//     const updated = await getTenders(companyId);
//     setTenders(updated || []);
//   };

//   const handleDelete = async (id) => {
//     if (!window.confirm("Delete this tender?")) return;
//     await deleteTender(companyId, id);
//     const updated = await getTenders(companyId);
//     setTenders(updated || []);
//   };

//   const handleEdit = (item) => {
//     setEditingId(item.id);
//     setFormData({
//       title: item.title || "",
//       projectName: item.projectName || "",
//       fileUpload: item.fileUpload || "",
//       staffAssigned: item.staffAssigned || [],
//       awardedStatus: item.awardedStatus || "Not Awarded",
//     });
//   };

//   // -----------------------------
//   // JSX UI using Bootstrap
//   // -----------------------------
//   return (
//     <div className="container py-4">

//       <h2 className="mb-4">Tender Management</h2>

//       <div className="card shadow-sm mb-4">
//         <div className="card-body">



//           {/* Project Name */}
//           <div className="mb-3">
//             <label className="form-label">Project Name</label>
//             <select
//               className="form-select"
//               value={formData.projectName}
//               onChange={(e) =>
//                 setFormData({ ...formData, projectName: e.target.value })
//               }
//             >
//               <option value="">-- Select Project --</option>
//               {projectList.map((p) => (
//                 <option key={p} value={p}>{p}</option>
//               ))}
//             </select>
//           </div>

//           {/* Title */}
//           <div className="mb-3">
//             <label className="form-label">Tender Title</label>
//             <input
//               type="text"
//               className="form-control"
//               value={formData.title}
//               onChange={(e) => setFormData({ ...formData, title: e.target.value })}
//             />
//           </div>

//           {/* File Upload */}
//           <div className="mb-3">
//             <label className="form-label">Upload Files</label>
//             <MultiUploadWithDelete />
//           </div>

//           {/* Staff Selector */}
//           <div className="mb-3">
//             <label className="form-label">Staff Assigned</label>
//             <StaffSelector
//               options={getRolesForSelector()}
//               value={formData.staffAssigned}
//               onChange={(v) => setFormData({ ...formData, staffAssigned: v })}
//             />
//           </div>

//           {/* Awarded Status */}
//           <div className="mb-3">
//             <label className="form-label">Project Status</label>
//             <div className="form-check">
//               <input
//                 className="form-check-input"
//                 type="radio"
//                 name="awardStatus"
//                 checked={formData.awardedStatus === "Awarded"}
//                 onChange={() =>
//                   setFormData({ ...formData, awardedStatus: "Awarded" })
//                 }
//               />
//               <label className="form-check-label">Awarded</label>
//             </div>

//             <div className="form-check">
//               <input
//                 className="form-check-input"
//                 type="radio"
//                 name="awardStatus"
//                 checked={formData.awardedStatus === "Not Awarded"}
//                 onChange={() =>
//                   setFormData({ ...formData, awardedStatus: "Not Awarded" })
//                 }
//               />
//               <label className="form-check-label">Not Awarded</label>
//             </div>

//             <div className="form-check">
//               <input
//                 className="form-check-input"
//                 type="radio"
//                 name="awardStatus"
//                 checked={formData.awardedStatus === "Pending"}
//                 onChange={() =>
//                   setFormData({ ...formData, awardedStatus: "Pending" })
//                 }
//               />
//               <label className="form-check-label">Pending</label>
//             </div>
//           </div>

//           {/* Save Button */}
//           <button className="btn btn-primary" onClick={handleSave}>
//             {editingId ? "Update Tender" : "Save Tender"}
//           </button>

//         </div >
//       </div >

//       {/* List Table */}
//       < div className="card shadow-sm" >
//         <div className="card-body">

//           <table className="table table-bordered table-hover">
//             <thead className="table-light">
//               <tr>
//                 <th>Created By</th>
//                 <th>Title</th>
//                 <th>Project</th>
//                 <th>Files</th>
//                 <th>Staff Assigned</th>
//                 <th>Status</th>
//                 <th>Date</th>
//                 <th style={{ width: 140 }}>Actions</th>
//               </tr>
//             </thead>

//             <tbody>
//               {tenders.map((item) => (
//                 <tr key={item.id}>
//                   <td>{item.createdBy?.name || "--"}</td>
//                   <td>{item.title}</td>
//                   <td>{item.projectName}</td>
//                   <td>
//                     {Array.isArray(item.fileUpload) && item.fileUpload.length ? (
//                       <ul style={{ paddingLeft: 16 }}>
//                         {item.fileUpload.map(f => (
//                           <li key={f.fileId}>
//                             <a href={f.url} target="_blank" rel="noreferrer" download>⬇ {f.name}</a>
//                           </li>
//                         ))}
//                       </ul>
//                     ) : "--"}
//                   </td>
//                   <td>
//                   (item.staffAssigned || []).join(", ")
//                   </td>
//                   <td>{item.awardedStatus}</td>
//                   <td>
//                     {item.createdAt
//                       ? new Date(item.createdAt.seconds * 1000).toLocaleString()
//                       : "--"}
//                   </td>

//                   <td>
//                     <button
//                       className="btn btn-sm btn-warning me-2"
//                       onClick={() => handleEdit(item)}
//                     >
//                       Edit
//                     </button>

//                     <button
//                       className="btn btn-sm btn-danger"
//                       onClick={() => handleDelete(item.id)}
//                     >
//                       Delete
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>

//           </table>

//           {tenders.length === 0 && (
//             <p className="text-center mt-3">No tender records yet.</p>
//           )}

//         </div>
//       </div >

//     </div >
//   );
// }

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
                    {item.fileUpload?.length
                      ? item.fileUpload.map(f => (
                        <div key={f.fileId}>
                          <a href={f.url} target="_blank" rel="noreferrer">⬇ {f.name}</a>
                        </div>
                      ))
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
