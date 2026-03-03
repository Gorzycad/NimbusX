import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

import { getLeads } from "../../firebase/leadsService";
import { getTenders } from "../../firebase/tenderService";
import { getAwards } from "../../firebase/awardService";
import { getExecutions } from "../../firebase/executionService";
import { getHandovers } from "../../firebase/handoverService";

function calcProgress(startDate, endDate) {
  if (!startDate || !endDate) return 0;

  const now = Date.now();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  if (now <= start) return 0;
  if (now >= end) return 100;

  return Math.round(((now - start) / (end - start)) * 100);
}

export default function ReportsPage() {
  const { companyId } = useAuth();

  const [leads, setLeads] = useState([]);
  const [tenders, setTenders] = useState([]);
  const [awards, setAwards] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [handovers, setHandovers] = useState([]);

  useEffect(() => {
    if (!companyId) return;

    Promise.all([
      getLeads(companyId),
      getTenders(companyId),
      getAwards(companyId),
      getExecutions(companyId),
      getHandovers(companyId),
    ]).then(([l, t, a, e, h]) => {
      setLeads(l || []);
      setTenders(t || []);
      setAwards(a || []);
      setExecutions(e || []);
      setHandovers(h || []);
    });
  }, [companyId]);

  return (
    <div className="container py-4">
      <h2 className="mb-4">Reports Dashboard</h2>

      {/* SUMMARY CARDS */}
      <div className="row mb-4">
        <SummaryCard title="Leads" value={leads.length} />
        <SummaryCard title="Tenders Submitted" value={tenders.length} />
        <SummaryCard title="Projects Awarded" value={awards.length} />
        <SummaryCard title="In Execution" value={executions.length} />
        <SummaryCard title="Handed Over" value={handovers.length} />
      </div>

      {/* EXECUTION PROGRESS */}
      <div className="card mb-4">
        <div className="card-header">Project Execution Progress</div>
        <div className="card-body">
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>Project</th>
                <th>Start</th>
                <th>End</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {executions.map(e => {
                const progress = calcProgress(e.startDate, e.endDate);
                return (
                  <tr key={e.id}>
                    <td>{e.projectName}</td>
                    <td>{e.startDate}</td>
                    <td>{e.endDate}</td>
                    <td>
                      <div className="progress">
                        <div
                          className="progress-bar"
                          style={{ width: `${progress}%` }}
                        >
                          {progress}%
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* HANDOVER LIST */}
      <div className="card">
        <div className="card-header">Projects Handed Over</div>
        <div className="card-body">
          <ul>
            {handovers.map(h => (
              <li key={h.id}>{h.projectName}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value }) {
  return (
    <div className="col-md-2">
      <div className="card text-center shadow-sm">
        <div className="card-body">
          <h6>{title}</h6>
          <h3>{value}</h3>
        </div>
      </div>
    </div>
  );
}

// // src/pages/reports/ProgressReports.jsx
// import React, { useEffect, useState } from "react";
// import { useAuth } from "../../contexts/AuthContext";
// import {
//   fetchExecutionReports,
//   fetchPurchaseOrders,
//   fetchStaff,
//   getReportsByProject,
//   getReportsByDate,
// } from "../../firebase/reportsService";

// const Reports = () => {
//   const { user } = useAuth();
//   const companyId = user?.companyId;

//   const [loading, setLoading] = useState(true);
//   const [executionReports, setExecutionReports] = useState([]);
//   const [purchaseOrders, setPurchaseOrders] = useState([]);
//   const [staffList, setStaffList] = useState([]);
//   const [filterProject, setFilterProject] = useState("");
//   const [dateRange, setDateRange] = useState({ start: "", end: "" });

//   useEffect(() => {
//     if (!companyId) return; // ⛔ WAIT for companyId

//     loadReports();
//   }, [companyId]);

//   const loadReports = async () => {
//     setLoading(true);
//     const exec = await fetchExecutionReports(companyId);
//     const pos = await fetchPurchaseOrders(companyId);
//     const staff = await fetchStaff(companyId);

//     setExecutionReports(exec);
//     setPurchaseOrders(pos);
//     setStaffList(staff);
//     setLoading(false);
//   };

//   const handleProjectFilter = async () => {
//     if (!filterProject.trim() || !companyId) return;

//     setLoading(true);
//     const data = await getReportsByProject(companyId, filterProject);
//     setExecutionReports(data);
//     setLoading(false);
//   };

//   const handleDateFilter = async () => {
//     if (!dateRange.start || !dateRange.end || !companyId) return;

//     setLoading(true);
//     const data = await getReportsByDate(companyId, dateRange.start, dateRange.end);
//     setExecutionReports(data);
//     setLoading(false);
//   };

//   const getCompletedTasks = () =>
//     executionReports.filter((e) => e.status === "Completed").length;

//   const getInProgressTasks = () =>
//     executionReports.filter((e) => e.status === "In Progress").length;

//   const getTotalPOValue = () =>
//     purchaseOrders.reduce((sum, p) => sum + (p.amount || 0), 0);

//   if (!companyId) {
//     return <div>Loading company data...</div>;
//   }

//   return (
//     <div className="container mt-4">
//       <h2 className="fw-bold mb-3">Project Reports</h2>

//       {/* Filters */}
//       <div className="card p-3 mb-4 shadow-sm">
//         <h5 className="fw-bold">Filters</h5>
//         <div className="row g-3">

//           <div className="col-md-4">
//             <label className="form-label">Filter By Project</label>
//             <input
//               type="text"
//               className="form-control"
//               placeholder="Enter project name"
//               value={filterProject}
//               onChange={(e) => setFilterProject(e.target.value)}
//             />
//             <button
//               className="btn btn-primary mt-2"
//               onClick={handleProjectFilter}
//             >
//               Apply
//             </button>
//           </div>

//           <div className="col-md-4">
//             <label className="form-label">Start Date</label>
//             <input
//               type="date"
//               className="form-control"
//               onChange={(e) =>
//                 setDateRange({ ...dateRange, start: e.target.value })
//               }
//             />
//           </div>

//           <div className="col-md-4">
//             <label className="form-label">End Date</label>
//             <input
//               type="date"
//               className="form-control"
//               onChange={(e) =>
//                 setDateRange({ ...dateRange, end: e.target.value })
//               }
//             />
//             <button
//               className="btn btn-secondary mt-2"
//               onClick={handleDateFilter}
//             >
//               Apply Date Range
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Summary Cards */}
//       <div className="row mb-4">
//         <div className="col-md-4">
//           <div className="card text-white bg-success shadow-sm">
//             <div className="card-body">
//               <h5 className="card-title">Completed Tasks</h5>
//               <h2>{getCompletedTasks()}</h2>
//             </div>
//           </div>
//         </div>

//         <div className="col-md-4">
//           <div className="card text-white bg-warning shadow-sm">
//             <div className="card-body">
//               <h5 className="card-title">In Progress</h5>
//               <h2>{getInProgressTasks()}</h2>
//             </div>
//           </div>
//         </div>

//         <div className="col-md-4">
//           <div className="card text-white bg-info shadow-sm">
//             <div className="card-body">
//               <h5 className="card-title">Total PO Value</h5>
//               <h2>₦ {getTotalPOValue().toLocaleString()}</h2>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Execution Table */}
//       <div className="card shadow-sm">
//         <div className="card-header bg-dark text-white">
//           <h5 className="mb-0">Execution Summary</h5>
//         </div>
//         <div className="table-responsive">
//           <table className="table table-striped table-bordered mb-0">
//             <thead>
//               <tr>
//                 <th>Project</th>
//                 <th>Task</th>
//                 <th>Status</th>
//                 <th>Date</th>
//                 <th>Staff Assigned</th>
//               </tr>
//             </thead>
//             <tbody>
//               {executionReports.map((item) => (
//                 <tr key={item.id}>
//                   <td>{item.projectName}</td>
//                   <td>{item.taskName}</td>
//                   <td>{item.status}</td>
//                   <td>{item.date}</td>
//                   <td>{item.staffAssigned}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Staff Performance */}
//       <div className="card shadow-sm mt-4">
//         <div className="card-header bg-primary text-white">
//           <h5>Staff Performance Summary</h5>
//         </div>
//         <div className="card-body">
//           {staffList.length === 0 ? (
//             <p>No staff data available.</p>
//           ) : (
//             <ul className="list-group">
//               {staffList.map((s) => (
//                 <li className="list-group-item" key={s.id}>
//                   <strong>{s.name}</strong> — {s.role}
//                 </li>
//               ))}
//             </ul>
//           )}
//         </div>
//       </div>

//       {loading && (
//         <div className="text-center mt-3">
//           <div className="spinner-border"></div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Reports;
