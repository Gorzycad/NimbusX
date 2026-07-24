//src/pages/staff/Staff.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../firebase/firebase";

import { Table, Button } from "react-bootstrap";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "bootstrap/dist/css/bootstrap.min.css";
import { deleteStaff } from "../../firebase/staffService";
import {
  updateDoc,
  setDoc,
  addDoc,
  serverTimestamp
} from "firebase/firestore";

import { ALL_PAGES, ROLE_ACCESS } from "../../config/roleAccess";
import {
  getAppSettings
} from "../../firebase/appSettingsService";
import UploadPage from "../leads/LeadsFileUpload";

function StaffManager({ staffList, setStaffList, companyId }) {
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [editingNames, setEditingNames] = useState({});
  const [approvingUsers, setApprovingUsers] = useState({});
  const { userData } = useAuth();
  const [, setError] = useState("");
 
  const canApprove =
    userData?.role === "company_admin" &&
    userData?.approved === true;

  const togglePermission = async (page) => {

    if (!selectedStaff) return;

    try {

      const currentPermissions =
        selectedStaff.customPermissions || {};

      const updatedPermissions = {
        ...currentPermissions,
        [page]: !(
          currentPermissions[page] ??
          ROLE_ACCESS[selectedStaff.role]?.includes(page)
        )
      };

      // company user
      await updateDoc(
        doc(db, "companies", companyId, "users", selectedStaff.id),
        {
          customPermissions: updatedPermissions
        }
      );

      // global user
      await updateDoc(
        doc(db, "users", selectedStaff.id),
        {
          customPermissions: updatedPermissions
        }
      );

      const updatedStaff = {
        ...selectedStaff,
        customPermissions: updatedPermissions
      };

      setSelectedStaff(updatedStaff);

      setStaffList(prev =>
        prev.map(s =>
          s.id === selectedStaff.id
            ? updatedStaff
            : s
        )
      );

    } catch (err) {
      console.error(err);
      setError("Failed to update permissions");
    }
  };

  const handleDelete = async (staffId) => {
    const confirmed = window.confirm("Are you sure you want to delete this staff?");
    if (!confirmed) return;

    try {
      await deleteStaff(companyId, staffId);
      setStaffList(prev => prev.filter(s => s.id !== staffId));
      setError("Staff deleted successfully!");
    } catch (err) {
      console.error("Error deleting staff:", err);
      setError("Failed to delete staff. Try again.");
    }
  };

  const toggleStatus = async (staff) => {
    try {
      const ref = doc(db, "companies", companyId, "users", staff.id);

      const newStatus = !(staff.active !== false);

      await updateDoc(ref, {
        active: newStatus
      });

      setStaffList(prev =>
        prev.map(s =>
          s.id === staff.id ? { ...s, active: newStatus } : s
        )
      );

    } catch (err) {
      console.error("Status update error:", err);
    }
  };
  const saveName = async (staffId) => {
    try {
      const edited = editingNames[staffId];

      if (!edited) return;

      const firstName = edited.firstName || "";
      const lastName = edited.lastName || "";

      // Update company user
      await updateDoc(
        doc(db, "companies", companyId, "users", staffId),
        {
          firstName,
          lastName,
        }
      );

      // Update global user
      await updateDoc(
        doc(db, "users", staffId),
        {
          firstName,
          lastName,
        }
      );


      // Update local UI state
      setStaffList(prev =>
        prev.map(s =>
          s.id === staffId
            ? {
              ...s,
              firstName,
              lastName,
            }
            : s
        )
      );

      setError("Name updated successfully");

    } catch (err) {
      console.error("Name update error:", err);
      setError("Failed to update name");
    }
  };

  const approveUser = async (staff) => {
    try {
      if (!canApprove) {
        setError("You are not authorized to approve users.");
        return;
      }
      // Prevent duplicate clicks
      if (approvingUsers[staff.id]) return;

      setApprovingUsers(prev => ({
        ...prev,
        [staff.id]: true,
      }));

      await updateDoc(
        doc(
          db,
          "companies",
          companyId,
          "users",
          staff.id
        ),
        {
          approved: true,
          accessEnabled: true,
          approvedAt: serverTimestamp(),
          approvedBy: auth.currentUser.uid,
        }
      );

      await updateDoc(
        doc(
          db,
          "users",
          staff.id
        ),
        {
          approved: true,
          accessEnabled: true,
          approvedAt: serverTimestamp(),
          approvedBy: auth.currentUser.uid,
        }
      );

      setStaffList(prev =>
        prev.map(s =>
          s.id === staff.id
            ? {
              ...s,
              approved: true
            }
            : s
        )
      );

      setError("User approved");

    } catch (err) {
      console.error(err);
      setError("Approval failed");
    } finally {
      setApprovingUsers(prev => ({
        ...prev,
        [staff.id]: false,
      }));
    }
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <Table bordered striped hover>
        <thead>
          <tr>
            <th>#</th>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Approval</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {staffList.map((staff, index) => (
            <tr key={staff.id}>
              <td>{index + 1}</td>
              <td>
                <input
                  value={
                    editingNames[staff.id]?.firstName ??
                    staff.firstName ??
                    ""
                  }
                  onChange={(e) =>
                    setEditingNames(prev => ({
                      ...prev,
                      [staff.id]: {
                        ...prev[staff.id],
                        firstName: e.target.value,
                        lastName:
                          prev[staff.id]?.lastName ??
                          staff.lastName ??
                          "",
                      },
                    }))
                  }
                />
              </td>

              <td>
                <input
                  value={
                    editingNames[staff.id]?.lastName ??
                    staff.lastName ??
                    ""
                  }
                  onChange={(e) =>
                    setEditingNames(prev => ({
                      ...prev,
                      [staff.id]: {
                        ...prev[staff.id],
                        lastName: e.target.value,
                        firstName:
                          prev[staff.id]?.firstName ??
                          staff.firstName ??
                          "",
                      },
                    }))
                  }
                />
              </td>
              <td>{staff.role}</td>
              <td>
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={staff.active !== false}
                    onChange={() => toggleStatus(staff)}
                  />
                  <label style={{ marginLeft: 8 }}>
                    {staff.active !== false ? "Active" : "Inactive"}
                  </label>
                </div>
              </td>
              <td>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {staff.approved ? (
                    <span className="text-success">
                      Approved
                    </span>
                  ) : (
                    <span className="text-danger">
                      Pending
                    </span>
                  )}

                  {canApprove && !staff.approved && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={approvingUsers[staff.id]}
                      onClick={() => approveUser(staff)}
                    >
                      {approvingUsers[staff.id]
                        ? "Approving..."
                        : "Approve"}
                    </Button>
                  )}
                </div>
              </td>
              <td style={{ display: "flex", gap: 8 }}>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => saveName(staff.id)}
                >
                  Save
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(staff.id)}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* 🔥 PERMISSIONS SECTION */}

      <div
        style={{
          marginTop: 30,
          padding: 20,
          border: "1px solid #ddd",
          borderRadius: 10,
          background: "#fafafa"
        }}
      >

        <h4>Staff Permissions</h4>

        <select
          className="form-control"
          style={{ maxWidth: 400 }}
          value={selectedStaff?.id || ""}
          onChange={(e) => {

            const found = staffList.find(
              s => s.id === e.target.value
            );

            setSelectedStaff(found || null);
          }}
        >
          <option value="">Select Staff</option>

          {staffList.map(staff => (
            <option key={staff.id} value={staff.id}>
              {staff.firstName} {staff.lastName}
            </option>
          ))}
        </select>

        {selectedStaff && (
          <div style={{ marginTop: 20 }}>

            <h5>
              Permissions for:
              {" "}
              {selectedStaff.firstName}
              {" "}
              {selectedStaff.lastName}
            </h5>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
                gap: 10,
                marginTop: 15
              }}
            >

              {ALL_PAGES
                .filter(page => page !== "nimbusx")
                .map(page => {

                  const checked =
                    selectedStaff.customPermissions?.[page] ??
                    ROLE_ACCESS[selectedStaff.role]?.includes(page);

                  return (
                    <label
                      key={page}
                      style={{
                        border: "1px solid #ddd",
                        padding: 10,
                        borderRadius: 8,
                        background: "#fff"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePermission(page)}
                        style={{ marginRight: 8 }}
                      />

                      {page}
                    </label>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Staff() {
  const { companyId, user, role } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [daysInMonth, setDaysInMonth] = useState(31);
  const [activeView, setActiveView] = useState("attendance");
  const [loading, setLoading] = useState(true);
  const [monthlyFee, setMonthlyFee] = useState(26050);
  const [, setError] = useState("");
  
  // "attendance" | "subscription"
  const [companyName, setCompanyName] = useState("");
  const [logoFile, setLogoFile] = useState([]);
  useEffect(() => {

    const loadSettings = async () => {

      const settings =
        await getAppSettings();

      setMonthlyFee(
        Number(settings.monthlyFee || 26050)
      );

    };

    loadSettings();

  }, []);


  const handleLogoUpload = async () => {
    if (!logoFile.length) {
      setError("Please upload a logo first");
      return;
    }

    const logo = logoFile[0];

    if (!logo?.fileId) {
      setError("Invalid file. Please upload again.");
      return;
    }

    try {
      console.log("Saving logo:", logo);
      await setDoc(
        doc(db, "companies", companyId),
        {
          companyLogo: {
            fileId: logo.fileId,
            name: logo.name || "",
          },
        },
        { merge: true }
      );

      setError("Logo saved successfully!");
    } catch (err) {
      console.error("Logo save error:", err);
      setError("Failed to save logo");
    }
  };

  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const monthLabel = `${year}-${month}`;

  const payWithPaystack = (config, onSuccess) => {
    if (!window.PaystackPop) {
      setError("Paystack not loaded");
      return;
    }



    const handler = window.PaystackPop.setup({
      key: config.key,
      email: config.email,
      amount: config.amount,
      ref: config.reference,

      metadata: {
        custom_fields: [
          {
            display_name: "Payment Type",
            variable_name: "payment_type",
            value: config.type || "general",
          },
        ],
      },

      callback: function (response) {
        onSuccess(response);
      },

      onClose: function () {
        console.log("❌ Payment closed");
      },
    });

    handler.openIframe();
  };

  /* ---------------- LOAD STAFF ---------------- */
  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    const loadStaff = async () => {
      const staffSnap = await getDocs(
        collection(db, "companies", companyId, "users")
      );

      const list = staffSnap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      }));

      setStaffList(list);
      setLoading(false);
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

    const days = new Date(year, Number(month), 0).getDate();
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
  }, [companyId, staffList, year, month]);




  const handleSubscriptionPayment = () => {

    payWithPaystack(
      {
        reference: "SUB_" + Date.now(),
        email: user?.email,
        amount: Math.ceil(outstanding) * 100,
        key: "pk_live_6a2efdfc277c468b57e70f6462c7c330181d1d6c",
        //key: "pk_test_e0ccd9771cc0086a1290ff5fd46ee1431bb64e4a",
        type: "subscription",
      },
      async (response) => {
        console.log("✅ Checkout success:", response);
        await addDoc(
          collection(db, "companies", companyId, "subscriptions"),
          {
            // 🔥 SAVE ACTUAL PAID AMOUNT
            subscriptionAmount: Math.ceil(outstanding),
            createdAt: serverTimestamp(),
            paymentRef: response.reference,
            month: month,
            year: year,
            companyName: companyName,
          }
        );

        const batchUpdates = pendingUsers.flatMap((user) => [
          setDoc(
            doc(db, "companies", companyId, "users", user.id),
            {
              billingStatus: "paid",
              subscriptionPhase: "active",
              accessEnabled: true,
              lastBillingReset: serverTimestamp(),
            },
            { merge: true }
          ),

          setDoc(
            doc(db, "users", user.id),
            {
              billingStatus: "paid",
              subscriptionPhase: "active",
              accessEnabled: true,
              lastBillingReset: serverTimestamp(),
            },
            { merge: true }
          )
        ]);

        await Promise.all(batchUpdates);
        setError("Subscription payment successful!");
      }
    );
  };

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



  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

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

  
  // 🔥 BILLING CALCULATIONS
  const today = new Date();
  const totalDaysInMonth = new Date(year, today.getMonth() + 1, 0).getDate();

  // Filter ONLY active employees
  const activeStaff = staffList.filter(
    (s) =>
      s.employmentStatus !== "resigned" &&
      s.approved === true
  );

  // Split by billing status
  const paidUsers = activeStaff.filter((s) => s.billingStatus === "paid");
  const pendingUsers = activeStaff.filter((s) => s.billingStatus === "pending");

  // 🔢 COUNTS
  const activeUsersCount = paidUsers.length;
  const pendingUsersCount = pendingUsers.length;

  // 💰 TOTAL PAID (FULL USERS ONLY)
  const totalPaid = activeUsersCount * monthlyFee;

  // 💰 OUTSTANDING (PRORATED)
  const outstanding = pendingUsers.reduce((sum, user) => {
    if (!user.joinedAt?.toDate) return sum;

    const joinedDate = user.joinedAt.toDate();
    const joinedDay = joinedDate.getDate();

    const remainingDays = totalDaysInMonth - joinedDay + 1;

    const proratedAmount =
      (remainingDays / totalDaysInMonth) * monthlyFee;

    return sum + proratedAmount;
  }, 0);

  return (
    <div style={{ padding: 20 }}>
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

        <h3
          onClick={() => setActiveView("staffManager")}
          style={{
            cursor: "pointer",
            padding: "8px 16px",
            borderRadius: 8,
            border: "2px solid #0d6efd",
            backgroundColor:
              activeView === "staffManager" ? "#0d6efd" : "transparent",
            color: activeView === "staffManager" ? "#fff" : "#0d6efd",
            transition: "all 0.2s ease",
            userSelect: "none",
          }}
        >
          Staff Manager
        </h3>
      </div>


      {activeView === "attendance" && (
        <>
          {/* 🔴 Attendance Notice */}
          <p style={{ color: "red", fontWeight: "bold" }}>
            Attendance is marked automatically by the system. Ensure you login on working days to maintain a good record.
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
                {staffList.filter(s => s.active !== false).map((staff, index) => (
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
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 20,
              background: "#fafafa",
              maxWidth: 600,
            }}
          >
            <h3 style={{ marginBottom: 20 }}>Current Plan Overview</h3>
            <p>
              <span style={{ color: "red", fontWeight: "bold" }}>
                Transaction charges may be added to payment sum.
              </span>
            </p>
            <p><strong>Plan:</strong> Per User Monthly</p>
            <p><strong>Price:</strong> ₦{monthlyFee.toLocaleString()} / user</p>
            <p>
              <strong>Billing Cycle:</strong>{" "}
              {months[today.getMonth()]} 1 – {months[today.getMonth()]} {totalDaysInMonth}
            </p>

            <hr />

            <p><strong>Active Users:</strong> {activeUsersCount}</p>
            <p><strong>Pending Users:</strong> {pendingUsersCount}</p>

            <p>
              <strong>Total Paid:</strong> ₦{totalPaid.toLocaleString()}
            </p>

            <p style={{ color: "red" }}>
              <strong>Outstanding:</strong> ₦{Math.ceil(outstanding).toLocaleString()}
            </p>

            {/* 🔥 PAY BUTTON */}
            {pendingUsersCount > 0 && (
              <Button
                variant="danger"
                style={{ marginTop: 20 }}
                onClick={handleSubscriptionPayment}
              >
                Activate {pendingUsersCount} Users – Pay ₦
                {Math.ceil(outstanding).toLocaleString()}
              </Button>
            )}
          </div>

          {role !== "app_support" && (
            <p style={{ fontSize: 12, color: "#666" }}>
              * Only App Support can approve subscription payments.
            </p>
          )}
        </div>
      )}

      {activeView === "staffManager" && role === "company_admin" ? (
        <>
          {/* 🔥 COMPANY LOGO UPLOAD */}
          <div style={{
            border: "1px solid #ddd",
            padding: 16,
            borderRadius: 8,
            marginBottom: 20,
            background: "#fafafa"
          }}>
            <h4>Company Logo</h4>

            <UploadPage
              uploadedFiles={logoFile}
              onFilesChange={(files) => {
                const single = files.slice(-1); // enforce single logo
                setLogoFile(single);
              }}
            />

            <Button className="mt-2" onClick={handleLogoUpload}>
              Save Logo
            </Button>
          </div>

          {/* 🔥 STAFF LIST */}
          <StaffManager
            staffList={staffList}
            setStaffList={setStaffList}
            companyId={companyId}
          />
        </>
      ) : activeView === "staffManager" ? (
        <p style={{ color: "red" }}>
          Only Company Admin can access Staff Manager.
        </p>
      ) : null}


    </div>
  );
}

