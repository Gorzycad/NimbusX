//src/pages/staff/Staff.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { Table, Button } from "react-bootstrap";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "bootstrap/dist/css/bootstrap.min.css";

export default function Staff() {
  const { companyId, user, role } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [daysInMonth, setDaysInMonth] = useState(31);
  const [activeView, setActiveView] = useState("attendance");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // "attendance" | "subscription"
  const [companyName, setCompanyName] = useState("");

  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const monthLabel = `${year}-${month}`;

  /* ---------------- LOAD STAFF ---------------- */
  useEffect(() => {
    if (!companyId) return;

    const loadStaff = async () => {
      const staffSnap = await getDocs(
        collection(db, "companies", companyId, "users")
      );

      const list = staffSnap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      }));

      setStaffList(list);
    };

    loadStaff();
  }, [companyId]);

  /* ---------------- LOAD COMPANY ---------------- */
  useEffect(() => {
    if (!companyId) return;

    const loadCompany = async () => {
      const ref = doc(db, "companies", companyId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setCompanyName(snap.data().companyName || snap.data().name || "");
      }
    };

    loadCompany();
  }, [companyId]);


  /* ---------------- LOAD ATTENDANCE ---------------- */
  useEffect(() => {
    if (!companyId) return;

    const days = new Date(year, now.getMonth() + 1, 0).getDate();
    setDaysInMonth(days);

    const monthId = `${year}-${month}`;

    const loadAttendance = async () => {
      const attendanceData = {};

      for (let staff of staffList) {
        const attRef = doc(
          db,
          "companies",
          companyId,
          "attendance",
          monthId,
          "staff",
          staff.id
        );

        const snap = await getDoc(attRef);
        attendanceData[staff.id] = snap.exists() ? snap.data() : {};
      }

      setAttendance(attendanceData);
    };

    if (staffList.length) loadAttendance();
  }, [companyId, staffList, year, month, now.getMonth()]);

  /* ---------------- EXPORT PDF ---------------- */
  const exportToPDF = () => {
    const docPdf = new jsPDF("landscape");

    docPdf.setFontSize(12);
    docPdf.text(`Staff Attendance Report (${monthLabel})`, 14, 12);

    const head = [
      [
        "#",
        "First Name",
        "Last Name",
        "Role",
        "Registered",
        ...Array.from({ length: daysInMonth }, (_, i) => {
          const dateObj = new Date(year, Number(month) - 1, i + 1);

          const dayShort = dateObj.toLocaleDateString("en-US", {
            weekday: "short",
          });

          const fullDate = `${year}-${month}-${(i + 1)
            .toString()
            .padStart(2, "0")}`;

          return `${dayShort}\n${fullDate}`;
        }),
      ],
    ];

    const body = staffList.map((staff, index) => [
      index + 1,
      staff.firstName || "",
      staff.lastName || "",
      staff.role
        ?.replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      staff.createdAt?.toDate
        ? staff.createdAt.toDate().toLocaleDateString()
        : "--",
      ...Array.from({ length: daysInMonth }, (_, i) =>
        attendance[staff.id]?.[(i + 1).toString()] ? "•" : ""
      ),
    ]);

    autoTable(docPdf, {
      head,
      body,
      startY: 20,

      margin: { left: 10, right: 10 },
      theme: "grid",

      styles: {
        fontSize: 6,           // body font
        cellPadding: 1.2,
        halign: "center",
        valign: "middle",
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        minCellHeight: 6,
      },

      headStyles: {
        fillColor: [240, 240, 240],
        textColor: 0,
        fontSize: 4.5,         // smaller header font
        cellPadding: 0.8,
        halign: "center",
        valign: "middle",
        lineWidth: 0.3,
      },

      columnStyles: {
        0: { cellWidth: 6 },
        1: { cellWidth: 18 },
        2: { cellWidth: 18 },
        3: { cellWidth: 26 },
        4: { cellWidth: 16 },
      },

      didParseCell: (data) => {
        // Attendance dots columns
        if (data.column.index >= 5) {
          data.cell.styles.cellWidth = 6;
          data.cell.styles.fontSize = 6; // slightly bigger for dot
        }
      },

      tableWidth: "auto",
      pageBreak: "auto",
    });

    docPdf.save(`Attendance_${monthLabel}.pdf`);
  };

  const monthlyFee = 3500;
  const numberOfUsers = staffList.length;
  const totalDue = monthlyFee * numberOfUsers;

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];


  return (
    <div style={{ padding: 20 }}>
      {/* <h3>Staff Attendance – {monthLabel}</h3> */}
      {/* <div className="d-flex gap-3 mb-3">
        <h3
          style={{
            cursor: "pointer",
            color: activeView === "attendance" ? "#0d6efd" : "#555",
          }}
          onClick={() => setActiveView("attendance")}
        >
          Staff Attendance – {monthLabel}
        </h3>

        <h3
          style={{
            cursor: "pointer",
            color: activeView === "subscription" ? "#0d6efd" : "#555",
          }}
          onClick={() => setActiveView("subscription")}
        >
          Staff Subscription
        </h3>
      </div> */}
      <div className="d-flex gap-3 mb-3">
        <h3
          onClick={() => setActiveView("attendance")}
          style={{
            cursor: "pointer",
            padding: "8px 16px",
            borderRadius: 8,
            border: "2px solid #0d6efd",
            backgroundColor:
              activeView === "attendance" ? "#0d6efd" : "transparent",
            color:
              activeView === "attendance" ? "#fff" : "#0d6efd",
            transition: "all 0.2s ease",
            userSelect: "none",
          }}
        >
          Staff Attendance – {monthLabel}
        </h3>

        <h3
          onClick={() => setActiveView("subscription")}
          style={{
            cursor: "pointer",
            padding: "8px 16px",
            borderRadius: 8,
            border: "2px solid #0d6efd",
            backgroundColor:
              activeView === "subscription" ? "#0d6efd" : "transparent",
            color:
              activeView === "subscription" ? "#fff" : "#0d6efd",
            transition: "all 0.2s ease",
            userSelect: "none",
          }}
        >
          Staff Subscription
        </h3>
      </div>


      {activeView === "attendance" && (
        <>
          {/* 🔴 Attendance Notice */}
          <p style={{ color: "red", fontWeight: "bold" }}>
            Attendance is marked automatically when you have both a login and logout
            for that day. Please ensure you logout at the end of each working day.
          </p>

          <Button className="mb-3" onClick={exportToPDF}>
            Export to PDF
          </Button>

          <div style={{ overflowX: "auto" }}>
            <Table bordered striped hover>
              <thead>
                <tr>
                  <th>#</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Role</th>
                  <th>Registered</th>

                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dateObj = new Date(year, Number(month) - 1, i + 1);

                    const dayShort = dateObj.toLocaleDateString("en-US", {
                      weekday: "short",
                    });

                    const fullDate = `${year}-${month}-${(i + 1)
                      .toString()
                      .padStart(2, "0")}`;

                    return (
                      <th
                        key={i}
                        style={{ minWidth: 90, textAlign: "center", fontSize: 12 }}
                      >
                        <div style={{ fontWeight: "bold" }}>{dayShort}</div>
                        <div>{fullDate}</div>
                      </th>
                    );
                  })}

                </tr>
              </thead>

              <tbody>
                {staffList.map((staff, index) => (
                  <tr key={staff.id}>
                    <td>{index + 1}</td>
                    <td>{staff.firstName}</td>
                    <td>{staff.lastName}</td>
                    <td>
                      {staff.role
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, c => c.toUpperCase())}
                    </td>
                    <td>
                      {staff.createdAt?.toDate
                        ? staff.createdAt.toDate().toLocaleDateString()
                        : "--"}
                    </td>

                    {Array.from({ length: daysInMonth }).map((_, dayIndex) => {
                      const dayKey = (dayIndex + 1).toString();
                      const present = attendance[staff.id]?.[dayKey] === true;

                      return (
                        <td key={dayKey} style={{ textAlign: "center" }}>
                          <input type="radio" checked={present} readOnly />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      )}
      {activeView === "subscription" && (
        <div style={{ overflowX: "auto" }}>
          <Table bordered striped hover>
            <thead>
              <tr>
                <th>#</th>
                <th>Company Name</th>
                <th>Company ID</th>
                <th>No of Users</th>
                <th>Monthly Subscription</th>
                <th>Total Amount Due</th>
                <th>Month</th>
                <th>Payment Receipt</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {months.map((month, index) => (
                <tr key={month}>
                  <td>{index + 1}</td>
                  <td>{companyName}</td>
                  <td>{companyId}</td>
                  <td>{numberOfUsers}</td>
                  <td>₦{monthlyFee.toLocaleString()}</td>
                  <td>₦{totalDue.toLocaleString()}</td>
                  <td>{month}</td>

                  {/* Upload receipt */}
                  {/* <td>
                    <input type="file" className="form-control form-control-sm" />
                  </td> */}
                  <td>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => setShowPaymentModal(true)}
                    >
                      Pay Now
                    </Button>
                  </td>

                  {/* Status toggle */}
                  <td className="text-center">
                    <div className="form-check form-switch d-flex justify-content-center">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        disabled={role !== "app_support"}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {role !== "app_support" && (
            <p style={{ fontSize: 12, color: "#666" }}>
              * Only App Support can approve subscription payments.
            </p>
          )}
        </div>
      )}
      {showPaymentModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "500px",
              height: "650px",
              backgroundColor: "#fff",
              borderRadius: 8,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowPaymentModal(false)}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                zIndex: 10,
                border: "none",
                background: "red",
                color: "#fff",
                padding: "4px 8px",
                borderRadius: 4,
              }}
            >
              ✖
            </button>

            <iframe
              //src="https://paystack.shop/pay/ilwzb87dsa"
              src="https://paystack.shop/pay/5x75qlfimg"
              title="Paystack Payment"
              width="100%"
              height="100%"
              style={{ border: "none" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
