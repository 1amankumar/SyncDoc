import { Router } from "express";
import {
    createDocument,
    getDocuments
} from "../controllers/documentController.js";

const router = Router()

router.post("/", createDocument);
router.get("/", getDocuments);

export default router;