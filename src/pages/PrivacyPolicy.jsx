
import React from "react";

const GOOGLE_PRIVACY_URL = "https://policies.google.com/privacy";
const CONTACT_EMAIL = "happytoons725@gmail.com";

const POLICY_SECTIONS = [
  {
    title: "1. Information We Collect",
    content: (
      <>
        <p>Depending on how you use COXEN, we may collect:</p>
        <ul>
          <li>Account information, including your name, email address and Google account profile information.</li>
          <li>Authentication information required to create and manage your account.</li>
          <li>Chat messages and conversation history submitted through COXEN.</li>
          <li>Saved memories and preferences that you choose to store in the application.</li>
          <li>Basic technical information needed to operate and secure the service.</li>
        </ul>
      </>
    ),
  },
  {
    title: "2. Google Sign-In",
    content: (
      <>
        <p>COXEN allows users to sign in using their Google accounts.</p>
        <p>
          When you use Google Sign-In, we receive the basic profile
          information permitted by your authorization, such as your name,
          email address and profile picture.
        </p>
        <p>
          Google authentication is used to identify your account and
          provide access to COXEN.
        </p>
        <p>
          Google's handling of your information is also governed by
          Google's Privacy Policy:
        </p>
        <a
          href={GOOGLE_PRIVACY_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Google Privacy Policy
        </a>
      </>
    ),
  },
  {
    title: "3. How We Use Your Information",
    content: (
      <>
        <p>We use collected information to:</p>
        <ul>
          <li>Create and manage user accounts.</li>
          <li>Authenticate users securely.</li>
          <li>Provide AI-powered chat functionality.</li>
          <li>Save and retrieve conversation history.</li>
          <li>Manage saved memories and preferences.</li>
          <li>Maintain and improve application functionality.</li>
          <li>Detect misuse and protect the application.</li>
        </ul>
      </>
    ),
  },
  {
    title: "4. AI Services and Gemini",
    content: (
      <>
        <p>
          COXEN uses Google's Gemini AI services to generate
          responses to user messages.
        </p>
        <p>
          When you use AI features, your messages and relevant
          conversation context may be sent to Google's AI services
          for processing.
        </p>
        <p>
          Please avoid entering passwords, financial details, highly
          sensitive personal information or other confidential
          information into AI conversations.
        </p>
        <p>
          Google's handling of data submitted to Gemini is subject
          to the applicable Google service terms and privacy policies.
        </p>
      </>
    ),
  },
  {
    title: "5. Data Storage",
    content: (
      <>
        <p>
          COXEN uses MongoDB to store application information,
          which may include account records, chat history and saved
          memories.
        </p>
        <p>
          Information is retained for as long as necessary to provide
          the service and fulfil legitimate operational requirements,
          unless a different retention period is required by law.
        </p>
      </>
    ),
  },
  {
    title: "6. Data Sharing",
    content: (
      <>
        <p>We do not sell your personal information.</p>
        <p>
          Information may be processed by service providers necessary
          to operate COXEN, including:
        </p>
        <ul>
          <li>Google services for authentication.</li>
          <li>Google Gemini for AI response generation.</li>
          <li>MongoDB hosting or infrastructure providers.</li>
          <li>Hosting and infrastructure providers used by the app.</li>
        </ul>
        <p>
          We may also disclose information where required by applicable
          law or to protect the rights and security of the service and
          its users.
        </p>
      </>
    ),
  },
  {
    title: "7. Data Security",
    content: (
      <>
        <p>
          We take reasonable technical and organisational measures
          to protect user information.
        </p>
        <p>
          However, no internet transmission or electronic storage
          method can be guaranteed to be completely secure.
        </p>
      </>
    ),
  },
  {
    title: "8. Your Choices and Data Deletion",
    content: (
      <>
        <p>You may stop using COXEN at any time.</p>
        <p>
          If you want to request access to, correction of or deletion
          of your personal information, contact us using the email
          address below.
        </p>
        <p>
          We will review and handle requests in accordance with
          applicable law and our operational and legal requirements.
        </p>
      </>
    ),
  },
  {
    title: "9. Children's Privacy",
    content: (
      <p>
        COXEN is not intended for children under the age of 13.
        We do not knowingly collect personal information from children
        under 13.
      </p>
    ),
  },
  {
    title: "10. Changes to This Policy",
    content: (
      <p>
        We may update this Privacy Policy when our services or data
        practices change. Updated versions will be published on this
        page with a revised date.
      </p>
    ),
  },
];

export default function PrivacyPolicy({ navigate }) {
  const handleBack = () => {
    if (typeof navigate === "function") {
      navigate("chat");
    }
  };

  return (
    <div className="legal-page">
      <style>{`
        .legal-page {
          min-height: 100vh;
          padding: 0 24px 50px;
          color: var(--text, #39354e);
          background: var(--app-bg, #f7f8fc);
          font-family: "DM Sans", sans-serif;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .legal-page *,
        .legal-page *::before,
        .legal-page *::after {
          box-sizing: border-box;
        }

        .legal-header {
          max-width: 1100px;
          margin: 0 auto;
          padding: 20px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border-bottom: 1px solid var(--border, #eae8f3);
        }

        .legal-brand {
          display: flex;
          align-items: center;
          gap: 11px;
          color: var(--text, #302b48);
          font-family: "Space Grotesk", sans-serif;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .legal-logo {
          width: 38px;
          height: 38px;
          display: block;
          object-fit: contain;
          flex-shrink: 0;
          border-radius: 10px;
          background: linear-gradient(135deg,#171923 0%,#292D3A 100%);
        }

        .legal-brand-name {
          font-weight: 800;
          letter-spacing: 1px;
        }

        .legal-back {
          min-height: 39px;
          padding: 0 15px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid var(--border, #eae8f3);
          border-radius: 9px;
          background: var(--surface, #fff);
          color: var(--text-secondary, #68637c);
          font-family: inherit;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .legal-back:hover {
          border-color: var(--primary-light, #c9c0ff);
          background: var(--primary-soft, #f8f6ff);
          color: var(--primary, #7967ed);
          transform: translateY(-1px);
        }

        .legal-back:focus-visible {
          outline: 3px solid var(--primary-light, #c9c0ff);
          outline-offset: 3px;
        }

        .legal-container {
          width: 100%;
          max-width: 850px;
          margin: 42px auto 0;
          padding: 42px 48px;
          border: 1px solid var(--border, #eae8f3);
          border-radius: 18px;
          background: var(--surface, #fff);
          box-shadow: 0 10px 35px rgba(43, 36, 91, 0.04);
        }

        .legal-eyebrow {
          margin-bottom: 12px;
          color: var(--primary, #7967ed);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.8px;
        }

        .legal-container h1 {
          margin: 0 0 10px;
          color: var(--text, #302b48);
          font-family: "Space Grotesk", sans-serif;
          font-size: 35px;
          font-weight: 750;
          letter-spacing: -1.2px;
        }

        .legal-updated {
          margin-bottom: 28px !important;
          color: var(--muted, #aaa6b7) !important;
          font-size: 11px !important;
        }

        .legal-container p {
          margin: 0 0 15px;
          color: var(--text-secondary, #77738a);
          font-size: 12px;
          line-height: 1.9;
        }

        .legal-container section {
          margin-top: 30px;
        }

        .legal-container h2 {
          margin: 0 0 12px;
          color: var(--text, #39354e);
          font-family: "Space Grotesk", sans-serif;
          font-size: 16px;
          font-weight: 750;
        }

        .legal-container ul {
          margin: 10px 0 18px;
          padding-left: 23px;
        }

        .legal-container li {
          margin-bottom: 9px;
          padding-left: 4px;
          color: var(--text-secondary, #77738a);
          font-size: 12px;
          line-height: 1.8;
        }

        .legal-container a {
          color: var(--primary, #7967ed);
          text-decoration: none;
          font-weight: 650;
          overflow-wrap: anywhere;
        }

        .legal-container a:hover {
          text-decoration: underline;
        }

        .legal-container a:focus-visible {
          outline: 2px solid var(--primary, #7967ed);
          outline-offset: 3px;
          border-radius: 2px;
        }

        .legal-container strong {
          color: var(--text, #39354e);
        }

        .legal-footer {
          margin-top: 40px;
          padding-top: 22px;
          border-top: 1px solid var(--border, #eae8f3);
          color: var(--muted, #aaa6b7);
          font-size: 10px;
          line-height: 1.7;
          text-align: center;
        }

        :root[data-theme="dark"] .legal-page {
          background: var(--app-bg, #11101a);
        }

        :root[data-theme="dark"] .legal-container {
          box-shadow: none;
        }

        :root[data-theme="dark"] .legal-back:hover {
          background: var(--primary-soft, #29233f);
        }

        @media (max-width: 800px) {
          .legal-container {
            padding: 35px 30px;
          }
        }

        @media (max-width: 650px) {
          .legal-page {
            padding: 0 14px 30px;
          }

          .legal-header {
            padding: 15px 0;
          }

          .legal-container {
            margin-top: 24px;
            padding: 26px 19px;
            border-radius: 13px;
          }

          .legal-container h1 {
            font-size: 27px;
          }

          .legal-container h2 {
            font-size: 15px;
          }

          .legal-container p,
          .legal-container li {
            font-size: 11px;
          }

          .legal-brand {
            font-size: 13px;
          }

          .legal-logo {
            width: 34px;
            height: 34px;
          }

          .legal-back {
            min-height: 36px;
            padding: 0 10px;
            font-size: 10px;
          }
        }

        @media (max-width: 360px) {
          .legal-container {
            padding: 23px 15px;
          }

          .legal-brand {
            gap: 7px;
            font-size: 11px;
          }

          .legal-back {
            padding: 0 8px;
            font-size: 9px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .legal-page,
          .legal-back {
            transition: none;
          }
        }
      `}</style>

      <header className="legal-header">
        <div className="legal-brand">
          <img
            src="/logo.png"
            alt="COXEN CX logo"
            className="legal-logo"
          />
          <span className="legal-brand-name">COXEN</span>
        </div>

        <button
          type="button"
          className="legal-back"
          onClick={handleBack}
          aria-label="Return to COXEN home"
        >
          <span aria-hidden="true">←</span>
          Back to Home
        </button>
      </header>

      <main className="legal-container">
        <div className="legal-eyebrow">LEGAL INFORMATION</div>

        <h1>Privacy Policy</h1>

        <p className="legal-updated">
          Last updated: October 31, 2026
        </p>

        <p>
          Welcome to COXEN. Your privacy is important to us.
          This Privacy Policy explains how COXEN collects, uses,
          stores and protects information when you use our application.
        </p>

        {POLICY_SECTIONS.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.content}
          </section>
        ))}

        <section>
          <h2>11. Contact Us</h2>

          <p>
            If you have questions about this Privacy Policy or your
            personal information, contact us:
          </p>

          <p>
            <strong>COXEN</strong>
            <br />
            Email:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>

        <footer className="legal-footer">
          © 2026 COXEN. All rights reserved.
        </footer>
      </main>
    </div>
  );
}
