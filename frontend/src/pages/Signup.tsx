import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
                        "Content-Type": "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        name,
                        email,
                        password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Signup failed"
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

    return (
        <div>

            <h2>Sign Up</h2>

            <form onSubmit={handleSignup}>

                <div>
                    <label>
                        Name
                    </label>

                    <br />

                    <input
                        type="text"
                        value={name}
                        onChange={(event) =>
                            setName(event.target.value)
                        }
                        required
                    />
                </div>

                <br />

                <div>
                    <label>
                        Email
                    </label>

                    <br />

                    <input
                        type="email"
                        value={email}
                        onChange={(event) =>
                            setEmail(event.target.value)
                        }
                        required
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
                            setPassword(event.target.value)
                        }
                        required
                        minLength={6}
                    />
                </div>

                <br />

                <button type="submit">
                    Sign Up
                </button>

            </form>

        </div>
    );
}

export default Signup;