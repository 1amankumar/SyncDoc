import * as Y from "yjs";

const ydoc = new Y.Doc();
const document = ydoc.getMap("document");

document.set("title", "Hello from React");

const update = Y.encodeStateAsUpdate(ydoc);


const socket = new WebSocket("ws://localhost:5001");

socket.onopen = () => {
    console.log("Connected to WebSocket server");
    socket.send(update)

}
socket.onmessage = (event) => {
    console.log("Message from server:", event.data);
};

export default socket;
