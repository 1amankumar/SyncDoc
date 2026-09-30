import PDFDocument from "pdfkit";
import type { PdfBlock } from "./transformationService.js";

// ========================================
// Add Block to PDF
// ========================================

const addBlockToPdf = (
    doc: PDFKit.PDFDocument,
    block: PdfBlock
): void => {

    if (block.type === "heading") {

        doc
            .fontSize(20)
            .font("Helvetica-Bold")
            .text(block.content);

        doc.moveDown(0.5);

    } else if (block.type === "code") {

        doc
            .fontSize(10)
            .font("Courier")
            .text(block.content);

        doc.moveDown(0.5);

    } else {

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

        addBlockToPdf(
            doc,
            child
        );
    }
};

// ========================================
// Generate PDF
// ========================================

export const generatePdf = (
    title: string,
    blocks: PdfBlock[]
): PDFKit.PDFDocument => {

    const doc =
        new PDFDocument({
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

        addBlockToPdf(
            doc,
            block
        );
    }

    return doc;
};