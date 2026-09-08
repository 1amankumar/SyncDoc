import express from "express";
import cors from "cors";

//import documentRoutes from "./routes/documentRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
    res.json({
        message: "SyncDoc API is running"
    });
});

//app.use("/api/documents", documentRoutes);

export default app;