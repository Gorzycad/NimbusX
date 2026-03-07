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
