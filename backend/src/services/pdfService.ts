import PDFDocument from "pdfkit";

import type {
    PdfBlock
} from "./transformationService.js";

// ========================================
// Add Block To PDF
// ========================================

const addBlockToPdf = (
    doc: PDFKit.PDFDocument,
    block: PdfBlock
): void => {

    // ========================================
    // Heading
    // ========================================

    if (
        block.type === "heading"
    ) {

        doc
            .fontSize(20)
            .font("Helvetica-Bold")
            .text(
                block.content
            );

        doc.moveDown(0.5);

    }

    // ========================================
    // Code
    // ========================================

    else if (
        block.type === "code"
    ) {

        doc
            .fontSize(10)
            .font("Courier")
            .text(
                block.content
            );

        doc.moveDown(0.5);

    }

    // ========================================
    // Paragraph
    // ========================================

    else {

        doc
            .fontSize(12)
            .font("Helvetica")
            .text(
                block.content
            );

        doc.moveDown(0.5);
    }

    // ========================================
    // Render Child Blocks
    // ========================================

    for (
        const child of block.children
    ) {

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

    // ========================================
    // Document Title
    // ========================================

    doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .text(
            title
        );

    doc.moveDown(1);

    // ========================================
    // Document Blocks
    // ========================================

    for (
        const block of blocks
    ) {

        addBlockToPdf(
            doc,
            block
        );
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