// //src/pages/dashboard/Notifications.jsx
// // ---------------- NOTIFICATION COMPONENT ---------------- //
// import React, { useEffect, useState } from "react";
// import {
//   collection,
//   query,
//   orderBy,
//   onSnapshot,
//   updateDoc,
//   doc,
// } from "firebase/firestore";
// import { db } from "../../firebase/firebase";
// import { useAuth } from "../../contexts/AuthContext";

// function Notifications() {
//   const { user, companyId } = useAuth();
//   const [notifications, setNotifications] = useState([]);
//   const [open, setOpen] = useState(() => {
//     // 🟢 Load saved state from localStorage (default to false)
//     const saved = localStorage.getItem("notifDropdownOpen");
//     return saved === null ? true : saved === "true";
//   });

//   // 🔵 Save whenever state changes
//   useEffect(() => {
//     localStorage.setItem("notifDropdownOpen", open ? "true" : "false");
//   }, [open]);

//   useEffect(() => {
//     if (!user || !companyId) return;

//     const notifRef = collection(
//       db,
//       "companies",
//       companyId,
//       "users",
//       user.uid,
//       "notifications"
//     );

//     const q = query(notifRef, orderBy("createdAt", "desc"));

//     const unsubscribe = onSnapshot(q, (snapshot) => {
//       const list = snapshot.docs.map((d) => ({
//         id: d.id,
//         ...d.data(),
//       }));
//       setNotifications(list);
//     });

//     return () => unsubscribe();
//   }, [user, companyId]);


//   const unreadCount = notifications.filter((n) => !n.read).length;

//   const grouped = notifications.reduce((acc, n) => {
//     if (!acc[n.type]) acc[n.type] = [];
//     acc[n.type].push(n);
//     return acc;
//   }, {});

//   const handleNotificationClick = async (notif) => {
//     // Mark as read
//     await updateDoc(
//       doc(db, "companies", companyId, "users", user.uid, "notifications", notif.id),
//       { read: true }
//     );

//     switch (notif.type) {
//       case "JOBS_ASSIGNED":
//         navigate("/leads");
//         break;

//       case "DIRECT_MESSAGE":
//         navigate(`/chat/direct?thread=${notif.threadId}`);
//         break;

//       case "ADMIN_ANNOUNCEMENT":
//         navigate("/chat/admin");
//         break;

//       case "PROJECT_CHAT":
//         navigate(`/chat/project?projectId=${notif.projectId}`);
//         break;

//       default:
//         navigate("/notifications");
//     }
//   };

//   // Mark single notification as read
//   async function markAsRead(id) {
//     await updateDoc(
//       doc(
//         db,
//         "companies",
//         companyId,
//         "users",
//         user.uid,
//         "notifications",
//         id
//       ),
//       { read: true }
//     );

//   }

//   // Mark all notifications as read
//   async function markAllAsRead() {
//     const batch = notifications
//       .filter((n) => !n.read)
//       .map((n) =>
//         updateDoc(
//           doc(
//             db,
//             "companies",
//             companyId,
//             "users",
//             user.uid,
//             "notifications",
//             n.id
//           ),
//           { read: true }
//         )

//       );
//     await Promise.all(batch);
//   }

//   return (
//     <div style={{ marginTop: 30 }}>
//       {/* BUTTON */}
//       <button
//         onClick={() => setOpen(!open)}
//         style={{
//           padding: "10px 20px",
//           fontSize: 16,
//           cursor: "pointer",
//           position: "relative",
//         }}
//       >
//         Notifications

//         {/* 🔴 unread badge */}
//         {unreadCount > 0 && (
//           <span
//             style={{
//               background: "red",
//               color: "white",
//               borderRadius: "50%",
//               padding: "3px 7px",
//               fontSize: 12,
//               position: "absolute",
//               top: -5,
//               right: -5,
//             }}
//           >
//             {unreadCount}
//           </span>
//         )}
//       </button>

//       {/* FULL-WIDTH DROPDOWN PANEL */}
//       {open && (
//         <div
//           style={{
//             marginTop: 10,
//             padding: 15,
//             border: "1px solid #ccc",
//             borderRadius: 8,
//             width: "100%", //fULL WIDTH
//             background: "white",
//             boxSizing: "border-box", //Prevent overflow
//           }}
//         >
//           <div style={{ display: "flex", justifyContent: "space-between" }}>
//             <strong>Notifications</strong>
//             {unreadCount > 0 && (
//               <button
//                 onClick={markAllAsRead}
//                 style={{
//                   background: "transparent",
//                   border: "none",
//                   color: "blue",
//                   cursor: "pointer",
//                 }}
//               >
//                 Mark all as read
//               </button>
//             )}
//           </div>

//           <hr />

//           {notifications.length === 0 ? (
//             <p>No notifications yet.</p>
//           ) : (
//             notifications.map((n) => (
//               <div
//                 key={n.id}
//                 style={{
//                   padding: "10px 0",
//                   borderBottom: "1px solid #eee",
//                   opacity: n.read ? 0.6 : 1,
//                   cursor: "pointer",
//                 }}
//                 onClick={() => markAsRead(n.id)}
//               >
//                 <p style={{ margin: 0 }}>{n.message}</p>
//                 <small style={{ color: "#666" }}>
//                   {n.createdAt?.seconds
//                     ? new Date(n.createdAt.seconds * 1000).toLocaleString()
//                     : "Just now"}
//                 </small>
//               </div>
//             ))
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// export default Notifications;

// src/pages/dashboard/Notifications.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const TYPE_LABELS = {
  JOBS_ASSIGNED: "Jobs Assigned",
  DIRECT_MESSAGE: "Direct Messages",
  ADMIN_ANNOUNCEMENT: "Admin Announcements",
  PROJECT_CHAT: "Project Chats",
};

function Notifications() {
  const { user, companyId } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(() => {
    const saved = localStorage.getItem("notifDropdownOpen");
    return saved === null ? true : saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("notifDropdownOpen", open ? "true" : "false");
  }, [open]);

  useEffect(() => {
    if (!user || !companyId) return;

    const notifRef = collection(
      db,
      "companies",
      companyId,
      "users",
      user.uid,
      "notifications"
    );

    const q = query(notifRef, orderBy("createdAt", "desc"));

    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setNotifications(list);
    });
  }, [user, companyId]);

  // 🔴 total unread (for header badge)
  const unreadCount = notifications.filter((n) => !n.read).length;

  // 🧠 group by type
  const grouped = notifications.reduce((acc, n) => {
    const type = n.type || "Other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(n);
    return acc;
  }, {});

  // 🔢 unread per group
  const unreadByType = Object.fromEntries(
    Object.entries(grouped).map(([type, list]) => [
      type,
      list.filter((n) => !n.read).length,
    ])
  );

  const handleNotificationClick = async (notif) => {
    // mark read
    if (!notif.read) {
      await updateDoc(
        doc(
          db,
          "companies",
          companyId,
          "users",
          user.uid,
          "notifications",
          notif.id
        ),
        { read: true }
      );
    }

    // navigate
    switch (notif.type) {
      case "JOBS_ASSIGNED":
        navigate("/leads");
        break;

      case "DIRECT_MESSAGE":
        navigate(`/chat/direct?thread=${notif.threadId}`);
        break;

      case "ADMIN_ANNOUNCEMENT":
        navigate("/chat/admin");
        break;

      case "PROJECT_CHAT":
        navigate(`/chat/project?projectId=${notif.projectId}`);
        break;

      default:
        break;
    }
  };

  async function markAllAsRead() {
    await Promise.all(
      notifications
        .filter((n) => !n.read)
        .map((n) =>
          updateDoc(
            doc(
              db,
              "companies",
              companyId,
              "users",
              user.uid,
              "notifications",
              n.id
            ),
            { read: true }
          )
        )
    );
  }

  return (
    <div style={{ marginTop: 30 }}>
      {/* 🔔 BUTTON */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: "10px 20px",
          fontSize: 16,
          position: "relative",
        }}
      >
        Notifications
        {unreadCount > 0 && (
          <span
            style={{
              background: "red",
              color: "white",
              borderRadius: "50%",
              padding: "3px 7px",
              fontSize: 12,
              position: "absolute",
              top: -5,
              right: -5,
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            marginTop: 10,
            padding: 15,
            border: "1px solid #ccc",
            borderRadius: 8,
            background: "white",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "blue",
                  cursor: "pointer",
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          <hr />

          {Object.keys(grouped).length === 0 && (
            <p>No notifications yet.</p>
          )}

          {Object.entries(grouped).map(([type, list]) => (
            <div key={type} style={{ marginBottom: 15 }}>
              {/* SECTION HEADER */}
              <div
                style={{
                  fontWeight: "bold",
                  marginBottom: 6,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>{TYPE_LABELS[type] || type}</span>
                {unreadByType[type] > 0 && (
                  <span style={{ color: "red", fontSize: 12 }}>
                    {unreadByType[type]} unread
                  </span>
                )}
              </div>

              {/* ITEMS */}
              {list.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    padding: "8px 0",
                    borderBottom: "1px solid #eee",
                    cursor: "pointer",
                    opacity: n.read ? 0.6 : 1,
                  }}
                >
                  <p style={{ margin: 0 }}>{n.message}</p>
                  <small style={{ color: "#666" }}>
                    {n.createdAt?.seconds
                      ? new Date(
                          n.createdAt.seconds * 1000
                        ).toLocaleString()
                      : "Just now"}
                  </small>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;

