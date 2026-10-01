"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleLogin = exports.googleSignup = exports.logout = exports.getCurrentUser = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_1 = __importDefault(require("../models/user"));
const firebaseAdmin_1 = require("../config/firebaseAdmin");
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({
                message: "Name, email and password are required"
            });
            return;
        }
        const existingUser = await user_1.default.findOne({ email });
        if (existingUser) {
            res.status(400).json({
                message: "User already exists"
            });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await user_1.default.create({
            name,
            email,
            password: hashedPassword
        });
        const token = jsonwebtoken_1.default.sign({
            userId: user._id
        }, process.env.JWT_SECRET, {
            expiresIn: "7d"
        });
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Registration failed"
        });
    }
};
exports.register = register;
const login = async (req, res) => {
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
        const user = await user_1.default.findOne({ email });
        if (!user) {
            res.status(401).json({
                message: "Invalid email or password"
            });
            return;
        }
        // Compare password with hashed password
        const isPasswordCorrect = await bcryptjs_1.default.compare(password, user.password || "");
        if (!isPasswordCorrect) {
            res.status(401).json({
                message: "Invalid email or password"
            });
            return;
        }
        // Create JWT
        const token = jsonwebtoken_1.default.sign({
            userId: user._id
        }, process.env.JWT_SECRET, {
            expiresIn: "7d"
        });
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Login failed"
        });
    }
};
exports.login = login;
const getCurrentUser = async (req, res) => {
    try {
        const user = await user_1.default.findById(req.userId).select("-password");
        if (!user) {
            res.status(404).json({
                message: "User not found"
            });
            return;
        }
        res.status(200).json({
            user
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to get current user"
        });
    }
};
exports.getCurrentUser = getCurrentUser;
const logout = (_req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: false,
        sameSite: "lax"
    });
    res.status(200).json({
        message: "Logout successful"
    });
};
exports.logout = logout;
const googleSignup = async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            res.status(400).json({
                message: "Firebase ID token is required"
            });
            return;
        }
        const decodedToken = await firebaseAdmin_1.firebaseAuth.verifyIdToken(idToken);
        const googleId = decodedToken.uid;
        const email = decodedToken.email;
        const name = decodedToken.name ||
            email?.split("@")[0] ||
            "SyncDoc User";
        if (!email) {
            res.status(400).json({
                message: "Google account email not available"
            });
            return;
        }
        // Check whether this Google account already exists
        const existingGoogleUser = await user_1.default.findOne({
            googleId
        });
        if (existingGoogleUser) {
            res.status(409).json({
                message: "Google account already registered. Please login with Google."
            });
            return;
        }
        // Do not automatically connect Google
        // to an existing email/password account.
        const existingEmailUser = await user_1.default.findOne({
            email
        });
        if (existingEmailUser) {
            res.status(409).json({
                message: "An account with this email already exists. Please use your existing login."
            });
            return;
        }
        // Create a new Google account
        const user = await user_1.default.create({
            name,
            email,
            googleId,
            authProvider: "google"
        });
        const token = jsonwebtoken_1.default.sign({
            userId: user._id
        }, process.env.JWT_SECRET, {
            expiresIn: "7d"
        });
        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.status(201).json({
            message: "Google signup successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    }
    catch (error) {
        console.error("Google signup error:", error);
        res.status(401).json({
            message: "Google signup failed"
        });
    }
};
exports.googleSignup = googleSignup;
const googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            res.status(400).json({
                message: "Firebase ID token is required"
            });
            return;
        }
        const decodedToken = await firebaseAdmin_1.firebaseAuth.verifyIdToken(idToken);
        const googleId = decodedToken.uid;
        // Login ONLY if the Google account
        // already exists in our MongoDB database.
        const user = await user_1.default.findOne({
            googleId
        });
        if (!user) {
            res.status(404).json({
                message: "Google account not registered. Please sign up with Google first."
            });
            return;
        }
        const token = jsonwebtoken_1.default.sign({
            userId: user._id
        }, process.env.JWT_SECRET, {
            expiresIn: "7d"
        });
        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.status(200).json({
            message: "Google login successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    }
    catch (error) {
        console.error("Google login error:", error);
        res.status(401).json({
            message: "Google authentication failed"
        });
    }
};
exports.googleLogin = googleLogin;
//# sourceMappingURL=authController.js.map