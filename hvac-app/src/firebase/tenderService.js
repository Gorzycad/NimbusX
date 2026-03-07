// src/firebase/tenderService.js

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp
} from "firebase/firestore";

import { db } from "./firebase";

// -------------------------------------------------
// ADD TENDER
// -------------------------------------------------
export async function addTender(companyId, data) {
  const docRef = await addDoc(
    collection(db, "companies", companyId, "tenders"),
    {
      ...data,
      awardStatus: data.awardStatus || "Not Awarded",
      createdAt: serverTimestamp(), // ✅ Firestore server time
    }
  );

  return docRef; // ✅ return ref, not id (consistent with addAward)
}

// -------------------------------------------------
// GET ALL TENDERS
// -------------------------------------------------
export async function getTenders(companyId) {
  const ref = collection(db, "companies", companyId, "tenders");
  const snap = await getDocs(ref);

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

// -------------------------------------------------
// UPDATE TENDER
// -------------------------------------------------
export async function updateTender(companyId, tenderId, data) {
  const ref = doc(db, "companies", companyId, "tenders", tenderId);

  await updateDoc(ref, {
    ...data,
  });
}

// -------------------------------------------------
// DELETE TENDER
// -------------------------------------------------
export async function deleteTender(companyId, tenderId) {
  const ref = doc(db, "companies", companyId, "tenders", tenderId);
  await deleteDoc(ref);
}

// -------------------------------------------------
// UPDATE AWARD STATUS (SYNC WITH AWARD PAGE)
// -------------------------------------------------
export async function updateTenderAwardStatus(companyId, projectName, status) {
  const ref = collection(db, "companies", companyId, "tenders");
  const q = query(ref, where("projectName", "==", projectName));

  const snap = await getDocs(q);

  if (snap.empty) return;

  // Update each tender that matches the project name
  for (const d of snap.docs) {
    const tenderRef = doc(db, "companies", companyId, "tenders", d.id);

    await updateDoc(tenderRef, {
      awardStatus: status, // "Awarded" or "Not Awarded"
      updatedAt: serverTimestamp(),
    });
  }
}

// -------------------------------------------------
// GET SINGLE TENDER BY PROJECT
// -------------------------------------------------
export async function getTenderByProject(companyId, projectName) {
  const ref = collection(db, "companies", companyId, "tenders");
  const q = query(ref, where("projectName", "==", projectName));

  const snap = await getDocs(q);
  if (snap.empty) return null;

  return {
    id: snap.docs[0].id,
    ...snap.docs[0].data(),
  };
}
