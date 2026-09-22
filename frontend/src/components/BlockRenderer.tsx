import {
    useEffect,
    useRef,
    useState
} from "react";

import type { Block } from "../types/document";

import {
    blocks,
    blockLocks,
    getUserId
} from "../services/websocketService";

interface BlockRendererProps {
    block: Block;
}

function BlockRenderer({
    block
}: BlockRendererProps) {

    const userId = getUserId();

    const [content, setContent] = useState(
        block.content
    );

    const [isLocked, setIsLocked] =
        useState(false);

    // Stores the current cursor/selection range for this block.
    // These values will later be used for collaborative cursor tracking.
    const [selection, setSelection] = useState({
        start: 0,
        end: 0
    });

    // Keeps a reference to the textarea so we can control its cursor position.
    const textareaRef =
        useRef<HTMLTextAreaElement | null>(null);

    // Restore the user's cursor/selection after the textarea value changes.
    useEffect(() => {

        if (!textareaRef.current) {
            return;
        }

        textareaRef.current.setSelectionRange(
            selection.start,
            selection.end
        );

    }, [
        content,
        selection.start,
        selection.end
    ]);


    // --------------------------------
    // Y.Text synchronization
    // --------------------------------
    useEffect(() => {

        let sharedText =
            blocks.get(block._id);

        let textObserver:
            (() => void) | null = null;

        const attachToBlock = () => {

            const text =
                blocks.get(block._id);

            if (!text) {
                return;
            }

            // Prevent attaching again to the same Y.Text
            if (sharedText === text) {
                return;
            }

            sharedText = text;

            const updateContent = () => {
                setContent(text.toString());
            };

            // Get current Y.Text content
            updateContent();

            // Listen for Y.Text changes
            text.observe(updateContent);

            textObserver = updateContent;
        };

        // Try immediately
        attachToBlock();

        // Watch the blocks map.
        // This catches blocks.set(blockId, Y.Text)
        blocks.observe(attachToBlock);

        return () => {

            blocks.unobserve(
                attachToBlock
            );

            if (
                sharedText &&
                textObserver
            ) {
                sharedText.unobserve(
                    textObserver
                );
            }
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
        blockLocks.observe(
            updateLockState
        );

        // Cleanup observer
        return () => {

            blockLocks.unobserve(
                updateLockState
            );
        };

    }, [block._id, userId]);


    // --------------------------------
    // Handle text changes
    // --------------------------------
    const handleChange = (
        event: React.ChangeEvent<HTMLTextAreaElement>
    ) => {

        const newContent =
            event.target.value;

        // Save the cursor/selection position
        // after the user edits the block.
        setSelection({
            start: event.target.selectionStart,
            end: event.target.selectionEnd
        });

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
            oldContent[start] ===
            newContent[start]
        ) {
            start++;
        }

        let oldEnd =
            oldContent.length;

        let newEnd =
            newContent.length;

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

        const lockedBy =
            blockLocks.get(block._id);

        console.log(
            "TEXTAREA FOCUS:",
            block._id,
            "lockedBy:",
            lockedBy,
            "myUserId:",
            userId
        );

        // User ID is not available
        if (!userId) {

            console.error(
                "USER ID NOT AVAILABLE"
            );

            return;
        }

        // Nobody owns the block
        if (!lockedBy) {

            blockLocks.set(
                block._id,
                userId
            );

            console.log(
                "LOCK ACQUIRED:",
                block._id
            );

            return;
        }

        // I already own the block
        if (lockedBy === userId) {

            console.log(
                "LOCK ALREADY OWNED:",
                block._id
            );

            return;
        }

        // Another user owns the block
        console.log(
            "BLOCK LOCKED BY ANOTHER USER:",
            lockedBy
        );
    };


    // --------------------------------
    // When user leaves a block
    // --------------------------------
    const handleBlur = () => {

        if (!userId) {
            return;
        }

        const lockedBy =
            blockLocks.get(block._id);

        console.log(
            "TEXTAREA BLUR:",
            block._id,
            "lockedBy:",
            lockedBy,
            "myUserId:",
            userId
        );

        // Only remove the lock if I own it
        if (lockedBy === userId) {

            blockLocks.delete(
                block._id
            );

            console.log(
                "LOCK RELEASED:",
                block._id
            );
        }
    };


    // --------------------------------
    // Common textarea
    // --------------------------------
    const renderTextarea = () => {

        return (
            <div>

                {isLocked && (
                    <p>
                        🔒 This block is being edited by another user
                    </p>
                )}

                {!isLocked &&
                    userId &&
                    blockLocks.get(block._id) === userId && (
                        <p>
                            ✏️ You are editing this block
                        </p>
                    )}

                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleChange}
                    readOnly={isLocked}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onSelect={(event) => {

                        // Track the current cursor/selection positions.
                        setSelection({
                            start:
                                event.currentTarget.selectionStart,
                            end:
                                event.currentTarget.selectionEnd
                        });
                    }}
                />

            </div>
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