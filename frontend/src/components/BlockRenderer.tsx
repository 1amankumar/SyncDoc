import { useState } from "react";
import type { Block } from "../types/document";

interface BlockRendererProps {
    block: Block;
}

function BlockRenderer({ block }: BlockRendererProps) {
    const [content, setContent] = useState(block.content);

    return (
        <div>
            <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
            />

            {block.children.map((child) => (
                <BlockRenderer
                    key={child._id}
                    block={child}
                />
            ))}
        </div>
    );
}

export default BlockRenderer;