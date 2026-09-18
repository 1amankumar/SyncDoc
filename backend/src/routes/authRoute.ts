import { Router } from "express";
import { register,login,getCurrentUser,logout } from "../controllers/authController";
import { protect } from "../middlewares/authMiddleware";
const router=Router();
router.post("/register",register);
router.post("/login",login);
router.get("/me",protect,getCurrentUser);
router.post("/logout",logout);
export default router;