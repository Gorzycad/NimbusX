// src/pages/developer/DeveloperRevenue.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { Table, Spinner } from "react-bootstrap";

export default function DeveloperRevenue() {
  const { userData } = useAuth();

  const [poRows, setPoRows] = useState([]);
  const [subscriptionRows, setSubscriptionRows] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ===============================
     LOAD DATA (DEVELOPER ONLY)
  ================================ */
  useEffect(() => {
    if (!userData || userData.role !== "developer") return;

    const loadData = async () => {
      setLoading(true);

      const companiesSnap = await getDocs(collection(db, "companies"));

      const poData = [];
      const subData = [];

      for (const company of companiesSnap.docs) {
        const companyId = company.id;
        const companyName = company.data().companyName || "--";

        // Paid POs only
        const poSnap = await getDocs(
          query(
            collection(db, "companies", companyId, "purchaseOrders"),
            where("paymentReceived", "==", true)
          )
        );

        poSnap.forEach((po) => {
          poData.push({
            companyId,
            companyName,
            poId: po.id,
            profit: Number(po.data().profitAccrued || 0),
          });
        });

        // Subscriptions
        const subSnap = await getDocs(
          collection(db, "companies", companyId, "subscriptions")
        );

        subSnap.forEach((sub) => {
          subData.push({
            companyId,
            companyName,
            createdAt: sub.data().createdAt,
            amount: Number(sub.data().subscriptionAmount || 0),
          });
        });
      }

      setPoRows(poData);
      setSubscriptionRows(subData);
      setLoading(false);
    };

    loadData();
  }, [userData]);

  /* ===============================
     RENDER GUARDS (CORRECT)
  ================================ */
  if (!userData) {
    return (
      <div className="container py-4 text-center">
        <Spinner animation="border" />
      </div>
    );
  }

  if (userData.role !== "developer") {
    return (
      <div className="container py-4">
        <h4 className="text-danger">Access denied</h4>
      </div>
    );
  }

  const totalProfit = poRows.reduce((sum, r) => sum + r.profit, 0);
  const totalSubscription = subscriptionRows.reduce(
    (sum, r) => sum + r.amount,
    0
  );

  return (
    <div className="container py-4">
      <h2 className="mb-4">Developer Revenue Dashboard</h2>

      {/* TABLE 1 — PO PROFIT */}
      <h5>Marketplace Profit</h5>
      <Table bordered striped hover>
        <thead className="table-light">
          <tr>
            <th>#</th>
            <th>Company ID</th>
            <th>Company Name</th>
            <th>PO ID</th>
            <th>Profit Accrued (₦)</th>
          </tr>
        </thead>
        <tbody>
          {poRows.map((row, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{row.companyId}</td>
              <td>{row.companyName}</td>
              <td>{row.poId}</td>
              <td>{row.profit.toLocaleString()}</td>
            </tr>
          ))}
          <tr className="fw-bold">
            <td colSpan={4} className="text-end">TOTAL</td>
            <td>₦{totalProfit.toLocaleString()}</td>
          </tr>
        </tbody>
      </Table>

      {/* TABLE 2 — SUBSCRIPTIONS */}
      <h5 className="mt-5">Subscription Revenue</h5>
      <Table bordered striped hover>
        <thead className="table-light">
          <tr>
            <th>#</th>
            <th>Company ID</th>
            <th>Company Name</th>
            <th>Creation Date</th>
            <th>Subscription Accrued (₦)</th>
          </tr>
        </thead>
        <tbody>
          {subscriptionRows.map((row, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{row.companyId}</td>
              <td>{row.companyName}</td>
              <td>
                {row.createdAt?.toDate
                  ? row.createdAt.toDate().toLocaleDateString()
                  : "--"}
              </td>
              <td>{row.amount.toLocaleString()}</td>
            </tr>
          ))}
          <tr className="fw-bold">
            <td colSpan={4} className="text-end">TOTAL</td>
            <td>₦{totalSubscription.toLocaleString()}</td>
          </tr>
        </tbody>
      </Table>
    </div>
  );
}

// // src/pages/nimbusx/NimbusX.jsx
// import React from "react";
// import { Container, Card } from "react-bootstrap";
// import { useAuth } from "../../contexts/AuthContext";
// import "bootstrap/dist/css/bootstrap.min.css";

// export default function NimbusX() {
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
//             NimbusX Module
//           </Card.Title>

//           <Card.Text style={{ fontSize: 16, color: "#555" }}>
//             🚧 This page is currently under development.
//           </Card.Text>

//           <Card.Text style={{ fontSize: 15, color: "#777" }}>
//             NimbusX features will be available soon.
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