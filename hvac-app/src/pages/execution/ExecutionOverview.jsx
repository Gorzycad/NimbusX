import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

import {
  addExecution,
  updateExecution,
  deleteExecution,
  getExecutions,
} from "../../firebase/executionService";

import { getLeads } from "../../firebase/leadsService";
import StaffSelector from "../../components/layout/StaffSelector";
import { getRolesForSelector } from "../../config/roleAccess";

import { db } from "../../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";
import { notifyAssignedStaff } from "../leads/LeadsListHelper";

/* ---------------- HELPERS ---------------- */

function addDays(dateStr, days) {
  if (!dateStr || !days) return "";
  const d = new Date(dateStr);
  d.setDate(d.getDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

function calculateProgress(startDate, finishDate) {
  if (!startDate || !finishDate) return 0;

  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(finishDate);

  if (now <= start) return 0;
  if (now >= end) return 100;

  const total = end - start;
  const elapsed = now - start;
  return Math.round((elapsed / total) * 100);
}

/* ---------------- COMPONENT ---------------- */

export default function ExecutionPage() {
  const { companyId, user } = useAuth();

  const [executions, setExecutions] = useState([]);
  const [projectList, setProjectList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    projectName: "",
    staffAssigned: [],
    startDate: "",
    tasks: [],
  });

  console.log("companyId:", companyId);
  console.log("user:", user?.uid);

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

  const staffAssignedIds = formData.staffAssigned;

  const staffNameMap = useMemo(() => {
    const map = {};
    staffList.forEach(u => {
      map[u.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    });
    return map;
  }, [staffList]);

  // Notify assigned staff helper
  const notifyStaffForLead = async (companyId, userIds, executionId, leadData, sourcePage, mainMenu) => {
    if (!userIds || !userIds.length) return;
    await notifyAssignedStaff(companyId, executionId, leadData, userIds, sourcePage, mainMenu);
  };

  /* ---------------- LOAD PROJECTS ---------------- */
  useEffect(() => {
    if (!companyId) return;

    getLeads(companyId).then(leads => {
      const names = Array.from(new Set(leads.map(l => l.projectName)));
      setProjectList(names);
    });
  }, [companyId]);

  /* ---------------- LOAD EXECUTIONS ---------------- */
  useEffect(() => {
    if (!companyId) return;

    getExecutions(companyId).then(setExecutions);
  }, [companyId]);

  /* ---------------- TASK HANDLERS ---------------- */

  const addTask = () => {
    setFormData(f => ({
      ...f,
      tasks: [
        ...f.tasks,
        { task: "", duration: "", start: "", finish: "" },
      ],
    }));
  };

  const updateTask = (i, key, value) => {
    const tasks = [...formData.tasks];
    tasks[i][key] = value;

    if (key === "duration" || key === "start") {
      tasks[i].finish = addDays(tasks[i].start, tasks[i].duration);
    }

    setFormData({ ...formData, tasks });
  };

  const removeTask = (i) => {
    setFormData({
      ...formData,
      tasks: formData.tasks.filter((_, idx) => idx !== i),
    });
  };

  /* ---------------- SAVE / UPDATE ---------------- */

  const handleSave = async () => {
    if (!formData.projectName) {
      alert("Select project");
      return;
    }

    const overallStart = formData.tasks[0]?.start;
    const overallFinish = formData.tasks.at(-1)?.finish;

    const progress = calculateProgress(overallStart, overallFinish);

    const payload = {
      projectName: formData.projectName,
      staffAssigned: formData.staffAssigned,
      startDate: formData.startDate,
      tasks: formData.tasks,
      progress,
    };


    let id;

    if (editingId) {
      await updateExecution(companyId, editingId, payload);
      id = editingId;

    } else {
      const creatorName = staffNameMap[user.uid] || "Unknown User";

      id = await addExecution(companyId, {
        ...payload,
        createdBy: {
          uid: user.uid,
          name: creatorName,
        },
      });
    }

    try {
      if (companyId && user && staffAssignedIds.length > 0) {
        await notifyStaffForLead(
          companyId,
          staffAssignedIds,
          id,
          payload,
          "Execution".trim(),
          "Execution"
        );
      }
    } catch (err) {
      console.warn("Notification failed, lead still saved:", err);
    }

    setExecutions(await getExecutions(companyId));
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      projectName: "",
      staffAssigned: [],
      startDate: "",
      tasks: [],
    });
    setEditingId(null);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      projectName: item.projectName,
      staffAssigned: item.staffAssigned || [],
      startDate: item.startDate || "",
      tasks: item.tasks || [],
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this program?")) return;
    await deleteExecution(companyId, id);
    setExecutions(prev => prev.filter(e => e.id !== id));
  };

  /* ---------------- RENDER ---------------- */

  return (
    <div className="container py-4">
      <h2>Execution – Program of Works</h2>

      <div className="card p-3 mb-4">
        <select
          className="form-select mb-2"
          value={formData.projectName}
          onChange={e =>
            setFormData({ ...formData, projectName: e.target.value })
          }
        >
          <option value="">-- Select Project --</option>
          {projectList.map(p => <option key={p}>{p}</option>)}
        </select>

        <input
          type="date"
          className="form-control mb-2"
          value={formData.startDate}
          onChange={e =>
            setFormData({ ...formData, startDate: e.target.value })
          }
        />

        <StaffSelector
          options={getRolesForSelector()}
          value={formData.staffAssigned}
          onChange={v =>
            setFormData({ ...formData, staffAssigned: v })
          }
        />

        <table className="table mt-3">
          <thead>
            <tr>
              <th>Task</th>
              <th>Duration (days)</th>
              <th>Start</th>
              <th>Finish</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {formData.tasks.map((t, i) => (
              <tr key={i}>
                <td>
                  <input
                    value={t.task}
                    onChange={e => updateTask(i, "task", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={t.duration}
                    onChange={e => updateTask(i, "duration", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={t.start}
                    onChange={e => updateTask(i, "start", e.target.value)}
                  />
                </td>
                <td>{t.finish}</td>
                <td>
                  <button onClick={() => removeTask(i)}>✖</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button className="btn btn-secondary me-2" onClick={addTask}>
          + Add Task
        </button>

        <button className="btn btn-primary" onClick={handleSave}>
          {editingId ? "Update Program" : "Save Program"}
        </button>
      </div>

      <h4>Saved Programs</h4>

      <table className="table table-striped">
        <thead>
          <tr>
            <th>Project</th>
            <th>Progress</th>
            <th>Staff</th>
            <th>Date</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {executions.map(e => (
            <tr key={e.id}>
              <td>{e.projectName}</td>
              <td>
                <div className="progress">
                  <div
                    className="progress-bar"
                    style={{ width: `${e.progress || 0}%` }}
                  >
                    {e.progress || 0}%
                  </div>
                </div>
              </td>
              <td>
                {(e.staffAssigned || [])
                  .map(uid => staffNameMap[uid] || uid)
                  .join(", ")}
              </td>
              <td>
                {e.createdAt?.seconds
                  ? new Date(e.createdAt.seconds * 1000).toLocaleDateString()
                  : "--"}
              </td>
              <td>
                <button onClick={() => handleEdit(e)}>Edit</button>{" "}
                <button onClick={() => handleDelete(e.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
