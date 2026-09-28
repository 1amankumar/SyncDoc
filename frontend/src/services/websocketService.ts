import * as Y from "yjs";
import type { Block } from "../types/document";

// ========================================
// Yjs document
// ========================================

export const ydoc = new Y.Doc();

export const blocks =
    ydoc.getMap<Y.Text>("blocks");

export const blockLocks =
    ydoc.getMap<string>("blockLocks");

// ========================================
// Authenticated User ID
// ========================================

let userId: string | null = null;

export const setUserId = (
    id: string
): void => {
    userId = id;

    console.log(
        "AUTHENTICATED USER ID:",
        userId
    );
};

export const getUserId = (): string | null => {
    return userId;
};

// ========================================
// Yjs Sync Status
// ========================================

let syncReady = false;

export const isSyncReady = (): boolean => {
    return syncReady;
};

// ========================================
// Sync Ready Event
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
        new Event("syncdoc-ready")
    );

    console.log(
        "YJS INITIAL SYNC READY:",
        documentId
    );
};

// ========================================
// WebSocket State
// ========================================

let socket: WebSocket | null = null;

let currentDocumentId:
    string | null = null;

let removeYjsListener:
    (() => void) | null = null;

// ========================================
// Request Block Lock
// ========================================

export const requestBlockLock = (
    blockId: string
): boolean => {
    if (
        !socket ||
        socket.readyState !== WebSocket.OPEN
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
        socket.readyState !== WebSocket.OPEN
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
// Connect To Document
// ========================================

export const connectToDocument = (
    documentId: string,
    documentBlocks: Block[]
): void => {

    // ------------------------------------
    // Reset sync status
    // ------------------------------------

    syncReady = false;

    // ------------------------------------
    // Check authenticated user
    // ------------------------------------

    if (!userId) {
        console.error(
            "Cannot connect: user ID is not available"
        );

        return;
    }

    // ------------------------------------
    // Already connected
    // ------------------------------------

    if (
        socket &&
        currentDocumentId === documentId &&
        socket.readyState === WebSocket.OPEN
    ) {
        console.log(
            "Already connected to document:",
            documentId
        );

        return;
    }

    // ------------------------------------
    // Remove previous Yjs listener
    // ------------------------------------

    if (removeYjsListener) {
        removeYjsListener();
        removeYjsListener = null;
    }

    // ------------------------------------
    // Save previous socket
    // ------------------------------------

    const previousSocket = socket;

    // ------------------------------------
    // Close previous socket
    // ------------------------------------

    if (previousSocket) {
        previousSocket.close();
    }

    // ------------------------------------
    // Create new WebSocket
    // ------------------------------------

    const newSocket = new WebSocket(
        `ws://localhost:5001/document/${documentId}?userId=${userId}`
    );

    // ------------------------------------
    // Store new socket
    // ------------------------------------

    socket = newSocket;
    currentDocumentId = documentId;

    // ====================================
    // Handle Local Yjs Updates
    // ====================================

    const handleYjsUpdate = (
        update: Uint8Array,
        origin: unknown
    ): void => {

        // --------------------------------
        // Do not send remote updates back
        // --------------------------------

        if (origin === "remote") {
            return;
        }

        // --------------------------------
        // Make sure this WebSocket is open
        // --------------------------------

        if (
            newSocket.readyState !==
            WebSocket.OPEN
        ) {
            return;
        }

        // --------------------------------
        // Convert Uint8Array to ArrayBuffer
        // --------------------------------

        const buffer =
            update.buffer.slice(
                update.byteOffset,
                update.byteOffset +
                update.byteLength
            ) as ArrayBuffer;

        // --------------------------------
        // Send Yjs update
        // --------------------------------

        newSocket.send(buffer);
    };

    // ====================================
    // Register Yjs Update Listener
    // ====================================

    ydoc.on(
        "update",
        handleYjsUpdate
    );

    // ====================================
    // Remove Yjs Listener
    // ====================================

    removeYjsListener = () => {
        ydoc.off(
            "update",
            handleYjsUpdate
        );
    };

    // ====================================
    // WebSocket Open
    // ====================================

    newSocket.onopen = () => {
        console.log(
            "Connected to document:",
            documentId
        );

        console.log(
            "WebSocket user ID:",
            userId
        );
    };

    // ====================================
    // WebSocket Message
    // ====================================

    newSocket.onmessage =
        async (event) => {

            // =================================
            // Server control message
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

                // --------------------------------
                // Lock result
                // --------------------------------

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
                                detail: message
                            }
                        )
                    );

                    return;
                }

                // --------------------------------
                // Unlock result
                // --------------------------------

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
                                detail: message
                            }
                        )
                    );

                    return;
                }

                // --------------------------------
                // Initialize document
                // --------------------------------

                if (
                    message.type ===
                    "initialize"
                ) {
                    console.log(
                        "Initializing document from MongoDB"
                    );

                    documentBlocks.forEach(
                        (block) => {

                            const existingText =
                                blocks.get(
                                    block._id
                                );

                            // Do not recreate
                            // existing block

                            if (
                                existingText
                            ) {
                                return;
                            }

                            const text =
                                new Y.Text();

                            text.insert(
                                0,
                                block.content
                            );

                            blocks.set(
                                block._id,
                                text
                            );
                        }
                    );

                    markSyncReady(
                        documentId
                    );

                    return;
                }

                return;
            }

            // =================================
            // Binary Yjs Update
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

                // --------------------------------
                // Apply remote update
                // --------------------------------

                Y.applyUpdate(
                    ydoc,
                    update,
                    "remote"
                );

                // --------------------------------
                // Initial synchronization complete
                // --------------------------------

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

    // ====================================
    // WebSocket Close
    // ====================================

    newSocket.onclose = () => {
        console.log(
            "Disconnected from document:",
            documentId
        );

        // --------------------------------
        // Ignore old WebSocket close
        // --------------------------------

        if (
            socket !== newSocket
        ) {
            console.log(
                "Ignoring close from old WebSocket:",
                documentId
            );

            return;
        }

        // --------------------------------
        // Remove Yjs listener
        // --------------------------------

        if (removeYjsListener) {
            removeYjsListener();
            removeYjsListener = null;
        }

        // --------------------------------
        // Reset connection state
        // --------------------------------

        socket = null;
        currentDocumentId = null;
        syncReady = false;
    };

    // ====================================
    // WebSocket Error
    // ====================================

    newSocket.onerror = (
        error
    ) => {
        console.error(
            "WebSocket error:",
            error
        );
    };
};