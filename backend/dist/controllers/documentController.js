"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDocuments = exports.createDocument = void 0;
const Document_js_1 = __importDefault(require("../models/Document.js"));
const createDocument = async (req, res) => {
    try {
        const { title, blocks } = req.body;
        const document = await Document_js_1.default.create({
            title, blocks
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
//# sourceMappingURL=documentController.js.map