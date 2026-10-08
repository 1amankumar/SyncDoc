import { Request, Response } from "express";
import DocumentModel from "../models/Document.js";
import UserModel from "../models/user.js";

import {
    transformDocumentToPdf
} from "../services/transformationService.js";

import { generatePdf } from "../services/pdfService.js";

import {
    sanitizeBlockTree
} from "../services/sanitizationService.js";

// ========================================
// Create Document
// ========================================

export const createDocument = async (
    req: Request,
    res: Response
): Promise<void> => {

    try {

        // --------------------------------
        // Check authenticated user
        // --------------------------------

        if (!req.userId) {

            res.status(401).json({
                message: "Not authenticated"
            });

            return;
        }

        const {
            title,
            blocks
        } = req.body;

        // --------------------------------
        // Sanitize blocks
        // --------------------------------

        const sanitizedBlocks =
            sanitizeBlockTree(
                blocks || []
            );

        // --------------------------------
        // Create document
        // --------------------------------

        const document =
            await DocumentModel.create({
                title,
                blocks: sanitizedBlocks,

                // IMPORTANT:
                // Store logged-in user as owner
                owner: req.userId
            });

        res.status(201).json(
            document
        );

    } catch (error) {

        console.error(
            "Failed to create document:",
            error
        );

        res.status(500).json({
            message:
                "Failed to create document"
        });
    }
};

// ========================================
// Get User's Documents
// ========================================

export const getDocuments = async (
    req: Request,
    res: Response
): Promise<void> => {

    try {

        // --------------------------------
        // Check authenticated user
        // --------------------------------

        if (!req.userId) {

            res.status(401).json({
                message: "Not authenticated"
            });

            return;
        }

        // --------------------------------
        // Get ONLY user's documents
        // --------------------------------

        const documents =
            await DocumentModel.find({
                owner: req.userId
            }).sort({
                updatedAt: -1
            });

        res.status(200).json(
            documents
        );

    } catch (error) {

        console.error(
            "Failed to fetch documents:",
            error
        );

        res.status(500).json({
            message:
                "Failed to fetch documents"
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

        // --------------------------------
        // Check authentication
        // --------------------------------

        if (!req.userId) {

            res.status(401).json({
                message: "Not authenticated"
            });

            return;
        }

        const {
            id
        } = req.params;

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
        // Find document owned by user
        // --------------------------------

        const document =
            await DocumentModel.findOne({
                _id: id,
                owner: req.userId
            });

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

// ========================================
// Export Document
// ========================================

export const exportDocument = async (
    req: Request,
    res: Response
): Promise<void> => {

    try {

        // --------------------------------
        // Check authentication
        // --------------------------------

        if (!req.userId) {

            res.status(401).json({
                message: "Not authenticated"
            });

            return;
        }

        const {
            id
        } = req.params;

        // --------------------------------
        // Find document owned by user
        // --------------------------------

        const document =
            await DocumentModel.findOne({
                _id: id,
                owner: req.userId
            });

        if (!document) {

            res.status(404).json({
                message:
                    "Document not found"
            });

            return;
        }

        // --------------------------------
        // Transform MongoDB AST
        // --------------------------------

        const transformedDocument =
            transformDocumentToPdf(
                document.title,
                document.blocks
            );

        // --------------------------------
        // Generate PDF
        // --------------------------------

        const pdf =
            generatePdf(
                transformedDocument.title,
                transformedDocument.blocks
            );

        // --------------------------------
        // PDF headers
        // --------------------------------

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${document.title}.pdf"`
        );

        // --------------------------------
        // Send PDF
        // --------------------------------

        pdf.pipe(res);

        pdf.end();

    } catch (error) {

        console.error(
            "PDF export failed:",
            error
        );

        res.status(500).json({
            message:
                "Failed to export document"
        });
    }
};

// ========================================
// Share Document
// ========================================

export const shareDocument = async (
    req: Request,
    res: Response
): Promise<void> => {

    try {

        // --------------------------------
        // Check authentication
        // --------------------------------

        if (!req.userId) {

            res.status(401).json({
                message: "Not authenticated"
            });

            return;
        }

        // --------------------------------
        // Get document ID
        // --------------------------------

        const documentId =
            req.params.id;

        // --------------------------------
        // Get request data
        // --------------------------------

        const {
            email,
            permission
        } = req.body;

        // --------------------------------
        // Validate email
        // --------------------------------

        if (!email) {

            res.status(400).json({
                message: "User email is required"
            });

            return;
        }

        // --------------------------------
        // Validate permission
        // --------------------------------

        if (
            permission !== "view" &&
            permission !== "edit"
        ) {

            res.status(400).json({
                message:
                    "Permission must be view or edit"
            });

            return;
        }

        // --------------------------------
        // Find document owned by user
        // --------------------------------

        const document =
            await DocumentModel.findOne({
                _id: documentId,
                owner: req.userId
            });

        if (!document) {

            res.status(404).json({
                message:
                    "Document not found or you are not the owner"
            });

            return;
        }

        // --------------------------------
        // Find user by email
        // --------------------------------

        const user =
            await UserModel.findOne({
                email: email.toLowerCase().trim()
            });

        if (!user) {

            res.status(404).json({
                message:
                    "User with this email does not exist"
            });

            return;
        }

        // --------------------------------
        // Prevent sharing with yourself
        // --------------------------------

        if (
            user._id.toString() ===
            req.userId
        ) {

            res.status(400).json({
                message:
                    "You cannot share a document with yourself"
            });

            return;
        }

        // --------------------------------
        // Check existing collaborator
        // --------------------------------

        const existingCollaborator =
            document.collaborators.find(
                (collaborator) =>
                    collaborator.user.toString() ===
                    user._id.toString()
            );

        // --------------------------------
        // Update existing collaborator
        // --------------------------------

        if (existingCollaborator) {

            existingCollaborator.permission =
                permission;

        }

        // --------------------------------
        // Add new collaborator
        // --------------------------------

        else {

            document.collaborators.push({
                user: user._id,
                permission
            });
        }

        // --------------------------------
        // Save document
        // --------------------------------

        await document.save();

        // --------------------------------
        // Response
        // --------------------------------

        res.status(200).json({
            message:
                "Document shared successfully",

            collaborator: {
                id: user._id,
                name: user.name,
                email: user.email,
                permission
            }
        });

    } catch (error) {

        console.error(
            "Share document error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to share document"
        });
    }
};