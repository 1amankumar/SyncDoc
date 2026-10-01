import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signupWithGoogle } from "../services/googleAuthService";

function Signup() {

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const navigate = useNavigate();

    const handleSignup = async (
        event: React.FormEvent
    ) => {

        event.preventDefault();

        try {

            const response = await fetch(
                "http://localhost:5000/api/auth/register",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        name,
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
                    "Signup failed"
                );
            }

            console.log(
                "SIGNUP SUCCESS:",
                data
            );

            navigate("/documents");

            alert("Signup successful");

        } catch (error) {

            console.error(
                "SIGNUP ERROR:",
                error
            );

            alert(
                error instanceof Error
                    ? error.message
                    : "Signup failed"
            );
        }
    };

    const handleGoogleSignup = async () => {

        try {

            await signupWithGoogle();

            alert("Google signup successful");

            navigate("/documents");

        } catch (error) {

            console.error(
                "GOOGLE SIGNUP ERROR:",
                error
            );

            alert(
                error instanceof Error
                    ? error.message
                    : "Google signup failed"
            );
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">

            <div className="flex min-h-screen items-center justify-center px-4 py-12">

                <div className="w-full max-w-md">

                    {/* Branding */}

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

                    {/* Signup Card */}

                    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

                        <div className="mb-7">

                            <h2 className="text-xl font-semibold text-slate-900">
                                Create your account
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Start creating and collaborating with SyncDoc.
                            </p>

                        </div>

                        <form
                            onSubmit={handleSignup}
                            className="space-y-5"
                        >

                            {/* Name */}

                            <div>

                                <label
                                    htmlFor="name"
                                    className="mb-2 block text-sm font-medium text-slate-700"
                                >
                                    Name
                                </label>

                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(event) =>
                                        setName(
                                            event.target.value
                                        )
                                    }
                                    required
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />

                            </div>

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
                                    required
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
                                    required
                                    minLength={6}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />

                                <p className="mt-2 text-xs text-slate-400">
                                    Password must contain at least 6 characters.
                                </p>

                            </div>

                            {/* Signup Button */}

                            <button
                                type="submit"
                                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 active:bg-indigo-800"
                            >
                                Create account
                            </button>

                        </form>

                        {/* Divider */}

                        <div className="my-6 flex items-center">

                            <div className="h-px flex-1 bg-slate-200" />

                            <span className="px-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                                OR
                            </span>

                            <div className="h-px flex-1 bg-slate-200" />

                        </div>

                        {/* Google Signup */}

                        <button
                            type="button"
                            onClick={handleGoogleSignup}
                            className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >

                            <span className="text-lg font-bold">
                                G
                            </span>

                            Continue with Google

                        </button>

                        {/* Login */}

                        <div className="mt-6 border-t border-slate-100 pt-6 text-center">

                            <p className="text-sm text-slate-500">

                                Already have an account?{" "}

                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate("/login")
                                    }
                                    className="font-semibold text-indigo-600 transition hover:text-indigo-700"
                                >
                                    Login
                                </button>

                            </p>

                        </div>

                    </div>

                    <p className="mt-6 text-center text-xs text-slate-400">
                        Build, edit and collaborate with SyncDoc.
                    </p>

                </div>

            </div>

        </div>
    );
}

export default Signup;