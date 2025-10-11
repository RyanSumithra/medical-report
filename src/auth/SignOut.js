
import { signOut } from "firebase/auth";
import { auth } from "../firebaseClient";

export async function handleLogout() {
  try {
    await signOut(auth);
    // Optional: Redirect to login page or clear any additional state
    window.location.href = "/"; // Redirect to home/login page
  } catch (error) {
    console.error("Error signing out:", error);
    alert("Error signing out: " + error.message);
  }
}