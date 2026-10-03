import { Request, Response } from "express";
import DocumentModel from "../models/Document.js";
import {
    transformDocumentToPdf
} from "../services/transformationService.js";
import { generatePdf } from "../services/pdfService.js";

import {
    sanitizeBlockTree
} from "../services/sanitizationService.js";

export const createDocument = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { title, blocks } = req.body;

const sanitizedBlocks =
    sanitizeBlockTree(blocks || []);

       const document = await DocumentModel.create({
    title,
    blocks: sanitizedBlocks
});

        res.status(201).json(document);

    } catch (error) {

        res.status(500).json({
            message: "Failed to create document"
        });
    }
};

export const getDocuments = async (
    _req: Request,
    res: Response
): Promise<void> => {
    try {

        const documents =
            await DocumentModel.find();

        res.status(200).json(documents);

    } catch (error) {

        res.status(500).json({
            message: "Failed to fetch documents"
        });
    }
};

// ========================================
// Export Document
// ========================================

export const exportDocument = async (
    req: Request,
    res: Response
): Promise<void> => {

    try {

        const { id } = req.params;

        const document =
            await DocumentModel.findById(id);

        if (!document) {

            res.status(404).json({
                message: "Document not found"
            });

            return;
        }

        // Transform MongoDB AST
        const transformedDocument =
            transformDocumentToPdf(
                document.title,
                document.blocks
            );

        // Generate PDF
        const pdf =
            generatePdf(
                transformedDocument.title,
                transformedDocument.blocks
            );

        // Tell browser that response is a PDF
        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${document.title}.pdf"`
        );

        // Send PDF to browser
        pdf.pipe(res);

        pdf.end();

    } catch (error) {

        console.error(
            "PDF export failed:",
            error
        );

        res.status(500).json({
            message: "Failed to export document"
        });
    }
};