import {
    signInWithPopup,
    getIdToken,
    signOut
} from "firebase/auth";

import {
    auth,
    googleProvider
} from "../config/firebase";

const API_URL =
    "http://localhost:5000/api/auth";

export const signupWithGoogle =
    async (): Promise<void> => {

        const result =
            await signInWithPopup(
                auth,
                googleProvider
            );

        const idToken =
            await getIdToken(
                result.user
            );

        const response =
            await fetch(
                `${API_URL}/google/signup`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        idToken
                    })
                }
            );

        if (!response.ok) {

            const data =
                await response
                    .json()
                    .catch(() => null);

            /*
             * If Google signup fails because
             * the account already exists,
             * sign out from Firebase as well.
             */
            await signOut(auth);

            throw new Error(
                data?.message ||
                "Google signup failed"
            );
        }
    };

export const loginWithGoogle =
    async (): Promise<void> => {

        const result =
            await signInWithPopup(
                auth,
                googleProvider
            );

        const idToken =
            await getIdToken(
                result.user
            );

        const response =
            await fetch(
                `${API_URL}/google/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        idToken
                    })
                }
            );

        if (!response.ok) {

            const data =
                await response
                    .json()
                    .catch(() => null);

            await signOut(auth);

            throw new Error(
                data?.message ||
                "Google login failed"
            );
        }
    };

export const logoutFromGoogle =
    async (): Promise<void> => {
        await signOut(auth);
    };