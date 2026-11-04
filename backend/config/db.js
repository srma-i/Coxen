
const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    throw new Error("MONGODB_URI is not defined in the environment.");
  }

  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      autoIndex: process.env.NODE_ENV !== "production",
    });

    console.log(`MongoDB connected: ${mongoose.connection.name}`);

    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB connection lost.");
});

mongoose.connection.on("reconnected", () => {
  console.log("MongoDB connection restored.");
});

mongoose.connection.on("error", (error) => {
  console.error("MongoDB error:", error.message);
});

const shutdownDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log("MongoDB connection closed.");
    }
  } catch (error) {
    console.error("Error closing MongoDB connection:", error.message);
    process.exitCode = 1;
  }
};

const handleShutdown = async () => {
  await shutdownDB();
  process.exit();
};

process.once("SIGINT", handleShutdown);
process.once("SIGTERM", handleShutdown);

module.exports = connectDB;
