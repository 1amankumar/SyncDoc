import type { Document } from "../types/document";

const API_URL = "http://localhost:5000/api/documents";

// ========================================
// Get Documents
// ========================================

export const getDocuments = async (): Promise<Document[]> => {
    const response = await fetch(API_URL, {
        credentials: "include",
        cache: "no-store"
    });

    if (response.status === 401) {
        throw new Error("UNAUTHORIZED");
    }

    if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.status}`);
    }

    return response.json();
};

// ========================================
// Create Document
// ========================================

export const createDocument = async (
    title: string,
    blocks: Document["blocks"] = []
): Promise<Document> => {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            title,
            blocks
        })
    });

    if (response.status === 401) {
        throw new Error("UNAUTHORIZED");
    }

    if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
            data?.message || `Failed to create document: ${response.status}`
        );
    }

    return response.json();
};

// ========================================
// Update Document Title
// ========================================

export const updateDocumentTitle = async (
    documentId: string,
    title: string
): Promise<Document> => {
    const response = await fetch(`${API_URL}/${documentId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            title
        })
    });

    if (response.status === 401) {
        throw new Error("UNAUTHORIZED");
    }

    if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
            data?.message || `Failed to update document: ${response.status}`
        );
    }

    return response.json();
};

// ========================================
// Delete Document
// ========================================

export const deleteDocument = async (
    documentId: string
): Promise<{ message: string; documentId: string }> => {
    const response = await fetch(`${API_URL}/${documentId}`, {
        method: "DELETE",
        credentials: "include"
    });

    if (response.status === 401) {
        throw new Error("UNAUTHORIZED");
    }

    if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
            data?.message || `Failed to delete document: ${response.status}`
        );
    }

    return response.json();
};

// ========================================
// Export Document as PDF
// ========================================

export const exportDocument = async (
    documentId: string
): Promise<Blob> => {
    const response = await fetch(`${API_URL}/${documentId}/export`, {
        credentials: "include"
    });

    if (response.status === 401) {
        throw new Error("UNAUTHORIZED");
    }

    if (!response.ok) {
        throw new Error(`Failed to export document: ${response.status}`);
    }

    return response.blob();
};