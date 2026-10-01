import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (
        event: React.FormEvent
    ) => {

        event.preventDefault();

        try {

            const response = await fetch(
                "http://localhost:5000/api/auth/login",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        email,
                        password
                    })
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Login failed"
                );
            }

            console.log(
                "LOGIN SUCCESS:",
                data
            );

            navigate("/documents");

            alert("Login successful");

        } catch (error) {

            console.error(
                "LOGIN ERROR:",
                error
            );

            alert(
                error instanceof Error
                    ? error.message
                    : "Login failed"
            );
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">

            {/* Main Container */}

            <div className="flex min-h-screen items-center justify-center px-4 py-12">

                <div className="w-full max-w-md">

                    {/* Logo / Branding */}

                    <div className="mb-8 text-center">

                        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white shadow-sm">
                            S
                        </div>

                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Sync<span className="text-indigo-600">Doc</span>
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Collaborative document engine
                        </p>

                    </div>

                    {/* Login Card */}

                    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

                        <div className="mb-7">

                            <h2 className="text-xl font-semibold text-slate-900">
                                Welcome back
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Sign in to continue to your workspace.
                            </p>

                        </div>

                        <form
                            onSubmit={handleLogin}
                            className="space-y-5"
                        >

                            {/* Email */}

                            <div>

                                <label
                                    htmlFor="email"
                                    className="mb-2 block text-sm font-medium text-slate-700"
                                >
                                    Email
                                </label>

                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(
                                            event.target.value
                                        )
                                    }
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />

                            </div>

                            {/* Password */}

                            <div>

                                <label
                                    htmlFor="password"
                                    className="mb-2 block text-sm font-medium text-slate-700"
                                >
                                    Password
                                </label>

                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(
                                            event.target.value
                                        )
                                    }
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />

                            </div>

                            {/* Login Button */}

                            <button
                                type="submit"
                                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 active:bg-indigo-800"
                            >
                                Login
                            </button>

                        </form>

                        {/* Signup */}

                        <div className="mt-6 border-t border-slate-100 pt-6 text-center">

                            <p className="text-sm text-slate-500">

                                Don't have an account?{" "}

                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate("/signup")
                                    }
                                    className="font-semibold text-indigo-600 transition hover:text-indigo-700"
                                >
                                    Sign up
                                </button>

                            </p>

                        </div>

                    </div>

                    {/* Footer */}

                    <p className="mt-6 text-center text-xs text-slate-400">
                        Build, edit and collaborate with SyncDoc.
                    </p>

                </div>

            </div>

        </div>
    );
}

export default Login;