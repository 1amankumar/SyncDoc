import * as Y from "yjs";
import type { Block } from "../types/document";

export const ydoc = new Y.Doc();

export const blocks =
    ydoc.getMap<string>("blocks");

export const connectToDocument = (
    documentId: string,
    documentBlocks: Block[]
): void => {
    const socket = new WebSocket(
        `ws://localhost:5001/document/${documentId}`
    );

    const handleYjsUpdate = (
        update: Uint8Array,
        origin: unknown
    ): void => {
        // Do not send remote updates back
        // to the server.
        if (origin === "remote") {
            return;
        }

        // Socket must be connected.
        if (socket.readyState !== WebSocket.OPEN) {
            return;
        }

        const buffer = update.buffer.slice(
            update.byteOffset,
            update.byteOffset + update.byteLength
        ) as ArrayBuffer;

        socket.send(buffer);
    };

    // Listen for local Yjs changes.
    ydoc.on(
        "update",
        handleYjsUpdate
    );

    socket.onopen = () => {
        console.log(
            "Connected to document:",
            documentId
        );

        documentBlocks.forEach((block) => {
            blocks.set(
                block._id,
                block.content
            );
        });
    };

    socket.onmessage = async (event) => {
        console.log(
            "Update received for document:",
            documentId
        );

        const data =
            await event.data.arrayBuffer();

        const update =
            new Uint8Array(data);

        // Apply update as remote.
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

        // Remove this connection's Yjs listener.
        ydoc.off(
            "update",
            handleYjsUpdate
        );
    };

    socket.onerror = (error) => {
        console.error(
            "WebSocket error:",
            error
        );
    };
};