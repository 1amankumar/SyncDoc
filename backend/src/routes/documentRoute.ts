import { Router } from "express";

import {
    createDocument,
    getDocuments,
    exportDocument
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

router.get(
    "/:id/export",
    protect,
    exportDocument
);

export default router;