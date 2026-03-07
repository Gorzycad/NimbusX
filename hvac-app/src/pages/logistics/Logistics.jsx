import React, { useState } from "react";
import { Button, Form, Card, Table } from "react-bootstrap";

export default function Logistics() {

  /* =======================
     DRIVERS TABLE STATE
  ======================== */
  const [drivers, setDrivers] = useState([]);

  const addDriver = () => {
    setDrivers((prev) => [
      ...prev,
      {
        name: "",
        phone: "",
        plate: "",
        vehicle: "",
      },
    ]);
  };

  const removeDriver = (index) => {
    setDrivers((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDriver = (index, field, value) => {
    const updated = [...drivers];
    updated[index][field] = value;
    setDrivers(updated);
  };

  /* =======================
     CALENDAR STATE
  ======================== */
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [entries, setEntries] = useState({});

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthName = currentMonth.toLocaleString("default", { month: "long" });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;

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

  const addEntry = (day) => {
    const key = dateKey(day);
    setEntries((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), { title: "", task: "", staff: "" }],
    }));
  };

  const removeEntry = (day, index) => {
    const key = dateKey(day);
    setEntries((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index),
    }));
  };

  const updateEntry = (day, index, field, value) => {
    const key = dateKey(day);
    const updated = [...entries[key]];
    updated[index][field] = value;

    setEntries((prev) => ({
      ...prev,
      [key]: updated,
    }));
  };

  const changeMonth = (dir) => {
    setCurrentMonth(new Date(year, month + dir, 1));
  };

  return (
    <div className="container mt-4">

      {/* =======================
          DRIVERS DATA TABLE
      ======================== */}
      <h4 className="mb-3">🚚 Drivers Data Page</h4>

      <Table bordered hover responsive>
        <thead className="table-light">
          <tr>
            <th>#</th>
            <th>Driver Name</th>
            <th>Driver Phone No</th>
            <th>Vehicle Plate No</th>
            <th>Vehicle Description</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {drivers.length === 0 && (
            <tr>
              <td colSpan="6" className="text-center text-muted">
                No drivers added
              </td>
            </tr>
          )}

          {drivers.map((driver, index) => (
            <tr key={index}>
              <td>{index + 1}</td>

              <td>
                <Form.Control
                  size="sm"
                  value={driver.name}
                  onChange={(e) =>
                    updateDriver(index, "name", e.target.value)
                  }
                />
              </td>

              <td>
                <Form.Control
                  size="sm"
                  value={driver.phone}
                  onChange={(e) =>
                    updateDriver(index, "phone", e.target.value)
                  }
                />
              </td>

              <td>
                <Form.Control
                  size="sm"
                  value={driver.plate}
                  onChange={(e) =>
                    updateDriver(index, "plate", e.target.value)
                  }
                />
              </td>

              <td>
                <Form.Control
                  size="sm"
                  value={driver.vehicle}
                  onChange={(e) =>
                    updateDriver(index, "vehicle", e.target.value)
                  }
                />
              </td>

              <td>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => removeDriver(index)}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Button className="mb-4" onClick={addDriver}>
        + Add Driver
      </Button>

      {/* =======================
          CALENDAR (UNCHANGED)
      ======================== */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Button variant="secondary" onClick={() => changeMonth(-1)}>◀</Button>
        <h4>{monthName} {year}</h4>
        <Button variant="secondary" onClick={() => changeMonth(1)}>▶</Button>
      </div>

      <div className="row text-center fw-bold border-bottom">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="col border p-2 bg-light">{d}</div>
        ))}
      </div>

      {weeks.map((week, wIdx) => (
        <div key={wIdx} className="row g-0">
          {week.map((day, dIdx) => (
            <div key={dIdx} className="col border p-2" style={{ minHeight: 230 }}>
              {day && (
                <>
                  <strong>{day}</strong>

                  {(entries[dateKey(day)] || []).map((entry, idx) => (
                    <Card key={idx} className="mt-2">
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
