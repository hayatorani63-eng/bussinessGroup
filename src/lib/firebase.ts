import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with real config from user
const firebaseConfig = {
    apiKey: "PLACEHOLDER",
    authDomain: "fmmk-bussinessgoal.firebaseapp.com",
    projectId: "fmmk-bussinessgoal",
    storageBucket: "fmmk-bussinessgoal.firebasestorage.app",
    messagingSenderId: "PLACEHOLDER",
    appId: "PLACEHOLDER"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export { db };
