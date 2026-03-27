import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  doc,
  serverTimestamp,
  query,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

/*
Structure:

companies/{companyId}/inventory/
   inventory/{docId}
   vendors/{docId}
   orders/{docId}
*/

// Helper
const getInventoryCollection = (companyId, tab) =>
  collection(
    db,
    "companies",
    companyId,
    "modules",
    "inventory",
    tab
  );


/* ======================================================
   SAVE ENTIRE TABLE (bulk overwrite using batch)
   ====================================================== */

export const saveInventoryTable = async (
  companyId,
  tab,
  rows
) => {
  const colRef = getInventoryCollection(companyId, tab);
  const snapshot = await getDocs(colRef);

  const batch = writeBatch(db);

  // Delete existing
  snapshot.forEach(docSnap => {
    batch.delete(docSnap.ref);
  });

  // Add new
 rows
  .filter(row =>
  row.productId ||
  row.product ||
  row.qty ||
  row.price
) // important
  .forEach(row => {
    const newDoc = doc(colRef);
    batch.set(newDoc, {
      ...row,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
};


/* ======================================================
   GET TABLE
   ====================================================== */

export const getInventoryTable = async (companyId, tab) => {
  const colRef = getInventoryCollection(companyId, tab);
  const q = query(colRef, orderBy("createdAt", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(d => ({
    id: d.id,
    ...d.data(),
  }));
};


/* ======================================================
   UPDATE SINGLE ROW (optional future use)
   ====================================================== */

const getInventoryDoc = (companyId, tab, id) =>
  doc(db, "companies", companyId, "modules", "inventory", tab, id);

export const updateInventoryRow = async (companyId, tab, id, data) => {
  const ref = getInventoryDoc(companyId, tab, id);

  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteInventoryRow = async (companyId, tab, id) => {
  const ref = getInventoryDoc(companyId, tab, id);
  await deleteDoc(ref);
};

export default {
  saveInventoryTable,
  getInventoryTable,
  updateInventoryRow,
  deleteInventoryRow,
};
