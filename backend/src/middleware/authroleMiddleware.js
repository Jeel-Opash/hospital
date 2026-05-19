import { ApiError } from "../utils/ApiError.js";

export const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, "Access Denied: insufficient role"));
    }
    next();
  };
};
