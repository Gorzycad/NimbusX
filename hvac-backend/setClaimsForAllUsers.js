import admin from "firebase-admin";
const serviceAccount = JSON.parse(
  fs.readFileSync(new URL("./serviceAccountKey.json", import.meta.url))
);
//import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };
// const admin = require("firebase-admin");
// const serviceAccount = require("./serviceAccountKey.json"); // 🔹 Make sure path is correct

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
console.log("Admin initialized at setClaimsForAllUsers.js:", !!admin.apps.length);
const db = admin.firestore();

async function setClaimsForAllUsers() {
  try {
    console.log("Fetching all users from top-level users collection...");

    const usersSnap = await db.collection("users").get();
    const users = usersSnap.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));

    console.log(`Found ${users.length} users.`);

    for (const user of users) {
      if (!user.companyId || !user.role) {
        console.warn(`Skipping UID ${user.uid}: missing companyId or role`);
        continue;
      }

      console.log(`Setting claims for UID ${user.uid}...`);
      await admin.auth().setCustomUserClaims(user.uid, {
        companyId: user.companyId,
        role: user.role.toLowerCase(), // normalize
      });
      console.log(`✅ Claims set for UID ${user.uid}`);
    }

    console.log("All users processed!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error setting claims for users:", err);
    process.exit(1);
  }
}

setClaimsForAllUsers();
