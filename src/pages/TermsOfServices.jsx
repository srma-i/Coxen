
import { useCallback } from "react";

const TERMS_STYLES = `
  .legal-page {
    min-height: 100%;
    width: 100%;
    padding: 0 24px 50px;
    overflow-y: auto;
    color: var(--text, #39354e);
    background: var(--app-bg, #f7f8fc);
    font-family: "DM Sans", sans-serif;
    box-sizing: border-box;
  }

  .legal-page *,
  .legal-page *::before,
  .legal-page *::after {
    box-sizing: border-box;
  }

  .legal-header {
    position: sticky;
    top: 0;
    z-index: 5;
    max-width: 1100px;
    margin: 0 auto;
    padding: 17px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid var(--border, #eae8f3);
    background: var(--app-bg, #f7f8fc);
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
    width: 39px;
    height: 39px;
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
    outline: 2px solid var(--primary, #7967ed);
    outline-offset: 3px;
  }

  .legal-container {
    width: 100%;
    max-width: 850px;
    margin: 38px auto 0;
    padding: 43px 48px;
    border: 1px solid var(--border, #eae8f3);
    border-radius: 18px;
    background: var(--surface, #fff);
    box-shadow: 0 10px 35px rgba(43, 36, 91, 0.04);
  }

  .legal-eyebrow {
    display: inline-block;
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
    line-height: 1.2;
  }

  .legal-updated {
    margin: 0 0 29px !important;
    color: var(--muted, #aaa6b7) !important;
    font-size: 11px !important;
  }

  .legal-intro {
    padding: 17px 19px;
    margin-bottom: 30px;
    border: 1px solid var(--border, #eae8f3);
    border-left: 3px solid var(--primary, #7967ed);
    border-radius: 10px;
    background: var(--primary-soft, #f8f6ff);
  }

  .legal-intro p {
    margin-bottom: 0 !important;
    color: var(--text-secondary, #77738a) !important;
  }

  .legal-container section {
    margin-top: 29px;
    padding-top: 23px;
    border-top: 1px solid var(--border, #f0eef6);
  }

  .legal-container h2 {
    margin: 0 0 12px;
    color: var(--text, #39354e);
    font-family: "Space Grotesk", sans-serif;
    font-size: 15px;
    font-weight: 750;
    line-height: 1.5;
  }

  .legal-container p {
    margin: 0 0 14px;
    color: var(--text-secondary, #77738a);
    font-size: 12px;
    line-height: 1.9;
  }

  .legal-container ul {
    margin: 10px 0 18px;
    padding-left: 22px;
  }

  .legal-container li {
    margin-bottom: 9px;
    padding-left: 4px;
    color: var(--text-secondary, #77738a);
    font-size: 12px;
    line-height: 1.8;
  }

  .legal-container li::marker {
    color: var(--primary, #7967ed);
  }

  .legal-container a {
    color: var(--primary, #7967ed);
    text-decoration: none;
    font-weight: 700;
    overflow-wrap: anywhere;
  }

  .legal-container a:hover {
    text-decoration: underline;
  }

  .legal-container a:focus-visible,
  .legal-back:focus-visible {
    outline: 2px solid var(--primary, #7967ed);
    outline-offset: 3px;
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
    background: var(--app-bg, #151522);
    color: var(--text, #e8e5f2);
  }

  :root[data-theme="dark"] .legal-header {
    background: var(--app-bg, #151522);
  }

  :root[data-theme="dark"] .legal-container {
    box-shadow: 0 10px 35px rgba(0, 0, 0, 0.14);
  }

  :root[data-theme="dark"] .legal-intro {
    background: var(--primary-soft, #25213b);
  }

  :root[data-theme="dark"] .legal-back {
    background: var(--surface, #211f31);
  }

  :root[data-theme="dark"] .legal-back:hover {
    background: var(--primary-soft, #2b2644);
  }

  @media (max-width: 650px) {
    .legal-page {
      padding: 0 14px 30px;
    }

    .legal-header {
      padding: 14px 0;
    }

    .legal-brand {
      gap: 9px;
      font-size: 13px;
    }

    .legal-logo {
      width: 35px;
      height: 35px;
    }

    .legal-back {
      min-height: 36px;
      padding: 0 10px;
      font-size: 10px;
    }

    .legal-container {
      margin-top: 23px;
      padding: 27px 19px;
      border-radius: 13px;
    }

    .legal-container h1 {
      font-size: 27px;
    }

    .legal-container h2 {
      font-size: 14px;
    }

    .legal-container p,
    .legal-container li {
      font-size: 11px;
    }

    .legal-intro {
      padding: 14px;
    }

    .legal-container section {
      margin-top: 24px;
      padding-top: 19px;
    }
  }

  @media (max-width: 380px) {
    .legal-page {
      padding-right: 10px;
      padding-left: 10px;
    }

    .legal-container {
      padding: 23px 15px;
    }

    .legal-brand {
      font-size: 12px;
    }

    .legal-back {
      padding: 0 8px;
      font-size: 9px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .legal-back {
      transition: none;
    }
  }
`;

export default function TermsOfServices({ navigate }) {
  const handleBack = useCallback(() => {
    if (typeof navigate === "function") {
      navigate("chat");
    }
  }, [navigate]);

  return (
    <div className="legal-page terms-page">
      <style>{TERMS_STYLES}</style>

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

        <h1>Terms of Service</h1>

        <p className="legal-updated">
          Last updated: October 31, 2026
        </p>

        <div className="legal-intro">
          <p>
            Welcome to COXEN. These Terms of Service govern
            your access to and use of the COXEN application.
            By accessing or using our service, you agree to these
            terms. Please read them carefully.
          </p>
        </div>

        <section>
          <h2>1. About COXEN</h2>
          <p>
            COXEN is an AI-powered application designed to
            provide conversational assistance, conversation
            history and memory-related features.
          </p>
        </section>

        <section>
          <h2>2. Eligibility</h2>
          <p>
            You must be at least 13 years old to use COXEN.
            By using the application, you confirm that you meet
            this requirement. If applicable law requires a higher
            minimum age, that requirement will apply.
          </p>
        </section>

        <section>
          <h2>3. User Accounts</h2>
          <p>
            You may access COXEN using supported
            authentication methods, including Google Sign-In.
          </p>

          <p>You agree to:</p>

          <ul>
            <li>Provide accurate account information.</li>
            <li>Keep your account credentials secure.</li>
            <li>Use your account responsibly.</li>
            <li>Notify us if you suspect unauthorised account access.</li>
          </ul>

          <p>
            You are responsible for activity carried out through
            your account, subject to applicable law.
          </p>
        </section>

        <section>
          <h2>4. Acceptable Use</h2>
          <p>You agree not to:</p>

          <ul>
            <li>Use COXEN for unlawful activities.</li>
            <li>Attempt to gain unauthorised access to the service.</li>
            <li>Disrupt or damage the application or its infrastructure.</li>
            <li>Upload malicious code or harmful content.</li>
            <li>Abuse the service or interfere with other users.</li>
            <li>Attempt to bypass security measures or usage restrictions.</li>
          </ul>
        </section>

        <section>
          <h2>5. AI-Generated Content</h2>
          <p>
            COXEN uses AI technology, including Google Gemini,
            to generate responses.
          </p>

          <p>
            AI-generated responses may contain inaccurate,
            incomplete, outdated or misleading information.
            Responses are generated automatically and may not
            always be reviewed by a human.
          </p>

          <p>
            You are responsible for evaluating AI-generated
            information before relying on it.
          </p>

          <p>
            COXEN should not be treated as a substitute for
            professional medical, legal, financial or other
            specialised advice. For important decisions, consult
            a qualified professional.
          </p>
        </section>

        <section>
          <h2>6. User Content</h2>
          <p>
            You retain responsibility for the messages and other
            content you submit to COXEN.
          </p>

          <p>
            You must have the necessary rights and permissions
            to submit any content you provide.
          </p>

          <p>
            You grant COXEN permission to process your
            submitted content only as reasonably necessary to
            operate, maintain and provide the application features,
            subject to our Privacy Policy.
          </p>
        </section>

        <section>
          <h2>7. Third-Party Services</h2>
          <p>
            COXEN may rely on third-party services, including
            Google authentication, Google Gemini and database
            hosting providers.
          </p>

          <p>
            Your use of those services may also be subject to
            their respective terms and policies. We are not
            responsible for independent changes or interruptions
            to third-party services.
          </p>
        </section>

        <section>
          <h2>8. Availability and Changes</h2>
          <p>
            We aim to keep COXEN available and functional.
            However, uninterrupted access is not guaranteed.
          </p>

          <p>
            Features may be modified, suspended or discontinued
            as the application develops. We may also perform
            maintenance or updates that temporarily affect access.
          </p>
        </section>

        <section>
          <h2>9. Account Suspension or Termination</h2>
          <p>
            We may restrict or terminate access where reasonably
            necessary to address violations of these Terms,
            security risks, misuse or legal requirements.
          </p>

          <p>
            You may stop using COXEN at any time. Requests
            relating to account or personal data deletion are
            handled according to our Privacy Policy and applicable law.
          </p>
        </section>

        <section>
          <h2>10. Disclaimer</h2>
          <p>
            COXEN is provided on an "as is" and "as available"
            basis, to the extent permitted by applicable law.
          </p>

          <p>
            We do not guarantee that the application will always
            be available, error-free, secure or suitable for every
            particular purpose.
          </p>
        </section>

        <section>
          <h2>11. Limitation of Liability</h2>
          <p>
            To the extent permitted by applicable law, COXEN
            shall not be liable for indirect or consequential
            losses arising from the use of the application.
          </p>

          <p>
            Nothing in these Terms excludes or limits liability
            that cannot legally be excluded or limited under
            applicable law.
          </p>
        </section>

        <section>
          <h2>12. Changes to These Terms</h2>
          <p>
            We may update these Terms when necessary. Updated
            versions will be published on this page with a
            revised date. Your continued use of COXEN
            after an update means you acknowledge the updated
            Terms, to the extent permitted by applicable law.
          </p>
        </section>

        <section>
          <h2>13. Privacy</h2>
          <p>
            Your use of COXEN is also governed by our
            Privacy Policy, which explains how information
            is collected, used, stored and protected.
          </p>
        </section>

        <section>
          <h2>14. Contact Information</h2>
          <p>
            For questions about these Terms, contact:
          </p>

          <p>
            <strong>COXEN</strong>
            <br />
            Email:{" "}
            <a href="mailto:happytoons725@gmail.com">
              happytoons725@gmail.com
            </a>
          </p>
        </section>

        <footer className="legal-footer">
          © 2026 COXEN. All rights reserved.
          <br />
          These Terms should be read together with the COXEN Privacy Policy.
        </footer>
      </main>
    </div>
  );
}
