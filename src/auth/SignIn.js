import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseClient";
import SignUp from "./SignUp";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newUser, setNewUser] = useState(false);

  async function handleSignIn() {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      alert(err.message);
    }
  }

  return newUser ? (
    <SignUp />
  ) : (
    <div style={{ padding: 20 }}>
      <h2>Login</h2>
      <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} /><br/>
      <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} /><br/>
      <button onClick={handleSignIn}>Login</button>
      <p>
        Don’t have an account?{" "}
        <button onClick={() => setNewUser(true)}>Sign up</button>
      </p>
    </div>
  );
}
