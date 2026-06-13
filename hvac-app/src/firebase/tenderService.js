// src/firebase/tenderService.js
import {
  collection,
  addDoc,
  getDoc,
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
export const addTender = async (companyId, data) => {
  const col = collection(db, "companies", companyId, "tenders");

  const docRef = await addDoc(col, {
    ...data,
    awardStatus: data.awardStatus || "Not Awarded",
    createdAt: serverTimestamp(),
  });

  const snap = await getDoc(docRef);

  return {
    id: docRef.id,
    ...snap.data(),
  };
};

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
export const updateTenderAwardStatus = async (companyId, projectName, status) => {
  try {
    const q = query(
      collection(db, "companies", companyId, "tenders"),
      where("projectName", "==", projectName)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      console.warn("No matching tender found for project:", projectName);
      return;
    }

    const updates = snap.docs.map(d =>
      updateDoc(
        doc(db, "companies", companyId, "tenders", d.id),
        { awardedStatus: status }
      )
    );

    await Promise.all(updates);

    console.log("✅ Tender status updated to", status, "for project:", projectName);
  } catch (err) {
    console.error("❌ Failed to update tender status:", err);
  }
};

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
