// src/pages/marketplace/Marketplace.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  collection,
  addDoc,
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
import { usePaystackPayment } from "react-paystack";
import {
  saveOrder,
  updateStockAfterOrder,
  markPoAsPaid,
} from "../../firebase/marketplaceService";

export default function Marketplace() {
  const { companyId, user, userData } = useAuth();
  const [invoiceFiles, setInvoiceFiles] = useState({});
  const [paymentNotice, setPaymentNotice] = useState(
    "Please ensure payment is made within 7 working days."
  );
  const [activePaymentPo, setActivePaymentPo] = useState(null);
  const [poList, setPoList] = useState([]);
  const [tracking, setTracking] = useState({});
  const [editingProductId, setEditingProductId] = useState(null);
  const [editStock, setEditStock] = useState({});
  const role = userData?.role?.toLowerCase();

  // ===============================
  // 🆕 STORE STATE
  // ===============================
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    name: "",
    stock: "",
    price: "",
    description: "",
    image: "",
    unitKg: "",
  });

  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [checkout, setCheckout] = useState({ address: "", phone: "" });
  const [qtySelection, setQtySelection] = useState({});
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  //const [activeCheckout, setActiveCheckout] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState("lagos");

  const payWithPaystack = (config, onSuccess) => {
    if (!window.PaystackPop) {
      alert("Paystack not loaded");
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

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  // const checkoutconfig = {
  //   reference: "ORDER_" + Date.now(),
  //   email: userData.email,
  //   amount: total * 100,
  //   publicKey: "pk_live_6a2efdfc277c468b57e70f6462c7c330181d1d6c",
  // };

  // const initializeCheckoutPayment = usePaystackPayment(checkoutConfig);

  // Payment handler for Checkout
  const handlePaymentAndCheckout = () => {
    if (!checkout.address || !checkout.phone) {
      alert("Fill delivery details");
      return;
    }

    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }

    if (!total || total <= 0) {
      alert("Invalid amount");
      return;
    }

    payWithPaystack(
      {
        reference: "ORDER_" + Date.now(),
        email: userData.email,
        amount: grandTotal * 100, //i replaced amount with grandtotal
        //key: "pk_live_6a2efdfc277c468b57e70f6462c7c330181d1d6c",
        key: "pk_test_e0ccd9771cc0086a1290ff5fd46ee1431bb64e4a",
        type: "checkout",
      },
      (response) => {
        console.log("✅ Checkout success:", response);
        handleCheckout(response.reference);
      }
    );

  };

  const handlePoPayment = (po) => {
    const amount = Number(po.totalAmount || po.boqSnapshot?.total || 0);

    console.log("PO DEBUG:", po);
    console.log("AMOUNT:", amount);
    console.log("TOTAL AMOUNT RAW:", po.totalAmount);
    console.log("BOQ SNAPSHOT:", po.boqSnapshot);

    if (!amount || isNaN(amount) || amount <= 0) {
      alert("Invalid PO amount");
      return;
    }

    if (!userData?.email) {
      alert("User email missing");
      return;
    }

    payWithPaystack(
      {
        reference: "PO_" + Date.now(),
        email: userData.email,
        amount: grandTotal * 100, //i replaced amount with grandtotal
        //key: "pk_live_6a2efdfc277c468b57e70f6462c7c330181d1d6c",
        key: "pk_test_e0ccd9771cc0086a1290ff5fd46ee1431bb64e4a",
        type: "purchase_order",
      },
      async (response) => {
        console.log("✅ PO success:", response);

        await markPoAsPaid({
          companyId: po.companyId,
          poId: po.id,
          paymentRef: response.reference,
          amount: amount,
        });
        // await updateDoc(
        //   doc(db, "companies", po.companyId, "purchaseOrders", po.id),
        //   {
        //     paymentStatus: true,
        //     paymentRef: response.reference,
        //   }
        // );

        console.log({
          email: userData.email,
          amount: grandTotal * 100, //i replaced amount with grandtotal
          reference: "PO_" + Date.now(),
        });

        setPoList(prev =>
          prev.map(p =>
            p.id === po.id ? { ...p, paymentStatus: true } : p
          )
        );
      }
    );
  };


  const loadProducts = async () => {
    const snap = await getDocs(
      collection(db, "products")
    );

    const data = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    setProducts(data);

    // initialize qty
    const qtyInit = {};
    data.forEach(p => {
      qtyInit[p.id] = 0;
    });
    setQtySelection(qtyInit);
  };

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
        invoiceMap[po.id] = po.invoiceFiles;
      }
    });
    setInvoiceFiles(invoiceMap);
  };

  /* -----------------------------
     Load Purchase Orders
  ----------------------------- */
  useEffect(() => {
    if (!companyId && role !== "developer") return;
    setLoading(true);
    const loadData = async () => {
      if (role === "developer") {

        await loadAllPOs();
        await loadAllOrders();
        await loadProducts(); // optional: global products later
      } else {
        await loadPOs();       // your existing function
        await loadOrders();    // your existing function
        await loadProducts();
      }
      setLoading(false);
    };


    loadData();
  }, [companyId, role]);

  //LOAD ALL PURCHASE ORDERS (DEVELOPER)
  const loadAllPOs = async () => {
    const companiesSnap = await getDocs(collection(db, "companies"));

    let allPOs = [];
    let track = {};

    for (const company of companiesSnap.docs) {
      const companyId = company.id;
      const companyName = company.data().companyName || "--";

      const poSnap = await getDocs(
        collection(db, "companies", companyId, "purchaseOrders")
      );

      const poData = poSnap.docs.map(d => ({
        id: d.id,
        companyId,
        companyName,
        paymentStatus: d.data().paymentStatus || false,
        ...d.data(),
      })).filter(po => po.sentToMarketplace);

      allPOs = [...allPOs, ...poData];

      poData.forEach(po => {
        track[po.id] = po.tracking || {};
      });
    }

    setPoList(
      allPOs.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      )
    );

    setTracking(track);
  };

  //LOAD ALL ORDERS (DEVELOPER)
  const loadAllOrders = async () => {
    try {
      const companiesSnap = await getDocs(collection(db, "companies"));

      let allOrders = [];

      for (const company of companiesSnap.docs) {
        const companyId = company.id;
        const companyName = company.data().companyName || "--";

        const orderSnap = await getDocs(
          collection(db, "companies", companyId, "orders")
        );

        const orderData = orderSnap.docs.map(d => ({
          id: d.id,
          companyId,
          companyName,
          ...d.data(),
          date: d.data().createdAt?.toDate?.().toLocaleString() || "--",
        }));

        allOrders = [...allOrders, ...orderData];
      }
      // Optional: sort latest first
      allOrders.sort(
        (a, b) =>
          (b.createdAt?.seconds || 0) -
          (a.createdAt?.seconds || 0)
      );

      setOrders(allOrders);
    } catch (err) {
      console.error("🔥 Error loading all orders:", err);
    }
  };

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
    link.download = `INV-${po.id}.pdf`;

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
      po.companyId,
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
    const totalAmount =
      po.boqSnapshot?.total ||
      po.totalAmount ||
      0;

    await updateDoc(
      doc(db, "companies", companyId, "purchaseOrders", po.id),
      {
        invoiceFiles: [], // optional
        invoiceTotal: totalAmount, // 👈 THIS IS WHERE IT GOES
      }
    );
    const file = new File([blob], `INV-${po.id}.pdf`, { type: "application/pdf" });

    // Mark as pending file for MultiUploadWithDelete
    updateInvoiceFiles(po.id, [
      ...(invoiceFiles[po.id] || []),
      { __pendingFile: file },
    ]);
  };

  /* -----------------------------
     Upload receipt (placeholder)
  ----------------------------- */
  const uploadReceipt = (poId, file) => {
    alert(`Receipt uploaded for PO ${poId}`);
  };

  // ===============================
  // 🆕 STORE FUNCTIONS
  // ===============================
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addProduct = async () => {
    if (!form.name || !form.stock || !form.price) return;

    try {
      const newProduct = {
        name: form.name,
        stock: Number(form.stock),
        price: Number(form.price),
        description: form.description || "",
        unitKg: Number(form.unitKg || 0), // ✅ NEW
        image: form.image || "",
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(db, "products"),
        newProduct
      );

      setProducts([
        ...products,
        { id: docRef.id, ...newProduct },
      ]);

      setQtySelection((prev) => ({ ...prev, [docRef.id]: 0 }));

      setForm({ name: "", stock: "", price: "", unitKg: "", description: "", image: "" });

    } catch (err) {
      console.error("🔥 Error adding product:", err);
    }
  };



  const updateStoreQty = (id, change, stock) => {
    const current = qtySelection[id] || 0;
    let next = current + change;

    if (next < 0) next = 0;
    if (next > stock) next = stock;

    setQtySelection({ ...qtySelection, [id]: next });
  };

  const addToCart = (product) => {
    const selectedQty = qtySelection[product.id] || 0;
    if (selectedQty <= 0) return;

    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      const newQty = Math.min(existing.qty + selectedQty, product.stock);
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, qty: newQty } : item
        )
      );
    } else {
      setCart([...cart, { ...product, unitKg: product.unitKg || 0, // ✅ ensure it exists
       qty: selectedQty }]);
    }

    setQtySelection({ ...qtySelection, [product.id]: 0 });
  };

  const updateCartQty = (id, change) => {
    setCart(
      cart
        .map((item) => {
          if (item.id === id) {
            const newQty = item.qty + change;
            if (newQty <= 0) return null;
            if (newQty > item.stock) return item;
            return { ...item, qty: newQty };
          }
          return item;
        })
        .filter(Boolean)
    );
  };


  const handleCheckout = async (paymentRef) => {
    try {
      const newOrder = await saveOrder({
        companyId,
        cart,
        total: grandTotal,
        deliveryFee,
        deliveryLocation,
        address: checkout.address,
        phone: checkout.phone,
        paymentRef,
      });

      await updateStockAfterOrder(cart);

      setOrders((prev) => [
        {
          id: newOrder.id,
          ...newOrder,
          date: new Date().toLocaleString(),
        },
        ...prev,
      ]);

      setCart([]);
      setCheckout({ address: "", phone: "" });

      alert("Order saved successfully!");

      await loadProducts();
    } catch (err) {
      console.error("🔥 Checkout error:", err);
    }
  };
  // const handleCheckout = async (paymentRef) => {
  //   if (!checkout.address || !checkout.phone) {
  //     alert("Fill delivery details");
  //     return;
  //   }

  //   try {
  //     // Save order to Firestore
  //     const orderData = {
  //       items: cart,
  //       total,
  //       address: checkout.address,
  //       phone: checkout.phone,
  //       paymentRef: paymentRef,
  //       paymentStatus: "paid",
  //       createdAt: serverTimestamp(),
  //     };

  //     const docRef = await addDoc(
  //       collection(db, "companies", companyId, "orders"),
  //       orderData
  //     );

  //     // Update stock in Firestore
  //     for (const item of cart) {
  //       const productRef = doc(
  //         db,
  //         "products",
  //         item.id
  //       );

  //       const snap = await getDoc(productRef);

  //       if (!snap.exists()) continue;

  //       const currentStock = Number(snap.data().stock || 0);
  //       const newStock = Math.max(0, currentStock - item.qty);

  //       await updateDoc(productRef, {
  //         stock: newStock,
  //       });
  //     }

  //     // Update local state
  //     const newOrder = {
  //       id: docRef.id,
  //       ...orderData,
  //       date: new Date().toLocaleString(),
  //     };

  //     setOrders([newOrder, ...orders]);
  //     setCart([]);
  //     setCheckout({ address: "", phone: "" });

  //     alert("Order saved successfully!");

  //   } catch (err) {
  //     console.error("🔥 Checkout error:", err);
  //   }
  //   await loadProducts();
  // };

  const toggleEditProduct = (product) => {
    if (editingProductId === product.id) {
      setEditingProductId(null);
    } else {
      setEditingProductId(product.id);
      setEditStock({
        ...editStock,
        [product.id]: product.stock,
      });
    }
  };

  const changeEditStock = (id, change) => {
    const current = editStock[id] || 0;
    const next = Math.max(0, current + change);

    setEditStock({
      ...editStock,
      [id]: next,
    });
  };

  const saveStockUpdate = async (product) => {
    const newStock = editStock[product.id];

    const ref = doc(
      db,
      "products",
      product.id
    );

    await updateDoc(ref, { stock: newStock });

    setEditingProductId(null);
    await loadProducts();
  };

  const loadOrders = async () => {
    try {
      const companySnap = await getDoc(doc(db, "companies", companyId));
      const companyName = companySnap.exists() ? companySnap.data().companyName : "--";

      const snap = await getDocs(
        collection(db, "companies", companyId, "orders")
      );


      const data = snap.docs.map(d => ({
        id: d.id,
        companyId,
        companyName,
        ...d.data(),
        date: d.data().createdAt?.toDate?.().toLocaleString() || "--"
      }));

      setOrders(data);
    } catch (err) {
      console.error("🔥 Error loading orders:", err);
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

  const totalWeight = cart.reduce(
    (sum, item) => sum + (item.unitKg || 0) * item.qty,
    0
  );

  let baseFee = 0;
  let perKg = 0;

  if (deliveryLocation === "lagos") {
    baseFee = 10000;
    perKg = 500;
  } else {
    baseFee = 90000;
    perKg = 2000;
  }

  const deliveryFee = baseFee + totalWeight * perKg;
  const grandTotal = total + deliveryFee;


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
                <th>Status</th>
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
                      onClick={() => handlePoPayment(po)}
                      disabled={po.paymentStatus}
                    >
                      {po.paymentStatus ? "Paid" : "Pay Now"}
                    </button>
                  </td>
                  <td className="text-center">
                    <div className="form-check form-switch d-flex justify-content-center">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={po.paymentStatus || false}
                        disabled
                      />
                    </div>
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
      {role && (
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
                  <tr key={po.id}>
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
                            onChange={() => {
                              if (!["developer", "app_support", "market_agent"].includes(role)) {
                                return; // read-only users cannot toggle
                              }
                              toggleTracking(po, field);
                            }}
                            disabled={!["developer", "app_support", "market_agent"].includes(role)}
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

      {/* ===============================
    🆕 STORE FRONT MODULE
================================ */}
      <div className="mt-5">
        <h3>Storefront</h3>

        {/* PRODUCT FORM */}
        {role === "developer" && (
          <div className="card p-3 mb-4">
            <h5>Add Product</h5>
            <div className="row g-2">
              <div className="col-md-3">
                <input className="form-control" name="name" placeholder="Name" value={form.name} onChange={handleChange} />
              </div>
              <div className="col-md-2">
                <input className="form-control" name="stock" placeholder="Stock" value={form.stock} onChange={handleChange} />
              </div>
              <div className="col-md-2">
                <input className="form-control" name="price" placeholder="Price" value={form.price} onChange={handleChange} />
              </div>
              <div className="col-md-2">
                <input className="form-control" name="unitKg" placeholder="Unit Kg" value={form.unitKg} onChange={handleChange} />
              </div>
              <div className="col-md-4">
                <input className="form-control" name="description" placeholder="Description" value={form.description} onChange={handleChange} />
              </div>
            </div>
            <button className="btn btn-primary mt-3" onClick={addProduct}>Add Product</button>
          </div>
        )}

        {/* STORE LIST */}
        <div className="row">
          {products.map((p) => (
            <div className="col-md-3 mb-3" key={p.id}>
              <div className="card h-100">
                <div className="card-body">
                  <h5>{p.name}</h5>
                  <p>{p.description}</p>
                  <p>Stock: {p.stock}</p>
                  <p>Price: ₦{p.price}</p>

                  <div className="d-flex gap-2 mb-2">
                    <button className="btn btn-secondary" onClick={() => updateStoreQty(p.id, -1, p.stock)}>-</button>
                    <span>{qtySelection[p.id] || 0}</span>
                    <button className="btn btn-secondary" onClick={() => updateStoreQty(p.id, 1, p.stock)}>+</button>
                  </div>

                  <button className="btn btn-success w-100" onClick={() => addToCart(p)}>
                    Add to Cart
                  </button>
                  {/* EDIT BUTTON (DEV ONLY) */}
                  {role === "developer" && (
                    <>
                      <button
                        className="btn btn-outline-secondary w-100 mt-2"
                        onClick={() => toggleEditProduct(p)}
                      >
                        {editingProductId === p.id ? "Close Edit" : "Edit Product"}
                      </button>

                      {editingProductId === p.id && (
                        <div className="mt-2 border p-2 rounded">
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <button
                              className="btn btn-secondary"
                              onClick={() => changeEditStock(p.id, -1)}
                            >
                              -
                            </button>

                            <span>{editStock[p.id]}</span>

                            <button
                              className="btn btn-secondary"
                              onClick={() => changeEditStock(p.id, 1)}
                            >
                              +
                            </button>
                          </div>

                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => saveStockUpdate(p)}
                            >
                              Update
                            </button>

                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => setEditingProductId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CART */}
        <button className="btn btn-dark mt-3" onClick={() => setShowCart(!showCart)}>
          Cart ({cart.length})
        </button>

        {showCart && (
          <div className="card p-3 mt-3">
            <h5>Cart</h5>

            {cart.map((item) => (
              <div key={item.id} className="d-flex justify-content-between">
                <div>{item.name} x {item.qty}</div>
                <div>
                  <button onClick={() => updateCartQty(item.id, -1)}>-</button>
                  <button onClick={() => updateCartQty(item.id, 1)}>+</button>
                </div>
              </div>
            ))}

            
            <div className="mb-2">
              <label className="me-3">
                <input
                  type="radio"
                  checked={deliveryLocation === "lagos"}
                  onChange={() => setDeliveryLocation("lagos")}
                />
                Lagos
              </label>

              <label>
                <input
                  type="radio"
                  checked={deliveryLocation === "others"}
                  onChange={() => setDeliveryLocation("others")}
                />
                Others
              </label>
            </div>

            {/* <h5>Total: ₦{total}</h5> */}
            <h5>Cart Total: ₦{total.toLocaleString()}</h5>
            <h6>Delivery Fee: ₦{deliveryFee.toLocaleString()}</h6>
            <h4>Grand Total: ₦{grandTotal.toLocaleString()}</h4>

            <input className="form-control mb-2" placeholder="Address"
              value={checkout.address}
              onChange={(e) => setCheckout({ ...checkout, address: e.target.value })}
            />

            <input className="form-control mb-2" placeholder="Phone"
              value={checkout.phone}
              onChange={(e) => setCheckout({ ...checkout, phone: e.target.value })}
            />

            {/* Checkout Button */}
            <button className="btn btn-primary" onClick={handlePaymentAndCheckout}>
              Checkout
            </button>

            {/* Payment Modal
            {activeCheckout && (
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
                    onClick={() => setActiveCheckout(false)}
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

                  {/* Iframe for Paystack Payment 
                  <iframe
                    src="https://paystack.shop/pay/5x75qlfimg"
                    title="Paystack Payment"
                    width="100%"
                    height="100%"
                    style={{ border: "none" }}
                    onLoad={() => {
                      // You might need a listener from your Paystack integration here
                      // For example, check if payment succeeded
                    }}
                  />
                </div>
              </div>
            )} 
            */}
          </div>
        )}

        {/* ORDERS */}
        <div className="mt-4">
          <h5>Orders</h5>
          <table className="table table-bordered">
            <thead className="table-light">
              <tr>
                <th>Company</th>
                <th>Date</th>
                <th>Items + Qty + Unit Price</th>
                <th>Total</th>
                <th>Address</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.companyName}</td>
                  <td>{o.date}</td>

                  <td>
                    {o.items.map((i) => (
                      <div key={i.id}>
                        {i.name} — Qty: {i.qty} — ₦{i.price}
                      </div>
                    ))}
                  </td>

                  <td>₦{o.total}</td>
                  <td>{o.address}</td>
                  <td>{o.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div >
  );
}
