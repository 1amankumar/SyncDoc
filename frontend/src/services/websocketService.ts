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
export interface Collaborator {
    id: string;
    name: string;
}

export interface CollaboratorState {
    users: Collaborator[];
    count: number;
}

let collaborators: CollaboratorState = {
    users: [],
    count: 0
};

export const getCollaborators =
    (): CollaboratorState => {
        return collaborators;
    };

export const onCollaboratorsUpdate = (
    callback: (
        state: CollaboratorState
    ) => void
) => {
    const handleUpdate =
        (event: Event) => {
            const customEvent =
                event as CustomEvent<CollaboratorState>;

            callback(
                customEvent.detail
            );
        };

    window.addEventListener(
        "syncdoc-collaborators",
        handleUpdate
    );

    return () => {
        window.removeEventListener(
            "syncdoc-collaborators",
            handleUpdate
        );
    };
};

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
// Delete Permission
// ========================================

export interface DeleteRequest {

    requestId: string;

    blockId: string;

    requesterId: string;
}

export interface DeleteResult {

    requestId?: string;

    blockId: string;

    deleted: boolean;

    reason?: string;
}

const deleteRequestListeners:
    Array<
        (
            request: DeleteRequest
        ) => void
    > = [];

const deleteResultListeners:
    Array<
        (
            result: DeleteResult
        ) => void
    > = [];

// ========================================
// Delete Request Listener
// ========================================

export const onDeleteRequest = (
    listener: (
        request: DeleteRequest
    ) => void
): (() => void) => {

    deleteRequestListeners.push(
        listener
    );

    return () => {

        const index =
            deleteRequestListeners.indexOf(
                listener
            );

        if (index !== -1) {

            deleteRequestListeners.splice(
                index,
                1
            );
        }
    };
};

// ========================================
// Delete Result Listener
// ========================================

export const onDeleteResult = (
    listener: (
        result: DeleteResult
    ) => void
): (() => void) => {

    deleteResultListeners.push(
        listener
    );

    return () => {

        const index =
            deleteResultListeners.indexOf(
                listener
            );

        if (index !== -1) {

            deleteResultListeners.splice(
                index,
                1
            );
        }
    };
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
// Request Block Deletion
// ========================================

export const requestDeleteBlock = (
    blockId: string
): boolean => {

    if (
        !socket ||
        socket.readyState !==
        WebSocket.OPEN
    ) {

        console.error(
            "Cannot request deletion: WebSocket is not connected"
        );

        return false;
    }

    if (!currentDocumentId) {

        console.error(
            "Cannot request deletion: no document is connected"
        );

        return false;
    }

    socket.send(
        JSON.stringify({
            type:
                "request-delete",
            blockId
        })
    );

    console.log(
        "DELETE REQUEST:",
        blockId
    );

    return true;
};

// ========================================
// Approve Delete Request
// ========================================

export const approveDeleteRequest = (
    requestId: string
): boolean => {

    if (
        !socket ||
        socket.readyState !==
        WebSocket.OPEN
    ) {

        console.error(
            "Cannot approve deletion: WebSocket is not connected"
        );

        return false;
    }

    socket.send(
        JSON.stringify({
            type:
                "approve-delete",
            requestId
        })
    );

    console.log(
        "DELETE APPROVAL:",
        requestId
    );

    return true;
};

// ========================================
// Reject Delete Request
// ========================================

export const rejectDeleteRequest = (
    requestId: string
): boolean => {

    if (
        !socket ||
        socket.readyState !==
        WebSocket.OPEN
    ) {

        console.error(
            "Cannot reject deletion: WebSocket is not connected"
        );

        return false;
    }

    socket.send(
        JSON.stringify({
            type:
                "reject-delete",
            requestId
        })
    );

    console.log(
        "DELETE REJECTION:",
        requestId
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
// Remove Collaborative Block
// ========================================

export const removeBlock = (
    blockId: string
): boolean => {

    if (!blocks.has(blockId)) {
        console.warn(
            "Cannot remove block. Block does not exist:",
            blockId
        );

        return false;
    }

    // ----------------------------------------
    // Remove block content
    // ----------------------------------------

    blocks.delete(
        blockId
    );

    // ----------------------------------------
    // Remove block type
    // ----------------------------------------

    blockTypes.delete(
        blockId
    );

    // ----------------------------------------
    // Remove block from order
    // ----------------------------------------

    const currentOrder =
        blockOrder.toArray();

    const index =
        currentOrder.indexOf(
            blockId
        );

    if (index !== -1) {

        blockOrder.delete(
            index,
            1
        );
    }

    // ----------------------------------------
    // Remove lock
    // ----------------------------------------

    if (
        blockLocks.has(
            blockId
        )
    ) {

        blockLocks.delete(
            blockId
        );
    }

    console.log(
        "BLOCK REMOVED:",
        blockId
    );

    return true;
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
                // Server Rejected Yjs Update
                // =================================

                if (
                    message.type ===
                    "updateRejected"
                ) {

                    console.warn(
                        "YJS UPDATE REJECTED:",
                        message
                    );

                    const blockId =
                        message.blockId;

                    const authoritativeContent =
                        message.content;

                    // --------------------------------
                    // Validate response
                    // --------------------------------

                    if (
                        !blockId ||
                        typeof authoritativeContent !==
                        "string"
                    ) {

                        console.error(
                            "Cannot restore rejected block:",
                            message
                        );

                        return;
                    }

                    // --------------------------------
                    // Find local Y.Text
                    // --------------------------------

                    const sharedText =
                        blocks.get(
                            blockId
                        );

                    if (
                        !(sharedText instanceof Y.Text)
                    ) {

                        console.error(
                            "Rejected block not found:",
                            blockId
                        );

                        return;
                    }

                    // --------------------------------
                    // Restore server-authoritative content
                    // --------------------------------

                    ydoc.transact(
                        () => {

                            sharedText.delete(
                                0,
                                sharedText.length
                            );

                            if (
                                authoritativeContent.length > 0
                            ) {

                                sharedText.insert(
                                    0,
                                    authoritativeContent
                                );
                            }

                        },
                        "remote"
                    );

                    console.log(
                        "BLOCK RESTORED AFTER REJECTED UPDATE:",
                        blockId
                    );

                    // --------------------------------
                    // Notify React UI
                    // --------------------------------

                    window.dispatchEvent(
                        new CustomEvent(
                            "syncdoc-update-rejected",
                            {
                                detail: message
                            }
                        )
                    );

                    return;
                }

                // =================================
                // Delete Request
                // =================================

                if (
                    message.type ===
                    "delete-request"
                ) {

                    console.log(
                        "DELETE REQUEST RECEIVED:",
                        message
                    );

                    deleteRequestListeners.forEach(
                        (
                            listener
                        ) => {

                            listener({
                                requestId:
                                    message.requestId,

                                blockId:
                                    message.blockId,

                                requesterId:
                                    message.requesterId
                            });
                        }
                    );

                    return;
                }
                if (
                    message.type ===
                    "collaborators"
                ) {
                    collaborators = {
                        users:
                            Array.isArray(
                                message.users
                            )
                                ? message.users
                                : [],
                        count:
                            typeof message.count ===
                                "number"
                                ? message.count
                                : 0
                    };

                    console.log(
                        "COLLABORATORS UPDATE:",
                        collaborators
                    );

                    window.dispatchEvent(
                        new CustomEvent(
                            "syncdoc-collaborators",
                            {
                                detail:
                                    collaborators
                            }
                        )
                    );

                    return;
                }

                // =================================
                // Delete Pending
                // =================================

                if (
                    message.type ===
                    "delete-pending"
                ) {

                    console.log(
                        "DELETE REQUEST PENDING:",
                        message
                    );

                    return;
                }

                // =================================
                // Delete Result
                // =================================

                if (
                    message.type ===
                    "deleteResult"
                ) {

                    console.log(
                        "DELETE RESULT:",
                        message
                    );

                    // ----------------------------------------
                    // Apply successful deletion locally
                    // ----------------------------------------

                    if (
                        message.deleted === true &&
                        message.blockId
                    ) {

                        removeBlock(
                            message.blockId
                        );
                    }

                    // ----------------------------------------
                    // Notify listeners
                    // ----------------------------------------

                    deleteResultListeners.forEach(
                        (
                            listener
                        ) => {

                            listener({
                                requestId:
                                    message.requestId,

                                blockId:
                                    message.blockId,

                                deleted:
                                    Boolean(
                                        message.deleted
                                    ),

                                reason:
                                    message.reason
                            });
                        }
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
                        (
                            block
                        ) => {

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
            collaborators = {
                users: [],
                count: 0
            };

            window.dispatchEvent(
                new CustomEvent(
                    "syncdoc-collaborators",
                    {
                        detail:
                            collaborators
                    }
                )
            );
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
