import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signupWithGoogle } from "../services/googleAuthService";
import { useToast } from "../context/ToastContext";
import {
    Layers,
    Lock,
    Mail,
    User,
    ArrowRight,
    Sparkles,
    Shield,
    Network,
    Loader2
} from "lucide-react";

function Signup() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const navigate = useNavigate();
    const toast = useToast();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const response = await fetch("http://localhost:5000/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Signup failed");
            }

            toast.success("Account Created!", "Welcome to the SyncDoc collaborative engine.");
            navigate("/documents");
        } catch (error) {
            console.error("SIGNUP ERROR:", error);
            toast.error("Signup Failed", error instanceof Error ? error.message : "Registration error");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        try {
            setGoogleLoading(true);
            await signupWithGoogle();
            toast.success("Google Account Linked", "Welcome to SyncDoc!");
            navigate("/documents");
        } catch (error) {
            console.error("GOOGLE SIGNUP ERROR:", error);
            toast.error("Google Signup Failed", error instanceof Error ? error.message : "Failed to sign up");
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-slate-50">
            {/* Left Showcase Banner */}
            <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden">
                <div className="absolute -left-20 -top-20 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute right-0 bottom-0 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/40">
                        <Layers className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-black tracking-tight">
                        Sync<span className="text-indigo-400">Doc</span>
                    </span>
                </div>

                <div className="relative z-10 space-y-6 max-w-lg">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
                        <Sparkles className="w-3.5 h-3.5" /> High-Performance MERN Architecture
                    </div>
                    <h2 className="text-4xl font-extrabold tracking-tight leading-tight">
                        Experience Zero-Overwrite Multi-User Editing.
                    </h2>
                    <p className="text-sm text-slate-400 leading-relaxed">
                        Join your engineering team on SyncDoc. Type concurrently, lock AST nodes automatically, and export high-fidelity specs in real-time.
                    </p>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60">
                            <Network className="w-5 h-5 text-indigo-400 mb-2" />
                            <h4 className="text-xs font-bold text-white">WebSocket Sync</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">Live presence & collaborative cursor tracking.</p>
                        </div>
                        <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60">
                            <Shield className="w-5 h-5 text-emerald-400 mb-2" />
                            <h4 className="text-xs font-bold text-white">Zero Conflict</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">Mathematical convergence via CRDT matrices.</p>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-xs text-slate-500">
                    SyncDoc Engine • High-Throughput Distributed System
                </div>
            </div>

            {/* Right Registration Form */}
            <div className="flex-1 flex items-center justify-center p-8 sm:p-12">
                <div className="w-full max-w-md space-y-6 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50">
                    <div className="text-center">
                        <div className="lg:hidden flex h-10 w-10 mx-auto items-center justify-center rounded-2xl bg-indigo-600 text-white mb-3 shadow-md">
                            <Layers className="w-5 h-5" />
                        </div>
                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create an Account</h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Get started with real-time collaborative documentation.
                        </p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Full Name
                            </label>
                            <div className="relative">
                                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Nabeela Khan"
                                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nabeela@example.com"
                                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-200 transition disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign Up"}
                            {!loading && <ArrowRight className="w-4 h-4" />}
                        </button>
                    </form>

                    <div className="relative flex items-center justify-center my-4">
                        <div className="border-t border-slate-200 w-full" />
                        <span className="bg-white px-3 text-[11px] text-slate-400 uppercase font-medium">Or</span>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleSignup}
                        disabled={googleLoading}
                        className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition shadow-2xs"
                    >
                        {googleLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                        ) : (
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                />
                            </svg>
                        )}
                        <span>Sign up with Google</span>
                    </button>

                    <div className="text-center pt-2">
                        <p className="text-xs text-slate-500">
                            Already have an account?{" "}
                            <Link to="/login" className="text-indigo-600 font-bold hover:underline">
                                Log in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Signup;