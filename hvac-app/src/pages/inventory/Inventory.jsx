// src/pages/inventory/InventoryPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  saveInventoryTable,
  getInventoryTable,
} from "../../firebase/inventoryService";
import { useAuth } from "../../contexts/AuthContext";
import { getLeads } from "../../firebase/leadsService";

const createRows = (count, fields) =>
  Array.from({ length: count }, () =>
    fields.reduce((acc, f) => ({ ...acc, [f]: "" }), {})
  );

export default function InventoryPage() {
  const { companyId } = useAuth();

  /* -----------------------------
     STATE
  ----------------------------- */
  const emptyInventoryRow = {
    productId: "",
    product: "",
    unit: "",
    qty: "",
    price: "",
    total: "",
    reorder: "",
    orderTime: "",
    eta: "",
  };

  const [inventoryRows, setInventoryRows] = useState([emptyInventoryRow]);

  const [vendorRows, setVendorRows] = useState([]);
  const [orderRows, setOrderRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeInventoryTab, setActiveInventoryTab] = useState("main");
  const [projects, setProjects] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState("inventory");
  const [showTakeOut, setShowTakeOut] = useState(false);
  const [showBringIn, setShowBringIn] = useState(false);

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
      try {
        const inv = await getInventoryTable(companyId, inventoryKey);
        const vendors = await getInventoryTable(companyId, vendorKey);
        const orders = await getInventoryTable(companyId, orderKey);

        if (inv.length) setInventoryRows(inv);
        if (vendors.length) setVendorRows(vendors);
        if (orders.length) setOrderRows(orders);

      } catch (err) {
        console.error("Load Failed:", err);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    loadData();
  }, [companyId, activeInventoryTab]);

  useEffect(() => {
  setInventoryRows(prev => {
    let changed = false;

    const updated = prev.map(row => {
      if (!row.orderTime) return row;

      const days = Number(row.orderTime);
      if (isNaN(days)) return row;

      const today = new Date();
      const etaDate = new Date(today);
      etaDate.setDate(today.getDate() + days);

      const newEta = etaDate.toISOString().split("T")[0];

      if (row.eta !== newEta) {
        changed = true;
        return { ...row, eta: newEta };
      }

      return row;
    });

    return changed ? updated : prev; // ✅ prevents infinite loop
  });
}, [inventoryRows]);

  // useEffect(() => {
  //   setInventoryRows(prev =>
  //     prev.map(row => {
  //       if (!row.orderTime) return row;

  //       const days = Number(row.orderTime);
  //       if (isNaN(days)) return row;

  //       const today = new Date();
  //       const etaDate = new Date(today);
  //       etaDate.setDate(today.getDate() + days);

  //       return {
  //         ...row,
  //         eta: etaDate.toISOString().split("T")[0], // YYYY-MM-DD
  //       };
  //     })
  //   );
  // }, [inventoryRows]);
  //}, [inventoryRows.map(r => r.orderTime).join()]);

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
    const updated = inventoryRows.map(inv => {
      const existing = vendorRows.find(v => v.productId === inv.productId);

      return {
        productId: inv.productId,
        product: inv.product,
        unit: inv.unit,
        contactName: existing?.contactName || "",
        contactPhone: existing?.contactPhone || "",
      };
    });

    setVendorRows(updated);
  }, [inventoryRows]);

  // useEffect(() => {
  //   setVendorRows(prev => {
  //     return inventoryRows.map(inv => {
  //       const existing = prev.find(v => v.productId === inv.productId);

  //       return {
  //         productId: inv.productId,
  //         product: inv.product,
  //         unit: inv.unit,
  //         contactName: existing?.contactName || "",
  //         contactPhone: existing?.contactPhone || "",
  //       };
  //     });
  //   });
  // }, [inventoryRows]);

  /* -----------------------------
     SYNC INVENTORY + VENDOR → ORDER
  ----------------------------- */
  useEffect(() => {
    setOrderRows(prev => {
      return inventoryRows.map(inv => {
        const existing = prev.find(o => o.productId === inv.productId);
        const vendor = vendorRows.find(v => v.productId === inv.productId);

        const quantity = existing?.quantity || "";
        const price = existing?.price || inv.price || "";

        return {
          productId: inv.productId,
          product: inv.product,
          unit: inv.unit,
          quantity,
          price, // ✅ NEW editable
          totalCost:
            quantity && price
              ? (Number(quantity) * Number(price)).toFixed(2)
              : "",
          contactName: vendor?.contactName || "",
          contactPhone: vendor?.contactPhone || "",
        };
      });
    });
  }, [inventoryRows, vendorRows]);

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
      await saveInventoryTable(companyId, inventoryKey, inventoryRows);
      await saveInventoryTable(companyId, vendorKey, vendorRows);
      await saveInventoryTable(companyId, orderKey, orderRows);

      alert("Inventory data saved successfully.");
    } catch (error) {
      console.error("Save failed:", error);
      alert("Error saving inventory.");
    }
  };

  if (loading) {
    return <div className="text-center mt-5">Loading inventory...</div>;
  }

  const handleTakeOut = async () => {
    const { productId, qty, destination } = movementForm;


    if (!productId || !qty || !destination) {
      alert("Fill all fields");
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
      alert("Product not found in current inventory");
      return;
    }

    alert(
      destination === "site"
        ? "Stock taken to site successfully"
        : `Stock transferred to ${destination}`
    );

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
      alert("Product ID and quantity are required");
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
      alert("Product does not exist. Add it first in inventory table.");
      return;
    }

    await saveInventoryTable(companyId, inventoryKey, updatedInventory);

    alert("Stock updated successfully");

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
            <button className="btn btn-danger" onClick={() => { setShowTakeOut(true); setShowBringIn(false);} }>
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
                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => removeInventoryRow(i)}
                      >
                        Delete
                      </button>
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
                {orderRows.map((row, i) => (
                  <tr key={i}>
                    {Object.keys(row).map((field, idx) => (
                      <td key={idx}>
                        <input
                          className="form-control form-control-sm"
                          value={row[field]}
                          disabled={
                            ["productId", "product", "unit", "totalCost"].includes(field)
                          }
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

          {/* ONLY FOR BRING IN */}
          {/* {showBringIn && (
            <>
              <input
                className="form-control mb-2"
                placeholder="Product Name"
                onChange={e =>
                  setMovementForm(prev => ({ ...prev, product: e.target.value }))
                }
              />

              <input
                className="form-control mb-2"
                placeholder="Unit"
                onChange={e =>
                  setMovementForm(prev => ({ ...prev, unit: e.target.value }))
                }
              />

              <input
                className="form-control mb-2"
                placeholder="Price"
                type="number"
                onChange={e =>
                  setMovementForm(prev => ({ ...prev, price: e.target.value }))
                }
              />
            </>
          )} */}

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

      {/* {(showTakeOut || showBringIn) && (
        <div className="card p-3 mt-4">
          <h5>{showTakeOut ? "Take Out Stock" : "Bring In Stock"}</h5>

          <input
            className="form-control mb-2"
            placeholder="Product ID"
            onChange={e =>
              setMovementForm(prev => ({ ...prev, productId: e.target.value }))
            }
          />

          <input
            className="form-control mb-2"
            placeholder="Product Name"
            onChange={e =>
              setMovementForm(prev => ({ ...prev, product: e.target.value }))
            }
          />

          <input
            className="form-control mb-2"
            placeholder="Unit (e.g. pcs, kg)"
            onChange={e =>
              setMovementForm(prev => ({ ...prev, unit: e.target.value }))
            }
          />

          <input
            className="form-control mb-2"
            placeholder="Price per unit"
            type="number"
            onChange={e =>
              setMovementForm(prev => ({ ...prev, price: e.target.value }))
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

          {showBringIn && (
            <>
              <input
                className="form-control mb-2"
                placeholder="Product Name"
                onChange={e =>
                  setMovementForm(prev => ({ ...prev, product: e.target.value }))
                }
              />

              <input
                className="form-control mb-2"
                placeholder="Unit (e.g. pcs, kg)"
                onChange={e =>
                  setMovementForm(prev => ({ ...prev, unit: e.target.value }))
                }
              />

              <input
                className="form-control mb-2"
                placeholder="Price per unit"
                type="number"
                onChange={e =>
                  setMovementForm(prev => ({ ...prev, price: e.target.value }))
                }
              />

            </>
          )}

          {showTakeOut && (
            <select
              className="form-control mb-2"
              value={movementForm.destination}
              onChange={e =>
                setMovementForm(prev => ({ ...prev, destination: e.target.value }))
              }
            >
              <option value="">Select Destination</option>

              {/* Project Inventories */}
      {/* {projects.map(p => (
                <option key={p} value={p}>
                  {p} Inventory
                </option>
              ))} */}
      {/* {projects
        .filter(p => p !== activeInventoryTab)
        .map(p => (
          <option key={p} value={p}>
            {p} Inventory
          </option>
        ))}

      {/* Site */}
      {/* <option value="site">To Site</option>
    </select>
  )
}

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
        </div >
      )} */}

    </div >
  );
}

// return (
//   <div className="container py-4">
//     <h2 className="mb-4">Inventory Management</h2>

//     <div className="accordion" id="inventoryAccordion">

//       {/* =========================
//          INVENTORY TAB
//       ========================== */}
//       <div className="accordion-item">
//         <div className="mb-4">
//           <div className="d-flex flex-wrap gap-2">

//             {/* Main Inventory */}
//             <button
//               className={`btn ${activeInventoryTab === "main" ? "btn-primary" : "btn-outline-primary"}`}
//               onClick={() => setActiveInventoryTab("main")}
//             >
//               Main Inventory
//             </button>

//             {/* Project Inventories */}
//             {projects.map(p => (
//               <button
//                 key={p}
//                 className={`btn ${activeInventoryTab === p ? "btn-primary" : "btn-outline-primary"}`}
//                 onClick={() => setActiveInventoryTab(p)}
//               >
//                 {p} Inventory
//               </button>
//             ))}

//           </div>
//         </div>
//         {activeSubTab === "inventory" && (
//           <div>
//             <div className="d-flex gap-2 mb-3">
//               {["inventory", "vendor", "order"].map(tab => (
//                 <button
//                   key={tab}
//                   className={`btn ${activeSubTab === tab ? "btn-dark" : "btn-outline-dark"}`}
//                   onClick={() => setActiveSubTab(tab)}
//                 >
//                   {tab.toUpperCase()}
//                 </button>
//               ))}
//             </div>
//             <div className="d-flex gap-2 mb-3">
//               <button
//                 className="btn btn-danger"
//                 onClick={() => setShowTakeOut(true)}
//               >
//                 Take Out
//               </button>

//               <button
//                 className="btn btn-success"
//                 onClick={() => setShowBringIn(true)}
//               >
//                 Bring In
//               </button>
//             </div>

//             <div id="inventorySection" className="accordion-collapse collapse show">
//               <div className="accordion-body">

//                 {/* Summary Headers */}
//                 <div className="row mb-4">
//                   <div className="col-md-3">
//                     <label>Inventory Value</label>
//                     <input className="form-control" value={inventoryValue} disabled />
//                   </div>
//                   <div className="col-md-3">
//                     <label>Unique Products</label>
//                     <input className="form-control" value={uniqueProducts} disabled />
//                   </div>
//                   <div className="col-md-3">
//                     <label>Current Date</label>
//                     <input className="form-control" value={currentDate} disabled />
//                   </div>
//                   <div className="col-md-3">
//                     <label>Day of Week</label>
//                     <input className="form-control" value={currentDay} disabled />
//                   </div>
//                 </div>

//                 {/* Table */}
//                 <div className="table-responsive">
//                   <table className="table table-bordered table-sm">
//                     <thead className="table-light">
//                       <tr>
//                         <th>Product ID</th>
//                         <th>Product</th>
//                         <th>Unit</th>
//                         <th>Qty in Stock</th>
//                         <th>Price per unit</th>
//                         <th>Total Value</th>
//                         <th>Reorder Threshold</th>
//                         <th>Typical Order Time (days)</th>
//                         <th>ETA</th>
//                         <th>Action</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {inventoryRows.map((row, i) => (
//                         <tr key={i}>
//                           {Object.keys(row).map((field, idx) => (
//                             <td key={idx}>
//                               <input
//                                 className="form-control form-control-sm"
//                                 value={row[field]}
//                                 disabled={field === "total"}
//                                 onChange={e =>
//                                   handleChange(
//                                     inventoryRows,
//                                     setInventoryRows,
//                                     i,
//                                     field,
//                                     e.target.value
//                                   )
//                                 }
//                               />
//                             </td>
//                           ))}
//                           <td>
//                             <button
//                               className="btn btn-sm btn-danger"
//                               onClick={() => removeInventoryRow(i)}
//                             >
//                               Delete
//                             </button>
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>

//                 <button className="btn btn-outline-primary me-2" onClick={addInventoryRow}>
//                   + Add Row
//                 </button>
//                 <button
//                   className="btn btn-primary my-3"
//                   onClick={handleSaveAll}
//                 >
//                   Save All Inventory Data
//                 </button>


//               </div>
//             </div>
//           </div>

//         )}
//         {activeSubTab === "vendor" && (
//           <div>
//             {/* =========================
//          VENDOR INFO TAB
//       ========================== */}
//             <div className="accordion-item">

//               <div className="d-flex gap-2 mb-3">
//                 <button
//                   className="btn btn-danger"
//                   onClick={() => setShowTakeOut(true)}
//                 >
//                   Take Out
//                 </button>

//                 <button
//                   className="btn btn-success"
//                   onClick={() => setShowBringIn(true)}
//                 >
//                   Bring In
//                 </button>
//               </div>
//               <div id="vendorSection" className="accordion-collapse collapse">
//                 <div className="accordion-body">

//                   <div className="table-responsive">
//                     <table className="table table-bordered table-sm">
//                       <thead className="table-light">
//                         <tr>
//                           <th>Product ID</th>
//                           <th>Product</th>
//                           <th>Unit</th>
//                           <th>Typical Order time (days)</th>
//                           <th>Contact name</th>
//                           <th>Contact Phone number</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {vendorRows.map((row, i) => (
//                           <tr key={i}>
//                             {Object.keys(row).map((field, idx) => (
//                               <td key={idx}>
//                                 <input
//                                   className="form-control form-control-sm"
//                                   value={row[field]}
//                                   disabled={["productId", "product", "unit"].includes(field)}
//                                   onChange={e =>
//                                     handleChange(
//                                       vendorRows,
//                                       setVendorRows,
//                                       i,
//                                       field,
//                                       e.target.value
//                                     )
//                                   }
//                                 />
//                               </td>
//                             ))}
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>



//                 </div>
//               </div>
//             </div>
//           </div>
//         )
//         }
//         {activeSubTab === "order" && (
//           <div>
//             {/* =========================
//          ORDER SUMMARY TAB
//       ========================== */}
//             <div className="accordion-item">

//               <div className="d-flex gap-2 mb-3">
//                 <button
//                   className="btn btn-danger"
//                   onClick={() => setShowTakeOut(true)}
//                 >
//                   Take Out
//                 </button>

//                 <button
//                   className="btn btn-success"
//                   onClick={() => setShowBringIn(true)}
//                 >
//                   Bring In
//                 </button>
//               </div>


//               <div id="orderSection" className="accordion-collapse collapse">
//                 <div className="accordion-body">

//                   <div id="orderSummaryPDF">
//                     <div className="table-responsive">
//                       <table className="table table-bordered table-sm">
//                         <thead className="table-light">
//                           <tr>
//                             <th>Product ID</th>
//                             <th>Product</th>
//                             <th>Unit</th>
//                             <th>Quantity</th>
//                             <th>Price per unit</th>
//                             <th>Total cost</th>
//                             <th>Contact name</th>
//                             <th>Contact Phone number</th>
//                           </tr>
//                         </thead>
//                         <tbody>
//                           {orderRows.map((row, i) => (
//                             <tr key={i}>
//                               {Object.keys(row).map((field, idx) => (
//                                 <td key={idx}>
//                                   <input
//                                     className="form-control form-control-sm"
//                                     value={row[field]}
//                                     disabled={
//                                       ["productId", "product", "unit", "totalCost"].includes(field)
//                                     }
//                                     onChange={e =>
//                                       handleChange(
//                                         orderRows,
//                                         setOrderRows,
//                                         i,
//                                         field,
//                                         e.target.value
//                                       )
//                                     }
//                                   />
//                                 </td>
//                               ))}
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     </div>
//                   </div>

//                   <button
//                     className="btn btn-success"
//                     onClick={exportPDF}
//                   >
//                     Export PDF
//                   </button>

//                 </div>
//               </div>
//             </div>
//           </div>
//         )}

//       </div>
//       {(showTakeOut || showBringIn) && (
//         <div className="card p-3 mb-3">
//           <h5>{showTakeOut ? "Take Out Stock" : "Bring In Stock"}</h5>

//           <input
//             className="form-control mb-2"
//             placeholder="Product ID"
//             onChange={e => setMovementForm(prev => ({ ...prev, productId: e.target.value }))}
//           />

//           <input
//             className="form-control mb-2"
//             placeholder="Quantity"
//             type="number"
//             onChange={e => setMovementForm(prev => ({ ...prev, qty: e.target.value }))}
//           />

//           {showTakeOut && (
//             <input
//               className="form-control mb-2"
//               placeholder="Destination (site or project name)"
//               onChange={e => setMovementForm(prev => ({ ...prev, destination: e.target.value }))}
//             />
//           )}

//           <button
//             className="btn btn-primary me-2"
//             onClick={showTakeOut ? handleTakeOut : handleBringIn}
//           >
//             Submit
//           </button>

//           <button
//             className="btn btn-secondary"
//             onClick={() => {
//               setShowTakeOut(false);
//               setShowBringIn(false);
//             }}
//           >
//             Cancel
//           </button>
//         </div>
//       )}
//     </div>
//   </div>
// );

