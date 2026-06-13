const admin = require("firebase-admin");

// 🔐 Initialize Firebase Admin
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function dedupeProducts() {
  const snapshot = await db.collection("products").get();

  const map = new Map(); // sourceMaterialId → { keepDoc, duplicates[] }

  snapshot.forEach((doc) => {
    const data = doc.data();

    const key = data.sourceMaterialId || data.sku || data.name;

    if (!map.has(key)) {
      map.set(key, {
        keep: { id: doc.id, data },
        duplicates: [],
      });
    } else {
      map.get(key).duplicates.push({ id: doc.id, data });
    }
  });

  let deleteCount = 0;

  for (const [key, value] of map.entries()) {
    const { keep, duplicates } = value;

    if (duplicates.length > 0) {
      console.log(`\n🧩 Key: ${key}`);
      console.log(`✔ Keeping: ${keep.id}`);
      console.log(`🗑 Deleting: ${duplicates.map(d => d.id).join(", ")}`);

      for (const dup of duplicates) {
        await db.collection("products").doc(dup.id).delete();
        //console.log("WOULD DELETE:", dup.id);
        deleteCount++;
      }
    }
  }

  console.log(`\n✅ Deduplication complete`);
  console.log(`🗑 Total deleted: ${deleteCount}`);
}

dedupeProducts().catch(console.error);