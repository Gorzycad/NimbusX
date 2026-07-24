// src/firebase/marketplaceService.js
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase";


/**
 * Save Order after successful payment
 */
// export const saveOrder = async ({
//   companyId,
//   cart,
//   total,
//   address,
//   phone,
//   paymentRef,
//   createdBy,
//   createdAt,
//   deliveryFee,
//   deliveryLocation,
// }) => {
//   if (!companyId) throw new Error("Missing companyId");

//   const safeTotal = Number(total || 0);
//   const safeDeliveryFee = Number(deliveryFee || 0);

//   const orderData = {
//     items: cart,

//     total: safeTotal,
//     deliveryFee: safeDeliveryFee,
//     grandTotal: safeTotal + safeDeliveryFee,

//     address,
//     phone,
//     paymentRef,
//     deliveryLocation,

//     createdBy,
//     paymentStatus: "paid",
//     createdAt: serverTimestamp(),
//   };

//   console.log("ORDER DATA BEFORE FIRESTORE");
//   console.log(JSON.stringify(orderData, null, 2));

//   // 🔥 HARD SAFETY CHECK (THIS WILL CATCH REAL ISSUE)
//   Object.entries(orderData).forEach(([k, v]) => {
//     if (v === undefined) {
//       console.error("❌ UNDEFINED FIELD:", k);
//     }
//   });

//  const docRef = await addDoc(
//     collection(db, "companies", companyId, "orders"),
//     orderData
//   );

//   const savedSnap = await getDoc(docRef);

//   return {
//     id: docRef.id,
//     ...savedSnap.data(),
//   };
// };

export const saveOrder = async ({
  companyId,
  cart,
  total,
  address,
  phone,
  paymentRef,
  createdBy,
  deliveryFee,
  deliveryLocation,
}) => {
  if (!companyId) throw new Error("Missing companyId");

  const safeTotal = Number(total || 0);
  const safeDeliveryFee = Number(deliveryFee || 0);

  const tempId = crypto.randomUUID().slice(0, 8).toUpperCase();

  const orderId = `ORD-${new Date().getFullYear()}-${tempId}`;

  const orderData = {
    companyId,
    items: cart,
    total: safeTotal,
    deliveryFee: safeDeliveryFee,
    grandTotal: safeTotal + safeDeliveryFee,
    address,
    phone,
    paymentRef,
    deliveryLocation,
    createdBy,
    paymentStatus: "paid",
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, "companies", companyId, "orders"),
    orderData
  );

  await updateDoc(docRef, { orderId });

  return {
    id: docRef.id,
    orderId,
  };
  
};
/**
 * Update product stock after order
 */
export const updateStockAfterOrder = async (cart) => {
  for (const item of cart) {
    const productRef = doc(db, "products", item.id);

    const snap = await getDoc(productRef);
    if (!snap.exists()) continue;

    const currentStock = Number(snap.data().stock || 0);
    const newStock = Math.max(0, currentStock - item.qty);

    await updateDoc(productRef, {
      stock: newStock,
    });
  }
};

/**
 * Mark PO as paid
 */
export const markPoAsPaid = async ({
  companyId,
  poId,
  paymentRef,
  amount,
}) => {
  const ref = doc(
    db,
    "companies",
    companyId,
    "purchaseOrders",
    poId
  );

  await updateDoc(ref, {
    paymentStatus: true,
    paymentRef,
    // ✅ ADD THESE
    paidAt: serverTimestamp(),
    amountPaid: Number(amount || 0), // ✅ SAFE

    // OPTIONAL (if you calculate profit here)
    profitAccrued: Number(amount || 0), // example 10% profit
  });
};