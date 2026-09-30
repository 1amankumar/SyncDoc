"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.getCurrentUser = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_1 = __importDefault(require("../models/user"));
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
//# sourceMappingURL=authController.js.map