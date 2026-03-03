const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function migrateUsers() {
  console.log("Starting migration...");

  const companiesSnap = await db.collection("companies").get();

  for (const companyDoc of companiesSnap.docs) {
    const companyId = companyDoc.id;

    const usersSnap = await db
      .collection("companies")
      .doc(companyId)
      .collection("users")
      .get();

    for (const userDoc of usersSnap.docs) {
      const data = userDoc.data();
      const uid = userDoc.id;

      console.log(`Migrating user ${uid} from company ${companyId}`);

      await db.collection("users").doc(uid).set({
        ...data,
        uid,
        companyId,
      });
    }
  }

  console.log("Migration complete!");
}

migrateUsers();
