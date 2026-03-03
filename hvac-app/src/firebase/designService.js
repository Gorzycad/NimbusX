//src/firebase/designService.js

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDocs
} from "firebase/firestore";

import { db } from "./firebase";

// CREATE
export async function addDesign(companyId, data) {
  const docRef = await addDoc(
    collection(db, "companies", companyId, "designs"),
    {
      ...data,
      createdAt: serverTimestamp(),
    }
  );

  return docRef.id;
}

// UPDATE
export async function updateDesign(companyId, designId, data) {
  const { createdBy, createdAt, ...safeData } = data;

  await updateDoc(
    doc(db, "companies", companyId, "designs", designId),
    safeData
  );
}


// GET ALL
export async function getDesigns(companyId) {
  const snap = await getDocs(collection(db, "companies", companyId, "designs"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* ============================================================
   DELETE DESIGN
   companies/{companyId}/designs/{designId}
   ============================================================ */
export async function deleteDesign(companyId, designId) {
  const ref = doc(db, "companies", companyId, "designs", designId);
  await deleteDoc(ref);
}
