import {
    BrowserRouter,
    Routes,
    Route
} from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DocumentList from "./components/DocumentList";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
    return (
        <BrowserRouter>

            <h1>SyncDoc</h1>

            <p>
                Collaborative Document Engine
            </p>

            <Routes>

                {/* Public */}
                <Route
                    path="/login"
                    element={<Login />}
                />

                <Route
                    path="/signup"
                    element={<Signup />}
                />

                {/* Protected */}
                <Route element={<ProtectedRoute />}>

                    <Route
                        path="/documents"
                        element={<DocumentList />}
                    />

                </Route>

            </Routes>

        </BrowserRouter>
    );
}

export default App;