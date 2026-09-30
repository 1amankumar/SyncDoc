"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePdf = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
// ========================================
// Add Block to PDF
// ========================================
const addBlockToPdf = (doc, block) => {
    if (block.type === "heading") {
        doc
            .fontSize(20)
            .font("Helvetica-Bold")
            .text(block.content);
        doc.moveDown(0.5);
    }
    else if (block.type === "code") {
        doc
            .fontSize(10)
            .font("Courier")
            .text(block.content);
        doc.moveDown(0.5);
    }
    else {
        doc
            .fontSize(12)
            .font("Helvetica")
            .text(block.content);
        doc.moveDown(0.5);
    }
    // ========================================
    // Render Child Blocks
    // ========================================
    for (const child of block.children) {
        addBlockToPdf(doc, child);
    }
};
// ========================================
// Generate PDF
// ========================================
const generatePdf = (title, blocks) => {
    const doc = new pdfkit_1.default({
        margin: 50
    });
    // Document title
    doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .text(title);
    doc.moveDown(1);
    // Document blocks
    for (const block of blocks) {
        addBlockToPdf(doc, block);
    }
    return doc;
};
exports.generatePdf = generatePdf;
//# sourceMappingURL=pdfService.js.map