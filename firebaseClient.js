import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAIOYYfxx4uAlf6g8M2VbL0HaKwN3jo2XE",
  authDomain: "medical-report-5f0cf.firebaseapp.com",
  projectId: "medical-report-5f0cf",
  storageBucket: "medical-report-5f0cf.appspot.com", // Important: use .appspot.com
  messagingSenderId: "633412985575",
  appId: "1:633412985575:web:f17905bd5f3f1cde08b842",
  measurementId: "G-WFW7J05Q7J"
};

// Initialize Firebase with error handling
let app;
let auth;
let db;
let analytics;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  analytics = getAnalytics(app);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
}

export { auth, db, analytics };
