import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useAuth } from "../../contexts/AuthContext"; // assuming you have this
import financeService from "../../firebase/financeService";

export default function FinancePage() {
  const { companyId } = useAuth(); // get current companyId
  const [activeTab, setActiveTab] = useState("projects");

  const [projects, setProjects] = useState([]);
  const [cashFlow, setCashFlow] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [poSummary, setPoSummary] = useState([]);
  const [profitLoss, setProfitLoss] = useState([]);
  const [retentionClaims, setRetentionClaims] = useState([]);

  const tabs = [
    { id: "projects", label: "Project Financials", state: [projects, setProjects], columns: ["project", "contractValue", "budget", "actualCost", "profit", "status"], templates: { project: "", contractValue: "", budget: "", actualCost: "", profit: "", status: "" } },
    { id: "cashFlow", label: "Cash Flow", state: [cashFlow, setCashFlow], columns: ["month", "inflow", "outflow", "net"], templates: { month: "", inflow: "", outflow: "", net: "" } },
    { id: "invoices", label: "Invoices", state: [invoices, setInvoices], columns: ["invoiceNo", "project", "amount", "status", "due"], templates: { invoiceNo: "", project: "", amount: "", status: "", due: "" } },
    { id: "payments", label: "Payments", state: [payments, setPayments], columns: ["vendor", "poNo", "amount", "paid", "date"], templates: { vendor: "", poNo: "", amount: "", paid: "", date: "" } },
    { id: "poSummary", label: "PO Summary", state: [poSummary, setPoSummary], columns: ["poNo", "project", "amount", "status", "date"], templates: { poNo: "", project: "", amount: "", status: "", date: "" } },
    { id: "profitLoss", label: "Project P&L", state: [profitLoss, setProfitLoss], columns: ["project", "revenue", "cost", "profit"], templates: { project: "", revenue: "", cost: "", profit: "" } },
    { id: "retentionClaims", label: "Retention & Claims", state: [retentionClaims, setRetentionClaims], columns: ["project", "claimType", "amount", "status"], templates: { project: "", claimType: "", amount: "", status: "" } },
  ];

  /* -------------------------
     Load all tab data
  ------------------------- */
  useEffect(() => {
    tabs.forEach(async (tab) => {
      const rows = await financeService.getFinanceRows(companyId, tab.id);
      tab.state[1](rows); // set state
    });
  }, [companyId]);

  /* -------------------------
     KPI Calculations
  ------------------------- */
  const totalContractValue = projects.reduce((sum, p) => sum + Number(p.contractValue || 0), 0);
  const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const totalReceived = payments.reduce((sum, p) => sum + Number(p.paid || 0), 0);
  const totalExpenses = projects.reduce((sum, p) => sum + Number(p.actualCost || 0), 0);
  const netCash = totalReceived - totalExpenses;
  const outstandingReceivables = totalInvoiced - totalReceived;

  return (
    <div className="container py-4">
      <h2 className="mb-4">Business Finance Management</h2>
      {/* KPI Cards */}
      <div className="row mb-4">
        {[{ title: "Total Contract Value", value: totalContractValue },
          { title: "Total Invoiced", value: totalInvoiced },
          { title: "Total Received", value: totalReceived },
          { title: "Total Expenses", value: totalExpenses },
          { title: "Net Cash", value: netCash },
          { title: "Outstanding Receivables", value: outstandingReceivables }].map((kpi, idx) => (
          <div className="col-md-4 mb-3" key={idx}>
            <div className="card shadow-sm">
              <div className="card-body">
                <h6 className="card-title text-uppercase">{kpi.title}</h6>
                <input type="number" className="form-control" value={kpi.value} readOnly />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <ul className="nav nav-pills mb-3">
        {tabs.map(tab => (
          <li className="nav-item" key={tab.id}>
            <button className={`nav-link ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
          </li>
        ))}
      </ul>

      {/* Tab content */}
      <div className="tab-content">
        {tabs.map(tab => {
          const [data, setData] = tab.state;
          return (
            <div key={tab.id} className={`tab-pane fade ${activeTab === tab.id ? "show active" : ""}`}>
              <TabTableFirestore
                companyId={companyId}
                tabName={tab.id}
                data={data}
                setData={setData}
                columns={tab.columns}
                templates={tab.templates}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------
   TAB TABLE CONNECTED TO FIRESTORE
------------------------- */
function TabTableFirestore({ companyId, tabName, data, setData, columns, templates }) {
  const handleChange = (index, field, value) => {
    setData(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddRow = () => setData(prev => [...prev, { ...templates }]);
  const handleRemoveRow = async (index) => {
    const row = data[index];
    if (row.id) await financeService.deleteFinanceRow(companyId, tabName, row.id);
    setData(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveRow = async (index) => {
    const row = data[index];
    if (row.id) {
      await financeService.updateFinanceRow(companyId, tabName, row.id, row);
    } else {
      const id = await financeService.addFinanceRow(companyId, tabName, row);
      setData(prev => {
        const copy = [...prev];
        copy[index].id = id;
        return copy;
      });
    }
  };

  return (
    <div>
      <button className="btn btn-sm btn-success mb-2" onClick={handleAddRow}>+ Add Row</button>
      <table className="table table-bordered">
        <thead className="table-light">
          <tr>
            {columns.map(c => <th key={c}>{c}</th>)}
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              {columns.map(c => (
                <td key={c}>
                  <input
                    type={["amount", "value", "cost", "paid"].some(k => c.toLowerCase().includes(k)) ? "number" : "text"}
                    className="form-control"
                    value={row[c]}
                    onChange={e => handleChange(idx, c, e.target.value)}
                  />
                </td>
              ))}
              <td>
                <button className="btn btn-sm btn-primary me-2" onClick={() => handleSaveRow(idx)}>Save</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleRemoveRow(idx)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


// // src/pages/finance/FinancePage.jsx
// import React, { useState } from "react";
// import "bootstrap/dist/css/bootstrap.min.css";
// import { useAuth } from "../../contexts/AuthContext"; // assuming you have this
// import { addFinanceRow, updateFinanceRow, deleteFinanceRow, getFinaceRows, } from "../../firebase/financeService";

// export default function FinancePage() {
//   const [activeTab, setActiveTab] = useState("projects");

//   /* -------------------------
//      STATE
//   ------------------------- */
//   const [projects, setProjects] = useState([]);
//   const [cashFlow, setCashFlow] = useState([]);
//   const [invoices, setInvoices] = useState([]);
//   const [payments, setPayments] = useState([]);
//   const [poSummary, setPoSummary] = useState([]);
//   const [profitLoss, setProfitLoss] = useState([]);
//   const [retentionClaims, setRetentionClaims] = useState([]);

//   /* -------------------------
//      Load all tab data
//   ------------------------- */
//   useEffect(() => {
//     tabs.forEach(async (tab) => {
//       const rows = await financeService.getFinanceRows(companyId, tab.id);
//       tab.state[1](rows); // set state
//     });
//   }, [companyId]);

//   /* -------------------------
//      CALCULATED KPI
//   ------------------------- */
//   const totalContractValue = projects.reduce(
//     (sum, p) => sum + Number(p.contractValue || 0),
//     0
//   );
//   const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.amount || 0), 0);
//   const totalReceived = payments.reduce((sum, p) => sum + Number(p.paid || 0), 0);
//   const totalExpenses = projects.reduce((sum, p) => sum + Number(p.actualCost || 0), 0);
//   const netCash = totalReceived - totalExpenses;
//   const outstandingReceivables = totalInvoiced - totalReceived;

//   /* -------------------------
//      TAB MENU ITEMS
//   ------------------------- */
//   const tabs = [
//     { id: "projects", label: "Project Financials", state: [projects, setProjects], columns: ["project", "contractValue", "budget", "actualCost", "profit", "status"], templates: { project: "", contractValue: "", budget: "", actualCost: "", profit: "", status: "" } },
//     { id: "cashFlow", label: "Cash Flow", state: [cashFlow, setCashFlow], columns: ["month", "inflow", "outflow", "net"], templates: { month: "", inflow: "", outflow: "", net: "" } },
//     { id: "invoices", label: "Invoices", state: [invoices, setInvoices], columns: ["invoiceNo", "project", "amount", "status", "due"], templates: { invoiceNo: "", project: "", amount: "", status: "", due: "" } },
//     { id: "payments", label: "Payments", state: [payments, setPayments], columns: ["vendor", "poNo", "amount", "paid", "date"], templates: { vendor: "", poNo: "", amount: "", paid: "", date: "" } },
//     { id: "poSummary", label: "PO Summary", state: [poSummary, setPoSummary], columns: ["poNo", "project", "amount", "status", "date"], templates: { poNo: "", project: "", amount: "", status: "", date: "" } },
//     { id: "profitLoss", label: "Project P&L", state: [profitLoss, setProfitLoss], columns: ["project", "revenue", "cost", "profit"], templates: { project: "", revenue: "", cost: "", profit: "" } },
//     { id: "retentionClaims", label: "Retention & Claims", state: [retentionClaims, setRetentionClaims], columns: ["project", "claimType", "amount", "status"], templates: { project: "", claimType: "", amount: "", status: "" } },
//   ];

//   return (
//     <div className="container py-4">
//       <h2 className="mb-4">Business Finance Management</h2>

//       {/* =========================
//           KPI CARDS
//       ========================= */}
//       <div className="row mb-4">
//         {[
//           { title: "Total Contract Value", value: totalContractValue },
//           { title: "Total Invoiced", value: totalInvoiced },
//           { title: "Total Received", value: totalReceived },
//           { title: "Total Expenses", value: totalExpenses },
//           { title: "Net Cash", value: netCash },
//           { title: "Outstanding Receivables", value: outstandingReceivables },
//         ].map((kpi, idx) => (
//           <div className="col-md-4 mb-3" key={idx}>
//             <div className="card shadow-sm">
//               <div className="card-body">
//                 <h6 className="card-title text-uppercase">{kpi.title}</h6>
//                 <input
//                   type="number"
//                   className="form-control"
//                   value={kpi.value}
//                   readOnly
//                 />
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* =========================
//           SUBMENU TABS
//       ========================= */}
//       <ul className="nav nav-pills mb-3">
//         {tabs.map((tab) => (
//           <li className="nav-item" key={tab.id}>
//             <button
//               className={`nav-link ${activeTab === tab.id ? "active" : ""}`}
//               onClick={() => setActiveTab(tab.id)}
//             >
//               {tab.label}
//             </button>
//           </li>
//         ))}
//       </ul>

//       {/* =========================
//           TABLE CONTENT
//       ========================= */}
//       <div className="tab-content">
//         {tabs.map((tab) => {
//           const [data, setData] = tab.state;
//           return (
//             <div
//               key={tab.id}
//               className={`tab-pane fade ${activeTab === tab.id ? "show active" : ""}`}
//             >
//               <TabTable data={data} setData={setData} columns={tab.columns} templates={tab.templates} />
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// /* -------------------------
//    TAB TABLE COMPONENT
// ------------------------- */
// function TabTable({ data, setData, columns, templates }) {
//   const handleArrayChange = (index, field, value) => {
//     setData((prev) => {
//       const copy = [...prev];
//       copy[index] = { ...copy[index], [field]: value };
//       return copy;
//     });
//   };

//   const handleAddRow = () => {
//     setData((prev) => [...prev, { ...templates }]);
//   };

//   const handleRemoveRow = (index) => {
//     setData((prev) => prev.filter((_, i) => i !== index));
//   };

//   const handleSaveRow = (index) => {
//     alert(`Row ${index + 1} saved!`);
//   };

//   return (
//     <div>
//       <button className="btn btn-sm btn-success mb-2" onClick={handleAddRow}>
//         + Add Row
//       </button>
//       <table className="table table-bordered">
//         <thead className="table-light">
//           <tr>
//             {columns.map((col) => (
//               <th key={col}>{col}</th>
//             ))}
//             <th>Action</th>
//           </tr>
//         </thead>
//         <tbody>
//           {data.map((row, idx) => (
//             <tr key={idx}>
//               {columns.map((col) => (
//                 <td key={col}>
//                   <input
//                     type={
//                       col.toLowerCase().includes("amount") ||
//                       col.toLowerCase().includes("value") ||
//                       col.toLowerCase().includes("cost") ||
//                       col.toLowerCase().includes("paid")
//                         ? "number"
//                         : "text"
//                     }
//                     className="form-control"
//                     value={row[col]}
//                     onChange={(e) => handleArrayChange(idx, col, e.target.value)}
//                   />
//                 </td>
//               ))}
//               <td>
//                 <button className="btn btn-sm btn-primary me-2" onClick={() => handleSaveRow(idx)}>Save</button>
//                 <button className="btn btn-sm btn-danger" onClick={() => handleRemoveRow(idx)}>Delete</button>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }



// // src/pages/finance/Finance.jsx
// import React from "react";
// import { Container, Card } from "react-bootstrap";
// import { useAuth } from "../../contexts/AuthContext";
// import "bootstrap/dist/css/bootstrap.min.css";

// export default function Finance() {
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
//             Finance Module
//           </Card.Title>

//           <Card.Text style={{ fontSize: 16, color: "#555" }}>
//             🚧 This page is currently under development.
//           </Card.Text>

//           <Card.Text style={{ fontSize: 15, color: "#777" }}>
//             Finance management features such as stock tracking, item
//             allocation, and usage reports will be available soon.
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
