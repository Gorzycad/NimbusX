// // src/firebase/leadsService.js
// import {
//   collection,
//   addDoc,
//   updateDoc,
//   deleteDoc,
//   getDocs,
//   doc,
//   serverTimestamp,
// } from "firebase/firestore";
// import { db } from "./firebase";

// // This line *must* be there*
// const leadsCollection = collection(db, "leads");

// // Create lead under company
// export const addLead = async (companyId, leadData) => {
//   const col = collection(db, "companies", companyId, "leads");
//   return await addDoc(col, {
//     ...leadData,
//     createdAt: serverTimestamp(),
//   });
// };

// export const updateLead = async (companyId, id, updatedData) => {
//   const leadRef = doc(db, "companies", companyId, "leads", id);
//   return await updateDoc(leadRef, updatedData);
// };

// export const deleteLead = async (companyId, id) => {
//   const leadRef = doc(db, "companies", companyId, "leads", id);
//   return await deleteDoc(leadRef);
// };

// export const getLeads = async (companyId) => {
//   const leadsCol = collection(db, "companies", companyId, "leads");
//   const snapshot = await getDocs(leadsCol);
//   return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
// };


// // ➤ (2) Get **ONLY project names**
// export const getProjectNames = async (companyId) => {
//   const col = collection(db, "companies", companyId, "leads");
//   const snapshot = await getDocs(col);
//   return snapshot.docs.map((d) => ({
//     id: d.id,
//     projectName: d.data().projectName,
//   }));
// };


// export default {
//   addLead,
//   updateLead,
//   deleteLead,
//   getLeads,
//   getProjectNames,
// };


// src/firebase/leadsService.js
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// Create lead under company and return the document ID
export const addLead = async (companyId, leadData) => {
  const col = collection(db, "companies", companyId, "leads");
  const docRef = await addDoc(col, {
    ...leadData,
    createdAt: serverTimestamp(),
  });
  return docRef; // return the full docRef, so caller can access docRef.id
};

export const updateLead = async (companyId, id, updatedData) => {
  const leadRef = doc(db, "companies", companyId, "leads", id);
  return await updateDoc(leadRef, updatedData);
};

export const deleteLead = async (companyId, id) => {
  const leadRef = doc(db, "companies", companyId, "leads", id);
  return await deleteDoc(leadRef);
};

export const getLeads = async (companyId) => {
  const leadsCol = collection(db, "companies", companyId, "leads");
  const snapshot = await getDocs(leadsCol);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ➤ Get only project names
export const getProjectNames = async (companyId) => {
  const col = collection(db, "companies", companyId, "leads");
  const snapshot = await getDocs(col);
  return snapshot.docs.map((d) => ({
    id: d.id,
    projectName: d.data().projectName,
  }));
};

export default {
  addLead,
  updateLead,
  deleteLead,
  getLeads,
  getProjectNames,
};
