// // src/pages/award/AwardPage.jsx

// import React, { useEffect, useState } from "react";
// import { useAuth } from "../../contexts/AuthContext";

// import {
//   addAward,
//   updateAward,
//   deleteAward,
//   getAwards,
// } from "../../firebase/awardService";

// import {
//   getTenders,
//   updateTenderAwardStatus
// } from "../../firebase/tenderService";

// import MultiUploadWithDelete from "../leads/LeadsFileUpload";
// import StaffSelector from "../../components/layout/StaffSelector";

// import {
//   getRolesForSelector,
//   roleNameToKey
// } from "../../config/roleAccess";
// import {
//   getLeads
// } from "../../firebase/leadsService";

// import {
//   notifyAssignedStaff
// } from "../leads/LeadsListHelper";
// import { collection, query, where, getDocs } from "firebase/firestore";
// import { db } from "../../firebase/firebase";




// export default function AwardPage() {
//   const { companyId } = useAuth();

//   const [awards, setAwards] = useState([]);
//   const [projects, setProjects] = useState([]); // project dropdown
//   const [editingId, setEditingId] = useState(null);

//   const [formData, setFormData] = useState({
//     projectName: "",
//     fileUpload: "",
//     staffAssigned: [],
//   });

//   // Load project names
//   useEffect(() => {
//     if (!companyId) return;

//     const loadProjects = async () => {
//       const leads = await getLeads(companyId);
//       const unique = [...new Set(leads.map((l) => l.projectName))];
//       setProjects(unique);
//     };

//     loadProjects();
//   }, [companyId]);

//   // Load awards
//   useEffect(() => {
//     if (!companyId) return;

//     const fetchAwards = async () => {
//       const items = await getAwards(companyId);
//       setAwards(items || []);
//     };

//     fetchAwards();
//   }, [companyId]);

//   async function notifyStaffForAward(selectedRoles, awardId, awardData, sourcePage, mainMenu) {
//     const users = await getUsersByRoles(selectedRoles);
//     const assignedUserIds = users.map((u) => u.uid);

//     if (assignedUserIds.length === 0) {
//       console.warn("No users for roles:", selectedRoles);
//       return;
//     }

//     await notifyAssignedStaff(awardId, awardData, assignedUserIds, sourcePage, mainMenu);
//   }


//   // Fetch users matching selected roles
//   // selectedRoles: ["Engineer", "Supervisor"]
//   async function getUsersByRoles(selectedRoles = []) {
//     if (!selectedRoles || selectedRoles.length === 0) return [];
//     const roleKeys = selectedRoles.map(roleNameToKey); // -> ["ENGINEER","SUPERVISOR"]

//     // Firestore "in" supports up to 10 items — if more, chunk queries
//     const usersRef = collection(db, "companies", companyId, "users");
//     const q = query(usersRef, where("role", "in", roleKeys));
//     const snap = await getDocs(q);
//     return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
//   }


//   // -----------------------------------
//   // SAVE AWARD
//   // -----------------------------------
//   const handleSave = async () => {
//     if (!formData.projectName.trim()) {
//       alert("Project Name is required.");
//       return;
//     }

//     let awardId;

//     if (editingId) {
//       await updateAward(companyId, editingId, formData);
//       awardId = editingId;
//       setEditingId(null);
//     } else {
//       awardId = await addAward(companyId, formData);
//     }

//     // AUTO-UPDATE tender page → set status to Awarded
//     await updateTenderAwardStatus(companyId, formData.projectName, "Awarded");

//     // Trigger staff notifications
//     await notifyStaffForAward(
//       formData.staffAssigned,
//       awardId,
//       formData,
//       "Award",
//       "Marketing"
//     );

//     setFormData({
//       projectName: "",
//       fileUpload: "",
//       staffAssigned: [],
//     });

//     const items = await getAwards(companyId);
//     setAwards(items || []);
//   };

//   // DELETE
//   const handleDelete = async (id) => {
//     if (!window.confirm("Delete this award?")) return;

//     await deleteAward(companyId, id);
//     const items = await getAwards(companyId);
//     setAwards(items || []);
//   };

//   // EDIT
//   const handleEdit = (item) => {
//     setEditingId(item.id);
//     setFormData({
//       projectName: item.projectName,
//       fileUpload: item.fileUpload,
//       staffAssigned: item.staffAssigned || [],
//     });
//   };

//   return (
//     <div className="container mt-4">
//       <h2 className="mb-3">Project Award Management</h2>

//       <div className="card p-3 shadow-sm">
//         <div className="row">

//           {/* Project Name */}
//           <div className="col-md-6 mb-3">
//             <label className="form-label">Project Name</label>
//             <select
//               className="form-select"
//               value={formData.projectName}
//               onChange={(e) =>
//                 setFormData({ ...formData, projectName: e.target.value })
//               }
//             >
//               <option value="">-- Select Project --</option>
//               {projects.map((p) => (
//                 <option key={p} value={p}>
//                   {p}
//                 </option>
//               ))}
//             </select>
//           </div>

//           {/* File Upload */}
//           <div className="col-md-12 mb-3">
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

//           {/* Save Button */}
//           <div className="col-md-12">
//             <button className="btn btn-primary" onClick={handleSave}>
//               {editingId ? "Update Award" : "Save Award"}
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Awards Table */}
//       <div className="table-responsive mt-4">
//         <table className="table table-bordered table-striped">
//           <thead className="table-dark">
//             <tr>
//               <th>Project</th>
//               <th>Files</th>
//               <th>Staff Assigned</th>
//               <th>Date</th>
//               <th>Actions</th>
//             </tr>
//           </thead>

//           <tbody>
//             {awards.map((item) => (
//               <tr key={item.id}>
//                 <td>{item.projectName}</td>
//                 <td>{item.fileUpload || "—"}</td>
//                 <td>{(item.staffAssigned || []).join(", ")}</td>
//                 <td>
//                   {item.createdAt
//                     ? new Date(item.createdAt.seconds * 1000).toLocaleString()
//                     : "—"}
//                 </td>
//                 <td>
//                   <button
//                     className="btn btn-sm btn-warning me-2"
//                     onClick={() => handleEdit(item)}
//                   >
//                     Edit
//                   </button>

//                   <button
//                     className="btn btn-sm btn-danger"
//                     onClick={() => handleDelete(item.id)}
//                   >
//                     Delete
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>

//         {awards.length === 0 && (
//           <p className="text-center mt-3">No awards added yet.</p>
//         )}
//       </div>
//     </div>
//   );
// }


// import React, { useEffect, useState, useMemo } from "react";
// import { useAuth } from "../../contexts/AuthContext";

// import {
//   addAward,
//   updateAward,
//   deleteAward,
//   getAwards,
// } from "../../firebase/awardService";

// import { getLeads } from "../../firebase/leadsService";
// import { updateTenderAwardStatus } from "../../firebase/tenderService";

// import MultiUploadWithDelete from "../leads/LeadsFileUpload";
// import StaffSelector from "../../components/layout/StaffSelector";
// import { getRolesForSelector, roleNameToKey } from "../../config/roleAccess";

// import { notifyAssignedStaff } from "../leads/LeadsListHelper";

// import { db } from "../../firebase/firebase";
// import { collection, query, where, getDocs } from "firebase/firestore";

// function cleanData(data) {
//   return Object.fromEntries(
//     Object.entries(data).filter(([_, v]) => v !== undefined)
//   );
// }

// export default function AwardPage() {
//   const { companyId, user } = useAuth();

//   const [awards, setAwards] = useState([]);
//   const [projects, setProjects] = useState([]);
//   const [editingId, setEditingId] = useState(null);
//   const [staffList, setStaffList] = useState([]);

//   const [formData, setFormData] = useState({
//     projectName: "",
//     fileUpload: [],
//     staffAssigned: [],
//   });

//   const staffAssignedIds = formData.staffAssigned;

//   /* ----------------------------------
//      Load staff list
//   ---------------------------------- */
//   useEffect(() => {
//     if (!companyId) return;

//     const loadStaff = async () => {
//       const snap = await getDocs(
//         collection(db, "companies", companyId, "users")
//       );
//       setStaffList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
//     };

//     loadStaff();
//   }, [companyId]);

//   const staffNameMap = useMemo(() => {
//     const map = {};
//     staffList.forEach(u => {
//       map[u.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim();
//     });
//     return map;
//   }, [staffList]);

//   /* ----------------------------------
//      Load project names from Leads
//   ---------------------------------- */
//   useEffect(() => {
//     if (!companyId) return;

//     const loadProjects = async () => {
//       const leads = await getLeads(companyId);
//       const unique = [...new Set(leads.map(l => l.projectName))];
//       setProjects(unique);
//     };

//     loadProjects();
//   }, [companyId]);

//   /* ----------------------------------
//      Load awards (NEWEST FIRST)
//   ---------------------------------- */
//   useEffect(() => {
//     if (!companyId) return;

//     const fetchAwards = async () => {
//       const data = await getAwards(companyId);

//       const sorted = (data || []).sort((a, b) => {
//         const aTime = a.createdAt?.seconds || 0;
//         const bTime = b.createdAt?.seconds || 0;
//         return bTime - aTime;
//       });

//       setAwards(sorted);
//     };

//     fetchAwards();
//   }, [companyId]);


//   // async function notifyStaffForAward(selectedRoles, awardId, awardData, sourcePage, mainMenu) {
//   //   const users = await getUsersByRoles(selectedRoles);
//   //   const assignedUserIds = users.map((u) => u.uid);

//   //   if (assignedUserIds.length === 0) {
//   //     console.warn("No users for roles:", selectedRoles);
//   //     return;
//   //   }

//   //   await notifyAssignedStaff(awardId, awardData, assignedUserIds, sourcePage, mainMenu);
//   // }


//   // Fetch users matching selected roles
//   // selectedRoles: ["Engineer", "Supervisor"]
//   async function getUsersByRoles(selectedRoles = []) {
//     if (!selectedRoles || selectedRoles.length === 0) return [];
//     const roleKeys = selectedRoles.map(roleNameToKey); // -> ["ENGINEER","SUPERVISOR"]

//     // Firestore "in" supports up to 10 items — if more, chunk queries
//     const usersRef = collection(db, "companies", companyId, "users");
//     const q = query(usersRef, where("role", "in", roleKeys));
//     const snap = await getDocs(q);
//     return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
//   }


//   /* ----------------------------------
//      SAVE / UPDATE
//   ---------------------------------- */
//   const handleSave = async () => {
//     if (!formData.projectName.trim()) {
//       alert("Project Name is required");
//       return;
//     }

//     const creatorName = staffNameMap[user.uid] || "Unknown User";

//     const cleaned = {
//       ...cleanData(formData),
//       staffAssigned: staffAssignedIds,
//     };

//     if (!editingId) {
//       cleaned.createdBy = {
//         uid: user.uid,
//         name: creatorName,
//       };
//     }

//     let awardId;

//     if (editingId) {
//       await updateAward(companyId, editingId, cleaned);
//       awardId = editingId;
//       setEditingId(null);
//     } else {
//       const docRef = await addAward(companyId, cleaned);
//       awardId = docRef.id;
//     }

//     // 🔄 Update Tender status automatically
//     await updateTenderAwardStatus(companyId, formData.projectName, "Awarded");

//     // //🔔 Notify assigned staff
//     // if (staffAssignedIds.length) {
//     //   await notifyAssignedStaff(
//     //     companyId,
//     //     awardId,
//     //     cleaned,
//     //     staffAssignedIds,
//     //     "Award",
//     //     "Marketing"
//     //   );
//     // }

//     if (staffAssignedIds.length) {
//       const users = await getUsersByRoles(staffAssignedIds);
//       const userIds = users.map(u => u.uid);

//       if (userIds.length) {
//         await notifyAssignedStaff(
//           companyId,
//           awardId,
//           cleaned,
//           userIds,
//           "Award",
//           "Marketing"
//         );
//       }
//     }



//     // Reset
//     setFormData({
//       projectName: "",
//       fileUpload: [],
//       staffAssigned: [],
//     });

//     const refreshed = await getAwards(companyId);
//     setAwards(
//       (refreshed || []).sort(
//         (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
//       )
//     );
//   };

//   /* ----------------------------------
//      EDIT
//   ---------------------------------- */
//   const handleEdit = (item) => {
//     setEditingId(item.id);
//     setFormData({
//       projectName: item.projectName,
//       fileUpload: item.fileUpload || [],
//       staffAssigned: item.staffAssigned || [],
//     });
//   };

//   /* ----------------------------------
//      DELETE
//   ---------------------------------- */
//   const handleDelete = async (id) => {
//     if (!window.confirm("Delete this award?")) return;
//     await deleteAward(companyId, id);
//     setAwards(prev => prev.filter(a => a.id !== id));
//   };

//   /* ----------------------------------
//      UI
//   ---------------------------------- */
//   return (
//     <div className="container mt-4">
//       <h2 className="mb-3">Project Award Management</h2>

//       <div className="card p-3 shadow-sm">
//         <div className="row">

//           <div className="col-md-6 mb-3">
//             <label className="form-label">Project Name</label>
//             <select
//               className="form-select"
//               value={formData.projectName}
//               onChange={(e) =>
//                 setFormData({ ...formData, projectName: e.target.value })
//               }
//             >
//               <option value="">-- Select Project --</option>
//               {projects.map(p => (
//                 <option key={p} value={p}>{p}</option>
//               ))}
//             </select>
//           </div>

//           <div className="col-md-12 mb-3">
//             <label className="form-label">Upload Files</label>
//             <MultiUploadWithDelete
//               uploadedFiles={formData.fileUpload}
//               onFilesChange={(files) =>
//                 setFormData(prev => ({ ...prev, fileUpload: files }))
//               }
//             />
//           </div>

//           <div className="mb-3">
//             <label className="form-label">Staff Assigned</label>
//             <StaffSelector
//               options={getRolesForSelector()}
//               value={formData.staffAssigned}
//               onChange={(newVal) => setFormData(prev => ({ ...prev, staffAssigned: newVal }))}
//             />
//           </div>

//           <div className="col-md-12">
//             <button className="btn btn-primary" onClick={handleSave}>
//               {editingId ? "Update Award" : "Save Award"}
//             </button>
//           </div>
//         </div>
//       </div>

//       <div className="table-responsive mt-4">
//         <table className="table table-bordered table-striped">
//           <thead className="table-dark">
//             <tr>
//               <th>Created By</th>
//               <th>Project</th>
//               <th>Files</th>
//               <th>Staff Assigned</th>
//               <th>Date</th>
//               <th>Actions</th>
//             </tr>
//           </thead>

//           <tbody>
//             {awards.map(item => (
//               <tr key={item.id}>
//                 <td>{item.createdBy?.name || "--"}</td>
//                 <td>{item.projectName}</td>
//                 <td>
//                   {Array.isArray(item.fileUpload) && item.fileUpload.length ? (
//                     <ul style={{ paddingLeft: 16 }}>
//                       {item.fileUpload.map(f => (
//                         <li key={f.fileId}>
//                           <a href={f.url} target="_blank" rel="noreferrer" download>
//                             ⬇ {f.name}
//                           </a>
//                         </li>
//                       ))}
//                     </ul>
//                   ) : "--"}
//                 </td>
//                 <td>
//                   {(item.staffAssigned || [])
//                     .map(uid => staffNameMap[uid] || uid)
//                     .join(", ")}
//                 </td>
//                 <td>
//                   {item.createdAt
//                     ? new Date(item.createdAt.seconds * 1000).toLocaleString()
//                     : "--"}
//                 </td>
//                 <td>
//                   <button
//                     className="btn btn-sm btn-warning me-2"
//                     onClick={() => handleEdit(item)}
//                   >
//                     Edit
//                   </button>
//                   <button
//                     className="btn btn-sm btn-danger"
//                     onClick={() => handleDelete(item.id)}
//                   >
//                     Delete
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>

//         {awards.length === 0 && (
//           <p className="text-center mt-3">No awards added yet.</p>
//         )}
//       </div>
//     </div>
//   );
// }

// // src/pages/awards/AwardPage.jsx
// import React, { useEffect, useState, useMemo } from "react";
// import { useAuth } from "../../contexts/AuthContext";

// import {
//   addAward,
//   updateAward,
//   deleteAward,
//   getAwards,
// } from "../../firebase/awardService";

// import { getLeads } from "../../firebase/leadsService";
// import { updateTenderAwardStatus } from "../../firebase/tenderService";

// import MultiUploadWithDelete from "../leads/LeadsFileUpload";
// import StaffSelector from "../../components/layout/StaffSelector";
// import { notifyAssignedStaff } from "../leads/LeadsListHelper";

// import { db } from "../../firebase/firebase";
// import { collection, getDocs } from "firebase/firestore";

// function cleanData(data) {
//   return Object.fromEntries(
//     Object.entries(data).filter(([_, v]) => v !== undefined)
//   );
// }

// export default function AwardPage() {
//   const { companyId, user } = useAuth();
//   const [leads, setLeads] = useState([]);
//   const [awards, setAwards] = useState([]);
//   const [projects, setProjects] = useState([]);
//   const [editingId, setEditingId] = useState(null);
//   const [staffList, setStaffList] = useState([]);
//   const [projectList, setProjectList] = useState([]);

//   /* ---------------- LOAD STAFF ---------------- */
//   useEffect(() => {
//     if (!companyId) return;

//     const loadStaff = async () => {
//       const snap = await getDocs(
//         collection(db, "companies", companyId, "users")
//       );

//       const list = snap.docs.map((d) => ({
//         id: d.id,
//         ...d.data(),
//       }));

//       setStaffList(list);
//     };

//     loadStaff();
//   }, [companyId]);

//   const [formData, setFormData] = useState({
//     projectName: "",
//     fileUpload: [],
//     staffAssigned: [],
//   });

//   const staffAssignedIds = formData.staffAssigned;

//   const staffNameMap = React.useMemo(() => {
//     const map = {};
//     staffList.forEach((u) => {
//       map[u.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim();
//     });
//     return map;
//   }, [staffList]);

//   // Notify assigned staff helper
//   const notifyStaffForLead = async (companyId, userIds, awardId, Data, sourcePage, mainMenu) => {
//     if (!userIds || !userIds.length) return;
//     await notifyAssignedStaff(companyId, userIds, awardId, Data, sourcePage, mainMenu);
//   };

//   /* ---------------- LOAD PROJECTS ---------------- */
//   useEffect(() => {
//     if (!companyId) return;

//     const loadProjects = async () => {
//       const leads = await getLeads(companyId);
//       const names = Array.from(new Set(leads.map(l => l.projectName)));
//       setProjectList(names);
//     };

//     loadProjects();
//   }, [companyId]);

//   /* ---------------- LOAD AWARDS ---------------- */
//   useEffect(() => {
//     if (!companyId) return;

//     const fetchAwards = async () => {
//       const data = await getAwards(companyId);
//       setAwards(
//         (data || []).sort(
//           (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
//         )
//       );
//     };

//     fetchAwards();
//   }, [companyId]);

//   /* ---------------- SAVE / UPDATE ---------------- */
//   const handleSave = async () => {
//     if (!formData.projectName.trim()) {
//       alert("Project Name is required");
//       return;
//     }

//     const creatorName = staffNameMap[user.uid] || "Unknown User";

//     // Clean formData BEFORE sending it to Firestore
//     const cleanedFormData = {
//       ...cleanData(formData),
//       staffAssigned: staffAssignedIds, // store IDs, not names

//     };

//     // 👇 ADD THIS (only on create)
//     if (!editingId) {
//       cleanedFormData.createdBy = {
//         uid: user.uid,
//         name: creatorName,
//       };
//     }

//     let awardId;

//     if (editingId) {
//       await updateAward(companyId, editingId, cleanedFormData);
//       awardId = editingId;
//       setEditingId(null);
//     } else {
//       const docRef = await addAward(companyId, cleanedFormData);
//       awardId = docRef.id;
//     }
//     console.log("AwardId:", awardId, "Staff:", staffAssignedIds);

//     // Update Tender status
//     await updateTenderAwardStatus(
//       companyId,
//       formData.projectName,
//       "Awarded"
//     );

//     // // 🔔 NOTIFY — SAME AS LEADS
//     // if (companyId && staffAssignedIds.length) {
//     //   await notifyAssignedStaff(
//     //     companyId,
//     //     awardId,
//     //     cleaned,
//     //     staffAssignedIds,
//     //     "Award",
//     //     "Marketing"
//     //   );
//     // }

//     // ✅ Notify ONLY on create
//     try {
//       if (companyId && user && staffAssignedIds.length > 0) {
//         await notifyStaffForLead(
//           companyId,
//           staffAssignedIds,
//           awardId,
//           cleanedFormData,
//           "Awards",
//           "Marketing"
//         );
//       }
//     } catch (err) {
//       console.warn("Notification failed, lead still saved:", err);
//     }
//     console.log("AwardId:", awardId);
//     console.log("Staff:", staffAssignedIds);

//     if (!awardId) {
//       console.warn("No recordId, skipping notification");
//       return;
//     }


//     // Reset form
//     setFormData({
//       projectName: "",
//       fileUpload: [],
//       staffAssigned: [],
//     });

//     const refreshed = await getAwards(companyId);
//     setAwards(
//       (refreshed || []).sort(
//         (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
//       )
//     );
//   };

//   /* ---------------- EDIT ---------------- */
//   const handleEdit = (item) => {
//     setEditingId(item.id);
//     setFormData({
//       projectName: item.projectName,
//       fileUpload: item.fileUpload || [],
//       staffAssigned: item.staffAssigned || [],
//     });
//   };

//   /* ---------------- DELETE ---------------- */
//   const handleDelete = async (id) => {
//     if (!window.confirm("Delete this award?")) return;
//     await deleteAward(companyId, id);
//     setAwards(prev => prev.filter(a => a.id !== id));
//   };

//   /* ---------------- UI ---------------- */
//   return (
//     <div className="container mt-4">
//       <h2>Project Award Management</h2>

//       <div className="card p-3 shadow-sm">
//         <label>Project Name</label>
//         <select
//           className="form-select mb-3"
//           value={formData.projectName}
//           onChange={e =>
//             setFormData({ ...formData, projectName: e.target.value })
//           }
//         >
//           <option value="">-- Select Project --</option>
//           {projects.map(p => (
//             <option key={p} value={p}>{p}</option>
//           ))}
//         </select>

//         <label>Upload Files</label>
//         <MultiUploadWithDelete
//           uploadedFiles={formData.fileUpload}
//           onFilesChange={files =>
//             setFormData(prev => ({ ...prev, fileUpload: files }))
//           }
//         />

//         <label className="mt-3">Staff Assigned</label>
//         <StaffSelector
//           options={staffList.map(u => ({
//             label: `${u.firstName} ${u.lastName}`,
//             value: u.id,
//           }))}
//           value={formData.staffAssigned}
//           onChange={uids =>
//             setFormData(prev => ({ ...prev, staffAssigned: uids }))
//           }
//         />

//         <button className="btn btn-primary mt-3" onClick={handleSave}>
//           {editingId ? "Update Award" : "Save Award"}
//         </button>
//       </div>

//       <table className="table table-striped mt-4">
//         <thead>
//           <tr>
//             <th>Created By</th>
//             <th>Project</th>
//             <th>Files</th>
//             <th>Staff Assigned</th>
//             <th>Date</th>
//             <th />
//           </tr>
//         </thead>
//         <tbody>
//           {awards.map(a => (
//             <tr key={a.id}>
//               <td>{a.createdBy?.name || "--"}</td>
//               <td>{a.projectName}</td>
//               <td>
//                 {(a.fileUpload || []).map(f => (
//                   <div key={f.fileId}>
//                     <a href={f.url} target="_blank" rel="noreferrer">
//                       ⬇ {f.name}
//                     </a>
//                   </div>
//                 ))}
//               </td>
//               <td>
//                 {(a.staffAssigned || [])
//                   .map(uid => staffNameMap[uid] || uid)
//                   .join(", ")}
//               </td>
//               <td>
//                 {a.createdAt
//                   ? new Date(a.createdAt.seconds * 1000).toLocaleString()
//                   : "--"}
//               </td>
//               <td>
//                 <button onClick={() => handleEdit(a)}>Edit</button>
//                 <button onClick={() => handleDelete(a.id)}>Delete</button>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }


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
                {(a.fileUpload || []).map(f => (
                  <div key={f.fileId}>
                    <a href={f.url} target="_blank" rel="noreferrer">
                      ⬇ {f.name}
                    </a>
                  </div>
                ))}
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
