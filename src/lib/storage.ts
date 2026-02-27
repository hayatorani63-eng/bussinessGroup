"use client";

import { db } from "./firebase";
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    onSnapshot,
    setDoc,
    writeBatch
} from "firebase/firestore";
import { Business, Scenario, Comment } from "@/types";

// Migration Helper: Move data from localStorage to Firestore if it exists
export const migrateLocalStorageToFirestore = async () => {
    if (typeof window === "undefined") return;

    const STORAGE_KEYS = {
        BUSINESSES: "cosmic_businesses",
        SCENARIOS: "cosmic_scenarios",
        COMMENTS: "cosmic_comments",
    };

    try {
        const localBiz = localStorage.getItem(STORAGE_KEYS.BUSINESSES);
        const localScenarios = localStorage.getItem(STORAGE_KEYS.SCENARIOS);
        const localComments = localStorage.getItem(STORAGE_KEYS.COMMENTS);

        if (!localBiz && !localScenarios && !localComments) return;

        console.log("Starting migration from localStorage to Firestore...");
        const batch = writeBatch(db);

        if (localBiz) {
            const items: Business[] = JSON.parse(localBiz);
            items.forEach(item => {
                const ref = doc(db, "businesses", item.id);
                batch.set(ref, { name: item.name });
            });
        }

        if (localScenarios) {
            const items: Scenario[] = JSON.parse(localScenarios);
            items.forEach(item => {
                const ref = doc(db, "scenarios", item.id);
                batch.set(ref, {
                    title: item.title,
                    content: item.content,
                    businessId: item.businessId,
                    createdAt: item.createdAt,
                    confirmed: item.confirmed,
                    url: item.url || "",
                    status: item.status || 'writing'
                });
            });
        }

        if (localComments) {
            const items: Comment[] = JSON.parse(localComments);
            items.forEach(item => {
                const ref = doc(db, "comments", item.id);
                batch.set(ref, {
                    scenarioId: item.scenarioId,
                    author: item.author,
                    text: item.text,
                    createdAt: item.createdAt
                });
            });
        }

        await batch.commit();
        console.log("Migration successful. Clearing local storage.");
        localStorage.removeItem(STORAGE_KEYS.BUSINESSES);
        localStorage.removeItem(STORAGE_KEYS.SCENARIOS);
        localStorage.removeItem(STORAGE_KEYS.COMMENTS);
    } catch (e) {
        console.error("Migration failed:", e);
    }
};

export const getBusinesses = async (): Promise<Business[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, "businesses"));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business));
    } catch (e) {
        console.error("Error getting businesses:", e);
        return [];
    }
};

export const addBusiness = async (name: string): Promise<Business> => {
    const docRef = await addDoc(collection(db, "businesses"), { name });
    return { id: docRef.id, name };
};

export const updateBusiness = async (id: string, name: string): Promise<Business | null> => {
    const docRef = doc(db, "businesses", id);
    await updateDoc(docRef, { name });
    return { id, name };
};

export const deleteBusiness = async (id: string): Promise<boolean> => {
    try {
        await deleteDoc(doc(db, "businesses", id));
        return true;
    } catch (e) {
        console.error("Error deleting business:", e);
        return false;
    }
};

export const getScenarios = async (businessId?: string): Promise<Scenario[]> => {
    try {
        const scenariosRef = collection(db, "scenarios");
        // NOTE: If this fails with an index error, check the console for the Firebase URL to create an index.
        const q = businessId
            ? query(scenariosRef, where("businessId", "==", businessId), orderBy("createdAt", "desc"))
            : query(scenariosRef, orderBy("createdAt", "desc"));

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scenario));
    } catch (e) {
        console.error("Error getting scenarios. If this is an index error, please check the browser console for the link to create a Firestore Index.", e);
        // Fallback for missing index: Fetch all and filter client-side to prevent "disappearing" UI
        try {
            const querySnapshot = await getDocs(collection(db, "scenarios"));
            const all = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scenario));
            if (businessId) {
                return all.filter(s => s.businessId === businessId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            }
            return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        } catch (innerError) {
            console.error("Final fallback failed:", innerError);
            return [];
        }
    }
};

// Real-time scenarios listener
export const subscribeToScenarios = (businessId: string | null, callback: (scenarios: Scenario[]) => void) => {
    const scenariosRef = collection(db, "scenarios");
    const q = businessId
        ? query(scenariosRef, where("businessId", "==", businessId), orderBy("createdAt", "desc"))
        : query(scenariosRef, orderBy("createdAt", "desc"));

    return onSnapshot(q, (snapshot) => {
        const scenarios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scenario));
        callback(scenarios);
    }, (error) => {
        console.error("onSnapshot error:", error);
        // Fallback: simplified subscription without ordering if index is missing
        if (error.code === 'failed-precondition') {
            onSnapshot(collection(db, "scenarios"), (snapshot) => {
                let all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scenario));
                if (businessId) {
                    all = all.filter(s => s.businessId === businessId);
                }
                callback(all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
            });
        }
    });
};

// Real-time single scenario listener
export const subscribeToSingleScenario = (scenarioId: string, callback: (scenario: Scenario | null) => void) => {
    const docRef = doc(db, "scenarios", scenarioId);
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() } as Scenario);
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("subscribeToSingleScenario error:", error);
    });
};

export const addScenario = async (businessId: string, title: string, content: string, url?: string): Promise<Scenario> => {
    const newScenario = {
        title,
        content,
        businessId,
        createdAt: new Date().toISOString(),
        confirmed: false,
        url: url || "",
        status: 'writing' as const,
    };
    const docRef = await addDoc(collection(db, "scenarios"), newScenario);
    return { id: docRef.id, ...newScenario };
};

export const toggleScenarioConfirmation = async (id: string, currentStatus: boolean): Promise<boolean> => {
    const docRef = doc(db, "scenarios", id);
    await updateDoc(docRef, { confirmed: !currentStatus });
    return !currentStatus;
};

export const updateScenario = async (id: string, updates: Partial<Scenario>): Promise<Scenario | null> => {
    const docRef = doc(db, "scenarios", id);
    await updateDoc(docRef, updates);
    return { id, ...updates } as Scenario;
};

// Real-time comments listener
export const subscribeToComments = (scenarioId: string | null, callback: (comments: Comment[]) => void) => {
    const commentsRef = collection(db, "comments");
    const q = scenarioId
        ? query(commentsRef, where("scenarioId", "==", scenarioId), orderBy("createdAt", "asc"))
        : query(commentsRef, orderBy("createdAt", "asc"));

    return onSnapshot(q, (snapshot) => {
        const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
        callback(comments);
    }, (error) => {
        console.error("subscribeToComments error:", error);
        // Fallback for missing index
        if (error.code === 'failed-precondition') {
            onSnapshot(collection(db, "comments"), (snapshot) => {
                let all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
                if (scenarioId) {
                    all = all.filter(c => c.scenarioId === scenarioId);
                }
                callback(all.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
            });
        }
    });
};

export const getComments = async (scenarioId?: string): Promise<Comment[]> => {
    try {
        const commentsRef = collection(db, "comments");
        const q = scenarioId
            ? query(commentsRef, where("scenarioId", "==", scenarioId), orderBy("createdAt", "asc"))
            : query(commentsRef, orderBy("createdAt", "asc"));

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
    } catch (e) {
        console.error("Error getting comments:", e);
        return [];
    }
};

export const addComment = async (scenarioId: string, author: string, text: string): Promise<Comment> => {
    const newComment = {
        scenarioId,
        author,
        text,
        createdAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, "comments"), newComment);
    return { id: docRef.id, ...newComment };
};

export const updateComment = async (id: string, text: string): Promise<Comment | null> => {
    const docRef = doc(db, "comments", id);
    await updateDoc(docRef, { text });
    return { id, text } as Comment;
};

export const deleteComment = async (id: string): Promise<boolean> => {
    try {
        await deleteDoc(doc(db, "comments", id));
        return true;
    } catch (e) {
        console.error("Error deleting comment:", e);
        return false;
    }
};
