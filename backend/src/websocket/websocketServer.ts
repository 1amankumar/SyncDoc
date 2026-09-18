import { WebSocketServer } from "ws";
import * as Y from "yjs";

const ydoc = new Y.Doc();

const document = ydoc.getMap("document");

const ws = new WebSocketServer({ port: 5001 })


ws.on("connection", (socket) => {
    console.log("client connected successfully")

    socket.on("message", (message) => {
        console.log("Yjs update received"); 
        const update = new Uint8Array(message as Buffer);

        Y.applyUpdate(ydoc, update);
        ws.clients.forEach((client) => {
            if (client !== socket && client.readyState === 1) {
                client.send(update);
            }
        });
    })


})