//src/pages/po/POList.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { addPO, getPOs, updatePO, deletePO } from "../../firebase/poService";
import { getLeads } from "../../firebase/leadsService";
import StaffSelector from "../../components/layout/StaffSelector";
import { getRolesForSelector } from "../../config/roleAccess";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { notifyAssignedStaff } from "../leads/LeadsListHelper";
import { serverTimestamp } from "firebase/firestore";
import { useMemo } from "react";
import { getMtos } from "../../firebase/mtoService";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// ---------------------------- //
export default function PurchaseOrderPage() {
  const { companyId, user, role } = useAuth();
  const [, setPos] = useState([]);
  const [projectList, setProjectList] = useState([]);
  const [, setMtoTables] = useState([]);
  const [savedPO, setSavedPO] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [mtoList, setMtoList] = useState([]);
  const [selectedMtoId, setSelectedMtoId] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");

  /* ---------------- LOAD PRODUCTS ---------------- */
  useEffect(() => {
    const loadProducts = async () => {
      const snap = await getDocs(collection(db, "products"));

      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setProducts(data);
    };

    loadProducts();
  }, []);

  /* ---------------- LOAD STAFF ---------------- */
  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    const loadStaff = async () => {
      const snap = await getDocs(
        collection(db, "companies", companyId, "users")
      );

      setStaffList(
        snap.docs.map(d => ({ id: d.id, ...d.data() }))
      );
      setLoading(false);
    };

    loadStaff();
  }, [companyId]);



  const staffNameMap = useMemo(() => {
    const map = {};
    staffList.forEach(u => {
      map[u.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    });
    return map;
  }, [staffList]);

  // Notify assigned staff helper
  const notifyStaffForLead = async (companyId, userIds, orderId, leadData, sourcePage, mainMenu) => {
    if (!userIds || !userIds.length) return;
    await notifyAssignedStaff(companyId, orderId, leadData, userIds, sourcePage, mainMenu);
  };

  const [formData, setFormData] = useState({
    projectName: "",
    staffAssigned: [],
    tableData: [],
    sentToSupplier: false,
    recipientAddress: "",
    recipientPhone: "",
    deliveryLocation: "Lagos", // Lagos | Other States
  });

  const staffAssignedIds = formData.staffAssigned;
  // ----------------------------
  // Load project names from LEADS
  useEffect(() => {
    if (!companyId) return;

    const load = async () => {
      const leads = await getLeads(companyId);
      const names = Array.from(new Set(leads.map((l) => l.projectName)));
      setProjectList(names);
    };

    load();
  }, [companyId]);

  // ----------------------------
  // Load saved POs
  useEffect(() => {
    if (!companyId) return;

    const fetch = async () => {
      const items = await getPOs(companyId);
      const sorted = (items || []).sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
      setPos(sorted);
      setSavedPO(items);
    };

    fetch();
  }, [companyId]);


  // ----------------------------
  // Load MTO when project changes
  useEffect(() => {
    if (!companyId || !formData.projectName) {
      // setBoqList([]);
      // setSelectedBoqId("");
      return;
    }

    const loadMtos = async () => {
      const allMtos = await getMtos(companyId);

      const filtered = allMtos.filter(
        m => m.projectName === formData.projectName
      );

      setMtoList(filtered);
    };

    // loadBoqs();
    loadMtos();
  }, [formData.projectName, companyId]);

  //Generate PO ID
  function generatePOId() {
    const year = new Date().getFullYear();
    return `PO-${year}-${Math.floor(100000 + Math.random() * 900000)}`;
  }

  const calculateDeliveryFee = () => {
    const mto = mtoList.find(m => m.id === selectedMtoId);

    if (!mto) return 0;

    const allRows = [
      ...(mto.mechanical || []),
      ...(mto.electrical || []),
      ...(mto.plumbing || []),
    ];

    let totalWeight = 0;

    allRows.forEach(row => {
      const normalize = str =>
        (str || "").toLowerCase().replace(/\s+/g, "");

      const product = products.find(
        p => normalize(p.sku) === normalize(row.item)
      );

      totalWeight +=
        Number(row.qty || 0) *
        Number(product?.unitKg || 0);
    });

    const baseFee =
      formData.deliveryLocation === "Other States"
        ? 90000
        : 10000;

    const perKg =
      formData.deliveryLocation === "Other States"
        ? 2000
        : 500;

    return {
      totalWeight,
      deliveryFee: baseFee + totalWeight * perKg,
    };
  };

  // ----------------------------
  // SEND TO SUPPLIER BUTTON
  const handleSendToMarketplace = async () => {
    if (!formData.projectName) return setError("Select project");
    //if (!boqId) return alert("Select BOQ");

    if (!formData.recipientAddress.trim()) {
      return setError("Enter recipient address");
    }

    if (!formData.recipientPhone.trim()) {
      return setError("Enter recipient contact number");
    }

    const mto = mtoList.find(m => m.id === selectedMtoId);
    if (!mto) {
      setError("Please select an MTO.");
      return;
    }

    const poId = generatePOId();



    const { totalWeight, deliveryFee } = calculateDeliveryFee();

    const calculateMtoTotal = (mto) => {
      const allRows = [
        ...(mto.mechanical || []),
        ...(mto.electrical || []),
        ...(mto.plumbing || []),
      ];

      return allRows.reduce((sum, row) => {
        const qty = Number(row.qty || 0);

        const rate = Number(
          String(row.rate || 0).replace(/,/g, "")
        );

        return sum + qty * rate;
      }, 0);
    };


    const totalAmount = calculateMtoTotal(mto);
    const grandTotal = totalAmount + deliveryFee;

    const payload = {
      companyId,
      poId,
      projectName: formData.projectName,
      recipientAddress: formData.recipientAddress,
      recipientPhone: formData.recipientPhone,
      deliveryLocation: formData.deliveryLocation,
      totalWeight,
      mtoId: mto.id,
      mtoTitle: mto.title,
      staffAssigned: formData.staffAssigned,
      mtoSnapshot: {
        mechanical: mto.mechanical || [],
        electrical: mto.electrical || [],
        plumbing: mto.plumbing || [],
      },
      totalAmount,
      deliveryFee,
      grandTotal,
      sentToMarketplace: true,

      // PDF will be attached later (cloud function / backend)
      poFile: null,

      createdAt: serverTimestamp(),
      tracking: {
        received: false,
        warehouse: false,
        packaged: false,
        dispatched: false,
        site: false,
      },

    };

    let id;

    if (editingId) {
      console.log("Editing ID:", editingId);

      await updatePO(companyId, editingId, payload);
      id = editingId;

      // Update existing PO in state
      setSavedPO(prev =>
        prev.map(po =>
          po.id === id ? { ...po, ...payload } : po
        )
      );

      setEditingId(null);

    } else {
      const creatorName = staffNameMap[user.uid] || "Unknown User";

      id = await addPO(companyId, {
        ...payload,
        createdBy: {
          uid: user.uid,
          name: creatorName,
        },
      });

      // Instantly add new PO to state (NO refetch needed)
      const newPO = {
        id,
        ...payload,
        createdBy: {
          uid: user.uid,
          name: creatorName,
        },
        createdAt: {
          seconds: Math.floor(Date.now() / 1000),
        },
      };

      setSavedPO(prev => [newPO, ...prev]);
    }

    try {
      if (companyId && user && staffAssignedIds.length > 0) {
        await notifyStaffForLead(
          companyId,
          staffAssignedIds,
          id,
          payload,
          "Orders".trim(),
          "Orders"
        );
      }
    } catch (err) {
      console.warn("Notification failed, lead still saved:", err);
    }
    resetForm();

    setPos(prev =>
      [...(prev || [])].sort(
        (a, b) =>
          (b.createdAt?.seconds || 0) -
          (a.createdAt?.seconds || 0)
      )
    );


  }

  const exportToExcel = () => {
    const mto = mtoList.find(m => m.id === selectedMtoId);

    if (!mto) {
      setError("Please select an MTO.");
      return;
    }

    const rows = [];

    rows.push({
      "PO ID": generatePOId(),
      Project: formData.projectName,
      MTO: mto.title,
      Address: formData.recipientAddress,
      Phone: formData.recipientPhone,
      Delivery: formData.deliveryLocation,
    });

    rows.push({});

    const sections = [
      { title: "Mechanical", data: mto.mechanical || [] },
      { title: "Electrical", data: mto.electrical || [] },
      { title: "Plumbing", data: mto.plumbing || [] },
    ];

    let materialTotal = 0;

    sections.forEach(section => {
      rows.push({
        Discipline: section.title,
      });

      section.data.forEach(row => {
        const total =
          Number(row.qty || 0) *
          Number(row.rate || 0);

        materialTotal += total;

        rows.push({
          Item: row.item,
          Qty: row.qty,
          Unit: row.unit,
          Rate: row.rate,
          Total: total,
        });
      });

      rows.push({});
    });

    rows.push({
      Item: "Material Total",
      Total: materialTotal,
    });

    rows.push({
      Item: "Delivery Fee",
      Total: calculateDeliveryFee(),
    });

    rows.push({
      Item: "Grand Total",
      Total: materialTotal + calculateDeliveryFee(),
    });

    const ws = XLSX.utils.json_to_sheet(rows);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      "Purchase Order"
    );

    XLSX.writeFile(
      wb,
      `${formData.projectName || "PO"}_Purchase_Order.xlsx`
    );
  };

  const exportToPDF = () => {
    const mto = mtoList.find(m => m.id === selectedMtoId);

    if (!mto) {
      setError("Please select an MTO.");
      return;
    }

    const doc = new jsPDF("landscape");

    doc.setFontSize(16);
    doc.text("PURCHASE ORDER", 14, 15);

    doc.setFontSize(10);

    doc.text(
      `Project: ${formData.projectName}`,
      14,
      25
    );

    doc.text(
      `MTO: ${mto.title}`,
      14,
      31
    );

    doc.text(
      `Recipient: ${formData.recipientAddress}`,
      14,
      37
    );

    doc.text(
      `Phone: ${formData.recipientPhone}`,
      14,
      43
    );

    doc.text(
      `Delivery: ${formData.deliveryLocation}`,
      14,
      49
    );

    const sections = [
      {
        title: "Mechanical",
        rows: mto.mechanical || [],
      },
      {
        title: "Electrical",
        rows: mto.electrical || [],
      },
      {
        title: "Plumbing",
        rows: mto.plumbing || [],
      },
    ];

    let y = 58;
    let materialTotal = 0;

    sections.forEach(section => {
      if (!section.rows.length) return;

      doc.setFontSize(12);
      doc.text(section.title, 14, y);

      const body = section.rows.map((r, i) => {
        const total =
          Number(r.qty || 0) *
          Number(r.rate || 0);

        materialTotal += total;

        return [
          i + 1,
          r.item,
          r.qty,
          r.unit,
          r.rate,
          total,
        ];
      });

      autoTable(doc, {
        startY: y + 3,
        head: [[
          "#",
          "Item",
          "Qty",
          "Unit",
          "Rate",
          "Total",
        ]],
        body,
        styles: {
          fontSize: 8,
        },
      });

      y = doc.lastAutoTable.finalY + 10;
    });

    const deliveryFee = calculateDeliveryFee();

    doc.text(
      `Material Total: ${materialTotal.toLocaleString()}`,
      14,
      y
    );

    doc.text(
      `Delivery Fee: ${deliveryFee.toLocaleString()}`,
      14,
      y + 8
    );

    doc.text(
      `Grand Total: ${(materialTotal + deliveryFee).toLocaleString()}`,
      14,
      y + 16
    );

    doc.save(
      `${formData.projectName || "PO"}_Purchase_Order.pdf`
    );
  };

  // ----------------------------
  // Reset form
  const resetForm = () => {
    setFormData({
      projectName: "",
      staffAssigned: [],
      tableData: [],
      sentToSupplier: false,
      recipientAddress: "",
      recipientPhone: "",
      deliveryLocation: "Lagos",
    });
    setMtoTables([]);
    setEditingId(null);
  };

  // ----------------------------
  // Edit existing PO
  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      projectName: item.projectName,
      staffAssigned: item.staffAssigned,
      tableData: item.tableData || [],
      sentToSupplier: item.sentToSupplier || false,
    });
  };

  // ----------------------------
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this PO?")) return;

    await deletePO(companyId, id);
    const updated = await getPOs(companyId);
    setSavedPO(updated);
    setPos(prev => prev.filter(t => t.id !== id));
  };


  const canModifyLead = (item) => {
    if (!user) return false;

    const isCeo = (role || "").toLowerCase() === "ceo";

    const isOwner = item.createdBy?.uid === user.uid;

    return isCeo || isOwner;
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

  // ----------------------------
  // RENDER
  return (
    <div className="container mt-4">
      <h2 className="mb-3">Purchase Orders</h2>

      {/* FORM CARD */}
      <div className="card p-3 mb-4">

        {/* Project Name */}
        <div className="mb-3">
          <label className="form-label">Project Name</label>
          <select
            className="form-select"
            value={formData.projectName}
            onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
          >
            <option value="">-- Select Project --</option>
            {projectList.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label">Select MTO</label>
          <select
            className="form-select"
            value={selectedMtoId}
            onChange={(e) => {
              const mtoId = e.target.value;
              setSelectedMtoId(mtoId);

              const mto = mtoList.find(m => m.id === mtoId);
              if (!mto) return;

              setFormData(f => ({
                ...f,
                tableData: mto.tableData || [],
              }));
            }}
          >
            <option value="">-- Select MTO --</option>

            {mtoList.map(m => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>

        {/* Staff Selector */}
        <div className="mb-3">
          <label className="form-label">Staff Assigned</label>
          <StaffSelector
            options={getRolesForSelector()}
            value={formData.staffAssigned}
            onChange={uids =>
              setFormData(prev => ({ ...prev, staffAssigned: uids }))
            }
          />
        </div>

        {/* DELIVERY DETAILS */}
        <div className="card p-3 mb-3 bg-light">
          <h5 className="mb-3">Delivery Information</h5>

          {/* Recipient Address */}
          <div className="mb-3">
            <label className="form-label">Recipient Address</label>

            <textarea
              className="form-control"
              rows={3}
              value={formData.recipientAddress}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  recipientAddress: e.target.value,
                })
              }
            />
          </div>

          {/* Recipient Phone */}
          <div className="mb-3">
            <label className="form-label">
              Recipient Contact Number
            </label>

            <input
              type="text"
              className="form-control"
              value={formData.recipientPhone}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  recipientPhone: e.target.value,
                })
              }
            />
          </div>

          {/* Delivery Location */}
          <div className="mb-2">
            <label className="form-label d-block">
              Delivery Location
            </label>

            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="radio"
                name="deliveryLocation"
                checked={formData.deliveryLocation === "Lagos"}
                onChange={() =>
                  setFormData({
                    ...formData,
                    deliveryLocation: "Lagos",
                  })
                }
              />

              <label className="form-check-label">
                Lagos
              </label>
            </div>

            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="radio"
                name="deliveryLocation"
                checked={formData.deliveryLocation === "Other States"}
                onChange={() =>
                  setFormData({
                    ...formData,
                    deliveryLocation: "Other States",
                  })
                }
              />

              <label className="form-check-label">
                Other States
              </label>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        {/* Save + Send to Supplier */}
        <div className="d-flex gap-2">

          <button
            className="btn btn-success"
            onClick={handleSendToMarketplace}
          >
            Send PO to Marketplace
          </button>

          <button
            className="btn btn-outline-success"
            onClick={exportToExcel}
          >
            Export Excel
          </button>

          <button
            className="btn btn-outline-danger"
            onClick={exportToPDF}
          >
            Export PDF
          </button>

        </div>
      </div>

      {/* SAVED PURCHASE ORDERS */}
      <h4>Saved Purchase Orders</h4>

      <table className="table table-striped">
        <thead>
          <tr>
            <th>Created By</th>
            <th>PO ID</th>
            <th>Project</th>
            <th>MTO</th>
            <th>Staff Assigned</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {savedPO.map(item => {
            const allowed = canModifyLead(item);
            return (
              <tr key={item.id}>
                <td>{item.createdBy?.name || "--"}</td>
                <td className="fw-semibold">{item.poId}</td>
                <td>{item.projectName}</td>
                <td>{item.mtoTitle}</td>
                <td>
                  {(item.staffAssigned || [])
                    .map(uid => staffNameMap[uid] || uid)
                    .join(", ")}
                </td>
                <td>
                  {item.createdAt?.seconds
                    ? new Date(item.createdAt.seconds * 1000).toLocaleString()
                    : "--"}
                </td>
                <td>
                  <button
                    className="btn-delete"
                    onClick={() => allowed && handleDelete(item.id)}
                    disabled={!allowed}
                    style={{
                      opacity: allowed ? 1 : 0.5,
                      cursor: allowed ? "pointer" : "not-allowed"
                    }}
                  >
                    Delete
                  </button>

                  {!item.sentToMarketplace && (
                    <button
                      className="btn-edit"
                      onClick={() => allowed && handleEdit(item)}
                      disabled={!allowed}
                      style={{
                        opacity: allowed ? 1 : 0.5,
                        cursor: allowed ? "pointer" : "not-allowed"
                      }}
                    >
                      Inform Marketplace
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {savedPO.length === 0 && (
        <p className="text-center mt-3">No purchase orders yet.</p>
      )}
    </div>
  );
}
