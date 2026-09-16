const socket=new WebSocket("ws://localhost:5001");

socket.onopen=()=>{
    console.log("Connected to WebSocket server");

    socket.send("Hello from React");
}
socket.onmessage = (event) => {
    console.log("Message from server:", event.data);
};

export default socket;
