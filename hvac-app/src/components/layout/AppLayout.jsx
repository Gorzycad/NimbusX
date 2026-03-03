// src/components/layout/AppLayout.jsx
import React from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import "./App.css";

export default function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="page-content">{children}</div>
      </div>
    </div>
  );
}
