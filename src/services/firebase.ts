// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAR60ibAs8227J4hiDuHImWQwp97NGGl4E",
  authDomain: "slyntos-a6cb8.firebaseapp.com",
  projectId: "slyntos-a6cb8",
  storageBucket: "slyntos-a6cb8.firebasestorage.app",
  messagingSenderId: "195439683534",
  appId: "1:195439683534:web:d641132e7bbbd67bef2d9f",
  measurementId: "G-HYSBMWZ2GN",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { app, analytics, db };
