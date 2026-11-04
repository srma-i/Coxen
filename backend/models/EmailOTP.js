
const mongoose = require("mongoose");

const emailOTPSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    purpose: {
      type: String,
      enum: ["register", "reset"],
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    verificationTokenHash: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// One active OTP record per email and purpose.
emailOTPSchema.index(
  { email: 1, purpose: 1 },
  { unique: true }
);

// Automatically delete expired OTP records.
emailOTPSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports = mongoose.model("EmailOTP", emailOTPSchema);
