
import { useCallback, useEffect, useState } from "react";
import "./App.css";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import LoadingScreen from "./components/LoadingScreen";

import AuthScreen from "./pages/AuthScreen";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import TermsOfServices from "./pages/TermsOfServices";
import PrivacyPolicy from "./pages/PrivacyPolicy";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const TOKEN_KEY = "token";
const SETTINGS_KEY = "settings";
const SESSION_TIMEOUT = 12000;

const ALLOWED_VIEWS = [
  "chat",
  "profile",
  "settings",
  "notifications",
  "terms",
  "privacy",
];

const ROUTE_PATHS = {
  privacy: "/privacy-policy",
  terms: "/terms-of-service",
};

function getSavedAppearance() {
  try {
    const settings = JSON.parse(
      localStorage.getItem(SETTINGS_KEY) || "{}"
    );

    return settings.appearance === "dark" ? "dark" : "light";
  } catch (error) {
    console.error("Unable to read saved appearance:", error);
    return "light";
  }
}

function applyAppearance(appearance) {
  const theme = appearance === "dark" ? "dark" : "light";

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function applyLoggedOutTheme() {
  applyAppearance("light");
}

async function readResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => ({}));
  }

  const message = await response.text();

  return {
    message,
    error: message,
  };
}

function getErrorMessage(data, fallback) {
  return data?.error || data?.message || fallback;
}

function getConversationId(conversation) {
  return (
    conversation?.conversationId ||
    conversation?._id ||
    conversation?.id ||
    null
  );
}

function getInitialView() {
  const routes = {
    "/privacy-policy": "privacy",
    "/terms-of-service": "terms",
  };

  return routes[window.location.pathname] || "chat";
}

function App() {
  // Authentication
  const [token, setToken] = useState(
    () => localStorage.getItem(TOKEN_KEY) || ""
  );
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Navigation
  const [activeView, setActiveView] = useState(getInitialView);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Conversations
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [selectedConversationId, setSelectedConversationId] =
    useState(undefined);

  const [chatResetKey, setChatResetKey] = useState(0);

  // Apply saved theme
  useEffect(() => {
    if (!token || !user) {
      applyLoggedOutTheme();
      return;
    }

    applyAppearance(getSavedAppearance());
  }, [token, user]);

  // Logout
  const logout = useCallback(() => {
    applyLoggedOutTheme();

    localStorage.removeItem(TOKEN_KEY);

    setToken("");
    setUser(null);
    setSidebarOpen(false);
    setActiveView("chat");

    setConversations([]);
    setActiveConversationId(null);
    setSelectedConversationId(undefined);

    setChatResetKey((current) => current + 1);

    if (window.location.pathname !== "/") {
      window.history.pushState({}, "", "/");
    }
  }, []);

  // Restore authenticated session
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, SESSION_TIMEOUT);

    async function restoreSession() {
      const savedToken = localStorage.getItem(TOKEN_KEY);

      if (!savedToken) {
        if (!cancelled) {
          setToken("");
          setUser(null);
          applyLoggedOutTheme();
          setAuthLoading(false);
        }

        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
          signal: controller.signal,
        });

        const data = await readResponse(response);

        if (!response.ok || !data?.user) {
          throw new Error(
            getErrorMessage(data, "Your session has expired.")
          );
        }

        if (cancelled) return;

        setToken(savedToken);
        setUser(data.user);
        applyAppearance(getSavedAppearance());
      } catch (error) {
        if (cancelled) return;

        console.error(
          "Session restoration failed:",
          error.name === "AbortError"
            ? "Request timed out."
            : error.message
        );

        localStorage.removeItem(TOKEN_KEY);

        setToken("");
        setUser(null);
        applyLoggedOutTheme();
      } finally {
        window.clearTimeout(timeoutId);

        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  // Browser navigation
  useEffect(() => {
    function handlePopState() {
      setActiveView(getInitialView());
      setSidebarOpen(false);
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Navigate between pages
  const navigate = useCallback((view) => {
    const nextView = ALLOWED_VIEWS.includes(view) ? view : "chat";

    setActiveView(nextView);
    setSidebarOpen(false);

    const nextPath = ROUTE_PATHS[nextView] || "/";

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
  }, []);

  // Sidebar toggle
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((previous) => !previous);
  }, []);

  // Successful authentication
  const handleAuthenticated = useCallback(
    (data) => {
      if (!data?.token || !data?.user) {
        window.alert("Invalid authentication response from server.");
        return;
      }

      localStorage.setItem(TOKEN_KEY, data.token);

      setToken(data.token);
      setUser(data.user);

      applyAppearance(getSavedAppearance());

      setSidebarOpen(false);
      setConversations([]);
      setActiveConversationId(null);
      setSelectedConversationId(undefined);

      setChatResetKey((current) => current + 1);

      navigate("chat");
    },
    [navigate]
  );

  // Authenticated API requests
  const apiRequest = useCallback(
    async (path, options = {}) => {
      const activeToken = localStorage.getItem(TOKEN_KEY);

      if (!activeToken) {
        throw new Error("Please sign in to continue.");
      }

      const headers = {
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...options.headers,
        Authorization: `Bearer ${activeToken}`,
      };

      const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        logout();

        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      return response;
    },
    [logout]
  );

  // Start new conversation
  const handleNewChat = useCallback(() => {
    setSelectedConversationId(null);
    setActiveConversationId(null);

    setChatResetKey((current) => current + 1);

    navigate("chat");
  }, [navigate]);

  // Select existing conversation
  const handleSelectConversation = useCallback(
    (id) => {
      if (!id) return;

      const conversationId = String(id);

      setSelectedConversationId(conversationId);
      setActiveConversationId(conversationId);

      navigate("chat");
    },
    [navigate]
  );

  // Update conversation list
  const handleConversationsChange = useCallback((updatedConversations) => {
    if (!Array.isArray(updatedConversations)) return;

    setConversations(updatedConversations);
  }, []);

  // Delete conversation
  const handleDeleteConversation = useCallback(
    async (id) => {
      if (!id) {
        throw new Error("Invalid conversation ID.");
      }

      const conversationId = String(id);

      const response = await apiRequest(
        `/api/chat/conversations/${encodeURIComponent(conversationId)}`,
        { method: "DELETE" }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Unable to delete this conversation.")
        );
      }

      setConversations((current) =>
        current.filter(
          (conversation) =>
            String(getConversationId(conversation)) !== conversationId
        )
      );

      const isActive =
        String(activeConversationId) === conversationId;

      const isSelected =
        String(selectedConversationId) === conversationId;

      if (isActive || isSelected) {
        setActiveConversationId(null);
        setSelectedConversationId(null);

        setChatResetKey((current) => current + 1);

        navigate("chat");
      }

      return true;
    },
    [
      apiRequest,
      activeConversationId,
      selectedConversationId,
      navigate,
    ]
  );

  // Shared page properties
  const commonProps = {
    user,
    token,
    apiRequest,
    navigate,
    logout,
  };

  // Render selected page
  function renderPage() {
    switch (activeView) {
      case "chat":
      case undefined:
        return (
          <Chat
            key={chatResetKey}
            {...commonProps}
            selectedConversationId={selectedConversationId}
            onNewChat={handleNewChat}
            onConversationsChange={handleConversationsChange}
            onActiveConversationChange={setActiveConversationId}
            onToggleSidebar={toggleSidebar}
          />
        );

      case "profile":
        return <Profile {...commonProps} />;

      case "settings":
        return <Settings {...commonProps} />;

      case "notifications":
        return <Notifications {...commonProps} />;

      case "terms":
        return <TermsOfServices navigate={navigate} />;

      case "privacy":
        return <PrivacyPolicy navigate={navigate} />;

      default:
        return (
          <Chat
            key={chatResetKey}
            {...commonProps}
            selectedConversationId={selectedConversationId}
            onNewChat={handleNewChat}
            onConversationsChange={handleConversationsChange}
            onActiveConversationChange={setActiveConversationId}
            onToggleSidebar={toggleSidebar}
          />
        );
    }
  }

  // Loading screen
  if (authLoading) {
    return (
      <LoadingScreen
        message="Restoring your COXEN workspace..."
        subtitle="Verifying your session and preparing your workspace"
      />
    );
  }

  // Public legal pages
  if (activeView === "terms" || activeView === "privacy") {
    return (
      <div className="legal-app">
        {renderPage()}
      </div>
    );
  }

  // Authentication
  if (!token || !user) {
    return (
      <AuthScreen
        onAuthenticated={handleAuthenticated}
        navigate={navigate}
      />
    );
  }

  // Main application
  return (
    <div
      className="app-shell prism-app"
      style={{
        display: "flex",
        width: "100%",
        height: "100dvh",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        activeView={activeView}
        setActiveView={navigate}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        user={user}
        logout={logout}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      <main
        className="main-area prism-main"
        style={{
          display: "flex",
          flex: "1 1 0%",
          flexDirection: "column",
          width: 0,
          minWidth: 0,
          minHeight: 0,
          height: "100%",
          overflow: "hidden",
        }}
      >
        <Topbar
          user={user}
          setSidebarOpen={setSidebarOpen}
          setActiveView={navigate}
          activeView={activeView}
        />

        <div
          className="page-content page-enter"
          style={{
            display: "flex",
            flex: "1 1 0%",
            flexDirection: "column",
            width: "100%",
            minWidth: 0,
            minHeight: 0,
            height: 0,
            overflowX: "hidden",
            overflowY: activeView === "chat" ? "hidden" : "auto",
            overscrollBehaviorY: "contain",
          }}
        >
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;
