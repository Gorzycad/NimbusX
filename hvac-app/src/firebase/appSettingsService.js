// src/firebase/appSettingsService.js
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

// READ
export const getAppSettings = async () => {
  const ref = doc(db, "systemSettings", "appConfig");
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data();
  }

  return null;
};

// CREATE INITIAL (IMPORTANT)
export const initializeAppSettings = async () => {
  const ref = doc(db, "systemSettings", "appConfig");
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      monthlyFee: 26050,
      materialPriceMarkup: 12,
      vatPercent: 7.5,
      lagosBaseDeliveryFee: 10000,
      lagosPerKgFee: 500,
      outsideLagosBaseDeliveryFee: 90000,
      outsideLagosPerKgFee: 2000,
    });
  }
};

// UPDATE FULL SETTINGS
export const updateAppSettings = async (data) => {
  const ref = doc(db, "systemSettings", "appConfig");

  await setDoc(ref, data, { merge: true });
};