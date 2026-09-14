"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const documentController_js_1 = require("../controllers/documentController.js");
const router = (0, express_1.Router)();
router.post("/", documentController_js_1.createDocument);
router.get("/", documentController_js_1.getDocuments);
exports.default = router;
//# sourceMappingURL=documentRoute.js.map