
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error("JWT_SECRET is not configured.");

    return res.status(500).json({
      success: false,
      error: "Authentication service is not configured.",
    });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Authentication required. Please log in.",
    });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Authentication token is missing.",
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (
      typeof decoded !== "object" ||
      typeof decoded.userId !== "string" ||
      !decoded.userId.trim()
    ) {
      return res.status(401).json({
        success: false,
        error: "Invalid authentication token.",
      });
    }

    req.user = {
      id: decoded.userId,
    };

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Your session has expired. Please log in again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        error: "Invalid authentication token.",
      });
    }

    console.error("Authentication error:", error.message);

    return res.status(500).json({
      success: false,
      error: "An authentication error occurred.",
    });
  }
};

module.exports = authMiddleware;
