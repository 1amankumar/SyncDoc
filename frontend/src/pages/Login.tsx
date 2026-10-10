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
        <div>

            <h2>Login</h2>

            <form onSubmit={handleLogin}>

                <div>
                    <label>
                        Email
                    </label>

                    <br />

                    <input
                        type="email"
                        value={email}
                        onChange={(event) =>
                            setEmail(
                                event.target.value
                            )
                        }
                    />
                </div>

                <br />

                <div>
                    <label>
                        Password
                    </label>

                    <br />

                    <input
                        type="password"
                        value={password}
                        onChange={(event) =>
                            setPassword(
                                event.target.value
                            )
                        }
                    />
                </div>

                <br />

                <button type="submit">
                    Login
                </button>

            </form>

        </div>
    );
}

export default Login;