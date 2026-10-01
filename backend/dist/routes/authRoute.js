"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.post("/register", authController_1.register);
router.post("/login", authController_1.login);
router.post("/google/signup", authController_1.googleSignup);
router.post("/google/login", authController_1.googleLogin);
router.get("/me", authMiddleware_1.protect, authController_1.getCurrentUser);
router.post("/logout", authController_1.logout);
exports.default = router;
//# sourceMappingURL=authRoute.js.map