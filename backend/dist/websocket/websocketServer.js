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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_js_1 = __importDefault(require("../models/user.js"));
const Y = __importStar(require("yjs"));
const sanitizationService_js_1 = require("../services/sanitizationService.js");
const Document_js_1 = __importDefault(require("../models/Document.js"));
const crypto_1 = __importDefault(require("crypto"));
// ========================================
// Yjs Documents
// ========================================
const documents = new Map();
// ========================================
// Connected Clients
// ========================================
const clients = new Map();
// ========================================
// Client User IDs
// ========================================
const clientUsers = new Map();
const broadcastCollaborators = async (documentId) => {
    const documentClients = clients.get(documentId);
    if (!documentClients) {
        return;
    }
    const userIds = new Set();
    documentClients.forEach((client) => {
        const connectedUser = clientUsers.get(client);
        if (connectedUser) {
            userIds.add(connectedUser);
        }
    });
    const users = await user_js_1.default.find({
        _id: {
            $in: Array.from(userIds)
        }
    }, {
        name: 1
    }).lean();
    const collaborators = Array.from(userIds).map((userId) => {
        const user = users.find((item) => item._id.toString() ===
            userId);
        return {
            id: userId,
            name: user?.name ||
                "Unknown User"
        };
    });
    const message = JSON.stringify({
        type: "collaborators",
        users: collaborators,
        count: collaborators.length
    });
    documentClients.forEach((client) => {
        if (client.readyState ===
            ws_1.WebSocket.OPEN) {
            client.send(message);
        }
    });
    console.log("COLLABORATORS:", documentId, collaborators);
};
const deleteRequests = new Map();
// ========================================
// MongoDB Auto-Save
// ========================================
const saveTimers = new Map();
const persistDocumentToMongoDB = async (documentId, ydoc) => {
    try {
        const blocks = ydoc.getMap("blocks");
        const blockTypes = ydoc.getMap("blockTypes");
        const blockOrder = ydoc.getArray("blockOrder");
        const orderedIds = blockOrder.toArray();
        const uniqueBlockIds = Array.from(new Set(orderedIds));
        const mongoBlocks = [];
        for (const blockId of uniqueBlockIds) {
            const yText = blocks.get(blockId);
            if (!yText ||
                !(yText instanceof Y.Text)) {
                continue;
            }
            const blockType = blockTypes.get(blockId) ||
                "paragraph";
            const rawContent = yText.toString();
            const content = (0, sanitizationService_js_1.sanitizeBlockContent)(rawContent);
            mongoBlocks.push({
                _id: blockId,
                type: blockType,
                content,
                children: []
            });
        }
        const document = await Document_js_1.default.findByIdAndUpdate(documentId, {
            $set: {
                blocks: mongoBlocks
            }
        }, {
            new: true,
            runValidators: true
        });
        if (!document) {
            console.error("DOCUMENT NOT FOUND:", documentId);
            return;
        }
        console.log("DOCUMENT AUTO-SAVED TO MONGODB:", documentId);
        console.log("MONGODB BLOCK COUNT:", mongoBlocks.length);
    }
    catch (error) {
        console.error("FAILED TO AUTO-SAVE DOCUMENT:", documentId);
        console.error(error);
    }
};
const scheduleDocumentSave = (documentId, ydoc) => {
    const existingTimer = saveTimers.get(documentId);
    if (existingTimer) {
        clearTimeout(existingTimer);
    }
    const timer = setTimeout(async () => {
        saveTimers.delete(documentId);
        await persistDocumentToMongoDB(documentId, ydoc);
    }, 500);
    saveTimers.set(documentId, timer);
};
// ========================================
// Validate Yjs Block Update
// ========================================
const getChangedBlockIds = (currentDoc, incomingUpdate) => {
    // ----------------------------------------
    // Create temporary document
    // ----------------------------------------
    const tempDoc = new Y.Doc();
    // Copy current server state
    const currentState = Y.encodeStateAsUpdate(currentDoc);
    Y.applyUpdate(tempDoc, currentState);
    // ----------------------------------------
    // Apply incoming update to temporary doc
    // ----------------------------------------
    Y.applyUpdate(tempDoc, incomingUpdate);
    // ----------------------------------------
    // Get current and updated blocks
    // ----------------------------------------
    const currentBlocks = currentDoc.getMap("blocks");
    const updatedBlocks = tempDoc.getMap("blocks");
    const changedBlockIds = new Set();
    // ----------------------------------------
    // Check existing blocks
    // ----------------------------------------
    currentBlocks.forEach((currentText, blockId) => {
        const updatedText = updatedBlocks.get(blockId);
        if (!(currentText instanceof Y.Text) ||
            !(updatedText instanceof Y.Text)) {
            return;
        }
        if (currentText.toString() !==
            updatedText.toString()) {
            changedBlockIds.add(blockId);
        }
    });
    // ----------------------------------------
    // Check newly created blocks
    // ----------------------------------------
    updatedBlocks.forEach((updatedText, blockId) => {
        if (!currentBlocks.has(blockId)) {
            changedBlockIds.add(blockId);
        }
    });
    // ----------------------------------------
    // Check deleted blocks
    // ----------------------------------------
    currentBlocks.forEach((_currentText, blockId) => {
        if (!updatedBlocks.has(blockId)) {
            changedBlockIds.add(blockId);
        }
    });
    return Array.from(changedBlockIds);
};
// ========================================
// Broadcast Yjs Update
// ========================================
const broadcastUpdate = (documentClients, update) => {
    if (!documentClients ||
        update.length === 0) {
        return;
    }
    documentClients.forEach((client) => {
        if (client.readyState ===
            ws_1.WebSocket.OPEN) {
            client.send(update);
        }
    });
};
// ========================================
// Delete Block
// ========================================
const deleteBlockFromYjs = (ydoc, blockId) => {
    const stateBefore = Y.encodeStateVector(ydoc);
    const blocks = ydoc.getMap("blocks");
    const blockTypes = ydoc.getMap("blockTypes");
    const blockOrder = ydoc.getArray("blockOrder");
    ydoc.transact(() => {
        // --------------------------------
        // Remove block content
        // --------------------------------
        blocks.delete(blockId);
        // --------------------------------
        // Remove block type
        // --------------------------------
        blockTypes.delete(blockId);
        // --------------------------------
        // Remove block from order
        // --------------------------------
        const order = blockOrder.toArray();
        const index = order.indexOf(blockId);
        if (index !== -1) {
            blockOrder.delete(index, 1);
        }
        // --------------------------------
        // Remove block lock
        // --------------------------------
        const blockLocks = ydoc.getMap("blockLocks");
        blockLocks.delete(blockId);
    });
    return Y.encodeStateAsUpdate(ydoc, stateBefore);
};
// ========================================
// Find Socket By User ID
// ========================================
const findClientByUserId = (documentId, userId) => {
    const documentClients = clients.get(documentId);
    if (!documentClients) {
        return null;
    }
    for (const client of documentClients) {
        const clientUserId = clientUsers.get(client);
        if (clientUserId ===
            userId) {
            return client;
        }
    }
    return null;
};
// ========================================
// Extract JWT From Cookie
// ========================================
const getTokenFromCookie = (cookieHeader) => {
    if (!cookieHeader) {
        return null;
    }
    const cookies = cookieHeader.split(";");
    const tokenCookie = cookies.find((cookie) => cookie.trim().startsWith("token="));
    if (!tokenCookie) {
        return null;
    }
    return decodeURIComponent(tokenCookie.trim().substring("token=".length));
};
// WebSocket Server
// ========================================
const ws = new ws_1.WebSocketServer({
    port: 5001
});
// ========================================
// Client Connection
// ========================================
ws.on("connection", async (socket, request) => {
    // --------------------------------
    // Get URL information
    // --------------------------------
    const url = new URL(request.url || "", "http://localhost");
    const documentId = url.pathname.split("/")[2];
    // --------------------------------
    // Authenticate WebSocket connection
    // --------------------------------
    if (!documentId) {
        console.log("WebSocket rejected: missing document ID");
        socket.close(1008, "Invalid document");
        return;
    }
    const token = getTokenFromCookie(request.headers.cookie);
    if (!token) {
        console.log("WebSocket rejected: JWT cookie missing");
        socket.close(1008, "Authentication required");
        return;
    }
    if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is not configured");
        socket.close(1011, "Server configuration error");
        return;
    }
    let userId;
    try {
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (typeof payload === "string" ||
            !payload.userId) {
            throw new Error("Invalid JWT payload");
        }
        userId = payload.userId;
    }
    catch {
        console.log("WebSocket rejected: invalid JWT");
        socket.close(1008, "Invalid authentication token");
        return;
    }
    // --------------------------------
    // Verify user exists
    // --------------------------------
    const user = await user_js_1.default.findById(userId);
    if (!user) {
        console.log("WebSocket rejected: user not found:", userId);
        socket.close(1008, "User not found");
        return;
    }
    // --------------------------------
    // Verify document access
    // --------------------------------
    // A user can connect if they are:
    // 1. The document owner, OR
    // 2. A collaborator on the document
    //
    // We do NOT trust a userId from the WebSocket URL.
    // userId comes from the verified JWT above.
    let document;
    try {
        document =
            await Document_js_1.default.findOne({
                _id: documentId,
                $or: [
                    {
                        owner: userId
                    },
                    {
                        "collaborators.user": userId
                    }
                ]
            });
    }
    catch {
        console.log("WebSocket rejected: invalid document ID:", documentId);
        socket.close(1008, "Invalid document");
        return;
    }
    if (!document) {
        console.log("WebSocket rejected: document access denied:", documentId, userId);
        socket.close(1008, "Document access denied");
        return;
    }
    // --------------------------------
    // Get user's document permission
    // --------------------------------
    const isOwner = document.owner.toString() === userId;
    const collaborator = document.collaborators.find((item) => item.user.toString() ===
        userId);
    const permission = isOwner
        ? "owner"
        : collaborator?.permission;
    const canEdit = permission === "owner" ||
        permission === "edit";
    console.log("Authorized WebSocket connection:", "document:", documentId, "user:", userId, "permission:", permission);
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
    clientUsers.set(socket, userId);
    broadcastCollaborators(documentId);
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
            // LOCK REQUEST
            // ====================================
            if (controlMessage.type ===
                "lock") {
                if (!canEdit) {
                    socket.send(JSON.stringify({
                        type: "lockResult",
                        blockId: controlMessage.blockId,
                        granted: false,
                        reason: "You have view-only permission"
                    }));
                    return;
                }
                const blockId = controlMessage.blockId;
                if (!blockId) {
                    return;
                }
                const blockLocks = ydoc.getMap("blockLocks");
                const currentOwner = blockLocks.get(blockId);
                if (currentOwner &&
                    currentOwner !==
                        userId) {
                    socket.send(JSON.stringify({
                        type: "lockResult",
                        blockId,
                        granted: false,
                        lockedBy: currentOwner
                    }));
                    console.log("LOCK DENIED:", blockId, "already owned by", currentOwner);
                    return;
                }
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
                const stateBefore = Y.encodeStateVector(ydoc);
                ydoc.transact(() => {
                    blockLocks.set(blockId, userId);
                });
                const lockUpdate = Y.encodeStateAsUpdate(ydoc, stateBefore);
                socket.send(JSON.stringify({
                    type: "lockResult",
                    blockId,
                    granted: true,
                    lockedBy: userId
                }));
                broadcastUpdate(documentClients, lockUpdate);
                console.log("LOCK ACQUIRED:", blockId, "by", userId);
                return;
            }
            // ====================================
            // UNLOCK REQUEST
            // ====================================
            if (controlMessage.type ===
                "unlock") {
                if (!canEdit) {
                    socket.send(JSON.stringify({
                        type: "unlockResult",
                        blockId: controlMessage.blockId,
                        released: false,
                        reason: "You have view-only permission"
                    }));
                    return;
                }
                const blockId = controlMessage.blockId;
                if (!blockId) {
                    return;
                }
                const blockLocks = ydoc.getMap("blockLocks");
                const currentOwner = blockLocks.get(blockId);
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
                const stateBefore = Y.encodeStateVector(ydoc);
                ydoc.transact(() => {
                    blockLocks.delete(blockId);
                });
                const unlockUpdate = Y.encodeStateAsUpdate(ydoc, stateBefore);
                socket.send(JSON.stringify({
                    type: "unlockResult",
                    blockId,
                    released: true
                }));
                broadcastUpdate(documentClients, unlockUpdate);
                console.log("LOCK RELEASED:", blockId, "by", userId);
                return;
            }
            // ====================================
            // REQUEST DELETE
            // ====================================
            if (controlMessage.type ===
                "request-delete") {
                // --------------------------------
                // Check edit permission
                // --------------------------------
                if (!canEdit) {
                    socket.send(JSON.stringify({
                        type: "deleteResult",
                        blockId: controlMessage.blockId,
                        deleted: false,
                        reason: "You have view-only permission"
                    }));
                    return;
                }
                const blockId = controlMessage.blockId;
                if (!blockId) {
                    return;
                }
                // --------------------------------
                // Check block exists
                // --------------------------------
                const blocks = ydoc.getMap("blocks");
                if (!blocks.has(blockId)) {
                    socket.send(JSON.stringify({
                        type: "deleteResult",
                        blockId,
                        deleted: false,
                        reason: "Block does not exist"
                    }));
                    return;
                }
                // ========================================
                // OWNER CAN DELETE IMMEDIATELY
                // ========================================
                if (isOwner) {
                    const deleteUpdate = deleteBlockFromYjs(ydoc, blockId);
                    scheduleDocumentSave(documentId, ydoc);
                    broadcastUpdate(documentClients, deleteUpdate);
                    socket.send(JSON.stringify({
                        type: "deleteResult",
                        blockId,
                        deleted: true
                    }));
                    console.log("BLOCK DELETED BY DOCUMENT OWNER:", blockId, "by", userId);
                    return;
                }
                // ========================================
                // COLLABORATOR DELETE
                // ALWAYS REQUIRES OWNER APPROVAL
                // ========================================
                // --------------------------------
                // Find document owner
                // --------------------------------
                const ownerId = document.owner.toString();
                const ownerSocket = findClientByUserId(documentId, ownerId);
                // --------------------------------
                // Owner must be connected
                // --------------------------------
                if (!ownerSocket) {
                    socket.send(JSON.stringify({
                        type: "deleteResult",
                        blockId,
                        deleted: false,
                        reason: "Document owner is not connected. Delete request cannot be approved."
                    }));
                    return;
                }
                // --------------------------------
                // Prevent duplicate requests
                // --------------------------------
                const existingRequest = Array.from(deleteRequests.values()).find((request) => request.documentId ===
                    documentId &&
                    request.blockId ===
                        blockId);
                if (existingRequest) {
                    socket.send(JSON.stringify({
                        type: "delete-pending",
                        requestId: existingRequest.requestId,
                        blockId,
                        ownerId
                    }));
                    return;
                }
                // --------------------------------
                // Create delete request
                // --------------------------------
                const requestId = crypto_1.default.randomUUID();
                deleteRequests.set(requestId, {
                    requestId,
                    documentId,
                    blockId,
                    requesterId: userId,
                    ownerId,
                    requesterSocket: socket
                });
                // --------------------------------
                // Tell owner
                // --------------------------------
                ownerSocket.send(JSON.stringify({
                    type: "delete-request",
                    requestId,
                    blockId,
                    requesterId: userId
                }));
                // --------------------------------
                // Tell requester
                // --------------------------------
                socket.send(JSON.stringify({
                    type: "delete-pending",
                    requestId,
                    blockId,
                    ownerId
                }));
                console.log("DELETE REQUEST CREATED:", requestId, "block:", blockId, "requester:", userId, "owner:", ownerId);
                return;
            }
            // ====================================
            // APPROVE DELETE
            // ====================================
            if (controlMessage.type ===
                "approve-delete") {
                // --------------------------------
                // Only document owner can approve
                // --------------------------------
                if (!isOwner) {
                    socket.send(JSON.stringify({
                        type: "deleteResult",
                        requestId: controlMessage.requestId,
                        deleted: false,
                        reason: "Only the document owner can approve deletion"
                    }));
                    return;
                }
                const requestId = controlMessage.requestId;
                if (!requestId) {
                    return;
                }
                const deleteRequest = deleteRequests.get(requestId);
                if (!deleteRequest) {
                    socket.send(JSON.stringify({
                        type: "deleteResult",
                        requestId,
                        deleted: false,
                        reason: "Delete request no longer exists"
                    }));
                    return;
                }
                // --------------------------------
                // Verify this owner owns the request
                // --------------------------------
                if (deleteRequest.ownerId !==
                    userId) {
                    socket.send(JSON.stringify({
                        type: "deleteResult",
                        requestId,
                        deleted: false,
                        reason: "Only the document owner can approve"
                    }));
                    return;
                }
                // --------------------------------
                // Check block still exists
                // --------------------------------
                const blocks = ydoc.getMap("blocks");
                if (!blocks.has(deleteRequest.blockId)) {
                    deleteRequests.delete(requestId);
                    socket.send(JSON.stringify({
                        type: "deleteResult",
                        requestId,
                        blockId: deleteRequest.blockId,
                        deleted: false,
                        reason: "Block no longer exists"
                    }));
                    return;
                }
                // --------------------------------
                // Delete block
                // --------------------------------
                const deleteUpdate = deleteBlockFromYjs(ydoc, deleteRequest.blockId);
                deleteRequests.delete(requestId);
                scheduleDocumentSave(documentId, ydoc);
                // --------------------------------
                // Broadcast deletion
                // --------------------------------
                broadcastUpdate(documentClients, deleteUpdate);
                // --------------------------------
                // Tell requester
                // --------------------------------
                if (deleteRequest
                    .requesterSocket
                    .readyState ===
                    ws_1.WebSocket.OPEN) {
                    deleteRequest
                        .requesterSocket
                        .send(JSON.stringify({
                        type: "deleteResult",
                        requestId,
                        blockId: deleteRequest.blockId,
                        deleted: true
                    }));
                }
                // --------------------------------
                // Tell owner
                // --------------------------------
                socket.send(JSON.stringify({
                    type: "deleteResult",
                    requestId,
                    blockId: deleteRequest.blockId,
                    deleted: true
                }));
                console.log("DELETE APPROVED:", requestId, "block:", deleteRequest.blockId, "approved by document owner:", userId);
                return;
            }
            // ====================================
            // REJECT DELETE
            // ====================================
            if (controlMessage.type ===
                "reject-delete") {
                if (!canEdit) {
                    socket.send(JSON.stringify({
                        type: "deleteResult",
                        requestId: controlMessage.requestId,
                        deleted: false,
                        reason: "You have view-only permission"
                    }));
                    return;
                }
                const requestId = controlMessage.requestId;
                if (!requestId) {
                    return;
                }
                const deleteRequest = deleteRequests.get(requestId);
                if (!deleteRequest) {
                    socket.send(JSON.stringify({
                        type: "deleteResult",
                        requestId,
                        deleted: false,
                        reason: "Delete request no longer exists"
                    }));
                    return;
                }
                // --------------------------------
                // Only lock owner can reject
                // --------------------------------
                if (deleteRequest.ownerId !==
                    userId) {
                    socket.send(JSON.stringify({
                        type: "deleteResult",
                        requestId,
                        deleted: false,
                        reason: "Only the block owner can reject"
                    }));
                    return;
                }
                deleteRequests.delete(requestId);
                // --------------------------------
                // Tell requester
                // --------------------------------
                if (deleteRequest
                    .requesterSocket
                    .readyState ===
                    ws_1.WebSocket.OPEN) {
                    deleteRequest
                        .requesterSocket
                        .send(JSON.stringify({
                        type: "deleteResult",
                        requestId,
                        blockId: deleteRequest.blockId,
                        deleted: false,
                        reason: "Delete request rejected"
                    }));
                }
                // --------------------------------
                // Tell owner
                // --------------------------------
                socket.send(JSON.stringify({
                    type: "deleteResult",
                    requestId,
                    blockId: deleteRequest.blockId,
                    deleted: false,
                    reason: "Delete request rejected"
                }));
                console.log("DELETE REJECTED:", requestId, "block:", deleteRequest.blockId, "rejected by:", userId);
                return;
            }
            // ====================================
            // CURSOR POSITION
            // ====================================
            if (controlMessage.type ===
                "cursor") {
                const blockId = controlMessage.blockId;
                if (!blockId) {
                    return;
                }
                const cursorPosition = Number(controlMessage.cursorPosition);
                const selectionStart = Number(controlMessage.selectionStart);
                const selectionEnd = Number(controlMessage.selectionEnd);
                if (!Number.isFinite(cursorPosition) ||
                    !Number.isFinite(selectionStart) ||
                    !Number.isFinite(selectionEnd)) {
                    console.error("Invalid cursor position:", controlMessage);
                    return;
                }
                const cursorMessage = JSON.stringify({
                    type: "cursor",
                    userId,
                    blockId,
                    cursorPosition,
                    selectionStart,
                    selectionEnd
                });
                documentClients?.forEach((client) => {
                    if (client ===
                        socket) {
                        return;
                    }
                    if (client.readyState ===
                        ws_1.WebSocket.OPEN) {
                        client.send(cursorMessage);
                    }
                });
                console.log("CURSOR UPDATE:", userId, blockId, cursorPosition);
                return;
            }
            // ====================================
            // UNKNOWN CONTROL MESSAGE
            // ====================================
            console.log("Unknown control message:", controlMessage);
            return;
        }
        // ========================================
        // BINARY YJS UPDATE
        // ========================================
        console.log("Yjs update received for document:", documentId);
        const update = new Uint8Array(message);
        try {
            // ========================================
            // Find which blocks were changed
            // ========================================
            const changedBlockIds = getChangedBlockIds(ydoc, update);
            console.log("Changed blocks:", changedBlockIds);
            // ========================================
            // Get current block locks
            // ========================================
            const blockLocks = ydoc.getMap("blockLocks");
            // ========================================
            // Create temporary document
            // ========================================
            const tempDoc = new Y.Doc();
            const currentState = Y.encodeStateAsUpdate(ydoc);
            Y.applyUpdate(tempDoc, currentState);
            // Apply client's update ONLY
            // to the temporary document
            Y.applyUpdate(tempDoc, update);
            // ========================================
            // SECURITY CHECK
            // Client cannot modify blockLocks
            // directly.
            // ========================================
            const tempBlockLocks = tempDoc.getMap("blockLocks");
            let lockMapChanged = false;
            // Check existing locks
            blockLocks.forEach((owner, blockId) => {
                if (tempBlockLocks.get(blockId) !==
                    owner) {
                    lockMapChanged = true;
                }
            });
            // Check newly added locks
            tempBlockLocks.forEach((owner, blockId) => {
                if (blockLocks.get(blockId) !==
                    owner) {
                    lockMapChanged = true;
                }
            });
            if (lockMapChanged) {
                console.log("YJS UPDATE REJECTED:", "Client attempted to modify blockLocks");
                socket.send(JSON.stringify({
                    type: "updateRejected",
                    reason: "Block locks can only be changed through lock/unlock requests"
                }));
                return;
            }
            // ========================================
            // PERMISSION CHECK
            // ========================================
            if (!canEdit) {
                console.log("YJS UPDATE REJECTED:", "View-only user attempted to edit", "User:", userId, "Document:", documentId);
                const viewOnlyBlocks = ydoc.getMap("blocks");
                changedBlockIds.forEach((blockId) => {
                    const authoritativeBlock = viewOnlyBlocks.get(blockId);
                    socket.send(JSON.stringify({
                        type: "updateRejected",
                        blockId,
                        reason: "You have view-only permission and cannot edit this document",
                        content: authoritativeBlock instanceof Y.Text
                            ? authoritativeBlock.toString()
                            : ""
                    }));
                });
                if (changedBlockIds.length ===
                    0) {
                    socket.send(JSON.stringify({
                        type: "updateRejected",
                        reason: "You have view-only permission and cannot edit this document"
                    }));
                }
                return;
            }
            // ========================================
            // SERVER-AUTHORITATIVE LOCK CHECK
            // ========================================
            for (const blockId of changedBlockIds) {
                const lockOwner = blockLocks.get(blockId);
                // ------------------------------------
                // Block is locked by another user
                // ------------------------------------
                if (lockOwner &&
                    lockOwner !== userId) {
                    console.log("YJS UPDATE REJECTED:", "Block:", blockId, "Locked by:", lockOwner, "Requester:", userId);
                    const authoritativeBlock = ydoc
                        .getMap("blocks")
                        .get(blockId);
                    socket.send(JSON.stringify({
                        type: "updateRejected",
                        blockId,
                        reason: "Block is locked by another user",
                        lockedBy: lockOwner,
                        content: authoritativeBlock instanceof Y.Text
                            ? authoritativeBlock.toString()
                            : ""
                    }));
                    return;
                }
            }
            // ========================================
            // UPDATE AUTHORIZED
            // ========================================
            const stateBefore = Y.encodeStateVector(ydoc);
            // ========================================
            // Apply update to real Yjs document
            // ========================================
            Y.applyUpdate(ydoc, update);
            // ========================================
            // Sanitize Collaborative Block Content
            // ========================================
            const blocks = ydoc.getMap("blocks");
            ydoc.transact(() => {
                blocks.forEach((yText, blockId) => {
                    if (!(yText instanceof Y.Text)) {
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
            // ========================================
            // Generate final update
            // ========================================
            const sanitizedUpdate = Y.encodeStateAsUpdate(ydoc, stateBefore);
            // ========================================
            // Save document
            // ========================================
            scheduleDocumentSave(documentId, ydoc);
            // ========================================
            // Broadcast authorized update
            // ========================================
            broadcastUpdate(documentClients, sanitizedUpdate);
            console.log("Yjs update accepted:", documentId, "by", userId);
        }
        catch (error) {
            console.error("Failed to process Yjs update:", error);
            socket.send(JSON.stringify({
                type: "updateRejected",
                reason: "Invalid Yjs update"
            }));
        }
    });
    // ========================================
    // Client Disconnected
    // ========================================
    socket.on("close", () => {
        console.log("Client disconnected:", documentId, userId);
        // --------------------------------
        // Remove pending delete requests
        // --------------------------------
        deleteRequests.forEach((deleteRequest, requestId) => {
            if (deleteRequest
                .requesterSocket ===
                socket ||
                deleteRequest
                    .ownerId ===
                    userId) {
                deleteRequests.delete(requestId);
                if (deleteRequest
                    .requesterSocket !==
                    socket &&
                    deleteRequest
                        .requesterSocket
                        .readyState ===
                        ws_1.WebSocket.OPEN) {
                    deleteRequest
                        .requesterSocket
                        .send(JSON.stringify({
                        type: "deleteResult",
                        requestId,
                        blockId: deleteRequest.blockId,
                        deleted: false,
                        reason: "Delete request cancelled because a user disconnected"
                    }));
                }
            }
        });
        // --------------------------------
        // Remove client
        // --------------------------------
        documentClients?.delete(socket);
        clientUsers.delete(socket);
        broadcastCollaborators(documentId);
        // ====================================
        // Remove remote cursor
        // ====================================
        const cursorRemovedMessage = JSON.stringify({
            type: "cursorRemoved",
            userId
        });
        documentClients?.forEach((client) => {
            if (client.readyState ===
                ws_1.WebSocket.OPEN) {
                client.send(cursorRemovedMessage);
            }
        });
        // ====================================
        // Remove all locks owned by this user
        // ====================================
        const blockLocks = ydoc.getMap("blockLocks");
        const stateBefore = Y.encodeStateAsUpdate(ydoc);
        ydoc.transact(() => {
            blockLocks.forEach((lockedBy, blockId) => {
                if (lockedBy ===
                    userId) {
                    blockLocks.delete(blockId);
                }
            });
        });
        const lockCleanupUpdate = Y.encodeStateAsUpdate(ydoc, stateBefore);
        broadcastUpdate(documentClients, lockCleanupUpdate);
        // ====================================
        // Remove empty client collection
        // ====================================
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