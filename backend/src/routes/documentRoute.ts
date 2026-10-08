import { Router } from "express";

import {
    createDocument,
    getDocuments,
    addBlockToDocument,
    exportDocument,
    shareDocument
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

router.post(
    "/:id/share",
    protect,
    shareDocument
);

export default router;