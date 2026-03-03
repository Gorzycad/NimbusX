// src/firebase/financeService.js
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

// Helper to get collection reference for a tab
function getFinanceCollection(companyId, tabName) {
  return collection(
    db,
    "companies",
    companyId,
    "finance",
    "data",     // 👈 REQUIRED DOCUMENT
    tabName
  );
}


// CREATE
export const addFinanceRow = async (companyId, tabName, data) => {
  const colRef = getFinanceCollection(companyId, tabName);
  const docRef = await addDoc(colRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

// UPDATE
export const updateFinanceRow = async (companyId, tabName, id, data) => {
  const docRef = doc(
    db,
    "companies",
    companyId,
    "finance",
    "data",
    tabName,
    id
  );

  return await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteFinanceRow = async (companyId, tabName, id) => {
  const docRef = doc(
    db,
    "companies",
    companyId,
    "finance",
    "data",
    tabName,
    id
  );
  return await deleteDoc(docRef);
};


// GET ALL ROWS (ordered by createdAt)
export const getFinanceRows = async (companyId, tabName) => {
  const colRef = getFinanceCollection(companyId, tabName);
  const q = query(colRef, orderBy("createdAt", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export default {
  addFinanceRow,
  updateFinanceRow,
  deleteFinanceRow,
  getFinanceRows,
};
