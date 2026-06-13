// src/utils/billingReset.js
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    serverTimestamp,
    getDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

export async function runMonthlyReset(companyId) {
    if (!companyId) return;

    const companyRef = doc(db, "companies", companyId);
    const companySnap = await getDoc(companyRef);

    if (!companySnap.exists()) return;

    const data = companySnap.data();

    const lastReset = data.lastBillingReset?.toDate?.();
    const now = new Date();

    // 🧠 If never reset, skip
    if (!lastReset) return;

    const lastMonth = lastReset.getMonth();
    const currentMonth = now.getMonth();

    const lastYear = lastReset.getFullYear();
    const currentYear = now.getFullYear();

    const isNewMonth =
        currentMonth !== lastMonth || currentYear !== lastYear;

    if (!isNewMonth) return;

    console.log("🔄 Running monthly billing reset...");

    // 🔒 PREVENT MULTIPLE USERS RUNNING RESET AT SAME TIME
    if (data.isResetting) {
        console.log("⏳ Reset already in progress...");
        return;
    }

    try {
        // 🔥 Get all users
        const usersSnap = await getDocs(
            collection(db, "companies", companyId, "users")
        );

        const updates = usersSnap.docs.map((d) => {
            const user = d.data();

            // ❌ Skip resigned staff
            if (user.employmentStatus === "resigned") return null;

            return updateDoc(
                doc(db, "companies", companyId, "users", d.id),
                {
                    billingStatus: "pending",
                    accessEnabled: false,
                }
            );
        });

        await Promise.all(updates.filter(Boolean));

        // ✅ Update reset timestamp + unlock
        await updateDoc(companyRef, {
            lastBillingReset: serverTimestamp(),
            isResetting: false,
        });

        console.log("✅ Monthly reset complete");
    } catch (err) {
        console.error("❌ Reset failed:", err);

        // 🔓 ALWAYS UNLOCK ON FAILURE
        await updateDoc(companyRef, { isResetting: false });
    }
}