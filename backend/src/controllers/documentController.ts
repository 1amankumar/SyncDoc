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

// ========================================
// Add Block To Document
// ========================================

export const addBlockToDocument = async (
    req: Request,
    res: Response
): Promise<void> => {

    try {

        const { id } = req.params;

        const {
            _id,
            type,
            content = "",
            children = []
        } = req.body;

        // --------------------------------
        // Validate block
        // --------------------------------

        if (!_id || !type) {

            res.status(400).json({
                message:
                    "Block ID and type are required"
            });

            return;
        }

        // --------------------------------
        // Find document
        // --------------------------------

        const document =
            await DocumentModel.findById(id);

        if (!document) {

            res.status(404).json({
                message:
                    "Document not found"
            });

            return;
        }

        // --------------------------------
        // Prevent duplicate block
        // --------------------------------

        const blockExists =
            document.blocks.some(
                (block) =>
                    block._id === _id
            );

        if (blockExists) {

            res.status(200).json({
                message:
                    "Block already exists"
            });

            return;
        }

        // --------------------------------
        // Create block
        // --------------------------------

        document.blocks.push({
            _id,
            type,
            content,
            children
        });

        // --------------------------------
        // Save document
        // --------------------------------

        await document.save();

        res.status(201).json({
            message:
                "Block added successfully",
            block: {
                _id,
                type,
                content,
                children
            }
        });

    } catch (error) {

        console.error(
            "Failed to add block:",
            error
        );

        res.status(500).json({
            message:
                "Failed to add block"
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