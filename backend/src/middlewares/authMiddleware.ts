import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload {
    userId: string;
}

export const protect = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        const token = req.cookies.token;

        if (!token) {
            res.status(401).json({
                message: "Not authenticated"
            });
            return;
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET as string
        ) as JwtPayload;

        req.userId = decoded.userId;

        next();
    } catch (error) {
        res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};