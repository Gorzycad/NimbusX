//src/firebase/logisticsService.js
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
   DRIVERS
========================= */

export const getDrivers = async (companyId) => {
  const snap = await getDocs(
    collection(db, "companies", companyId, "drivers")
  );

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
};

export const addDriver = async (companyId, data) => {
  return await addDoc(
    collection(db, "companies", companyId, "drivers"),
    {
      ...data,
      createdAt: serverTimestamp(),
    }
  );
};

export const deleteDriver = async (companyId, driverId) => {
  await deleteDoc(
    doc(db, "companies", companyId, "drivers", driverId)
  );
};

/* =========================
   CALENDAR ENTRIES
========================= */

export const getEntries = async (companyId) => {
  const snap = await getDocs(
    collection(db, "companies", companyId, "entries")
  );

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
};

export const addEntry = async (companyId, data) => {
  return await addDoc(
    collection(db, "companies", companyId, "entries"),
    {
      ...data,
      createdAt: serverTimestamp(),
    }
  );
};

export const deleteEntry = async (companyId, entryId) => {
  await deleteDoc(
    doc(db, "companies", companyId, "entries", entryId)
  );
};

export const updateDriver = async (companyId, driverId, data) => {
  await updateDoc(
    doc(db, "companies", companyId, "drivers", driverId),
    {
      ...data,
      updatedAt: serverTimestamp(),
    }
  );
};

export const updateEntry = async (companyId, entryId, data) => {
  await updateDoc(
    doc(db, "companies", companyId, "entries", entryId),
    {
      ...data,
      updatedAt: serverTimestamp(),
    }
  );
};