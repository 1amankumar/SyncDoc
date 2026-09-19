import {
    useEffect,
    useState
} from "react";

import type { Block } from "../types/document";

import {
    blocks,
    ydoc
} from "../services/websocketService";

interface BlockRendererProps {
    block: Block;
}

function BlockRenderer({
    block
}: BlockRendererProps) {
    const [content, setContent] = useState(
        block.content
    );

    

    const handleChange = (
        event: React.ChangeEvent<HTMLTextAreaElement>
    ) => {
        const newContent =
            event.target.value;

        setContent(newContent);

        blocks.set(
            block._id,
            newContent
        );
    };

    if (block.type === "heading") {
        return (
            <div>
                <textarea
                    value={content}
                    onChange={handleChange}
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

    if (block.type === "code") {
        return (
            <div>
                <textarea
                    value={content}
                    onChange={handleChange}
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

    return (
        <div>
            <textarea
                value={content}
                onChange={handleChange}
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