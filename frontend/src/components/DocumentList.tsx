import { useEffect, useState } from "react";
import type { Document } from "../types/document";
import { getDocuments } from "../services/documentService";
import DocumentPage from "../pages/DocumentPage";
import { connectToDocument,setUserId } from "../services/websocketService";
import LogoutButton from "../pages/Logout";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService";

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

    const navigate = useNavigate();

    useEffect(() => {
    const loadDocuments = async () => {
        try {
            const user = await getCurrentUser();

            setUserId(user._id);

            const documents = await getDocuments();

            setDocuments(documents);
        } catch (error) {
            console.error(
                "Failed to load documents:",
                error
            );

            if (
                error instanceof Error &&
                error.message === "UNAUTHORIZED"
            ) {
                navigate("/login", {
                    replace: true
                });

                return;
            }

            setError(
                "Failed to load documents."
            );
        } finally {
            setLoading(false);
        }
    };

    loadDocuments();
}, [navigate]);

    return (
        <div>
            <h2>Documents</h2>

            <div>

                <LogoutButton />

                <h2>Documents</h2>

                {/* existing code */}

            </div>

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
                            onClick={() => {
                                setSelectedDocument(document);
                                connectToDocument(
                                    document._id,
                                    document.blocks
                                );
                            }}
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
