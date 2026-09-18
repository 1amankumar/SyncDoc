import { useEffect, useState } from "react";
import type { Document } from "../types/document";
import { getDocuments } from "../services/documentService";
import DocumentPage from "../pages/DocumentPage";

function DocumentList() {
    // Stores all documents received from the backend.
    const [documents, setDocuments] = useState<Document[]>([]);

    // Stores the document currently selected by the user.
    const [selectedDocument, setSelectedDocument] =
        useState<Document | null>(null);

    // Keeps track of whether the document request is still running.
    // This lets us show "Loading documents..." instead of a blank screen.
    const [loading, setLoading] = useState(true);

    // Stores an error message if the API request fails.
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadDocuments = async () => {
            try {
                // Start loading before making the API request.
                setLoading(true);

                // Clear any previous error before trying again.
                setError(null);

                // Get documents from the backend API.
                const data = await getDocuments();

                // Store the received documents in React state.
                setDocuments(data);
            } catch (error) {
                console.error("Failed to load documents:", error);

                // Show a user-friendly error message in the UI.
                setError("Failed to load documents.");
            } finally {
                // Stop the loading state whether the request succeeds or fails.
                setLoading(false);
            }
        };

        loadDocuments();
    }, []);

    return (
        <div>
            <h2>Documents</h2>

            {/* Show this while documents are being fetched. */}
            {loading && <p>Loading documents...</p>}

            {/* Show this if the API request fails. */}
            {error && <p>{error}</p>}

            {/* Show this when the API succeeds but no documents exist. */}
            {!loading && !error && documents.length === 0 && (
                <p>No documents found.</p>
            )}

            {/* Display each document when documents are available. */}
            {!loading &&
                !error &&
                documents.map((document) => (
                    <div key={document._id}>
                        <button
                            onClick={() => setSelectedDocument(document)}
                        >
                            {document.title}
                        </button>
                    </div>
                ))}

            {/* Display the selected document below the document list. */}
            {selectedDocument && (
                <DocumentPage document={selectedDocument} />
            )}
        </div>
    );
}

export default DocumentList;
