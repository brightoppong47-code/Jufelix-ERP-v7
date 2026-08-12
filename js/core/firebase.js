/* Jufelix ERP v7.0 - Firebase production connection */
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAC3sMFu0LnchFFP1Wrqc_r_fcZWSOWt5I",
  authDomain: "jufelix-erp-v7.firebaseapp.com",
  projectId: "jufelix-erp-v7",
  storageBucket: "jufelix-erp-v7.firebasestorage.app",
  messagingSenderId: "1012255951864",
  appId: "1:1012255951864:web:539c79ddb4433f1dcb640d"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
window.JufelixFirebase = { app, db, auth };
document.dispatchEvent(new CustomEvent("jufelix:firebase-ready"));
console.log("Jufelix Firebase ready.");
