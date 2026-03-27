// src/pages/marketplace/Marketplace.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { generatePoPdf } from "../../helpers/generatePoPdf";
import { generateInvoicePdfBlob } from "../../helpers/generateInvoicePdfBlob";
import MultiUploadWithDelete from "../leads/LeadsFileUpload";

export default function Marketplace() {
  const { companyId, userRole } = useAuth();
  const [invoiceFiles, setInvoiceFiles] = useState({});
  const [paymentNotice, setPaymentNotice] = useState(
    "Please ensure payment is made within 7 working days."
  );
  const [activePaymentPo, setActivePaymentPo] = useState(null);
  const [poList, setPoList] = useState([]);
  const [tracking, setTracking] = useState({});

  /* -----------------------------
     Load Purchase Orders
  ----------------------------- */
  useEffect(() => {
    if (!companyId) return;

    const loadPOs = async () => {
      const snap = await getDocs(
        collection(db, "companies", companyId, "purchaseOrders")
      );

      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(po => po.sentToMarketplace);

      setPoList(
        data.sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        )
      );

      const track = {};
      data.forEach(po => {
        track[po.id] = po.tracking || {};
      });

      setTracking(track);

      const invoiceMap = {};
      data.forEach(po => {
        if (po.invoiceFiles) {
          invoiceMap[po.poId] = po.invoiceFiles;
        }
      });
      setInvoiceFiles(invoiceMap);
    };


    loadPOs();


  }, [companyId]);

  /* -----------------------------
     BOQ LOAER FUNCTON
  ----------------------------- */
  const downloadPoPdf = async (po) => {
    if (!po.boqId) {
      alert("BOQ not linked to this PO");
      return;
    }

    const boqRef = doc(
      db,
      "companies",
      companyId,
      "boqs",
      po.boqId
    );

    const snap = await getDoc(boqRef);

    if (!snap.exists()) {
      alert("BOQ not found");
      return;
    }

    const boq = snap.data();

    generatePoPdf({
      po,
      boq,
    });
  };
  /* -----------------------------
       Invoice pdf downloader
    ----------------------------- */
  const downloadInvoicePdf = async (po) => {
    if (!po.boqId) {
      alert("BOQ not linked to this PO");
      return;
    }

    const boqRef = doc(db, "companies", companyId, "boqs", po.boqId);
    const snap = await getDoc(boqRef);

    if (!snap.exists()) {
      alert("BOQ not found");
      return;
    }

    const boq = snap.data();

    const blob = generateInvoicePdfBlob({ po, boq });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `INV-${po.poId}.pdf`;

    document.body.appendChild(link);
    link.click();
    link.remove();
  };


  /* -----------------------------
     Toggle tracking slider
  ----------------------------- */
  const toggleTracking = async (po, field) => {
    const poId = po.id;

    const current = tracking[poId] || {};

    const updated = {
      ...current,
      [field]: !current[field],
    };

    setTracking(prev => ({ ...prev, [poId]: updated }));

    const ref = doc(
      db,
      "companies",
      companyId,
      "purchaseOrders",
      poId
    );

    await updateDoc(ref, { tracking: updated });
  };
  /* -----------------------------
       Update Invoice Helper for one PO
    ----------------------------- */
  const updateInvoiceFiles = async (poId, files) => {
    const safeFiles = files
      .filter(f => !f.__pendingFile)
      .map(f => ({
        name: f.name,
        url: f.url,
        fileId: f.fileId,
      }));

    setInvoiceFiles(prev => ({ ...prev, [poId]: safeFiles }));

    await updateDoc(
      doc(db, "companies", companyId, "purchaseOrders", poId),
      { invoiceFiles: safeFiles }
    );
  };




  /* -----------------------------
     Generate Invoice (placeholder)
  ----------------------------- */
  const generateInvoice = async (po) => {
    if (!po.boqSnapshot) return alert("BOQ Snapshot missing in PO");

    const blob = generateInvoicePdfBlob({ po, boq: po.boqSnapshot });
    const file = new File([blob], `INV-${po.poId}.pdf`, { type: "application/pdf" });

    // Mark as pending file for MultiUploadWithDelete
    updateInvoiceFiles(po.poId, [
      ...(invoiceFiles[po.poId] || []),
      { __pendingFile: file },
    ]);
  };

  /* -----------------------------
     Upload receipt (placeholder)
  ----------------------------- */
  const uploadReceipt = (poId, file) => {
    alert(`Receipt uploaded for PO ${poId}`);
  };

  /* -----------------------------
     JSX
  ----------------------------- */
  return (
    <div className="container py-4">
      <h2 className="mb-4">Marketplace</h2>

      {/* NOTICEBOARD */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <h5>Payment Instructions</h5>
          <textarea
            className="form-control"
            rows="3"
            value={paymentNotice}
            onChange={(e) => setPaymentNotice(e.target.value)}
          />
        </div>
      </div>

      {/* PO TABLE */}
      <div className="card shadow-sm mb-5">
        <div className="card-body">
          <h5 className="mb-3">Purchase Orders</h5>

          <table className="table table-bordered table-hover">
            <thead className="table-light">
              <tr>
                <th>#</th>
                <th>Company ID</th>
                <th>PO ID</th>
                <th>PO Download</th>
                <th>Invoice Download</th>
                <th>Payment Receipt</th>
              </tr>
            </thead>

            <tbody>
              {poList.length ? poList.map((po, idx) => (
                <tr key={po.id}>
                  <td>{idx + 1}</td>
                  <td>{po.companyId}</td>
                  <td>{po.poId}</td>

                  {/* PO DOWNLOAD */}
                  <td>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => downloadPoPdf(po)}
                    >
                      ⬇ Download PO
                    </button>
                  </td>

                  {/* ✅ AUTO INVOICE DOWNLOAD */}
                  <td>
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => downloadInvoicePdf(po)}
                    >
                      ⬇ Download Invoice
                    </button>
                  </td>

                  {/* ✅ PAYMENT RECEIPT BUTTON */}
                  <td>
                    <button
                      className="btn btn-sm btn-warning"
                      onClick={() => setActivePaymentPo(po.poId)}
                    >
                      Pay Now
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="text-center">
                    No purchase orders available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ITEM TRACKING */}
      {["developer", "app_support", "market_agent"].includes(userRole) && (
        <div className="card shadow-sm">
          <div className="card-body">
            <h5 className="mb-3">Item Tracking</h5>

            <table className="table table-bordered">
              <thead className="table-light">
                <tr>
                  <th>PO ID</th>
                  <th>Order Received</th>
                  <th>Warehouse</th>
                  <th>Packaged</th>
                  <th>Dispatched</th>
                  <th>Received at Site</th>
                </tr>
              </thead>

              <tbody>
                {poList.map(po => (
                  <tr key={po.poId}>
                    <td>{po.poId}</td>

                    {[
                      "received",
                      "warehouse",
                      "packaged",
                      "dispatched",
                      "site",
                    ].map(field => (
                      <td key={field} className="text-center">
                        <div className="form-check form-switch d-flex justify-content-center">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={tracking[po.id]?.[field] || false}
                            onChange={() => toggleTracking(po, field)}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

          </div>
        </div>
      )}
      {activePaymentPo && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "#000000aa",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              position: "relative",
              width: "90%",
              height: "90%",
              margin: "2% auto",
              background: "#fff",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setActivePaymentPo(null)}
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
              src="https://paystack.shop/pay/5x75qlfimg"
              title="Paystack Payment"
              width="100%"
              height="100%"
              style={{ border: "none" }}
            />
          </div>
        </div>
      )
      }
    </div >
  );
}
