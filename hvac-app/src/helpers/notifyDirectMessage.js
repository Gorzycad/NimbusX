// src/helpers/notifyDirectMessage.js
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

export async function notifyDirectMessage({
    companyId,
    recipientId,
    senderId,
    senderName,
    threadId,
    messageText,
}) {
    const notifRef = collection(
        db,
        "companies",
        companyId,
        "users",
        recipientId,
        "notifications"
    );

    await addDoc(notifRef, {
        type: "direct_message",
        threadId,
        senderId,
        senderName,
        messagePreview: messageText.slice(0, 80),
        createdAt: serverTimestamp(),
        read: false,
    });
}
