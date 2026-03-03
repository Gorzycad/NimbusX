import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getBOQs } from "../../firebase/boqService";
import { addPO, getPOs, updatePO, deletePO } from "../../firebase/poService";
import { getLeads } from "../../firebase/leadsService";
import StaffSelector from "../../components/layout/StaffSelector";
import { getRolesForSelector } from "../../config/roleAccess";
import { getBoqs } from "../../firebase/boqService";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { notifyAssignedStaff } from "../leads/LeadsListHelper";
import { serverTimestamp } from "firebase/firestore";
import { useMemo } from "react";


function cleanData(data) {
  return Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
}

// ---------------------------- //
export default function PurchaseOrderPage() {
  const { companyId, user } = useAuth();
  const [pos, setPos] = useState([]);
  const [boqTitle, setBoqTitle] = useState("");
  const [boqId, setBoqId] = useState(null);
  const [projectList, setProjectList] = useState([]);
  const [mtoTables, setMtoTables] = useState([]);
  const [savedPO, setSavedPO] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [boqList, setBoqList] = useState([]);
  const [selectedBoqId, setSelectedBoqId] = useState("");
  const [staffList, setStaffList] = useState([]);

  /* ---------------- LOAD STAFF ---------------- */
  useEffect(() => {
    if (!companyId) return;

    const loadStaff = async () => {
      const snap = await getDocs(
        collection(db, "companies", companyId, "users")
      );

      setStaffList(
        snap.docs.map(d => ({ id: d.id, ...d.data() }))
      );
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
      setBoqList([]);
      setSelectedBoqId("");
      return;
    }

    const loadBoqs = async () => {
      const allBoqs = await getBoqs(companyId);

      const filtered = allBoqs.filter(
        b => b.projectName === formData.projectName
      );

      setBoqList(filtered);
    };

    loadBoqs();
  }, [formData.projectName, companyId]);

  //Generate PO ID
  function generatePOId() {
    const year = new Date().getFullYear();
    return `PO-${year}-${Math.floor(100000 + Math.random() * 900000)}`;
  }


  // ----------------------------
  // Handle table edits
  const updateCell = (index, key, value) => {
    const updated = [...formData.tableData];
    updated[index][key] = value;
    setFormData({ ...formData, tableData: updated });
  };

  const addRow = () => {
    const newRow = { description: "", qty: "", unit: "", rate: "", total: "" };
    setFormData({ ...formData, tableData: [...formData.tableData, newRow] });
  };

  const removeRow = (i) => {
    const updated = formData.tableData.filter((_, idx) => idx !== i);
    setFormData({ ...formData, tableData: updated });
  };

  // ----------------------------
  // SEND TO SUPPLIER BUTTON
  const handleSendToMarketplace = async () => {
    if (!formData.projectName) return alert("Select project");
    if (!boqId) return alert("Select BOQ");

    const creatorName = staffNameMap[user.uid] || "Unknown User";
    const poId = generatePOId();
    const boq = boqList.find(b => b.id === boqId);

    // Clean formData BEFORE sending it to Firestore
    const cleanedFormData = {
      ...cleanData(formData),
      staffAssigned: staffAssignedIds, // store IDs, not names

    };

    const payload = {
      companyId,
      poId,
      projectName: formData.projectName,
      boqId,
      boqTitle,

      staffAssigned: formData.staffAssigned,
      boqSnapshot: {
        mechanical: boq.mechanical || [],
        electrical: boq.electrical || [],
        plumbing: boq.plumbing || [],
      },
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






    //await addPO(companyId, payload);
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
    // setSavedPO(await getPOs(companyId));
    resetForm();

    setPos(prev =>
      [...(prev || [])].sort(
        (a, b) =>
          (b.createdAt?.seconds || 0) -
          (a.createdAt?.seconds || 0)
      )
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

  const getStaffNamesFromIds = (ids = []) => {
    return ids
      .map((uid) => {
        const user = staffList.find((u) => u.id === uid);
        return user ? `${user.firstName} ${user.lastName}` : uid;
      })
      .join(", ");
  };
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
          <label className="form-label">Select BOQ</label>
          <select
            className="form-select"
            value={selectedBoqId}
            onChange={(e) => {
              const boqId = e.target.value;
              setSelectedBoqId(boqId);

              const boq = boqList.find(b => b.id === boqId);
              if (!boq) return;
              if (!boqId) return alert("Please select a BOQ");

              setFormData(f => ({
                ...f,
                tableData: boq.tableData || [],
              }));

              setBoqTitle(boq.title);
              setBoqId(boq.id);
            }}
          >
            <option value="">-- Select BOQ --</option>
            {boqList.map(b => (
              <option key={b.id} value={b.id}>
                {b.title}
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

        {/* Save + Send to Supplier */}
        <div>
          <button className="btn btn-success" onClick={handleSendToMarketplace}>
            Send PO to Marketplace
          </button>

        </div>
      </div>

      {/* SAVED PURCHASE ORDERS */}
      <h4>Saved Purchase Orders</h4>

      <table className="table table-striped">
        <thead>
          <tr>
            <th>PO ID</th>
            <th>Project</th>
            <th>BOQ</th>
            <th>Staff Assigned</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {savedPO.map(item => (
            <tr key={item.id}>
              <td className="fw-semibold">{item.poId}</td>
              <td>{item.projectName}</td>
              <td>{item.boqTitle}</td>
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
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(item.id)}
                >
                  Delete
                </button>

                {!item.sentToMarketplace && (
                  <button
                    className="btn btn-info btn-sm"
                    onClick={() => handleEdit(item)}
                  >
                    Inform Marketplace
                  </button>
                )}
              </td>
            </tr>

          ))}
        </tbody>
      </table>

      {savedPO.length === 0 && (
        <p className="text-center mt-3">No purchase orders yet.</p>
      )}
    </div>
  );
}
