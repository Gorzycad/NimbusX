//src/firebase/maintenanceService.js
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";

import { db } from "./firebase";


/* =========================
   GET MAINTENANCE ENTRIES
========================= */

export const getMaintenanceEntries = async (companyId) => {

  const snapshot = await getDocs(
    collection(db, "companies", companyId, "m_entries")
  );

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  }));
};

/* =========================
   ADD ENTRY
========================= */

export const addMaintenanceEntry = async (companyId, entry) => {

  const docRef = await addDoc(
    collection(db, "companies", companyId, "m_entries"),
    {
      ...entry,
      createdAt: serverTimestamp()
    }
  );

  return docRef;
};

/* =========================
   DELETE ENTRY
========================= */

export const deleteMaintenanceEntry = async (companyId, entryId) => {

  await deleteDoc(
    doc(db, "companies", companyId, "m_entries", entryId)
  );
};

export const updateMaintenanceEntry = async (companyId, entryId, data) => {
  await updateDoc(
    doc(db, "companies", companyId, "m_entries", entryId),
    {
      ...data,
      updatedAt: serverTimestamp(),
    }
  );
};