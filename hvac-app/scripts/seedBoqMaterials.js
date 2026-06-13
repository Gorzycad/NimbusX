// scripts/seedBoqMaterials.js

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { doc, setDoc } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

import {
  defaultMechanical,
  defaultElectrical,
  defaultPlumbing
} from "../src/pages/boq/defaultBoqTables.js";

// ✅ Create Firebase app INSIDE Node context
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedMaterials() {

  const all = [
    ...defaultMechanical.map(i => ({
      ...i,
      discipline: "mechanical"
    })),
    ...defaultElectrical.map(i => ({
      ...i,
      discipline: "electrical"
    })),
    ...defaultPlumbing.map(i => ({
      ...i,
      discipline: "plumbing"
    })),
  ];

  for (const item of all) {

    const safeId = item.sku.replace(/\//g, "-");

    await setDoc(
      doc(db, "boqMaterials", safeId),
      item
    );
  }

  console.log("✅ Materials seeded");
}

seedMaterials();