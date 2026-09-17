import { WebSocketServer } from "ws";
import * as Y from "yjs";

const ydoc = new Y.Doc();

const document = ydoc.getMap("document");

const ws = new WebSocketServer({ port: 5001 })
ydoc.on("update", (update) => {
    console.log("yjs document updated");
    ws.clients.forEach((client) => {
        if (client.readyState == 1) {
            client.send(update);
        }
    })
})
document.set("title", "My first Syncdoc");

const update = Y.encodeStateAsUpdate(ydoc);
console.log("yjs update-", update)

ws.on("connection", (socket) => {
    console.log("client connected successfully")

    socket.on("message", (message) => {
        console.log("Message Received -", message.toString());
        const update = new Uint8Array(message as Buffer);

        Y.applyUpdate(ydoc, update);
        ws.clients.forEach((client) => {
            if (client !== socket && client.readyState === 1) {
                client.send(update);
            }
        });
    })


})