import React, { useEffect, useState } from "react";
import axios from "axios";
import { auth } from "../firebaseClient";
import { handleLogout } from "../auth/SignOut";

export default function HospitalDashboard() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    async function fetchReports() {
      const token = await auth.currentUser.getIdToken();
      const res = await axios.get("/reports", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReports(res.data.reports || []);
    }
    fetchReports();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>🏥 Hospital Dashboard</h2>
      <p>Reports uploaded by hospitals</p>
      <ul>
        {reports.map((r) => (
          <li key={r.id}>{r.description || r.filename || "Unnamed report"}</li>
        ))}
      </ul>
      <button onClick={handleLogout}>Logout</button>
    </div>
    
  );
}
