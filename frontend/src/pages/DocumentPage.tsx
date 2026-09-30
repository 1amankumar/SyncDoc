import {
    useState
} from "react";

import type {
    Document,
    Block
} from "../types/document";

import BlockRenderer from "../components/BlockRenderer";

import {
    useBlockContext
} from "../context/BlockContext";

// ========================================
// Props
// ========================================

interface DocumentPageProps {
    document: Document;
}

// ========================================
// Component
// ========================================

function DocumentPage({
    document
}: DocumentPageProps) {

    // ========================================
    // Block Context
    // ========================================

    const {
        updateBlockContent
    } = useBlockContext();

    // ========================================
    // Document AST State
    // ========================================

    const [
        documentBlocks,
        setDocumentBlocks
    ] = useState<Block[]>(
        document.blocks
    );

    // ========================================
    // Update Specific AST Block
    // ========================================

    const handleBlockContentChange = (
        blockId: string,
        content: string
    ) => {

        setDocumentBlocks(
            (currentBlocks) =>
                updateBlockContent(
                    currentBlocks,
                    blockId,
                    content
                )
        );
    };

    // ========================================
    // Render
    // ========================================

    return (
        <div>
            <h2>
                {document.title}
            </h2>

            {documentBlocks.map(
                (block) => (
                    <BlockRenderer
                        key={block._id}
                        block={block}
                        onBlockContentChange={
                            handleBlockContentChange
                        }
                    />
                )
            )}
        </div>
    );
}

export default DocumentPage;