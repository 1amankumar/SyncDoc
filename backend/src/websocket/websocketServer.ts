import {
    WebSocketServer,
    WebSocket
} from "ws";

import * as Y from "yjs";

const documents = new Map<string, Y.Doc>();

const clients =
    new Map<string, Set<WebSocket>>();

const ws = new WebSocketServer({
    port: 5001
});

ws.on(
    "connection",
    (socket, request) => {

        const url = new URL(
            request.url || "",
            "http://localhost"
        );

        const documentId =
            url.pathname.split("/")[2];

        const userId =
            url.searchParams.get("userId");

        if (!documentId || !userId) {
            socket.close();
            return;
        }

        console.log(
            "Client connected:",
            documentId,
            userId
        );

        const isNewDocument =
            !documents.has(documentId);

        let ydoc =
            documents.get(documentId);

        if (!ydoc) {
            ydoc = new Y.Doc();

            documents.set(
                documentId,
                ydoc
            );
        }

        // --------------------------------
        // Send initial document state
        // --------------------------------

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

            if (currentState.length > 0) {

                socket.send(
                    currentState
                );
            }
        }

        // --------------------------------
        // Add client to document
        // --------------------------------

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

        documentClients.add(socket);

        // --------------------------------
        // Receive Yjs updates
        // --------------------------------

        socket.on(
            "message",
            (message) => {

                console.log(
                    "Yjs update received for document:",
                    documentId
                );

                const update =
                    new Uint8Array(
                        message as Buffer
                    );

                Y.applyUpdate(
                    ydoc!,
                    update
                );

                // Send update to other clients
                documentClients?.forEach(
                    (client) => {

                        if (
                            client !== socket &&
                            client.readyState ===
                                WebSocket.OPEN
                        ) {

                            client.send(
                                update
                            );
                        }
                    }
                );
            }
        );

        // --------------------------------
        // Client disconnected
        // --------------------------------

        socket.on(
            "close",
            () => {

                console.log(
                    "Client disconnected:",
                    documentId,
                    userId
                );

                documentClients?.delete(
                    socket
                );

                // --------------------------------
                // Remove locks owned by this user
                // --------------------------------

                const blockLocks =
                    ydoc!.getMap<string>(
                        "blockLocks"
                    );

                const stateBefore =
                    Y.encodeStateVector(
                        ydoc!
                    );

                ydoc!.transact(() => {

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

                });

                // --------------------------------
                // Create only the changes made
                // by the cleanup above
                // --------------------------------

                const lockCleanupUpdate =
                    Y.encodeStateAsUpdate(
                        ydoc!,
                        stateBefore
                    );

                // --------------------------------
                // Broadcast lock cleanup
                // --------------------------------

                if (
                    lockCleanupUpdate.length >
                    0
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

console.log(
    "WebSocket server running on port 5001"
);