// scripts/migrateDiscipline.js

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/* -----------------------------
   NORMALIZE FUNCTION
------------------------------*/
function normalize(str = "") {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ""); // removes spaces, symbols, punctuation
}

/* -----------------------------
   MAIN MIGRATION
------------------------------*/
async function migrateDiscipline() {
  try {
    console.log("🔥 Loading BOQ materials...");

    const boqSnap = await db.collection("boqMaterials").get();

    const materials = boqSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`✅ ${materials.length} materials loaded`);

    console.log("🔥 Loading products...");

    const productSnap = await db.collection("products").get();

    const products = productSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`✅ ${products.length} products loaded`);

    /* -----------------------------
       BUILD SKU MAP (FAST LOOKUP)
    ------------------------------*/
    const skuMap = new Map();

    materials.forEach((m) => {
      if (m.sku) {
        skuMap.set(m.sku.toLowerCase(), m);
      }
    });

    let updatedCount = 0;
    let batch = db.batch();
    let batchCount = 0;

    console.log("\n🔥 Starting migration...\n");

    for (const product of products) {
      let match = null;

      /* -----------------------------
         1. MATCH BY SKU (BEST)
      ------------------------------*/
      if (product.sku && skuMap.has(product.sku.toLowerCase())) {
        match = skuMap.get(product.sku.toLowerCase());
      }

      /* -----------------------------
         2. FALLBACK: NAME MATCH
      ------------------------------*/
      if (!match) {
        match = materials.find(
          (m) =>
            normalize(m.name || "") ===
            normalize(product.name || "")
        );
      }

      /* -----------------------------
         NO MATCH
      ------------------------------*/
      if (!match) {
        console.log(`⚠️ No match for: ${product.name}`);
        continue;
      }

      /* -----------------------------
         SAFE UPDATE (ONLY FIELD NEEDED)
      ------------------------------*/
      const ref = db.collection("products").doc(product.id);

      batch.update(ref, {
        discipline: match.discipline || "general",
      });

      batchCount++;
      updatedCount++;

      console.log(
        `✅ Matched: ${product.name} → ${match.discipline}`
      );

      /* -----------------------------
         COMMIT IN BATCHES OF 400
      ------------------------------*/
      if (batchCount === 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    /* -----------------------------
       FINAL COMMIT
    ------------------------------*/
    if (batchCount > 0) {
      await batch.commit();
    }

    console.log("\n🎉 MIGRATION COMPLETE");
    console.log(`✅ Total updated: ${updatedCount}`);
  } catch (err) {
    console.error("❌ Migration failed:");
    console.error(err);
  }
}

migrateDiscipline();