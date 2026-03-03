// src/firebase/reportsService.js
import { db } from "./firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";

// ----------------------------
// Fetch all execution reports for a company
export const fetchExecutionReports = async (companyId) => {
  if (!companyId) throw new Error("Company ID is required");

  const snapshot = await getDocs(
    collection(db, "companies", companyId, "executions")
  );
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Fetch purchase orders for a company
export const fetchPurchaseOrders = async (companyId) => {
  if (!companyId) throw new Error("Company ID is required");

  const snapshot = await getDocs(
    collection(db, "companies", companyId, "pos")
  );
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Fetch staff (users) for a company
export const fetchStaff = async (companyId) => {
  if (!companyId) throw new Error("Company ID is required");

  const snapshot = await getDocs(
    collection(db, "companies", companyId, "users")
  );
  return snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
};

// Filter execution reports by project name
export const getReportsByProject = async (companyId, projectName) => {
  if (!companyId) throw new Error("Company ID is required");

  const q = query(
    collection(db, "companies", companyId, "executions"),
    where("projectName", "==", projectName)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Filter execution reports by date range
export const getReportsByDate = async (companyId, start, end) => {
  if (!companyId) throw new Error("Company ID is required");

  const q = query(
    collection(db, "companies", companyId, "executions"),
    where("date", ">=", start),
    where("date", "<=", end),
    orderBy("date", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// //When Calling these fron a React page
// const { companyId } = useAuth();

// const execReports = await fetchExecutionReports(companyId);
// const pos = await fetchPurchaseOrders(companyId);
// const staff = await fetchStaff(companyId);
