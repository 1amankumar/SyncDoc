import {
    useEffect,
    useState
} from "react";

import type { Block } from "../types/document";

import {
    blocks,
    blockLocks,
    userId
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

    const [isLocked, setIsLocked] =
        useState(false);

    // --------------------------------
    // Y.Text synchronization
    // --------------------------------
    useEffect(() => {

        const sharedText =
            blocks.get(block._id);

        if (!sharedText) {
            return;
        }

        const updateContent = () => {
            setContent(
                sharedText.toString()
            );
        };

        // Get current Y.Text content
        updateContent();

        // Listen for remote/local changes
        const observer = () => {
            updateContent();
        };

        sharedText.observe(observer);

        // Cleanup observer
        return () => {
            sharedText.unobserve(observer);
        };

    }, [block._id]);


    // --------------------------------
    // Block lock synchronization
    // --------------------------------
    useEffect(() => {

        const updateLockState = () => {

            const lockedBy =
                blockLocks.get(block._id);

            const locked =
                lockedBy !== undefined &&
                lockedBy !== userId;

            console.log(
                "LOCK CHECK:",
                "lockedBy:",
                lockedBy,
                "my userId:",
                userId,
                "isLocked:",
                locked
            );

            setIsLocked(locked);
        };

        // Check initial lock state
        updateLockState();

        // Listen for lock changes
        blockLocks.observe(updateLockState);

        // Cleanup observer
        return () => {
            blockLocks.unobserve(
                updateLockState
            );
        };

    }, [block._id]);


    // --------------------------------
    // Handle text changes
    // --------------------------------
    const handleChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
) => {
    const newContent =
        event.target.value;

    const sharedText =
        blocks.get(block._id);

    if (!sharedText) {
        return;
    }

    const oldContent =
        sharedText.toString();

    let start = 0;

    while (
        start < oldContent.length &&
        start < newContent.length &&
        oldContent[start] === newContent[start]
    ) {
        start++;
    }

    let oldEnd = oldContent.length;
    let newEnd = newContent.length;

    while (
        oldEnd > start &&
        newEnd > start &&
        oldContent[oldEnd - 1] ===
            newContent[newEnd - 1]
    ) {
        oldEnd--;
        newEnd--;
    }

    const deleteLength =
        oldEnd - start;

    const insertedText =
        newContent.slice(
            start,
            newEnd
        );

    if (deleteLength > 0) {
        sharedText.delete(
            start,
            deleteLength
        );
    }

    if (insertedText.length > 0) {
        sharedText.insert(
            start,
            insertedText
        );
    }
};


    // --------------------------------
    // When user enters a block
    // --------------------------------
    const handleFocus = () => {

        console.log(
            "TEXTAREA FOCUS:",
            block._id,
            "isLocked:",
            isLocked
        );

        const lockedBy =
            blockLocks.get(block._id);

        // Lock only if:
        // 1. Nobody owns the lock
        // 2. Current user already owns it
        if (
            !lockedBy ||
            lockedBy === userId
        ) {
            blockLocks.set(
                block._id,
                userId
            );
        }
    };


    // --------------------------------
    // When user leaves a block
    // --------------------------------
    const handleBlur = () => {

        const lockedBy =
            blockLocks.get(block._id);

        // Only remove our own lock
        if (lockedBy === userId) {

            blockLocks.delete(
                block._id
            );
        }
    };


    // --------------------------------
    // Common textarea
    // --------------------------------
    const renderTextarea = () => {
        return (
            <textarea
                value={content}
                onChange={handleChange}
                readOnly={false}
                onFocus={handleFocus}
                onBlur={handleBlur}
            />
        );
    };


    // --------------------------------
    // Heading block
    // --------------------------------
    if (block.type === "heading") {

        return (
            <div>

                {renderTextarea()}

                {block.children.map(
                    (child) => (
                        <BlockRenderer
                            key={child._id}
                            block={child}
                        />
                    )
                )}

            </div>
        );
    }


    // --------------------------------
    // Code block
    // --------------------------------
    if (block.type === "code") {

        return (
            <div>

                {renderTextarea()}

                {block.children.map(
                    (child) => (
                        <BlockRenderer
                            key={child._id}
                            block={child}
                        />
                    )
                )}

            </div>
        );
    }


    // --------------------------------
    // Paragraph block
    // --------------------------------
    return (
        <div>

            {renderTextarea()}

            {block.children.map(
                (child) => (
                    <BlockRenderer
                        key={child._id}
                        block={child}
                    />
                )
            )}

        </div>
    );
}

export default BlockRenderer;