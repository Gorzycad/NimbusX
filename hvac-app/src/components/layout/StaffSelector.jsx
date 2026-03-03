import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuth } from "../../contexts/AuthContext";
import "./StaffSelector.css";

export default function StaffSelector({ value = [], onChange }) {
  const { companyId } = useAuth();
  const [open, setOpen] = useState(false);
  const [staff, setStaff] = useState([]);

  // Load staff names from Firestore
  useEffect(() => {
    if (!companyId) return;

    const loadStaff = async () => {
      const snap = await getDocs(
        collection(db, "companies", companyId, "users")
      );

      const list = snap.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().firstName + " " + doc.data().lastName,
        role: doc.data().role,
      }));

      setStaff(list);
    };

    loadStaff();
  }, [companyId]);

  const toggleStaff = (id) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  // Group staff by role
  const roles = staff.reduce((groups, user) => {
    if (!groups[user.role]) groups[user.role] = [];
    groups[user.role].push(user);
    return groups;
  }, {});

  const selectedNames = staff
    .filter((s) => value.includes(s.id))
    .map((s) => s.name)
    .join(", ");

  return (
    <div className="staff-selector">
      <label className="staff-selector__label">Staff Assigned</label>

      <div className="staff-selector__header" onClick={() => setOpen(!open)}>
        {value.length === 0 ? "Select Staff" : selectedNames}
      </div>

      {open && (
        <div className="staff-selector__options">
          {Object.keys(roles).map((role) => (
            <div key={role} className="staff-role-group">
              <div className="staff-role-title">
                {role.replace(/_/g, " ").toUpperCase()}
              </div>

              {roles[role].map((user) => (
                <label
                  key={user.id}
                  className="staff-selector__option staff-name"
                >
                  <input
                    type="checkbox"
                    checked={value.includes(user.id)}
                    onChange={() => toggleStaff(user.id)}
                  />
                  <span>{user.name}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
