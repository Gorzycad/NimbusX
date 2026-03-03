// src/pages/inventory/InventoryPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  saveInventoryTable,
  getInventoryTable,
} from "../../firebase/inventoryService";
import { useAuth } from "../../contexts/AuthContext";

const createRows = (count, fields) =>
  Array.from({ length: count }, () =>
    fields.reduce((acc, f) => ({ ...acc, [f]: "" }), {})
  );




export default function InventoryPage() {
  const { companyId } = useAuth();

  /* -----------------------------
     STATE
  ----------------------------- */
  const [inventoryRows, setInventoryRows] = useState(
    createRows(136, [
      "productId",
      "product",
      "unit",
      "qty",
      "price",
      "total",
      "reorder",
      "eta",
    ])
  );

  const [vendorRows, setVendorRows] = useState(
    createRows(136, [
      "productId",
      "product",
      "unit",
      "orderTime",
      "contactName",
      "contactPhone",
    ])
  );

  const [orderRows, setOrderRows] = useState(
    createRows(136, [
      "productId",
      "product",
      "unit",
      "quantity",
      "totalCost",
      "contactName",
      "contactPhone",
    ])
  );

  useEffect(() => {
    if (!companyId) return;

    const loadData = async () => {
      const inv = await getInventoryTable(companyId, "inventory");
      const vendors = await getInventoryTable(companyId, "vendors");
      const orders = await getInventoryTable(companyId, "orders");

      if (inv.length) setInventoryRows(inv);
      if (vendors.length) setVendorRows(vendors);
      if (orders.length) setOrderRows(orders);
    };

    loadData();
  }, [companyId]);


  /* -----------------------------
     AUTO CALCULATIONS
  ----------------------------- */

  // Auto-calc total value per inventory row
  useEffect(() => {
    setInventoryRows(prev =>
      prev.map(row => ({
        ...row,
        total:
          row.qty && row.price
            ? (Number(row.qty) * Number(row.price)).toFixed(2)
            : "",
      }))
    );
  }, []);

  // Inventory Value
  const inventoryValue = useMemo(() => {
    return inventoryRows
      .reduce((sum, r) => sum + Number(r.total || 0), 0)
      .toFixed(2);
  }, [inventoryRows]);

  // Unique products
  const uniqueProducts = useMemo(() => {
    const set = new Set(
      inventoryRows.map(r => r.product).filter(Boolean)
    );
    return set.size;
  }, [inventoryRows]);

  const currentDate = new Date().toLocaleDateString();
  const currentDay = new Date().toLocaleDateString(undefined, {
    weekday: "long",
  });

  /* -----------------------------
     SYNC VENDOR → INVENTORY
  ----------------------------- */
  useEffect(() => {
    setInventoryRows(prev =>
      prev.map(row => {
        const match = vendorRows.find(
          v => v.productId && v.productId === row.productId
        );
        return match
          ? { ...row, product: match.product, unit: match.unit }
          : row;
      })
    );
  }, [vendorRows]);

  /* -----------------------------
     SYNC INVENTORY + VENDOR → ORDER
  ----------------------------- */
  useEffect(() => {
    setOrderRows(prev =>
      prev.map(row => {
        const inv = inventoryRows.find(
          i => i.productId === row.productId
        );
        const vendor = vendorRows.find(
          v => v.productId === row.productId
        );

        return inv && vendor
          ? {
            ...row,
            product: inv.product,
            unit: inv.unit,
            contactName: vendor.contactName,
            contactPhone: vendor.contactPhone,
            totalCost:
              row.quantity && inv.price
                ? (Number(row.quantity) * Number(inv.price)).toFixed(2)
                : "",
          }
          : row;
      })
    );
  }, [inventoryRows, vendorRows]);

  /* -----------------------------
     HELPERS
  ----------------------------- */
  const addRow = (setter, fields) =>
    setter(prev => [...prev, fields.reduce((a, f) => ({ ...a, [f]: "" }), {})]);

  const removeRow = (setter) =>
    setter(prev => prev.slice(0, -1));

  const handleChange = (rows, setRows, index, field, value) => {
    const copy = [...rows];
    copy[index][field] = value;
    setRows(copy);
  };

  /* -----------------------------
     EXPORT PDF (Order Summary only)
  ----------------------------- */
  const exportPDF = () => {
    window.print();
  };

  const handleSaveAll = async () => {
    if (!companyId) return;

    try {
      await saveInventoryTable(companyId, "inventory", inventoryRows);
      await saveInventoryTable(companyId, "vendors", vendorRows);
      await saveInventoryTable(companyId, "orders", orderRows);

      alert("Inventory data saved successfully.");
    } catch (error) {
      console.error("Save failed:", error);
      alert("Error saving inventory.");
    }
  };

  /* -----------------------------
     JSX
  ----------------------------- */
  return (
    <div className="container py-4">
      <h2 className="mb-4">Inventory Management</h2>

      <div className="accordion" id="inventoryAccordion">

        {/* =========================
           INVENTORY TAB
        ========================== */}
        <div className="accordion-item">
          <h2 className="accordion-header">
            <button
              className="accordion-button"
              data-bs-toggle="collapse"
              data-bs-target="#inventorySection"
            >
              Inventory
            </button>
          </h2>
          <div id="inventorySection" className="accordion-collapse collapse show">
            <div className="accordion-body">

              {/* Summary Headers */}
              <div className="row mb-4">
                <div className="col-md-3">
                  <label>Inventory Value</label>
                  <input className="form-control" value={inventoryValue} disabled />
                </div>
                <div className="col-md-3">
                  <label>Unique Products</label>
                  <input className="form-control" value={uniqueProducts} disabled />
                </div>
                <div className="col-md-3">
                  <label>Current Date</label>
                  <input className="form-control" value={currentDate} disabled />
                </div>
                <div className="col-md-3">
                  <label>Day of Week</label>
                  <input className="form-control" value={currentDay} disabled />
                </div>
              </div>

              {/* Table */}
              <div className="table-responsive">
                <table className="table table-bordered table-sm">
                  <thead className="table-light">
                    <tr>
                      <th>Product ID</th>
                      <th>Product</th>
                      <th>Unit</th>
                      <th>Qty in Stock</th>
                      <th>Price per unit</th>
                      <th>Total Value</th>
                      <th>Reorder Threshold</th>
                      <th>ETA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryRows.map((row, i) => (
                      <tr key={i}>
                        {Object.keys(row).map((field, idx) => (
                          <td key={idx}>
                            <input
                              className="form-control form-control-sm"
                              value={row[field]}
                              disabled={field === "total"}
                              onChange={e =>
                                handleChange(
                                  inventoryRows,
                                  setInventoryRows,
                                  i,
                                  field,
                                  e.target.value
                                )
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                className="btn btn-outline-primary me-2"
                onClick={() =>
                  addRow(setInventoryRows, [
                    "productId", "product", "unit", "qty", "price", "total", "reorder", "eta"
                  ])
                }
              >
                Add Row
              </button>
              <button
                className="btn btn-outline-danger"
                onClick={() => removeRow(setInventoryRows)}
              >
                Remove Row
              </button>
              <button
                className="btn btn-primary my-3"
                onClick={handleSaveAll}
              >
                Save All Inventory Data
              </button>


            </div>
          </div>
        </div>

        {/* =========================
           VENDOR INFO TAB
        ========================== */}
        <div className="accordion-item">
          <h2 className="accordion-header">
            <button
              className="accordion-button collapsed"
              data-bs-toggle="collapse"
              data-bs-target="#vendorSection"
            >
              Vendor Info
            </button>
          </h2>
          <div id="vendorSection" className="accordion-collapse collapse">
            <div className="accordion-body">

              <div className="table-responsive">
                <table className="table table-bordered table-sm">
                  <thead className="table-light">
                    <tr>
                      <th>Product ID</th>
                      <th>Product</th>
                      <th>Unit</th>
                      <th>Typical Order time (days)</th>
                      <th>Contact name</th>
                      <th>Contact Phone number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorRows.map((row, i) => (
                      <tr key={i}>
                        {Object.keys(row).map((field, idx) => (
                          <td key={idx}>
                            <input
                              className="form-control form-control-sm"
                              value={row[field]}
                              onChange={e =>
                                handleChange(
                                  vendorRows,
                                  setVendorRows,
                                  i,
                                  field,
                                  e.target.value
                                )
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                className="btn btn-outline-primary me-2"
                onClick={() =>
                  addRow(setVendorRows, [
                    "productId", "product", "unit", "orderTime", "contactName", "contactPhone"
                  ])
                }
              >
                Add Row
              </button>
              <button
                className="btn btn-outline-danger"
                onClick={() => removeRow(setVendorRows)}
              >
                Remove Row
              </button>

            </div>
          </div>
        </div>

        {/* =========================
           ORDER SUMMARY TAB
        ========================== */}
        <div className="accordion-item">
          <h2 className="accordion-header">
            <button
              className="accordion-button collapsed"
              data-bs-toggle="collapse"
              data-bs-target="#orderSection"
            >
              Order Summary
            </button>
          </h2>
          <div id="orderSection" className="accordion-collapse collapse">
            <div className="accordion-body">

              <div id="orderSummaryPDF">
                <div className="table-responsive">
                  <table className="table table-bordered table-sm">
                    <thead className="table-light">
                      <tr>
                        <th>Product ID</th>
                        <th>Product</th>
                        <th>Unit</th>
                        <th>Quantity</th>
                        <th>Total cost</th>
                        <th>Contact name</th>
                        <th>Contact Phone number</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderRows.map((row, i) => (
                        <tr key={i}>
                          {Object.keys(row).map((field, idx) => (
                            <td key={idx}>
                              <input
                                className="form-control form-control-sm"
                                value={row[field]}
                                onChange={e =>
                                  handleChange(
                                    orderRows,
                                    setOrderRows,
                                    i,
                                    field,
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                className="btn btn-outline-primary me-2"
                onClick={() =>
                  addRow(setOrderRows, [
                    "productId", "product", "unit", "quantity", "totalCost", "contactName", "contactPhone"
                  ])
                }
              >
                Add Row
              </button>
              <button
                className="btn btn-outline-danger me-2"
                onClick={() => removeRow(setOrderRows)}
              >
                Remove Row
              </button>

              <button
                className="btn btn-success"
                onClick={exportPDF}
              >
                Export PDF
              </button>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}


// // src/pages/inventory/Inventory.jsx
// import React from "react";
// import { Container, Card } from "react-bootstrap";
// import { useAuth } from "../../contexts/AuthContext";
// import "bootstrap/dist/css/bootstrap.min.css";

// export default function Inventory() {
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
//             Inventory Module
//           </Card.Title>

//           <Card.Text style={{ fontSize: 16, color: "#555" }}>
//             🚧 This page is currently under development.
//           </Card.Text>

//           <Card.Text style={{ fontSize: 15, color: "#777" }}>
//             Inventory management features such as stock tracking, item
//             allocation, and usage reports will be available soon.
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
