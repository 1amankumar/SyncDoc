import type { Document } from "../types/document";

const API_URL =
    "http://localhost:5000/api/documents";

// ========================================
// Get Documents
// ========================================

export const getDocuments =
    async (): Promise<Document[]> => {

        const response = await fetch(
            API_URL,
            {
                credentials: "include",
                cache: "no-store"
            }
        );

        if (response.status === 401) {
            throw new Error("UNAUTHORIZED");
        }

        if (!response.ok) {
            throw new Error(
                `Failed to fetch documents: ${response.status}`
            );
        }

        return response.json();
    };

// ========================================
// Create Document
// ========================================

export const createDocument =
    async (
        title: string,
        blocks: Document["blocks"] = []
    ): Promise<Document> => {

        const response = await fetch(
            API_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                credentials: "include",

                body: JSON.stringify({
                    title,
                    blocks
                })
            }
        );

        if (response.status === 401) {
            throw new Error("UNAUTHORIZED");
        }

        if (!response.ok) {

            const data =
                await response.json().catch(
                    () => null
                );

            throw new Error(
                data?.message ||
                `Failed to create document: ${response.status}`
            );
        }

        return response.json();
    };
    export const exportDocument =
    async (
        documentId: string
    ): Promise<Blob> => {

        const response = await fetch(
            `${API_URL}/${documentId}/export`,
            {
                credentials: "include"
            }
        );

        if (response.status === 401) {
            throw new Error("UNAUTHORIZED");
        }

        if (!response.ok) {
            throw new Error(
                `Failed to export document: ${response.status}`
            );
        }

        return response.blob();
    };

// ========================================
// Add Block To Document
// ========================================

export const addBlockToDocument =
    async (
        documentId: string,
        block: Document["blocks"][number]
    ): Promise<void> => {

        const response = await fetch(
            `${API_URL}/${documentId}/blocks`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                credentials: "include",

                body: JSON.stringify(block)
            }
        );

        if (response.status === 401) {

            throw new Error(
                "UNAUTHORIZED"
            );
        }

        if (!response.ok) {

            const data =
                await response
                    .json()
                    .catch(() => null);

            throw new Error(
                data?.message ||
                `Failed to save block: ${response.status}`
            );
        }
    };