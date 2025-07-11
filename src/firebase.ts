// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBBUsgkD7CsauKFPeV9RhtDDiHbGRAkzbQ",
  authDomain: "p5n-dinosaur.firebaseapp.com",
  projectId: "p5n-dinosaur",
  storageBucket: "p5n-dinosaur.firebasestorage.app",
  messagingSenderId: "685557374469",
  appId: "1:685557374469:web:55e5ebef9afa8bddab866c",
  measurementId: "G-5XJY8H1YJV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

export const functions = getFunctions(app);

if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
