import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import UserModel from "../models/user";
import crypto from "crypto";
import { firebaseAuth } from "../config/firebaseAdmin";

export const register = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            res.status(400).json({
                message: "Name, email and password are required"
            });
            return;
        }

        const existingUser = await UserModel.findOne({ email });

        if (existingUser) {
            res.status(400).json({
                message: "User already exists"
            });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await UserModel.create({
            name,
            email,
            password: hashedPassword
        });

        const token = jwt.sign(
            {
                userId: user._id
            },
            process.env.JWT_SECRET as string,
            {
                expiresIn: "7d"
            }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Registration failed"
        });
    }
};

export const login = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Check required fields
        if (!email || !password) {
            res.status(400).json({
                message: "Email and password are required"
            });
            return;
        }

        // Find user by email
        const user = await UserModel.findOne({ email });

        if (!user) {
            res.status(401).json({
                message: "Invalid email or password"
            });
            return;
        }

        // Compare password with hashed password
        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password || ""
        );

        if (!isPasswordCorrect) {
            res.status(401).json({
                message: "Invalid email or password"
            });
            return;
        }

        // Create JWT
        const token = jwt.sign(
            {
                userId: user._id
            },
            process.env.JWT_SECRET as string,
            {
                expiresIn: "7d"
            }
        );

        // Store JWT in HTTP-only cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            message: "Login successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Login failed"
        });
    }
};
export const getCurrentUser = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const user = await UserModel.findById(req.userId).select(
            "-password"
        );

        if (!user) {
            res.status(404).json({
                message: "User not found"
            });
            return;
        }

        res.status(200).json({
            user
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to get current user"
        });
    }
};
export const logout = (
    _req: Request,
    res: Response
): void => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: false,
        sameSite: "lax"
    });

    res.status(200).json({
        message: "Logout successful"
    });
};

export const googleSignup = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            res.status(400).json({
                message: "Firebase ID token is required"
            });
            return;
        }

        const decodedToken =
            await firebaseAuth.verifyIdToken(idToken);

        const googleId = decodedToken.uid;
        const email = decodedToken.email;
        const name =
            decodedToken.name ||
            email?.split("@")[0] ||
            "SyncDoc User";

        if (!email) {
            res.status(400).json({
                message: "Google account email not available"
            });
            return;
        }

        // Check whether this Google account already exists
        const existingGoogleUser =
            await UserModel.findOne({
                googleId
            });

        if (existingGoogleUser) {
            res.status(409).json({
                message:
                    "Google account already registered. Please login with Google."
            });
            return;
        }

        // Do not automatically connect Google
        // to an existing email/password account.
        const existingEmailUser =
            await UserModel.findOne({
                email
            });

        if (existingEmailUser) {
            res.status(409).json({
                message:
                    "An account with this email already exists. Please use your existing login."
            });
            return;
        }

        // Create a new Google account
        const user = await UserModel.create({
            name,
            email,
            googleId,
            authProvider: "google"
        });

        const token = jwt.sign(
            {
                userId: user._id
            },
            process.env.JWT_SECRET as string,
            {
                expiresIn: "7d"
            }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge:
                7 * 24 * 60 * 60 * 1000
        });

        res.status(201).json({
            message: "Google signup successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error(
            "Google signup error:",
            error
        );

        res.status(401).json({
            message: "Google signup failed"
        });
    }
};


export const googleLogin = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            res.status(400).json({
                message: "Firebase ID token is required"
            });
            return;
        }

        const decodedToken =
            await firebaseAuth.verifyIdToken(idToken);

        const googleId = decodedToken.uid;

        // Login ONLY if the Google account
        // already exists in our MongoDB database.
        const user =
            await UserModel.findOne({
                googleId
            });

        if (!user) {
            res.status(404).json({
                message:
                    "Google account not registered. Please sign up with Google first."
            });
            return;
        }

        const token = jwt.sign(
            {
                userId: user._id
            },
            process.env.JWT_SECRET as string,
            {
                expiresIn: "7d"
            }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge:
                7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            message: "Google login successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error(
            "Google login error:",
            error
        );

        res.status(401).json({
            message: "Google authentication failed"
        });
    }
};
