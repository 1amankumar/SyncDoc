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

export const setUserId = (id: string) => {

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


// Check whether initial Yjs sync is complete
export const isSyncReady = (): boolean => {
    return syncReady;
};


// Listen for initial Yjs synchronization
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


// Notify React components that
// initial Yjs synchronization is complete
const markSyncReady = (
    documentId: string
) => {

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

let currentDocumentId: string | null = null;

let removeYjsListener:
    (() => void) | null = null;


// ========================================
// Connect to Document
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
    // Close previous WebSocket
    // ------------------------------------

    if (socket) {

        socket.close();

        socket = null;
    }


    currentDocumentId = documentId;


    // ------------------------------------
    // Create WebSocket
    // ------------------------------------

    socket = new WebSocket(
        `ws://localhost:5001/document/${documentId}?userId=${userId}`
    );


    // ------------------------------------
    // Handle local Yjs updates
    // ------------------------------------

    const handleYjsUpdate = (
        update: Uint8Array,
        origin: unknown
    ): void => {

        // Do not send remote updates
        // back to the server

        if (origin === "remote") {
            return;
        }


        // Make sure WebSocket exists

        if (
            !socket ||
            socket.readyState !== WebSocket.OPEN
        ) {
            return;
        }


        // Convert Uint8Array to ArrayBuffer

        const buffer =
            update.buffer.slice(
                update.byteOffset,
                update.byteOffset +
                update.byteLength
            ) as ArrayBuffer;


        // Send Yjs update to server

        socket.send(buffer);
    };


    // ------------------------------------
    // Register Yjs update listener
    // ------------------------------------

    ydoc.on(
        "update",
        handleYjsUpdate
    );


    // ------------------------------------
    // Remove listener function
    // ------------------------------------

    removeYjsListener = () => {

        ydoc.off(
            "update",
            handleYjsUpdate
        );
    };


    // ====================================
    // WebSocket Open
    // ====================================

    socket.onopen = () => {

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

    socket.onmessage = async (event) => {


        // --------------------------------
        // Server control message
        // --------------------------------

        if (
            typeof event.data ===
            "string"
        ) {

            const message =
                JSON.parse(event.data);


            // ----------------------------
            // Initialize message
            // ----------------------------

            if (
                message.type ===
                "initialize"
            ) {

                console.log(
                    "Initializing document from MongoDB"
                );


                // Create Y.Text for every
                // MongoDB block

                documentBlocks.forEach(
                    (block) => {

                        const existingText =
                            blocks.get(
                                block._id
                            );


                        // Don't recreate the block
                        // if it already exists

                        if (existingText) {
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


                // The first client doesn't
                // receive a binary state update
                // from the server because it
                // initialized the document itself.

                markSyncReady(
                    documentId
                );
            }


            return;
        }


        // --------------------------------
        // Binary Yjs update
        // --------------------------------

        console.log(
            "Update received for document:",
            documentId
        );


        const data =
            await event.data.arrayBuffer();


        const update =
            new Uint8Array(data);


        // Apply server update locally

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
    };


    // ====================================
    // WebSocket Close
    // ====================================

    socket.onclose = () => {

        console.log(
            "Disconnected from document:",
            documentId
        );


        // Remove Yjs listener

        if (removeYjsListener) {

            removeYjsListener();

            removeYjsListener = null;
        }


        // Reset connection state

        socket = null;

        currentDocumentId = null;

        syncReady = false;
    };


    // ====================================
    // WebSocket Error
    // ====================================

    socket.onerror = (error) => {

        console.error(
            "WebSocket error:",
            error
        );
    };
};