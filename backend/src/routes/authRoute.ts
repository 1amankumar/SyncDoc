import { Router } from "express";

import {
    register,
    login,
    googleSignup,
    googleLogin,
    getCurrentUser,
    logout
} from "../controllers/authController";

import { protect } from "../middlewares/authMiddleware";

const router = Router();

router.post(
    "/register",
    register
);

router.post(
    "/login",
    login
);

router.post(
    "/google/signup",
    googleSignup
);

router.post(
    "/google/login",
    googleLogin
);

router.get(
    "/me",
    protect,
    getCurrentUser
);

router.post(
    "/logout",
    logout
);

export default router;