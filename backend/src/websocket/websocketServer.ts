import {
    WebSocketServer,
    WebSocket
} from "ws";

import * as Y from "yjs";

import {
    sanitizeBlockContent
} from "../services/sanitizationService.js";

// ========================================
// Yjs Documents
// ========================================

const documents =
    new Map<string, Y.Doc>();

// ========================================
// Connected Clients
// ========================================

const clients =
    new Map<string, Set<WebSocket>>();

// ========================================
// WebSocket Server
// ========================================

const ws =
    new WebSocketServer({
        port: 5001
    });

// ========================================
// Client Connection
// ========================================

ws.on(
    "connection",
    (socket, request) => {

        // --------------------------------
        // Get URL information
        // --------------------------------

        const url =
            new URL(
                request.url || "",
                "http://localhost"
            );

        const documentId =
            url.pathname.split("/")[2];

        const userId =
            url.searchParams.get("userId");

        // --------------------------------
        // Validate connection
        // --------------------------------

        if (
            !documentId ||
            !userId
        ) {
            socket.close();
            return;
        }

        console.log(
            "Client connected:",
            documentId,
            userId
        );

        // ========================================
        // Get or Create Yjs Document
        // ========================================

        const isNewDocument =
            !documents.has(documentId);

        let ydoc =
            documents.get(documentId);

        if (!ydoc) {
            ydoc =
                new Y.Doc();

            documents.set(
                documentId,
                ydoc
            );
        }

        // ========================================
        // Send Initial Document State
        // ========================================

        if (isNewDocument) {

            socket.send(
                JSON.stringify({
                    type: "initialize"
                })
            );

        } else {

            const currentState =
                Y.encodeStateAsUpdate(
                    ydoc
                );

            if (
                currentState.length > 0
            ) {
                socket.send(
                    currentState
                );
            }
        }

        // ========================================
        // Add Client
        // ========================================

        let documentClients =
            clients.get(documentId);

        if (!documentClients) {

            documentClients =
                new Set<WebSocket>();

            clients.set(
                documentId,
                documentClients
            );
        }

        documentClients.add(
            socket
        );

        // ========================================
        // Receive Messages
        // ========================================

        socket.on(
            "message",
            (
                message,
                isBinary
            ) => {

                // ====================================
                // TEXT CONTROL MESSAGE
                // ====================================

                if (!isBinary) {

                    let controlMessage: {
                        type: string;
                        blockId?: string;
                    };

                    try {

                        controlMessage =
                            JSON.parse(
                                message.toString()
                            );

                    } catch {

                        console.error(
                            "Invalid control message"
                        );

                        return;
                    }

                    // ====================================
                    // LOCK REQUEST
                    // ====================================

                    if (
                        controlMessage.type ===
                        "lock"
                    ) {

                        const blockId =
                            controlMessage.blockId;

                        if (!blockId) {
                            return;
                        }

                        const blockLocks =
                            ydoc!.getMap<string>(
                                "blockLocks"
                            );

                        const currentOwner =
                            blockLocks.get(
                                blockId
                            );

                        // --------------------------------
                        // Block already locked by another
                        // user
                        // --------------------------------

                        if (
                            currentOwner &&
                            currentOwner !== userId
                        ) {

                            socket.send(
                                JSON.stringify({
                                    type:
                                        "lockResult",

                                    blockId,

                                    granted:
                                        false,

                                    lockedBy:
                                        currentOwner
                                })
                            );

                            console.log(
                                "LOCK DENIED:",
                                blockId,
                                "already owned by",
                                currentOwner
                            );

                            return;
                        }

                        // --------------------------------
                        // User already owns this lock
                        // --------------------------------

                        if (
                            currentOwner ===
                            userId
                        ) {

                            socket.send(
                                JSON.stringify({
                                    type:
                                        "lockResult",

                                    blockId,

                                    granted:
                                        true,

                                    lockedBy:
                                        userId
                                })
                            );

                            console.log(
                                "LOCK ALREADY OWNED:",
                                blockId,
                                "by",
                                userId
                            );

                            return;
                        }

                        // --------------------------------
                        // Save state before lock
                        // --------------------------------

                        const stateBefore =
                            Y.encodeStateVector(
                                ydoc!
                            );

                        // --------------------------------
                        // Acquire lock
                        // --------------------------------

                        ydoc!.transact(
                            () => {

                                blockLocks.set(
                                    blockId,
                                    userId
                                );

                            }
                        );

                        // --------------------------------
                        // Create lock update
                        // --------------------------------

                        const lockUpdate =
                            Y.encodeStateAsUpdate(
                                ydoc!,
                                stateBefore
                            );

                        // --------------------------------
                        // Tell requester lock succeeded
                        // --------------------------------

                        socket.send(
                            JSON.stringify({
                                type:
                                    "lockResult",

                                blockId,

                                granted:
                                    true,

                                lockedBy:
                                    userId
                            })
                        );

                        // --------------------------------
                        // Broadcast lock update
                        // --------------------------------

                        if (
                            lockUpdate.length > 0
                        ) {

                            documentClients?.forEach(
                                (client) => {

                                    if (
                                        client.readyState ===
                                        WebSocket.OPEN
                                    ) {

                                        client.send(
                                            lockUpdate
                                        );

                                    }

                                }
                            );

                        }

                        console.log(
                            "LOCK ACQUIRED:",
                            blockId,
                            "by",
                            userId
                        );

                        return;
                    }

                    // ====================================
                    // UNLOCK REQUEST
                    // ====================================

                    if (
                        controlMessage.type ===
                        "unlock"
                    ) {

                        const blockId =
                            controlMessage.blockId;

                        if (!blockId) {
                            return;
                        }

                        const blockLocks =
                            ydoc!.getMap<string>(
                                "blockLocks"
                            );

                        const currentOwner =
                            blockLocks.get(
                                blockId
                            );

                        // --------------------------------
                        // Only owner can unlock
                        // --------------------------------

                        if (
                            currentOwner !==
                            userId
                        ) {

                            socket.send(
                                JSON.stringify({
                                    type:
                                        "unlockResult",

                                    blockId,

                                    released:
                                        false
                                })
                            );

                            console.log(
                                "UNLOCK DENIED:",
                                blockId,
                                "owner:",
                                currentOwner,
                                "requester:",
                                userId
                            );

                            return;
                        }

                        // --------------------------------
                        // Save state before unlock
                        // --------------------------------

                        const stateBefore =
                            Y.encodeStateVector(
                                ydoc!
                            );

                        // --------------------------------
                        // Release lock
                        // --------------------------------

                        ydoc!.transact(
                            () => {

                                blockLocks.delete(
                                    blockId
                                );

                            }
                        );

                        // --------------------------------
                        // Create unlock update
                        // --------------------------------

                        const unlockUpdate =
                            Y.encodeStateAsUpdate(
                                ydoc!,
                                stateBefore
                            );

                        // --------------------------------
                        // Tell requester unlock succeeded
                        // --------------------------------

                        socket.send(
                            JSON.stringify({
                                type:
                                    "unlockResult",

                                blockId,

                                released:
                                    true
                            })
                        );

                        // --------------------------------
                        // Broadcast unlock update
                        // --------------------------------

                        if (
                            unlockUpdate.length > 0
                        ) {

                            documentClients?.forEach(
                                (client) => {

                                    if (
                                        client.readyState ===
                                        WebSocket.OPEN
                                    ) {

                                        client.send(
                                            unlockUpdate
                                        );

                                    }

                                }
                            );

                        }

                        console.log(
                            "LOCK RELEASED:",
                            blockId,
                            "by",
                            userId
                        );

                        return;
                    }

                    // --------------------------------
                    // Unknown control message
                    // --------------------------------

                    console.log(
                        "Unknown control message:",
                        controlMessage
                    );

                    return;
                }

                // ====================================
                // BINARY YJS UPDATE
                // ====================================

                console.log(
                    "Yjs update received for document:",
                    documentId
                );

                const update =
                    new Uint8Array(
                        message as Buffer
                    );

                // --------------------------------
                // Save state before applying update
                // --------------------------------

                const stateBefore =
                    Y.encodeStateVector(
                        ydoc!
                    );

                // --------------------------------
                // Apply incoming Yjs update
                // --------------------------------

                Y.applyUpdate(
                    ydoc!,
                    update
                );

                // ========================================
                // Sanitize Collaborative Block Content
                // ========================================

                const blocks =
                    ydoc!.getMap<Y.Text>(
                        "blocks"
                    );

                ydoc!.transact(
                    () => {

                        blocks.forEach(
                            (
                                yText,
                                blockId
                            ) => {

                                // --------------------------------
                                // Make sure this is a Y.Text
                                // --------------------------------

                                if (
                                    !(yText instanceof Y.Text)
                                ) {
                                    return;
                                }

                                // --------------------------------
                                // Get current block content
                                // --------------------------------

                                const currentContent =
                                    yText.toString();

                                // --------------------------------
                                // Sanitize block content
                                // --------------------------------

                                const sanitizedContent =
                                    sanitizeBlockContent(
                                        currentContent
                                    );

                                // --------------------------------
                                // Replace unsafe content
                                // --------------------------------

                                if (
                                    currentContent !==
                                    sanitizedContent
                                ) {

                                    yText.delete(
                                        0,
                                        yText.length
                                    );

                                    yText.insert(
                                        0,
                                        sanitizedContent
                                    );

                                    console.log(
                                        "Sanitized block:",
                                        blockId
                                    );

                                }

                            }
                        );

                    }
                );

                // --------------------------------
                // Create final sanitized update
                // --------------------------------

                const sanitizedUpdate =
                    Y.encodeStateAsUpdate(
                        ydoc!,
                        stateBefore
                    );

                // --------------------------------
                // Broadcast final update
                // --------------------------------

                if (
                    sanitizedUpdate.length > 0
                ) {

                    documentClients?.forEach(
                        (client) => {

                            if (
                                client.readyState ===
                                WebSocket.OPEN
                            ) {

                                client.send(
                                    sanitizedUpdate
                                );

                            }

                        }
                    );

                }

            }
        );

        // ========================================
        // Client Disconnected
        // ========================================

        socket.on(
            "close",
            () => {

                console.log(
                    "Client disconnected:",
                    documentId,
                    userId
                );

                // --------------------------------
                // Remove client
                // --------------------------------

                documentClients?.delete(
                    socket
                );

                // ====================================
                // Remove all locks owned by this user
                // ====================================

                const blockLocks =
                    ydoc!.getMap<string>(
                        "blockLocks"
                    );

                const stateBefore =
                    Y.encodeStateVector(
                        ydoc!
                    );

                ydoc!.transact(
                    () => {

                        blockLocks.forEach(
                            (
                                lockedBy,
                                blockId
                            ) => {

                                if (
                                    lockedBy ===
                                    userId
                                ) {

                                    blockLocks.delete(
                                        blockId
                                    );

                                }

                            }
                        );

                    }
                );

                // --------------------------------
                // Create cleanup update
                // --------------------------------

                const lockCleanupUpdate =
                    Y.encodeStateAsUpdate(
                        ydoc!,
                        stateBefore
                    );

                // --------------------------------
                // Broadcast cleanup
                // --------------------------------

                if (
                    lockCleanupUpdate.length > 0
                ) {

                    documentClients?.forEach(
                        (client) => {

                            if (
                                client.readyState ===
                                WebSocket.OPEN
                            ) {

                                client.send(
                                    lockCleanupUpdate
                                );

                            }

                        }
                    );

                }

            }
        );

        // ========================================
        // WebSocket Error
        // ========================================

        socket.on(
            "error",
            (error) => {

                console.error(
                    "WebSocket error:",
                    error
                );

            }
        );

    }
);

// ========================================
// Server Started
// ========================================

console.log(
    "WebSocket server running on port 5001"
);