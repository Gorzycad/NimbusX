// src/pages/developer/DeveloperRevenue.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { Table, Spinner } from "react-bootstrap";
import { getDeveloperRevenue } from "../../firebase/nimbusXService";
import {
  getBoqMaterials,
  updateMaterialPrice
} from "../../firebase/boqService";
import {
  getAppSettings,
  updateAppSettings
} from "../../firebase/appSettingsService";
import { uploadFileToDrive } from "../../helpers/uploadFileToDrive";

export default function DeveloperRevenue() {
  const { userData } = useAuth();
  const [poRows, setPoRows] = useState([]);
  const [subscriptionRows, setSubscriptionRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderRows, setOrderRows] = useState([]);
  const role = userData?.role?.toLowerCase() || "";
  const [materials, setMaterials] = useState([]);
  const [settings, setSettings] = useState({
    monthlyFee: 26050,
    materialPriceMarkup: 12,
    vatPercent: 7.5,
    lagosBaseDeliveryFee: 10000,
    lagosPerKgFee: 500,
    outsideLagosBaseDeliveryFee: 90000,
    outsideLagosPerKgFee: 2000,
  });

  useEffect(() => {
    const load = async () => {
      const data = await getAppSettings();

      if (data) {
        setSettings(prev => ({
          ...prev,
          ...data
        }));
      }
    };

    load();
  }, []);

  /* ===============================
     LOAD DATA (DEVELOPER ONLY)
  ================================ */
  useEffect(() => {

    if (!userData || role !== "developer") return;


    const loadData = async () => {

      try {
        setLoading(true);
        const materialData = await getBoqMaterials();

        setMaterials(materialData);



        const { poData, subData, orderData } = await getDeveloperRevenue();

        setPoRows(poData);
        setSubscriptionRows(subData);
        setOrderRows(orderData); // ✅ NEW

        console.log("🔥 PO DATA:", poData);
        console.log("🔥 SUB DATA:", subData);
        console.log("🔥 ORDER DATA:", orderData);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }

    };

    loadData();
    console.log("🔥 userData:", userData);
    console.log("🔥 role:", userData?.role);
  }, [userData, role]);

  console.log("ORDER ROWS:", orderRows);
  const totalOrders = orderRows.reduce(
    (sum, r) => sum + (r.amount || 0),
    0
  );

  const updateField = (field, value) => {
    if (isNaN(value)) return;

    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveSettings = async () => {
    try {
      await updateAppSettings(settings);
      alert("Settings updated successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to update settings");
    }
  };

  const handleRateChange = async (
    id,
    material
  ) => {

    try {

      // ✅ ONLY SEND CLEAN FIELDS
      const {
        sku,
        name,
        unit,
        price,
        stock,
        unitKg
      } = material;

      await updateMaterialPrice(
        id,
        {
          name: name || "",
          unit: unit || "",
          price: Number(price || 0),
          stock: Number(stock || 0),
          unitKg: Number(unitKg || 0),
          //imageFileId: material.imageFileId || "",
          imageFileId: material.imageFileId ?? "",

        }
      );

      const productQuery = query(
        collection(db, "products"),
        where("sku", "==", sku)
      );

      const productSnap = await getDocs(productQuery);

      if (!productSnap.empty) {
        const productDoc = productSnap.docs[0];

        await updateDoc(
          doc(db, "products", productDoc.id),
          {
            imageFileId: material.imageFileId || "",
            name,
            unit,
            price,
            stock,
            unitKg,
          }
        );
      }

      alert("Material updated");

    } catch (err) {

      console.error(err);

    }

  };

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

  if (role !== "developer") {
    return (
      <div className="container py-4">
        <h4 className="text-danger">Access denied</h4>
      </div>
    );
  }

  const totalProfit = poRows.reduce((sum, r) => sum + (r.amountPaid || 0), 0);
  const totalSubscription = subscriptionRows.reduce(
    (sum, r) => sum + (r.amount || 0),
    0
  );

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
            <th>Payment Date</th>
          </tr>
        </thead>
        <tbody>
          {poRows.map((row, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{row.companyId}</td>
              <td>{row.companyName}</td>
              <td>{row.poId}</td>
              <td>{(row.amountPaid || 0).toLocaleString()}</td>
              <td>
                {row.paidAt?.toDate
                  ? row.paidAt.toDate().toLocaleDateString()
                  : "--"}
              </td>
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
                  : row.createdAt
                    ? new Date(row.createdAt).toLocaleDateString()
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

      <h5 className="mt-5">Orders Revenue</h5>
      <Table bordered striped hover>
        <thead className="table-light">
          <tr>
            <th>#</th>
            <th>Company ID</th>
            <th>Company Name</th>
            <th>Order ID</th>
            <th>Order Date</th>
            <th>Revenue (₦)</th>
          </tr>
        </thead>

        <tbody>
          {orderRows.map((row, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{row.companyId}</td>
              <td>{row.companyName}</td>
              <td>{row.orderId}</td>

              <td>
                {row.createdAt?.toDate
                  ? row.createdAt.toDate().toLocaleDateString()
                  : row.createdAt
                    ? new Date(row.createdAt).toLocaleDateString()
                    : "--"}
              </td>

              <td>{(row.amount || 0).toLocaleString()}</td>
            </tr>
          ))}

          <tr className="fw-bold">
            <td colSpan={5} className="text-end">TOTAL</td>
            <td>₦{totalOrders.toLocaleString()}</td>
          </tr>
        </tbody>
      </Table>

      <h5 className="mt-5">
        Material Price Management
      </h5>

      {/* <Table bordered striped hover> */}
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th style={{ width: "120px" }}>Discipline</th>
              <th style={{ minWidth: "250px" }}>Name</th>
              <th style={{ width: "120px" }}>Unit</th>
              <th style={{ width: "180px" }}>Unit Kg</th>
              <th style={{ width: "180px" }}>Price</th>
              <th style={{ width: "180px" }}>Stock</th>
              <th style={{ width: "200px" }}>Image File ID</th>
              <th>Save</th>
            </tr>
          </thead>

          <tbody>

            {materials.map((m, i) => (

              <tr key={m.id}>

                <td>{i + 1}</td>

                <td style={{ width: "120px" }}>
                  {m.discipline}
                </td>

                {/* NAME */}
                <td style={{ minWidth: "250px" }}>
                  <input
                    className="form-control"
                    value={m.name || ""}
                    onChange={(e) =>
                      setMaterials(prev =>
                        prev.map(x =>
                          x.id === m.id
                            ? { ...x, name: e.target.value }
                            : x
                        )
                      )
                    }
                  />
                </td>

                {/* UNIT */}
                <td style={{ width: "120px" }}>
                  <input
                    className="form-control"
                    value={m.unit || ""}
                    onChange={(e) =>
                      setMaterials(prev =>
                        prev.map(x =>
                          x.id === m.id
                            ? { ...x, unit: e.target.value }
                            : x
                        )
                      )
                    }
                  />
                </td>

                {/* UNIT KG */}
                <td style={{ width: "180px" }}>
                  <input
                    type="number"
                    className="form-control"
                    value={m.unitKg || 0}
                    onChange={(e) =>
                      setMaterials(prev =>
                        prev.map(x =>
                          x.id === m.id
                            ? {
                              ...x,
                              unitKg: Number(e.target.value)
                            }
                            : x
                        )
                      )
                    }
                  />
                </td>

                {/* RATE */}
                <td style={{ width: "180px" }}>
                  <input
                    type="number"
                    className="form-control"
                    value={m.price || 0}
                    onChange={(e) =>
                      setMaterials(prev =>
                        prev.map(x =>
                          x.id === m.id
                            ? {
                              ...x,
                              price: Number(e.target.value)
                            }
                            : x
                        )
                      )
                    }
                  />
                </td>

                {/* STOCK */}
                <td style={{ width: "180px" }}>
                  <input
                    type="number"
                    className="form-control"
                    value={m.stock || 0}
                    onChange={(e) =>
                      setMaterials(prev =>
                        prev.map(x =>
                          x.id === m.id
                            ? {
                              ...x,
                              stock: Number(e.target.value)
                            }
                            : x
                        )
                      )
                    }
                  />
                </td>

                {/* IMAGE UPLOAD + PREVIEW */}
                <td style={{ width: 200 }}>

                  {/* Preview */}
                  {/* {m.imageFileId && (
                  <img
                    src={`https://drive.google.com/uc?id=${m.imageFileId}`}
                    alt="material"
                    style={{
                      width: 50,
                      height: 50,
                      objectFit: "cover",
                      borderRadius: 6,
                      marginBottom: 6
                    }}
                  />
                )} */}
                  {m.imageFileId && (
                    <img
                      //src={`https://drive.google.com/thumbnail?id=${m.imageFileId}&sz=w300`}
                      src={`https://lh3.googleusercontent.com/d/${m.imageFileId}=w300`}
                      alt="material"
                      style={{
                        width: 50,
                        height: 50,
                        objectFit: "cover",
                        borderRadius: 6,
                        marginBottom: 6
                      }}
                      onError={(e) => {
                        console.log("Failed image:", m.imageFileId);
                        e.target.style.display = "none";
                      }}
                    />
                  )}

                  {/* Upload Button */}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "block", fontSize: 12 }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      try {
                        const result = await uploadFileToDrive(file);

                        console.log("UPLOAD RESULT:", result);

                        if (!result?.fileId) {
                          alert("Upload failed: no fileId returned");
                          return;
                        }

                        // instantly update UI state
                        setMaterials(prev =>
                          prev.map(x =>
                            x.id === m.id
                              ? { ...x, imageFileId: result.fileId }
                              : x
                          )
                        );

                        console.log("Saving imageFileId:", result.fileId);

                        await updateMaterialPrice(m.id, {
                          ...m,
                          imageFileId: result.fileId,
                        });

                      } catch (err) {
                        console.error(err);
                        alert("Image upload failed");
                      }
                    }}
                  />
                </td>

                {/* SAVE */}
                <td>
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() =>
                      handleRateChange(
                        m.id,
                        m
                      )
                    }
                  >
                    Save
                  </button>
                </td>

              </tr>

            ))}

          </tbody>
        </table>
      </div>

      <div className="card p-3 mt-4">

        <h4>System Pricing & Subscription Settings</h4>

        {/* SUBSCRIPTION */}
        <h6 className="mt-3">Subscription</h6>

        <input
          type="number"
          className="form-control mb-2"
          value={settings.monthlyFee}
          onChange={(e) =>
            updateField("monthlyFee", Number(e.target.value))
          }
          placeholder="Monthly Fee"
        />

        {/* MATERIALS */}
        <h6 className="mt-3">Materials</h6>

        <input
          type="number"
          className="form-control mb-2"
          value={settings.materialPriceMarkup}
          onChange={(e) =>
            updateField("materialPriceMarkup", Number(e.target.value))
          }
          placeholder="Material Markup %"
        />

        {/* TAX */}
        <h6 className="mt-3">Tax</h6>

        <input
          type="number"
          className="form-control mb-2"
          value={settings.vatPercent}
          onChange={(e) =>
            updateField("vatPercent", Number(e.target.value))
          }
          placeholder="VAT %"
        />

        {/* DELIVERY */}
        <h6 className="mt-3">Delivery (Lagos)</h6>

        <input
          type="number"
          className="form-control mb-2"
          value={settings.lagosBaseDeliveryFee}
          onChange={(e) =>
            updateField("lagosBaseDeliveryFee", Number(e.target.value))
          }
          placeholder="Base Fee"
        />

        <input
          type="number"
          className="form-control mb-2"
          value={settings.lagosPerKgFee}
          onChange={(e) =>
            updateField("lagosPerKgFee", Number(e.target.value))
          }
          placeholder="Per Kg Fee"
        />

        <h6 className="mt-3">Delivery (Outside Lagos)</h6>

        <input
          type="number"
          className="form-control mb-2"
          value={settings.outsideLagosBaseDeliveryFee}
          onChange={(e) =>
            updateField("outsideLagosBaseDeliveryFee", Number(e.target.value))
          }
          placeholder="Base Fee"
        />

        <input
          type="number"
          className="form-control mb-2"
          value={settings.outsideLagosPerKgFee}
          onChange={(e) =>
            updateField("outsideLagosPerKgFee", Number(e.target.value))
          }
          placeholder="Per Kg Fee"
        />

        <button
          className="btn btn-primary mt-3"
          onClick={saveSettings}
        >
          Save All Settings
        </button>

      </div>
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