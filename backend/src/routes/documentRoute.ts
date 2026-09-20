import { Router } from "express";

import {
    createDocument,
    getDocuments
} from "../controllers/documentController.js";

import { protect } from "../middlewares/authMiddleware.js";

const router = Router();

router.post(
    "/",
    protect,
    createDocument
);

router.get(
    "/",
    protect,
    getDocuments
);

export default router;