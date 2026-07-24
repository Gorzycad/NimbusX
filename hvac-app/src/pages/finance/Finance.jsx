import React, { useState, useEffect, useMemo } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useAuth } from "../../contexts/AuthContext"; // assuming you have this
import financeService from "../../firebase/financeService";
import {
  collection,
  getDocs
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { getLeads } from "../../firebase/leadsService";
import { Timestamp } from "firebase/firestore";

export default function FinancePage() {
  const { companyId, user, role } = useAuth(); // get current companyId
  const [activeTab, setActiveTab] = useState("projects");
  const [projects, setProjects] = useState([]);
  const [cashFlow, setCashFlow] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectList, setProjectList] = useState([]);
  const [expandedProjects, setExpandedProjects] = useState({});
  const [staffList, setStaffList] = useState([]);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const formatDate = (date) => {
    if (!date) return "--";

    // Firestore Timestamp
    if (date?.toDate) {
      return date.toDate().toLocaleString();
    }

    if (date?.seconds) {
      return new Date(date.seconds * 1000).toLocaleString();
    }

    if (date instanceof Date) {
      return date.toLocaleString();
    }

    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? "--" : parsed.toLocaleString();
  };

  const tabs = useMemo(() => [
    { id: "projects", label: "Project Financials", state: [projects, setProjects], columns: ["contractNo", "contractValue", "budget", "actualCost", "profit"], templates: { contractNo: "", project: "", contractValue: "", budget: "", actualCost: "", profit: "" } },
    { id: "invoices", label: "Invoices", state: [invoices, setInvoices], columns: ["invoiceNo", "amount", "status", "due"], templates: { invoiceNo: "", project: "", amount: "", status: "", due: "" } },
    { id: "payments", label: "Receipts", state: [payments, setPayments], columns: ["vendor", "poNo", "amount", "paid"], templates: { vendor: "", poNo: "", amount: "", paid: "" } },
    { id: "cashFlow", label: "Expenses", state: [cashFlow, setCashFlow], columns: ["contractNo", "description", "outflow"], templates: { contractNo: "", description: "", outflow: "" } },
  ], [
  projects, invoices, payments, cashFlow,
]);



  /* -------------------------
     Load all tab data
  ------------------------- */
  useEffect(() => {
    if (!companyId) return;

    setLoading(true);

    const loadData = async () => {
      for (const tab of tabs) {
        const rows = await financeService.getFinanceRows(
          companyId,
          tab.id
        );

        const sorted = (rows || []).sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;

          return bTime - aTime;
        });

        tab.setState(sorted);
        //tab.state[1](sorted);
      }

      setLoading(false);
    };

    loadData();
  }, [companyId, tabs]);

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
      map[u.id] =
        `${u.firstName || ""} ${u.lastName || ""}`.trim();
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

      const names = Array.from(
        new Set(
          leads
            .map(l => l.projectName)
            .filter(Boolean)
        )
      );

      setProjectList(names);

      // first project expanded by default
      if (names.length) {
        setExpandedProjects(prev => ({
          ...prev,
          [names[0]]: true
        }));
      }
    };

    loadProjects();
  }, [companyId]);

  const formatCurrency1 = (value) => {
    return Number(value || 0).toLocaleString("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    });
  };

  /* -------------------------
     KPI Calculations
  ------------------------- */
  const totalContractValue = projects.reduce((sum, p) => sum + Number(p.contractValue || 0), 0);
  const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const totalReceived = payments.reduce((sum, p) => sum + Number(p.paid || 0), 0);
  const totalExpenses = cashFlow.reduce(
    (sum, row) => sum + Number(row.outflow || 0),
    0
  );
  const netCash = totalReceived - totalExpenses;
  const outstandingReceivables = totalInvoiced - totalReceived;


  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "70vh" }}>
        <div className="text-center">
          <div className="spinner-border text-primary" />
          <div className="mt-2">Loading...</div>
        </div>
      </div>
    );
  }

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
                <input type="text" className="form-control" value={formatCurrency1(kpi.value)} readOnly />
              </div>
            </div>
          </div>
        ))}
      </div>


      {/* Tab content */}
      <div className="mt-4">

        {projectList.map(project => {

          const expanded = expandedProjects[project];

          return (
            <div
              className="card shadow-sm mb-3"
              key={project}
            >
              <div
                className="card-header d-flex justify-content-between align-items-center"
                style={{
                  cursor: "pointer",
                  background: "#f8f9fa"
                }}
                onClick={() =>
                  setExpandedProjects(prev => ({
                    ...prev,
                    [project]: !prev[project]
                  }))
                }
              >
                <strong>{project}</strong>

                <span>
                  {expanded ? "−" : "+"}
                </span>
              </div>

              {expanded && (
                <div className="card-body">

                  {/* Tabs */}
                  <ul className="nav nav-pills mb-3">
                    {tabs.map(tab => (
                      <li className="nav-item" key={tab.id}>
                        <button
                          className={`nav-link ${activeTab === tab.id
                            ? "active"
                            : ""
                            }`}
                          onClick={() =>
                            setActiveTab(tab.id)
                          }
                        >
                          {tab.label}
                        </button>
                      </li>
                    ))}
                  </ul>

                  {/* Active Tab */}
                  {tabs.map(tab => {
                    const [data, setData] = tab.state;

                    const filtered = data
                      .filter(row => {

                        // Project filter
                        if (row.projectName !== project) return false;

                        // Date filter
                        const d =
                          row.updatedAt?.toDate?.() ||
                          row.createdAt?.toDate?.();

                        if (!d) return true;

                        if (
                          filterMonth &&
                          d.getMonth() + 1 !== Number(filterMonth)
                        ) {
                          return false;
                        }

                        if (
                          filterYear &&
                          d.getFullYear() !== Number(filterYear)
                        ) {
                          return false;
                        }

                        return true;
                      })
                      .map(row => {

                        // Only Project Financials needs calculated fields
                        if (tab.id !== "projects") return row;

                        const actualCost = cashFlow
                          .filter(c =>
                            c.contractNo === row.contractNo
                          )
                          .reduce(
                            (sum, c) =>
                              sum + Number(c.outflow || 0),
                            0
                          );

                        return {
                          ...row,
                          actualCost,
                          profit:
                            Number(row.contractValue || 0) -
                            actualCost,
                        };
                      });

                    return (
                      activeTab === tab.id && (
                        <TabTableFirestore
                          key={tab.id}
                          companyId={companyId}
                          tabName={tab.id}
                          data={filtered}
                          setData={setData}
                          columns={tab.columns}
                          templates={{
                            ...tab.templates,
                            projectName: project
                          }}
                          user={user}
                          role={role}
                          staffNameMap={staffNameMap}
                          formatDate={formatDate}   // 👈 add this

                          filterMonth={filterMonth}
                          setFilterMonth={setFilterMonth}
                          filterYear={filterYear}
                          setFilterYear={setFilterYear}
                          projectContracts={projects}
                        />
                      )
                    );
                  })}

                </div>
              )}
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
function TabTableFirestore({ companyId, tabName, data, setData, columns, templates, user, role, staffNameMap, formatDate, filterMonth,
  setFilterMonth,
  filterYear,
  setFilterYear,
  projectContracts, }) {

  const labels = {
    contractValue: "Contract Value",
    budget: "Budget",
    actualCost: "Actual Cost",
    profit: "Profit",
    description: "Description",
    status: "Status",
    invoiceNo: "Invoice No",
    due: "Due Date",
    poNo: "PO No",
    paid: "Paid Amount",
    amount: "Total Amount",
    vendor: "Payer",
    outflow: "Outflow"
  };

  const canModify = (row) => {
    if (!user) return false;

    const isCeo =
      (role || "").toLowerCase() === "ceo";

    const isOwner =
      !row.createdBy ||
      row.createdBy?.uid === user.uid;

    return isCeo || isOwner;
  };

  const handleChange = (rowId, field, value) => {
    setData(prev =>
      prev.map(item =>
        item.id === rowId
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  const handleAddRow = () => {

    const tempId = crypto.randomUUID();

    setData(prev => [
      {
        ...templates,
        id: tempId,
        isTemp: true,
      },
      ...prev
    ]);
  };

  const handleRemoveRow = async (rowId) => {

    const row = data.find(r => r.id === rowId);

    if (row?.id) {
      await financeService.deleteFinanceRow(
        companyId,
        tabName,
        row.id
      );
    }

    setData(prev =>
      prev.filter(r => r.id !== rowId)
    );
  };

  const handleSaveRow = async (rowId) => {

    const row = data.find(r => r.id === rowId);

    if (!row) return;

    const creatorName =
      staffNameMap[user.uid] || "Unknown User";

    const { id, isTemp, ...cleanRow } = row;
    const payload = {
      ...cleanRow,
      updatedAt: Timestamp.now(),
    };

    // NEW ROW
    if (row.isTemp) {

      payload.createdAt =
        row.createdAt?.toDate
          ? row.createdAt
          : Timestamp.now();

      payload.createdBy = {
        uid: user.uid,
        name: creatorName,
      };

      delete payload.id;
      delete payload.isTemp;

      if (tabName === "projects" && !payload.contractNo) {
        const maxNo = Math.max(
          0,
          ...data.map(r => Number(r.contractNo || 0))
        );
        payload.contractNo = String(maxNo + 1);
      }

      const newId =
        await financeService.addFinanceRow(
          companyId,
          tabName,
          payload
        );

      setData(prev =>
        prev.map(r =>
          r.id === rowId
            ? {
              ...payload,
              id: newId,
              isTemp: false,
            }
            : r
        )
      );

    } else {

      // EXISTING ROW
      await financeService.updateFinanceRow(
        companyId,
        tabName,
        row.id,
        payload
      );
    }
  };


  return (
    <div>
      <button className="btn btn-sm btn-success mb-2" onClick={handleAddRow}>+ Add Row</button>
      <div className="row mb-3">

        <div className="col-md-3">
          <select
            className="form-select"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
          >
            <option value="">All Months</option>

            {Array.from({ length: 12 }, (_, i) => (
              <option
                key={i + 1}
                value={i + 1}
              >
                {new Date(0, i).toLocaleString(
                  "default",
                  { month: "long" }
                )}
              </option>
            ))}

          </select>
        </div>

        <div className="col-md-3">

          <select
            className="form-select"
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
          >

            <option value="">All Years</option>

            {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
              <option
                key={y}
                value={y}
              >
                {y}
              </option>
            ))}

          </select>

        </div>

      </div>
      <table className="table table-bordered">
        <thead className="table-light">
          <tr>
            <th>Created By</th>

            {columns.map(c => (
              <th key={c}>{labels[c] || c}</th>
            ))}

            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>

          {data.map((row, idx) => {

            const allowed = canModify(row);

            return (
              <tr key={row.id}>

                <td>
                  {row.createdBy?.name || "--"}
                </td>

                {columns.map(c => {
                  const isCurrencyField = [
                    "amount",
                    "contractValue",
                    "budget",
                    "actualCost",
                    "profit",
                    "paid",
                    "outflow",
                  ].includes(c);

                  return (
                    <td key={c}>
                      {tabName === "cashFlow" && c === "contractNo" ? (

                        <select
                          className="form-select"
                          value={row.contractNo || ""}
                          disabled={!allowed}
                          onChange={e =>
                            handleChange(
                              row.id,
                              "contractNo",
                              e.target.value
                            )
                          }
                        >
                          <option value="">Select Contract</option>

                          {projectContracts.map(project => (
                            <option
                              key={project.id}
                              value={project.contractNo}
                            >
                              {project.contractNo}
                            </option>
                          ))}
                        </select>


                      ) : tabName === "invoices" && c === "status" ? (
                        <select
                          className="form-select"
                          value={row[c] || "Pending"}
                          disabled={!allowed}
                          onChange={e =>
                            handleChange(row.id, c, e.target.value)
                          }
                        >
                          <option value="Pending">Pending</option>
                          <option value="Paid">Paid</option>
                        </select>

                      ) : tabName === "invoices" && c === "due" ? (

                        <input
                          type="date"
                          className="form-control"
                          value={row[c] || ""}
                          disabled={!allowed}
                          onChange={e =>
                            handleChange(row.id, c, e.target.value)
                          }
                        />

                      ) : isCurrencyField ? (

                        <div className="input-group">
                          <span className="input-group-text">₦</span>

                          <input
                            type="text"
                            className="form-control"
                            value={row[c] || ""}
                            disabled={
                              !allowed ||
                              (tabName === "projects" &&
                                ["actualCost", "profit"].includes(c))
                            }
                            onChange={e =>
                              handleChange(
                                row.id,
                                c,
                                e.target.value.replace(/[^\d.]/g, "")
                              )
                            }
                          />
                        </div>

                      ) : (

                        <input
                          type="text"
                          className="form-control"
                          value={row[c] || ""}
                          disabled={
                            !allowed ||
                            (tabName === "projects" &&
                              ["contractNo", "actualCost", "profit"].includes(c))
                          }
                          onChange={e =>
                            handleChange(row.id, c, e.target.value)
                          }
                        />

                      )}
                    </td>
                  );
                })}

                <td>
                  {formatDate(row.updatedAt || row.createdAt)}
                </td>

                <td>

                  <button
                    className="btn btn-sm btn-primary me-2"
                    disabled={!allowed}
                    onClick={() =>
                      handleSaveRow(row.id)
                    }
                  >
                    Save
                  </button>

                  <button
                    className="btn btn-sm btn-danger"
                    disabled={!allowed}
                    onClick={() =>
                      handleRemoveRow(row.id)
                    }
                  >
                    Delete
                  </button>

                </td>
              </tr>
            );
          })}

        </tbody>
      </table>
    </div>
  );
}

