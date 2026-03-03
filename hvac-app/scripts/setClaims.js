const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function assignClaims() {
  console.log("Assigning claims...");

  // Iterate over top-level users collection
  const usersSnapshot = await db.collection("users").get();

  for (const docSnap of usersSnapshot.docs) {
    const user = docSnap.data();

    console.log("Setting claims for", user.uid);

    await admin.auth().setCustomUserClaims(user.uid, {
      companyId: user.companyId,
      role: user.role,
    });
  }

  console.log("Claims assigned successfully!");
  process.exit(0);
}

assignClaims();
