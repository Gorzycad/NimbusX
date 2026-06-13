// src/helpers/syncBoqToProducts.js
import {
  collection,
  getDocs,
  setDoc,
  doc,
} from "firebase/firestore";

import { db } from "../firebase/firebase";

export const syncBoqToProducts = async () => {

  // =========================
  // LOAD LIVE BOQ MATERIALS
  // =========================
  const boqSnap = await getDocs(
    collection(db, "boqMaterials")
  );

  // =========================
  // LOAD EXISTING PRODUCTS
  // =========================
  const productSnap = await getDocs(
    collection(db, "products")
  );

  const existing = {};

  productSnap.docs.forEach(d => {

    const data = d.data();

    if (data.sourceMaterialId) {

      existing[data.sourceMaterialId] = {
        id: d.id,
        ...data,
      };

    }

  });

  // =========================
  // SYNC PRODUCTS
  // =========================
  for (const d of boqSnap.docs) {
    const material = { id: d.id, ...d.data() };

    const productRef = doc(db, "products", material.id);

    const productData = {
      sourceMaterialId: material.id,
      name: material.item || "",
      stock: 9999,
      price: Number(material.rate || 0),
      description: material.item || "",
      unitKg: Number(material.unitKg || material.unitkgs || 0),
      unit: material.unit || "",
      image: "",
      sku: material.sku || material.item,
      source: "boq-live",
      updatedAt: new Date(),
    };

    await setDoc(productRef, productData, { merge: true });
  }

  console.log(
    "✅ BOQ MATERIALS synced to products"
  );
  alert(
    "BOQ Materials synced successfully to Marketplace products."
  );
};