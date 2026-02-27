"use client";

import { Business, Scenario, Comment } from "@/types";

const STORAGE_KEYS = {
    BUSINESSES: "cosmic_businesses",
    SCENARIOS: "cosmic_scenarios",
    COMMENTS: "cosmic_comments",
};

export const getBusinesses = (): Business[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEYS.BUSINESSES);
    return data ? JSON.parse(data) : [];
};

export const saveBusinesses = (businesses: Business[]) => {
    localStorage.setItem(STORAGE_KEYS.BUSINESSES, JSON.stringify(businesses));
};

export const getScenarios = (): Scenario[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEYS.SCENARIOS);
    return data ? JSON.parse(data) : [];
};

export const saveScenarios = (scenarios: Scenario[]) => {
    localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(scenarios));
};

export const addBusiness = (name: string): Business => {
    const businesses = getBusinesses();
    const newBusiness: Business = {
        id: crypto.randomUUID(),
        name,
    };
    saveBusinesses([...businesses, newBusiness]);
    return newBusiness;
};

export const addScenario = (businessId: string, title: string, content: string, url?: string): Scenario => {
    const scenarios = getScenarios();
    const newScenario: Scenario = {
        id: crypto.randomUUID(),
        title,
        content,
        businessId,
        createdAt: new Date().toISOString(),
        confirmed: false,
        url,
        status: 'writing',
    };
    saveScenarios([newScenario, ...scenarios]);
    return newScenario;
};

export const toggleScenarioConfirmation = (id: string): Scenario | null => {
    const scenarios = getScenarios();
    let updatedScenario: Scenario | null = null;
    const updatedScenarios = scenarios.map((s) => {
        if (s.id === id) {
            updatedScenario = { ...s, confirmed: !s.confirmed };
            return updatedScenario;
        }
        return s;
    });
    saveScenarios(updatedScenarios);
    return updatedScenario;
};

export const updateScenario = (id: string, updates: Partial<Scenario>): Scenario | null => {
    const scenarios = getScenarios();
    let updatedScenario: Scenario | null = null;
    const updatedScenarios = scenarios.map((s) => {
        if (s.id === id) {
            updatedScenario = { ...s, ...updates };
            return updatedScenario;
        }
        return s;
    });
    saveScenarios(updatedScenarios);
    return updatedScenario;
};

export const getComments = (): Comment[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEYS.COMMENTS);
    return data ? JSON.parse(data) : [];
};

export const saveComments = (comments: Comment[]) => {
    localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(comments));
};

export const addComment = (scenarioId: string, author: string, text: string): Comment => {
    const comments = getComments();
    const newComment: Comment = {
        id: crypto.randomUUID(),
        scenarioId,
        author,
        text,
        createdAt: new Date().toISOString(),
    };
    saveComments([...comments, newComment]);
    return newComment;
};

export const updateComment = (id: string, text: string): Comment | null => {
    const comments = getComments();
    let updatedComment: Comment | null = null;
    const updatedComments = comments.map((c) => {
        if (c.id === id) {
            updatedComment = { ...c, text };
            return updatedComment;
        }
        return c;
    });
    saveComments(updatedComments);
    return updatedComment;
};

export const deleteComment = (id: string): boolean => {
    const comments = getComments();
    const initialLength = comments.length;
    const filtered = comments.filter((c) => c.id !== id);
    saveComments(filtered);
    return filtered.length < initialLength;
};
