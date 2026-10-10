import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import LogoutButton from "../pages/Logout";
import { getCurrentUser, type CurrentUser } from "../services/authService";
import {
    FileText,
    Network,
    Shield,
    Terminal,
    Layers
} from "lucide-react";

function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState<CurrentUser | null>(null);

    useEffect(() => {
        getCurrentUser()
            .then(setUser)
            .catch(() => {});
    }, []);

    const isDocumentsActive = location.pathname.startsWith("/documents");

    return (
        <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white select-none">
            {/* Logo */}
            <div className="flex h-16 items-center border-b border-slate-100 px-6 gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
                    <Layers className="w-4 h-4" />
                </div>
                <button
                    onClick={() => navigate("/documents")}
                    className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-1"
                >
                    Sync<span className="text-indigo-600">Doc</span>
                </button>
            </div>

            {/* Workspace Links */}
            <div className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
                <div>
                    <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Workspace
                    </p>
                    <nav className="space-y-1">
                        <button
                            onClick={() => navigate("/documents")}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                                isDocumentsActive
                                    ? "bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-100/60"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                        >
                            <FileText className="w-4 h-4 text-indigo-500" />
                            <span>Documents Catalog</span>
                        </button>
                    </nav>
                </div>

                {/* System Specs & Engine Info */}
                <div>
                    <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Engine Status
                    </p>
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 text-[11px]">
                        <div className="flex items-center justify-between text-slate-600">
                            <span className="flex items-center gap-1.5">
                                <Network className="w-3.5 h-3.5 text-emerald-500" />
                                Sync Engine
                            </span>
                            <span className="font-bold text-emerald-600">Yjs CRDT</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                            <span className="flex items-center gap-1.5">
                                <Terminal className="w-3.5 h-3.5 text-indigo-500" />
                                Port
                            </span>
                            <span className="font-mono font-medium text-slate-700">5001 (WS)</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                            <span className="flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5 text-violet-500" />
                                Security
                            </span>
                            <span className="font-medium text-slate-700">DOMPurify</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* User Profile & Logout */}
            <div className="border-t border-slate-100 p-4 bg-slate-50/50 space-y-2">
                {user && (
                    <div className="flex items-center gap-2.5 px-3 py-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-sm">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                        </div>
                    </div>
                )}
                <LogoutButton />
            </div>
        </aside>
    );
}

export default Sidebar;