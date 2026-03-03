// src/firebase/handoverService.js
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "./firebase";

// ADD NEW HANDOVER
export async function addHandover(companyId, data) {
  const ref = collection(db, "companies", companyId, "handover");
  const newDoc = await addDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
  });
  return newDoc.id;
}

// GET ALL HANDOVER ITEMS
export async function getHandovers(companyId) {
  const ref = collection(db, "companies", companyId, "handover");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// UPDATE HANDOVER
export async function updateHandover(companyId, id, data) {
  const ref = doc(db, "companies", companyId, "handover", id);
  await updateDoc(ref, data);
}

// DELETE HANDOVER
export async function deleteHandover(companyId, id) {
  const ref = doc(db, "companies", companyId, "handover", id);
  await deleteDoc(ref);
}
