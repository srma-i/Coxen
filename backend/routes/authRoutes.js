const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { randomInt } = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/User");
const EmailOTP = require("../models/EmailOTP");
const ChatMessage = require("../models/ChatMessage");
const Memory = require("../models/Memory");
const authMiddleware = require("../middleware/authMiddleware");
const { createNotification } = require("../utils/notificationHelper");
const sendEmail = require("../utils/sendEmail");

const router = express.Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const LEGACY_USER_ID = "default-user";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_SECONDS = 60;

// ==========================================
// PASSWORD VALIDATION
// ==========================================

const getPasswordValidationError = (password) => {
  if (password.length < 8 || password.length > 16) {
    return "Password must be between 8 and 16 characters.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter.";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number.";
  }

  if (!/[^A-Za-z0-9\s]/.test(password)) {
    return "Password must contain at least one special character.";
  }

  return null;
};

// ==========================================
// AUTH HELPERS
// ==========================================

const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign(
    { userId: userId.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar || "",
  provider: user.provider,
  firstLoginAt: user.firstLoginAt || null,
});

const ensureFirstLoginAt = async (userId) => {
  const updatedUser = await User.findOneAndUpdate(
    {
      _id: userId,
      $or: [
        { firstLoginAt: null },
        { firstLoginAt: { $exists: false } },
      ],
    },
    {
      $set: { firstLoginAt: new Date() },
    },
    {
      new: true,
    }
  );

  return updatedUser || User.findById(userId);
};

const sendWelcomeNotification = async (user) => {
  try {
    await createNotification({
      userId: user._id.toString(),
      title: "Welcome to COXEN!",
      message: `Hello ${user.name}, your account has been created successfully. Start exploring COXEN!`,
      type: "system",
    });
  } catch (error) {
    console.error("Welcome notification failed:", error.message);
  }
};

const migrateLegacyDataToFirstUser = async () => {
  try {
    const firstUser = await User.findOne()
      .sort({ createdAt: 1, _id: 1 })
      .select("_id")
      .lean();

    if (!firstUser) return;

    const firstUserId = firstUser._id.toString();

    const [memoryResult, chatResult] = await Promise.all([
      Memory.updateMany(
        { userId: LEGACY_USER_ID },
        { $set: { userId: firstUserId } }
      ),
      ChatMessage.updateMany(
        { userId: LEGACY_USER_ID },
        { $set: { userId: firstUserId } }
      ),
    ]);

    const transferredMemories = memoryResult.modifiedCount || 0;
    const transferredMessages = chatResult.modifiedCount || 0;

    if (transferredMemories || transferredMessages) {
      console.log("Legacy data migration completed:", {
        userId: firstUserId,
        memories: transferredMemories,
        messages: transferredMessages,
      });
    }
  } catch (error) {
    console.error("Legacy data migration failed:", error.message);
  }
};

// ==========================================
// OTP HELPERS
// ==========================================

// Hash OTP before saving it to MongoDB.
const hashOTP = (otp) => {
  return crypto
    .createHash("sha256")
    .update(`${otp}:${process.env.JWT_SECRET}`)
    .digest("hex");
};

// Create and send an OTP.
const issueOTP = async ({ email, name = "", purpose }) => {
  const existingOTP = await EmailOTP.findOne({ email, purpose });

  if (existingOTP) {
    const lastSentAt = new Date(existingOTP.updatedAt).getTime();
    const secondsSinceLastSent = (Date.now() - lastSentAt) / 1000;

    if (secondsSinceLastSent < OTP_RESEND_SECONDS) {
      const waitSeconds = Math.ceil(
        OTP_RESEND_SECONDS - secondsSinceLastSent
      );

      return {
        success: false,
        status: 429,
        message: `Please wait ${waitSeconds} seconds before requesting another OTP.`,
      };
    }
  }

  const otp = randomInt(100000, 1000000).toString();

  const otpRecord = await EmailOTP.findOneAndUpdate(
    { email, purpose },
    {
      $set: {
        name,
        otpHash: hashOTP(otp),
        attempts: 0,
        expiresAt: new Date(
          Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
        ),
        verifiedAt: null,
        verificationTokenHash: null,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  try {
    await sendEmail({
      to: email,
      subject: "Your COXEN Verification Code",
      text: `Your COXEN verification code is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes. Do not share this code with anyone.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px">
          <h2>COXEN Email Verification</h2>
          <p>Your verification code is:</p>
          <h1 style="letter-spacing:8px">${otp}</h1>
          <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
          <p>Do not share this code with anyone.</p>
        </div>
      `,
    });
  } catch (error) {
    await EmailOTP.deleteOne({ _id: otpRecord._id });
    throw error;
  }

  return { success: true };
};

// Issue a short-lived token after successful OTP verification.
const createVerificationToken = (otpRecord) => {
  return jwt.sign(
    {
      email: otpRecord.email,
      purpose: otpRecord.purpose,
      otpId: otpRecord._id.toString(),
    },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );
};

const verifyFlowToken = (token, purpose) => {
  if (!token || !process.env.JWT_SECRET) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.purpose !== purpose) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
};

// Verify an OTP for registration or password reset.
const verifyOTPRecord = async (email, otp, purpose) => {
  const record = await EmailOTP.findOne({ email, purpose });

  if (!record) {
    return {
      error: "No OTP request found. Please request a new OTP.",
      status: 400,
    };
  }

  if (record.expiresAt <= new Date()) {
    await EmailOTP.deleteOne({ _id: record._id });

    return {
      error: "OTP has expired. Please request a new one.",
      status: 400,
    };
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await EmailOTP.deleteOne({ _id: record._id });

    return {
      error: "Too many incorrect attempts. Please request a new OTP.",
      status: 429,
    };
  }

  if (record.otpHash !== hashOTP(otp)) {
    record.attempts += 1;
    await record.save();

    return {
      error: "Incorrect OTP.",
      status: 400,
    };
  }

  record.verifiedAt = new Date();
  await record.save();

  return { record };
};

// ==========================================
// REGISTRATION: STEP 1 - SEND OTP
// ==========================================

router.post("/send-register-otp", async (req, res) => {
  try {
    const { name, email } = req.body;

    if (typeof name !== "string" || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        error: "Name and email are required.",
      });
    }

    const cleanName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!cleanName || cleanName.length > 80) {
      return res.status(400).json({
        success: false,
        error: "Name must be between 1 and 80 characters.",
      });
    }

    if (
      !normalizedEmail ||
      normalizedEmail.length > 254 ||
      !EMAIL_PATTERN.test(normalizedEmail)
    ) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid email address.",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "An account with this email already exists. Please log in.",
      });
    }

    const result = await issueOTP({
      email: normalizedEmail,
      name: cleanName,
      purpose: "register",
    });

    if (!result.success) {
      return res.status(result.status).json({
        success: false,
        error: result.message,
      });
    }

    return res.json({
      success: true,
      message: "Verification OTP sent to your email.",
    });
  } catch (error) {
    console.error("Registration OTP error:", error.message);

    return res.status(500).json({
      success: false,
      error: "Unable to send verification email. Please try again.",
    });
  }
});

// ==========================================
// REGISTRATION: STEP 2 - VERIFY OTP
// ==========================================

router.post("/verify-register-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (
      typeof email !== "string" ||
      typeof otp !== "string" ||
      !/^\d{6}$/.test(otp)
    ) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid email and 6-digit OTP.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await verifyOTPRecord(
      normalizedEmail,
      otp,
      "register"
    );

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        error: result.error,
      });
    }

    return res.json({
      success: true,
      message: "Email verified successfully.",
      registrationToken: createVerificationToken(result.record),
    });
  } catch (error) {
    console.error("Registration OTP verification error:", error.message);

    return res.status(500).json({
      success: false,
      error: "Unable to verify OTP.",
    });
  }
});

// ==========================================
// REGISTRATION: STEP 3 - SET PASSWORD
// ==========================================

router.post("/complete-register", async (req, res) => {
  try {
    const { registrationToken, password } = req.body;

    if (
      typeof registrationToken !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        error: "Verification token and password are required.",
      });
    }

    // Enforce password requirements on the server.
    const passwordError = getPasswordValidationError(password);

    if (passwordError) {
      return res.status(400).json({
        success: false,
        error: passwordError,
      });
    }

    const decoded = verifyFlowToken(registrationToken, "register");

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: "Verification expired. Please verify your email again.",
      });
    }

    const otpRecord = await EmailOTP.findById(decoded.otpId);

    if (
      !otpRecord ||
      otpRecord.purpose !== "register" ||
      otpRecord.email !== decoded.email ||
      !otpRecord.verifiedAt ||
      otpRecord.expiresAt <= new Date()
    ) {
      return res.status(401).json({
        success: false,
        error: "Email verification is invalid or expired.",
      });
    }

    const existingUser = await User.findOne({
      email: decoded.email,
    });

    if (existingUser) {
      await EmailOTP.deleteOne({ _id: otpRecord._id });

      return res.status(409).json({
        success: false,
        error: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: otpRecord.name,
      email: otpRecord.email,
      password: hashedPassword,
      provider: "local",
      firstLoginAt: new Date(),
    });

    await EmailOTP.deleteOne({ _id: otpRecord._id });

    await sendWelcomeNotification(user);
    await migrateLegacyDataToFirstUser();

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user: formatUser(user),
    });
  } catch (error) {
    console.error("Complete registration error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "An account with this email already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Unable to complete registration.",
    });
  }
});

// Block old direct registration so OTP cannot be bypassed.
router.post("/register", (req, res) => {
  return res.status(400).json({
    success: false,
    error: "Please use email OTP verification to create an account.",
  });
});

// ==========================================
// FORGOT PASSWORD: STEP 1 - SEND OTP
// ==========================================

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid email address.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    // Do not reveal whether an account exists.
    if (user) {
      const result = await issueOTP({
        email: normalizedEmail,
        purpose: "reset",
      });

      if (!result.success) {
        return res.status(result.status).json({
          success: false,
          error: result.message,
        });
      }
    }

    return res.json({
      success: true,
      message: "If an account exists, a password reset OTP has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);

    return res.status(500).json({
      success: false,
      error: "Unable to process password reset request.",
    });
  }
});

// ==========================================
// FORGOT PASSWORD: STEP 2 - VERIFY OTP
// ==========================================

router.post("/verify-reset-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (
      typeof email !== "string" ||
      typeof otp !== "string" ||
      !/^\d{6}$/.test(otp)
    ) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid email and 6-digit OTP.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await verifyOTPRecord(
      normalizedEmail,
      otp,
      "reset"
    );

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        error: result.error,
      });
    }

    return res.json({
      success: true,
      message: "OTP verified successfully.",
      resetToken: createVerificationToken(result.record),
    });
  } catch (error) {
    console.error("Reset OTP verification error:", error.message);

    return res.status(500).json({
      success: false,
      error: "Unable to verify reset OTP.",
    });
  }
});

// ==========================================
// FORGOT PASSWORD: STEP 3 - CHANGE PASSWORD
// ==========================================

router.post("/reset-password", async (req, res) => {
  try {
    const { resetToken, password } = req.body;

    if (
      typeof resetToken !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        error: "Reset token and new password are required.",
      });
    }

    // Enforce the same password requirements during password reset.
    const passwordError = getPasswordValidationError(password);

    if (passwordError) {
      return res.status(400).json({
        success: false,
        error: passwordError,
      });
    }

    const decoded = verifyFlowToken(resetToken, "reset");

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: "Password reset verification expired. Please try again.",
      });
    }

    const otpRecord = await EmailOTP.findById(decoded.otpId);

    if (
      !otpRecord ||
      otpRecord.purpose !== "reset" ||
      otpRecord.email !== decoded.email ||
      !otpRecord.verifiedAt ||
      otpRecord.expiresAt <= new Date()
    ) {
      return res.status(401).json({
        success: false,
        error: "Password reset verification is invalid or expired.",
      });
    }

    const user = await User.findOne({
      email: decoded.email,
    });

    if (!user) {
      await EmailOTP.deleteOne({ _id: otpRecord._id });

      return res.status(404).json({
        success: false,
        error: "User account not found.",
      });
    }

    user.password = await bcrypt.hash(password, 12);

    if (user.googleId) {
      user.provider = "both";
    } else {
      user.provider = "local";
    }

    await user.save();

    // Consume the OTP so the reset token cannot be reused.
    await EmailOTP.deleteOne({ _id: otpRecord._id });

    return res.json({
      success: true,
      message: "Password changed successfully. Please log in.",
    });
  } catch (error) {
    console.error("Reset password error:", error.message);

    return res.status(500).json({
      success: false,
      error: "Unable to reset password.",
    });
  }
});

// ==========================================
// NORMAL LOGIN - EXISTING FUNCTIONALITY
// ==========================================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required.",
      });
    }

    let user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password.",
      });
    }

    user = await ensureFirstLoginAt(user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User account not found.",
      });
    }

    await migrateLegacyDataToFirstUser();

    const token = generateToken(user._id);

    return res.json({
      success: true,
      message: "Login successful.",
      token,
      user: formatUser(user),
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      error: "Unable to log in.",
    });
  }
});

// ==========================================
// GOOGLE LOGIN - EXISTING FUNCTIONALITY
// ==========================================

router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;

    if (
      typeof credential !== "string" ||
      !credential ||
      !process.env.GOOGLE_CLIENT_ID
    ) {
      return res.status(400).json({
        success: false,
        error: "Google authentication is not configured.",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (
      !payload ||
      !payload.email ||
      !payload.sub ||
      payload.email_verified !== true
    ) {
      return res.status(401).json({
        success: false,
        error: "Please use a valid, verified Google account.",
      });
    }

    const normalizedEmail = payload.email.trim().toLowerCase();

    let user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    let isNewUser = false;

    if (user) {
      if (!user.googleId) {
        user.googleId = payload.sub;
        user.provider = user.password ? "both" : "google";

        if (!user.avatar && payload.picture) {
          user.avatar = payload.picture;
        }

        await user.save();
      } else if (user.googleId !== payload.sub) {
        return res.status(409).json({
          success: false,
          error: "This email is linked to another Google account.",
        });
      }
    } else {
      user = await User.create({
        name: payload.name || "COXEN User",
        email: normalizedEmail,
        googleId: payload.sub,
        provider: "google",
        avatar: payload.picture || "",
      });

      isNewUser = true;
    }

    user = await ensureFirstLoginAt(user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User account not found.",
      });
    }

    if (isNewUser) {
      await sendWelcomeNotification(user);
    }

    await migrateLegacyDataToFirstUser();

    const token = generateToken(user._id);

    return res.json({
      success: true,
      message: "Google login successful.",
      token,
      user: formatUser(user),
    });
  } catch (error) {
    console.error("Google login error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "This account already exists. Please log in.",
      });
    }

    return res.status(401).json({
      success: false,
      error: "Google authentication failed.",
    });
  }
});

// ==========================================
// CURRENT USER - EXISTING FUNCTIONALITY
// ==========================================

router.get("/me", authMiddleware, async (req, res) => {
  try {
    let user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User account not found.",
      });
    }

    user = await ensureFirstLoginAt(user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User account not found.",
      });
    }

    await migrateLegacyDataToFirstUser();

    return res.json({
      success: true,
      user: formatUser(user),
    });
  } catch (error) {
    console.error("Get current user error:", error.message);

    return res.status(500).json({
      success: false,
      error: "Unable to retrieve account details.",
    });
  }
});

module.exports = router;