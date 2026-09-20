export interface CurrentUser {
    _id: string;
    name: string;
    email: string;
}

const API_URL = "http://localhost:5000/api/auth";

export const getCurrentUser =
    async (): Promise<CurrentUser> => {

        const response = await fetch(
            `${API_URL}/me`,
            {
                credentials: "include"
            }
        );

        if (!response.ok) {
            throw new Error(
                "User is not authenticated"
            );
        }

        const data = await response.json();

        return data.user;
    };

    export const logout = async (): Promise<void> => {
    const response = await fetch(
         `${API_URL}/logout`,
        {
            method: "POST",
            credentials: "include"
        }
    );

    if (!response.ok) {
        throw new Error("Logout failed");
    }
};