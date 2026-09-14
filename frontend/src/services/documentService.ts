import type { Document } from "../types/document";

const API_URL = "http://localhost:5000/api/documents";

export const getDocuments = async (): Promise<Document[]> => {
    const response = await fetch(API_URL);

    if (!response.ok) {
        throw new Error("Failed to fetch documents");
    }

    return response.json();
};