import * as Y from "yjs";
import type { Block } from "../types/document";

// ========================================
// Yjs Document & Shared Structures
// ========================================

export const ydoc = new Y.Doc();

export const blocks = ydoc.getMap<Y.Text>("blocks");
export const blockLocks = ydoc.getMap<string>("blockLocks");
export const blockOrder = ydoc.getArray<string>("blockOrder");
export const blockTypes = ydoc.getMap<Block["type"]>("blockTypes");

// ========================================
// Authenticated User ID
// ========================================

let userId: string | null = null;

export const setUserId = (id: string): void => {
    userId = id;
};

export const getUserId = (): string | null => {
    return userId;
};

// ========================================
// Sync Status
// ========================================

let syncReady = false;

export const isSyncReady = (): boolean => {
    return syncReady;
};

export const onSyncReady = (callback: () => void) => {
    window.addEventListener("syncdoc-ready", callback);
    return () => {
        window.removeEventListener("syncdoc-ready", callback);
    };
};

const markSyncReady = (documentId: string): void => {
    syncReady = true;
    window.dispatchEvent(new Event("syncdoc-ready"));
    console.log("YJS INITIAL SYNC READY:", documentId);
};

// ========================================
// WebSocket & Collaborators State
// ========================================

let socket: WebSocket | null = null;
let currentDocumentId: string | null = null;
let removeYjsListener: (() => void) | null = null;

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

export const getCollaborators = (): CollaboratorState => {
    return collaborators;
};

export const onCollaboratorsUpdate = (callback: (state: CollaboratorState) => void) => {
    const handleUpdate = (event: Event) => {
        const customEvent = event as CustomEvent<CollaboratorState>;
        callback(customEvent.detail);
    };

    window.addEventListener("syncdoc-collaborators", handleUpdate);
    return () => {
        window.removeEventListener("syncdoc-collaborators", handleUpdate);
    };
};

const remoteCursors = new Map<string, RemoteCursor>();

export const getRemoteCursors = (): RemoteCursor[] => {
    return Array.from(remoteCursors.values());
};

const clearRemoteCursors = (): void => {
    remoteCursors.clear();
    window.dispatchEvent(new Event("syncdoc-cursor-update"));
};

export const removeRemoteCursor = (remoteUserId: string): void => {
    remoteCursors.delete(remoteUserId);
    window.dispatchEvent(new Event("syncdoc-cursor-update"));
};

// ========================================
// Delete Permissions
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

const deleteRequestListeners: Array<(request: DeleteRequest) => void> = [];
const deleteResultListeners: Array<(result: DeleteResult) => void> = [];

export const onDeleteRequest = (listener: (request: DeleteRequest) => void): (() => void) => {
    deleteRequestListeners.push(listener);
    return () => {
        const index = deleteRequestListeners.indexOf(listener);
        if (index !== -1) {
            deleteRequestListeners.splice(index, 1);
        }
    };
};

export const onDeleteResult = (listener: (result: DeleteResult) => void): (() => void) => {
    deleteResultListeners.push(listener);
    return () => {
        const index = deleteResultListeners.indexOf(listener);
        if (index !== -1) {
            deleteResultListeners.splice(index, 1);
        }
    };
};

// ========================================
// Outgoing Messages
// ========================================

export const sendCursorPosition = (
    blockId: string,
    cursorPosition: number,
    selectionStart: number,
    selectionEnd: number
): boolean => {
    if (!socket || socket.readyState !== WebSocket.OPEN || !userId) {
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

export const requestBlockLock = (blockId: string): boolean => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.error("Cannot request lock: WebSocket is not connected");
        return false;
    }

    socket.send(JSON.stringify({ type: "lock", blockId }));
    return true;
};

export const releaseBlockLock = (blockId: string): boolean => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.error("Cannot release lock: WebSocket is not connected");
        return false;
    }

    socket.send(JSON.stringify({ type: "unlock", blockId }));
    return true;
};

export const requestDeleteBlock = (blockId: string): boolean => {
    if (!socket || socket.readyState !== WebSocket.OPEN || !currentDocumentId) {
        console.error("Cannot request deletion: WebSocket not connected");
        return false;
    }

    socket.send(JSON.stringify({ type: "request-delete", blockId }));
    return true;
};

export const approveDeleteRequest = (requestId: string): boolean => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        return false;
    }

    socket.send(JSON.stringify({ type: "approve-delete", requestId }));
    return true;
};

export const rejectDeleteRequest = (requestId: string): boolean => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        return false;
    }

    socket.send(JSON.stringify({ type: "reject-delete", requestId }));
    return true;
};

// ========================================
// Collaborative Block Operations
// ========================================

export const addBlock = (type: Block["type"] = "paragraph", initialContent = ""): string | null => {
    if (!userId || !socket || socket.readyState !== WebSocket.OPEN || !syncReady) {
        console.error("Cannot add block: sync not ready or not connected");
        return null;
    }

    const blockId = crypto.randomUUID();
    const text = new Y.Text();
    if (initialContent) {
        text.insert(0, initialContent);
    }

    ydoc.transact(() => {
        blocks.set(blockId, text);
        blockTypes.set(blockId, type);
        blockOrder.push([blockId]);
    });

    return blockId;
};

export const insertBlockAfter = (
    afterBlockId: string | null,
    type: Block["type"] = "paragraph",
    initialContent = ""
): string | null => {
    if (!userId || !socket || socket.readyState !== WebSocket.OPEN || !syncReady) {
        return null;
    }

    const blockId = crypto.randomUUID();
    const text = new Y.Text();
    if (initialContent) {
        text.insert(0, initialContent);
    }

    ydoc.transact(() => {
        blocks.set(blockId, text);
        blockTypes.set(blockId, type);

        if (!afterBlockId) {
            blockOrder.insert(0, [blockId]);
        } else {
            const currentOrder = blockOrder.toArray();
            const index = currentOrder.indexOf(afterBlockId);
            if (index === -1) {
                blockOrder.push([blockId]);
            } else {
                blockOrder.insert(index + 1, [blockId]);
            }
        }
    });

    return blockId;
};

export const updateBlockType = (blockId: string, newType: Block["type"]): void => {
    if (!blocks.has(blockId)) return;
    blockTypes.set(blockId, newType);
};

export const moveBlock = (blockId: string, direction: "up" | "down"): boolean => {
    const currentOrder = blockOrder.toArray();
    const index = currentOrder.indexOf(blockId);
    if (index === -1) return false;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentOrder.length) return false;

    ydoc.transact(() => {
        blockOrder.delete(index, 1);
        blockOrder.insert(targetIndex, [blockId]);
    });

    return true;
};

export const removeBlock = (blockId: string): boolean => {
    if (!blocks.has(blockId)) {
        return false;
    }

    ydoc.transact(() => {
        blocks.delete(blockId);
        blockTypes.delete(blockId);

        const currentOrder = blockOrder.toArray();
        const index = currentOrder.indexOf(blockId);
        if (index !== -1) {
            blockOrder.delete(index, 1);
        }

        if (blockLocks.has(blockId)) {
            blockLocks.delete(blockId);
        }
    });

    return true;
};

const cleanBlockOrder = (): void => {
    const currentOrder = blockOrder.toArray();
    const uniqueOrder = Array.from(new Set(currentOrder));

    if (uniqueOrder.length === currentOrder.length) {
        return;
    }

    ydoc.transact(() => {
        blockOrder.delete(0, blockOrder.length);
        if (uniqueOrder.length > 0) {
            blockOrder.push(uniqueOrder);
        }
    });
};

const ensureBlockInOrder = (blockId: string): void => {
    const currentOrder = blockOrder.toArray();
    if (currentOrder.includes(blockId)) {
        return;
    }
    blockOrder.push([blockId]);
};

// ========================================
// AST Snapshot Helper
// ========================================

export const getASTSnapshot = (): {
    documentId: string | null;
    totalNodes: number;
    blocks: Array<{
        id: string;
        type: string;
        contentLength: number;
        preview: string;
        lockedBy: string | null;
    }>;
} => {
    const orderedIds = blockOrder.toArray();
    const uniqueIds = Array.from(new Set(orderedIds));

    const blockList = uniqueIds.map((id) => {
        const yText = blocks.get(id);
        const type = blockTypes.get(id) || "paragraph";
        const lock = blockLocks.get(id) || null;
        const textStr = yText?.toString() || "";

        return {
            id,
            type,
            contentLength: textStr.length,
            preview: textStr.slice(0, 40) + (textStr.length > 40 ? "..." : ""),
            lockedBy: lock
        };
    });

    return {
        documentId: currentDocumentId,
        totalNodes: blockList.length,
        blocks: blockList
    };
};

// ========================================
// Connect to Document
// ========================================

export const connectToDocument = (
    documentId: string,
    documentBlocks: Block[]
): void => {
    syncReady = false;

    if (!userId) {
        console.error("Cannot connect: user ID unavailable");
        return;
    }

    if (socket && currentDocumentId === documentId && socket.readyState === WebSocket.OPEN) {
        console.log("Already connected to document:", documentId);
        return;
    }

    if (removeYjsListener) {
        removeYjsListener();
        removeYjsListener = null;
    }

    if (socket) {
        socket.close();
    }

    // Reset Yjs state
    blocks.clear();
    blockLocks.clear();
    blockOrder.delete(0, blockOrder.length);
    blockTypes.clear();
    clearRemoteCursors();

    const newSocket = new WebSocket(
        `ws://localhost:5001/document/${documentId}?userId=${userId}`
    );

    socket = newSocket;
    currentDocumentId = documentId;

    const handleYjsUpdate = (update: Uint8Array, origin: unknown): void => {
        if (origin === "remote") {
            return;
        }

        if (newSocket.readyState !== WebSocket.OPEN) {
            return;
        }

        const buffer = update.buffer.slice(
            update.byteOffset,
            update.byteOffset + update.byteLength
        ) as ArrayBuffer;

        newSocket.send(buffer);
    };

    ydoc.on("update", handleYjsUpdate);

    removeYjsListener = () => {
        ydoc.off("update", handleYjsUpdate);
    };

    newSocket.onopen = () => {
        console.log("Connected to document:", documentId);
    };

    newSocket.onmessage = async (event) => {
        // Text/Control Message
        if (typeof event.data === "string") {
            let message: any;
            try {
                message = JSON.parse(event.data);
            } catch (err) {
                console.error("Invalid WebSocket message:", err);
                return;
            }

            if (message.type === "lockResult") {
                window.dispatchEvent(
                    new CustomEvent("syncdoc-lock-result", { detail: message })
                );
                return;
            }

            if (message.type === "unlockResult") {
                window.dispatchEvent(
                    new CustomEvent("syncdoc-unlock-result", { detail: message })
                );
                return;
            }

            if (message.type === "updateRejected") {
                const blockId = message.blockId;
                const authoritativeContent = message.content;

                if (blockId && typeof authoritativeContent === "string") {
                    const sharedText = blocks.get(blockId);
                    if (sharedText instanceof Y.Text) {
                        ydoc.transact(() => {
                            sharedText.delete(0, sharedText.length);
                            if (authoritativeContent.length > 0) {
                                sharedText.insert(0, authoritativeContent);
                            }
                        }, "remote");
                    }
                }

                window.dispatchEvent(
                    new CustomEvent("syncdoc-update-rejected", { detail: message })
                );
                return;
            }

            if (message.type === "delete-request") {
                deleteRequestListeners.forEach((listener) => {
                    listener({
                        requestId: message.requestId,
                        blockId: message.blockId,
                        requesterId: message.requesterId
                    });
                });
                return;
            }

            if (message.type === "collaborators") {
                collaborators = {
                    users: Array.isArray(message.users) ? message.users : [],
                    count: typeof message.count === "number" ? message.count : 0
                };
                window.dispatchEvent(
                    new CustomEvent("syncdoc-collaborators", { detail: collaborators })
                );
                return;
            }

            if (message.type === "deleteResult") {
                if (message.deleted === true && message.blockId) {
                    removeBlock(message.blockId);
                }

                deleteResultListeners.forEach((listener) => {
                    listener({
                        requestId: message.requestId,
                        blockId: message.blockId,
                        deleted: Boolean(message.deleted),
                        reason: message.reason
                    });
                });
                return;
            }

            if (message.type === "cursor") {
                if (!message.userId || message.userId === userId || !message.blockId) {
                    return;
                }

                remoteCursors.set(message.userId, {
                    userId: message.userId,
                    blockId: message.blockId,
                    cursorPosition: Number(message.cursorPosition),
                    selectionStart: Number(message.selectionStart),
                    selectionEnd: Number(message.selectionEnd)
                });

                window.dispatchEvent(new Event("syncdoc-cursor-update"));
                return;
            }

            if (message.type === "cursorRemoved") {
                if (message.userId) {
                    removeRemoteCursor(message.userId);
                }
                return;
            }

            if (message.type === "initialize") {
                cleanBlockOrder();

                ydoc.transact(() => {
                    documentBlocks.forEach((block) => {
                        let sharedText = blocks.get(block._id);
                        if (!sharedText) {
                            sharedText = new Y.Text();
                            if (block.content) {
                                sharedText.insert(0, block.content);
                            }
                            blocks.set(block._id, sharedText);
                        }

                        if (!blockTypes.has(block._id)) {
                            blockTypes.set(block._id, block.type);
                        }

                        ensureBlockInOrder(block._id);
                    });
                });

                cleanBlockOrder();
                markSyncReady(documentId);
                return;
            }

            return;
        }

        // Binary Yjs Update
        try {
            const data = await event.data.arrayBuffer();
            const update = new Uint8Array(data);
            Y.applyUpdate(ydoc, update, "remote");
            markSyncReady(documentId);
        } catch (error) {
            console.error("Failed to apply Yjs update:", error);
        }
    };

    newSocket.onclose = () => {
        if (socket !== newSocket) {
            return;
        }

        if (removeYjsListener) {
            removeYjsListener();
            removeYjsListener = null;
        }

        socket = null;
        currentDocumentId = null;
        syncReady = false;
        clearRemoteCursors();
        collaborators = { users: [], count: 0 };
        window.dispatchEvent(
            new CustomEvent("syncdoc-collaborators", { detail: collaborators })
        );
    };

    newSocket.onerror = (error) => {
        console.error("WebSocket error:", error);
    };
};

export const disconnectFromDocument = (): void => {
    if (removeYjsListener) {
        removeYjsListener();
        removeYjsListener = null;
    }

    if (socket) {
        socket.close();
        socket = null;
    }

    currentDocumentId = null;
    syncReady = false;
    clearRemoteCursors();
};
