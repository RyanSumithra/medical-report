import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SignUp from "./auth/SignUp";
import SignIn from "./auth/SignIn";
import HospitalDashboard from "./dashboards/HospitalDashboard";
import PharmacyDashboard from "./dashboards/PharmacyDashboard";
import PatientDashboard from "./dashboards/PatientDashboard";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebaseClient";
import axios from "axios";

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setRole(null);
        return;
      }
      setUser(currentUser);
      const token = await currentUser.getIdToken();
      const res = await axios.get("/profile", {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      if (res?.data?.role) setRole(res.data.role);
    });
    return unsub;
  }, []);

  if (!user) return <SignIn />;

  if (!role) return <div>Loading your dashboard...</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            role === "hospital" ? (
              <HospitalDashboard />
            ) : role === "pharmacy" ? (
              <PharmacyDashboard />
            ) : (
              <PatientDashboard />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

