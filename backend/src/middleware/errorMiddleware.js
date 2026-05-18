const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || [];

  if (err.name === "ValidationError") {
    statusCode = 400;
    errors = Object.values(err.errors).map((error) => error.message);
    message = errors[0] || "Validation failed";
  }

  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  if (err.code === 11000) {
    statusCode = 409;
    const fields = Object.keys(err.keyValue || {}).join(", ");
    message = fields
      ? `Duplicate value for ${fields}`
      : "Duplicate value already exists";
  }

  res.status(statusCode).json({
    statusCode,
    success: false,
    message,
    errors,
  });
};

export default errorHandler;
