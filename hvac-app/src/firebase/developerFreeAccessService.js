import {
  doc,
  setDoc,
  serverTimestamp,
  Timestamp,
  getDoc,
  updateDoc
} from "firebase/firestore";

import { db } from "./firebase";

export async function activateDeveloperFreeAccess({
  companyId,
  startDate,
  endDate,
  createdBy
}) {

  await setDoc(
    doc(db, "developerFreeAccess", String(companyId)),
    {
      companyId: String(companyId),
      active: true,
      startDate: Timestamp.fromDate(new Date(startDate)),
      endDate: Timestamp.fromDate(new Date(endDate)),
      createdAt: serverTimestamp(),
      createdBy
    }
  );

}


export async function disableDeveloperFreeAccess(companyId){

    await updateDoc(
        doc(
            db,
            "developerFreeAccess",
            String(companyId)
        ),
        {
            active:false
        }
    );

}


export async function getDeveloperFreeAccess(companyId){

    const snap = await getDoc(
        doc(
            db,
            "developerFreeAccess",
            String(companyId)
        )
    );

    if(!snap.exists())
        return null;

    return snap.data();

}