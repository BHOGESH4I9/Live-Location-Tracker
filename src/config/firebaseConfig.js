// src/firebase/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; 

const firebaseConfig = {
  apiKey: "AIzaSyCrSsLDrgPljlypyva2Vpbgej52xYz67uE",
  authDomain: "live-location-tracker-cdb98.firebaseapp.com",
  projectId: "live-location-tracker-cdb98",
  storageBucket: "live-location-tracker-cdb98.appspot.com", 
  messagingSenderId: "866669048420",
  appId: "1:866669048420:web:351071b6eb88369977e571",
  measurementId: "G-QTYCQSMDKQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Analytics
const analytics = getAnalytics(app);

// Auth and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app); 

export { app, analytics };
