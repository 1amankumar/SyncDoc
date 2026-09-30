"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformDocumentToPdf = void 0;
// ========================================
// Transform Single AST Block
// ========================================
const transformBlock = (block) => {
    // ========================================
    // Normalize Block Type
    // ========================================
    let type;
    if (block.type === "heading") {
        type = "heading";
    }
    else if (block.type === "code") {
        type = "code";
    }
    else {
        type = "paragraph";
    }
    // ========================================
    // Transform Children
    // ========================================
    const children = block.children.map((child) => transformBlock(child));
    // ========================================
    // Return PDF Block
    // ========================================
    return {
        type,
        content: block.content,
        children
    };
};
// ========================================
// Transform Complete AST
// ========================================
const transformDocumentToPdf = (title, blocks) => {
    return {
        title,
        blocks: blocks.map((block) => transformBlock(block))
    };
};
exports.transformDocumentToPdf = transformDocumentToPdf;
//# sourceMappingURL=transformationService.js.map