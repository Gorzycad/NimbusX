// src/services/nimbusXService.js

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

/**
 * Fetch all developer revenue data
 * ONLY call this if user is developer
 */
export const getDeveloperRevenue = async () => {
  try {
    const companiesSnap = await getDocs(collection(db, "companies"));

    const poData = [];
    const subData = [];
    const orderData = []; // ✅ NEW


    for (const company of companiesSnap.docs) {
      const companyId = company.id;
      const companyName = company.data().companyName || "--";

      // Paid Purchase Orders
      const poSnap = await getDocs(
        query(
          collection(db, "companies", companyId, "purchaseOrders"),
          where("paymentStatus", "==", true)
        )
      );

      poSnap.forEach((po) => {
        const data = po.data(); // ✅ MUST be inside loop
        poData.push({
          companyId,
          companyName,
          poId: data.poId || po.id,
          //poId: po.poId,
          profit: Number(po.data().profitAccrued || 0),
          // ✅ ADD THIS
          paidAt: data.paidAt || null,

          // optional (for debugging / analytics)
          amountPaid: Number(data.amountPaid || 0),
        });
      });

      // Subscriptions
      const subSnap = await getDocs(
        collection(db, "companies", companyId, "subscriptions")
      );

      subSnap.forEach((sub) => {
        subData.push({
          companyId,
          companyName,
          createdAt: sub.data().createdAt,
          amount: Number(sub.data().subscriptionAmount || 0),
        });
      });

      /* ===============================
       ORDERS (NEW)
      ================================ */
      const orderSnap = await getDocs(
        collection(db, "companies", companyId, "orders")
      );

      orderSnap.forEach((order) => {
        const data = order.data(); // ✅ ADD THIS
        orderData.push({
          companyId,
          companyName,
          orderId: order.id,
          createdAt: data.createdAt,
          amount: Number(data.total || 0), // ✅ SAFE
        });
      });
    }

    return { poData, subData, orderData };
  } catch (error) {
    console.error("🔥 NimbusX Service Error:", error);
    throw error;
  }
};