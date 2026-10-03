"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeBlockTree = exports.sanitizeBlockContent = void 0;
const jsdom_1 = require("jsdom");
const dompurify_1 = __importDefault(require("dompurify"));
const window = new jsdom_1.JSDOM("").window;
const DOMPurify = (0, dompurify_1.default)(window);
const sanitizeBlockContent = (content) => {
    return DOMPurify.sanitize(content, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
    });
};
exports.sanitizeBlockContent = sanitizeBlockContent;
const sanitizeBlockTree = (blocks) => {
    return blocks.map((block) => ({
        ...block,
        content: (0, exports.sanitizeBlockContent)(block.content),
        children: block.children &&
            block.children.length > 0
            ? (0, exports.sanitizeBlockTree)(block.children)
            : []
    }));
};
exports.sanitizeBlockTree = sanitizeBlockTree;
//# sourceMappingURL=sanitizationService.js.map