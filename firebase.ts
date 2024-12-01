import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyACr04Jr4Beahk5NKE5VU5gP8Na6KGGYi0",
    authDomain: "chat-with-pdf-challenge-6c29a.firebaseapp.com",
    projectId: "chat-with-pdf-challenge-6c29a",
    storageBucket: "chat-with-pdf-challenge-6c29a.firebasestorage.app",
    messagingSenderId: "307676659329",
    appId: "1:307676659329:web:6d65f49267e9cd2d231780"
  };

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

  const db = getFirestore(app);
  const storage = getStorage(app);

  export { db, storage };