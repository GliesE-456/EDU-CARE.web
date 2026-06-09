/**
 * EDU-CARE Firebase Configuration
 * 
 * Uses Firebase CDN (ES module imports) — no npm/bundler required.
 * This file is shared between the public website and admin dashboard.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, where, serverTimestamp, Timestamp } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';

// ⚠️ REPLACE these values with your actual Firebase project config
// Run: npx -y firebase-tools@latest apps:sdkconfig <APP_ID>
const firebaseConfig = {
  apiKey: "AIzaSyBbG1J08aAcXrSRJvsiXExTdbVmJKUqDgY",
  authDomain: "edu-care-1df66.firebaseapp.com",
  projectId: "edu-care-1df66",
  storageBucket: "edu-care-1df66.firebasestorage.app",
  messagingSenderId: "143823151740",
  appId: "1:143823151740:web:80ce553ea7ce26ea72dff9",
  measurementId: "G-BNSER6PFKQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Export everything needed by other scripts
export {
  app, db, auth,
  collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, where, serverTimestamp, Timestamp,
  signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword
};
