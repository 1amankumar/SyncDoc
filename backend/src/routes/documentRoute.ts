import { Router } from "express";

import {
    createDocument,
    getDocuments,
    exportDocument,
    addBlockToDocument
} from "../controllers/documentController.js";

import { protect } from "../middlewares/authMiddleware.js";

const router = Router();

// ========================================
// Create Document
// ========================================

router.post(
    "/",
    protect,
    createDocument
);

// ========================================
// Get Documents
// ========================================

router.get(
    "/",
    protect,
    getDocuments
);

// ========================================
// Add Block To Document
// ========================================

router.post(
    "/:id/blocks",
    protect,
    addBlockToDocument
);

// ========================================
// Export Document
// ========================================

router.get(
    "/:id/export",
    protect,
    exportDocument
);

export default router;