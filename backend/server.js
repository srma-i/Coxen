require("dns").setDefaultResultOrder("ipv4first");
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// ==========================================
// ENVIRONMENT VALIDATION
// ==========================================

const requiredEnv = [
  "GEMINI_API_KEY",
  "MONGODB_URI",
  "JWT_SECRET",
  "GMAIL_USER",
  "GMAIL_APP_PASSWORD",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`${key} is missing from backend environment variables.`);
    process.exit(1);
  }
}

// ==========================================
// IMPORT PROJECT MODULES
// ==========================================

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const memoryRoutes = require("./routes/memoryRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const authMiddleware = require("./middleware/authMiddleware");
const errorMiddleware = require("./middleware/errorMiddleware");

const sendEmail = require("./utils/sendEmail");

const {
  migrateMemoryImportance,
  migrateMemoryEmbeddings,
} = require("./services/memoryService");

// ==========================================
// APP CONFIGURATION
// ==========================================

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// CORS CONFIGURATION
// ==========================================

const allowedOrigins = (
  process.env.CLIENT_URL || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header.
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      console.warn("CORS blocked origin:", origin);

      return callback(new Error("Not allowed by CORS"));
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],

    exposedHeaders: [
      "X-Conversation-Id",
    ],

    optionsSuccessStatus: 204,
  })
);

// ==========================================
// BODY PARSING
// ==========================================

app.use(express.json({ limit: "1mb" }));

// ==========================================
// PUBLIC ROUTES
// ==========================================

app.use("/api/auth", authRoutes);

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/", (req, res) => {
  res.json({
    message: "COXEN backend is running!",
    status: "OK",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",

    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",

    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// PROTECTED ROUTES
// ==========================================

app.use("/api/chat", authMiddleware, chatRoutes);

app.use("/api/memory", authMiddleware, memoryRoutes);

app.use(
  "/api/notifications",
  authMiddleware,
  notificationRoutes
);

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use(errorMiddleware);

// ==========================================
// START SERVER
// ==========================================

async function startServer() {
  try {
    // Connect MongoDB.
    await connectDB();

    console.log("MongoDB connected successfully.");

    // Test Gmail SMTP connection.
    // Failure is logged but does not stop the backend.
    const emailConnected = await sendEmail.verifyEmailConnection();

    if (emailConnected) {
      console.log("Gmail SMTP is ready.");
    } else {
      console.warn(
        "Gmail SMTP connection failed. Email sending may not work."
      );
    }

    // Run existing memory migrations.
    await migrateMemoryImportance();

    await migrateMemoryEmbeddings();

    console.log("Memory migrations completed.");

    // Start Express server.
    app.listen(PORT, () => {
      console.log("-----------------------------------");
      console.log("COXEN backend started");
      console.log(`Port: ${PORT}`);
      console.log("Authentication: JWT enabled");
      console.log("User-specific chat and memory: enabled");
      console.log("Persistent conversations: enabled");
      console.log("Streaming chat: enabled");
      console.log("Notifications API: enabled");
      console.log("Gmail SMTP: configured");
      console.log("CORS: configured");
      console.log("-----------------------------------");
    });

  } catch (error) {
    console.error("-----------------------------------");
    console.error("Failed to start server:");
    console.error(error);
    console.error("-----------------------------------");

    process.exit(1);
  }
}

startServer();
