"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sanitizationService_js_1 = require("./services/sanitizationService.js");
const unsafeContent = `<script>alert("XSS")</script>Hello SyncDoc`;
const safeContent = (0, sanitizationService_js_1.sanitizeBlockContent)(unsafeContent);
console.log("Original:");
console.log(unsafeContent);
console.log("\nSanitized:");
console.log(safeContent);
//# sourceMappingURL=testSanitization.js.map