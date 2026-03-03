// src/pages/leads/LeadsListHelper.jsx
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/firebase";

/**
 * Notify assigned staff for Leads, Tenders, Awards
 */
export async function notifyAssignedStaff(
  companyId,
  recordId,
  data,
  userIds,
  sourcePage, // "Leads" | "Tender" | "Award"
  mainMenu
) {
  if (!companyId || !recordId || !Array.isArray(userIds) || !userIds.length) {
    console.warn("notifyAssignedStaff: missing required data");
    return;
  }

  // Map recordId field ONLY (type is unified)
  const idFieldMap = {
    Leads: "leadId",
    Tender: "tenderId",
    Award: "awardId",
    Design: "designId",
    BOQ: "boqId",
    Takeoffs: "takeoffsId",
    Orders: "orderId",
    Execution: "executionId",
    Handover: "handoverId",
    Procurement: "procurementId",
  };

  const idField = idFieldMap[sourcePage];

  if (!idField) {
    console.warn("notifyAssignedStaff: unknown sourcePage", sourcePage);
    return;
  }

  await Promise.all(
    userIds.map((uid) =>
      addDoc(
        collection(
          db,
          "companies",
          companyId,
          "users",
          uid,
          "notifications"
        ),
        {
          // ✅ SINGLE unified type
          type: "JOBS_ASSIGNED",

          // ✅ correct record reference
          [idField]: recordId,

          // ✅ keep sourcePage for routing / context
          sourcePage,

          title: data?.projectName || "New Job Assigned",

          message: `Go to ${mainMenu} > ${sourcePage}. You have been assigned to "${data.projectName}".`,

          createdAt: serverTimestamp(),
          read: false,
        }
      )
    )
  );
}
