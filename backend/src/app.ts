import express from "express";
import cors from "cors";
import documentRoute from "./routes/documentRoute";
import authRoutes from "./routes/authRoute";
import cookieParser from "cookie-parser";

const app = express();

app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true
    })
);
app.use(express.json());
app.use(cookieParser());

app.get("/", (_req, res) => {
    res.json({
        message: "SyncDoc API is running"
    });
});

app.use("/api/documents", documentRoute);
app.use("/api/auth", authRoutes);

export default app;