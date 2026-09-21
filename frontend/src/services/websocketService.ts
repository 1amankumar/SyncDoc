import * as Y from "yjs";
import type { Block } from "../types/document";

export const ydoc = new Y.Doc();

export const blocks =
    ydoc.getMap<Y.Text>("blocks");

export const blockLocks =
    ydoc.getMap<string>("blockLocks");


// --------------------------------
// Authenticated user ID
// --------------------------------

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


// --------------------------------
// WebSocket state
// --------------------------------

let socket: WebSocket | null = null;

let currentDocumentId: string | null = null;

let removeYjsListener:
    (() => void) | null = null;


// --------------------------------
// Connect to document
// --------------------------------

export const connectToDocument = (
    documentId: string,
    documentBlocks: Block[]
): void => {

    // --------------------------------
    // Make sure authenticated user exists
    // --------------------------------

    if (!userId) {

        console.error(
            "Cannot connect: user ID is not available"
        );

        return;
    }


    // --------------------------------
    // Already connected
    // --------------------------------

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


    // --------------------------------
    // Remove previous Yjs listener
    // --------------------------------

    if (removeYjsListener) {

        removeYjsListener();

        removeYjsListener = null;
    }


    // --------------------------------
    // Close previous WebSocket
    // --------------------------------

    if (socket) {

        socket.close();

        socket = null;
    }


    currentDocumentId = documentId;


    // --------------------------------
    // Create WebSocket
    // --------------------------------

    socket = new WebSocket(
        `ws://localhost:5001/document/${documentId}?userId=${userId}`
    );


    // --------------------------------
    // Yjs update handler
    // --------------------------------

    const handleYjsUpdate = (
        update: Uint8Array,
        origin: unknown
    ): void => {

        // Don't send remote updates
        // back to the server.

        if (origin === "remote") {
            return;
        }


        if (
            !socket ||
            socket.readyState !== WebSocket.OPEN
        ) {
            return;
        }


        const buffer =
            update.buffer.slice(
                update.byteOffset,
                update.byteOffset +
                update.byteLength
            ) as ArrayBuffer;


        socket.send(buffer);
    };


    // --------------------------------
    // Listen for Yjs updates
    // --------------------------------

    ydoc.on(
        "update",
        handleYjsUpdate
    );


    removeYjsListener = () => {

        ydoc.off(
            "update",
            handleYjsUpdate
        );
    };


    // --------------------------------
    // WebSocket connected
    // --------------------------------

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


    // --------------------------------
    // WebSocket message
    // --------------------------------

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
            }


            return;
        }


        // --------------------------------
        // Yjs binary update
        // --------------------------------

        console.log(
            "Update received for document:",
            documentId
        );


        const data =
            await event.data.arrayBuffer();


        const update =
            new Uint8Array(data);


        Y.applyUpdate(
            ydoc,
            update,
            "remote"
        );
    };


    // --------------------------------
    // WebSocket disconnected
    // --------------------------------

    socket.onclose = () => {

        console.log(
            "Disconnected from document:",
            documentId
        );


        if (removeYjsListener) {

            removeYjsListener();

            removeYjsListener = null;
        }


        socket = null;

        currentDocumentId = null;
    };


    // --------------------------------
    // WebSocket error
    // --------------------------------

    socket.onerror = (error) => {

        console.error(
            "WebSocket error:",
            error
        );
    };
};