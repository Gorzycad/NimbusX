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
