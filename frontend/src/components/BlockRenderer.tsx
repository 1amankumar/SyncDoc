import type { Block } from "../types/document";

interface BlockRendererProps {
    block: Block;
}

// BlockRenderer decides which UI should be displayed
// based on the type of the AST block.
function BlockRenderer({ block }: BlockRendererProps) {

    // Render a heading block
    if (block.type === "heading") {
        return (
            <div>
                <h2>{block.content}</h2>

                {/* Render any child blocks recursively */}
                {block.children.map((child) => (
                    <BlockRenderer
                        key={child._id}
                        block={child}
                    />
                ))}
            </div>
        );
    }

    // Render a code block
    if (block.type === "code") {
        return (
            <div>
                <pre>
                    <code>{block.content}</code>
                </pre>

                {/* Render any child blocks recursively */}
                {block.children.map((child) => (
                    <BlockRenderer
                        key={child._id}
                        block={child}
                    />
                ))}
            </div>
        );
    }

    // By default, render the block as a paragraph.
    // This handles "paragraph" blocks.
    return (
        <div>
            <p>{block.content}</p>

            {/* Render any child blocks recursively */}
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