// src/pages/marketplace/Marketplace.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { collection, addDoc, getDocs, getDoc, doc, updateDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { generatePoPdf } from "../../helpers/generatePoPdf";
import { generateInvoicePdfBlob } from "../../helpers/generateInvoicePdfBlob";
import { saveOrder, updateStockAfterOrder, markPoAsPaid } from "../../firebase/marketplaceService";
import { uploadFileToDrive } from "../../helpers/uploadFileToDrive";

export default function Marketplace() {
  const { companyId, user, userData } = useAuth();
  const [, setInvoiceFiles] = useState({});
  const [activePaymentPo, setActivePaymentPo] = useState(null);
  const [poList, setPoList] = useState([]);
  const [tracking, setTracking] = useState({});
  const role = userData?.role?.toLowerCase();
  const [deliveryLocation, setDeliveryLocation] = useState("Lagos");
  const [productImages, setProductImages] = useState({});
  const [orderTracking, setOrderTracking] = useState({});
  const [, setError] = useState("");

  // ===============================
  // 🆕 STORE STATE
  // ===============================
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    serialNo: "",
    name: "",
    stock: "",
    price: "",
    unit: "",
    description: "",
    imageFileId: "",
    unitKg: "",
    discipline: "mechanical",
  });

  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [checkout, setCheckout] = useState({ address: "", phone: "" });
  const [qtySelection, setQtySelection] = useState({});
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openGroups, setOpenGroups] = useState({
    mechanical: true,
    electrical: false,
    plumbing: false,
  });

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

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  // Payment handler for Checkout
  const handlePaymentAndCheckout = () => {
    if (!checkout.address || !checkout.phone) {
      setError("Fill delivery details");
      return;
    }

    if (cart.length === 0) {
      setError("Cart is empty");
      return;
    }

    if (!total || total <= 0) {
      setError("Invalid amount");
      return;
    }

    payWithPaystack(
      {
        reference: "ORDER_" + Date.now(),
        email: userData?.email || user?.email,
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
    const amount = Number(po.grandTotal || 0);
    console.log("PO DEBUG:", po);
    console.log("AMOUNT:", amount);
    console.log("TOTAL AMOUNT RAW:", po.totalAmount);
    console.log("BOQ SNAPSHOT:", po.boqSnapshot);

    if (!amount || isNaN(amount) || amount <= 0) {
      setError("Invalid PO amount");
      return;
    }

    if (!userData?.email) {
      setError("User email missing");
      return;
    }

    payWithPaystack(
      {
        reference: "PO_" + Date.now(),
        email: userData?.email || user?.email,
        amount: amount * 100, //i replaced amount with grandtotal
        key: "pk_live_6a2efdfc277c468b57e70f6462c7c330181d1d6c",
        //key: "pk_test_e0ccd9771cc0086a1290ff5fd46ee1431bb64e4a",
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

        console.log({
          email: userData?.email || user?.email,
          amount: amount * 100, //i replaced amount with grandtotal
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


  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "products"),
      (snap) => {
        const data = snap.docs
          .map(d => ({
            id: d.id,
            ...d.data(),
          }))
          .sort(
            (a, b) =>
              Number(a.serialNo || 999999) -
              Number(b.serialNo || 999999)
          );
        setProducts(prev => {
          const prevStr = JSON.stringify(prev);
          const nextStr = JSON.stringify(data);

          if (prevStr === nextStr) return prev; // 🚫 prevents rerender loop
          return data;
        });
        setQtySelection(prev => {
          const updated = { ...prev };
          data.forEach(p => {
            if (updated[p.id] === undefined) {
              updated[p.id] = 0;
            }
          });
          return updated;
        });
      }
    );
    return () => unsub();
  }, []);


  useEffect(() => {
    const map = {};

    products.forEach((p) => {
      if (p.imageFileId) {
        // map[p.id] =
        //   `https://drive.google.com/thumbnail?id=${p.imageFileId}&sz=w1000`;
        map[p.id] =
          `https://lh3.googleusercontent.com/d/${p.imageFileId}=w1000`;
        console.log(
          products.map(p => ({
            id: p.id,
            name: p.name,
            imageFileId: p.imageFileId
          }))
        );
      } else {
        map[p.id] = null;
      }
    });

    setProductImages(map);
  }, [products]);


  const loadPOs = useCallback(async () => {
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
  }, [companyId]);


  const loadOrders = useCallback(async () => {
    try {
      const companySnap = await getDoc(doc(db, "companies", companyId));

      const companyName = companySnap.exists()
        ? companySnap.data().companyName
        : "--";

      const snap = await getDocs(
        collection(db, "companies", companyId, "orders")
      );

      // ✅ STEP 1: build orders first
      const data = snap.docs.map((d) => {
        const order = d.data();
        const createdAt = order.createdAt;

        let date = "--";

        if (createdAt?.toDate) {
          date = createdAt.toDate().toLocaleString();
        } else if (createdAt?.seconds) {
          date = new Date(createdAt.seconds * 1000).toLocaleString();
        }

        return {
          id: d.id,
          companyId,
          companyName,
          ...order,
          date,
        };
      });

      // ✅ STEP 2: build tracking AFTER data exists
      const track = {};
      data.forEach((o) => {
        track[o.id] = o.tracking || {};
      });

      setOrderTracking(track);
      setOrders(data);

    } catch (err) {
      console.error("🔥 Error loading orders:", err);
    }
  }, [companyId]);

  const loadAllOrders = useCallback(async () => {
    try {
      const companiesSnap = await getDocs(collection(db, "companies"));

      let allOrders = [];

      for (const company of companiesSnap.docs) {
        const companyId = company.id;
        const companyName = company.data().companyName || "--";

        const orderSnap = await getDocs(
          collection(db, "companies", companyId, "orders")
        );

        const orderData = orderSnap.docs.map(d => {
          const data = d.data();

          const createdAt = data.createdAt;

          let date = "--";

          if (createdAt?.toDate) {
            date = createdAt.toDate().toLocaleString();
          } else if (createdAt?.seconds) {
            date = new Date(createdAt.seconds * 1000).toLocaleString();
          }

          return {
            id: d.id,
            companyId,
            companyName,
            ...data,
            date,
          };
        });

        allOrders = [...allOrders, ...orderData];
      }

      allOrders.sort(
        (a, b) =>
          (b.createdAt?.seconds || 0) -
          (a.createdAt?.seconds || 0)
      );

      setOrders(allOrders);
    } catch (err) {
      console.error("🔥 Error loading all orders:", err);
    }
  }, []);

  //LOAD ALL PURCHASE ORDERS (DEVELOPER)
  const loadAllPOs = useCallback(async () => {
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
  }, []);

  /* -----------------------------
     Load Purchase Orders
  ----------------------------- */
  useEffect(() => {
    if (!companyId) return;

    let active = true;

    const loadData = async () => {
      if (!active) return;

      setLoading(true);
      const isMarketplaceAdmin =
        ["developer", "market_agent"].includes(role);
      if (isMarketplaceAdmin) {
        await loadAllPOs();
        await loadAllOrders();
      } else {
        await loadPOs();
        await loadOrders();
      }

      if (active) setLoading(false);
    };

    loadData();

    return () => {
      active = false;
    };
  }, [companyId, role, loadPOs, loadOrders, loadAllPOs, loadAllOrders]);





  /* -----------------------------
     MTO LOAER FUNCTON
  ----------------------------- */
  const downloadPoPdf = async (po) => {
    if (!po.mtoId) {
      setError("MTO not linked to this PO");
      return;
    }

    const mtoRows =
      po.mtoSnapshot?.mechanical?.length ||
      po.mtoSnapshot?.electrical?.length ||
      po.mtoSnapshot?.plumbing?.length;

    if (!mtoRows) {
      setError("MTO snapshot missing");
      return;
    }

    generatePoPdf({
      po,
      boq: {
        mechanical: po.mtoSnapshot?.mechanical || [],
        electrical: po.mtoSnapshot?.electrical || [],
        plumbing: po.mtoSnapshot?.plumbing || [],
        title: po.mtoTitle || "MTO",
      },
      deliveryFee: po.deliveryFee || 0,
    });
  };

  /* -----------------------------
       Invoice pdf downloader
    ----------------------------- */
  const downloadInvoicePdf = async (po) => {
    if (!po.mtoId) {
      setError("MTO not linked to this PO");
      return;
    }

    const hasMto =
      po.mtoSnapshot?.mechanical?.length ||
      po.mtoSnapshot?.electrical?.length ||
      po.mtoSnapshot?.plumbing?.length;

    if (!hasMto) {
      setError("MTO snapshot missing");
      return;
    }

    const blob = generateInvoicePdfBlob({
      po,
      boq: {
        mechanical: po.mtoSnapshot?.mechanical || [],
        electrical: po.mtoSnapshot?.electrical || [],
        plumbing: po.mtoSnapshot?.plumbing || [],
      },
      deliveryFee: po.deliveryFee || 0,
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `INV-${po.poId}.pdf`;

    document.body.appendChild(link);
    link.click();
    link.remove();
  };


  /* -----------------------------
     Toggle tracking slider PO
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
    Toggle tracking slider ORDERS
 ----------------------------- */
  const toggleOrderTracking = async (o, field) => {
    const orderId = o.id;

    const current = orderTracking[orderId] || {};

    const updated = {
      ...current,
      [field]: !current[field],
    };

    setOrderTracking(prev => ({ ...prev, [orderId]: updated }));

    const ref = doc(
      db,
      "companies",
      o.companyId,
      "orders",
      orderId
    );

    await updateDoc(ref, { tracking: updated });
  };


  // ===============================
  // 🆕 STORE FUNCTIONS
  // ===============================
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addProduct = async () => {
    if (!form.name || !form.stock || !form.price) return;
    console.log("FORM BEFORE SAVE:", form);
    try {
      const newProduct = {
        serialNo: form.serialNo,
        name: form.name,
        stock: Number(form.stock),
        price: Number(form.price),
        unit: form.unit || "",
        description: form.description || "",
        unitKg: Number(form.unitKg || 0), // ✅ NEW
        imageFileId: form.imageFileId,
        discipline: form.discipline, // 👈 ADD THIS
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "products"), {
        ...newProduct,
        source: "manual",
      });

      setQtySelection((prev) => ({ ...prev, [docRef.id]: 0 }));

      setForm({ serialNo: "", name: "", stock: "", price: "", unit: "", unitKg: "", description: "", imageFileId: "", discipline: "mechanical" });

    } catch (err) {
      console.error("🔥 Error adding product:", err);
    }
  };

  //GROUP STORE PRODUCTS
  const groupedProducts = products.reduce((acc, p) => {
    const key = p.discipline || "uncategorized";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const toggleGroup = (key) => {
    setOpenGroups(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
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
      setCart([...cart, {
        ...product, unitKg: product.unitKg || 0, // ✅ ensure it exists
        qty: selectedQty
      }]);
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

  const formatDate = (value) => {
    if (!value) return "--";

    // Firestore Timestamp
    if (value?.toDate) {
      return value.toDate().toLocaleString();
    }

    // Firestore timestamp object
    if (value?.seconds) {
      return new Date(value.seconds * 1000).toLocaleString();
    }

    // JS Date string or number
    const d = new Date(value);
    return isNaN(d.getTime()) ? "--" : d.toLocaleString();
  };


  const handleCheckout = async (paymentRef) => {
    const totalWeight = cart.reduce(
      (sum, item) => sum + (item.unitKg || 0) * item.qty,
      0
    );

    const baseFee =
      deliveryLocation === "Lagos" ? 10000 : 90000;

    const perKg =
      deliveryLocation === "Lagos" ? 500 : 2000;

    const deliveryFee = baseFee + totalWeight * perKg;

    //const grandTotal = total + deliveryFee;

    console.log("AUTH COMPANY ID:", companyId);
    console.log("USER DOC COMPANY ID:", userData?.companyId);
    console.log("USER:", user);
    console.log("USER DATA:", userData);
    console.log("SAVE ORDER VALUES", {
      total,
      deliveryFee,
      //grandTotal,
      cart,
      companyId,
      cartLength: cart.length,
    });
    try {
      try {
        await saveOrder({
          companyId,
          cart,
          total,          // cart subtotal
          deliveryFee,
          //grandTotal,             // total + delivery
          deliveryLocation,
          address: checkout.address,
          phone: checkout.phone,
          paymentRef,
          createdAt: serverTimestamp(),
          createdBy: {
            uid: user?.uid || "",
            email: user?.email || "",
          },
        });
        console.log("SAVE ORDER OK");
      } catch (err) {
        console.error("SAVE ORDER FAILED:", err);
        return;
      }

      try {
        await updateStockAfterOrder(cart);
        await loadOrders();
        console.log("STOCK UPDATE OK");
      } catch (err) {
        console.error("STOCK UPDATE FAILED:", err);
      }

      setCart([]);
      setCheckout({ address: "", phone: "" });

      setError("Order saved successfully!");

    } catch (err) {
      console.error("🔥 Checkout error:", err);
    }
  };

  const showDebugDialog = (title, data) => {
    window.alert(
      `${title}\n\n` + JSON.stringify(data, null, 2)
    );
  };

  const handleProductImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadFileToDrive(file);

      console.log("UPLOAD RESULT:", result);
      //showDebugDialog("UPLOAD RESULT", result);
      showDebugDialog("UPLOAD WORKED");
      if (!result?.fileId) {
        throw new Error("No fileId returned from upload");
      }

      setForm((prev) => ({
        ...prev,
        imageFileId: result.fileId,
      }));
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Image upload failed");
    }
  };

  //   if (!companyId || !cart?.length) {
  //   throw new Error("Invalid order data");
  // }

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

  if (deliveryLocation === "Lagos") {
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
          {/* <textarea
            className="form-control"
            rows="3"
            value={paymentNotice}
            onChange={(e) => setPaymentNotice(e.target.value)}
          /> */}
          <p>
            Deliveries take approx 4-5 working days.{" "}
            <span style={{ color: "red", fontWeight: "bold" }}>
              Transaction charges may be added to grand total.
            </span>
          </p>
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
                <th>Date</th>
                <th>PO ID</th>
                <th>Amount</th>
                <th>Delivery</th>
                <th>Grand Total</th>
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
                  {/* <td>
                    {po.createdAt?.seconds
                      ? new Date(po.createdAt.seconds * 1000).toLocaleString()
                      : "—"}
                  </td> */}
                  <td>{formatDate(po.createdAt)}</td>
                  <td>{po.poId}</td>
                  <td>₦{Number(po.totalAmount || 0).toLocaleString()}</td>
                  <td>₦{Number(po.deliveryFee || 0).toLocaleString()}</td>
                  <td>
                    ₦{Number(po.grandTotal || 0).toLocaleString()}
                  </td>
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
            <h5 className="mb-3"> PO Item Tracking</h5>

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
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProductImage}
                />
              </div>
              <div className="col-md-3">
                <input type="number" className="form-control" name="serialno" placeholder="serialNo" value={form.serialNo || ""} onChange={(e) =>
                  setForm({
                    ...form,
                    serialNo: Number(e.target.value),
                  })
                } />
              </div>
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
                <input className="form-control" name="unit" placeholder="Unit" value={form.unit} onChange={handleChange} />
              </div>
              <div className="col-md-2">
                <input className="form-control" name="unitKg" placeholder="Unit Kg" value={form.unitKg} onChange={handleChange} />
              </div>
              <div className="col-md-4">
                <input className="form-control" name="description" placeholder="Description" value={form.description} onChange={handleChange} />
              </div>
              <div className="col-md-2">
                <select
                  className="form-control"
                  name="discipline"
                  value={form.discipline}
                  onChange={handleChange}
                >
                  <option value="mechanical">Mechanical</option>
                  <option value="electrical">Electrical</option>
                  <option value="plumbing">Plumbing</option>
                </select>
              </div>
            </div>
            <button className="btn btn-primary mt-3" onClick={addProduct}>Add Product</button>
          </div>
        )}

        <div className="mt-3">
          {["mechanical", "electrical", "plumbing"].map((group) => (
            <div key={group} className="mb-4">

              {/* CATEGORY BUTTON */}
              <button
                className="btn btn-outline-dark w-100 text-start"
                onClick={() => toggleGroup(group)}
              >
                {group.toUpperCase()} ({groupedProducts[group]?.length || 0})
              </button>

              {/* COLLAPSIBLE AREA */}
              {openGroups[group] && (
                <div className="row mt-2">
                  {(groupedProducts[group] || []).map((p) => (
                    <div className="col-md-3 mb-3" key={p.id}>
                      <div className="card h-100">
                        <div className="card-body">

                          {/* FIXED IMAGE BLOCK */}
                          {productImages[p.id] && (
                            <img
                              src={productImages[p.id]}
                              alt={p.name}
                              style={{
                                width: "100%",
                                height: 200,
                                objectFit: "cover",
                              }}
                            />
                          )}

                          <h5>{p.name}</h5>
                          <p>{p.description}</p>
                          <p>Stock: {p.stock}</p>
                          <p>Price: ₦{p.price}</p>
                          <p>Unit: ₦{p.unit}</p>

                          <div className="d-flex gap-2 mb-2">
                            <button
                              className="btn btn-secondary"
                              onClick={() => updateStoreQty(p.id, -1, p.stock)}
                            >
                              -
                            </button>

                            <span>{qtySelection[p.id] || 0}</span>

                            <button
                              className="btn btn-secondary"
                              onClick={() => updateStoreQty(p.id, 1, p.stock)}
                            >
                              +
                            </button>
                          </div>

                          <button
                            className="btn btn-success w-100"
                            onClick={() => addToCart(p)}
                          >
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

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
                  checked={deliveryLocation === "Lagos"}
                  onChange={() => setDeliveryLocation("Lagos")}
                />
                Lagos
              </label>

              <label>
                <input
                  type="radio"
                  checked={deliveryLocation === "Other States"}
                  onChange={() => setDeliveryLocation("Other States")}
                />
                Other States
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
          </div>
        )}

        {/* ORDERS */}
        <div className="mt-4">
          <h5>Orders</h5>
          <table className="table table-bordered">
            <thead className="table-light">
              <tr>
                <th>Company</th>
                <th>Order ID</th>
                <th>Date</th>
                <th>Items + Qty + Unit Price</th>
                <th>Amount</th>
                <th>Delivery</th>
                <th>Grand Total</th>
                <th>Address</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  {/* <td>{o.companyName}</td> */}
                  <td>{o.companyId}</td>
                  <td>{o.orderId || o.id}</td>
                  <td>{formatDate(o.createdAt)}</td>
                  <td>
                    {(o.items || []).map((i) => (
                      <div key={i.id}>
                        {i.name} — Qty: {i.qty} — ₦{i.price}
                      </div>
                    ))}
                  </td>

                  <td>
                    ₦{Number(o.total || 0).toLocaleString()}
                  </td>

                  <td>
                    ₦{Number(o.deliveryFee || 0).toLocaleString()}
                  </td>

                  <td>
                    ₦{Number(o.grandTotal || o.total || 0).toLocaleString()}
                  </td>

                  <td>{o.address}</td>
                  <td>{o.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* ITEM TRACKING */}
        {role && (
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="mb-3">Orders Item Tracking</h5>

              <table className="table table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>Order ID</th>
                    <th>Order Received</th>
                    <th>Warehouse</th>
                    <th>Packaged</th>
                    <th>Dispatched</th>
                    <th>Received at Site</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td>{o.orderId}</td>

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
                              checked={orderTracking[o.id]?.[field] || false}
                              onChange={() => {
                                if (!["developer", "app_support", "market_agent"].includes(role)) {
                                  return; // read-only users cannot toggle
                                }
                                toggleOrderTracking(o, field);
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
      </div>
    </div >
  );
}


