
import { useEffect, useState } from "react";
import Icon from "../components/Icon";

const PROFILE_STYLES = `

  .profile-page {
    width: 100%;
    max-width: 1050px;
    margin: 0 auto;
    padding: 28px 30px 40px;
    color: var(--text, #39354e);
    font-family: "DM Sans", sans-serif;
    transition: color 0.25s ease;
  }

  .profile-page * {
    box-sizing: border-box;
  }

  /* HEADER */

  .profile-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 26px;
  }

  .profile-eyebrow {
    display: inline-block;
    margin-bottom: 9px;
    color: var(--primary, #8876ed);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.7px;
  }

  .profile-header h2 {
    margin: 0 0 7px;
    color: var(--text, #302b48);
    font-family: "Space Grotesk", sans-serif;
    font-size: 27px;
    font-weight: 750;
    letter-spacing: -0.8px;
  }

  .profile-header p {
    margin: 0;
    color: var(--muted, #9692a7);
    font-size: 12px;
    line-height: 1.6;
  }

  /* MAIN CARD */

  .profile-card {
    overflow: hidden;
    border: 1px solid var(--border, #eae8f3);
    border-radius: 17px;
    background: var(--surface, #fff);
    box-shadow: 0 8px 30px rgba(43, 36, 91, 0.035);
    transition: background 0.25s ease, border-color 0.25s ease;
  }

  /* COVER */

  .profile-cover {
    position: relative;
    height: 155px;
    overflow: hidden;
    background:
      radial-gradient(circle at 80% 20%, rgba(255,255,255,0.35), transparent 27%),
      linear-gradient(115deg, #a99aff, #8270ef 55%, #6e5ce1);
  }

  .profile-cover::before,
  .profile-cover::after {
    position: absolute;
    content: "";
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 50%;
  }

  .profile-cover::before {
    width: 230px;
    height: 230px;
    top: -125px;
    right: 10%;
  }

  .profile-cover::after {
    width: 310px;
    height: 310px;
    top: -180px;
    right: -2%;
  }

  .profile-cover-decoration {
    position: absolute;
    width: 150px;
    height: 150px;
    right: 28%;
    bottom: -115px;
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 50%;
  }

  /* PROFILE IDENTITY */

  .profile-main {
    position: relative;
    display: flex;
    align-items: flex-end;
    gap: 19px;
    padding: 0 35px 25px;
    border-bottom: 1px solid var(--border, #f0eef6);
    background: linear-gradient(
      180deg,
      var(--primary-soft, #f5f2ff) 0%,
      var(--surface, #ffffff) 75%
    );
    transition: background 0.25s ease, border-color 0.25s ease;
  }

  .profile-avatar-large {
    position: relative;
    z-index: 2;
    width: 112px;
    height: 112px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    overflow: hidden;
    margin-top: -62px;
    border: 5px solid var(--surface, #fff);
    border-radius: 27px;
    background: linear-gradient(135deg, #a99aff, #7866e9);
    color: #fff;
    font-family: "Space Grotesk", sans-serif;
    font-size: 36px;
    font-weight: 800;
    box-shadow: 0 7px 22px rgba(77, 59, 172, 0.22);
  }

  .profile-avatar-large img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }

  .profile-identity {
    min-width: 0;
    padding-bottom: 3px;
  }

  .profile-identity h3 {
    overflow-wrap: anywhere;
    margin: 0 0 5px;
    color: var(--text, #302b48);
    font-family: "Space Grotesk", sans-serif;
    font-size: 20px;
    font-weight: 750;
  }

  .profile-identity p {
    overflow-wrap: anywhere;
    margin: 0 0 11px;
    color: var(--muted, #9692a7);
    font-size: 11px;
  }

  /* ACCOUNT STATUS */

  .profile-status {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 5px 10px;
    border: 1px solid rgba(54, 174, 112, 0.22);
    border-radius: 20px;
    background: rgba(54, 174, 112, 0.09);
    color: var(--success, #39966a);
    font-size: 9px;
    font-weight: 700;
  }

  .profile-status .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--success, #43b77c);
    box-shadow: 0 0 0 3px rgba(67, 183, 124, 0.12);
  }

  /* ACCOUNT DETAILS */

  .profile-details {
    padding: 28px 35px;
  }

  .profile-details > h3 {
    margin: 0 0 19px;
    color: var(--text, #39354e);
    font-family: "Space Grotesk", sans-serif;
    font-size: 14px;
    font-weight: 750;
  }

  .profile-detail-row {
    min-height: 76px;
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 13px 0;
    border-bottom: 1px solid var(--border, #f1eff6);
  }

  .profile-detail-row:last-child {
    border-bottom: none;
  }

  .profile-detail-icon {
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border: 1px solid var(--border, #eeebfa);
    border-radius: 12px;
    background: var(--primary-soft, #f7f5ff);
    color: var(--primary, #8270e9);
  }

  .profile-detail-content {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .profile-detail-content span {
    color: var(--muted, #aaa6b7);
    font-size: 10px;
    font-weight: 600;
  }

  .profile-detail-content strong {
    overflow-wrap: anywhere;
    color: var(--text, #454057);
    font-size: 12px;
    font-weight: 700;
  }

  /* COPY EMAIL */

  .profile-copy-button {
    flex-shrink: 0;
    min-height: 34px;
    padding: 0 11px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 1px solid var(--border, #eae7f4);
    border-radius: 8px;
    background: var(--surface, #fff);
    color: var(--primary, #8175bb);
    font-family: inherit;
    font-size: 10px;
    font-weight: 650;
    cursor: pointer;
    transition: 0.2s ease;
  }

  .profile-copy-button:hover:not(:disabled) {
    border-color: var(--primary-light, #c9c0ff);
    background: var(--primary-soft, #f8f6ff);
    color: var(--primary, #7967ed);
  }

  .profile-copy-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .profile-copy-button.is-copied {
    border-color: rgba(54, 174, 112, 0.3);
    background: rgba(54, 174, 112, 0.08);
    color: var(--success, #39966a);
  }

  .profile-copy-button.is-error {
    border-color: rgba(211, 106, 119, 0.3);
    color: var(--danger, #d36a77);
  }

  .profile-copy-feedback {
    margin-top: 7px;
    color: var(--success, #39966a);
    font-size: 10px;
  }

  .profile-copy-feedback.error {
    color: var(--danger, #d36a77);
  }

  /* ACTIONS */

  .profile-actions {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 20px 35px;
    border-top: 1px solid var(--border, #f0eef6);
    background: var(--surface-soft, #fdfcff);
  }

  .profile-logout-button {
    min-height: 39px;
    padding: 0 15px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 1px solid rgba(211, 106, 119, 0.25);
    border-radius: 9px;
    background: var(--surface, #fff);
    color: var(--danger, #d36a77);
    font-family: inherit;
    font-size: 11px;
    font-weight: 650;
    cursor: pointer;
    transition: 0.2s ease;
  }

  .profile-logout-button:hover {
    border-color: rgba(211, 106, 119, 0.5);
    background: rgba(211, 106, 119, 0.08);
  }

  /* FOOTER */

  .profile-footer-note {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    margin-top: 22px;
    color: var(--muted, #aaa6b7);
    font-size: 10px;
    line-height: 1.6;
    text-align: center;
  }

  .profile-footer-note svg {
    flex-shrink: 0;
    color: var(--primary, #8b7be8);
  }

  /* ACCESSIBILITY */

  .profile-page button:focus-visible {
    outline: 3px solid var(--primary-light, #c9c0ff);
    outline-offset: 3px;
  }

  /* DARK THEME */

  :root[data-theme="dark"] .profile-card {
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  }

  :root[data-theme="dark"] .profile-main {
    background: linear-gradient(
      180deg,
      var(--primary-soft, #24213a) 0%,
      var(--surface, #191927) 75%
    );
  }

  :root[data-theme="dark"] .profile-avatar-large {
    border-color: var(--surface, #191927);
  }

  :root[data-theme="dark"] .profile-status {
    background: rgba(54, 174, 112, 0.12);
  }

  /* RESPONSIVE */

  @media (max-width: 650px) {
    .profile-page {
      padding: 22px 15px 30px;
    }

    .profile-header h2 {
      font-size: 23px;
    }

    .profile-header p {
      max-width: 230px;
      font-size: 11px;
    }

    .profile-cover {
      height: 115px;
    }

    .profile-main {
      gap: 13px;
      padding: 0 19px 21px;
    }

    .profile-avatar-large {
      width: 92px;
      height: 92px;
      margin-top: -52px;
      border-radius: 22px;
      font-size: 29px;
    }

    .profile-identity h3 {
      font-size: 16px;
    }

    .profile-identity p {
      font-size: 10px;
    }

    .profile-details {
      padding: 23px 19px;
    }

    .profile-actions {
      padding: 17px 19px;
    }
  }

  @media (max-width: 420px) {
    .profile-main {
      align-items: center;
      flex-wrap: wrap;
    }

    .profile-identity {
      flex: 1;
    }

    .profile-detail-row {
      gap: 10px;
    }

    .profile-detail-icon {
      width: 37px;
      height: 37px;
    }

    .profile-copy-button {
      padding: 0 8px;
      font-size: 9px;
    }

    .profile-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .profile-logout-button {
      width: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-page,
    .profile-page button {
      transition: none;
    }
  }
`;

function getDisplayName(user) {
  return (
    user?.name ||
    user?.username ||
    user?.email?.split("@")[0] ||
    "COXEN User"
  );
}

function getFormattedDate(dateValue) {
  if (!dateValue) return "Not available";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function Profile({ user, logout }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const displayName = getDisplayName(user);
  const email = user?.email || "Email not available";
  const hasEmail = Boolean(user?.email);

  const avatar =
    user?.picture ||
    user?.avatar ||
    user?.profilePicture ||
    "";

  const formattedDate = getFormattedDate(user?.firstLoginAt);

  const showAvatar = Boolean(avatar) && !avatarError;

  // Reset avatar fallback when the image URL changes.
  useEffect(() => {
    setAvatarError(false);
  }, [avatar]);

  // Automatically clear clipboard feedback.
  useEffect(() => {
    if (!copied && !copyError) return undefined;

    const timeoutId = window.setTimeout(() => {
      setCopied(false);
      setCopyError(false);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [copied, copyError]);

  const copyEmail = async () => {
    if (!hasEmail) return;

    setCopied(false);
    setCopyError(false);

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable.");
      }

      await navigator.clipboard.writeText(email);
      setCopied(true);
    } catch (error) {
      console.error("Unable to copy email:", error);
      setCopyError(true);
    }
  };

  const handleLogout = () => {
    if (typeof logout === "function") {
      logout();
    }
  };

  return (
    <section className="profile-page">
      <style>{PROFILE_STYLES}</style>

      {/* HEADER */}

      <header className="profile-header">
        <div>
          <span className="profile-eyebrow">YOUR ACCOUNT</span>
          <h2>My Profile</h2>
          <p>Manage and view your COXEN account information.</p>
        </div>
      </header>

      {/* PROFILE CARD */}

      <div className="profile-card">
        <div className="profile-cover">
          <div className="profile-cover-decoration" />
        </div>

        {/* PROFILE IDENTITY */}

        <div className="profile-main">
          <div className="profile-avatar-large">
            {showAvatar ? (
              <img
                src={avatar}
                alt={`${displayName}'s profile`}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
              />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>

          <div className="profile-identity">
            <h3>{displayName}</h3>
            <p>{email}</p>

            <span className="profile-status">
              <span className="status-dot" />
              Account active
            </span>
          </div>
        </div>

        {/* ACCOUNT INFORMATION */}

        <div className="profile-details">
          <h3>Account information</h3>

          {/* FULL NAME */}

          <div className="profile-detail-row">
            <div className="profile-detail-icon">
              <Icon name="user" size={19} />
            </div>

            <div className="profile-detail-content">
              <span>Full name</span>
              <strong>{displayName}</strong>
            </div>
          </div>

          {/* EMAIL ADDRESS */}

          <div className="profile-detail-row">
            <div className="profile-detail-icon">
              <Icon name="mail" size={19} />
            </div>

            <div className="profile-detail-content">
              <span>Email address</span>
              <strong>{email}</strong>

              {copied && (
                <span className="profile-copy-feedback" role="status">
                  Email copied successfully.
                </span>
              )}

              {copyError && (
                <span className="profile-copy-feedback error" role="alert">
                  Unable to copy. Check browser permissions.
                </span>
              )}
            </div>

            <button
              type="button"
              className={[
                "profile-copy-button",
                copied ? "is-copied" : "",
                copyError ? "is-error" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={copyEmail}
              disabled={!hasEmail}
              title={hasEmail ? "Copy email address" : "Email unavailable"}
              aria-label={
                copied
                  ? "Email copied"
                  : copyError
                    ? "Retry copying email address"
                    : "Copy email address"
              }
            >
              <Icon name={copied ? "check" : "copy"} size={16} />
              {copied ? "Copied" : copyError ? "Retry" : "Copy"}
            </button>
          </div>

          {/* MEMBER SINCE */}

          <div className="profile-detail-row">
            <div className="profile-detail-icon">
              <Icon name="calendar-days" size={19} />
            </div>

            <div className="profile-detail-content">
              <span>Member since</span>
              <strong>{formattedDate}</strong>
            </div>
          </div>
        </div>

        {/* ACCOUNT ACTIONS */}

        <div className="profile-actions">
          <button
            type="button"
            className="profile-logout-button"
            onClick={handleLogout}
          >
            <Icon name="logout" size={17} />
            Log out
          </button>
        </div>
      </div>

      {/* SECURITY FOOTER */}

      <div className="profile-footer-note">
        <Icon name="shield" size={18} />
        Your account information is managed securely by COXEN.
      </div>
    </section>
  );
}
