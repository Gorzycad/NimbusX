// src/firebase/poService.js

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebase";

// ------------------------------------
// ADD NEW PURCHASE ORDER
// ------------------------------------
export async function addPO(companyId, data) {
  if (!companyId) throw new Error("companyId is required");

  const ref = collection(db, "companies", companyId, "purchaseOrders");

  const newDoc = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(ref, newDoc);
  return docRef.id;
}

// ------------------------------------
// GET ALL PURCHASE ORDERS
// ------------------------------------
export async function getPOs(companyId) {
  if (!companyId) return [];

  const ref = collection(db, "companies", companyId, "purchaseOrders");
  const snap = await getDocs(ref);

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

// ------------------------------------
// UPDATE PO
// ------------------------------------
export async function updatePO(companyId, id, data) {
  if (!companyId) throw new Error("companyId required");
  if (!id) throw new Error("PO id required");

  const ref = doc(db, "companies", companyId, "purchaseOrders", id);

  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ------------------------------------
// DELETE PO
// ------------------------------------
export async function deletePO(companyId, id) {
  if (!companyId) throw new Error("companyId required");
  if (!id) throw new Error("PO id required");

  const ref = doc(db, "companies", companyId, "purchaseOrders", id);
  await deleteDoc(ref);
}
