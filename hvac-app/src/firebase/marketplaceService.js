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
export const saveOrder = async ({
  companyId,
  cart,
  total,
  address,
  phone,
  paymentRef,
}) => {
  if (!companyId) throw new Error("Missing companyId");

  const orderData = {
    items: cart,
    total,
    address,
    phone,
    paymentRef,
    paymentStatus: "paid",
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, "companies", companyId, "orders"),
    orderData
  );

  return { id: docRef.id, ...orderData };
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