import React, { useState } from "react";
import { Button, Form, Card } from "react-bootstrap";
import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";

import {
  getMaintenanceEntries,
  addMaintenanceEntry as addEntryToDB,
  deleteMaintenanceEntry as deleteEntryFromDB,
  updateMaintenanceEntry as updateEntryInDB
} from "../../firebase/maintenanceService";

export default function Maintenance() {
  const { companyId } = useAuth();

  useEffect(() => {

    if (!companyId) return;

    const loadEntries = async () => {

      const data = await getMaintenanceEntries(companyId);

      const formatted = {};

      data.forEach((entry) => {
        if (!formatted[entry.date]) {
          formatted[entry.date] = [];
        }

        formatted[entry.date].push(entry);
      });

      setEntries(formatted);
    };

    loadEntries();

  }, [companyId]);


  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [entries, setEntries] = useState({});

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthName = currentMonth.toLocaleString("default", { month: "long" });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday start

  const weeks = [];
  let dayCounter = 1 - firstDayIndex;

  while (dayCounter <= daysInMonth) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(dayCounter > 0 && dayCounter <= daysInMonth ? dayCounter : null);
      dayCounter++;
    }
    weeks.push(week);
  }

  const dateKey = (day) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const addEntry = async (day) => {
    const key = dateKey(day);

    const newEntry = {
      date: key,
      title: "",
      task: "",
      staff: ""
    };

    try {
      const docRef = await addEntryToDB(companyId, newEntry);

      setEntries((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), { id: docRef.id, ...newEntry }]
      }));
    } catch (err) {
      console.error("Error adding maintenance entry:", err);
    }
  };

  const removeEntry = async (day, index) => {
  const key = dateKey(day);
  const entry = entries[key]?.[index];

  if (!entry) return;
  if (!window.confirm("Delete this entry?")) return;

  try {
    await deleteEntryFromDB(companyId, entry.id);

    setEntries((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index)
    }));
  } catch (err) {
    console.error("Delete failed:", err);
  }
};

  const updateEntry = async (day, index, field, value) => {
    const key = dateKey(day);

    const updated = [...(entries[key] || [])];
    updated[index][field] = value;

    setEntries((prev) => ({
      ...prev,
      [key]: updated,
    }));

    const entry = updated[index];

    try {
      await updateEntryInDB(companyId, entry.id, entry);
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  const changeMonth = (dir) => {
    setCurrentMonth(new Date(year, month + dir, 1));
  };

  return (
    <div className="container mt-4">

      {/* ROW 1 — TITLE */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Button variant="secondary" onClick={() => changeMonth(-1)}>◀</Button>
        <h4>{monthName} {year}</h4>
        <Button variant="secondary" onClick={() => changeMonth(1)}>▶</Button>
      </div>

      {/* ROW 2 — DAYS */}
      <div className="row text-center fw-bold border-bottom">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="col border p-2 bg-light">{d}</div>
        ))}
      </div>

      {/* ROW 3+ — WEEKS */}
      {weeks.map((week, wIdx) => (
        <div key={wIdx} className="row g-0">
          {week.map((day, dIdx) => (
            <div key={dIdx} className="col border p-2" style={{ minHeight: 230 }}>
              {day && (
                <>
                  <strong>{day}</strong>

                  {(entries[dateKey(day)] || []).map((entry, idx) => (
                    <Card key={entry.id} className="mt-2">
                      <Card.Body className="p-2">
                        <Form.Control
                          size="sm"
                          placeholder="Title"
                          className="mb-1"
                          value={entry.title}
                          onChange={(e) =>
                            updateEntry(day, idx, "title", e.target.value)
                          }
                        />

                        <Form.Control
                          size="sm"
                          placeholder="Task to do"
                          className="mb-1"
                          value={entry.task}
                          onChange={(e) =>
                            updateEntry(day, idx, "task", e.target.value)
                          }
                        />

                        <Form.Control
                          size="sm"
                          placeholder="Staff Assigned"
                          className="mb-1"
                          value={entry.staff}
                          onChange={(e) =>
                            updateEntry(day, idx, "staff", e.target.value)
                          }
                        />

                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => removeEntry(day, idx)}
                        >
                          Remove
                        </Button>
                      </Card.Body>
                    </Card>
                  ))}

                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={() => addEntry(day)}
                  >
                    + Add Entry
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// // src/pages/maintenance/Maintenance.jsx
// import React from "react";
// import { Container, Card } from "react-bootstrap";
// import { useAuth } from "../../contexts/AuthContext";
// import "bootstrap/dist/css/bootstrap.min.css";

// export default function Maintenance() {
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
//             Maintenance Module
//           </Card.Title>

//           <Card.Text style={{ fontSize: 16, color: "#555" }}>
//             🚧 This page is currently under development.
//           </Card.Text>

//           <Card.Text style={{ fontSize: 15, color: "#777" }}>
//             Maintenance management features will be available soon.
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