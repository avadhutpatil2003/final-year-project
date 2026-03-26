// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCSStJTjjOYBrDYvLvLIdc-A_iBJ7VlwAQ",
  authDomain: "securityservice-87851.firebaseapp.com",
  projectId: "securityservice-87851",
  storageBucket: "securityservice-87851.firebasestorage.app",
  messagingSenderId: "465662280789",
  appId: "1:465662280789:web:818738a100f961c326c0dc",
  measurementId: "G-8H090G72R3",
  databaseURL: "https://securityservice-87851-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase services
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const realtimeDb = getDatabase(app);

// Export Firebase services for use in other components
export { app, db, storage, auth, analytics, realtimeDb };