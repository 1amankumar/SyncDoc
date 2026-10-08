"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportDocument = exports.addBlockToDocument = exports.getDocuments = exports.createDocument = void 0;
const Document_js_1 = __importDefault(require("../models/Document.js"));
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
// Get User's Documents
// ========================================
const getDocuments = async (req, res) => {
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
        const documents = await Document_js_1.default.find({
            owner: req.userId
        }).sort({
            updatedAt: -1
        });
        res.status(200).json(documents);
    }
    catch (error) {
        console.error("Failed to fetch documents:", error);
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
//# sourceMappingURL=documentController.js.map