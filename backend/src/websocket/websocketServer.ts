import { WebSocketServer } from "ws";

const ws=new WebSocketServer({port:5001})

ws.on("connection",(socket)=>{
    console.log("client connected successfully")

    socket.on("message",(message)=>{
        console.log("Message Received -",message.toString());
        socket.send("hello from web socket server");
    })
})