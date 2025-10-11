import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseClient";
import axios from "axios";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("patient");

  async function handleSignUp() {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      await axios.post(
        "/register-role",
        { role },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Signup successful! You can now log in.");
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Sign Up</h2>
      <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} /><br/>
      <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} /><br/>
      <select onChange={(e) => setRole(e.target.value)}>
        <option value="hospital">Hospital</option>
        <option value="pharmacy">Pharmacy</option>
        <option value="patient">Patient</option>
      </select><br/>
      <button onClick={handleSignUp}>Sign Up</button>
    </div>
  );
}
