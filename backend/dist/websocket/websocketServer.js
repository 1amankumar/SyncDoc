"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const Y = __importStar(require("yjs"));
const sanitizationService_js_1 = require("../services/sanitizationService.js");
// ========================================
// Yjs Documents
// ========================================
const documents = new Map();
// ========================================
// Connected Clients
// ========================================
const clients = new Map();
// ========================================
// WebSocket Server
// ========================================
const ws = new ws_1.WebSocketServer({
    port: 5001
});
// ========================================
// Client Connection
// ========================================
ws.on("connection", (socket, request) => {
    // ========================================
    // Get URL Information
    // ========================================
    const url = new URL(request.url || "", "http://localhost");
    const documentId = url.pathname.split("/")[2];
    const userId = url.searchParams.get("userId");
    // ========================================
    // Validate Connection
    // ========================================
    if (!documentId ||
        !userId) {
        socket.close();
        return;
    }
    console.log("Client connected:", documentId, userId);
    // ========================================
    // Get Or Create Yjs Document
    // ========================================
    let ydoc = documents.get(documentId);
    if (!ydoc) {
        ydoc =
            new Y.Doc();
        documents.set(documentId, ydoc);
    }
    // ========================================
    // Send Existing Yjs State
    // ========================================
    const currentState = Y.encodeStateAsUpdate(ydoc);
    if (currentState.length > 0) {
        socket.send(currentState);
    }
    // ========================================
    // Always Request MongoDB Initialization
    // ========================================
    //
    // This is important.
    //
    // MongoDB may contain blocks while
    // the in-memory Yjs document is empty.
    //
    // The client will restore only blocks
    // that are missing from Yjs.
    //
    socket.send(JSON.stringify({
        type: "initialize"
    }));
    // ========================================
    // Add Client
    // ========================================
    let documentClients = clients.get(documentId);
    if (!documentClients) {
        documentClients =
            new Set();
        clients.set(documentId, documentClients);
    }
    documentClients.add(socket);
    // ========================================
    // Receive Messages
    // ========================================
    socket.on("message", (message, isBinary) => {
        // ====================================
        // TEXT CONTROL MESSAGE
        // ====================================
        if (!isBinary) {
            let controlMessage;
            try {
                controlMessage =
                    JSON.parse(message.toString());
            }
            catch {
                console.error("Invalid control message");
                return;
            }
            // ====================================
            // LOCK
            // ====================================
            if (controlMessage.type ===
                "lock") {
                const blockId = controlMessage.blockId;
                if (!blockId) {
                    return;
                }
                const blockLocks = ydoc.getMap("blockLocks");
                const currentOwner = blockLocks.get(blockId);
                // --------------------------------
                // Already locked by another user
                // --------------------------------
                if (currentOwner &&
                    currentOwner !== userId) {
                    socket.send(JSON.stringify({
                        type: "lockResult",
                        blockId,
                        granted: false,
                        lockedBy: currentOwner
                    }));
                    console.log("LOCK DENIED:", blockId, "owned by:", currentOwner);
                    return;
                }
                // --------------------------------
                // Already owned by this user
                // --------------------------------
                if (currentOwner ===
                    userId) {
                    socket.send(JSON.stringify({
                        type: "lockResult",
                        blockId,
                        granted: true,
                        lockedBy: userId
                    }));
                    return;
                }
                // --------------------------------
                // State before lock
                // --------------------------------
                const stateBefore = Y.encodeStateVector(ydoc);
                // --------------------------------
                // Acquire lock
                // --------------------------------
                ydoc.transact(() => {
                    blockLocks.set(blockId, userId);
                });
                // --------------------------------
                // Create update
                // --------------------------------
                const lockUpdate = Y.encodeStateAsUpdate(ydoc, stateBefore);
                // --------------------------------
                // Tell requester
                // --------------------------------
                socket.send(JSON.stringify({
                    type: "lockResult",
                    blockId,
                    granted: true,
                    lockedBy: userId
                }));
                // --------------------------------
                // Broadcast lock
                // --------------------------------
                if (lockUpdate.length > 0) {
                    documentClients?.forEach((client) => {
                        if (client.readyState ===
                            ws_1.WebSocket.OPEN) {
                            client.send(lockUpdate);
                        }
                    });
                }
                console.log("LOCK ACQUIRED:", blockId, "by:", userId);
                return;
            }
            // ====================================
            // UNLOCK
            // ====================================
            if (controlMessage.type ===
                "unlock") {
                const blockId = controlMessage.blockId;
                if (!blockId) {
                    return;
                }
                const blockLocks = ydoc.getMap("blockLocks");
                const currentOwner = blockLocks.get(blockId);
                // --------------------------------
                // Only owner can unlock
                // --------------------------------
                if (currentOwner !==
                    userId) {
                    socket.send(JSON.stringify({
                        type: "unlockResult",
                        blockId,
                        released: false
                    }));
                    console.log("UNLOCK DENIED:", blockId);
                    return;
                }
                // --------------------------------
                // State before unlock
                // --------------------------------
                const stateBefore = Y.encodeStateVector(ydoc);
                // --------------------------------
                // Release lock
                // --------------------------------
                ydoc.transact(() => {
                    blockLocks.delete(blockId);
                });
                // --------------------------------
                // Create update
                // --------------------------------
                const unlockUpdate = Y.encodeStateAsUpdate(ydoc, stateBefore);
                // --------------------------------
                // Tell requester
                // --------------------------------
                socket.send(JSON.stringify({
                    type: "unlockResult",
                    blockId,
                    released: true
                }));
                // --------------------------------
                // Broadcast unlock
                // --------------------------------
                if (unlockUpdate.length > 0) {
                    documentClients?.forEach((client) => {
                        if (client.readyState ===
                            ws_1.WebSocket.OPEN) {
                            client.send(unlockUpdate);
                        }
                    });
                }
                console.log("LOCK RELEASED:", blockId, "by:", userId);
                return;
            }
            // ====================================
            // REMOTE CURSOR
            // ====================================
            if (controlMessage.type ===
                "cursor") {
                const cursorMessage = {
                    type: "cursor",
                    userId,
                    blockId: controlMessage.blockId,
                    cursorPosition: Number(controlMessage.cursorPosition ??
                        0),
                    selectionStart: Number(controlMessage.selectionStart ??
                        0),
                    selectionEnd: Number(controlMessage.selectionEnd ??
                        0)
                };
                documentClients?.forEach((client) => {
                    if (client !==
                        socket &&
                        client.readyState ===
                            ws_1.WebSocket.OPEN) {
                        client.send(JSON.stringify(cursorMessage));
                    }
                });
                return;
            }
            // ====================================
            // Unknown Control Message
            // ====================================
            console.log("Unknown control message:", controlMessage);
            return;
        }
        // ====================================
        // BINARY YJS UPDATE
        // ====================================
        console.log("Yjs update received for document:", documentId);
        try {
            const update = new Uint8Array(message);
            // --------------------------------
            // State before update
            // --------------------------------
            const stateBefore = Y.encodeStateVector(ydoc);
            // --------------------------------
            // Apply update
            // --------------------------------
            Y.applyUpdate(ydoc, update);
            // ========================================
            // Sanitize Block Content
            // ========================================
            const sharedBlocks = ydoc.getMap("blocks");
            ydoc.transact(() => {
                sharedBlocks.forEach((yText, blockId) => {
                    if (!(yText instanceof
                        Y.Text)) {
                        return;
                    }
                    const currentContent = yText.toString();
                    const sanitizedContent = (0, sanitizationService_js_1.sanitizeBlockContent)(currentContent);
                    if (currentContent !==
                        sanitizedContent) {
                        yText.delete(0, yText.length);
                        yText.insert(0, sanitizedContent);
                        console.log("Sanitized block:", blockId);
                    }
                });
            });
            // --------------------------------
            // Create final update
            // --------------------------------
            const finalUpdate = Y.encodeStateAsUpdate(ydoc, stateBefore);
            // --------------------------------
            // Broadcast update
            // --------------------------------
            if (finalUpdate.length > 0) {
                documentClients?.forEach((client) => {
                    if (client.readyState ===
                        ws_1.WebSocket.OPEN) {
                        client.send(finalUpdate);
                    }
                });
            }
        }
        catch (error) {
            console.error("Failed to process Yjs update:", error);
        }
    });
    // ========================================
    // Client Disconnect
    // ========================================
    socket.on("close", () => {
        console.log("Client disconnected:", documentId, userId);
        // --------------------------------
        // Remove client
        // --------------------------------
        documentClients?.delete(socket);
        // ====================================
        // Remove User Locks
        // ====================================
        const blockLocks = ydoc.getMap("blockLocks");
        const stateBefore = Y.encodeStateVector(ydoc);
        ydoc.transact(() => {
            blockLocks.forEach((lockedBy, blockId) => {
                if (lockedBy ===
                    userId) {
                    blockLocks.delete(blockId);
                }
            });
        });
        // --------------------------------
        // Create cleanup update
        // --------------------------------
        const cleanupUpdate = Y.encodeStateAsUpdate(ydoc, stateBefore);
        // --------------------------------
        // Broadcast cleanup
        // --------------------------------
        if (cleanupUpdate.length > 0) {
            documentClients?.forEach((client) => {
                if (client.readyState ===
                    ws_1.WebSocket.OPEN) {
                    client.send(cleanupUpdate);
                }
            });
        }
        // --------------------------------
        // Remove empty client collection
        // --------------------------------
        if (documentClients &&
            documentClients.size === 0) {
            clients.delete(documentId);
        }
    });
    // ========================================
    // WebSocket Error
    // ========================================
    socket.on("error", (error) => {
        console.error("WebSocket error:", error);
    });
});
// ========================================
// Server Started
// ========================================
console.log("WebSocket server running on port 5001");
//# sourceMappingURL=websocketServer.js.map