import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DocumentList from "./components/DocumentList";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";

function App() {

    return (
        <BrowserRouter>

            <Routes>

                {/* ================================ */}
                {/* Public Routes */}
                {/* ================================ */}

                <Route
                    path="/"
                    element={
                        <Navigate
                            to="/login"
                            replace
                        />
                    }
                />

                <Route
                    path="/login"
                    element={<Login />}
                />

                <Route
                    path="/signup"
                    element={<Signup />}
                />

                {/* ================================ */}
                {/* Protected Routes */}
                {/* ================================ */}

                <Route element={<ProtectedRoute />}>

                    <Route
                        path="/documents"
                        element={
                            <AppLayout>
                                <DocumentList />
                            </AppLayout>
                        }
                    />

                </Route>

            </Routes>

        </BrowserRouter>
    );
}

export default App;