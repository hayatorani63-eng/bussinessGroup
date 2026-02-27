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
    Timestamp
} from "firebase/firestore";
import { Business, Scenario, Comment } from "@/types";

export const getBusinesses = async (): Promise<Business[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, "businesses"));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business));
    } catch (e) {
        console.error("Error getting businesses: ", e);
        return [];
    }
};

export const addBusiness = async (name: string): Promise<Business> => {
    const docRef = await addDoc(collection(db, "businesses"), { name });
    return { id: docRef.id, name };
};

export const getScenarios = async (businessId?: string): Promise<Scenario[]> => {
    try {
        const scenariosRef = collection(db, "scenarios");
        const q = businessId
            ? query(scenariosRef, where("businessId", "==", businessId), orderBy("createdAt", "desc"))
            : query(scenariosRef, orderBy("createdAt", "desc"));

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scenario));
    } catch (e) {
        console.error("Error getting scenarios: ", e);
        return [];
    }
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
    return { id, ...updates } as Scenario; // Partial return but usually used for state update
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
        console.error("Error getting comments: ", e);
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
        console.error("Error deleting comment: ", e);
        return false;
    }
};
