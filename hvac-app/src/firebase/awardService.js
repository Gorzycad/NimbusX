// src/firebase/awardService.js

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebase";

// ---------------------------------------------
// ADD AWARD
// ---------------------------------------------
export async function addAward(companyId, data) {
  const docRef = await addDoc(
    collection(db, "companies", companyId, "awards"),
    {
      ...data,
      createdAt: serverTimestamp(), // ✅ Firestore server time
    }
  );

  return docRef; // ✅ required so awardId exists
}

// ---------------------------------------------
// GET ALL AWARDS
// ---------------------------------------------
export async function getAwards(companyId) {
  const ref = collection(db, "companies", companyId, "awards");
  const snap = await getDocs(ref);

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

// ---------------------------------------------
// UPDATE AWARD
// ---------------------------------------------
export async function updateAward(companyId, awardId, data) {
  const ref = doc(db, "companies", companyId, "awards", awardId);

  await updateDoc(ref, {
    ...data,
  });
}

// ---------------------------------------------
// DELETE AWARD
// ---------------------------------------------
export async function deleteAward(companyId, awardId) {
  const ref = doc(db, "companies", companyId, "awards", awardId);
  await deleteDoc(ref);
}

// ---------------------------------------------
// GET AWARD BY PROJECT (for Tender sync)
// ---------------------------------------------
export async function getAwardByProject(companyId, projectName) {
  const ref = collection(db, "companies", companyId, "awards");
  const q = query(ref, where("projectName", "==", projectName));

  const snap = await getDocs(q);
  if (snap.empty) return null;

  return {
    id: snap.docs[0].id,
    ...snap.docs[0].data(),
  };
}
