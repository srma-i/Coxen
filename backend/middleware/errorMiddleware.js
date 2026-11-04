
function errorMiddleware(error, req, res, next) {
  console.error("Unhandled server error:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    error: "An unexpected server error occurred.",
  });
}

module.exports = errorMiddleware;
