import {
    useEffect,
    useState
} from "react";

import type {
    Block
} from "../types/document";

import {
    blocks,
    blockLocks,
    getUserId,
    isSyncReady,
    onSyncReady,
    requestBlockLock,
    releaseBlockLock
} from "../services/websocketService";

import {
    useBlockContext
} from "../context/BlockContext";

import * as Y from "yjs";

// ========================================
// Props
// ========================================

interface BlockRendererProps {
    block: Block;
}

// ========================================
// Component
// ========================================

const BlockRenderer = ({
    block
}: BlockRendererProps) => {

    // ========================================
    // Block Context
    // ========================================

    const {
        activeBlockId,
        cursorPosition,
        selectionStart,
        selectionEnd,
        setActiveBlockId,
        setCursorPosition,
        setSelectionStart,
        setSelectionEnd
    } = useBlockContext();

    // ========================================
    // Local State
    // ========================================

    const [
        content,
        setContent
    ] = useState<string>(
        block.content
    );

    const [
        syncCompleted,
        setSyncCompleted
    ] = useState<boolean>(
        isSyncReady()
    );

    // ========================================
    // Lock State
    // ========================================

    const [
        lockOwner,
        setLockOwner
    ] = useState<string | null>(
        blockLocks.get(block._id) ?? null
    );

    // ========================================
    // Current User
    // ========================================

    const currentUserId =
        getUserId();

    // ========================================
    // Active Block
    // ========================================

    const isActive =
        activeBlockId === block._id;

    // ========================================
    // Lock Status
    // ========================================

    const isLockedByAnotherUser =
        Boolean(
            lockOwner &&
            lockOwner !== currentUserId
        );

    const isOwnedByCurrentUser =
        Boolean(
            lockOwner &&
            lockOwner === currentUserId
        );

    // ========================================
    // Yjs Text Synchronization
    // ========================================

    useEffect(() => {

        let currentText:
            Y.Text | null = null;

        // ----------------------------------------
        // Handle Y.Text Changes
        // ----------------------------------------

        const handleTextChange = () => {

            if (!currentText) {
                return;
            }

            setContent(
                currentText.toString()
            );
        };

        // ----------------------------------------
        // Attach Y.Text Observer
        // ----------------------------------------

        const attachTextObserver = () => {

            const sharedText =
                blocks.get(block._id);

            if (!sharedText) {
                return;
            }

            // ----------------------------------------
            // Remove Previous Observer
            // ----------------------------------------

            if (currentText) {

                currentText.unobserve(
                    handleTextChange
                );
            }

            currentText =
                sharedText;

            // ----------------------------------------
            // Set Current Content
            // ----------------------------------------

            setContent(
                sharedText.toString()
            );

            // ----------------------------------------
            // Observe Text Changes
            // ----------------------------------------

            sharedText.observe(
                handleTextChange
            );
        };

        // ----------------------------------------
        // Observe Blocks Map
        // ----------------------------------------

        blocks.observe(
            attachTextObserver
        );

        // ----------------------------------------
        // Try Immediately
        // ----------------------------------------

        attachTextObserver();

        // ----------------------------------------
        // Cleanup
        // ----------------------------------------

        return () => {

            blocks.unobserve(
                attachTextObserver
            );

            if (currentText) {

                currentText.unobserve(
                    handleTextChange
                );
            }

            currentText = null;
        };

    }, [block._id]);

    // ========================================
    // Block Lock Synchronization
    // ========================================

    useEffect(() => {

        const updateLockOwner = () => {

            const owner =
                blockLocks.get(
                    block._id
                ) ?? null;

            setLockOwner(
                owner
            );
        };

        // ----------------------------------------
        // Initial State
        // ----------------------------------------

        updateLockOwner();

        // ----------------------------------------
        // Observe Lock Changes
        // ----------------------------------------

        blockLocks.observe(
            updateLockOwner
        );

        // ----------------------------------------
        // Cleanup
        // ----------------------------------------

        return () => {

            blockLocks.unobserve(
                updateLockOwner
            );
        };

    }, [block._id]);

    // ========================================
    // Sync Ready
    // ========================================

    useEffect(() => {

        const removeListener =
            onSyncReady(() => {

                setSyncCompleted(
                    true
                );
            });

        return removeListener;

    }, []);

    // ========================================
    // Handle Focus
    // ========================================

    const handleFocus = () => {

        const userId =
            getUserId();

        if (!userId) {

            console.error(
                "Cannot edit block: user ID is not available"
            );

            return;
        }

        // ----------------------------------------
        // Set Active Block
        // ----------------------------------------

        setActiveBlockId(
            block._id
        );

        // ----------------------------------------
        // Check Existing Lock
        // ----------------------------------------

        const existingOwner =
            blockLocks.get(
                block._id
            );

        // ----------------------------------------
        // Another User Owns Lock
        // ----------------------------------------

        if (
            existingOwner &&
            existingOwner !== userId
        ) {

            return;
        }

        // ----------------------------------------
        // Already Owns Lock
        // ----------------------------------------

        if (
            existingOwner === userId
        ) {

            return;
        }

        // ----------------------------------------
        // Request Lock
        // ----------------------------------------

        requestBlockLock(
            block._id
        );
    };

    // ========================================
    // Handle Change
    // ========================================

    const handleChange = (
        event: React.ChangeEvent<
            HTMLTextAreaElement
        >
    ) => {

        const newContent =
            event.target.value;

        const userId =
            getUserId();

        if (!userId) {

            console.error(
                "Cannot edit block: user ID is not available"
            );

            return;
        }

        // ----------------------------------------
        // Verify Lock Ownership
        // ----------------------------------------

        const existingOwner =
            blockLocks.get(
                block._id
            );

        if (
            existingOwner !== userId
        ) {

            console.warn(
                "Cannot edit block. Current user does not own the lock."
            );

            return;
        }

        // ----------------------------------------
        // Get Y.Text
        // ----------------------------------------

        const sharedText =
            blocks.get(
                block._id
            );

        if (!sharedText) {

            console.error(
                "Y.Text not found for block:",
                block._id
            );

            return;
        }

        // ----------------------------------------
        // Calculate Difference
        // ----------------------------------------

        let start = 0;

        while (
            start < content.length &&
            start < newContent.length &&
            content[start] ===
                newContent[start]
        ) {
            start++;
        }

        let oldEnd =
            content.length;

        let newEnd =
            newContent.length;

        while (
            oldEnd > start &&
            newEnd > start &&
            content[oldEnd - 1] ===
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

        // ----------------------------------------
        // Update Y.Text
        // ----------------------------------------

        if (
            deleteLength > 0
        ) {

            sharedText.delete(
                start,
                deleteLength
            );
        }

        if (
            insertedText.length > 0
        ) {

            sharedText.insert(
                start,
                insertedText
            );
        }

        // ----------------------------------------
        // Update Local Content
        // ----------------------------------------

        setContent(
            newContent
        );

        // ----------------------------------------
        // Update Cursor
        // ----------------------------------------

        setCursorPosition(
            event.target.selectionStart
        );

        setSelectionStart(
            event.target.selectionStart
        );

        setSelectionEnd(
            event.target.selectionEnd
        );
    };

    // ========================================
    // Handle Selection
    // ========================================

    const handleSelect = (
        event: React.SyntheticEvent<
            HTMLTextAreaElement
        >
    ) => {

        const textarea =
            event.currentTarget;

        setCursorPosition(
            textarea.selectionStart
        );

        setSelectionStart(
            textarea.selectionStart
        );

        setSelectionEnd(
            textarea.selectionEnd
        );
    };

    // ========================================
    // Handle Click
    // ========================================

    const handleClick = (
        event: React.MouseEvent<
            HTMLTextAreaElement
        >
    ) => {

        const textarea =
            event.currentTarget;

        setActiveBlockId(
            block._id
        );

        setCursorPosition(
            textarea.selectionStart
        );

        setSelectionStart(
            textarea.selectionStart
        );

        setSelectionEnd(
            textarea.selectionEnd
        );
    };

    // ========================================
    // Handle Unlock
    // ========================================

    const handleUnlock = () => {

        const userId =
            getUserId();

        if (!userId) {
            return;
        }

        // ----------------------------------------
        // Verify Ownership
        // ----------------------------------------

        if (
            lockOwner !== userId
        ) {

            console.warn(
                "Cannot unlock block. Current user does not own the lock."
            );

            return;
        }

        // ----------------------------------------
        // Request Unlock
        // ----------------------------------------

        releaseBlockLock(
            block._id
        );
    };

    // ========================================
    // Render
    // ========================================

    return (
        <div
            style={{
                marginBottom: "16px",
                border:
                    isActive
                        ? "2px solid #4f46e5"
                        : "1px solid #ddd",
                borderRadius: "8px",
                padding: "12px"
            }}
        >

            {/* ========================================
                Block Header
            ======================================== */}

            <div
                style={{
                    display: "flex",
                    justifyContent:
                        "space-between",
                    alignItems: "center",
                    marginBottom: "8px"
                }}
            >

                <span
                    style={{
                        fontSize: "12px",
                        color: "#666"
                    }}
                >
                    {block.type}
                </span>

                {/* ----------------------------------------
                    Another User Lock
                ---------------------------------------- */}

                {isLockedByAnotherUser && (
                    <span
                        style={{
                            fontSize: "12px",
                            color: "#dc2626"
                        }}
                    >
                        🔒 This block is being
                        edited by another user
                    </span>
                )}

                {/* ----------------------------------------
                    Current User Lock
                ---------------------------------------- */}

                {isOwnedByCurrentUser && (
                    <span
                        style={{
                            fontSize: "12px",
                            color: "#16a34a"
                        }}
                    >
                        ✏️ You are editing
                        this block
                    </span>
                )}

            </div>

            {/* ========================================
                Textarea
            ======================================== */}

            <textarea
                value={content}
                onChange={handleChange}
                onFocus={handleFocus}
                onClick={handleClick}
                onSelect={handleSelect}
                readOnly={
                    !syncCompleted ||
                    isLockedByAnotherUser
                }
                placeholder="Start writing..."
                style={{
                    width: "100%",
                    minHeight: "100px",
                    padding: "10px",
                    resize: "vertical",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                    outline: "none",
                    fontFamily:
                        block.type === "code"
                            ? "monospace"
                            : "inherit"
                }}
            />

            {/* ========================================
                Unlock Button
            ======================================== */}

            {isOwnedByCurrentUser && (
                <div
                    style={{
                        marginTop: "8px"
                    }}
                >
                    <button
                        type="button"
                        onClick={
                            handleUnlock
                        }
                    >
                        Unlock Block
                    </button>
                </div>
            )}

            {/* ========================================
                Debug Information
            ======================================== */}

            {isActive && (
                <div
                    style={{
                        marginTop: "8px",
                        fontSize: "11px",
                        color: "#666"
                    }}
                >
                    Cursor:{" "}
                    {cursorPosition}

                    {" | "}

                    Selection:{" "}
                    {selectionStart}
                    {" - "}
                    {selectionEnd}
                </div>
            )}

            {/* ========================================
                Child Blocks
            ======================================== */}

            {block.children &&
                block.children.length > 0 && (
                    <div
                        style={{
                            marginLeft:
                                "20px",
                            marginTop:
                                "12px"
                        }}
                    >
                        {block.children.map(
                            (child) => (
                                <BlockRenderer
                                    key={
                                        child._id
                                    }
                                    block={
                                        child
                                    }
                                />
                            )
                        )}
                    </div>
                )}

        </div>
    );
};

export default BlockRenderer;