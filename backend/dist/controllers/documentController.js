"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeCollaborator = exports.updateCollaboratorPermission = exports.getCollaborators = exports.shareDocument = exports.exportDocument = exports.addBlockToDocument = exports.getDocuments = exports.createDocument = void 0;
const Document_js_1 = __importDefault(require("../models/Document.js"));
const user_js_1 = __importDefault(require("../models/user.js"));
const transformationService_js_1 = require("../services/transformationService.js");
const pdfService_js_1 = require("../services/pdfService.js");
const sanitizationService_js_1 = require("../services/sanitizationService.js");
// ========================================
// Create Document
// ========================================
const createDocument = async (req, res) => {
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
        const { title, blocks } = req.body;
        // --------------------------------
        // Sanitize blocks
        // --------------------------------
        const sanitizedBlocks = (0, sanitizationService_js_1.sanitizeBlockTree)(blocks || []);
        // --------------------------------
        // Create document
        // --------------------------------
        const document = await Document_js_1.default.create({
            title,
            blocks: sanitizedBlocks,
            // IMPORTANT:
            // Store logged-in user as owner
            owner: req.userId
        });
        res.status(201).json(document);
    }
    catch (error) {
        console.error("Failed to create document:", error);
        res.status(500).json({
            message: "Failed to create document"
        });
    }
};
exports.createDocument = createDocument;
// ========================================
// Get Documents
// ========================================
const getDocuments = async (req, res) => {
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
        // Get owned + shared documents
        // --------------------------------
        const documents = await Document_js_1.default.find({
            $or: [
                {
                    owner: req.userId
                },
                {
                    "collaborators.user": req.userId
                }
            ]
        })
            .sort({
            updatedAt: -1
        })
            .lean();
        // --------------------------------
        // Normalize old documents
        // --------------------------------
        const normalizedDocuments = documents.map((document) => ({
            ...document,
            collaborators: document.collaborators || [],
            blocks: document.blocks || []
        }));
        // --------------------------------
        // Return documents
        // --------------------------------
        res.status(200).json(normalizedDocuments);
    }
    catch (error) {
        console.error("Get documents error:", error);
        res.status(500).json({
            message: "Failed to fetch documents"
        });
    }
};
exports.getDocuments = getDocuments;
// ========================================
// Add Block To Document
// ========================================
const addBlockToDocument = async (req, res) => {
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
        const { id } = req.params;
        const { _id, type, content = "", children = [] } = req.body;
        // --------------------------------
        // Validate block
        // --------------------------------
        if (!_id || !type) {
            res.status(400).json({
                message: "Block ID and type are required"
            });
            return;
        }
        // --------------------------------
        // Find document owned by user
        // --------------------------------
        const document = await Document_js_1.default.findOne({
            _id: id,
            owner: req.userId
        });
        if (!document) {
            res.status(404).json({
                message: "Document not found"
            });
            return;
        }
        // --------------------------------
        // Prevent duplicate block
        // --------------------------------
        const blockExists = document.blocks.some((block) => block._id === _id);
        if (blockExists) {
            res.status(200).json({
                message: "Block already exists"
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
            message: "Block added successfully",
            block: {
                _id,
                type,
                content,
                children
            }
        });
    }
    catch (error) {
        console.error("Failed to add block:", error);
        res.status(500).json({
            message: "Failed to add block"
        });
    }
};
exports.addBlockToDocument = addBlockToDocument;
// ========================================
// Export Document
// ========================================
const exportDocument = async (req, res) => {
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
        const { id } = req.params;
        // --------------------------------
        // Find document owned by user
        // --------------------------------
        const document = await Document_js_1.default.findOne({
            _id: id,
            owner: req.userId
        });
        if (!document) {
            res.status(404).json({
                message: "Document not found"
            });
            return;
        }
        // --------------------------------
        // Transform MongoDB AST
        // --------------------------------
        const transformedDocument = (0, transformationService_js_1.transformDocumentToPdf)(document.title, document.blocks);
        // --------------------------------
        // Generate PDF
        // --------------------------------
        const pdf = (0, pdfService_js_1.generatePdf)(transformedDocument.title, transformedDocument.blocks);
        // --------------------------------
        // PDF headers
        // --------------------------------
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${document.title}.pdf"`);
        // --------------------------------
        // Send PDF
        // --------------------------------
        pdf.pipe(res);
        pdf.end();
    }
    catch (error) {
        console.error("PDF export failed:", error);
        res.status(500).json({
            message: "Failed to export document"
        });
    }
};
exports.exportDocument = exportDocument;
// ========================================
// Share Document
// ========================================
const shareDocument = async (req, res) => {
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
        const documentId = req.params.id;
        // --------------------------------
        // Get request data
        // --------------------------------
        const { email, permission } = req.body;
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
        if (permission !== "view" &&
            permission !== "edit") {
            res.status(400).json({
                message: "Permission must be view or edit"
            });
            return;
        }
        // --------------------------------
        // Find document owned by user
        // --------------------------------
        const document = await Document_js_1.default.findOne({
            _id: documentId,
            owner: req.userId
        });
        if (!document) {
            res.status(404).json({
                message: "Document not found or you are not the owner"
            });
            return;
        }
        // --------------------------------
        // Find user by email
        // --------------------------------
        const user = await user_js_1.default.findOne({
            email: email.toLowerCase().trim()
        });
        if (!user) {
            res.status(404).json({
                message: "User with this email does not exist"
            });
            return;
        }
        // --------------------------------
        // Prevent sharing with yourself
        // --------------------------------
        if (user._id.toString() ===
            req.userId) {
            res.status(400).json({
                message: "You cannot share a document with yourself"
            });
            return;
        }
        // --------------------------------
        // Check existing collaborator
        // --------------------------------
        const existingCollaborator = document.collaborators.find((collaborator) => collaborator.user.toString() ===
            user._id.toString());
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
            message: "Document shared successfully",
            collaborator: {
                id: user._id,
                name: user.name,
                email: user.email,
                permission
            }
        });
    }
    catch (error) {
        console.error("Share document error:", error);
        res.status(500).json({
            message: "Failed to share document"
        });
    }
};
exports.shareDocument = shareDocument;
// ========================================
// Get Collaborators
// ========================================
const getCollaborators = async (req, res) => {
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
        const { id } = req.params;
        // --------------------------------
        // Find document owned by user
        // --------------------------------
        const document = await Document_js_1.default.findOne({
            _id: id,
            owner: req.userId
        });
        if (!document) {
            res.status(404).json({
                message: "Document not found or you are not the owner"
            });
            return;
        }
        // --------------------------------
        // Get collaborator user details
        // --------------------------------
        const collaborators = await Promise.all(document.collaborators.map(async (collaborator) => {
            const user = await user_js_1.default.findById(collaborator.user).select("name email");
            if (!user) {
                return null;
            }
            return {
                id: user._id,
                name: user.name,
                email: user.email,
                permission: collaborator.permission
            };
        }));
        // Remove null users
        const validCollaborators = collaborators.filter((collaborator) => collaborator !== null);
        res.status(200).json({
            collaborators: validCollaborators
        });
    }
    catch (error) {
        console.error("Get collaborators error:", error);
        res.status(500).json({
            message: "Failed to get collaborators"
        });
    }
};
exports.getCollaborators = getCollaborators;
// ========================================
// Update Collaborator Permission
// ========================================
const updateCollaboratorPermission = async (req, res) => {
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
        const { id, userId } = req.params;
        const { permission } = req.body;
        // --------------------------------
        // Validate permission
        // --------------------------------
        if (permission !== "view" &&
            permission !== "edit") {
            res.status(400).json({
                message: "Permission must be view or edit"
            });
            return;
        }
        // --------------------------------
        // Find document owned by user
        // --------------------------------
        const document = await Document_js_1.default.findOne({
            _id: id,
            owner: req.userId
        });
        if (!document) {
            res.status(404).json({
                message: "Document not found or you are not the owner"
            });
            return;
        }
        // --------------------------------
        // Find collaborator
        // --------------------------------
        const collaborator = document.collaborators.find((item) => item.user.toString() === userId);
        if (!collaborator) {
            res.status(404).json({
                message: "Collaborator not found"
            });
            return;
        }
        // --------------------------------
        // Update permission
        // --------------------------------
        collaborator.permission = permission;
        await document.save();
        // --------------------------------
        // Get updated user
        // --------------------------------
        const user = await user_js_1.default.findById(userId).select("name email");
        res.status(200).json({
            message: "Collaborator permission updated successfully",
            collaborator: {
                id: userId,
                name: user?.name,
                email: user?.email,
                permission
            }
        });
    }
    catch (error) {
        console.error("Update collaborator permission error:", error);
        res.status(500).json({
            message: "Failed to update collaborator permission"
        });
    }
};
exports.updateCollaboratorPermission = updateCollaboratorPermission;
// ========================================
// Remove Collaborator
// ========================================
const removeCollaborator = async (req, res) => {
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
        const { id, userId } = req.params;
        // --------------------------------
        // Find document owned by user
        // --------------------------------
        const document = await Document_js_1.default.findOne({
            _id: id,
            owner: req.userId
        });
        if (!document) {
            res.status(404).json({
                message: "Document not found or you are not the owner"
            });
            return;
        }
        // --------------------------------
        // Find collaborator
        // --------------------------------
        const collaboratorExists = document.collaborators.some((item) => item.user.toString() === userId);
        if (!collaboratorExists) {
            res.status(404).json({
                message: "Collaborator not found"
            });
            return;
        }
        // --------------------------------
        // Remove collaborator
        // --------------------------------
        document.collaborators =
            document.collaborators.filter((item) => item.user.toString() !== userId);
        await document.save();
        res.status(200).json({
            message: "Collaborator removed successfully"
        });
    }
    catch (error) {
        console.error("Remove collaborator error:", error);
        res.status(500).json({
            message: "Failed to remove collaborator"
        });
    }
};
exports.removeCollaborator = removeCollaborator;
//# sourceMappingURL=documentController.js.map