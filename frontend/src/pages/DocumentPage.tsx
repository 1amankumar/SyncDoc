import type { Document } from "../types/document";
import BlockRenderer from "../components/BlockRenderer";

interface DocumentPageProps {
    document: Document;
}

function DocumentPage({ document }: DocumentPageProps) {
    return (
        <div>
            <h2>{document.title}</h2>

            {document.blocks.map((block) => (
                <BlockRenderer
                    key={block._id}
                    block={block}
                />
            ))}
        </div>
    );
}

export default DocumentPage;