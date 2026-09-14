import express from "express";
import cors from "cors";
import documentRoute from "./routes/documentRoute";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
    res.json({
        message: "SyncDoc API is running"
    });
});

app.use("/api/documents", documentRoute);

export default app;