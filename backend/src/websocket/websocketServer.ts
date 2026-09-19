import {
    WebSocketServer,
    WebSocket as WebSocketClient
} from "ws";
import * as Y from "yjs";

const documents = new Map<string, Y.Doc>();

const clients = new Map<string, Set<WebSocketClient>>();
const ws = new WebSocketServer({
    port: 5001
});

ws.on("connection", (socket, request) => {
    const url = new URL(
        request.url || "",
        "http://localhost"
    );

    const documentId = url.pathname.split("/")[2];

    if (!documentId) {
        socket.close();
        return;
    }

    console.log(
        "Client connected to document:",
        documentId
    );

    // Get or create Yjs document
    let ydoc = documents.get(documentId);

    if (!ydoc) {
        ydoc = new Y.Doc();
        documents.set(documentId, ydoc);
    }

    // Get or create clients group
    let documentClients = clients.get(documentId);

    if (!documentClients) {
        documentClients = new Set();
        clients.set(documentId, documentClients);
    }

    documentClients.add(socket);

    socket.on("message", (message) => {
        console.log(
            "Yjs update received for document:",
            documentId
        );

        const update = new Uint8Array(
            message as Buffer
        );

        // Apply update to this document
        Y.applyUpdate(ydoc, update);

        // Send only to clients of this document
        documentClients.forEach((client) => {
            if (
                client !== socket &&
                client.readyState === 1
            ) {
                client.send(update);
            }
        });
    });

    socket.on("close", () => {
        documentClients?.delete(socket);

        console.log(
            "Client disconnected from document:",
            documentId
        );
    });
});