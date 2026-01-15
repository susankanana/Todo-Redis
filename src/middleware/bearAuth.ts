import jwt from "jsonwebtoken";
import "dotenv/config";
import { Request, Response, NextFunction } from "express";
import { verifySession } from "../auth/auth.redis";

export const checkRoles = (requiredRole: "admin" | "user" | "both") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;

      // verify session in Redis
      const validSession = await verifySession(decoded.id, token);
      if (!validSession) {
        return res.status(401).json({ message: "Session expired or invalid" });
      }

      (req as any).user = decoded;

      // check roles
      const userRole = decoded.role;
      if (requiredRole === "both" || userRole === requiredRole) {
        return next();
      }

      return res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
      return res.status(401).json({ message: "Invalid Token" });
    }
  };
};

export const adminRoleAuth = checkRoles("admin")
export const userRoleAuth = checkRoles("user")
export const bothRoleAuth = checkRoles("both")
