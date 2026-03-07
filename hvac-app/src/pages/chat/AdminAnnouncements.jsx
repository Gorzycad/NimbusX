import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  getDocs
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuth } from "../../contexts/AuthContext";

export default function AdminAnnouncements() {
  const { user, companyId } = useAuth();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [role, setRole] = useState(null);
  const [staffList, setStaffList] = useState([]);

  /* -------------------------------------------------- */
  /* Load role from Firestore */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (!user || !companyId) return;

    const loadRole = async () => {
      const ref = doc(db, "companies", companyId, "users", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) setRole(snap.data().role);
    };

    loadRole();
  }, [user, companyId]);

  /* -------------------------------------------------- */
  /* Load staff list for staffNameMap */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (!companyId) return;

    const fetchStaff = async () => {
      const snap = await getDocs(collection(db, "companies", companyId, "users"));
      setStaffList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };

    fetchStaff();
  }, [companyId]);

  /* -------------------------------------------------- */
  /* Memoize staffNameMap at top level */
  /* -------------------------------------------------- */
  const staffNameMap = useMemo(() => {
    const map = {};
    staffList.forEach((u) => {
      map[u.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    });
    return map;
  }, [staffList]);

  const canPost = role === "Company Admin";
  console.log("Role:", role, "Can post:", canPost);

  /* -------------------------------------------------- */
  /* Subscribe to announcements */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (!companyId) return;

    const messagesRef = collection(
      db,
      "companies",
      companyId,
      "chats_admin",
      "global",
      "messages"
    );

    const q = query(messagesRef, orderBy("createdAt"));

    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [companyId]);

  /* -------------------------------------------------- */
  /* Send announcement */
  /* -------------------------------------------------- */
  const sendMessage = async () => {
    if (!canPost || !text.trim()) return;

    const senderName =
      staffNameMap?.[user.uid] || `${user.firstName || ""} ${user.lastName || ""}`.trim();

      const messagesRef = collection(
      db,
      "companies",
      companyId,
      "chats_admin",
      "global",
      "messages"
    );

    await addDoc(messagesRef, {
      text,
      //senderId: user.uid,
      //senderName: staffNameMap?.[user.uid] || user.email,
      senderId: user.uid,
      senderName,
      createdAt: serverTimestamp(),
    });

    // 🔔 Notify all company users
    const usersSnap = await getDocs(
      collection(db, "companies", companyId, "users")
    );

    await Promise.all(
      usersSnap.docs.map(u =>
        addDoc(
          collection(db, "companies", companyId, "users", u.id, "notifications"),
          {
            type: "ADMIN_ANNOUNCEMENT",
            //message: `New admin announcement`,
            message: `${senderName}: ${text}`,
            createdAt: serverTimestamp(),
            read: false,
          }
        )
      )
    );

    setText("");
  };

  return (
    <div>
      <h4>Admin Announcements</h4>

      <div style={{ border: "1px solid #ddd", padding: 10, maxHeight: 300 }}>
        {messages.length ? (
          messages.map(m => (
            <div key={m.id}>
              <strong>{m.senderName}</strong>: {m.text}
            </div>
          ))
        ) : (
          <p>No announcements yet.</p>
        )}
      </div>

      {canPost ? (
        <div style={{ marginTop: 10 }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type announcement..."
            rows={5}
            style={{ width: "70%", marginRight: 10 }}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      ) : (
        <p style={{ color: "red", marginTop: 10 }}>
          Only Admins can post announcements.
        </p>
      )}
    </div>
  );
}

