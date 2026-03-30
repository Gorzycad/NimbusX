import { db } from "../firebase/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

/**
 * Fetch all staff for a company
 */
export const fetchStaff = async (companyId) => {
  const staffSnap = await getDocs(collection(db, "companies", companyId, "users"));
  return staffSnap.docs.map(d => ({ id: d.id, ...d.data() }));
};

/**
 * Delete a staff member and all related attendance documents
 */
export const deleteStaff = async (companyId, staffId) => {
  // Delete attendance for each month
  for (let month = 1; month <= 12; month++) {
    const monthId = `${new Date().getFullYear()}-${month.toString().padStart(2, "0")}`;
    const staffDocRef = doc(db, "companies", companyId, "attendance", monthId, "staff", staffId);
    await deleteDoc(staffDocRef).catch(err => {
      console.warn(`No attendance doc for staff ${staffId} in month ${monthId}`);
    });
  }

  // Delete staff from users collection
  await deleteDoc(doc(db, "companies", companyId, "users", staffId));
};