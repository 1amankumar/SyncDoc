import * as Y from "yjs";
import type { Block } from "../types/document";

export const ydoc = new Y.Doc();

export const blocks =
    ydoc.getMap<Y.Text>("blocks");

export const blockLocks =
    ydoc.getMap<string>("blockLocks");

export const userId =
    crypto.randomUUID();

let socket: WebSocket | null = null;

let currentDocumentId: string | null = null;

let removeYjsListener: (() => void) | null = null;

export const connectToDocument = (
    documentId: string,
    documentBlocks: Block[]
): void => {

    // If we are already connected to this document,
    // do not create another connection.
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

    // Close previous Yjs listener
    if (removeYjsListener) {
        removeYjsListener();
        removeYjsListener = null;
    }

    // Close previous WebSocket
    if (socket) {
        socket.close();
        socket = null;
    }

    currentDocumentId = documentId;

    socket = new WebSocket(
    `ws://localhost:5001/document/${documentId}?userId=${userId}`
);

    const handleYjsUpdate = (
        update: Uint8Array,
        origin: unknown
    ): void => {

        // Don't send remote updates back
        // to the server.
        if (origin === "remote") {
            return;
        }

        if (
            !socket ||
            socket.readyState !== WebSocket.OPEN
        ) {
            return;
        }

        const buffer = update.buffer.slice(
            update.byteOffset,
            update.byteOffset +
            update.byteLength
        ) as ArrayBuffer;

        socket.send(buffer);
    };

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

    socket.onopen = () => {
        console.log(
            "Connected to document:",
            documentId
        );
    };

    socket.onmessage = async (event) => {

        // Server control message
        if (typeof event.data === "string") {

            const message = JSON.parse(
                event.data
            );

            if (
                message.type ===
                "initialize"
            ) {
                console.log(
                    "Initializing document from MongoDB"
                );

                documentBlocks.forEach((block) => {
                    const text = new Y.Text();

                    text.insert(
                        0,
                        block.content
                    );

                    blocks.set(
                        block._id,
                        text
                    );
                });
            }

            return;
        }

        // Yjs binary update
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

    socket.onerror = (error) => {
        console.error(
            "WebSocket error:",
            error
        );
    };
};