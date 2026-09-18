import * as Y from "yjs";

const ydoc = new Y.Doc();

const document = ydoc.getMap("document");

const socket = new WebSocket("ws://localhost:5001");

socket.onopen = () => {
    console.log("Connected to WebSocket server");

    document.set("title", "Hello from React");

    const update = Y.encodeStateAsUpdate(ydoc);

    const buffer = update.buffer.slice(
        update.byteOffset,
        update.byteOffset + update.byteLength
    )as ArrayBuffer

    socket.send(buffer);
};

socket.onmessage = async (event) => {
    console.log("Update received from server");

    const data = await event.data.arrayBuffer();

    const update = new Uint8Array(data);

    Y.applyUpdate(ydoc, update);

    console.log(
        "Current title:",
        document.get("title")
    );
};

export default socket;