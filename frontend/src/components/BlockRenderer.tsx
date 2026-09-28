import { useEffect, useRef, useState } from "react";

import type { Block } from "../types/document";

import {
    blocks,
    blockLocks,
    getUserId,
    isSyncReady,
    onSyncReady,
    requestBlockLock,
    releaseBlockLock
} from "../services/websocketService";
interface BlockRendererProps {
    block: Block;
}

function BlockRenderer({
    block
}: BlockRendererProps) {

    const userId = getUserId();

    const [content, setContent] =
        useState(block.content);

    const [isLocked, setIsLocked] =
        useState(false);

    const [syncCompleted, setSyncCompleted] =
        useState(isSyncReady());

    const [selection, setSelection] = useState({
        start: 0,
        end: 0
    });

    const textareaRef =
        useRef<HTMLTextAreaElement | null>(null);

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

            if (sharedText === text) {
                return;
            }

            sharedText = text;

            const updateContent = () => {
                setContent(text.toString());
            };

            updateContent();

            text.observe(updateContent);

            textObserver = updateContent;
        };

        attachToBlock();

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

    useEffect(() => {

        if (isSyncReady()) {
            setSyncCompleted(true);
            return;
        }

        const cleanup =
            onSyncReady(() => {
                setSyncCompleted(true);
            });

        return cleanup;

    }, []);

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

    useEffect(() => {

        const updateLockState = () => {

            const lockedBy =
                blockLocks.get(
                    block._id
                );

            const locked =
                lockedBy !== undefined &&
                lockedBy !== userId;

            console.log(
                "LOCK CHECK:",
                "lockedBy:",
                lockedBy,
                "myUserId:",
                userId,
                "isLocked:",
                locked
            );

            setIsLocked(locked);
        };

        updateLockState();

        blockLocks.observe(
            updateLockState
        );

        return () => {

            blockLocks.unobserve(
                updateLockState
            );
        };

    }, [block._id, userId]);

    const handleChange = (
        event:
            React.ChangeEvent<HTMLTextAreaElement>
    ) => {
        if (!userId) {

            console.log(
                "EDIT BLOCKED: user ID unavailable"
            );

            return;
        }


        const lockedBy =
            blockLocks.get(
                block._id
            );


        if (
            lockedBy !== userId
        ) {

            console.log(
                "EDIT BLOCKED: lock not owned by current user"
            );

            return;
        }


        const newContent =
            event.target.value;

        setSelection({
            start: event.target.selectionStart,
            end: event.target.selectionEnd
        });

        const sharedText =
            blocks.get(
                block._id
            );

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

    const handleFocus = () => {

        const lockedBy =
            blockLocks.get(
                block._id
            );


        console.log(
            "TEXTAREA FOCUS:",
            block._id,
            "lockedBy:",
            lockedBy,
            "myUserId:",
            userId
        );


        if (!userId) {

            console.error(
                "USER ID NOT AVAILABLE"
            );

            return;
        }


        // --------------------------------
        // Another user owns the block
        // --------------------------------

        if (
            lockedBy &&
            lockedBy !== userId
        ) {

            console.log(
                "BLOCK LOCKED BY ANOTHER USER:",
                lockedBy
            );

            setIsLocked(true);

            return;
        }


        // --------------------------------
        // I already own the lock
        // --------------------------------

        if (
            lockedBy === userId
        ) {

            console.log(
                "LOCK ALREADY OWNED:",
                block._id
            );

            setIsLocked(false);

            return;
        }


        // --------------------------------
        // Request lock from server
        // --------------------------------

        requestBlockLock(
            block._id
        );
    };



    const renderTextarea = () => {

        return (
            <div>

                {isLocked && (
                    <p>
                        🔒 This block is being edited
                        by another user
                    </p>
                )}

                {!isLocked &&
                    blockLocks.get(
                        block._id
                    ) === userId && (
                        <div>

                            <p>
                                ✏️ You are editing
                                this block
                            </p>

                            <button
                                onClick={() => {
                                    releaseBlockLock(
                                        block._id
                                    );
                                }}
                            >
                                Unlock Block
                            </button>

                        </div>
                    )}

                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleChange}
                    readOnly={
                        !syncCompleted ||
                        isLocked
                    }
                    onFocus={handleFocus}
                    onSelect={(event) => {

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

    if (
        block.type === "heading"
    ) {

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

    if (
        block.type === "code"
    ) {

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