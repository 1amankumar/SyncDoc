import DocumentList from "./components/DocumentList";
import "./services/websocketService";

function App() {
    return (
        <div>
            <h1>SyncDoc</h1>
            <p>Collaborative Document Engine</p>
            <DocumentList/>
        </div>
    );
}

export default App;