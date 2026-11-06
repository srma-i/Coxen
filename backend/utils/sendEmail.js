
/**
 * COXEN Email Service
 * Email provider: Resend
 * Uses HTTPS API instead of Gmail SMTP.
 */

const RESEND_API_URL = "https://api.resend.com";

const EMAIL_FROM =
  process.env.EMAIL_FROM || "COXEN <onboarding@resend.dev>";

/**
 * Verify Resend API connection and API key.
 */
async function verifyEmailConnection() {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY is missing from environment variables."
      );
    }

    const response = await fetch(`${RESEND_API_URL}/domains`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));

      throw new Error(
        result.message || `Resend API error: ${response.status}`
      );
    }

    console.log("Resend API connection successful.");
    return true;
  } catch (error) {
    console.error("Resend API connection failed:", {
      message: error.message,
    });

    return false;
  }
}

/**
 * Send an email using Resend.
 *
 * @param {Object} options
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} options.text
 * @param {string} [options.html]
 */
async function sendEmail({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;

  // Validate API key
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is missing from environment variables."
    );
  }

  // Validate email details
  if (!to || !subject || (!text && !html)) {
    throw new Error(
      "Email recipient, subject, and message are required."
    );
  }

  try {
    const response = await fetch(`${RESEND_API_URL}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject,
        ...(text ? { text } : {}),
        ...(html ? { html } : {}),
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.message || `Resend email error: ${response.status}`
      );
    }

    console.log("Email sent successfully:", result.id);

    return {
      messageId: result.id,
      ...result,
    };
  } catch (error) {
    console.error("Email sending failed:", {
      message: error.message,
    });

    throw error;
  }
}

// Export email function
module.exports = sendEmail;

// Export API connection verification function
module.exports.verifyEmailConnection = verifyEmailConnection;
