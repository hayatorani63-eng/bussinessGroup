import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with real config from user
const firebaseConfig = {
    apiKey: "AIzaSyAveOH8wL6BcNkredO35-scOP270MLEYMs",
    authDomain: "sucess-59ee9.firebaseapp.com",
    projectId: "sucess-59ee9",
    storageBucket: "sucess-59ee9.firebasestorage.app",
    messagingSenderId: "661662291977",
    appId: "1:661662291977:web:8ba19cfb5f6fc4643d80d8",
    measurementId: "G-043TKVEPPB"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export { db };
