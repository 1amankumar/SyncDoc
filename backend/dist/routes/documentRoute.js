"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const documentController_js_1 = require("../controllers/documentController.js");
const authMiddleware_js_1 = require("../middlewares/authMiddleware.js");
const router = (0, express_1.Router)();
router.post("/", authMiddleware_js_1.protect, documentController_js_1.createDocument);
router.get("/", authMiddleware_js_1.protect, documentController_js_1.getDocuments);
router.get("/:id/export", authMiddleware_js_1.protect, documentController_js_1.exportDocument);
exports.default = router;
//# sourceMappingURL=documentRoute.js.map