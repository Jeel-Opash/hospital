import { ApiResponse } from "../utils/ApiResponse.js";

export const responseMiddleware = (req, res, next) => {
  res.success = (data = null, message = "Success", statusCode = 200) =>
    res.status(statusCode).json(new ApiResponse(statusCode, data, message));

  res.created = (data = null, message = "Created successfully") =>
    res.success(data, message, 201);

  res.fail = (message = "Request failed", statusCode = 400, errors = []) =>
    res.status(statusCode).json({
      statusCode,
      data: null,
      message,
      success: false,
      errors,
    });

  next();
};
