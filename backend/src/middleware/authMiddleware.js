import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";

export const authMiddleware = (req, res, next) => {
  const bearerToken = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : null;
  const token = req.cookies?.token || bearerToken;

  if (!token) {
    return next(new ApiError(401, "Access denied. No token provided."));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return next(new ApiError(401, "Invalid or expired token."));
  }
};
