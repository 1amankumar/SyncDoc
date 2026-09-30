"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportDocument = exports.getDocuments = exports.createDocument = void 0;
const Document_js_1 = __importDefault(require("../models/Document.js"));
const transformationService_js_1 = require("../services/transformationService.js");
const pdfService_js_1 = require("../services/pdfService.js");
const createDocument = async (req, res) => {
    try {
        const { title, blocks } = req.body;
        const document = await Document_js_1.default.create({
            title,
            blocks
        });
        res.status(201).json(document);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to create document"
        });
    }
};
exports.createDocument = createDocument;
const getDocuments = async (_req, res) => {
    try {
        const documents = await Document_js_1.default.find();
        res.status(200).json(documents);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch documents"
        });
    }
};
exports.getDocuments = getDocuments;
// ========================================
// Export Document
// ========================================
const exportDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const document = await Document_js_1.default.findById(id);
        if (!document) {
            res.status(404).json({
                message: "Document not found"
            });
            return;
        }
        // Transform MongoDB AST
        const transformedDocument = (0, transformationService_js_1.transformDocumentToPdf)(document.title, document.blocks);
        // Generate PDF
        const pdf = (0, pdfService_js_1.generatePdf)(transformedDocument.title, transformedDocument.blocks);
        // Tell browser that response is a PDF
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${document.title}.pdf"`);
        // Send PDF to browser
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