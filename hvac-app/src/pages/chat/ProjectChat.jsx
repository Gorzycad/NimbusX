// // src/pages/chat/ProjectChat.jsx
// import React, { useEffect, useState } from "react";
// import {
//     collection,
//     addDoc,
//     query,
//     orderBy,
//     onSnapshot,
//     getDoc,
//     doc,
// } from "firebase/firestore";
// import { db } from "../../firebase/firebase";
// import { useAuth } from "../../contexts/AuthContext";
// import { getProjectNames } from "../../firebase/leadsService";

// export default function ProjectChat() {
//     const { user, companyId } = useAuth();

//     const [projects, setProjects] = useState([]);
//     const [projectId, setProjectId] = useState("");
//     const [allowedUserIds, setAllowedUserIds] = useState([]);

//     const [messages, setMessages] = useState([]);
//     const [text, setText] = useState("");


//     // 🛑 Guard: user not ready yet
//     if (!user) {
//         return <p>Loading messages...</p>;
//     }
//     /* -------------------------------
//        Load projects for selector
//     --------------------------------*/
//     useEffect(() => {
//         if (!companyId) return;

//         const loadProjects = async () => {
//             const list = await getProjectNames(companyId);
//             setProjects(list);
//         };

//         loadProjects();
//     }, [companyId]);

//     /* -------------------------------
//        Load assigned users for project
//     --------------------------------*/
//     useEffect(() => {
//         if (!projectId || !companyId) return;

//         const loadProjectStaff = async () => {
//             const ref = doc(db, "companies", companyId, "leads", projectId);
//             const snap = await getDoc(ref);

//             if (snap.exists()) {
//                 setAllowedUserIds(snap.data().staffAssigned || []);
//             } else {
//                 setAllowedUserIds([]);
//             }
//         };

//         loadProjectStaff();
//     }, [projectId, companyId]);

//     const canChat = allowedUserIds.includes(user.uid);

//     /* -------------------------------
//        Listen to messages
//     --------------------------------*/
//     useEffect(() => {
//         if (!projectId) return;

//         const q = query(
//             collection(db, "chats", "projects", projectId, "messages"),
//             orderBy("createdAt")
//         );

//         return onSnapshot(q, (snap) => {
//             setMessages(snap.docs.map((d) => d.data()));
//         });
//     }, [projectId]);

//     /* -------------------------------
//        Send message
//     --------------------------------*/
//     const sendMessage = async () => {
//         if (!canChat || !text.trim()) return;

//         await addDoc(
//             collection(db, "chats", "projects", projectId, "messages"),
//             {
//                 text,
//                 senderId: user.uid,
//                 senderName: `${user.firstName} ${user.lastName}`,
//                 createdAt: new Date(),
//             }
//         );

//         setText("");
//     };

//     return (
//         <div>
//             <h4>Project Chat</h4>

//             {/* 🔽 Project Selector */}
//             <select
//                 value={projectId}
//                 onChange={(e) => setProjectId(e.target.value)}
//                 style={{ marginBottom: 10, width: "100%" }}
//             >
//                 <option value="">Select Project</option>
//                 {projects.map((p) => (
//                     <option key={p.id} value={p.id}>
//                         {p.projectName}
//                     </option>
//                 ))}
//             </select>

//             {!projectId && <p>Please select a project.</p>}

//             {projectId && (
//                 <>
//                     <div className="chat-box" style={{ marginBottom: 10 }}>
//                         {messages.length === 0 && <p>No messages yet.</p>}

//                         {messages.map((m, i) => (
//                             <div key={i}>
//                                 <strong>{m.senderName}</strong>: {m.text}
//                             </div>
//                         ))}
//                     </div>

//                     {canChat ? (
//                         <>
//                             <input
//                                 value={text}
//                                 onChange={(e) => setText(e.target.value)}
//                                 placeholder="Type a message"
//                                 style={{ width: "80%" }}
//                             />
//                             <button onClick={sendMessage}>Send</button>
//                         </>
//                     ) : (
//                         <p style={{ color: "red" }}>
//                             You are not assigned to this project.
//                         </p>
//                     )}
//                 </>
//             )}
//         </div>
//     );
// }

// // src/pages/chat/ProjectChat.jsx
// import React, { useEffect, useState } from "react";
// import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
// import { db } from "../../firebase/firebase";
// import { useAuth } from "../../contexts/AuthContext";
// import { getProjectNames } from "../../firebase/leadsService";

// export default function ProjectChat() {
//   const { user, companyId } = useAuth();
//   const [projects, setProjects] = useState([]);
//   const [projectId, setProjectId] = useState("");
//   const [messages, setMessages] = useState([]);
//   const [text, setText] = useState("");

//   // Load projects
//   useEffect(() => {
//     if (!companyId) return;

//     getProjectNames(companyId).then(setProjects);
//   }, [companyId]);

//   // Load messages
//   useEffect(() => {
//     if (!projectId) return;

//     const q = query(
//       collection(db, "chats", "projects", projectId, "messages"),
//       orderBy("createdAt")
//     );

//     return onSnapshot(q, snap => {
//       setMessages(snap.docs.map(d => d.data()));
//     });
//   }, [projectId]);

//   const sendMessage = async () => {
//     if (!text.trim() || !projectId) return;

//     await addDoc(
//       collection(db, "chats", "projects", projectId, "messages"),
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
//       <h4>📁 Project Chat</h4>

//       <select value={projectId} onChange={e => setProjectId(e.target.value)}>
//         <option value="">Select a project</option>
//         {projects.map(p => (
//           <option key={p.id} value={p.id}>
//             {p.projectName}
//           </option>
//         ))}
//       </select>

//       {projectId && (
//         <>
//           <div className="chat-box">
//             {messages.map((m, i) => (
//               <div key={i}>
//                 <strong>{m.senderName}</strong>: {m.text}
//               </div>
//             ))}
//           </div>

//           <input value={text} onChange={e => setText(e.target.value)} />
//           <button onClick={sendMessage}>Send</button>
//         </>
//       )}
//     </div>
//   );
// }

// // src/pages/chat/ProjectChat.jsx
// import React, { useEffect, useState } from "react";
// import { collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";
// import { db } from "../../firebase/firebase";
// import { useAuth } from "../../contexts/AuthContext";
// import { getLeads } from "../../firebase/leadsService";

// export default function ProjectChat() {
//   const { user, companyId } = useAuth();
//   const [projects, setProjects] = useState([]);
//   const [selectedProjectId, setSelectedProjectId] = useState("");
//   const [allowedUserIds, setAllowedUserIds] = useState([]);
//   const [messages, setMessages] = useState([]);
//   const [text, setText] = useState("");

//   // Load projects for selector
//   useEffect(() => {
//     if (!companyId) return;

//     const fetchProjects = async () => {
//       const data = await getLeads(companyId);
//       setProjects(data || []);
//     };

//     fetchProjects();
//   }, [companyId]);

//   // Update allowed users when project changes
//   useEffect(() => {
//     if (!selectedProjectId) {
//       setAllowedUserIds([]);
//       setMessages([]);
//       return;
//     }

//     const project = projects.find(p => p.id === selectedProjectId);
//     if (project) {
//       setAllowedUserIds(project.staffAssigned || []);
//     }

//     // Subscribe to messages
//     const messagesRef = collection(db, "chats_projects", selectedProjectId, "messages");
//     const q = query(messagesRef, orderBy("createdAt"));

//     const unsubscribe = onSnapshot(q, snap => {
//       setMessages(snap.docs.map(d => d.data()));
//     });

//     return () => unsubscribe();
//   }, [selectedProjectId, projects]);

//   const canChat = selectedProjectId && allowedUserIds.includes(user.uid);

//   const sendMessage = async () => {
//     if (!canChat || !text.trim()) return;

//     const messagesRef = collection(db, "chats_projects", selectedProjectId, "messages");

//     await addDoc(messagesRef, {
//       text,
//       senderId: user.uid,
//       senderName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
//       createdAt: new Date(),
//     });

//     // await addDoc(notifRef, {
//     //   type: "PROJECT_CHAT",
//     //   projectId,
//     //   message: `New message in project chat`,
//     //   createdAt: serverTimestamp(),
//     //   read: false,
//     // });

//     setText("");
//   };

//   return (
//     <div>
//       <h4>Project Chat</h4>

//       {/* Project Selector */}
//       <div style={{ marginBottom: 15 }}>
//         <label>Select Project: </label>
//         <select
//           value={selectedProjectId}
//           onChange={(e) => setSelectedProjectId(e.target.value)}
//         >
//           <option value="">-- Select a project --</option>
//           {projects.map((p) => (
//             <option key={p.id} value={p.id}>
//               {p.projectName}
//             </option>
//           ))}
//         </select>
//       </div>

//       {/* Chat Box */}
//       <div className="chat-box" style={{ border: "1px solid #ddd", padding: 10, maxHeight: 300, overflowY: "auto" }}>
//         {messages.length ? (
//           messages.map((m, i) => (
//             <div key={i}>
//               <strong>{m.senderName}</strong>: {m.text}
//             </div>
//           ))
//         ) : (
//           <p>No messages yet.</p>
//         )}
//       </div>

//       {/* Input */}
//       {canChat ? (
//         <div style={{ marginTop: 10 }}>
//           <input
//             type="text"
//             value={text}
//             onChange={(e) => setText(e.target.value)}
//             placeholder="Type a message..."
//             style={{ width: "70%", marginRight: 10 }}
//           />
//           <button onClick={sendMessage}>Send</button>
//         </div>
//       ) : selectedProjectId ? (
//         <p style={{ marginTop: 10, color: "red" }}>You are not assigned to this project.</p>
//       ) : null}
//     </div>
//   );
// }


// src/pages/chat/ProjectChat.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { getLeads } from "../../firebase/leadsService";

export default function ProjectChat() {
  const { user, companyId } = useAuth();

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});

  /* -------------------------------------------------- */
  /* Load projects (leads) */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (!companyId) return;

    const loadProjects = async () => {
      const data = await getLeads(companyId);
      setProjects(data || []);
    };

    loadProjects();
  }, [companyId]);

  /* -------------------------------------------------- */
  /* Load staff list (for staffNameMap) */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (!companyId) return;

    const unsub = onSnapshot(
      collection(db, "companies", companyId, "users"),
      snap => {
        setStaffList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    return () => unsub();
  }, [companyId]);

  /* -------------------------------------------------- */
  /* staffNameMap */
  /* -------------------------------------------------- */
  const staffNameMap = useMemo(() => {
    const map = {};
    staffList.forEach(u => {
      map[u.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    });
    return map;
  }, [staffList]);

  /* -------------------------------------------------- */
  /* Selected project + allowed users */
  /* -------------------------------------------------- */
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const allowedUserIds = selectedProject?.staffAssigned || [];
  const canChat = selectedProjectId && allowedUserIds.includes(user.uid);

  /* -------------------------------------------------- */
  /* Subscribe to messages */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (!companyId || !selectedProjectId) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(
      db,
      "companies",
      companyId,
      "projectChats",
      selectedProjectId,
      "messages"
    );

    const q = query(messagesRef, orderBy("createdAt"));

    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => d.data()));
    });

    return () => unsub();
  }, [companyId, selectedProjectId]);

  /* -------------------------------------------------- */
  /* Track unread counts per project */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (!companyId || !user) return;

    const notifRef = collection(
      db,
      "companies",
      companyId,
      "users",
      user.uid,
      "notifications"
    );

    const unsub = onSnapshot(notifRef, snap => {
      const counts = {};
      snap.docs.forEach(d => {
        const n = d.data();
        if (n.type === "PROJECT_CHAT" && !n.read) {
          counts[n.projectId] = (counts[n.projectId] || 0) + 1;
        }
      });
      setUnreadCounts(counts);
    });

    return () => unsub();
  }, [companyId, user]);

  /* -------------------------------------------------- */
  /* Send message */
  /* -------------------------------------------------- */
  const sendMessage = async () => {
    if (!canChat || !text.trim()) return;

    const messagesRef = collection(
      db,
      "companies",
      companyId,
      "projectChats",
      selectedProjectId,
      "messages"
    );

    await addDoc(messagesRef, {
      text,
      senderId: user.uid,
      senderName: staffNameMap[user.uid] || user.email,
      createdAt: serverTimestamp(),
    });

    // 🔔 Notify all assigned users except sender
    const notifPromises = allowedUserIds
      .filter(uid => uid !== user.uid)
      .map(uid =>
        addDoc(
          collection(
            db,
            "companies",
            companyId,
            "users",
            uid,
            "notifications"
          ),
          {
            type: "PROJECT_CHAT",
            projectId: selectedProjectId,
            message: `New message in project "${selectedProject.projectName}"`,
            createdAt: serverTimestamp(),
            read: false,
          }
        )
      );

    await Promise.all(notifPromises);

    setText("");
  };

  /* -------------------------------------------------- */
  /* UI */
  /* -------------------------------------------------- */
  return (
    <div>
      <h4>Project Chat</h4>

      {/* Project Selector */}
      <div style={{ marginBottom: 15 }}>
        <label>Select Project:</label>
        <select
          value={selectedProjectId}
          onChange={e => setSelectedProjectId(e.target.value)}
        >
          <option value="">-- Select a project --</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.projectName}
              {unreadCounts[p.id]
                ? ` (${unreadCounts[p.id]} unread)`
                : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Chat box */}
      <div
        className="chat-box"
        style={{
          border: "1px solid #ddd",
          padding: 10,
          maxHeight: 300,
          overflowY: "auto",
        }}
      >
        {messages.length ? (
          messages.map((m, i) => (
            <div key={i}>
              <strong>
                {staffNameMap[m.senderId] || m.senderName || "Unknown"}
              </strong>
              : {m.text}
            </div>
          ))
        ) : (
          <p>No messages yet.</p>
        )}
      </div>

      {/* Input */}
      {canChat ? (
        <div style={{ marginTop: 10 }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type a message..."
            style={{ width: "70%", marginRight: 10 }}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      ) : selectedProjectId ? (
        <p style={{ color: "red", marginTop: 10 }}>
          You are not assigned to this project.
        </p>
      ) : null}
    </div>
  );
}
