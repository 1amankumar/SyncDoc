import { useNavigate } from "react-router-dom";
import LogoutButton from "../pages/Logout";

function Sidebar() {

    const navigate = useNavigate();

    return (
        <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">

            {/* Logo */}

            <div className="flex h-16 items-center border-b border-slate-200 px-6">

                <button
                    onClick={() => navigate("/documents")}
                    className="text-xl font-bold tracking-tight text-slate-900"
                >
                    Sync<span className="text-indigo-600">Doc</span>
                </button>

            </div>

            {/* Workspace */}

            <div className="flex-1 px-4 py-6">

                <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Workspace
                </p>

                <nav className="space-y-1">

                    <button
                        onClick={() => navigate("/documents")}
                        className="flex w-full items-center gap-3 rounded-lg bg-indigo-50 px-3 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
                    >
                        <span>▣</span>
                        Documents
                    </button>

                    <button
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                    >
                        <span>◷</span>
                        Recent
                    </button>

                    <button
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                    >
                        <span>↗</span>
                        Shared
                    </button>

                </nav>

            </div>

            {/* Bottom Navigation */}

            <div className="border-t border-slate-200 p-4">

                <button
                    className="mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                >
                    <span>⚙</span>
                    Settings
                </button>

                <div className="px-3 py-2">
                    <LogoutButton />
                </div>

            </div>

        </aside>
    );
}

export default Sidebar;