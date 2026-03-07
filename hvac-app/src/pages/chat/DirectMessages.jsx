// src/pages/chat/DirectMessages.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import StaffSelector from "../../components/layout/StaffSelector";
import { getRolesForSelector } from "../../config/roleAccess";

export default function DirectMessages() {
  const { companyId, user } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  // -------------------------
  // Load staff
  // -------------------------
  useEffect(() => {
    if (!companyId) return;

    const fetchStaff = async () => {
      const snap = await getDocs(
        collection(db, "companies", companyId, "users")
      );
      setStaffList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    fetchStaff();
  }, [companyId]);

  const staffNameMap = useMemo(() => {
    const map = {};
    staffList.forEach(u => {
      map[u.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    });
    return map;
  }, [staffList]);

  // -------------------------
  // Thread ID (1-to-1 only)
  // -------------------------
  const threadId = useMemo(() => {
    if (!selectedStaff.length || !user) return null;
    return [user.uid, selectedStaff[0]].sort().join("_");
  }, [selectedStaff, user]);

  const recipientId = selectedStaff[0];

  // -------------------------
  // Load messages
  // -------------------------
  useEffect(() => {
    if (!companyId || !threadId) return;

    const messagesRef = collection(
      db,
      "companies",
      companyId,
      "directMessages",
      threadId,
      "messages"
    );

    const q = query(messagesRef, orderBy("createdAt"));

    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => d.data()));
    });

    return () => unsub();
  }, [companyId, threadId]);

  // -------------------------
  // Send message + notify
  // -------------------------
  const sendMessage = async () => {
    if (!text.trim() || !threadId || !recipientId) return;

    const messagesRef = collection(
      db,
      "companies",
      companyId,
      "directMessages",
      threadId,
      "messages"
    );

    // 1️⃣ Save message
    await addDoc(messagesRef, {
      text,
      senderId: user.uid,
      senderName: staffNameMap[user.uid] || user.email,
      createdAt: serverTimestamp(),
    });

    // 2️⃣ Notify recipient ONLY
    if (recipientId !== user.uid) {
      await addDoc(
        collection(
          db,
          "companies",
          companyId,
          "users",
          recipientId,
          "notifications"
        ),
        {
          type: "DIRECT_MESSAGE",
          threadId,
          senderId: user.uid,
          message: `${staffNameMap[user.uid] || "Someone"} sent you a message`,
          createdAt: serverTimestamp(),
          read: false,
        }
      );
    }

    setText("");
  };

  return (
    <div>
      <h4>Direct Messages</h4>

      <div style={{ marginBottom: 15 }}>
        <label>Select Recipient:</label>
        <StaffSelector
          options={getRolesForSelector()}
          value={selectedStaff}
          onChange={setSelectedStaff}
        />
      </div>

      <div
        className="chat-box"
        style={{
          border: "1px solid #ccc",
          padding: 10,
          minHeight: 200,
          marginBottom: 10,
        }}
      >
        {messages.map((m, i) => (
          <div key={i}>
            <strong>
              {staffNameMap[m.senderId] || m.senderName || "Unknown"}:
            </strong>{" "}
            {m.text}
          </div>
        ))}

        {messages.length === 0 && <p>No messages yet.</p>}
      </div>

      <div>
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type your message..."
          style={{ width: "80%", marginRight: 10 }}
        />
        <button onClick={sendMessage} disabled={!selectedStaff.length}>
          Send
        </button>
      </div>
    </div>
  );
}
