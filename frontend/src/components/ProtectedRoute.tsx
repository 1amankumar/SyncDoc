import { useEffect, useState } from "react";
import {
    Navigate,
    Outlet
} from "react-router-dom";

import { getCurrentUser } from "../services/authService";

function ProtectedRoute() {

    const [loading, setLoading] =
        useState(true);

    const [authenticated, setAuthenticated] =
        useState(false);

    useEffect(() => {

        const checkAuth = async () => {

            try {

                await getCurrentUser();

                console.log(
                    "PROTECTED ROUTE: USER AUTHENTICATED"
                );

                setAuthenticated(true);

            } catch (error) {

                console.log(
                    "PROTECTED ROUTE: USER NOT AUTHENTICATED"
                );

                setAuthenticated(false);

            } finally {

                setLoading(false);

            }
        };

        checkAuth();

    }, []);

    if (loading) {
        return (
            <p>
                Checking authentication...
            </p>
        );
    }

    if (!authenticated) {

        console.log(
            "PROTECTED ROUTE: REDIRECTING TO LOGIN"
        );

        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    return <Outlet />;
}

export default ProtectedRoute;