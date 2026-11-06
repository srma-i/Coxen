
const nodemailer = require("nodemailer");

// Gmail SMTP transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,

  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 30000,

  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Verify Gmail SMTP connection.
 */
async function verifyEmailConnection() {
  try {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      throw new Error("Gmail credentials are missing from Render environment variables.");
    }

    await transporter.verify();

    console.log("Gmail SMTP connection successful.");
    return true;
  } catch (error) {
    console.error("Gmail SMTP connection failed:", {
      message: error.message,
      code: error.code,
      command: error.command,
    });

    return false;
  }
}

/**
 * Send an email.
 *
 * @param {Object} options
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} options.text
 * @param {string} [options.html]
 */
async function sendEmail({ to, subject, text, html }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error("Gmail credentials are missing from backend environment variables.");
  }

  if (!to || !subject || (!text && !html)) {
    throw new Error("Email recipient, subject, and message are required.");
  }

  try {
    const info = await transporter.sendMail({
      from: `"COXEN" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log("Email sent successfully:", info.messageId);

    return info;
  } catch (error) {
    console.error("Email sending failed:", {
      message: error.message,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
    });

    throw error;
  }
}

// Export connection test and email function
module.exports = sendEmail;
module.exports.verifyEmailConnection = verifyEmailConnection;
