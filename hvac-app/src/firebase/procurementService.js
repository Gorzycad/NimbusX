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
} from "firebase/firestore";
import { db } from "./firebase";

/*
Firestore structure:

companies/{companyId}/procurement/
  requisitions/{docId}
  vendors/{docId}
  staffItems/{docId}
  contractors/{docId}
*/

// Helper
const getProcurementCollection = (companyId, tab) =>
  collection(db, "companies", companyId, tab);

/* -----------------------------
   CREATE
----------------------------- */
export const addProcurementRecord = async (companyId, tab, data) => {
  const colRef = getProcurementCollection(companyId, tab);
  const docRef = await addDoc(colRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef;
};

/* -----------------------------
   UPDATE
----------------------------- */
export const updateProcurementRecord = async (companyId, tab, id, data) => {
  const ref = doc(db, "companies", companyId, tab, id);
  return await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

/* -----------------------------
   DELETE
----------------------------- */
export const deleteProcurementRecord = async (companyId, tab, id) => {
  const ref = doc(db, "companies", companyId, tab, id);
  return await deleteDoc(ref);
};

/* -----------------------------
   GET ALL (Newest first)
----------------------------- */
export const getProcurementRecords = async (companyId, tab) => {
  const colRef = getProcurementCollection(companyId, tab);
  const q = query(colRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export default {
  addProcurementRecord,
  updateProcurementRecord,
  deleteProcurementRecord,
  getProcurementRecords,
};
