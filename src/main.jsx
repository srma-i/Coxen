
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";

import App from "./App.jsx";

import "./index.css";
import "./App.css";

// =========================================================
// CONFIGURATION
// =========================================================

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const SETTINGS_KEY = "_settings";

// =========================================================
// THEME INITIALIZATION
// =========================================================

function initializeTheme() {
  const root = document.documentElement;

  try {
    const settings = JSON.parse(
      localStorage.getItem(SETTINGS_KEY) || "{}"
    );

    const theme =
      settings.appearance === "dark" ? "dark" : "light";

    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  } catch (error) {
    console.error("Unable to initialize theme:", error);

    root.dataset.theme = "light";
    root.style.colorScheme = "light";
  }
}

// Apply saved theme before React renders.
initializeTheme();

// =========================================================
// ROOT ELEMENT
// =========================================================

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    'COXEN could not start because the "#root" element was not found.'
  );
}

// =========================================================
// APPLICATION RENDER
// =========================================================

if (!GOOGLE_CLIENT_ID) {
  console.error(
    "Google OAuth Client ID is missing. Check VITE_GOOGLE_CLIENT_ID in your frontend .env file."
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
);
