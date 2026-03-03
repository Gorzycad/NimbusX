// src/firebase/mtoService.js

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

// -------------------------------
// ADD NEW MTO
// -------------------------------
export async function addMto(companyId, data) {
  if (!companyId) throw new Error("companyId is required");

  const ref = collection(db, "companies", companyId, "mtos");

  const newDoc = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(ref, newDoc);
  return docRef.id;
}

// -------------------------------
// GET ALL MTO RECORDS
// -------------------------------
export async function getMtos(companyId) {
  if (!companyId) return [];

  const ref = collection(db, "companies", companyId, "mtos");
  const snap = await getDocs(ref);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// -------------------------------
// UPDATE AN MTO
// -------------------------------
export async function updateMto(companyId, id, data) {
  if (!companyId) throw new Error("companyId is required");
  if (!id) throw new Error("MTO id is required");

  const ref = doc(db, "companies", companyId, "mtos", id);

  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// -------------------------------
// DELETE MTO
// -------------------------------
export async function deleteMto(companyId, id) {
  if (!companyId) throw new Error("companyId is required");
  if (!id) throw new Error("MTO id is required");

  const ref = doc(db, "companies", companyId, "mtos", id);
  await deleteDoc(ref);
}
