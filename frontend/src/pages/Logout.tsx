import { useNavigate } from "react-router-dom";
import { logout } from "../services/authService";
import { useToast } from "../context/ToastContext";
import { LogOut } from "lucide-react";

function LogoutButton() {
    const navigate = useNavigate();
    const toast = useToast();

    const handleLogout = async () => {
        try {
            await logout();
            toast.info("Logged Out", "You have been signed out safely.");
            navigate("/login", { replace: true });
        } catch (error) {
            console.error("LOGOUT ERROR:", error);
            navigate("/login", { replace: true });
        }
    };

    return (
        <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition"
        >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
        </button>
    );
}

export default LogoutButton;