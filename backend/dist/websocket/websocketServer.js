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
    // --------------------------------
    // Get URL information
    // --------------------------------
    const url = new URL(request.url || "", "http://localhost");
    const documentId = url.pathname.split("/")[2];
    const userId = url.searchParams.get("userId");
    // --------------------------------
    // Validate connection
    // --------------------------------
    if (!documentId ||
        !userId) {
        socket.close();
        return;
    }
    console.log("Client connected:", documentId, userId);
    // ========================================
    // Get or Create Yjs Document
    // ========================================
    const isNewDocument = !documents.has(documentId);
    let ydoc = documents.get(documentId);
    if (!ydoc) {
        ydoc =
            new Y.Doc();
        documents.set(documentId, ydoc);
    }
    // ========================================
    // Send Initial Document State
    // ========================================
    if (isNewDocument) {
        socket.send(JSON.stringify({
            type: "initialize"
        }));
    }
    else {
        const currentState = Y.encodeStateAsUpdate(ydoc);
        if (currentState.length > 0) {
            socket.send(currentState);
        }
    }
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
            // CURSOR POSITION
            // ====================================
            if (controlMessage.type ===
                "cursor") {
                const { blockId, cursorPosition, selectionStart, selectionEnd } = controlMessage;
                // --------------------------------
                // Validate cursor message
                // --------------------------------
                if (!blockId ||
                    typeof cursorPosition !==
                        "number" ||
                    typeof selectionStart !==
                        "number" ||
                    typeof selectionEnd !==
                        "number") {
                    return;
                }
                // --------------------------------
                // Broadcast cursor to other users
                // --------------------------------
                documentClients?.forEach((client) => {
                    // Do not send the cursor
                    // back to its owner
                    if (client === socket) {
                        return;
                    }
                    if (client.readyState ===
                        ws_1.WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: "cursor",
                            userId,
                            blockId,
                            cursorPosition,
                            selectionStart,
                            selectionEnd
                        }));
                    }
                });
                return;
            }
            // ====================================
            // LOCK REQUEST
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
                // Block already locked by another
                // user
                // --------------------------------
                if (currentOwner &&
                    currentOwner !== userId) {
                    socket.send(JSON.stringify({
                        type: "lockResult",
                        blockId,
                        granted: false,
                        lockedBy: currentOwner
                    }));
                    console.log("LOCK DENIED:", blockId, "already owned by", currentOwner);
                    return;
                }
                // --------------------------------
                // User already owns this lock
                // --------------------------------
                if (currentOwner ===
                    userId) {
                    socket.send(JSON.stringify({
                        type: "lockResult",
                        blockId,
                        granted: true,
                        lockedBy: userId
                    }));
                    console.log("LOCK ALREADY OWNED:", blockId, "by", userId);
                    return;
                }
                // --------------------------------
                // Save state before lock
                // --------------------------------
                const stateBefore = Y.encodeStateVector(ydoc);
                // --------------------------------
                // Acquire lock
                // --------------------------------
                ydoc.transact(() => {
                    blockLocks.set(blockId, userId);
                });
                // --------------------------------
                // Create lock update
                // --------------------------------
                const lockUpdate = Y.encodeStateAsUpdate(ydoc, stateBefore);
                // --------------------------------
                // Tell requester lock succeeded
                // --------------------------------
                socket.send(JSON.stringify({
                    type: "lockResult",
                    blockId,
                    granted: true,
                    lockedBy: userId
                }));
                // --------------------------------
                // Broadcast lock update
                // --------------------------------
                if (lockUpdate.length > 0) {
                    documentClients?.forEach((client) => {
                        if (client.readyState ===
                            ws_1.WebSocket.OPEN) {
                            client.send(lockUpdate);
                        }
                    });
                }
                console.log("LOCK ACQUIRED:", blockId, "by", userId);
                return;
            }
            // ====================================
            // UNLOCK REQUEST
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
                    console.log("UNLOCK DENIED:", blockId, "owner:", currentOwner, "requester:", userId);
                    return;
                }
                // --------------------------------
                // Save state before unlock
                // --------------------------------
                const stateBefore = Y.encodeStateVector(ydoc);
                // --------------------------------
                // Release lock
                // --------------------------------
                ydoc.transact(() => {
                    blockLocks.delete(blockId);
                });
                // --------------------------------
                // Create unlock update
                // --------------------------------
                const unlockUpdate = Y.encodeStateAsUpdate(ydoc, stateBefore);
                // --------------------------------
                // Tell requester unlock succeeded
                // --------------------------------
                socket.send(JSON.stringify({
                    type: "unlockResult",
                    blockId,
                    released: true
                }));
                // --------------------------------
                // Broadcast unlock update
                // --------------------------------
                if (unlockUpdate.length > 0) {
                    documentClients?.forEach((client) => {
                        if (client.readyState ===
                            ws_1.WebSocket.OPEN) {
                            client.send(unlockUpdate);
                        }
                    });
                }
                console.log("LOCK RELEASED:", blockId, "by", userId);
                return;
            }
            // --------------------------------
            // Unknown control message
            // --------------------------------
            console.log("Unknown control message:", controlMessage);
            return;
        }
        // ====================================
        // BINARY YJS UPDATE
        // ====================================
        console.log("Yjs update received for document:", documentId);
        const update = new Uint8Array(message);
        // --------------------------------
        // Save state before applying update
        // --------------------------------
        const stateBefore = Y.encodeStateVector(ydoc);
        // --------------------------------
        // Apply incoming Yjs update
        // --------------------------------
        Y.applyUpdate(ydoc, update);
        // ========================================
        // Sanitize Collaborative Block Content
        // ========================================
        const blocks = ydoc.getMap("blocks");
        ydoc.transact(() => {
            blocks.forEach((yText, blockId) => {
                // --------------------------------
                // Make sure this is a Y.Text
                // --------------------------------
                if (!(yText instanceof Y.Text)) {
                    return;
                }
                // --------------------------------
                // Get current block content
                // --------------------------------
                const currentContent = yText.toString();
                // --------------------------------
                // Sanitize block content
                // --------------------------------
                const sanitizedContent = (0, sanitizationService_js_1.sanitizeBlockContent)(currentContent);
                // --------------------------------
                // Replace unsafe content
                // --------------------------------
                if (currentContent !==
                    sanitizedContent) {
                    yText.delete(0, yText.length);
                    yText.insert(0, sanitizedContent);
                    console.log("Sanitized block:", blockId);
                }
            });
        });
        // --------------------------------
        // Create final sanitized update
        // --------------------------------
        const sanitizedUpdate = Y.encodeStateAsUpdate(ydoc, stateBefore);
        // --------------------------------
        // Broadcast final update
        // --------------------------------
        if (sanitizedUpdate.length > 0) {
            documentClients?.forEach((client) => {
                if (client.readyState ===
                    ws_1.WebSocket.OPEN) {
                    client.send(sanitizedUpdate);
                }
            });
        }
    });
    // ========================================
    // Client Disconnected
    // ========================================
    socket.on("close", () => {
        console.log("Client disconnected:", documentId, userId);
        // --------------------------------
        // Remove client
        // --------------------------------
        documentClients?.delete(socket);
        // ====================================
        // Notify remaining users that
        // this user's cursor disappeared
        // ====================================
        documentClients?.forEach((client) => {
            if (client.readyState ===
                ws_1.WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: "cursorRemoved",
                    userId
                }));
            }
        });
        // ====================================
        // Remove all locks owned by this user
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
        const lockCleanupUpdate = Y.encodeStateAsUpdate(ydoc, stateBefore);
        // --------------------------------
        // Broadcast cleanup
        // --------------------------------
        if (lockCleanupUpdate.length > 0) {
            documentClients?.forEach((client) => {
                if (client.readyState ===
                    ws_1.WebSocket.OPEN) {
                    client.send(lockCleanupUpdate);
                }
            });
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