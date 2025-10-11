import React, { useEffect, useState } from "react";
import axios from "axios";
import { auth } from "../firebaseClient";
import { handleLogout } from "../auth/SignOut";

export default function PharmacyDashboard() {
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
      <h2>💊 Pharmacy Dashboard</h2>
      <p>Reports shared with pharmacies</p>
      <ul>
        {reports.map((r) => (
          <li key={r.id}>{r.description || r.filename || "Unnamed report"}</li>
        ))}
      </ul>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
