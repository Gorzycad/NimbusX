// src/pages/inventory/InventoryPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  saveInventoryTable,
  getInventoryTable,
} from "../../firebase/inventoryService";
import { useAuth } from "../../contexts/AuthContext";
import { getLeads } from "../../firebase/leadsService";


export default function InventoryPage() {
  const { companyId } = useAuth();

  /* -----------------------------
     STATE
  ----------------------------- */
  const emptyInventoryRow = useMemo(
  () => ({
    productId: "",
    product: "",
    unit: "",
    qty: "",
    price: "",
    total: "",
    reorder: "",
    orderTime: "",
    eta: "",
  }),
  []
);

  const [inventoryRows, setInventoryRows] = useState([emptyInventoryRow]);

  const [vendorRows, setVendorRows] = useState([]);
  const [orderRows, setOrderRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeInventoryTab, setActiveInventoryTab] = useState("main");
  const [projects, setProjects] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState("inventory");
  const [showTakeOut, setShowTakeOut] = useState(false);
  const [showBringIn, setShowBringIn] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const [movementForm, setMovementForm] = useState({
    productId: "",
    product: "",
    unit: "",
    price: "",
    qty: "",
    destination: "",
  });

  useEffect(() => {
    if (!companyId) return;

    const loadProjects = async () => {
      const leads = await getLeads(companyId);
      const names = Array.from(
        new Set((leads || []).map(l => l.projectName).filter(Boolean))
      );
      setProjects(names);
    };

    loadProjects();
    //setLoading(true);
  }, [companyId, activeInventoryTab]);

  const inventoryKey = `inventory_${activeInventoryTab}`;
  const vendorKey = `vendors_${activeInventoryTab}`;
  const orderKey = `orders_${activeInventoryTab}`;



  useEffect(() => {
    if (!companyId) return;

    const loadData = async () => {
      setLoading(true);

      const inv = await getInventoryTable(companyId, inventoryKey) || [];
      const vendors = await getInventoryTable(companyId, vendorKey) || [];
      const orders = await getInventoryTable(companyId, orderKey) || [];

      setInventoryRows(inv.length ? inv : [emptyInventoryRow]);
      setVendorRows(vendors);
      setOrderRows(orders);

      setLoading(false);
    };

    loadData();
  }, [companyId, activeInventoryTab, inventoryKey,
    vendorKey,
    orderKey,
    emptyInventoryRow,
  ]);

  const orderTimes = inventoryRows
    .map(r => r.orderTime)
    .join(",");

  useEffect(() => {
    const timer = setTimeout(() => {
      setInventoryRows(prev => {
        let changed = false;

        const updated = prev.map(row => {
          if (!row.orderTime) return row;

          const days = Number(row.orderTime);
          if (isNaN(days)) return row;

          const etaDate = new Date();
          etaDate.setDate(etaDate.getDate() + days);

          const newEta = etaDate.toISOString().split("T")[0];

          if (row.eta === newEta) return row;

          changed = true;
          return { ...row, eta: newEta };
        });

        return changed ? updated : prev;
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [orderTimes]);



  /* -----------------------------
     AUTO CALCULATIONS
  ----------------------------- */
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
    if (!inventoryRows.length) return;

    setVendorRows(prev => {
      return inventoryRows.map(inv => {
        const existing = prev.find(v => v.productId === inv.productId);

        return {
          productId: inv.productId,
          product: inv.product,
          unit: inv.unit,
          contactName: existing?.contactName || "",
          contactPhone: existing?.contactPhone || "",
        };
      });
    });
  }, [inventoryRows, activeInventoryTab]);


  /* -----------------------------
     SYNC INVENTORY + VENDOR → ORDER
  ----------------------------- */
  useEffect(() => {
    setOrderRows(() => {
      return inventoryRows.map(inv => {
        const vendor = vendorRows.find(v => v.productId === inv.productId);

        const quantity = "";
        const price = inv.price || "";

        return {
          productId: inv.productId,
          product: inv.product,
          unit: inv.unit,
          quantity,
          price,
          totalCost: "",
          contactName: vendor?.contactName || "",
          contactPhone: vendor?.contactPhone || "",
        };
      });
    });
  }, [inventoryRows, vendorRows, activeInventoryTab]);


  /* -----------------------------
     HELPERS
  ----------------------------- */
  const addInventoryRow = () => {
    setInventoryRows(prev => [...prev, { ...emptyInventoryRow }]);
  };

  const removeInventoryRow = (index) => {
    setInventoryRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleChange = (rows, setRows, index, field, value) => {
    const copy = [...rows];
    copy[index][field] = value;

    if (field === "qty" || field === "price") {
      const qty = Number(copy[index].qty || 0);
      const price = Number(copy[index].price || 0);

      copy[index].total =
        qty && price ? (qty * price).toFixed(2) : "";
    }

    setRows(copy);
  };

  /* -----------------------------
     EXPORT PDF (Order Summary only)
  ----------------------------- */
  const exportPDF = () => {
    const content = document.getElementById("orderSummaryPDF").innerHTML;

    const win = window.open("", "", "width=900,height=700");

    win.document.write(`
    <html>
      <head>
        <title>Order Summary</title>
        <style>
          body { font-family: Arial; padding: 20px; }
          table { width: 100%; border-collapse: collapse; }
          table, th, td { border: 1px solid black; }
          th, td { padding: 8px; }
        </style>
      </head>
      <body>
        <h3>Order Summary</h3>
        ${content}
      </body>
    </html>
  `);

    win.document.close();
    win.print();
  };

  const handleSaveAll = async () => {
    if (!companyId) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await saveInventoryTable(companyId, inventoryKey, inventoryRows);
      await saveInventoryTable(companyId, vendorKey, vendorRows);
      await saveInventoryTable(companyId, orderKey, orderRows);

      setSuccess("Inventory data saved successfully.");
    } catch (error) {
      console.error("Save failed:", error);
      setError("Error saving inventory.");
    } finally {
      setSaving(false);
    }
  };

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

  const handleTakeOut = async () => {
    const { productId, qty, destination } = movementForm;


    if (!productId || !qty || !destination) {
      setError("Fill all fields");
      return;
    }

    const quantity = Number(qty);

    // 1️⃣ SUBTRACT from CURRENT inventory
    let updatedSource = [];

    const normalizedId = productId.trim().toLowerCase();


    setInventoryRows(prev => {
      updatedSource = prev.map(row => {
        const rowId = (row.productId || "").trim().toLowerCase();
        if (rowId !== normalizedId) return row;

        const newQty = Number(row.qty || 0) - quantity;

        return {
          ...row,
          qty: newQty < 0 ? 0 : newQty,
          total: ((newQty < 0 ? 0 : newQty) * Number(row.price || 0)).toFixed(2),
        };
      });

      return updatedSource;
    });

    // 2️⃣ SAVE updated source inventory
    await saveInventoryTable(companyId, inventoryKey, updatedSource);

    // 3️⃣ IF destination is another project → ADD there
    if (destination !== "site") {
      const destinationKey = `inventory_${destination}`;

      const destInventory =
        (await getInventoryTable(companyId, destinationKey)) || [];

      let productFound = false;

      const updatedDestination = destInventory.map(row => {
        const rowId = (row.productId || "").trim().toLowerCase();
        if (rowId === normalizedId) {
          productFound = true;

          const newQty = Math.max(0, Number(row.qty || 0) + quantity); // (also fix: should be + not - for destination)

          return {
            ...row,
            qty: newQty,
            total: (newQty * Number(row.price || 0)).toFixed(2),
          };
        }

        // ✅ ALWAYS return row if no match
        return row;
      });

      // If product doesn't exist in destination → create it
      if (!productFound) {
        const sourceItem = updatedSource.find(r => r.productId === productId);

        if (sourceItem) {
          updatedDestination.push({
            ...sourceItem,
            qty: quantity,
            total: (quantity * Number(sourceItem.price || 0)).toFixed(2),
          });
        }
      }

      await saveInventoryTable(companyId, destinationKey, updatedDestination);
    }

    const sourceItemExists = updatedSource.some(r => r.productId === productId);

    if (!sourceItemExists) {
      setError("Product not found in current inventory");
      return;
    }

    // alert(
    //   destination === "site"
    //     ? "Stock taken to site successfully"
    //     : `Stock transferred to ${destination}`
    // );
    setSuccess(`Stock transferred to ${destination === "site" ? "site" : destination}`);

    setShowTakeOut(false);

    setMovementForm({
      productId: "",
      product: "",
      unit: "",
      price: "",
      qty: "",
      destination: "",
    });
  };

  const handleBringIn = async () => {
    const { productId, qty } = movementForm;

    if (!productId || !qty) {
      setError("Product ID and quantity are required");
      return;
    }

    const quantity = Number(qty);
    const normalizedId = productId.trim().toLowerCase();

    let updatedInventory = [];
    let found = false;

    setInventoryRows(prev => {
      updatedInventory = prev.map(row => {
        const rowId = (row.productId || "").trim().toLowerCase();

        if (rowId === normalizedId) {
          found = true;

          const newQty = Number(row.qty || 0) + quantity;

          return {
            ...row,
            qty: newQty,
            total: (newQty * Number(row.price || 0)).toFixed(2),
          };
        }

        return row;
      });

      return updatedInventory;
    });

    if (!found) {
      setError("Product does not exist. Add it first in inventory table.");
      return;
    }

    await saveInventoryTable(companyId, inventoryKey, updatedInventory);

    setSuccess("Stock updated successfully");

    setMovementForm({
      productId: "",
      product: "",
      unit: "",
      price: "",
      qty: "",
      destination: "",
    });

    setShowBringIn(false);
  };

  /* -----------------------------
     JSX
  ----------------------------- */
  return (
    <div className="container py-4">
      <h2 className="mb-4">Inventory Management</h2>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {saving && (
        <div className="alert alert-info">
          Saving inventory...
        </div>
      )}

      {/* =========================
        PROJECT TABS
    ========================== */}
      <div className="mb-4 d-flex flex-wrap gap-2">
        <button
          className={`btn ${activeInventoryTab === "main" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setActiveInventoryTab("main")}
        >
          Main Inventory
        </button>

        {projects.map(p => (
          <button
            key={p}
            className={`btn ${activeInventoryTab === p ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setActiveInventoryTab(p)}
          >
            {p} Inventory
          </button>
        ))}
      </div>

      {/* =========================
        SUB TABS (FIXED NAMES)
    ========================== */}
      <div className="d-flex gap-2 mb-3">
        {[
          { key: "inventory", label: "INVENTORY" },
          { key: "vendor_info", label: "VENDOR INFO" },
          { key: "order_summary", label: "ORDER SUMMARY" },
        ].map(tab => (
          <button
            key={tab.key}
            className={`btn ${activeSubTab === tab.key ? "btn-dark" : "btn-outline-dark"}`}
            onClick={() => setActiveSubTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* =========================
        INVENTORY TAB
    ========================== */}
      {activeSubTab === "inventory" && (
        <>
          {/* ACTION BUTTONS */}
          <div className="d-flex gap-2 mb-3">
            <button className="btn btn-danger" onClick={() => { setShowTakeOut(true); setShowBringIn(false); }}>
              Take Out
            </button>
            <button className="btn btn-success" onClick={() => { setShowBringIn(true); setShowTakeOut(false); }}>
              Bring In
            </button>
          </div>

          {/* SUMMARY */}
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

          {/* TABLE */}
          <div className="table-responsive">
            <table className="table table-bordered table-sm">
              <thead className="table-light">
                <tr>
                  <th>Product ID</th>
                  <th>Product</th>
                  <th>Unit</th>
                  <th>Qty in Stock</th>
                  <th>Price</th>
                  <th>Total</th>
                  <th>Reorder</th>
                  <th>Order Time</th>
                  <th>ETA</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {inventoryRows.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <input value={row.productId} onChange={e =>
                        handleChange(inventoryRows, setInventoryRows, i, "productId", e.target.value)
                      } />
                    </td>

                    <td>
                      <input value={row.product} onChange={e =>
                        handleChange(inventoryRows, setInventoryRows, i, "product", e.target.value)
                      } />
                    </td>

                    <td>
                      <input value={row.unit} onChange={e =>
                        handleChange(inventoryRows, setInventoryRows, i, "unit", e.target.value)
                      } />
                    </td>

                    <td>
                      <input value={row.qty} onChange={e =>
                        handleChange(inventoryRows, setInventoryRows, i, "qty", e.target.value)
                      } />
                    </td>

                    <td>
                      <input value={row.price} onChange={e =>
                        handleChange(inventoryRows, setInventoryRows, i, "price", e.target.value)
                      } />
                    </td>

                    <td>
                      <input value={row.total} disabled />
                    </td>

                    <td>
                      <input value={row.reorder} onChange={e =>
                        handleChange(inventoryRows, setInventoryRows, i, "reorder", e.target.value)
                      } />
                    </td>

                    <td>
                      <input value={row.orderTime} onChange={e =>
                        handleChange(inventoryRows, setInventoryRows, i, "orderTime", e.target.value)
                      } />
                    </td>

                    <td>
                      <input value={row.eta} disabled />
                    </td>

                    <td>
                      <button onClick={() => removeInventoryRow(i)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>

          <button className="btn btn-outline-primary me-2" onClick={addInventoryRow}>
            + Add Row
          </button>

          <button className="btn btn-primary my-3" onClick={handleSaveAll}>
            Save All Inventory Data
          </button>
        </>
      )}

      {/* =========================
        VENDOR INFO TAB
    ========================== */}
      {activeSubTab === "vendor_info" && (
        <div className="table-responsive">
          <table className="table table-bordered table-sm">
            <thead className="table-light">
              <tr>
                <th>Product ID</th>
                <th>Product</th>
                <th>Unit</th>
                <th>Contact Name</th>
                <th>Contact Phone</th>
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
                        disabled={["productId", "product", "unit"].includes(field)}
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
      )}

      {/* =========================
        ORDER SUMMARY TAB
    ========================== */}
      {activeSubTab === "order_summary" && (
        <>
          <div id="orderSummaryPDF" className="table-responsive">
            <table className="table table-bordered table-sm">
              <thead className="table-light">
                <tr>
                  <th>Product ID</th>
                  <th>Product</th>
                  <th>Unit</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Total Cost</th>
                  <th>Contact Name</th>
                  <th>Contact Phone</th>
                </tr>
              </thead>
              <tbody>
                {orderRows.map((row, i) => {
                  const qty = Number(row.quantity || 0);
                  const price = Number(row.price || 0);
                  const totalCost = qty * price;

                  return (
                    <tr key={i}>
                      <td>
                        <input
                          className="form-control form-control-sm"
                          value={row.productId}
                          disabled
                        />
                      </td>

                      <td>
                        <input
                          className="form-control form-control-sm"
                          value={row.product}
                          disabled
                        />
                      </td>

                      <td>
                        <input
                          className="form-control form-control-sm"
                          value={row.unit}
                          disabled
                        />
                      </td>

                      <td>
                        <input
                          className="form-control form-control-sm"
                          value={row.quantity}
                          onChange={(e) =>
                            handleChange(orderRows, setOrderRows, i, "quantity", e.target.value)
                          }
                        />
                      </td>

                      <td>
                        <input
                          className="form-control form-control-sm"
                          value={row.price}
                          onChange={(e) =>
                            handleChange(orderRows, setOrderRows, i, "price", e.target.value)
                          }
                        />
                      </td>

                      <td>
                        <input
                          className="form-control form-control-sm"
                          value={totalCost.toFixed(2)}
                          disabled
                        />
                      </td>

                      <td>
                        <input
                          className="form-control form-control-sm"
                          value={row.contactName}
                          onChange={(e) =>
                            handleChange(orderRows, setOrderRows, i, "contactName", e.target.value)
                          }
                        />
                      </td>

                      <td>
                        <input
                          className="form-control form-control-sm"
                          value={row.contactPhone}
                          onChange={(e) =>
                            handleChange(orderRows, setOrderRows, i, "contactPhone", e.target.value)
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>

          <button className="btn btn-success mt-3" onClick={exportPDF}>
            Export PDF
          </button>
        </>
      )}

      {/* =========================
        MOVEMENT FORM
    ========================== */}
      {(showTakeOut || showBringIn) && (
        <div className="card p-3 mt-4">
          <h5>{showTakeOut ? "Take Out Stock" : "Bring In Stock"}</h5>

          <input
            className="form-control mb-2"
            placeholder="Product ID"
            value={movementForm.productId}
            onChange={e =>
              setMovementForm(prev => ({ ...prev, productId: e.target.value }))
            }
          />

          <input
            className="form-control mb-2"
            placeholder="Quantity"
            type="number"
            onChange={e =>
              setMovementForm(prev => ({ ...prev, qty: e.target.value }))
            }
          />


          {/* ONLY FOR TAKE OUT */}
          {showTakeOut && (
            <select
              className="form-control mb-2"
              value={movementForm.destination}
              onChange={e =>
                setMovementForm(prev => ({ ...prev, destination: e.target.value }))
              }
            >
              <option value="">Select Destination</option>

              {projects
                .filter(p => p !== activeInventoryTab)
                .map(p => (
                  <option key={p} value={p}>
                    {p} Inventory
                  </option>
                ))}

              <option value="site">To Site</option>
            </select>
          )}

          <button
            className="btn btn-primary me-2"
            onClick={showTakeOut ? handleTakeOut : handleBringIn}
          >
            Submit
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => {
              setShowTakeOut(false);
              setShowBringIn(false);
            }}
          >
            Cancel
          </button>
        </div>
      )}


    </div >
  );
}
