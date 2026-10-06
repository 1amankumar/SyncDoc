import * as Y from "yjs";

import type {
    Block
} from "../types/document";



// ========================================
// Yjs Document
// ========================================

export const ydoc =
    new Y.Doc();

// ========================================
// Collaborative Blocks
// ========================================

export const blocks =
    ydoc.getMap<Y.Text>(
        "blocks"
    );

// ========================================
// Block Locks
// ========================================

export const blockLocks =
    ydoc.getMap<string>(
        "blockLocks"
    );

// ========================================
// Block Order
// ========================================

export const blockOrder =
    ydoc.getArray<string>(
        "blockOrder"
    );

// ========================================
// Block Types
// ========================================

export const blockTypes =
    ydoc.getMap<Block["type"]>(
        "blockTypes"
    );

// ========================================
// Authenticated User ID
// ========================================

let userId:
    string | null = null;

export const setUserId = (
    id: string
): void => {

    userId = id;

    console.log(
        "AUTHENTICATED USER ID:",
        userId
    );
};

export const getUserId = ():
    string | null => {

    return userId;
};

// ========================================
// Sync Status
// ========================================

let syncReady =
    false;

export const isSyncReady = ():
    boolean => {

    return syncReady;
};

// ========================================
// Sync Ready Listener
// ========================================

export const onSyncReady = (
    callback: () => void
) => {

    window.addEventListener(
        "syncdoc-ready",
        callback
    );

    return () => {

        window.removeEventListener(
            "syncdoc-ready",
            callback
        );
    };
};

// ========================================
// Mark Sync Ready
// ========================================

const markSyncReady = (
    documentId: string
): void => {

    syncReady = true;

    window.dispatchEvent(
        new Event(
            "syncdoc-ready"
        )
    );

    console.log(
        "YJS INITIAL SYNC READY:",
        documentId
    );
};

// ========================================
// WebSocket State
// ========================================

let socket:
    WebSocket | null = null;

let currentDocumentId:
    string | null = null;

let removeYjsListener:
    (() => void) | null = null;

// ========================================
// Remote Cursor
// ========================================

export interface RemoteCursor {

    userId: string;

    blockId: string;

    cursorPosition: number;

    selectionStart: number;

    selectionEnd: number;
}

const remoteCursors =
    new Map<
        string,
        RemoteCursor
    >();

// ========================================
// Get Remote Cursors
// ========================================

export const getRemoteCursors =
    (): RemoteCursor[] => {

        return Array.from(
            remoteCursors.values()
        );
    };

// ========================================
// Clear Remote Cursors
// ========================================

const clearRemoteCursors =
    (): void => {

        remoteCursors.clear();

        window.dispatchEvent(
            new Event(
                "syncdoc-cursor-update"
            )
        );
    };

// ========================================
// Send Cursor Position
// ========================================

export const sendCursorPosition = (
    blockId: string,
    cursorPosition: number,
    selectionStart: number,
    selectionEnd: number
): boolean => {

    if (
        !socket ||
        socket.readyState !==
            WebSocket.OPEN
    ) {

        return false;
    }

    if (!userId) {

        return false;
    }

    socket.send(
        JSON.stringify({
            type: "cursor",

            blockId,

            cursorPosition,

            selectionStart,

            selectionEnd
        })
    );

    return true;
};

// ========================================
// Remove Remote Cursor
// ========================================

export const removeRemoteCursor = (
    remoteUserId: string
): void => {

    remoteCursors.delete(
        remoteUserId
    );

    window.dispatchEvent(
        new Event(
            "syncdoc-cursor-update"
        )
    );
};

// ========================================
// Request Block Lock
// ========================================

export const requestBlockLock = (
    blockId: string
): boolean => {

    if (
        !socket ||
        socket.readyState !==
            WebSocket.OPEN
    ) {

        console.error(
            "Cannot request lock: WebSocket is not connected"
        );

        return false;
    }

    socket.send(
        JSON.stringify({
            type: "lock",
            blockId
        })
    );

    console.log(
        "LOCK REQUEST:",
        blockId
    );

    return true;
};

// ========================================
// Release Block Lock
// ========================================

export const releaseBlockLock = (
    blockId: string
): boolean => {

    if (
        !socket ||
        socket.readyState !==
            WebSocket.OPEN
    ) {

        console.error(
            "Cannot release lock: WebSocket is not connected"
        );

        return false;
    }

    socket.send(
        JSON.stringify({
            type: "unlock",
            blockId
        })
    );

    console.log(
        "UNLOCK REQUEST:",
        blockId
    );

    return true;
};

// ========================================
// Add Collaborative Block
// ========================================

export const addBlock = (
    type: Block["type"]
): string | null => {

    // ========================================
    // Check User
    // ========================================

    if (!userId) {

        console.error(
            "Cannot add block: user ID unavailable"
        );

        return null;
    }

    // ========================================
    // Check WebSocket
    // ========================================

    if (
        !socket ||
        socket.readyState !==
            WebSocket.OPEN
    ) {

        console.error(
            "Cannot add block: WebSocket is not connected"
        );

        return null;
    }

    // ========================================
    // Check Sync
    // ========================================

    if (!syncReady) {

        console.error(
            "Cannot add block: document is not synchronized"
        );

        return null;
    }

    // ========================================
    // Generate Block ID
    // ========================================

    const blockId =
        crypto.randomUUID();

    // ========================================
    // Create Y.Text
    // ========================================

    const text =
        new Y.Text();

    // ========================================
    // Add Block To Yjs
    // ========================================

    blocks.set(
        blockId,
        text
    );

    // ========================================
    // Store Block Type
    // ========================================

    blockTypes.set(
        blockId,
        type
    );

    // ========================================
    // Store Block Order
    // ========================================

    blockOrder.push([
        blockId
    ]);

    // ========================================
    // Log
    // ========================================

    console.log(
        "BLOCK ADDED:",
        blockId,
        type
    );

    return blockId;
};

// ========================================
// Clean Block Order
// ========================================

const cleanBlockOrder =
    (): void => {

        const currentOrder =
            blockOrder.toArray();

        // ------------------------------------
        // Remove duplicate IDs
        // ------------------------------------

        const uniqueOrder =
            Array.from(
                new Set(
                    currentOrder
                )
            );

        // ------------------------------------
        // Nothing to clean
        // ------------------------------------

        if (
            uniqueOrder.length ===
            currentOrder.length
        ) {

            return;
        }

        // ------------------------------------
        // Rebuild Yjs order
        // ------------------------------------

        blockOrder.delete(
            0,
            blockOrder.length
        );

        if (
            uniqueOrder.length > 0
        ) {

            blockOrder.push(
                uniqueOrder
            );
        }

        console.log(
            "DUPLICATE BLOCK ORDER CLEANED:",
            uniqueOrder
        );
    };

// ========================================
// Ensure Block Is In Order
// ========================================

const ensureBlockInOrder = (
    blockId: string
): void => {

    const currentOrder =
        blockOrder.toArray();

    if (
        currentOrder.includes(
            blockId
        )
    ) {

        return;
    }

    blockOrder.push([
        blockId
    ]);

    console.log(
        "BLOCK ORDER RESTORED:",
        blockId
    );
};

// ========================================
// Connect To Document
// ========================================

export const connectToDocument = (
    documentId: string,
    documentBlocks: Block[]
): void => {

    // ========================================
    // Reset Sync
    // ========================================

    syncReady = false;

    // ========================================
    // Check User
    // ========================================

    if (!userId) {

        console.error(
            "Cannot connect: user ID unavailable"
        );

        return;
    }

    // ========================================
    // Already Connected
    // ========================================

    if (
        socket &&
        currentDocumentId ===
            documentId &&
        socket.readyState ===
            WebSocket.OPEN
    ) {

        console.log(
            "Already connected to document:",
            documentId
        );

        return;
    }

    // ========================================
    // Remove Previous Yjs Listener
    // ========================================

    if (
        removeYjsListener
    ) {

        removeYjsListener();

        removeYjsListener =
            null;
    }

    // ========================================
    // Close Previous Socket
    // ========================================

    const previousSocket =
        socket;

    if (
        previousSocket
    ) {

        previousSocket.close();
    }

    // ========================================
    // Clear Previous Document State
    // ========================================

    blocks.clear();

    blockLocks.clear();

    blockOrder.delete(
        0,
        blockOrder.length
    );

    blockTypes.clear();

    clearRemoteCursors();

    // ========================================
    // Create WebSocket
    // ========================================

    const newSocket =
        new WebSocket(
            `ws://localhost:5001/document/${documentId}?userId=${userId}`
        );

    socket =
        newSocket;

    currentDocumentId =
        documentId;

    // ========================================
    // Local Yjs Update Handler
    // ========================================

    const handleYjsUpdate = (
        update: Uint8Array,
        origin: unknown
    ): void => {

        // --------------------------------
        // Ignore remote updates
        // --------------------------------

        if (
            origin ===
            "remote"
        ) {

            return;
        }

        // --------------------------------
        // Socket must be open
        // --------------------------------

        if (
            newSocket.readyState !==
            WebSocket.OPEN
        ) {

            return;
        }

        // --------------------------------
        // Convert update
        // --------------------------------

        const buffer =
            update.buffer.slice(
                update.byteOffset,
                update.byteOffset +
                    update.byteLength
            ) as ArrayBuffer;

        // --------------------------------
        // Send update
        // --------------------------------

        newSocket.send(
            buffer
        );
    };

    // ========================================
    // Register Listener
    // ========================================

    ydoc.on(
        "update",
        handleYjsUpdate
    );

    // ========================================
    // Remove Listener
    // ========================================

    removeYjsListener =
        () => {

            ydoc.off(
                "update",
                handleYjsUpdate
            );
        };

    // ========================================
    // WebSocket Open
    // ========================================

    newSocket.onopen =
        () => {

            console.log(
                "Connected to document:",
                documentId
            );

            console.log(
                "WebSocket user ID:",
                userId
            );
        };

    // ========================================
    // WebSocket Message
    // ========================================

    newSocket.onmessage =
        async (event) => {

            // =================================
            // TEXT MESSAGE
            // =================================

            if (
                typeof event.data ===
                "string"
            ) {

                let message: any;

                try {

                    message =
                        JSON.parse(
                            event.data
                        );

                } catch (error) {

                    console.error(
                        "Invalid WebSocket control message:",
                        error
                    );

                    return;
                }

                // =================================
                // Lock Result
                // =================================

                if (
                    message.type ===
                    "lockResult"
                ) {

                    console.log(
                        "LOCK RESULT:",
                        message
                    );

                    window.dispatchEvent(
                        new CustomEvent(
                            "syncdoc-lock-result",
                            {
                                detail:
                                    message
                            }
                        )
                    );

                    return;
                }

                // =================================
                // Unlock Result
                // =================================

                if (
                    message.type ===
                    "unlockResult"
                ) {

                    console.log(
                        "UNLOCK RESULT:",
                        message
                    );

                    window.dispatchEvent(
                        new CustomEvent(
                            "syncdoc-unlock-result",
                            {
                                detail:
                                    message
                            }
                        )
                    );

                    return;
                }

                // =================================
                // Remote Cursor
                // =================================

                if (
                    message.type ===
                    "cursor"
                ) {

                    if (
                        !message.userId ||
                        message.userId ===
                            userId ||
                        !message.blockId
                    ) {

                        return;
                    }

                    remoteCursors.set(
                        message.userId,
                        {
                            userId:
                                message.userId,

                            blockId:
                                message.blockId,

                            cursorPosition:
                                Number(
                                    message.cursorPosition
                                ),

                            selectionStart:
                                Number(
                                    message.selectionStart
                                ),

                            selectionEnd:
                                Number(
                                    message.selectionEnd
                                )
                        }
                    );

                    window.dispatchEvent(
                        new Event(
                            "syncdoc-cursor-update"
                        )
                    );

                    return;
                }

                // =================================
                // Remote Cursor Removed
                // =================================

                if (
                    message.type ===
                    "cursorRemoved"
                ) {

                    if (
                        message.userId
                    ) {

                        removeRemoteCursor(
                            message.userId
                        );
                    }

                    return;
                }

                // =================================
                // INITIALIZE FROM MONGODB
                // =================================

                if (
                    message.type ===
                    "initialize"
                ) {

                    console.log(
                        "Initializing document from MongoDB"
                    );

                    // ========================================
                    // STEP 1
                    // Clean Existing Yjs Order
                    // ========================================

                    cleanBlockOrder();

                    // ========================================
                    // STEP 2
                    // Restore MongoDB Blocks
                    // ========================================

                    documentBlocks.forEach(
                        (block) => {

                            // ====================================
                            // Restore Y.Text
                            // ====================================

                            let sharedText =
                                blocks.get(
                                    block._id
                                );

                            if (
                                !sharedText
                            ) {

                                sharedText =
                                    new Y.Text();

                                // -------------------------------
                                // Restore content
                                // -------------------------------

                                if (
                                    block.content
                                ) {

                                    sharedText.insert(
                                        0,
                                        block.content
                                    );
                                }

                                blocks.set(
                                    block._id,
                                    sharedText
                                );

                                console.log(
                                    "BLOCK RESTORED:",
                                    block._id
                                );
                            }

                            // ====================================
                            // Restore Block Type
                            // ====================================

                            if (
                                !blockTypes.has(
                                    block._id
                                )
                            ) {

                                blockTypes.set(
                                    block._id,
                                    block.type
                                );

                                console.log(
                                    "BLOCK TYPE RESTORED:",
                                    block._id
                                );
                            }

                            // ====================================
                            // Restore Block Order
                            // ====================================

                            ensureBlockInOrder(
                                block._id
                            );
                        }
                    );

                    // ========================================
                    // STEP 3
                    // Final Duplicate Cleanup
                    // ========================================

                    cleanBlockOrder();

                    // ========================================
                    // STEP 4
                    // Sync Ready
                    // ========================================

                    markSyncReady(
                        documentId
                    );

                    return;
                }

                return;
            }

            // =================================
            // BINARY YJS UPDATE
            // =================================

            console.log(
                "Update received for document:",
                documentId
            );

            try {

    const data =
        await event.data.arrayBuffer();

    const update =
        new Uint8Array(
            data
        );

    // ========================================
    // Apply Remote Yjs Update
    // ========================================

    Y.applyUpdate(
        ydoc,
        update,
        "remote"
    );

    // ========================================
    // Mark Synchronization Complete
    // ========================================

    markSyncReady(
        documentId
    );

} catch (error) {

    console.error(
        "Failed to apply Yjs update:",
        error
    );
}
        };

    // ========================================
    // WebSocket Close
    // ========================================

    newSocket.onclose =
        () => {

            console.log(
                "Disconnected from document:",
                documentId
            );

            // --------------------------------
            // Ignore old socket
            // --------------------------------

            if (
                socket !==
                newSocket
            ) {

                console.log(
                    "Ignoring old WebSocket close:",
                    documentId
                );

                return;
            }

            // --------------------------------
            // Remove listener
            // --------------------------------

            if (
                removeYjsListener
            ) {

                removeYjsListener();

                removeYjsListener =
                    null;
            }

            // --------------------------------
            // Reset state
            // --------------------------------

            socket =
                null;

            currentDocumentId =
                null;

            syncReady =
                false;

            clearRemoteCursors();
        };

    // ========================================
    // WebSocket Error
    // ========================================

    newSocket.onerror =
        (error) => {

            console.error(
                "WebSocket error:",
                error
            );
        };
};