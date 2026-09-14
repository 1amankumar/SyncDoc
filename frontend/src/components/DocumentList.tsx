import { useState } from "react";
import type { Document } from "../types/document";
import BlockRenderer from "./BlockRenderer";

function DocumentList() {
    const [selectedDocument, setSelectedDocument] =
        useState<Document | null>(null);

    const documents: Document[] = [
        {
            _id: "1",
            title: "My First SyncDoc",
            blocks: [
                {
                    _id: "1",
                    type: "paragraph",
                    content: "Hello SyncDoc",
                    children: [
                        {
                            _id: "2",
                            type: "paragraph",
                            content: "This is a child block",
                            children: []
                        }
                    ]
                }
            ],
            createdAt: "",
            updatedAt: ""
        }
    ];

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
                <div>
                    <h2>{selectedDocument.title}</h2>

                    {selectedDocument.blocks.map((block) => (
                        <BlockRenderer
                            key={block._id}
                            block={block}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default DocumentList;