import { Router } from "express";

import {
    createDocument,
    getDocuments,
    addBlockToDocument,
    exportDocument,
    shareDocument,
    getCollaborators,
    updateCollaboratorPermission,
    removeCollaborator
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

// ========================================
// Share Document
// ========================================

router.post(
    "/:id/share",
    protect,
    shareDocument
);

// ========================================
// Get Collaborators
// ========================================

router.get(
    "/:id/collaborators",
    protect,
    getCollaborators
);

// ========================================
// Update Collaborator Permission
// ========================================

router.patch(
    "/:id/collaborators/:userId",
    protect,
    updateCollaboratorPermission
);

// ========================================
// Remove Collaborator
// ========================================

router.delete(
    "/:id/collaborators/:userId",
    protect,
    removeCollaborator
);

export default router;