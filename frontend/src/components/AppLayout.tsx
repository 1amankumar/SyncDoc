import type { ReactNode } from "react";
import Sidebar from "./Sidebar";

interface AppLayoutProps {
    children: ReactNode;
}

function AppLayout({
    children
}: AppLayoutProps) {

    return (
        <div className="flex min-h-screen bg-slate-50">

            <Sidebar />

            <main className="min-w-0 flex-1">

                {children}

            </main>

        </div>
    );
}

export default AppLayout;