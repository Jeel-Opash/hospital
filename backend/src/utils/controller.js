import { asyncHandler } from "./asyncHandler.js";

export const ok = (data = null, message = "Success") => ({
  data,
  message,
  statusCode: 200,
});

export const created = (data = null, message = "Created successfully") => ({
  data,
  message,
  statusCode: 201,
});

export const fail = (message = "Request failed", statusCode = 400, errors = []) => ({
  errors,
  message,
  statusCode,
  success: false,
});

export const controller = (handler) =>
  asyncHandler(async (req, res, next) => {
    const result = await handler(req, res, next);

    if (res.headersSent || result === undefined) {
      return result;
    }

    if (result.success === false) {
      return res.fail(result.message, result.statusCode, result.errors);
    }

    return res.success(result.data, result.message, result.statusCode);
  });
