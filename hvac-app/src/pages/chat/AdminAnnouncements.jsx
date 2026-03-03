// import React, { useEffect, useState } from "react";
// import { collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";
// import { db } from "../../firebase/firebase";
// import { useAuth } from "../../contexts/AuthContext";

// export default function AdminAnnouncements() {
//     const { user } = useAuth();
//     const [messages, setMessages] = useState([]);
//     const [text, setText] = useState("");

//     // 🛑 Guard: user not ready yet
//     if (!user) {
//         return <p>Loading messages...</p>;
//     }
//     const isAdmin = user?.role === "admin";

//     useEffect(() => {
//         const q = query(
//             collection(db, "chats", "admin", "messages"),
//             orderBy("createdAt", "desc")
//         );

//         return onSnapshot(q, snap => {
//             setMessages(snap.docs.map(d => d.data()));
//         });
//     }, []);

//     const sendAnnouncement = async () => {
//         if (!isAdmin || !text.trim()) return;

//         await addDoc(collection(db, "chats", "admin", "messages"), {
//             text,
//             createdBy: `${user.firstName} ${user.lastName}`,
//             createdAt: new Date(),
//         });

//         setText("");
//     };

//     return (
//         <div>
//             <h3>Admin Announcements</h3>

//             {isAdmin && (
//                 <>
//                     <textarea value={text} onChange={e => setText(e.target.value)} />
//                     <button onClick={sendAnnouncement}>Post</button>
//                 </>
//             )}

//             {messages.map((m, i) => (
//                 <div key={i}>
//                     <strong>{m.createdBy}</strong>
//                     <p>{m.text}</p>
//                 </div>
//             ))}
//         </div>
//     );
// }


// // src/pages/chat/AdminAnnouncements.jsx
// import React, { useEffect, useState } from "react";
// import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
// import { db } from "../../firebase/firebase";
// import { useAuth } from "../../contexts/AuthContext";

// export default function AdminAnnouncements() {
//   const { user, role } = useAuth();
//   const [messages, setMessages] = useState([]);
//   const [text, setText] = useState("");

//   const isAdmin = role?.includes("admin");

//   useEffect(() => {
//     const q = query(
//       collection(db, "chats", "admin", "global", "messages"),
//       orderBy("createdAt")
//     );

//     return onSnapshot(q, snap => {
//       setMessages(snap.docs.map(d => d.data()));
//     });
//   }, []);

//   const sendMessage = async () => {
//     if (!isAdmin || !text.trim()) return;

//     await addDoc(
//       collection(db, "chats", "admin", "global", "messages"),
//       {
//         text,
//         senderId: user.uid,
//         senderName: `${user.firstName} ${user.lastName}`,
//         createdAt: serverTimestamp(),
//       }
//     );

//     setText("");
//   };

//   return (
//     <div>
//       <h4>📢 Admin Announcements</h4>

//       <div className="chat-box">
//         {messages.map((m, i) => (
//           <div key={i}>
//             <strong>{m.senderName}</strong>: {m.text}
//           </div>
//         ))}
//       </div>

//       {isAdmin ? (
//         <>
//           <input value={text} onChange={e => setText(e.target.value)} />
//           <button onClick={sendMessage}>Post</button>
//         </>
//       ) : (
//         <p>Only admins can post announcements.</p>
//       )}
//     </div>
//   );
// }


// // src/pages/chat/AdminAnnouncements.jsx
// import React, { useEffect, useState } from "react";
// import { collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";
// import { db } from "../../firebase/firebase";
// import { useAuth } from "../../contexts/AuthContext";

// export default function AdminAnnouncements() {
//   const { user } = useAuth();
//   const [messages, setMessages] = useState([]);
//   const [text, setText] = useState("");

//   const canPost = user?.role === "company_admin"; // Only admins can send messages

//   useEffect(() => {
//     const messagesRef = collection(db, "chats_admin", "global", "messages");
//     const q = query(messagesRef, orderBy("createdAt"));

//     const unsubscribe = onSnapshot(q, snap => {
//       setMessages(snap.docs.map(d => d.data()));
//     });

//     return () => unsubscribe();
//   }, []);

//   const sendMessage = async () => {
//     if (!canPost || !text.trim()) return;

//     const messagesRef = collection(db, "chats_admin", "global", "messages");

//     await addDoc(messagesRef, {
//       text,
//       senderId: user.uid,
//       senderName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
//       createdAt: new Date(),
//     });

//     // await addDoc(notifRef, {
//     //   type: "ADMIN_ANNOUNCEMENT",
//     //   message: announcementText,
//     //   createdAt: serverTimestamp(),
//     //   read: false,
//     // });

//     setText("");
//   };

//   return (
//     <div>
//       <h4>Admin Announcements</h4>

//       <div className="chat-box" style={{ border: "1px solid #ddd", padding: 10, maxHeight: 300, overflowY: "auto" }}>
//         {messages.length ? (
//           messages.map((m, i) => (
//             <div key={i}>
//               <strong>{m.senderName}</strong>: {m.text}
//             </div>
//           ))
//         ) : (
//           <p>No announcements yet.</p>
//         )}
//       </div>

//       {canPost ? (
//         <div style={{ marginTop: 10 }}>
//           <input
//             type="text"
//             value={text}
//             onChange={(e) => setText(e.target.value)}
//             placeholder="Type announcement..."
//             style={{ width: "70%", marginRight: 10 }}
//           />
//           <button onClick={sendMessage}>Send</button>
//         </div>
//       ) : (
//         <p style={{ marginTop: 10, color: "red" }}>Only Admins can post announcements.</p>
//       )}
//     </div>
//   );
// }

// // src/pages/chat/AdminAnnouncements.jsx
// import React, { useEffect, useState } from "react";
// import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
// import { db } from "../../firebase/firebase";
// import { useAuth } from "../../contexts/AuthContext";

// export default function AdminAnnouncements({ staffNameMap }) {
//   const { user, companyId } = useAuth();
//   const [messages, setMessages] = useState([]);
//   const [text, setText] = useState("");

//   const canPost = user?.role === "company_admin"; // Only admins can post

//   // Subscribe to admin announcements
//   useEffect(() => {
//     if (!companyId) return;

//     const messagesRef = collection(db, "companies", companyId, "chats_admin", "global", "messages");
//     const q = query(messagesRef, orderBy("createdAt"));

//     const unsubscribe = onSnapshot(q, snap => {
//       setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
//     });

//     return () => unsubscribe();
//   }, [companyId]);

//   const sendMessage = async () => {
//     if (!canPost || !text.trim()) return;

//     // 1️⃣ Add message to Firestore
//     const messagesRef = collection(db, "companies", companyId, "chats_admin", "global", "messages");

//     await addDoc(messagesRef, {
//       text,
//       senderId: user.uid,
//       senderName: staffNameMap[user.uid] || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
//       createdAt: serverTimestamp(),
//     });

//     // 2️⃣ Notify all users in company
//     const usersRef = collection(db, "companies", companyId, "users");
//     const usersSnap = await (await usersRef.get()).docs; // Using getDocs later
//     const notifPromises = usersSnap.map(u =>
//       addDoc(collection(db, "companies", companyId, "users", u.id, "notifications"), {
//         type: "ADMIN_ANNOUNCEMENT",
//         message: `${staffNameMap[user.uid] || "Admin"}: ${text}`,
//         createdAt: serverTimestamp(),
//         read: false,
//       })
//     );

//     await Promise.all(notifPromises);

//     setText("");
//   };

//   return (
//     <div>
//       <h4>Admin Announcements</h4>

//       <div
//         className="chat-box"
//         style={{ border: "1px solid #ddd", padding: 10, maxHeight: 300, overflowY: "auto" }}
//       >
//         {messages.length ? (
//           messages.map((m, i) => (
//             <div key={i}>
//               <strong>{m.senderName}</strong>: {m.text}
//             </div>
//           ))
//         ) : (
//           <p>No announcements yet.</p>
//         )}
//       </div>

//       {canPost ? (
//         <div style={{ marginTop: 10 }}>
//           <input
//             type="text"
//             value={text}
//             onChange={(e) => setText(e.target.value)}
//             placeholder="Type announcement..."
//             style={{ width: "70%", marginRight: 10 }}
//           />
//           <button onClick={sendMessage}>Send</button>
//         </div>
//       ) : (
//         <p style={{ marginTop: 10, color: "red" }}>Only Admins can post announcements.</p>
//       )}
//     </div>
//   );
// }

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

