import { useEffect, useState } from "react";
import type { Document } from "../types/document";
import { getDocuments } from "../services/documentService";
import DocumentPage from "../pages/DocumentPage";

function DocumentList() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [selectedDocument, setSelectedDocument] =
        useState<Document | null>(null);

    useEffect(() => {
        const loadDocuments = async () => {
            try {
                const data = await getDocuments();

                setDocuments(data);
            } catch (error) {
                console.error("Failed to load documents:", error);
            }
        };

        loadDocuments();
    }, []);

    return (
        <div>
            <h2>Documents</h2>

            {documents.map((document) => (
                <div key={document._id}>
                    <button
                        onClick={() => setSelectedDocument(document)}
                    >
                        {document.title}
                    </button>
                </div>
            ))}

            {selectedDocument && (
                <DocumentPage document={selectedDocument} />
            )}
        </div>
    );
}

export default DocumentList;