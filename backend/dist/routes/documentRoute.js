"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const documentController_js_1 = require("../controllers/documentController.js");
const authMiddleware_js_1 = require("../middlewares/authMiddleware.js");
const router = (0, express_1.Router)();
// ========================================
// Create Document
// ========================================
router.post("/", authMiddleware_js_1.protect, documentController_js_1.createDocument);
// ========================================
// Get Documents
// ========================================
router.get("/", authMiddleware_js_1.protect, documentController_js_1.getDocuments);
// ========================================
// Add Block To Document
// ========================================
router.post("/:id/blocks", authMiddleware_js_1.protect, documentController_js_1.addBlockToDocument);
// ========================================
// Export Document
// ========================================
router.get("/:id/export", authMiddleware_js_1.protect, documentController_js_1.exportDocument);
// ========================================
// Share Document
// ========================================
router.post("/:id/share", authMiddleware_js_1.protect, documentController_js_1.shareDocument);
// ========================================
// Get Collaborators
// ========================================
router.get("/:id/collaborators", authMiddleware_js_1.protect, documentController_js_1.getCollaborators);
// ========================================
// Update Collaborator Permission
// ========================================
router.patch("/:id/collaborators/:userId", authMiddleware_js_1.protect, documentController_js_1.updateCollaboratorPermission);
// ========================================
// Remove Collaborator
// ========================================
router.delete("/:id/collaborators/:userId", authMiddleware_js_1.protect, documentController_js_1.removeCollaborator);
exports.default = router;
//# sourceMappingURL=documentRoute.js.map