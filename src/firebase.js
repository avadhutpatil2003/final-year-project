// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBMj8TQgPjRDd1Hkn64L9PVLm0pV0YpenQ",
  authDomain: "security-app-b2e30.firebaseapp.com",
  databaseURL: "https://security-app-b2e30-default-rtdb.firebaseio.com",
  projectId: "security-app-b2e30",
  storageBucket: "security-app-b2e30.firebasestorage.app",
  messagingSenderId: "875512313335",
  appId: "1:875512313335:web:12e5e3fd692152d4d1aaf2",
  measurementId: "G-MMREGZ668W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const realtimeDb = getDatabase(app);

export { db, storage, auth, realtimeDb };