import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence, collection, addDoc, updateDoc, setDoc, deleteDoc, serverTimestamp, doc, getDoc, getDocs, query, orderBy, limit, startAfter, endBefore, limitToLast, where, Timestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut, updatePassword } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyAYD-Tfcig5lCSSMZOXeE1YA48Io6YVJrc",
  authDomain: "planes-de-ahorro-ea2d9.firebaseapp.com",
  projectId: "planes-de-ahorro-ea2d9",
  storageBucket: "planes-de-ahorro-ea2d9.firebasestorage.app",
  messagingSenderId: "40457806863",
  appId: "1:40457806863:web:7f7a861dfe7ac5c053ef7a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app); // 📈 ANALYTICS ACTIVADO!

enableIndexedDbPersistence(db).catch((err) => {
    console.warn("La persistencia offline no se pudo activar: ", err.code);
});

export { db, auth, analytics, collection, addDoc, updateDoc, setDoc, deleteDoc, serverTimestamp, doc, getDoc, getDocs, query, orderBy, limit, startAfter, endBefore, limitToLast, where, Timestamp, onSnapshot, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut, updatePassword };