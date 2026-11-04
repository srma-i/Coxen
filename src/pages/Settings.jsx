
import { useEffect, useState } from "react";
import Icon from "../components/Icon";

const STORAGE_KEY = "settings";

const DEFAULT_SETTINGS = {
  appearance: "light",
};

const SETTINGS_STYLES = `

  .settings-page {
    width: 100%;
    max-width: 1000px;
    margin: 0 auto;
    padding: 30px 32px 48px;
    color: var(--text, #39354e);
    font-family: "DM Sans", sans-serif;
  }

  .settings-page * {
    box-sizing: border-box;
  }

  /* HEADER */

  .settings-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 28px;
  }

  .settings-eyebrow {
    display: inline-block;
    margin-bottom: 8px;
    color: var(--primary, #7967ed);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.8px;
  }

  .settings-heading h1 {
    margin: 0 0 8px;
    color: var(--text, #302b48);
    font-family: "Space Grotesk", sans-serif;
    font-size: 29px;
    font-weight: 750;
    letter-spacing: -0.8px;
  }

  .settings-heading p {
    margin: 0;
    color: var(--text-secondary, #9692a7);
    font-size: 12px;
    line-height: 1.7;
  }

  /* BUTTONS */

  .settings-reset-btn,
  .settings-save-btn,
  .settings-logout-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 39px;
    padding: 0 15px;
    border: 1px solid var(--border, #eae7f4);
    border-radius: 10px;
    font-family: inherit;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: 0.2s ease;
  }

  .settings-reset-btn {
    background: var(--surface, #fff);
    color: var(--text-secondary, #716b88);
  }

  .settings-reset-btn:hover {
    border-color: var(--primary-light, #c9c0ff);
    background: var(--primary-soft, #f8f6ff);
    color: var(--primary, #7967ed);
  }

  /* CARDS */

  .settings-card {
    margin-bottom: 17px;
    padding: 21px 23px;
    border: 1px solid var(--border, #eae8f3);
    border-radius: 16px;
    background: var(--surface, #fff);
    box-shadow: 0 5px 20px rgba(43, 36, 91, 0.035);
    transition: background 0.25s ease, border-color 0.25s ease;
  }

  /* SECTION HEADER */

  .settings-section-heading {
    display: flex;
    align-items: center;
    gap: 13px;
    padding-bottom: 17px;
    margin-bottom: 3px;
    border-bottom: 1px solid var(--border, #f0eef6);
  }

  .settings-icon {
    width: 43px;
    height: 43px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    border: 1px solid var(--border, #eeebfa);
    border-radius: 13px;
    background: var(--primary-soft, #f7f5ff);
    color: var(--primary, #8270e9);
  }

  .settings-section-heading h2 {
    margin: 0 0 5px;
    color: var(--text, #39354e);
    font-family: "Space Grotesk", sans-serif;
    font-size: 14px;
    font-weight: 750;
  }

  .settings-section-heading p {
    margin: 0;
    color: var(--text-secondary, #9692a7);
    font-size: 11px;
    line-height: 1.5;
  }

  /* OPTIONS */

  .settings-option {
    min-height: 73px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    border-bottom: 1px solid var(--border, #f1eff6);
  }

  .settings-option:last-child {
    border-bottom: none;
  }

  .settings-option-info {
    min-width: 0;
  }

  .settings-option-info h4 {
    margin: 0 0 5px;
    color: var(--text, #454057);
    font-size: 12px;
    font-weight: 700;
  }

  .settings-option-info p {
    margin: 0;
    color: var(--text-secondary, #9692a7);
    font-size: 10px;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  /* SELECT */

  .settings-select {
    min-width: 125px;
    padding: 10px 30px 10px 12px;
    border: 1px solid var(--border, #eae7f4);
    border-radius: 9px;
    outline: none;
    background: var(--surface, #fff);
    color: var(--text, #514b67);
    font-family: inherit;
    font-size: 11px;
    cursor: pointer;
  }

  .settings-select option {
    background: var(--surface, #fff);
    color: var(--text, #39354e);
  }

  .settings-select:focus-visible {
    border-color: var(--primary, #9a8af5);
    outline: 2px solid rgba(121, 103, 237, 0.15);
  }

  /* THEME STATUS */

  .settings-theme-status {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 12px;
    color: var(--text-secondary, #9692a7);
    font-size: 10px;
  }

  .settings-theme-status svg,
  .settings-option > svg {
    flex-shrink: 0;
    color: var(--primary, #8270e9);
  }

  /* LOGOUT */

  .settings-logout-btn {
    margin-top: 15px;
    border-color: rgba(211, 106, 119, 0.25);
    background: var(--surface, #fff7f8);
    color: var(--danger, #d36a77);
  }

  .settings-logout-btn:hover {
    border-color: rgba(211, 106, 119, 0.5);
    background: rgba(211, 106, 119, 0.08);
  }

  /* FOOTER */

  .settings-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    padding: 12px 0;
  }

  .settings-footer p {
    margin: 0;
    color: var(--text-secondary, #9692a7);
    font-size: 11px;
  }

  .settings-save-btn {
    min-width: 140px;
    border-color: var(--primary, #7967ed);
    background: var(--primary, #7967ed);
    color: #fff;
  }

  .settings-save-btn:hover {
    border-color: var(--primary-dark, #6855dc);
    background: var(--primary-dark, #6855dc);
    box-shadow: 0 5px 14px rgba(121, 103, 237, 0.18);
    transform: translateY(-1px);
  }

  .settings-save-btn:active {
    transform: translateY(0);
  }

  /* FEEDBACK */

  .settings-feedback {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--success, #39966a) !important;
    font-size: 11px;
  }

  .settings-feedback.error {
    color: var(--danger, #d36a77) !important;
  }

  /* RESET MODAL */

  .settings-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: grid;
    place-items: center;
    padding: 20px;
    background: rgba(20, 17, 35, 0.48);
    backdrop-filter: blur(5px);
    animation: settingsFadeIn 0.18s ease;
  }

  .settings-modal {
    width: 100%;
    max-width: 390px;
    padding: 25px;
    border: 1px solid var(--border, #eae8f3);
    border-radius: 17px;
    background: var(--surface, #fff);
    color: var(--text, #39354e);
    box-shadow: 0 20px 70px rgba(20, 17, 35, 0.2);
    animation: settingsModalIn 0.2s ease;
  }

  .settings-modal-icon {
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    margin-bottom: 17px;
    border-radius: 14px;
    background: var(--primary-soft, #f5f2ff);
    color: var(--primary, #7967ed);
  }

  .settings-modal h3 {
    margin: 0 0 9px;
    color: var(--text, #302b48);
    font-family: "Space Grotesk", sans-serif;
    font-size: 18px;
    font-weight: 750;
  }

  .settings-modal p {
    margin: 0;
    color: var(--text-secondary, #88839b);
    font-size: 12px;
    line-height: 1.7;
  }

  .settings-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 25px;
  }

  .settings-modal-btn {
    min-height: 37px;
    padding: 0 14px;
    border: 1px solid var(--border, #eae8f3);
    border-radius: 9px;
    background: var(--surface, #fff);
    color: var(--text-secondary, #716b88);
    font-family: inherit;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: 0.2s ease;
  }

  .settings-modal-btn:hover {
    background: var(--primary-soft, #f8f6ff);
    border-color: var(--primary-light, #c9c0ff);
  }

  .settings-modal-btn.confirm {
    border-color: var(--primary, #7967ed);
    background: var(--primary, #7967ed);
    color: #fff;
  }

  .settings-modal-btn.confirm:hover {
    background: var(--primary-dark, #6855dc);
  }

  /* DARK THEME */

  :root[data-theme="dark"] .settings-card {
    box-shadow: none;
  }

  :root[data-theme="dark"] .settings-icon {
    background: var(--primary-soft, #25213b);
    border-color: var(--border, #393253);
  }

  :root[data-theme="dark"] .settings-select {
    background: var(--surface-soft, #211f31);
    border-color: var(--border, #39354d);
    color: var(--text, #e5e0f5);
  }

  :root[data-theme="dark"] .settings-select option {
    background: var(--surface, #211f31);
    color: var(--text, #e5e0f5);
  }

  :root[data-theme="dark"] .settings-reset-btn {
    background: var(--surface-soft, #211f31);
    border-color: var(--border, #39354d);
    color: var(--text, #e5e0f5);
  }

  :root[data-theme="dark"] .settings-reset-btn:hover {
    background: var(--primary-soft, #2b2644);
    border-color: var(--primary, #7967ed);
  }

  :root[data-theme="dark"] .settings-logout-btn {
    background: #30202c;
    border-color: #59303c;
  }

  :root[data-theme="dark"] .settings-logout-btn:hover {
    background: #3b2633;
  }

  /* ANIMATIONS */

  @keyframes settingsFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes settingsModalIn {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* ACCESSIBILITY */

  .settings-page button:focus-visible,
  .settings-modal button:focus-visible {
    outline: 2px solid var(--primary, #9a8af5);
    outline-offset: 3px;
  }

  /* RESPONSIVE */

  @media (max-width: 800px) {
    .settings-page {
      padding: 24px 20px 40px;
    }
  }

  @media (max-width: 600px) {
    .settings-page {
      padding: 20px 14px 35px;
    }

    .settings-heading h1 {
      font-size: 25px;
    }

    .settings-heading p {
      max-width: 250px;
      font-size: 11px;
    }

    .settings-card {
      padding: 16px;
      border-radius: 14px;
    }

    .settings-section-heading {
      gap: 10px;
    }

    .settings-icon {
      width: 39px;
      height: 39px;
    }

    .settings-section-heading h2 {
      font-size: 13px;
    }

    .settings-option {
      gap: 12px;
    }

    .settings-select {
      min-width: 105px;
    }

    .settings-footer {
      align-items: stretch;
      flex-direction: column;
    }

    .settings-save-btn {
      width: 100%;
    }
  }

  @media (max-width: 380px) {
    .settings-heading {
      align-items: flex-start;
    }

    .settings-reset-btn {
      min-height: 35px;
      padding: 0 10px;
      font-size: 10px;
    }

    .settings-option-info p {
      max-width: 190px;
    }

    .settings-modal {
      padding: 21px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .settings-page button,
    .settings-modal,
    .settings-modal-backdrop {
      animation: none;
      transition: none;
    }
  }
`;

function getSavedSettings() {
  try {
    const storedSettings = localStorage.getItem(STORAGE_KEY);

    if (!storedSettings) {
      return { ...DEFAULT_SETTINGS };
    }

    const parsedSettings = JSON.parse(storedSettings);

    return {
      appearance:
        parsedSettings?.appearance === "dark" ? "dark" : "light",
    };
  } catch (error) {
    console.error("Could not load settings:", error);
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettingsToStorage(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function applyAppearanceTheme(appearance) {
  const theme = appearance === "dark" ? "dark" : "light";

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export default function Settings({ user, logout }) {
  const [settings, setSettings] = useState(getSavedSettings);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const currentThemeLabel =
    settings.appearance === "dark" ? "Dark" : "Light";

  // Apply theme whenever the selected appearance changes.
  useEffect(() => {
    applyAppearanceTheme(settings.appearance);
  }, [settings.appearance]);

  // Update and automatically save appearance settings.
  const updateSetting = (key, value) => {
    if (settings[key] === value) return;

    const updatedSettings = {
      ...settings,
      [key]: value,
    };

    setSettings(updatedSettings);
    setSaved(false);
    setSaveError("");

    if (key !== "appearance") return;

    try {
      saveSettingsToStorage(updatedSettings);
      setSaved(true);
    } catch (error) {
      console.error("Could not save appearance:", error);
      setSaveError("Unable to save theme preference.");
    }
  };

  // Save current preferences.
  const saveSettings = () => {
    try {
      saveSettingsToStorage(settings);
      applyAppearanceTheme(settings.appearance);

      setSaved(true);
      setSaveError("");
    } catch (error) {
      console.error("Could not save settings:", error);

      setSaved(false);
      setSaveError("Unable to save preferences. Please try again.");
    }
  };

  // Close reset confirmation.
  const cancelReset = () => {
    setShowResetConfirm(false);
  };

  // Reset preferences to their defaults.
  const confirmReset = () => {
    try {
      const defaultSettings = { ...DEFAULT_SETTINGS };

      saveSettingsToStorage(defaultSettings);

      setSettings(defaultSettings);
      applyAppearanceTheme(defaultSettings.appearance);

      setSaved(true);
      setSaveError("");
    } catch (error) {
      console.error("Could not reset settings:", error);

      setSaved(false);
      setSaveError("Unable to reset preferences. Please try again.");
    } finally {
      setShowResetConfirm(false);
    }
  };

  // Close confirmation with Escape.
  useEffect(() => {
    if (!showResetConfirm) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        cancelReset();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showResetConfirm]);

  const handleLogout = () => {
    if (typeof logout === "function") {
      logout();
    }
  };

  return (
    <div className="settings-page">
      <style>{SETTINGS_STYLES}</style>

      {/* HEADER */}

      <div className="settings-heading">
        <div>
          <span className="settings-eyebrow">PERSONALIZATION</span>
          <h1>Settings</h1>
          <p>Customize your COXEN experience.</p>
        </div>

        <button
          type="button"
          className="settings-reset-btn"
          onClick={() => setShowResetConfirm(true)}
        >
          <Icon name="refresh" size={16} />
          Reset
        </button>
      </div>

      {/* APPEARANCE */}

      <section className="settings-card">
        <div className="settings-section-heading">
          <div className="settings-icon">
            <Icon name="eye" size={20} />
          </div>

          <div>
            <h2>Appearance</h2>
            <p>Choose how COXEN looks on your device.</p>
          </div>
        </div>

        <div className="settings-option">
          <div className="settings-option-info">
            <h4>Interface theme</h4>
            <p>Your selection is saved automatically.</p>
          </div>

          <select
            className="settings-select"
            value={settings.appearance}
            onChange={(event) =>
              updateSetting("appearance", event.target.value)
            }
            aria-label="Interface theme"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div className="settings-theme-status" aria-live="polite">
          <Icon
            name={settings.appearance === "dark" ? "moon" : "sun"}
            size={14}
          />
          Currently using {currentThemeLabel} appearance
        </div>
      </section>

      {/* PRIVACY AND SECURITY */}

      <section className="settings-card">
        <div className="settings-section-heading">
          <div className="settings-icon">
            <Icon name="shield" size={20} />
          </div>

          <div>
            <h2>Privacy and security</h2>
            <p>Your account information and security.</p>
          </div>
        </div>

        <div className="settings-option">
          <div className="settings-option-info">
            <h4>Account email</h4>
            <p>{user?.email || "No email available"}</p>
          </div>

          <Icon name="lock" size={19} />
        </div>
      </section>

      {/* ACCOUNT */}

      <section className="settings-card">
        <div className="settings-section-heading">
          <div className="settings-icon">
            <Icon name="user" size={20} />
          </div>

          <div>
            <h2>Account</h2>
          </div>
        </div>

        <div className="settings-option">
          <div className="settings-option-info">
            <h4>Signed in as</h4>
            <p>{user?.name || user?.email || "User"}</p>
          </div>
        </div>

        {typeof logout === "function" && (
          <button
            type="button"
            className="settings-logout-btn"
            onClick={handleLogout}
          >
            <Icon name="logout" size={17} />
            Log out
          </button>
        )}
      </section>

      {/* SAVE PREFERENCES */}

      <div className="settings-footer">
        <div aria-live="polite">
          {saved && (
            <p className="settings-feedback" role="status">
              <Icon name="check-circle" size={13} />
              Your preferences have been saved.
            </p>
          )}

          {saveError && (
            <p className="settings-feedback error" role="alert">
              {saveError}
            </p>
          )}

          {!saved && !saveError && (
            <p>Your theme is saved automatically.</p>
          )}
        </div>

        <button
          type="button"
          className="settings-save-btn"
          onClick={saveSettings}
        >
          <Icon name="check" size={17} />
          Save changes
        </button>
      </div>

      {/* RESET CONFIRMATION */}

      {showResetConfirm && (
        <div
          className="settings-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              cancelReset();
            }
          }}
        >
          <div
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-reset-title"
            aria-describedby="settings-reset-description"
          >
            <div className="settings-modal-icon">
              <Icon name="refresh" size={22} />
            </div>

            <h3 id="settings-reset-title">Reset settings?</h3>

            <p id="settings-reset-description">
              This will restore your COXEN appearance settings
              to their default values and switch the interface to
              Light mode.
            </p>

            <div className="settings-modal-actions">
              <button
                type="button"
                className="settings-modal-btn"
                onClick={cancelReset}
              >
                Cancel
              </button>

              <button
                type="button"
                className="settings-modal-btn confirm"
                onClick={confirmReset}
              >
                Confirm reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
