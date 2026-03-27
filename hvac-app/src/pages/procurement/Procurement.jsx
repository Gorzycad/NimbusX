// src/pages/procurement/ProcurementPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { collection, getDocs } from "firebase/firestore";
import {
  addProcurementRecord,
  updateProcurementRecord,
  deleteProcurementRecord,
  getProcurementRecords,
} from "../../firebase/procurementService";
import { db } from "../../firebase/firebase";
import StaffSelector from "../../components/layout/StaffSelector";
import { getRolesForSelector } from "../../config/roleAccess";
import html2pdf from "html2pdf.js";
import { notifyAssignedStaff } from "../leads/LeadsListHelper";

/* --------------------------------
  Helper
-------------------------------- */
const emptyRow = () => ({
  item: "",
  description: "",
  quantity: "",
});

/* --------------------------------
  Main Component
-------------------------------- */
export default function ProcurementPage() {
  const { companyId, user } = useAuth();

  const [activeTab, setActiveTab] = useState("requisition");
  const [staffList, setStaffList] = useState([]);
  const [records, setRecords] = useState([]);
  const [editingId, setEditingId] = useState(null);

  /* -----------------------------
     Form States (per tab)
  ----------------------------- */
  const [requisitionRows, setRequisitionRows] = useState([emptyRow()]);
  const [vendors, setVendors] = useState([]);
  const [staffItems, setStaffItems] = useState([]);
  const [contractors, setContractors] = useState([]);

  //const [staffAssigned, setStaffAssigned] = useState([]);
  const [formData, setFormData] = useState({
    projectName: "",
    fileUpload: [],
    staffAssigned: [],
  });

  /* ---------------- LOAD RECORDS ON TAB CHANGE ---------------- */
  useEffect(() => {
    if (!companyId || !activeTab) return;

    const loadRecords = async () => {
      const tabMap = {
        requisition: "requisitions",
        vendors: "vendors",
        staff: "staffItems",
        contractors: "contractors",
      };

      const data = await getProcurementRecords(
        companyId,
        tabMap[activeTab]
      );

      setRecords(data || []);
    };

    loadRecords();
  }, [companyId, activeTab]);

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

  useEffect(() => {
    // Reset all tables when switching tabs
    setRequisitionRows([emptyRow()]);
    setVendors([]);
    setStaffItems([]);
    setContractors([]);
    setEditingId(null);
  }, [activeTab]);

  const staffAssignedIds = formData.staffAssigned;

  const staffNameMap = useMemo(() => {
    const map = {};
    staffList.forEach(u => {
      map[u.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    });
    return map;
  }, [staffList]);

  // Notify assigned staff helper
  const notifyStaffForLead = async (companyId, userIds, procurementId, leadData, sourcePage, mainMenu) => {
    if (!userIds || !userIds.length) return;
    await notifyAssignedStaff(companyId, procurementId, leadData, userIds, sourcePage, mainMenu);
  };

  /* -----------------------------
     Row Handlers
  ----------------------------- */
  const addRow = (setter, rowFn) => setter(prev => [...prev, rowFn()]);
  const removeRow = (setter, index) =>
    setter(prev => prev.filter((_, i) => i !== index));

  /* -----------------------------
     Save (placeholder)
  ----------------------------- */
  const handleSave = async () => {
    if (!formData.staffAssigned || formData.staffAssigned.length === 0) {
      alert("Please assign at least one staff");
      return;
    }

    const creatorName = staffNameMap[user.uid] || "Unknown User";

    const tabMap = {
      requisition: "requisitions",
      vendors: "vendors",
      staff: "staffItems",
      contractors: "contractors",
    };

    let tableData = [];

    if (activeTab === "requisition") tableData = requisitionRows;
    if (activeTab === "vendors") tableData = vendors;
    if (activeTab === "staff") tableData = staffItems;
    if (activeTab === "contractors") tableData = contractors;

    const payload = {
      data: tableData,
      staffAssigned: formData.staffAssigned,
      createdBy: {
        uid: user.uid,
        name: creatorName,
      },
    };

    try {
      let id;

      if (editingId) {
        await updateProcurementRecord(
          companyId,
          tabMap[activeTab],
          editingId,
          payload
        );
        id = editingId;
        setEditingId(null);
      } else {
        const docRef = await addProcurementRecord(
          companyId,
          tabMap[activeTab],
          payload
        );
        id = docRef.id;
      }

      // 🔹 Notify staff
      await notifyStaffForLead(
        companyId,
        formData.staffAssigned,
        id,
        payload,
        "Procurement",
        "Commercial"
      );

      // 🔹 Auto refresh
      const refreshed = await getProcurementRecords(
        companyId,
        tabMap[activeTab]
      );
      setRecords(refreshed || []);

      alert("Saved successfully");

    } catch (err) {
      console.error(err);
      alert("Save failed");
    }
  };

  /* -----------------------------
     EDIT (placeholder)
  ----------------------------- */
  const handleEdit = (record) => {
    setEditingId(record.id);

    if (activeTab === "requisition")
      setRequisitionRows(record.data || []);

    if (activeTab === "vendors")
      setVendors(record.data || []);

    if (activeTab === "staff")
      setStaffItems(record.data || []);

    if (activeTab === "contractors")
      setContractors(record.data || []);

    setFormData(prev => ({
      ...prev,
      staffAssigned: record.staffAssigned || [],
    }));
  };

  /* -----------------------------
     DELETE (placeholder)
  ----------------------------- */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;

    const tabMap = {
      requisition: "requisitions",
      vendors: "vendors",
      staff: "staffItems",
      contractors: "contractors",
    };

    try {
      await deleteProcurementRecord(
        companyId,
        tabMap[activeTab],
        id
      );

      const refreshed = await getProcurementRecords(
        companyId,
        tabMap[activeTab]
      );

      setRecords(refreshed || []);

    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  /* -----------------------------
     Reusable Audit Footer
  ----------------------------- */
  const AuditFooter = () => (
    <div className="mt-3 border-top pt-3">
      <div className="mb-3">
        <label className="form-label">Staff Assigned</label>
        <StaffSelector
          options={getRolesForSelector()}
          value={formData.staffAssigned}
          onChange={uids =>
            setFormData(prev => ({ ...prev, staffAssigned: uids }))
          }
        />
      </div>

      <button
        className="btn btn-success"
        onClick={handleSave}
      >
        {editingId ? "Update Record" : "Save Records"}
      </button>
    </div>
  );

  const exportRequisitionPDF = () => {
    const element = document.getElementById("requisition-pdf");

    const opt = {
      margin: 0.5,
      filename: `Office_Requisition_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    };

    html2pdf().set(opt).from(element).save();
  };

  /* -----------------------------
     JSX
  ----------------------------- */
  return (
    <div className="container py-4">
      <h2 className="mb-4">Procurement – Office & General Supplies</h2>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        {[
          ["requisition", "Requisition"],
          ["vendors", "Vendors"],
          ["staff", "Staff Items"],
          ["contractors", "Maintenance Contractors"],
        ].map(([key, label]) => (
          <li className="nav-item" key={key}>
            <button
              className={`nav-link ${activeTab === key ? "active" : ""}`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>

      {/* -----------------------------
          REQUISITION TAB
      ----------------------------- */}
      {activeTab === "requisition" && (
        <div className="card shadow-sm">
          <div className="card-body">
            <h5 className="mb-3">General Office Requisition</h5>

            <div id="requisition-pdf">
              <table className="table table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>Item</th>
                    <th>Description</th>
                    <th width="120">Qty</th>
                    <th width="80"></th>
                  </tr>
                </thead>
                <tbody>
                  {requisitionRows.map((row, i) => (
                    <tr key={i}>
                      <td>
                        <input
                          className="form-control"
                          value={row.item}
                          onChange={e => {
                            const copy = [...requisitionRows];
                            copy[i].item = e.target.value;
                            setRequisitionRows(copy);
                          }}
                        />
                      </td>
                      <td>
                        <input
                          className="form-control"
                          value={row.description}
                          onChange={e => {
                            const copy = [...requisitionRows];
                            copy[i].description = e.target.value;
                            setRequisitionRows(copy);
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          value={row.quantity}
                          onChange={e => {
                            const copy = [...requisitionRows];
                            copy[i].quantity = e.target.value;
                            setRequisitionRows(copy);
                          }}
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => removeRow(setRequisitionRows, i)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              className="btn btn-outline-primary"
              onClick={() => addRow(setRequisitionRows, emptyRow)}
            >
              + Add Row
            </button>

            <button
              className="btn btn-outline-secondary ms-2"
              onClick={exportRequisitionPDF}
            >
              Export PDF
            </button>

            <AuditFooter />
            <hr className="my-4" />
            <h6>Saved Records</h6>

            <table className="table table-sm table-bordered">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Created By</th>
                  <th>Items</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(rec => (
                  <tr key={rec.id}>
                    <td>
                      {rec.createdAt?.toDate
                        ? rec.createdAt.toDate().toLocaleString()
                        : ""}
                    </td>
                    <td>{rec.createdBy?.name}</td>

                    {/* ✅ DISPLAY DATA */}
                    <td>
                      {(rec.data || []).map((r, i) => (
                        <div key={i}>
                          {r.item} ({r.quantity})
                        </div>
                      ))}
                    </td>

                    <td>
                      <button
                        className="btn btn-sm btn-primary me-2"
                        onClick={() => handleEdit(rec)}
                      >
                        Edit
                      </button>

                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(rec.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -----------------------------
          VENDORS TAB
      ----------------------------- */}
      {activeTab === "vendors" && (
        <div className="card shadow-sm">
          <div className="card-body">
            <h5>Vendor Directory</h5>

            <table className="table table-bordered">
              <thead className="table-light">
                <tr>
                  <th>Vendor Name</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Payment Details</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v, i) => (
                  <tr key={i}>
                    {["name", "contact", "email", "payment"].map(field => (
                      <td key={field}>
                        <input
                          className="form-control"
                          value={v[field] || ""}
                          onChange={e => {
                            const copy = [...vendors];
                            copy[i][field] = e.target.value;
                            setVendors(copy);
                          }}
                        />
                      </td>
                    ))}

                    {/* ✅ REMOVE BUTTON */}
                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => removeRow(setVendors, i)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              className="btn btn-outline-primary"
              onClick={() => setVendors(prev => [...prev, {}])}
            >
              + Add Vendor
            </button>

            <AuditFooter />
            <hr className="my-4" />
            <h6>Saved Records</h6>

            <table className="table table-sm table-bordered">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Created By</th>
                  <th>Vendors</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(rec => (
                  <tr key={rec.id}>
                    <td>
                      {rec.createdAt?.toDate
                        ? rec.createdAt.toDate().toLocaleString()
                        : ""}
                    </td>
                    <td>{rec.createdBy?.name}</td>

                    <td>
                      {(rec.data || []).map((v, i) => (
                        <div key={i}>
                          {v.name} - {v.contact}
                        </div>
                      ))}
                    </td>

                    <td>
                      <button
                        className="btn btn-sm btn-primary me-2"
                        onClick={() => handleEdit(rec)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(rec.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -----------------------------
          STAFF ITEMS TAB
      ----------------------------- */}
      {activeTab === "staff" && (
        <div className="card shadow-sm">
          <div className="card-body">
            <h5>Staff & Office Items</h5>

            <table className="table table-bordered">
              <thead className="table-light">
                <tr>
                  <th>Staff</th>
                  <th>Item</th>
                  <th>Date Assigned</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {staffItems.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        className="form-control"
                        value={r.staff || ""}
                        onChange={e => {
                          const copy = [...staffItems];
                          copy[i].staff = e.target.value;
                          setStaffItems(copy);
                        }}
                      />
                    </td>

                    <td>
                      <input
                        className="form-control"
                        value={r.item || ""}
                        onChange={e => {
                          const copy = [...staffItems];
                          copy[i].item = e.target.value;
                          setStaffItems(copy);
                        }}
                      />
                    </td>

                    <td>
                      <input
                        type="date"
                        className="form-control"
                        value={r.date || ""}
                        onChange={e => {
                          const copy = [...staffItems];
                          copy[i].date = e.target.value;
                          setStaffItems(copy);
                        }}
                      />
                    </td>

                    {/* ✅ REMOVE */}
                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => removeRow(setStaffItems, i)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              className="btn btn-outline-primary"
              onClick={() => setStaffItems(prev => [...prev, {}])}
            >
              + Add Entry
            </button>

            <AuditFooter />
            <hr className="my-4" />
            <h6>Saved Records</h6>

            <table className="table table-sm table-bordered">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Created By</th>
                  <th>Assignments</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(rec => (
                  <tr key={rec.id}>
                    <td>
                      {rec.createdAt?.toDate
                        ? rec.createdAt.toDate().toLocaleString()
                        : ""}
                    </td>
                    <td>{rec.createdBy?.name}</td>

                    <td>
                      {(rec.data || []).map((r, i) => (
                        <div key={i}>
                          {r.staff} → {r.item}
                        </div>
                      ))}
                    </td>

                    <td>
                      <button
                        className="btn btn-sm btn-primary me-2"
                        onClick={() => handleEdit(rec)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(rec.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -----------------------------
          CONTRACTORS TAB
      ----------------------------- */}
      {activeTab === "contractors" && (
        <div className="card shadow-sm">
          <div className="card-body">
            <h5>Maintenance Sub-Contractors</h5>

            <table className="table table-bordered">
              <thead className="table-light">
                <tr>
                  <th>Company</th>
                  <th>Service</th>
                  <th>Contact</th>
                  <th>Last Visit</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {contractors.map((c, i) => (
                  <tr key={i}>
                    {["company", "service", "contact", "date"].map(field => (
                      <td key={field}>
                        <input
                          type={field === "date" ? "date" : "text"}
                          className="form-control"
                          value={c[field] || ""}
                          onChange={e => {
                            const copy = [...contractors];
                            copy[i][field] = e.target.value;
                            setContractors(copy);
                          }}
                        />
                      </td>
                    ))}

                    {/* ✅ REMOVE */}
                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => removeRow(setContractors, i)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              className="btn btn-outline-primary"
              onClick={() => setContractors(prev => [...prev, {}])}
            >
              + Add Contractor
            </button>

            <AuditFooter />
            <hr className="my-4" />
            <h6>Saved Records</h6>

            <table className="table table-sm table-bordered">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Created By</th>
                  <th>Contractors</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(rec => (
                  <tr key={rec.id}>
                    <td>
                      {rec.createdAt?.toDate
                        ? rec.createdAt.toDate().toLocaleString()
                        : ""}
                    </td>
                    <td>{rec.createdBy?.name}</td>

                    <td>
                      {(rec.data || []).map((c, i) => (
                        <div key={i}>
                          {c.company} - {c.service}
                        </div>
                      ))}
                    </td>

                    <td>
                      <button
                        className="btn btn-sm btn-primary me-2"
                        onClick={() => handleEdit(rec)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(rec.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}



// // src/pages/procurement/Procurement.jsx
// import React from "react";
// import { Container, Card } from "react-bootstrap";
// import { useAuth } from "../../contexts/AuthContext";
// import "bootstrap/dist/css/bootstrap.min.css";

// export default function Procurement() {
//   const { user } = useAuth();

//   return (
//     <Container
//       fluid
//       className="d-flex align-items-center justify-content-center"
//       style={{ minHeight: "70vh" }}
//     >
//       <Card
//         className="text-center shadow-sm"
//         style={{ maxWidth: 600, width: "100%" }}
//       >
//         <Card.Body>
//           <Card.Title style={{ fontSize: 26, marginBottom: 12 }}>
//             Procurement Module
//           </Card.Title>

//           <Card.Text style={{ fontSize: 16, color: "#555" }}>
//             🚧 This page is currently under development.
//           </Card.Text>

//           <Card.Text style={{ fontSize: 15, color: "#777" }}>
//             Procurement management features will be available soon.
//           </Card.Text>

//           <div
//             style={{
//               marginTop: 20,
//               padding: 12,
//               background: "#f8f9fa",
//               borderRadius: 6,
//               fontSize: 14,
//               color: "#333",
//             }}
//           >
//             Thank you for your patience{user?.displayName ? `, ${user.displayName}` : ""}.
//           </div>
//         </Card.Body>
//       </Card>
//     </Container>
//   );
// }
