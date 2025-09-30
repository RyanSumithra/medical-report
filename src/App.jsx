// src/MedReportApp.jsx
import React, { useEffect, useState } from "react";
import {
  getContract,
  getOwner,
  getRole,
  addPatient,
  addBill,
  addReport,
} from "./services";

export default function MedReportApp() {
  const [account, setAccount] = useState(null);
  const [owner, setOwner] = useState(null);
  const [role, setRole] = useState(0);
  const [status, setStatus] = useState("");

  // form states
  const [patientName, setPatientName] = useState("");
  const [patientMeta, setPatientMeta] = useState("");
  const [patientId, setPatientId] = useState("");
  const [billCID, setBillCID] = useState("");
  const [reportType, setReportType] = useState("");
  const [reportCID, setReportCID] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { signer } = await getContract();
        const acct = await signer.getAddress();
        setAccount(acct);

        const o = await getOwner();
        setOwner(o);

        const r = await getRole(acct);
        setRole(Number(r));
      } catch (err) {
        console.error(err);
        setStatus("⚠️ Error connecting to MetaMask or contract");
      }
    })();
  }, []);

  // --- Actions ---
  const handleAddPatient = async () => {
    try {
      setStatus("⏳ Adding patient...");
      await addPatient(patientName, patientMeta);
      setStatus("✅ Patient added!");
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to add patient");
    }
  };

  const handleAddBill = async () => {
    try {
      setStatus("⏳ Adding bill...");
      await addBill(patientId, billCID);
      setStatus("✅ Bill added!");
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to add bill");
    }
  };

  const handleAddReport = async () => {
    try {
      setStatus("⏳ Adding report...");
      await addReport(patientId, reportType, reportCID);
      setStatus("✅ Report added!");
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to add report");
    }
  };

  // --- UI ---
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>🩺 MedReport DApp</h1>
      <p>
        Connected Account: <b>{account || "Not connected"}</b>
      </p>
      <p>Contract Owner: {owner || "Loading..."}</p>
      <p>Your Role: {role === 1 ? "Doctor" : role === 2 ? "Nurse" : "Unknown"}</p>

      <hr />

      {role === 1 && (
        <div>
          <h2>➕ Add Patient</h2>
          <input
            type="text"
            placeholder="Patient Name"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Patient Metadata (e.g., IPFS CID)"
            value={patientMeta}
            onChange={(e) => setPatientMeta(e.target.value)}
          />
          <button onClick={handleAddPatient}>Add Patient</button>
        </div>
      )}

      <div>
        <h2>➕ Add Bill</h2>
        <input
          type="number"
          placeholder="Patient ID"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
        />
        <input
          type="text"
          placeholder="Bill CID (IPFS)"
          value={billCID}
          onChange={(e) => setBillCID(e.target.value)}
        />
        <button onClick={handleAddBill}>Add Bill</button>
      </div>

      <div>
        <h2>🧾 Add Report</h2>
        <input
          type="number"
          placeholder="Patient ID"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
        />
        <input
          type="text"
          placeholder="Report Type"
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
        />
        <input
          type="text"
          placeholder="Report CID (IPFS)"
          value={reportCID}
          onChange={(e) => setReportCID(e.target.value)}
        />
        <button onClick={handleAddReport}>Add Report</button>
      </div>

      <p style={{ marginTop: "20px", color: "blue" }}>{status}</p>
    </div>
  );
}
