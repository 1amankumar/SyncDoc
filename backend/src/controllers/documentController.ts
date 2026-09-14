import { Request, Response } from "express";
import DocumentModel from "../models/Document.js";

export const createDocument = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { title, blocks } = req.body;
        const document = await DocumentModel.create({
            title, blocks
        });
        res.status(201).json(document);

    } catch (error) {
        res.status(500).json({
            message: "Failed to create document"
        })
    }
}

export const getDocuments = async (
    _req: Request,
    res: Response
): Promise<void> => {
    try {
        const documents = await DocumentModel.find();

        res.status(200).json(documents);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch documents"
        });
    }
};