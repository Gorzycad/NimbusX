import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../firebase/firebase";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
} from "firebase/firestore";

export default function SupportPage() {
  const { user: authUser, role } = useAuth();
  const [user, setUser] = useState(null); // Firestore user with companyId
  const [tickets, setTickets] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  // 👇 PASTE RIGHT HERE
  const getStaffName = () => {
    if (!user) return "Unknown User";
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    return fullName || "Unknown User";
  };

  // For developers, allow selecting company
  const [companies, setCompanies] = useState([]);

  // Load Firestore user profile (to get companyId)
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!authUser) return;
      const userDoc = await getDoc(doc(db, "users", authUser.uid));
      if (userDoc.exists()) {
        setUser({ uid: authUser.uid, ...userDoc.data() });
      }
    };
    loadUserProfile();
  }, [authUser]);

  // Set selected company (for normal users or developer)
  useEffect(() => {
    if (role === "developer") {
      const loadCompanies = async () => {
        const snap = await getDocs(collection(db, "companies"));
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCompanies(list);
        if (list.length > 0) setSelectedCompanyId(list[0].id); // default to first
      };
      loadCompanies();
    } else if (user?.companyId) {
      setSelectedCompanyId(user.companyId);
    }
  }, [role, user]);

  // Load tickets for given company or all companies
  const loadTickets = async (companyId) => {
    if (!companyId) return;
    setLoading(true);

    let ticketsList = [];

    if (role === "developer") {
      const allCompaniesSnap = await getDocs(collection(db, "companies"));
      for (const companyDoc of allCompaniesSnap.docs) {
        const q = query(
          collection(db, "companies", companyDoc.id, "support_tickets"),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        ticketsList.push(
          ...snap.docs.map((d) => ({ id: d.id, companyId: companyDoc.id, ...d.data() }))
        );
      }
    } else if (role === "app_support") {
      const q = query(
        collection(db, "companies", companyId, "support_tickets"),
        where("category", "==", "marketplace"),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      ticketsList = snap.docs.map((d) => ({ id: d.id, companyId, ...d.data() }));
    } else if (user?.companyId) {
      const q = query(
        collection(db, "companies", companyId, "support_tickets"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      ticketsList = snap.docs.map((d) => ({ id: d.id, companyId, ...d.data() }));
    }

    setTickets(ticketsList);
    setLoading(false);
  };

  // Reload tickets when selectedCompanyId changes or user loads
  useEffect(() => {
    if (role !== "market_agent" && selectedCompanyId) loadTickets(selectedCompanyId);
  }, [role, selectedCompanyId, user]);

  // Open a new ticket
  const handleOpenTicket = async (category = "general") => {
    if (!newMessage.trim()) return alert("Message is required");

    const companyIdToUse = role === "developer" ? selectedCompanyId : user?.companyId;
    if (!companyIdToUse) return alert("User companyId is missing. Tickets cannot be submitted.");

    const ticketData = {
      userId: user.uid,
      userName: getStaffName(), // ✅ FIXED
      category,
      companyId: companyIdToUse,
        messages: [
          {
          senderId: user.uid,
          senderName: getStaffName(), // ✅ FIXED
          text: newMessage,
          createdAt: Date.now(), //✅ FIXED
        },
      ],
      status: "open",
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, "companies", companyIdToUse, "support_tickets"), ticketData);

    setNewMessage("");
    loadTickets(companyIdToUse);
  };

  const handleReply = async (ticketId, replyText, companyId) => {
    if (!replyText.trim()) return;
    const ticketRef = doc(db, "companies", companyId, "support_tickets", ticketId);
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return console.warn("Ticket not found for reply.");


    const updatedMessages = [
      ...ticket.messages,
      {
        senderId: user.uid,
        senderName: getStaffName() || "Support",
        text: replyText,
        createdAt: Date.now(), //✅ FIXED
      },
    ];

    await updateDoc(ticketRef, { messages: updatedMessages });
    loadTickets(companyId);
  };

  const handleCloseTicket = async (ticketId, companyId) => {
    const ticketRef = doc(db, "companies", companyId, "support_tickets", ticketId);
    await updateDoc(ticketRef, { status: "closed" });
    if (!companyId) return console.warn("CompanyId missing. Cannot delete/close ticket.");
    loadTickets(companyId);
    
  };

  const handleDeleteTicket = async (ticketId, companyId) => {
    if (!window.confirm("Are you sure you want to delete this ticket?")) return;
    await deleteDoc(doc(db, "companies", companyId, "support_tickets", ticketId));
    if (!companyId) return console.warn("CompanyId missing. Cannot delete/close ticket.");
    loadTickets(companyId);
  };

  if (role === "market_agent") return <p>Access denied. This page is not for you.</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Support Tickets</h2>

      {/* Developer: select company */}
      {role === "developer" && companies.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <label>Select Company: </label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName || c.id}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Ticket submission for normal users */}
      {(role !== "app_support" && role !== "developer" && user?.companyId) && (
        <div style={{ marginBottom: 20 }}>
          <h4>Open a New Ticket</h4>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Describe your issue..."
            style={{ width: "100%", height: 80 }}
          />
          <button onClick={() => handleOpenTicket("general")} style={{ marginTop: 8 }}>
            Submit Ticket
          </button>
        </div>
      )}

      {/* Developer ticket creation */}
      {role === "developer" && companies.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h4>Open a New Ticket</h4>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Describe your issue..."
            style={{ width: "100%", height: 80, marginTop: 8 }}
          />
          <button onClick={() => handleOpenTicket("general")} style={{ marginTop: 8 }}>
            Submit Ticket
          </button>
        </div>
      )}

      {loading && <p>Loading tickets...</p>}
      {tickets.length === 0 && !loading && <p>No tickets yet.</p>}

      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          style={{
            border: "1px solid #ccc",
            padding: 10,
            marginBottom: 12,
            borderRadius: 6,
            background: ticket.status === "closed" ? "#f8f8f8" : "white",
          }}
        >
          <div>
            <strong>Ticket ID:</strong> {ticket.id}{" "}
            <span style={{ float: "right" }}>
              Status:{" "}
              <span style={{ color: ticket.status === "closed" ? "red" : "green" }}>
                {ticket.status}
              </span>
            </span>
          </div>
          <div>
            <strong>Created By:</strong> {ticket.userName} | <strong>Category:</strong>{" "}
            {ticket.category || "general"} | <strong>Company:</strong> {ticket.companyId}
          </div>

          <div style={{ marginTop: 8 }}>
            {ticket.messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  padding: 4,
                  marginBottom: 2,
                  background: m.senderId === user.uid ? "#d1e7dd" : "#f8f9fa",
                  borderRadius: 4,
                }}
              >
                <strong>{m.senderName}:</strong> {m.text}
              </div>
            ))}
          </div>

          {(role === "developer" || role === "app_support") && ticket.status !== "closed" && (
            <div style={{ marginTop: 8 }}>
              <input
                type="text"
                placeholder="Reply..."
                style={{ width: "70%", marginRight: 8 }}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    await handleReply(ticket.id, e.target.value, ticket.companyId);
                    e.target.value = "";
                  }
                }}
              />
              <button onClick={() => handleCloseTicket(ticket.id, ticket.companyId)}>Close</button>
              <button
                onClick={() => handleDeleteTicket(ticket.id, ticket.companyId)}
                style={{ marginLeft: 8, color: "red" }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
