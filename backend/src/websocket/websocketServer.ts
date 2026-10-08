import {
    WebSocketServer,
    WebSocket
} from "ws";

import jwt from "jsonwebtoken";

import UserModel from "../models/user.js";

import * as Y from "yjs";

import {
    sanitizeBlockContent
} from "../services/sanitizationService.js";

import DocumentModel, {
    IBlock
} from "../models/Document.js";

// ========================================
// Yjs Documents
// ========================================

const documents =
    new Map<string, Y.Doc>();

// ========================================
// Connected Clients
// ========================================

const clients =
    new Map<
        string,
        Set<WebSocket>
    >();


// ========================================
// Client User IDs
// ========================================

const clientUsers =
    new Map<
        WebSocket,
        string
    >();

const broadcastCollaborators = async (
    documentId: string
): Promise<void> => {
    const documentClients =
        clients.get(documentId);

    if (!documentClients) {
        return;
    }

    const userIds = new Set<string>();

    documentClients.forEach((client) => {
        const connectedUser =
            clientUsers.get(client);

        if (connectedUser) {
            userIds.add(connectedUser);
        }
    });

    const users =
        await UserModel.find(
            {
                _id: {
                    $in:
                        Array.from(
                            userIds
                        )
                }
            },
            {
                name: 1
            }
        ).lean();

    const collaborators = Array.from(
        userIds
    ).map((userId) => {
        const user =
            users.find(
                (item) =>
                    item._id.toString() ===
                    userId
            );

        return {
            id: userId,
            name:
                user?.name ||
                "Unknown User"
        };
    });

    const message =
        JSON.stringify({
            type: "collaborators",
            users: collaborators,
            count:
                collaborators.length
        });

    documentClients.forEach(
        (client) => {
            if (
                client.readyState ===
                WebSocket.OPEN
            ) {
                client.send(message);
            }
        }
    );

    console.log(
        "COLLABORATORS:",
        documentId,
        collaborators
    );
};

// ========================================
// Delete Requests
// ========================================

interface DeleteRequest {
    requestId: string;
    documentId: string;
    blockId: string;
    requesterId: string;
    ownerId: string;
    requesterSocket: WebSocket;
}

const deleteRequests =
    new Map<
        string,
        DeleteRequest
    >();

// ========================================
// MongoDB Auto-Save
// ========================================

const saveTimers =
    new Map<
        string,
        NodeJS.Timeout
    >();

const persistDocumentToMongoDB =
    async (
        documentId: string,
        ydoc: Y.Doc
    ): Promise<void> => {

        try {

            const blocks =
                ydoc.getMap<Y.Text>(
                    "blocks"
                );

            const blockTypes =
                ydoc.getMap<string>(
                    "blockTypes"
                );

            const blockOrder =
                ydoc.getArray<string>(
                    "blockOrder"
                );

            const orderedIds =
                blockOrder.toArray();

            const uniqueBlockIds =
                Array.from(
                    new Set(
                        orderedIds
                    )
                );

            const mongoBlocks:
                IBlock[] = [];

            for (
                const blockId
                of uniqueBlockIds
            ) {

                const yText =
                    blocks.get(
                        blockId
                    );

                if (
                    !yText ||
                    !(yText instanceof Y.Text)
                ) {
                    continue;
                }

                const blockType =
                    blockTypes.get(
                        blockId
                    ) ||
                    "paragraph";

                const rawContent =
                    yText.toString();

                const content =
                    sanitizeBlockContent(
                        rawContent
                    );

                mongoBlocks.push({
                    _id: blockId,
                    type: blockType,
                    content,
                    children: []
                });
            }

            const document =
                await DocumentModel.findByIdAndUpdate(
                    documentId,
                    {
                        $set: {
                            blocks:
                                mongoBlocks
                        }
                    },
                    {
                        new: true,
                        runValidators: true
                    }
                );

            if (!document) {

                console.error(
                    "DOCUMENT NOT FOUND:",
                    documentId
                );

                return;
            }

            console.log(
                "DOCUMENT AUTO-SAVED TO MONGODB:",
                documentId
            );

            console.log(
                "MONGODB BLOCK COUNT:",
                mongoBlocks.length
            );

        } catch (error) {

            console.error(
                "FAILED TO AUTO-SAVE DOCUMENT:",
                documentId
            );

            console.error(error);
        }
    };

const scheduleDocumentSave =
    (
        documentId: string,
        ydoc: Y.Doc
    ): void => {

        const existingTimer =
            saveTimers.get(
                documentId
            );

        if (existingTimer) {

            clearTimeout(
                existingTimer
            );
        }

        const timer =
            setTimeout(
                async () => {

                    saveTimers.delete(
                        documentId
                    );

                    await persistDocumentToMongoDB(
                        documentId,
                        ydoc
                    );

                },
                500
            );

        saveTimers.set(
            documentId,
            timer
        );
    };
// ========================================
// Validate Yjs Block Update
// ========================================

const getChangedBlockIds = (
    currentDoc: Y.Doc,
    incomingUpdate: Uint8Array
): string[] => {

    // ----------------------------------------
    // Create temporary document
    // ----------------------------------------

    const tempDoc = new Y.Doc();

    // Copy current server state
    const currentState = Y.encodeStateAsUpdate(
        currentDoc
    );

    Y.applyUpdate(
        tempDoc,
        currentState
    );

    // ----------------------------------------
    // Apply incoming update to temporary doc
    // ----------------------------------------

    Y.applyUpdate(
        tempDoc,
        incomingUpdate
    );

    // ----------------------------------------
    // Get current and updated blocks
    // ----------------------------------------

    const currentBlocks =
        currentDoc.getMap<Y.Text>("blocks");

    const updatedBlocks =
        tempDoc.getMap<Y.Text>("blocks");

    const changedBlockIds = new Set<string>();

    // ----------------------------------------
    // Check existing blocks
    // ----------------------------------------

    currentBlocks.forEach(
        (currentText, blockId) => {

            const updatedText =
                updatedBlocks.get(blockId);

            if (
                !(currentText instanceof Y.Text) ||
                !(updatedText instanceof Y.Text)
            ) {
                return;
            }

            if (
                currentText.toString() !==
                updatedText.toString()
            ) {
                changedBlockIds.add(blockId);
            }
        }
    );

    // ----------------------------------------
    // Check newly created blocks
    // ----------------------------------------

    updatedBlocks.forEach(
        (updatedText, blockId) => {

            if (
                !currentBlocks.has(blockId)
            ) {
                changedBlockIds.add(blockId);
            }
        }
    );

    // ----------------------------------------
    // Check deleted blocks
    // ----------------------------------------

    currentBlocks.forEach(
        (_currentText, blockId) => {

            if (
                !updatedBlocks.has(blockId)
            ) {
                changedBlockIds.add(blockId);
            }
        }
    );

    return Array.from(
        changedBlockIds
    );
};

// ========================================
// Broadcast Yjs Update
// ========================================

const broadcastUpdate =
    (
        documentClients:
            Set<WebSocket> | undefined,
        update: Uint8Array
    ): void => {

        if (
            !documentClients ||
            update.length === 0
        ) {
            return;
        }

        documentClients.forEach(
            (
                client
            ) => {

                if (
                    client.readyState ===
                    WebSocket.OPEN
                ) {

                    client.send(
                        update
                    );
                }
            }
        );
    };

// ========================================
// Delete Block
// ========================================

const deleteBlockFromYjs =
    (
        ydoc: Y.Doc,
        blockId: string
    ): Uint8Array => {

        const stateBefore =
            Y.encodeStateVector(
                ydoc
            );

        const blocks =
            ydoc.getMap<Y.Text>(
                "blocks"
            );

        const blockTypes =
            ydoc.getMap<string>(
                "blockTypes"
            );

        const blockOrder =
            ydoc.getArray<string>(
                "blockOrder"
            );

        ydoc.transact(
            () => {

                // --------------------------------
                // Remove block content
                // --------------------------------

                blocks.delete(
                    blockId
                );

                // --------------------------------
                // Remove block type
                // --------------------------------

                blockTypes.delete(
                    blockId
                );

                // --------------------------------
                // Remove block from order
                // --------------------------------

                const order =
                    blockOrder.toArray();

                const index =
                    order.indexOf(
                        blockId
                    );

                if (
                    index !== -1
                ) {

                    blockOrder.delete(
                        index,
                        1
                    );
                }

                // --------------------------------
                // Remove block lock
                // --------------------------------

                const blockLocks =
                    ydoc.getMap<string>(
                        "blockLocks"
                    );

                blockLocks.delete(
                    blockId
                );
            }
        );

        return Y.encodeStateAsUpdate(
            ydoc,
            stateBefore
        );
    };

// ========================================
// Find Socket By User ID
// ========================================

const findClientByUserId =
    (
        documentId: string,
        userId: string
    ): WebSocket | null => {

        const documentClients =
            clients.get(
                documentId
            );

        if (!documentClients) {
            return null;
        }

        for (
            const client
            of documentClients
        ) {

            const clientUserId =
                clientUsers.get(
                    client
                );

            if (
                clientUserId ===
                userId
            ) {

                return client;
            }
        }

        return null;
    };

// ========================================
// JWT Payload
// ========================================

interface JwtPayload {
    userId: string;
}

// ========================================
// Extract JWT From Cookie
// ========================================

const getTokenFromCookie = (
    cookieHeader: string | undefined
): string | null => {

    if (!cookieHeader) {
        return null;
    }

    const cookies = cookieHeader.split(";");

    const tokenCookie = cookies.find(
        (cookie) => cookie.trim().startsWith("token=")
    );

    if (!tokenCookie) {
        return null;
    }

    return decodeURIComponent(
        tokenCookie.trim().substring("token=".length)
    );
};

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
    async (
        socket,
        request
    ) => {

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

        // --------------------------------
        // Authenticate WebSocket connection
        // --------------------------------

        if (!documentId) {
            console.log(
                "WebSocket rejected: missing document ID"
            );
            socket.close(1008, "Invalid document");
            return;
        }

        const token =
            getTokenFromCookie(
                request.headers.cookie
            );

        if (!token) {
            console.log(
                "WebSocket rejected: JWT cookie missing"
            );
            socket.close(1008, "Authentication required");
            return;
        }

        if (!process.env.JWT_SECRET) {
            console.error(
                "JWT_SECRET is not configured"
            );
            socket.close(1011, "Server configuration error");
            return;
        }

        let userId: string;

        try {
            const payload = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            if (
                typeof payload === "string" ||
                !payload.userId
            ) {
                throw new Error("Invalid JWT payload");
            }

            userId = (payload as JwtPayload).userId;

        } catch {
            console.log(
                "WebSocket rejected: invalid JWT"
            );
            socket.close(1008, "Invalid authentication token");
            return;
        }

        // --------------------------------
        // Verify user exists
        // --------------------------------

        const user =
            await UserModel.findById(userId);

        if (!user) {
            console.log(
                "WebSocket rejected: user not found:",
                userId
            );
            socket.close(1008, "User not found");
            return;
        }

        // --------------------------------
        // Verify document ownership
        // --------------------------------

        let document;

        try {
            document =
                await DocumentModel.findOne({
                    _id: documentId,
                    owner: userId
                });
        } catch {
            console.log(
                "WebSocket rejected: invalid document ID:",
                documentId
            );
            socket.close(1008, "Invalid document");
            return;
        }

        if (!document) {
            console.log(
                "WebSocket rejected: document access denied:",
                documentId,
                userId
            );
            socket.close(1008, "Document access denied");
            return;
        }

        console.log(
            "Authorized WebSocket connection:",
            "document:",
            documentId,
            "user:",
            userId
        );

        // ========================================
        // Get or Create Yjs Document
        // ========================================

        const isNewDocument =
            !documents.has(
                documentId
            );

        let ydoc =
            documents.get(
                documentId
            );

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
                    type:
                        "initialize"
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
            clients.get(
                documentId
            );

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

        clientUsers.set(
            socket,
            userId
        );
        broadcastCollaborators(
            documentId
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
                        requestId?: string;
                        cursorPosition?: number;
                        selectionStart?: number;
                        selectionEnd?: number;
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

                        if (
                            currentOwner &&
                            currentOwner !==
                            userId
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

                        const stateBefore =
                            Y.encodeStateVector(
                                ydoc!
                            );

                        ydoc!.transact(
                            () => {

                                blockLocks.set(
                                    blockId,
                                    userId
                                );
                            }
                        );

                        const lockUpdate =
                            Y.encodeStateAsUpdate(
                                ydoc!,
                                stateBefore
                            );

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

                        broadcastUpdate(
                            documentClients,
                            lockUpdate
                        );

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

                        const stateBefore =
                            Y.encodeStateVector(
                                ydoc!
                            );

                        ydoc!.transact(
                            () => {

                                blockLocks.delete(
                                    blockId
                                );
                            }
                        );

                        const unlockUpdate =
                            Y.encodeStateAsUpdate(
                                ydoc!,
                                stateBefore
                            );

                        socket.send(
                            JSON.stringify({
                                type:
                                    "unlockResult",
                                blockId,
                                released:
                                    true
                            })
                        );

                        broadcastUpdate(
                            documentClients,
                            unlockUpdate
                        );

                        console.log(
                            "LOCK RELEASED:",
                            blockId,
                            "by",
                            userId
                        );

                        return;
                    }

                    // ====================================
                    // REQUEST DELETE
                    // ====================================

                    if (
                        controlMessage.type ===
                        "request-delete"
                    ) {

                        const blockId =
                            controlMessage.blockId;

                        if (!blockId) {
                            return;
                        }

                        const blocks =
                            ydoc!.getMap<Y.Text>(
                                "blocks"
                            );

                        if (
                            !blocks.has(
                                blockId
                            )
                        ) {

                            socket.send(
                                JSON.stringify({
                                    type:
                                        "deleteResult",
                                    blockId,
                                    deleted:
                                        false,
                                    reason:
                                        "Block does not exist"
                                })
                            );

                            return;
                        }

                        const blockLocks =
                            ydoc!.getMap<string>(
                                "blockLocks"
                            );

                        const lockOwner =
                            blockLocks.get(
                                blockId
                            );

                        // --------------------------------
                        // No lock
                        // --------------------------------

                        if (!lockOwner) {

                            const deleteUpdate =
                                deleteBlockFromYjs(
                                    ydoc!,
                                    blockId
                                );

                            scheduleDocumentSave(
                                documentId,
                                ydoc!
                            );

                            broadcastUpdate(
                                documentClients,
                                deleteUpdate
                            );

                            socket.send(
                                JSON.stringify({
                                    type:
                                        "deleteResult",
                                    blockId,
                                    deleted:
                                        true
                                })
                            );

                            console.log(
                                "BLOCK DELETED:",
                                blockId,
                                "by",
                                userId
                            );

                            return;
                        }

                        // --------------------------------
                        // Current user owns lock
                        // --------------------------------

                        if (
                            lockOwner ===
                            userId
                        ) {

                            const deleteUpdate =
                                deleteBlockFromYjs(
                                    ydoc!,
                                    blockId
                                );

                            scheduleDocumentSave(
                                documentId,
                                ydoc!
                            );

                            broadcastUpdate(
                                documentClients,
                                deleteUpdate
                            );

                            socket.send(
                                JSON.stringify({
                                    type:
                                        "deleteResult",
                                    blockId,
                                    deleted:
                                        true
                                })
                            );

                            console.log(
                                "BLOCK DELETED BY LOCK OWNER:",
                                blockId,
                                "by",
                                userId
                            );

                            return;
                        }

                        // --------------------------------
                        // Block belongs to another user
                        // --------------------------------

                        const ownerSocket =
                            findClientByUserId(
                                documentId,
                                lockOwner
                            );

                        if (!ownerSocket) {

                            socket.send(
                                JSON.stringify({
                                    type:
                                        "deleteResult",
                                    blockId,
                                    deleted:
                                        false,
                                    reason:
                                        "Block owner is not connected"
                                })
                            );

                            return;
                        }

                        // --------------------------------
                        // Create delete request
                        // --------------------------------

                        const requestId =
                            crypto.randomUUID();

                        deleteRequests.set(
                            requestId,
                            {
                                requestId,
                                documentId,
                                blockId,
                                requesterId:
                                    userId,
                                ownerId:
                                    lockOwner,
                                requesterSocket:
                                    socket
                            }
                        );

                        // --------------------------------
                        // Tell block owner
                        // --------------------------------

                        ownerSocket.send(
                            JSON.stringify({
                                type:
                                    "delete-request",
                                requestId,
                                blockId,
                                requesterId:
                                    userId
                            })
                        );

                        // --------------------------------
                        // Tell requester
                        // --------------------------------

                        socket.send(
                            JSON.stringify({
                                type:
                                    "delete-pending",
                                requestId,
                                blockId,
                                ownerId:
                                    lockOwner
                            })
                        );

                        console.log(
                            "DELETE REQUEST CREATED:",
                            requestId,
                            "block:",
                            blockId,
                            "requester:",
                            userId,
                            "owner:",
                            lockOwner
                        );

                        return;
                    }

                    // ====================================
                    // APPROVE DELETE
                    // ====================================

                    if (
                        controlMessage.type ===
                        "approve-delete"
                    ) {

                        const requestId =
                            controlMessage.requestId;

                        if (!requestId) {
                            return;
                        }

                        const deleteRequest =
                            deleteRequests.get(
                                requestId
                            );

                        if (!deleteRequest) {

                            socket.send(
                                JSON.stringify({
                                    type:
                                        "deleteResult",
                                    requestId,
                                    deleted:
                                        false,
                                    reason:
                                        "Delete request no longer exists"
                                })
                            );

                            return;
                        }

                        // --------------------------------
                        // Only lock owner can approve
                        // --------------------------------

                        if (
                            deleteRequest.ownerId !==
                            userId
                        ) {

                            socket.send(
                                JSON.stringify({
                                    type:
                                        "deleteResult",
                                    requestId,
                                    deleted:
                                        false,
                                    reason:
                                        "Only the block owner can approve"
                                })
                            );

                            return;
                        }

                        const blockLocks =
                            ydoc!.getMap<string>(
                                "blockLocks"
                            );

                        const currentOwner =
                            blockLocks.get(
                                deleteRequest.blockId
                            );

                        // --------------------------------
                        // Verify lock is still owned
                        // --------------------------------

                        if (
                            currentOwner !==
                            userId
                        ) {

                            deleteRequests.delete(
                                requestId
                            );

                            socket.send(
                                JSON.stringify({
                                    type:
                                        "deleteResult",
                                    requestId,
                                    blockId:
                                        deleteRequest.blockId,
                                    deleted:
                                        false,
                                    reason:
                                        "Block lock is no longer owned by you"
                                })
                            );

                            return;
                        }

                        // --------------------------------
                        // Delete block
                        // --------------------------------

                        const deleteUpdate =
                            deleteBlockFromYjs(
                                ydoc!,
                                deleteRequest.blockId
                            );

                        deleteRequests.delete(
                            requestId
                        );

                        scheduleDocumentSave(
                            documentId,
                            ydoc!
                        );

                        // --------------------------------
                        // Broadcast deletion
                        // --------------------------------

                        broadcastUpdate(
                            documentClients,
                            deleteUpdate
                        );

                        // --------------------------------
                        // Tell requester
                        // --------------------------------

                        if (
                            deleteRequest
                                .requesterSocket
                                .readyState ===
                            WebSocket.OPEN
                        ) {

                            deleteRequest
                                .requesterSocket
                                .send(
                                    JSON.stringify({
                                        type:
                                            "deleteResult",
                                        requestId,
                                        blockId:
                                            deleteRequest.blockId,
                                        deleted:
                                            true
                                    })
                                );
                        }

                        // --------------------------------
                        // Tell owner
                        // --------------------------------

                        socket.send(
                            JSON.stringify({
                                type:
                                    "deleteResult",
                                requestId,
                                blockId:
                                    deleteRequest.blockId,
                                deleted:
                                    true
                            })
                        );

                        console.log(
                            "DELETE APPROVED:",
                            requestId,
                            "block:",
                            deleteRequest.blockId,
                            "approved by:",
                            userId
                        );

                        return;
                    }

                    // ====================================
                    // REJECT DELETE
                    // ====================================

                    if (
                        controlMessage.type ===
                        "reject-delete"
                    ) {

                        const requestId =
                            controlMessage.requestId;

                        if (!requestId) {
                            return;
                        }

                        const deleteRequest =
                            deleteRequests.get(
                                requestId
                            );

                        if (!deleteRequest) {

                            socket.send(
                                JSON.stringify({
                                    type:
                                        "deleteResult",
                                    requestId,
                                    deleted:
                                        false,
                                    reason:
                                        "Delete request no longer exists"
                                })
                            );

                            return;
                        }

                        // --------------------------------
                        // Only lock owner can reject
                        // --------------------------------

                        if (
                            deleteRequest.ownerId !==
                            userId
                        ) {

                            socket.send(
                                JSON.stringify({
                                    type:
                                        "deleteResult",
                                    requestId,
                                    deleted:
                                        false,
                                    reason:
                                        "Only the block owner can reject"
                                })
                            );

                            return;
                        }

                        deleteRequests.delete(
                            requestId
                        );

                        // --------------------------------
                        // Tell requester
                        // --------------------------------

                        if (
                            deleteRequest
                                .requesterSocket
                                .readyState ===
                            WebSocket.OPEN
                        ) {

                            deleteRequest
                                .requesterSocket
                                .send(
                                    JSON.stringify({
                                        type:
                                            "deleteResult",
                                        requestId,
                                        blockId:
                                            deleteRequest.blockId,
                                        deleted:
                                            false,
                                        reason:
                                            "Delete request rejected"
                                    })
                                );
                        }

                        // --------------------------------
                        // Tell owner
                        // --------------------------------

                        socket.send(
                            JSON.stringify({
                                type:
                                    "deleteResult",
                                requestId,
                                blockId:
                                    deleteRequest.blockId,
                                deleted:
                                    false,
                                reason:
                                    "Delete request rejected"
                            })
                        );

                        console.log(
                            "DELETE REJECTED:",
                            requestId,
                            "block:",
                            deleteRequest.blockId,
                            "rejected by:",
                            userId
                        );

                        return;
                    }

                    // ====================================
                    // CURSOR POSITION
                    // ====================================

                    if (
                        controlMessage.type ===
                        "cursor"
                    ) {

                        const blockId =
                            controlMessage.blockId;

                        if (!blockId) {
                            return;
                        }

                        const cursorPosition =
                            Number(
                                controlMessage.cursorPosition
                            );

                        const selectionStart =
                            Number(
                                controlMessage.selectionStart
                            );

                        const selectionEnd =
                            Number(
                                controlMessage.selectionEnd
                            );

                        if (
                            !Number.isFinite(
                                cursorPosition
                            ) ||
                            !Number.isFinite(
                                selectionStart
                            ) ||
                            !Number.isFinite(
                                selectionEnd
                            )
                        ) {

                            console.error(
                                "Invalid cursor position:",
                                controlMessage
                            );

                            return;
                        }

                        const cursorMessage =
                            JSON.stringify({
                                type:
                                    "cursor",
                                userId,
                                blockId,
                                cursorPosition,
                                selectionStart,
                                selectionEnd
                            });

                        documentClients?.forEach(
                            (
                                client
                            ) => {

                                if (
                                    client ===
                                    socket
                                ) {
                                    return;
                                }

                                if (
                                    client.readyState ===
                                    WebSocket.OPEN
                                ) {

                                    client.send(
                                        cursorMessage
                                    );
                                }
                            }
                        );

                        console.log(
                            "CURSOR UPDATE:",
                            userId,
                            blockId,
                            cursorPosition
                        );

                        return;
                    }

                    // ====================================
                    // UNKNOWN CONTROL MESSAGE
                    // ====================================

                    console.log(
                        "Unknown control message:",
                        controlMessage
                    );

                    return;
                }

                // ========================================
                // BINARY YJS UPDATE
                // ========================================

                console.log(
                    "Yjs update received for document:",
                    documentId
                );

                const update =
                    new Uint8Array(
                        message as Buffer
                    );

                try {

                    // ========================================
                    // Find which blocks were changed
                    // ========================================

                    const changedBlockIds =
                        getChangedBlockIds(
                            ydoc!,
                            update
                        );

                    console.log(
                        "Changed blocks:",
                        changedBlockIds
                    );

                    // ========================================
                    // Get current block locks
                    // ========================================

                    const blockLocks =
                        ydoc!.getMap<string>(
                            "blockLocks"
                        );

                    // ========================================
                    // Create temporary document
                    // ========================================

                    const tempDoc = new Y.Doc();

                    const currentState =
                        Y.encodeStateAsUpdate(
                            ydoc!
                        );

                    Y.applyUpdate(
                        tempDoc,
                        currentState
                    );

                    // Apply client's update ONLY
                    // to the temporary document
                    Y.applyUpdate(
                        tempDoc,
                        update
                    );

                    // ========================================
                    // SECURITY CHECK
                    // Client cannot modify blockLocks
                    // directly.
                    // ========================================

                    const tempBlockLocks =
                        tempDoc.getMap<string>(
                            "blockLocks"
                        );

                    let lockMapChanged = false;

                    // Check existing locks
                    blockLocks.forEach(
                        (owner, blockId) => {

                            if (
                                tempBlockLocks.get(blockId) !==
                                owner
                            ) {
                                lockMapChanged = true;
                            }
                        }
                    );

                    // Check newly added locks
                    tempBlockLocks.forEach(
                        (owner, blockId) => {

                            if (
                                blockLocks.get(blockId) !==
                                owner
                            ) {
                                lockMapChanged = true;
                            }
                        }
                    );

                    if (lockMapChanged) {

                        console.log(
                            "YJS UPDATE REJECTED:",
                            "Client attempted to modify blockLocks"
                        );

                        socket.send(
                            JSON.stringify({
                                type:
                                    "updateRejected",
                                reason:
                                    "Block locks can only be changed through lock/unlock requests"
                            })
                        );

                        return;
                    }

                    // ========================================
                    // SERVER-AUTHORITATIVE LOCK CHECK
                    // ========================================

                    for (
                        const blockId of changedBlockIds
                    ) {

                        const lockOwner =
                            blockLocks.get(blockId);

                        // ------------------------------------
                        // Block is locked by another user
                        // ------------------------------------

                        if (
                            lockOwner &&
                            lockOwner !== userId
                        ) {

                            console.log(
                                "YJS UPDATE REJECTED:",
                                "Block:",
                                blockId,
                                "Locked by:",
                                lockOwner,
                                "Requester:",
                                userId
                            );

                            const authoritativeBlock =
                                ydoc!
                                    .getMap<Y.Text>("blocks")
                                    .get(blockId);

                            socket.send(
                                JSON.stringify({
                                    type:
                                        "updateRejected",
                                    blockId,
                                    reason:
                                        "Block is locked by another user",
                                    lockedBy:
                                        lockOwner,
                                    content:
                                        authoritativeBlock instanceof Y.Text
                                            ? authoritativeBlock.toString()
                                            : ""
                                })
                            );

                            return;
                        }
                    }

                    // ========================================
                    // UPDATE AUTHORIZED
                    // ========================================

                    const stateBefore =
                        Y.encodeStateVector(
                            ydoc!
                        );

                    // ========================================
                    // Apply update to real Yjs document
                    // ========================================

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

                                    if (
                                        !(yText instanceof Y.Text)
                                    ) {
                                        return;
                                    }

                                    const currentContent =
                                        yText.toString();

                                    const sanitizedContent =
                                        sanitizeBlockContent(
                                            currentContent
                                        );

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

                    // ========================================
                    // Generate final update
                    // ========================================

                    const sanitizedUpdate =
                        Y.encodeStateAsUpdate(
                            ydoc!,
                            stateBefore
                        );

                    // ========================================
                    // Save document
                    // ========================================

                    scheduleDocumentSave(
                        documentId,
                        ydoc!
                    );

                    // ========================================
                    // Broadcast authorized update
                    // ========================================

                    broadcastUpdate(
                        documentClients,
                        sanitizedUpdate
                    );

                    console.log(
                        "Yjs update accepted:",
                        documentId,
                        "by",
                        userId
                    );

                } catch (error) {

                    console.error(
                        "Failed to process Yjs update:",
                        error
                    );

                    socket.send(
                        JSON.stringify({
                            type: "updateRejected",
                            reason:
                                "Invalid Yjs update"
                        })
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
                // Remove pending delete requests
                // --------------------------------

                deleteRequests.forEach(
                    (
                        deleteRequest,
                        requestId
                    ) => {

                        if (
                            deleteRequest
                                .requesterSocket ===
                            socket ||
                            deleteRequest
                                .ownerId ===
                            userId
                        ) {

                            deleteRequests.delete(
                                requestId
                            );

                            if (
                                deleteRequest
                                    .requesterSocket !==
                                socket &&
                                deleteRequest
                                    .requesterSocket
                                    .readyState ===
                                WebSocket.OPEN
                            ) {

                                deleteRequest
                                    .requesterSocket
                                    .send(
                                        JSON.stringify({
                                            type:
                                                "deleteResult",
                                            requestId,
                                            blockId:
                                                deleteRequest.blockId,
                                            deleted:
                                                false,
                                            reason:
                                                "Delete request cancelled because a user disconnected"
                                        })
                                    );
                            }
                        }
                    }
                );

                // --------------------------------
                // Remove client
                // --------------------------------

                documentClients?.delete(
                    socket
                );

                clientUsers.delete(
                    socket
                );

                broadcastCollaborators(
                    documentId
                );

                // ====================================
                // Remove remote cursor
                // ====================================

                const cursorRemovedMessage =
                    JSON.stringify({
                        type:
                            "cursorRemoved",
                        userId
                    });

                documentClients?.forEach(
                    (
                        client
                    ) => {

                        if (
                            client.readyState ===
                            WebSocket.OPEN
                        ) {

                            client.send(
                                cursorRemovedMessage
                            );
                        }
                    }
                );

                // ====================================
                // Remove all locks owned by this user
                // ====================================

                const blockLocks =
                    ydoc!.getMap<string>(
                        "blockLocks"
                    );

                const stateBefore =
                    Y.encodeStateAsUpdate(
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

                const lockCleanupUpdate =
                    Y.encodeStateAsUpdate(
                        ydoc!,
                        stateBefore
                    );

                broadcastUpdate(
                    documentClients,
                    lockCleanupUpdate
                );

                // ====================================
                // Remove empty client collection
                // ====================================

                if (
                    documentClients &&
                    documentClients.size === 0
                ) {

                    clients.delete(
                        documentId
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
