import React, { useState, useEffect } from "react";
import { BrowserProvider, Contract } from "ethers";
import axios from "axios";
import MedicalABI from "../MedicalReportManagerABI.json"; // Adjust path if needed
import { auth } from "../firebaseClient"; // For Firebase user data if needed
import { handleLogout } from "../auth/SignOut";

const CONTRACT_ADDRESS = "0xD6A0BfdCf65Da491F2ee1A8E62F304C78f89650d";

export default function PatientDashboard() {
  const [file, setFile] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [recipientsText, setRecipientsText] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [reports, setReports] = useState([]);

  // 🔹 Load patient's reports from backend (Firebase/Firestore)
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

  // 🔹 Connect MetaMask Wallet
  async function connectWallet() {
    if (!window.ethereum) return alert("Install MetaMask first");
    const p = new BrowserProvider(window.ethereum);
    await p.send("eth_requestAccounts", []);
    const s = await p.getSigner();
    const address = await s.getAddress();
    setProvider(p);
    setSigner(s);
    setWalletAddress(address);
    const c = new Contract(CONTRACT_ADDRESS, MedicalABI, s);
    setContract(c);
  }

  // 🔹 Upload report to IPFS (via backend) and record on blockchain
  async function onUploadAndRecord() {
    if (!file) return alert("Choose a file");
    if (!signer) return alert("Connect your wallet first");

    const owner = await signer.getAddress();
    const recipients = recipientsText
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    if (!recipients.includes(owner))
      return alert("Include your own address in recipients");

    const form = new FormData();
    form.append("file", file);
    form.append("ownerAddress", owner);
    form.append("recipients", JSON.stringify(recipients));

    try {
      // Send to backend → uploads to Pinata/IPFS → returns CID + encrypted keys
      const resp = await axios.post("http://localhost:4000/upload-report", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { cid, encryptedKeys } = resp.data;
      const encArray = recipients.map((a) => encryptedKeys[a] || "");

      const description = "Medical report (encrypted)";
      const tx = await contract.createReport(cid, description, recipients, encArray);
      await tx.wait();

      alert("✅ Report uploaded and recorded on blockchain!");
    } catch (err) {
      console.error(err);
      alert("❌ Upload or blockchain transaction failed.");
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>👤 Patient Dashboard</h2>
      <p>You can upload encrypted reports to IPFS and record them on-chain.</p>

      <button onClick={connectWallet}>🔗 Connect Wallet</button>

      {walletAddress && (
        <p style={{ marginTop: 10 }}>
          ✅ Connected wallet: <b>{walletAddress}</b>
        </p>
      )}

      <div style={{ marginTop: 10 }}>
        <label>Recipients (comma-separated Ethereum addresses; include yourself):</label>
        <br />
        <input
          value={recipientsText}
          onChange={(e) => setRecipientsText(e.target.value)}
          style={{ width: 600 }}
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      </div>

      <div style={{ marginTop: 10 }}>
        <button onClick={onUploadAndRecord}>📤 Upload & Record</button>
      </div>

      <hr style={{ margin: "20px 0" }} />

      <h3>📑 Your Reports</h3>
      {reports.length === 0 ? (
        <p>No reports available yet.</p>
      ) : (
        <ul>
          {reports.map((r) => (
            <li key={r.id}>
              <b>{r.description || "Report"}</b> — CID:{" "}
              <a
                href={`https://gateway.pinata.cloud/ipfs/${r.cid}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {r.cid}
              </a>
            </li>
          ))}
        </ul>
      )}
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}


