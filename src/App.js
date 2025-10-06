
// frontend/src/App.js
import React, { useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import axios from "axios";
import MedicalABI from "./MedicalReportManagerABI.json"; // paste ABI here
const CONTRACT_ADDRESS = "0xD6A0BfdCf65Da491F2ee1A8E62F304C78f89650d"; // set deployed contract address

function App() {
  const [file, setFile] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [recipientsText, setRecipientsText] = useState("");

  async function connectWallet() {
    if (!window.ethereum) return alert("Install MetaMask");
    const p = new BrowserProvider(window.ethereum);
    await p.send("eth_requestAccounts", []);
    const s = await p.getSigner();
    setProvider(p);
    setSigner(s);
    const c = new Contract(CONTRACT_ADDRESS, MedicalABI, s);
    setContract(c);
  }

  const desiredChainId = "0xaa36a7"; // Hex for Sepolia (11155111)

// async function connectWallet() {
//   if (window.ethereum) {
//     const chainId = await window.ethereum.request({ method: 'eth_chainId' });
//     if (chainId !== desiredChainId) {
//       try {
//         await window.ethereum.request({
//           method: 'wallet_switchEthereumChain',
//           params: [{ chainId: desiredChainId }],
//         });
//       } catch (switchError) {
//         // If the chain isn’t added
//         if (switchError.code === 4902) {
//           await window.ethereum.request({
//             method: 'wallet_addEthereumChain',
//             params: [
//               {
//                 chainId: desiredChainId,
//                 chainName: 'Sepolia Test Network',
//                 rpcUrls: ['https://sepolia.infura.io/v3/e3ccdee85f67491a88fe2af1a019dd79'],
//                 nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
//                 blockExplorerUrls: ['https://sepolia.etherscan.io'],
//               },
//             ],
//           });
//         }
//       }
//     }

//     await window.ethereum.request({ method: 'eth_requestAccounts' });
//   } else {
//     alert('MetaMask not detected');
//   }
// }


  async function onUploadAndRecord() {
    if (!file) return alert("Choose file");
    if (!signer) return alert("Connect wallet");
    const owner = await signer.getAddress();
    // recipients: comma separated 0x... values. Owner MUST be included and owner's public key must be registered with backend
    const recipients = recipientsText.split(",").map(x => x.trim()).filter(Boolean);
    if (!recipients.includes(owner)) return alert("Include your own address in recipients");

    const form = new FormData();
    form.append("file", file);
    form.append("ownerAddress", owner);
    form.append("recipients", JSON.stringify(recipients));

    // Upload to backend (which returns CID and encrypted keys per recipient)
    const resp = await axios.post("http://localhost:4000/upload-report", form, {
      headers: { "Content-Type": "multipart/form-data" }
    });

    const { cid, encryptedKeys } = resp.data;
    // Prepare arrays aligned with recipients
    const encArray = recipients.map(a => encryptedKeys[a] || "");

    // Call contract createReport(cid, description, recipients, encryptedKeys)
    const description = "Medical report (encrypted)";
    const tx = await contract.createReport(cid, description, recipients, encArray);
    await tx.wait();
    alert("Report recorded on-chain (tx sent)");
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Medical Report Upload (Demo)</h2>
      <button onClick={connectWallet}>Connect Wallet</button>
      <div style={{ marginTop: 10 }}>
        <label>Recipients (comma-separated addresses; include yourself):</label><br/>
        <input value={recipientsText} onChange={e => setRecipientsText(e.target.value)} style={{ width: 600 }}/>
      </div>
      <div style={{ marginTop: 10 }}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])}/>
      </div>
      <div style={{ marginTop: 10 }}>
        <button onClick={onUploadAndRecord}>Upload & Record</button>
      </div>
    </div>
  );
}

export default App;

