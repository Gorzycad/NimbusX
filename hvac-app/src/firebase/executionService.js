// import {
//   collection,
//   doc,
//   addDoc,
//   updateDoc,
//   deleteDoc,
//   getDocs,
//   getDoc,
// } from "firebase/firestore";
// import { db } from "./firebase";

// // COLLECTION PATH
// function getExecutionCollection(companyId) {
//   return collection(db, "companies", companyId, "execution");
// }

// // CREATE
// export async function addExecution(companyId, data) {
//   const colRef = getExecutionCollection(companyId);
//   const docRef = await addDoc(colRef, data);
//   return docRef.id;
// }

// // GET ALL
// export async function getExecutions(companyId) {
//   const colRef = getExecutionCollection(companyId);
//   const snap = await getDocs(colRef);
//   return snap.docs.map(d => ({ id: d.id, ...d.data() }));
// }

// // UPDATE
// export async function updateExecution(companyId, id, data) {
//   const docRef = doc(db, "companies", companyId, "execution", id);
//   return await updateDoc(docRef, data);
// }

// // DELETE
// export async function deleteExecution(companyId, id) {
//   const docRef = doc(db, "companies", companyId, "execution", id);
//   return await deleteDoc(docRef);
// }

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// COLLECTION PATH
function getExecutionCollection(companyId) {
  return collection(db, "companies", companyId, "execution");
}

// CREATE
export async function addExecution(companyId, data) {
  const colRef = getExecutionCollection(companyId);

  const payload = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(colRef, payload);
  return docRef.id;
}

// GET ALL (NEWEST FIRST)
export async function getExecutions(companyId) {
  const colRef = getExecutionCollection(companyId);

  const q = query(colRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
  }));
}

// GET ONE (for edit / view)
export async function getExecutionById(companyId, id) {
  const docRef = doc(db, "companies", companyId, "execution", id);
  const snap = await getDoc(docRef);

  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// UPDATE
export async function updateExecution(companyId, id, data) {
  const docRef = doc(db, "companies", companyId, "execution", id);

  return await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// DELETE
export async function deleteExecution(companyId, id) {
  const docRef = doc(db, "companies", companyId, "execution", id);
  return await deleteDoc(docRef);
}
