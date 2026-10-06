"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePdf = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
// ========================================
// Add Block To PDF
// ========================================
const addBlockToPdf = (doc, block) => {
    // ========================================
    // Heading
    // ========================================
    if (block.type === "heading") {
        doc
            .fontSize(20)
            .font("Helvetica-Bold")
            .text(block.content);
        doc.moveDown(0.5);
    }
    // ========================================
    // Code
    // ========================================
    else if (block.type === "code") {
        doc
            .fontSize(10)
            .font("Courier")
            .text(block.content);
        doc.moveDown(0.5);
    }
    // ========================================
    // Paragraph
    // ========================================
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
    // ========================================
    // Document Title
    // ========================================
    doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .text(title);
    doc.moveDown(1);
    // ========================================
    // Document Blocks
    // ========================================
    for (const block of blocks) {
        addBlockToPdf(doc, block);
    }
    // ========================================
    // Do NOT call doc.end() here.
    //
    // The controller will pipe the PDF
    // to the HTTP response and then call
    // doc.end().
    // ========================================
    return doc;
};
exports.generatePdf = generatePdf;
//# sourceMappingURL=pdfService.js.map