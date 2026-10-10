import { useNavigate } from "react-router-dom";
import { logout } from "../services/authService";

function LogoutButton() {

    const navigate = useNavigate();

    const handleLogout = async () => {

        try {

            await logout();

            console.log("LOGOUT SUCCESS");

            navigate("/login", {
                replace: true
            });

        } catch (error) {

            console.error(
                "LOGOUT ERROR:",
                error
            );

        }
    };

    return (
        <button onClick={handleLogout}>
            Logout
        </button>
    );
}

export default LogoutButton;