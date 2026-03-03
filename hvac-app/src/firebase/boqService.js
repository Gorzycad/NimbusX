// src/firebase/boqService.js
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";

// CREATE
export async function addBoq(companyId, data) {
  const ref = await addDoc(
    collection(db, "companies", companyId, "boqs"),
    {
      ...data,
      createdAt: serverTimestamp(),
    }
  );
  return ref.id;
}

// UPDATE
export async function updateBoq(companyId, boqId, data) {
  const ref = doc(db, "companies", companyId, "boqs", boqId);
  await updateDoc(ref, data);
}

// DELETE
export async function deleteBoq(companyId, boqId) {
  const ref = doc(db, "companies", companyId, "boqs", boqId);
  await deleteDoc(ref);
}

// GET ALL
export async function getBoqs(companyId) {
  const snap = await getDocs(collection(db, "companies", companyId, "boqs"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
