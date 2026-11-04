
import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import Icon from "../components/Icon";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

async function readResponse(response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

// Password validation: 8-16 characters, uppercase, lowercase,
// number and special character.
function validatePassword(password) {
  if (password.length < 8 || password.length > 16) {
    return "Password must be between 8 and 16 characters.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one capital letter.";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one small letter.";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number.";
  }

  if (!/[^A-Za-z0-9\s]/.test(password)) {
    return "Password must contain at least one special character.";
  }

  return "";
}

export default function AuthScreen({ onAuthenticated, navigate }) {
  const [mode, setMode] = useState("login");
  const [step, setStep] = useState("details");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [registrationToken, setRegistrationToken] = useState("");
  const [resetToken, setResetToken] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isRegister = mode === "register";
  const isForgot = mode === "forgot";
  const isLogin = mode === "login";

  const resetFlow = (newMode) => {
    setMode(newMode);
    setStep("details");
    setPassword("");
    setOtp("");
    setRegistrationToken("");
    setResetToken("");
    setError("");
    setSuccess("");
    setShowPassword(false);
  };

  const apiRequest = async (endpoint, body) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await readResponse(response);

    if (!response.ok) {
      throw new Error(
        data.message || data.error || "Something went wrong."
      );
    }

    return data;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (isRegister && step === "details" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (
      (isRegister && step === "otp") ||
      (isForgot && step === "otp")
    ) {
      if (!/^\d{6}$/.test(otp)) {
        setError("Please enter the 6-digit OTP.");
        return;
      }
    }

    if (isLogin && !password) {
      setError("Please enter your password.");
      return;
    }

    if (
      (isRegister && step === "password") ||
      (isForgot && step === "password")
    ) {
      const passwordError = validatePassword(password);

      if (passwordError) {
        setError(passwordError);
        return;
      }
    }

    setLoading(true);

    try {
      let data;

      // NORMAL LOGIN
      if (isLogin) {
        data = await apiRequest("/api/auth/login", {
          email: email.trim(),
          password,
        });

        onAuthenticated(data);
        return;
      }

      // REGISTRATION STEP 1: SEND OTP
      if (isRegister && step === "details") {
        data = await apiRequest("/api/auth/send-register-otp", {
          name: name.trim(),
          email: email.trim(),
        });

        setStep("otp");
        setSuccess(data.message || "OTP sent to your email.");
        return;
      }

      // REGISTRATION STEP 2: VERIFY OTP
      if (isRegister && step === "otp") {
        data = await apiRequest("/api/auth/verify-register-otp", {
          email: email.trim(),
          otp,
        });

        setRegistrationToken(data.registrationToken);
        setOtp("");
        setStep("password");
        setSuccess("Email verified! Now create your password.");
        return;
      }

      // REGISTRATION STEP 3: CREATE ACCOUNT
      if (isRegister && step === "password") {
        data = await apiRequest("/api/auth/complete-register", {
          registrationToken,
          password,
        });

        onAuthenticated(data);
        return;
      }

      // FORGOT PASSWORD STEP 1: SEND OTP
      if (isForgot && step === "details") {
        data = await apiRequest("/api/auth/forgot-password", {
          email: email.trim(),
        });

        setStep("otp");
        setSuccess(
          data.message ||
            "If your account exists, an OTP has been sent."
        );
        return;
      }

      // FORGOT PASSWORD STEP 2: VERIFY OTP
      if (isForgot && step === "otp") {
        data = await apiRequest("/api/auth/verify-reset-otp", {
          email: email.trim(),
          otp,
        });

        setResetToken(data.resetToken);
        setOtp("");
        setStep("password");
        setSuccess("OTP verified! Enter your new password.");
        return;
      }

      // FORGOT PASSWORD STEP 3: RESET PASSWORD
      if (isForgot && step === "password") {
        data = await apiRequest("/api/auth/reset-password", {
          resetToken,
          password,
        });

        setPassword("");
        setResetToken("");
        setOtp("");
        setStep("details");
        setMode("login");
        setSuccess(
          data.message ||
            "Password changed successfully. Please sign in."
        );
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const endpoint = isRegister
        ? "/api/auth/send-register-otp"
        : "/api/auth/forgot-password";

      const body = isRegister
        ? { name: name.trim(), email: email.trim() }
        : { email: email.trim() };

      const data = await apiRequest(endpoint, body);

      setOtp("");
      setSuccess(data.message || "A new OTP has been sent.");
    } catch (err) {
      setError(err.message || "Unable to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setError("Google did not return a valid credential.");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const data = await apiRequest("/api/auth/google", {
        credential: credentialResponse.credential,
      });

      onAuthenticated(data);
    } catch (err) {
      setError(err.message || "Google login failed.");
    } finally {
      setLoading(false);
    }
  };

  const heading = isForgot
    ? step === "details"
      ? "Forgot your password?"
      : step === "otp"
        ? "Verify your email"
        : "Create new password"
    : isRegister
      ? step === "details"
        ? "Create your account"
        : step === "otp"
          ? "Verify your email"
          : "Set your password"
      : "Welcome back";

  const description = isForgot
    ? step === "details"
      ? "Enter your registered email to reset your password."
      : step === "otp"
        ? `Enter the 6-digit code sent to ${email}.`
        : "Choose a strong password for your COXEN account."
    : isRegister
      ? step === "details"
        ? "Start your journey with your personal AI workspace."
        : step === "otp"
          ? `We sent a verification code to ${email}.`
          : "Your email is verified. Now secure your account."
      : "Sign in to continue your COXEN journey.";

  const submitLabel = loading
    ? "Please wait..."
    : isLogin
      ? "Sign In"
      : isForgot
        ? step === "details"
          ? "Send OTP"
          : step === "otp"
            ? "Verify OTP"
            : "Change Password"
        : step === "details"
          ? "Send Verification OTP"
          : step === "otp"
            ? "Verify Email"
            : "Create Account";

  const showPasswordField =
    (isRegister && step === "password") ||
    (isForgot && step === "password") ||
    isLogin;

  return (
    <>
      <style>{`
        .auth-page {
          position: relative;
          min-height: 100vh;
          min-height: 100dvh;
          width: 100%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 35px 20px;
          overflow-x: hidden;
          overflow-y: auto;
          background: #f7f7fc;
          color: #29263f;
          font-family: "DM Sans", sans-serif;
          isolation: isolate;
        }

        .auth-page *,
        .auth-page *::before,
        .auth-page *::after {
          box-sizing: border-box;
        }

        .auth-background {
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background:
            radial-gradient(circle at 15% 20%, rgba(135, 116, 255, 0.13), transparent 32%),
            radial-gradient(circle at 85% 80%, rgba(183, 153, 255, 0.13), transparent 30%),
            linear-gradient(135deg, #faf9ff, #f5f6fc);
        }

        .auth-brand {
          position: absolute;
          top: 28px;
          left: 35px;
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 2;
        }

        .auth-brand .brand-logo {
          width: 43px;
          height: 43px;
          padding: 4px;
          display: block;
          object-fit: contain;
          border-radius: 12px;
          background: linear-gradient(135deg,#171923 0%,#292D3A 100%);
          border: 1px solid rgba(109, 40, 217, 0.15);
          box-shadow: 0 5px 16px rgba(45, 37, 100, 0.10);
        }

        .auth-brand h2 {
          margin: 0;
          color: #29263f;
          font-family: "Space Grotesk", sans-serif;
          font-size: 17px;
          font-weight: 700;
          letter-spacing: 0.7px;
        }

        .auth-brand span {
          display: block;
          margin-top: 3px;
          color: #9995ad;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 2px;
        }

        .auth-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 450px;
          margin: auto;
          flex: 0 0 auto;
        }

        .auth-card {
          width: 100%;
          padding: 35px;
          border: 1px solid rgba(231, 228, 245, 0.9);
          border-radius: 23px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 18px 65px rgba(45, 37, 100, 0.09);
          backdrop-filter: blur(15px);
        }

        .auth-heading {
          text-align: center;
          margin-bottom: 25px;
        }

        .auth-icon {
          width: 57px;
          height: 57px;
          margin: 0 auto 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          background: linear-gradient(135deg,#171923 0%,#292D3A 100%);
          border: 1px solid rgba(109, 40, 217, 0.13);
          box-shadow: 0 5px 16px rgba(45, 37, 100, 0.07);
        }

        .auth-icon img {
          width: 43px;
          height: 43px;
          object-fit: contain;
        }

        .auth-heading h1 {
          margin: 0;
          color: #29263f;
          font-family: "Space Grotesk", sans-serif;
          font-size: 25px;
          font-weight: 700;
          letter-spacing: -0.7px;
        }

        .auth-heading p {
          margin: 10px 0 0;
          color: #9692a7;
          font-size: 12px;
          line-height: 1.7;
          overflow-wrap: anywhere;
        }

        .auth-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
          padding: 5px;
          margin-bottom: 24px;
          border-radius: 12px;
          background: #f5f4f9;
        }

        .auth-tabs button {
          min-height: 40px;
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: #89859b;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .auth-tabs button.active {
          background: #fff;
          color: #705ce9;
          box-shadow: 0 2px 8px rgba(40, 35, 80, 0.07);
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 17px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          color: #454158;
          font-size: 12px;
          font-weight: 700;
        }

        .form-group input {
          width: 100%;
          height: 46px;
          padding: 0 13px;
          border: 1px solid #e8e6f0;
          border-radius: 10px;
          outline: none;
          background: #fff;
          color: #302d43;
          font-size: 12px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .form-group input::placeholder {
          color: #b4b0c0;
        }

        .form-group input:focus {
          border-color: #9b8cff;
          box-shadow: 0 0 0 3px rgba(120, 103, 255, 0.1);
        }

        .password-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .password-input-wrapper input {
          padding-right: 45px;
        }

        .password-input-wrapper input::-ms-reveal,
        .password-input-wrapper input::-ms-clear {
          display: none;
        }

        .password-toggle {
          position: absolute;
          right: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5px;
          border: 0;
          background: transparent;
          color: #9995aa;
          cursor: pointer;
        }

        .password-toggle:hover {
          color: #705ce9;
        }

        .password-rules {
          margin: 0;
          padding: 10px 12px;
          border: 1px solid #eeedf5;
          border-radius: 9px;
          background: #faf9ff;
          color: #89859b;
          font-size: 11px;
          line-height: 1.8;
        }

        .password-rules strong {
          display: block;
          margin-bottom: 3px;
          color: #454158;
        }

        .auth-error,
        .auth-success {
          padding: 11px 13px;
          border-radius: 9px;
          font-size: 12px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .auth-error {
          border: 1px solid #ffd9de;
          background: #fff3f4;
          color: #d64c60;
        }

        .auth-success {
          border: 1px solid #ccebd8;
          background: #f0fff5;
          color: #21834a;
        }

        .auth-submit {
          width: 100%;
          min-height: 47px;
          margin-top: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: 0;
          border-radius: 11px;
          background: linear-gradient(110deg, #806df5, #6854e7);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 6px 17px rgba(112, 91, 235, 0.2);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .auth-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 9px 22px rgba(112, 91, 235, 0.28);
        }

        .auth-submit:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 24px 0 19px;
          color: #aaa6b7;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.3px;
        }

        .auth-divider::before,
        .auth-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: #eeedf3;
        }

        .google-login-wrapper {
          width: 100%;
          display: flex;
          justify-content: center;
          overflow: hidden;
        }

        .auth-switch-text {
          margin: 22px 0 0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 5px;
          color: #8e899f;
          font-size: 11px;
        }

        .auth-switch-text button,
        .auth-legal button,
        .auth-text-button {
          padding: 0;
          border: 0;
          background: transparent;
          color: #705ce9;
          font-size: inherit;
          font-weight: 700;
          cursor: pointer;
        }

        .auth-switch-text button:hover,
        .auth-legal button:hover,
        .auth-text-button:hover {
          text-decoration: underline;
        }

        .auth-text-button {
          align-self: flex-end;
          font-size: 11px;
        }

        .auth-resend {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          margin-top: 2px;
          color: #8e899f;
          font-size: 11px;
        }

        .auth-resend button {
          border: 0;
          padding: 0;
          background: transparent;
          color: #705ce9;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .auth-back {
          width: 100%;
          margin-top: 14px;
          border: 0;
          background: transparent;
          color: #89849c;
          font-size: 11px;
          cursor: pointer;
        }

        .auth-legal {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 23px;
          padding-top: 18px;
          border-top: 1px solid #f0eff5;
          color: #aaa6b6;
          font-size: 10px;
        }

        .auth-legal button {
          color: #89849c;
          font-size: 10px;
          font-weight: 500;
        }

        .auth-footer {
          margin: 20px 0 0;
          color: #aaa6b8;
          font-size: 10px;
          text-align: center;
        }

        @media (max-width: 600px) {
          .auth-page {
            padding: 90px 16px 25px;
          }

          .auth-brand {
            top: 20px;
            left: 20px;
          }

          .auth-card {
            padding: 27px 21px;
            border-radius: 18px;
          }

          .auth-heading h1 {
            font-size: 22px;
          }

          .auth-heading p {
            font-size: 11px;
          }
        }

        @media (max-width: 360px) {
          .auth-card {
            padding: 23px 16px;
          }

          .auth-tabs button {
            font-size: 11px;
          }
        }

        @media (max-height: 650px) and (min-width: 601px) {
          .auth-page {
            padding-top: 90px;
            padding-bottom: 25px;
          }
        }
      `}</style>

      <main className="auth-page">
        <div className="auth-background" />

        <div className="auth-brand">
          <img
            src="/logo.png"
            alt="COXEN logo"
            className="brand-logo"
          />

          <div>
            <h2>COXEN</h2>
            <span>AI WORKSPACE</span>
          </div>
        </div>

        <section className="auth-container">
          <div className="auth-card">
            <div className="auth-heading">
              <div className="auth-icon">
                <img src="/logo.png" alt="COXEN" />
              </div>

              <h1>{heading}</h1>
              <p>{description}</p>
            </div>

            {!isForgot && (
              <div className="auth-tabs">
                <button
                  type="button"
                  className={isLogin ? "active" : ""}
                  onClick={() => resetFlow("login")}
                >
                  Sign In
                </button>

                <button
                  type="button"
                  className={isRegister ? "active" : ""}
                  onClick={() => resetFlow("register")}
                >
                  Create Account
                </button>
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit}>
              {isRegister && step === "details" && (
                <div className="form-group">
                  <label htmlFor="auth-name">Full name</label>
                  <input
                    id="auth-name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    maxLength={80}
                    required
                  />
                </div>
              )}

              {((isRegister && step === "details") ||
                (isForgot && step === "details") ||
                isLogin) && (
                <div className="form-group">
                  <label htmlFor="auth-email">Email address</label>
                  <input
                    id="auth-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    maxLength={254}
                    required
                  />
                </div>
              )}

              {((isRegister && step === "otp") ||
                (isForgot && step === "otp")) && (
                <div className="form-group">
                  <label htmlFor="auth-otp">
                    6-digit verification code
                  </label>

                  <input
                    id="auth-otp"
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(event) =>
                      setOtp(
                        event.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    maxLength={6}
                    autoComplete="one-time-code"
                    required
                  />

                  <div className="auth-resend">
                    Didn't receive the code?
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={loading}
                    >
                      Resend OTP
                    </button>
                  </div>
                </div>
              )}

              {showPasswordField && (
                <div className="form-group">
                  <label htmlFor="auth-password">
                    {isLogin ? "Password" : "New password"}
                  </label>

                  <div className="password-input-wrapper">
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      placeholder={
                        isLogin
                          ? "Enter your password"
                          : "Create a strong password"
                      }
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete={
                        isLogin ? "current-password" : "new-password"
                      }
                      minLength={isLogin ? undefined : 8}
                      maxLength={isLogin ? undefined : 16}
                      required
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      <Icon
                        name={showPassword ? "eyeOff" : "eye"}
                        size={19}
                      />
                    </button>
                  </div>

                  {!isLogin && (
                    <div className="password-rules">
                      <strong>Password must contain:</strong>
                      • 8–16 characters<br />
                      • One uppercase letter (A–Z)<br />
                      • One lowercase letter (a–z)<br />
                      • One number (0–9)<br />
                      • One special character (!@#$%)
                    </div>
                  )}
                </div>
              )}

              {isLogin && (
                <button
                  type="button"
                  className="auth-text-button"
                  onClick={() => resetFlow("forgot")}
                >
                  Forgot password?
                </button>
              )}

              {error && (
                <div className="auth-error" role="alert">
                  {error}
                </div>
              )}

              {success && (
                <div className="auth-success" role="status">
                  {success}
                </div>
              )}

              <button
                type="submit"
                className="auth-submit"
                disabled={loading}
              >
                {submitLabel}
                {!loading && <Icon name="arrowRight" size={18} />}
              </button>
            </form>

            {isLogin && (
              <>
                <div className="auth-divider">
                  <span>OR CONTINUE WITH</span>
                </div>

                <div className="google-login-wrapper">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() =>
                      setError("Google login was unsuccessful.")
                    }
                    useOneTap={false}
                    theme="outline"
                    size="large"
                    shape="rectangular"
                    width="320"
                    text="continue_with"
                  />
                </div>
              </>
            )}

            {isForgot ? (
              <button
                type="button"
                className="auth-back"
                onClick={() => resetFlow("login")}
              >
                ← Back to Sign In
              </button>
            ) : (
              <p className="auth-switch-text">
                {isRegister
                  ? "Already have an account?"
                  : "Don't have an account?"}

                <button
                  type="button"
                  onClick={() =>
                    resetFlow(isRegister ? "login" : "register")
                  }
                >
                  {isRegister ? "Sign in" : "Create account"}
                </button>
              </p>
            )}

            <div className="auth-legal">
              <button type="button" onClick={() => navigate("terms")}>
                Terms of Services
              </button>

              <span>·</span>

              <button type="button" onClick={() => navigate("privacy")}>
                Privacy Policy
              </button>
            </div>
          </div>

          <p className="auth-footer">
            Powered by intelligence. Designed for possibilities.
          </p>
        </section>
      </main>
    </>
  );
}
