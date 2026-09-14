import type { Block } from "../types/document";

interface BlockRendererProps {
    block: Block;
}

function BlockRenderer({ block }: BlockRendererProps) {
    return (
        <div>
            <p>{block.content}</p>

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