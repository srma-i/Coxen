import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "../components/Icon";

const REQUEST_TIMEOUTS = {
  history: 12000,
  conversations: 8000,
  chat: 120000,
};

const SUGGESTIONS = [
  {
    icon: "sparkles",
    title: "Explore an idea",
    description: "Discover possibilities",
    prompt: "Help me explore an interesting new idea.",
  },
  {
    icon: "file",
    title: "Write something",
    description: "Create better content",
    prompt: "Help me write a clear and professional document.",
  },
  {
    icon: "search",
    title: "Learn something",
    description: "Understand a new topic",
    prompt: "Explain an interesting topic step by step.",
  },
  {
    icon: "brain",
    title: "Organize my thoughts",
    description: "Build a practical plan",
    prompt: "Help me organize my thoughts and create a plan.",
  },
];

function normalizeMessages(data) {
  const source = Array.isArray(data)
    ? data
    : data?.messages || data?.history || data?.data?.messages || [];

  if (!Array.isArray(source)) return [];

  return source.map((item, index) => ({
    id: String(item._id || item.id || `message-${index}`),
    role:
      item.role === "model" || item.role === "assistant"
        ? "assistant"
        : "user",
    content:
      item.content ??
      item.message ??
      item.text ??
      item.parts?.[0]?.text ??
      "",
  }));
}

function getErrorMessage(data, fallback) {
  return data?.message || data?.error || fallback;
}

function isAbortError(error) {
  return error?.name === "AbortError";
}

async function readErrorResponse(response, fallback) {
  const data = await response.json().catch(() => ({}));
  return new Error(getErrorMessage(data, fallback));
}

export default function Chat({
  user,
  apiRequest,
  selectedConversationId,
  onNewChat,
  onConversationsChange,
  onActiveConversationChange,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [selectedAction, setSelectedAction] = useState("chat");

  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);

  const abortControllerRef = useRef(null);
  const historyControllerRef = useRef(null);
  const conversationIdRef = useRef(null);

  const requestIdRef = useRef(0);
  const historyRequestIdRef = useRef(0);
  const sendingRef = useRef(false);
  const mountedRef = useRef(false);

  const lastSelectionRef = useRef(undefined);

  const updateConversationId = useCallback(
    (id) => {
      const conversationId = id ? String(id) : null;

      conversationIdRef.current = conversationId;
      onActiveConversationChange?.(conversationId);
    },
    [onActiveConversationChange]
  );

  const cancelActiveRequests = useCallback(() => {
    requestIdRef.current += 1;
    historyRequestIdRef.current += 1;

    abortControllerRef.current?.abort();
    historyControllerRef.current?.abort();

    abortControllerRef.current = null;
    historyControllerRef.current = null;

    sendingRef.current = false;

    if (mountedRef.current) {
      setSending(false);
    }
  }, []);

  const refreshConversations = useCallback(async () => {
    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUTS.conversations
    );

    try {
      const response = await apiRequest("/api/chat/conversations", {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("Unable to load conversations.");
      }

      const data = await response.json();

      if (controller.signal.aborted) return [];

      const conversations = Array.isArray(data)
        ? data
        : data?.conversations || [];

      onConversationsChange?.(conversations);

      return conversations;
    } catch (err) {
      if (!isAbortError(err)) {
        console.error("Conversation list error:", err);
      }

      return [];
    } finally {
      clearTimeout(timeout);
    }
  }, [apiRequest, onConversationsChange]);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    const container = messagesContainerRef.current;

    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scrollToBottom("auto");
    });

    return () => cancelAnimationFrame(frame);
  }, [messages, scrollToBottom]);

  const loadLatestConversation = useCallback(async () => {
    cancelActiveRequests();

    const requestId = ++historyRequestIdRef.current;
    const controller = new AbortController();

    historyControllerRef.current = controller;

    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUTS.history);

    setLoadingHistory(true);
    setError("");

    try {
      const response = await apiRequest("/api/chat/history", {
        signal: controller.signal,
      });

      if (
        controller.signal.aborted ||
        requestId !== historyRequestIdRef.current
      ) return;

      if (!response.ok) {
        throw await readErrorResponse(
          response,
          "Unable to load chat history."
        );
      }

      const data = await response.json();

      if (
        controller.signal.aborted ||
        requestId !== historyRequestIdRef.current
      ) return;

      setMessages(normalizeMessages(data));
      updateConversationId(data?.conversationId || null);

      void refreshConversations();
    } catch (err) {
      if (requestId !== historyRequestIdRef.current) return;

      if (timedOut) {
        setMessages([]);
        updateConversationId(null);

        setError(
          "Restoring conversations took too long. You can start a new message."
        );
      } else if (!isAbortError(err)) {
        console.error("Chat history error:", err);

        setMessages([]);
        updateConversationId(null);

        setError(
          err.message ||
            "Unable to restore conversations. You can still chat."
        );
      }
    } finally {
      clearTimeout(timeout);

      if (requestId === historyRequestIdRef.current) {
        setLoadingHistory(false);
        historyControllerRef.current = null;
      }
    }
  }, [
    apiRequest,
    cancelActiveRequests,
    refreshConversations,
    updateConversationId,
  ]);

  const openConversation = useCallback(
    async (id) => {
      if (!id) return;

      cancelActiveRequests();

      const requestId = ++historyRequestIdRef.current;
      const controller = new AbortController();

      historyControllerRef.current = controller;

      let timedOut = false;

      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, REQUEST_TIMEOUTS.history);

      setLoadingHistory(true);
      setError("");
      setMessages([]);
      setInput("");
      setSelectedAction("chat");

      try {
        const response = await apiRequest(
          `/api/chat/conversations/${encodeURIComponent(id)}`,
          {
            signal: controller.signal,
          }
        );

        if (
          controller.signal.aborted ||
          requestId !== historyRequestIdRef.current
        ) return;

        if (!response.ok) {
          throw await readErrorResponse(
            response,
            "Unable to open this conversation."
          );
        }

        const data = await response.json();

        if (
          controller.signal.aborted ||
          requestId !== historyRequestIdRef.current
        ) return;

        setMessages(normalizeMessages(data));
        updateConversationId(data?.conversationId || id);
      } catch (err) {
        if (requestId !== historyRequestIdRef.current) return;

        if (timedOut) {
          setError(
            "Opening this conversation took too long. Please try again."
          );
        } else if (!isAbortError(err)) {
          console.error("Open conversation error:", err);

          setError(
            err.message || "Unable to open this conversation."
          );
        }
      } finally {
        clearTimeout(timeout);

        if (requestId === historyRequestIdRef.current) {
          setLoadingHistory(false);
          historyControllerRef.current = null;
        }
      }
    },
    [apiRequest, cancelActiveRequests, updateConversationId]
  );

  useEffect(() => {
    if (selectedConversationId === undefined) {
      lastSelectionRef.current = undefined;
      void loadLatestConversation();
      return;
    }

    if (selectedConversationId === null) {
      lastSelectionRef.current = null;

      cancelActiveRequests();

      setLoadingHistory(false);
      setError("");
      setMessages([]);
      setInput("");
      setSelectedAction("chat");

      updateConversationId(null);
      return;
    }

    const selectedId = String(selectedConversationId);

    if (
      lastSelectionRef.current === selectedId &&
      conversationIdRef.current === selectedId
    ) return;

    lastSelectionRef.current = selectedId;

    void openConversation(selectedId);
  }, [
    selectedConversationId,
    loadLatestConversation,
    openConversation,
    cancelActiveRequests,
    updateConversationId,
  ]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      requestIdRef.current += 1;
      historyRequestIdRef.current += 1;

      abortControllerRef.current?.abort();
      historyControllerRef.current?.abort();

      abortControllerRef.current = null;
      historyControllerRef.current = null;
    };
  }, []);

  const startNewChat = useCallback(() => {
    cancelActiveRequests();

    lastSelectionRef.current = null;

    setLoadingHistory(false);
    setError("");
    setMessages([]);
    setInput("");
    setSelectedAction("chat");

    updateConversationId(null);
    onNewChat?.();

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, [
    cancelActiveRequests,
    onNewChat,
    updateConversationId,
  ]);

  const sendMessage = async (event) => {
    event?.preventDefault();

    const message = input.trim();

    if (!message || sendingRef.current || loadingHistory) return;

    const requestId = ++requestIdRef.current;

    setError("");
    setInput("");
    setSending(true);

    sendingRef.current = true;

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMessage = {
      id: `user-${Date.now()}-${requestId}`,
      role: "user",
      content: message,
    };

    const assistantMessage = {
      id: `assistant-${Date.now()}-${requestId}`,
      role: "assistant",
      content: "",
    };

    setMessages((current) => [
      ...current,
      userMessage,
      assistantMessage,
    ]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let timedOut = false;
    let reader = null;

    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUTS.chat);

    try {
      const response = await apiRequest("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          conversationId: conversationIdRef.current,
        }),
        signal: controller.signal,
      });

      if (
        requestId !== requestIdRef.current ||
        controller.signal.aborted
      ) return;

      if (!response.ok) {
        throw await readErrorResponse(
          response,
          "Unable to get an AI response."
        );
      }

      const returnedConversationId =
        response.headers.get("X-Conversation-Id");

      if (returnedConversationId) {
        updateConversationId(returnedConversationId);
      }

      if (!response.body) {
        throw new Error(
          "Your browser does not support response streaming."
        );
      }

      reader = response.body.getReader();

      const decoder = new TextDecoder();
      let completeResponse = "";

      while (true) {
        const { done, value } = await reader.read();

        if (requestId !== requestIdRef.current) {
          await reader.cancel().catch(() => {});
          return;
        }

        if (controller.signal.aborted) {
          throw new DOMException(
            "Request cancelled.",
            "AbortError"
          );
        }

        if (done) break;

        completeResponse += decoder.decode(value, {
          stream: true,
        });

        setMessages((current) =>
          current.map((item) =>
            item.id === assistantMessage.id
              ? { ...item, content: completeResponse }
              : item
          )
        );
      }

      completeResponse += decoder.decode();

      if (requestId !== requestIdRef.current) return;

      if (!completeResponse.trim()) {
        throw new Error("The AI returned an empty response.");
      }

      setMessages((current) =>
        current.map((item) =>
          item.id === assistantMessage.id
            ? { ...item, content: completeResponse }
            : item
        )
      );

      void refreshConversations();
    } catch (err) {
      if (isAbortError(err)) {
        if (timedOut && requestId === requestIdRef.current) {
          setError(
            "The AI response took too long. Please try again."
          );

          setMessages((current) =>
            current.filter(
              (item) =>
                item.id !== assistantMessage.id &&
                item.id !== userMessage.id
            )
          );

          setInput(message);
        }

        return;
      }

      if (requestId !== requestIdRef.current) return;

      console.error("Chat error:", err);

      setMessages((current) =>
        current.filter(
          (item) =>
            item.id !== assistantMessage.id &&
            item.id !== userMessage.id
        )
      );

      setError(
        err.message || "Something went wrong. Please try again."
      );

      setInput(message);
    } finally {
      clearTimeout(timeout);

      if (reader) {
        try {
          reader.releaseLock();
        } catch (err) {
          console.warn("Unable to release response reader:", err);
        }
      }

      if (requestId === requestIdRef.current) {
        sendingRef.current = false;
        setSending(false);
        abortControllerRef.current = null;

        requestAnimationFrame(() => {
          textareaRef.current?.focus();
        });
      }
    }
  };

  const handleSuggestion = (prompt) => {
    setInput(prompt);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const handleTextareaChange = (event) => {
    const textarea = event.target;

    setInput(textarea.value);

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      180
    )}px`;
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const handleAction = (action) => {
    setSelectedAction(action);

    const prompts = {
      research: "Research this topic in detail: ",
      writing: "Help me write: ",
    };

    setInput((current) =>
      current ? `${current} ` : prompts[action]
    );

    textareaRef.current?.focus();
  };

  const copyResponse = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error("Copy failed:", err);
      setError("Unable to copy this response.");
    }
  };

  const displayName =
    user?.name ||
    user?.username ||
    user?.email?.split("@")[0] ||
    "there";

  return (
    <>
      <style>{`
        /* =========================================
           CHAT PAGE - FULL WIDTH LAYOUT
        ========================================= */

        .chat-page {
          position: relative;
          display: flex;
          flex: 1 1 0;
          flex-direction: column;
          align-self: stretch;
          width: 100%;
          min-width: 0;
          min-height: 0;
          height: 100%;
          overflow: hidden;
          background: var(--background);
          color: var(--text);
          font-family: "DM Sans", sans-serif;
          box-sizing: border-box;
        }

        .chat-page *,
        .chat-page *::before,
        .chat-page *::after {
          box-sizing: border-box;
        }

        .chat-main {
          position: relative;
          display: flex;
          flex: 1 1 0;
          flex-direction: column;
          width: 100%;
          max-width: none;
          height: 100%;
          min-width: 0;
          min-height: 0;
          margin: 0;

          /* Right padding removed so the welcome scrollbar
             can sit at the extreme right edge. */
          padding: 0 0 0 34px;

          overflow: hidden;
        }

        /* =========================================
           LOADING
        ========================================= */

        .chat-loading {
          display: flex;
          flex: 1 1 0;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          min-height: 0;
          color: var(--text-secondary);
          font-size: 13px;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          border: 3px solid var(--primary-soft);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: chat-spin 0.8s linear infinite;
        }

        @keyframes chat-spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* =========================================
           TOP TOOLBAR
        ========================================= */

        .chat-toolbar {
          display: flex;
          flex: 0 0 auto;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          min-height: 68px;

          /* Preserve spacing for the New Chat button. */
          padding: 0 34px 0 2px;

          border-bottom: 1px solid var(--border);
        }

        .chat-toolbar-label {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 650;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          flex-shrink: 0;
          border-radius: 50%;
          background: var(--success);
          box-shadow: 0 0 0 4px rgba(54, 201, 149, 0.11);
        }

        /* NEW CHAT BUTTON */

        .chat-new-button {
          display: flex;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-width: 132px;
          min-height: 44px;
          padding: 0 17px;
          border: 1px solid var(--primary-light);
          border-radius: 11px;
          background: var(--primary-soft);
          color: var(--primary);
          font-size: 12px;
          font-weight: 750;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .chat-new-button svg {
          width: 21px;
          height: 21px;
          flex-shrink: 0;
        }

        .chat-new-button:hover {
          background: var(--primary);
          color: #fff;
          border-color: var(--primary);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .chat-new-button:active {
          transform: scale(0.97);
        }

        /* =========================================
           WELCOME SCREEN
        ========================================= */

        .chat-welcome {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;

          /* Full available width moves the scrollbar
             from the centered 700px container to the right edge. */
          width: 100%;
          max-width: none;

          min-height: 0;
          margin: auto;
          padding: 30px 0;

          overflow-x: hidden;
          overflow-y: auto;

          text-align: center;
        }

        .chat-welcome-icon {
          display: flex;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          width: 76px;
          height: 76px;
          margin-bottom: 23px;
          border: 1px solid var(--primary-light);
          border-radius: 24px;
          background: linear-gradient(
            145deg,
            var(--primary-soft),
            var(--primary-light)
          );
          color: var(--primary);
          box-shadow: 0 10px 30px rgba(115, 94, 232, 0.12);
        }

        .chat-welcome-logo {
          display: block;
          width: 68px;
          height: 68px;
          object-fit: contain;
        }

        .chat-eyebrow {
          color: var(--primary);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .chat-welcome h2 {
          margin: 16px 0 12px;
          color: var(--text);
          font-family: "Space Grotesk", sans-serif;
          font-size: clamp(26px, 4vw, 37px);
          font-weight: 700;
          line-height: 1.25;
          letter-spacing: -1.3px;
        }

        .chat-welcome h2 span {
          color: var(--primary);
        }

        .chat-welcome > p {
          max-width: 470px;
          margin: 0;
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.8;
        }

        /* =========================================
           SUGGESTIONS
        ========================================= */

        .chat-suggestions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          width: 100%;

          /* Keep suggestion cards at their original width. */
          max-width: 700px;

          margin-top: 32px;
          text-align: left;
        }

        .chat-suggestion-card {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 72px;
          padding: 0 15px;
          border: 1px solid var(--border);
          border-radius: 13px;
          background: var(--surface);
          color: var(--text-secondary);
          cursor: pointer;
          transition: 0.2s ease;
        }

        .chat-suggestion-card:hover {
          transform: translateY(-3px);
          border-color: var(--primary-light);
          box-shadow: var(--shadow-md);
          color: var(--primary);
        }

        .suggestion-icon {
          display: grid;
          flex-shrink: 0;
          place-items: center;
          width: 38px;
          height: 38px;
          border-radius: 11px;
          background: var(--primary-soft);
          color: var(--primary);
        }

        .suggestion-copy {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
          text-align: left;
        }

        .suggestion-copy strong {
          color: var(--text);
          font-size: 11px;
          font-weight: 700;
        }

        .suggestion-copy small {
          color: var(--text-secondary);
          font-size: 9px;
        }

        /* =========================================
           CHAT MESSAGES
        ========================================= */

        .chat-messages {
          display: flex;
          flex: 1 1 0;
          flex-direction: column;
          gap: 28px;
          width: 100%;
          max-width: 900px;
          min-height: 0;
          margin: 0 auto;
          padding: 27px 0;
          overflow-x: hidden;
          overflow-y: auto;
          overscroll-behavior: contain;
          scrollbar-width: thin;
        }

        .chat-message {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          width: 100%;
        }

        .message-avatar {
          display: flex;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border: 1px solid var(--primary-light);
          border-radius: 12px;
          background: var(--primary-soft);
          color: var(--primary);
        }

        .assistant-message .message-avatar {
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(145deg, var(--primary-soft), var(--primary-light));
          );
        }

        .message-avatar-logo {
          display: block;
          width: 100%;
          height: 100%;
          padding: 5px;
          object-fit: contain;
        }

        .user-message .message-avatar {
          border-color: var(--border);
          background: var(--surface-soft);
          color: var(--text-secondary);
        }

        .message-content {
          flex: 1;
          min-width: 0;
          padding-top: 2px;
        }

        .message-author {
          margin-bottom: 8px;
          color: var(--text);
          font-size: 11px;
          font-weight: 800;
        }

        .message-text {
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.85;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .user-message .message-text {
          display: inline-block;
          padding: 12px 15px;
          border: 1px solid var(--primary-light);
          border-radius: 4px 13px 13px 13px;
          background: var(--primary-soft);
          color: var(--text);
        }

        .assistant-message .message-text {
          padding-right: 10px;
        }

        /* =========================================
           TYPING INDICATOR
        ========================================= */

        .typing-indicator {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 8px 0;
        }

        .typing-indicator span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--primary);
          animation: chat-typing 1.1s infinite ease-in-out;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes chat-typing {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.45;
          }

          30% {
            transform: translateY(-5px);
            opacity: 1;
          }
        }

        /* =========================================
           COPY RESPONSE
        ========================================= */

        .message-copy-button {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 10px;
          padding: 6px 9px;
          border: 1px solid var(--border);
          border-radius: 7px;
          background: var(--surface);
          color: var(--text-secondary);
          font-size: 10px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .message-copy-button:hover {
          border-color: var(--primary-light);
          color: var(--primary);
        }

        /* =========================================
           ERROR MESSAGE
        ========================================= */

        .chat-error {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          max-width: 900px;
          flex: 0 0 auto;
          margin: 0 auto 12px;
          padding: 11px 13px;
          border: 1px solid rgba(214, 76, 96, 0.25);
          border-radius: 9px;
          background: rgba(214, 76, 96, 0.08);
          color: var(--danger);
          font-size: 11px;
        }

        .chat-error button {
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }

        /* =========================================
           MESSAGE COMPOSER
        ========================================= */

        .chat-composer-area {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 900px;
          flex: 0 0 auto;
          margin: auto auto 0;

          /* Keep the composer slightly inset from the right. */
          padding: 16px 34px 15px 0;

          background: var(--background);
        }

        .chat-composer {
          padding: 14px 15px 10px;
          border: 1px solid var(--border);
          border-radius: 17px;
          background: var(--surface);
          box-shadow: var(--shadow-sm);
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .chat-composer:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(120, 103, 255, 0.08);
        }

        .chat-composer textarea {
          display: block;
          width: 100%;
          min-height: 39px;
          max-height: 180px;
          padding: 8px 5px;
          resize: none;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text);
          font-family: inherit;
          font-size: 13px;
          line-height: 1.6;
        }

        .chat-composer textarea::placeholder {
          color: var(--muted);
        }

        .chat-composer textarea:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .chat-composer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-top: 8px;
        }

        .composer-tools {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .composer-tools button {
          display: flex;
          align-items: center;
          gap: 6px;
          min-height: 31px;
          padding: 0 10px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--surface);
          color: var(--text-secondary);
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .composer-tools button:hover,
        .composer-tools button.active {
          border-color: var(--primary-light);
          background: var(--primary-soft);
          color: var(--primary);
        }

        /* =========================================
           SEND BUTTON
        ========================================= */

        .chat-send-button {
          display: flex;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border: 0;
          border-radius: 11px;
          background: var(--primary);
          color: #fff;
          cursor: pointer;
          box-shadow: var(--shadow-sm);
          transition: 0.2s ease;
        }

        .chat-send-button:hover:not(:disabled) {
          transform: translateY(-2px);
          background: var(--primary-dark);
        }

        .chat-send-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: none;
        }

        .send-loading {
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        /* =========================================
           DISCLAIMER
        ========================================= */

        .chat-disclaimer {
          margin: 10px 0 0;
          color: var(--text-secondary);
          font-size: 9px;
          text-align: center;
        }

        /* =========================================
           TABLET RESPONSIVENESS
        ========================================= */

        @media (max-width: 900px) {
          .chat-main {
            padding-left: 22px;
          }
        }

        /* =========================================
           MOBILE RESPONSIVENESS
        ========================================= */

        @media (max-width: 600px) {
          .chat-main {
            padding-left: 14px;
          }

          .chat-toolbar {
            min-height: 58px;
          }

          .chat-new-button {
            min-width: 112px;
            min-height: 40px;
            padding: 0 12px;
            font-size: 11px;
            gap: 7px;
          }

          .chat-new-button svg {
            width: 19px;
            height: 19px;
          }

          .chat-welcome {
            padding: 22px 0;
          }

          .chat-welcome-icon {
            width: 62px;
            height: 62px;
          }

          .chat-welcome-logo {
            width: 54px;
            height: 54px;
          }

          .chat-welcome h2 {
            font-size: 27px;
          }

          .chat-welcome > p {
            font-size: 11px;
          }

          .chat-suggestions {
            grid-template-columns: 1fr;
            gap: 9px;
            margin-top: 24px;
          }

          .chat-suggestion-card {
            min-height: 60px;
          }

          .chat-messages {
            gap: 23px;
            padding: 20px 0;
          }

          .chat-message {
            gap: 9px;
          }

          .message-avatar {
            width: 31px;
            height: 31px;
          }

          .message-text {
            font-size: 12px;
          }

          .chat-composer-area {
            padding: 12px 14px 12px 0;
          }

          .chat-composer {
            padding: 11px 11px 9px;
          }

          .composer-tools {
            gap: 5px;
          }

          .composer-tools button {
            padding: 0 8px;
            font-size: 9px;
          }

          .chat-send-button {
            width: 39px;
            height: 39px;
          }
        }

        /* =========================================
           SMALL MOBILE
        ========================================= */

        @media (max-width: 380px) {
          .chat-main {
            padding-left: 10px;
          }

          .chat-welcome h2 {
            font-size: 24px;
          }

          .chat-new-button {
            min-width: 105px;
            padding: 0 9px;
          }

          .chat-disclaimer {
            font-size: 8px;
          }
        }

        /* =========================================
           REDUCED MOTION
        ========================================= */

        @media (prefers-reduced-motion: reduce) {
          .chat-page *,
          .chat-page *::before,
          .chat-page *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <section className="chat-page">
        <div className="chat-main">

          {loadingHistory ? (
            <div className="chat-loading">
              <div className="loading-spinner" />
              <p>Restoring your conversations...</p>
            </div>
          ) : (
            <>
              {/* TOP TOOLBAR */}

              <div className="chat-toolbar">
                <div className="chat-toolbar-label">
                  <span className="status-dot" />
                  AI is ready
                </div>

                <button
                  type="button"
                  className="chat-new-button"
                  onClick={startNewChat}
                  title="Start a new conversation"
                >
                  <Icon name="plus" size={21} />
                  <span>New chat</span>
                </button>
              </div>

              {/* WELCOME SCREEN */}

              {messages.length === 0 ? (
                <div className="chat-welcome">
                  <div className="chat-welcome-icon">
                    <img
                      src="/logo.png"
                      alt="COXEN CX logo"
                      className="chat-welcome-logo"
                    />
                  </div>

                  <span className="chat-eyebrow">
                    YOUR PERSONAL AI WORKSPACE
                  </span>

                  <h2>
                    Hello, {displayName}.
                    <br />
                    <span>What are we exploring today?</span>
                  </h2>

                  <p>
                    Think freely, ask questions, create ideas and learn
                    something new with COXEN.
                  </p>

                  <div className="chat-suggestions">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        type="button"
                        className="chat-suggestion-card"
                        key={suggestion.title}
                        onClick={() =>
                          handleSuggestion(suggestion.prompt)
                        }
                      >
                        <div className="suggestion-icon">
                          <Icon
                            name={suggestion.icon}
                            size={19}
                          />
                        </div>

                        <div className="suggestion-copy">
                          <strong>{suggestion.title}</strong>
                          <small>{suggestion.description}</small>
                        </div>

                        <Icon name="arrow-right" size={16} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (

                /* CHAT MESSAGES */

                <div
                  className="chat-messages"
                  ref={messagesContainerRef}
                >
                  {messages.map((message) => (
                    <article
                      key={message.id}
                      className={`chat-message ${
                        message.role === "user"
                          ? "user-message"
                          : "assistant-message"
                      }`}
                    >
                      <div className="message-avatar">
                        {message.role === "user" ? (
                          <Icon name="user" size={18} />
                        ) : (
                          <img
                            src="/logo.png"
                            alt="COXEN"
                            className="message-avatar-logo"
                          />
                        )}
                      </div>

                      <div className="message-content">

                        <div className="message-author">
                          {message.role === "user"
                            ? "You"
                            : "COXEN"}
                        </div>

                        <div className="message-text">
                          {message.content ? (
                            message.content
                          ) : (
                            <span
                              className="typing-indicator"
                              aria-label="COXEN is responding"
                            >
                              <span />
                              <span />
                              <span />
                            </span>
                          )}
                        </div>

                        {message.role === "assistant" &&
                          message.content && (
                            <button
                              type="button"
                              className="message-copy-button"
                              onClick={() =>
                                void copyResponse(message.content)
                              }
                              title="Copy response"
                            >
                              <Icon name="file" size={15} />
                              Copy
                            </button>
                          )}

                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ERROR MESSAGE */}

          {error && (
            <div className="chat-error" role="alert">
              <span>{error}</span>

              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <Icon name="x" size={16} />
              </button>
            </div>
          )}

          {/* MESSAGE COMPOSER */}

          <div className="chat-composer-area">
            <form
              className="chat-composer"
              onSubmit={sendMessage}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  loadingHistory
                    ? "Restoring your conversations..."
                    : "Message COXEN..."
                }
                rows={1}
                disabled={loadingHistory}
                aria-label="Message COXEN"
              />

              <div className="chat-composer-bottom">

                <div className="composer-tools">
                  <button
                    type="button"
                    className={
                      selectedAction === "research" ? "active" : ""
                    }
                    onClick={() => handleAction("research")}
                  >
                    <Icon name="search" size={15} />
                    Research
                  </button>

                  <button
                    type="button"
                    className={
                      selectedAction === "writing" ? "active" : ""
                    }
                    onClick={() => handleAction("writing")}
                  >
                    <Icon name="edit" size={15} />
                    Writing
                  </button>
                </div>

                <button
                  type="submit"
                  className="chat-send-button"
                  disabled={
                    !input.trim() ||
                    sending ||
                    loadingHistory
                  }
                  aria-label="Send message"
                >
                  {sending ? (
                    <span className="send-loading">...</span>
                  ) : (
                    <Icon name="send" size={19} />
                  )}
                </button>

              </div>
            </form>

            <p className="chat-disclaimer">
              COXEN AI can make mistakes. Verify important information.
            </p>
          </div>

        </div>
      </section>
    </>
  );
}