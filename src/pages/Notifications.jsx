
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "../components/Icon";

const FILTERS = ["All", "Unread", "Read"];

const TYPE_DETAILS = {
  achievement: {
    icon: "award",
    color: "#bd8b35",
    background: "#fff6e7",
  },
  message: {
    icon: "chat",
    color: "#7967ed",
    background: "#f0edff",
  },
  community: {
    icon: "user",
    color: "#319879",
    background: "#e9f8f1",
  },
  system: {
    icon: "settings",
    color: "#8a69b5",
    background: "#f3edfb",
  },
  reminder: {
    icon: "clock",
    color: "#319879",
    background: "#e9f8f1",
  },
  general: {
    icon: "bell",
    color: "#7967ed",
    background: "#f0edff",
  },
};

const DEFAULT_TYPE = TYPE_DETAILS.general;

function formatTime(date) {
  if (!date) return "Recently";

  const timestamp = new Date(date).getTime();

  if (Number.isNaN(timestamp)) return "Recently";

  const difference = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(difference / 60000);
  const hours = Math.floor(difference / 3600000);
  const days = Math.floor(difference / 86400000);

  if (minutes < 1) return "Just now";

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  if (days === 1) return "Yesterday";

  if (days < 7) return `${days} days ago`;

  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function readResponse(response) {
  const text = await response.text();

  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        "Something went wrong. Please try again."
    );
  }

  return data;
}

function getNotificationId(notification) {
  return notification?._id || notification?.id || null;
}

function getErrorMessage(error, fallback) {
  return error instanceof Error && error.message
    ? error.message
    : fallback;
}

export default function Notifications({ apiRequest }) {
  const [notifications, setNotifications] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmation, setConfirmation] = useState(null);

  const mountedRef = useRef(false);
  const actionInProgressRef = useRef(false);
  const fetchRequestIdRef = useRef(0);
  const fetchControllerRef = useRef(null);

  // --------------------------------------------------
  // Notification loading
  // --------------------------------------------------

  const fetchNotifications = useCallback(
    async (showLoader = true) => {
      if (!apiRequest) {
        setError(
          "Authentication service is unavailable. Please log in again."
        );
        setLoading(false);
        return;
      }

      fetchControllerRef.current?.abort();

      const controller = new AbortController();
      const requestId = ++fetchRequestIdRef.current;

      fetchControllerRef.current = controller;

      if (showLoader) setLoading(true);

      setError("");
      setSuccess("");

      try {
        const response = await apiRequest("/api/notifications", {
          method: "GET",
          signal: controller.signal,
        });

        const data = await readResponse(response);

        if (
          !mountedRef.current ||
          requestId !== fetchRequestIdRef.current
        ) {
          return;
        }

        setNotifications(
          Array.isArray(data.notifications)
            ? data.notifications
            : []
        );
      } catch (err) {
        if (
          err.name !== "AbortError" &&
          mountedRef.current &&
          requestId === fetchRequestIdRef.current
        ) {
          console.error("Fetch notifications error:", err);

          setError(
            getErrorMessage(
              err,
              "Unable to load notifications."
            )
          );
        }
      } finally {
        if (
          mountedRef.current &&
          requestId === fetchRequestIdRef.current
        ) {
          if (showLoader) setLoading(false);
          fetchControllerRef.current = null;
        }
      }
    },
    [apiRequest]
  );

  useEffect(() => {
    mountedRef.current = true;

    fetchNotifications();

    return () => {
      mountedRef.current = false;
      fetchRequestIdRef.current += 1;
      fetchControllerRef.current?.abort();
    };
  }, [fetchNotifications]);

  // --------------------------------------------------
  // Statistics and filters
  // --------------------------------------------------

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  );

  const readCount = notifications.length - unreadCount;

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "Unread") {
      return notifications.filter((item) => !item.isRead);
    }

    if (activeFilter === "Read") {
      return notifications.filter((item) => item.isRead);
    }

    return notifications;
  }, [notifications, activeFilter]);

  // --------------------------------------------------
  // Shared action handling
  // --------------------------------------------------

  const runAction = async (action, fallbackMessage) => {
    if (actionInProgressRef.current || !apiRequest) return;

    actionInProgressRef.current = true;
    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await action();
    } catch (err) {
      console.error("Notification action error:", err);

      if (mountedRef.current) {
        setError(getErrorMessage(err, fallbackMessage));
      }
    } finally {
      actionInProgressRef.current = false;

      if (mountedRef.current) {
        setActionLoading(false);
      }
    }
  };

  // --------------------------------------------------
  // Mark notifications as read
  // --------------------------------------------------

  const markAsRead = async (id) => {
    if (!id || actionInProgressRef.current) return;

    await runAction(async () => {
      const response = await apiRequest(
        `/api/notifications/${encodeURIComponent(id)}/read`,
        { method: "PATCH" }
      );

      await readResponse(response);

      if (!mountedRef.current) return;

      setNotifications((previous) =>
        previous.map((item) =>
          getNotificationId(item) === id
            ? { ...item, isRead: true }
            : item
        )
      );

      setSuccess("Notification marked as read.");
    }, "Unable to update notification.");
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0 || actionInProgressRef.current) return;

    await runAction(async () => {
      const response = await apiRequest(
        "/api/notifications/read-all",
        { method: "PATCH" }
      );

      await readResponse(response);

      if (!mountedRef.current) return;

      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          isRead: true,
        }))
      );

      setSuccess("All notifications marked as read.");
    }, "Unable to update notifications.");
  };

  // --------------------------------------------------
  // Delete confirmation
  // --------------------------------------------------

  const requestDelete = (notification) => {
    if (actionInProgressRef.current) return;

    setError("");
    setSuccess("");

    setConfirmation({
      type: "single",
      notification,
    });
  };

  const requestClearAll = () => {
    if (
      notifications.length === 0 ||
      actionInProgressRef.current
    ) {
      return;
    }

    setError("");
    setSuccess("");

    setConfirmation({ type: "all" });
  };

  const closeConfirmation = useCallback(() => {
    if (actionInProgressRef.current) return;
    setConfirmation(null);
  }, []);

  // --------------------------------------------------
  // Delete one notification
  // --------------------------------------------------

  const deleteNotification = async (id) => {
    if (!id || actionInProgressRef.current) return;

    await runAction(async () => {
      const response = await apiRequest(
        `/api/notifications/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );

      await readResponse(response);

      if (!mountedRef.current) return;

      setNotifications((previous) =>
        previous.filter(
          (item) => getNotificationId(item) !== id
        )
      );

      setConfirmation(null);
      setSuccess("Notification deleted successfully.");
    }, "Unable to delete notification.");
  };

  // --------------------------------------------------
  // Delete all notifications
  // --------------------------------------------------

  const clearAll = async () => {
    if (
      notifications.length === 0 ||
      actionInProgressRef.current
    ) {
      return;
    }

    await runAction(async () => {
      const response = await apiRequest("/api/notifications", {
        method: "DELETE",
      });

      await readResponse(response);

      if (!mountedRef.current) return;

      setNotifications([]);
      setActiveFilter("All");
      setConfirmation(null);

      setSuccess("All notifications deleted successfully.");
    }, "Unable to clear notifications.");
  };

  const handleConfirmAction = () => {
    if (!confirmation || actionInProgressRef.current) return;

    if (confirmation.type === "single") {
      const id = getNotificationId(confirmation.notification);

      if (!id) {
        setError("This notification does not have a valid ID.");
        setConfirmation(null);
        return;
      }

      deleteNotification(id);
      return;
    }

    if (confirmation.type === "all") {
      clearAll();
    }
  };

  // --------------------------------------------------
  // Keyboard handling
  // --------------------------------------------------

  useEffect(() => {
    if (!confirmation || actionLoading) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeConfirmation();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [confirmation, actionLoading, closeConfirmation]);

  return (
    <section className="notifications-page">
      <style>{`
        .notifications-page {
          width: 100%;
          max-width: 1100px;
          min-height: 100%;
          margin: 0 auto;
          padding: 30px 32px 50px;
          color: var(--text, #39354e);
          font-family: "DM Sans", sans-serif;
        }

        .notifications-page * {
          box-sizing: border-box;
        }

        .notifications-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 28px;
        }

        .notifications-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 8px;
          color: var(--primary, #7967ed);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.8px;
        }

        .notifications-eyebrow::before {
          content: "";
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--primary, #7967ed);
          box-shadow: 0 0 10px var(--primary, #7967ed);
        }

        .notifications-heading h1 {
          margin: 0 0 8px;
          color: var(--text, #302b48);
          font-family: "Space Grotesk", sans-serif;
          font-size: 29px;
          font-weight: 750;
          letter-spacing: -0.8px;
        }

        .notifications-heading p {
          margin: 0;
          color: var(--text-secondary, #9692a8);
          font-size: 12px;
          line-height: 1.7;
        }

        .notifications-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        .notification-action {
          min-height: 39px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 14px;
          border: 1px solid var(--border, #eae8f3);
          border-radius: 10px;
          background: var(--surface, #fff);
          color: var(--text-secondary, #68637c);
          font-family: inherit;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .notification-action:hover:not(:disabled) {
          border-color: var(--primary-light, #c9c0ff);
          background: var(--primary-soft, #f8f6ff);
          color: var(--primary, #7967ed);
        }

        .notification-action.danger {
          color: #d45c76;
        }

        .notification-action.danger:hover:not(:disabled) {
          border-color: #f1d5dc;
          background: #fff5f7;
          color: #c94b67;
        }

        .notification-action:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .notification-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 27px;
        }

        .notification-stat {
          position: relative;
          overflow: hidden;
          padding: 19px 20px;
          border: 1px solid var(--border, #eae8f3);
          border-radius: 15px;
          background: var(--surface, #fff);
          box-shadow: 0 5px 18px rgba(43, 36, 91, 0.035);
        }

        .notification-stat::after {
          position: absolute;
          content: "";
          width: 65px;
          height: 65px;
          right: -23px;
          bottom: -30px;
          border-radius: 50%;
          background: var(--primary-soft, #f0edff);
          opacity: 0.7;
          pointer-events: none;
        }

        .notification-stat span {
          display: block;
          margin-bottom: 9px;
          color: var(--text-secondary, #9692a8);
          font-size: 10px;
          font-weight: 600;
        }

        .notification-stat strong {
          color: var(--text, #39354e);
          font-family: "Space Grotesk", sans-serif;
          font-size: 25px;
          font-weight: 750;
        }

        .notification-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }

        .notification-tab {
          padding: 9px 16px;
          border: 1px solid var(--border, #eae8f3);
          border-radius: 9px;
          background: var(--surface, #fff);
          color: var(--text-secondary, #9692a8);
          font-family: inherit;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .notification-tab:hover {
          border-color: var(--primary-light, #c9c0ff);
          color: var(--primary, #7967ed);
        }

        .notification-tab.active {
          border-color: var(--primary, #7967ed);
          background: linear-gradient(135deg, #8977f6, #705ce9);
          color: #fff;
          box-shadow: 0 4px 12px rgba(111, 91, 239, 0.17);
        }

        .notification-list {
          overflow: hidden;
          border: 1px solid var(--border, #eae8f3);
          border-radius: 16px;
          background: var(--surface, #fff);
          box-shadow: 0 5px 18px rgba(43, 36, 91, 0.03);
        }

        .notification-item {
          min-width: 0;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 19px;
          border-bottom: 1px solid var(--border, #f0eef5);
          transition: background 0.2s;
        }

        .notification-item:last-child {
          border-bottom: none;
        }

        .notification-item:hover {
          background: var(--surface-soft, #fcfbff);
        }

        .notification-item.unread {
          background: var(--primary-soft, #faf9ff);
        }

        .notification-item.unread:hover {
          background: var(--surface-soft, #f6f3ff);
        }

        .notification-icon {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border: 1px solid transparent;
          border-radius: 13px;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-content h3 {
          margin: 1px 0 7px;
          color: var(--text, #39354e);
          font-size: 12px;
          font-weight: 750;
          overflow-wrap: anywhere;
        }

        .notification-content p {
          margin: 0 0 10px;
          color: var(--text-secondary, #9692a8);
          font-size: 11px;
          line-height: 1.7;
          overflow-wrap: anywhere;
        }

        .notification-time {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--muted, #aaa6b7);
          font-size: 9px;
        }

        .notification-dot {
          width: 7px;
          height: 7px;
          margin-top: 7px;
          flex-shrink: 0;
          border-radius: 50%;
          background: var(--primary, #7967ed);
          box-shadow: 0 0 0 3px var(--primary-soft, #eeeaff);
        }

        .notification-item-actions {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .notification-icon-btn {
          width: 33px;
          height: 33px;
          display: grid;
          place-items: center;
          border: 1px solid transparent;
          border-radius: 9px;
          background: transparent;
          color: var(--muted, #9692a8);
          cursor: pointer;
          transition: 0.2s;
        }

        .notification-icon-btn:hover:not(:disabled) {
          border-color: var(--border, #e9e4ff);
          background: var(--primary-soft, #f3f0ff);
          color: var(--primary, #7967ed);
        }

        .notification-icon-btn.delete:hover:not(:disabled) {
          border-color: #f4dce2;
          background: #fff3f5;
          color: #d45c76;
        }

        .notification-icon-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .notification-empty {
          min-height: 270px;
          padding: 45px 15px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--muted, #aaa6b7);
          text-align: center;
        }

        .notification-empty-icon {
          width: 65px;
          height: 65px;
          display: grid;
          place-items: center;
          border: 1px solid var(--border, #eae8f3);
          border-radius: 20px;
          background: var(--primary-soft, #f3f0ff);
          color: var(--primary, #7967ed);
        }

        .notification-empty h3 {
          margin: 15px 0 7px;
          color: var(--text, #39354e);
          font-family: "Space Grotesk", sans-serif;
          font-size: 15px;
        }

        .notification-empty p {
          margin: 0;
          color: var(--text-secondary, #9692a8);
          font-size: 11px;
        }

        .notifications-note {
          margin-top: 17px;
          color: var(--muted, #aaa6b7);
          font-size: 10px;
          line-height: 1.6;
        }

        .notification-status {
          padding: 12px 15px;
          margin-bottom: 15px;
          border-radius: 10px;
          font-size: 11px;
          line-height: 1.5;
        }

        .notification-status.error {
          border: 1px solid #f1d5dc;
          background: #fff5f7;
          color: #c94b67;
        }

        .notification-status.success {
          border: 1px solid #d9eee3;
          background: #f1faf5;
          color: #319879;
        }

        .notification-retry {
          margin-top: 11px;
          padding: 9px 13px;
          border: 1px solid var(--border, #eae8f3);
          border-radius: 8px;
          background: var(--surface, #fff);
          color: var(--primary, #7967ed);
          font-family: inherit;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .notification-retry:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .notification-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1200;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow-y: auto;
          background: rgba(35, 30, 58, 0.5);
          backdrop-filter: blur(5px);
          animation: notificationFadeIn 0.2s ease;
        }

        .notification-modal {
          width: 100%;
          max-width: 410px;
          padding: 26px;
          border: 1px solid var(--border, #eeeaf7);
          border-radius: 19px;
          background: var(--surface, #fff);
          color: var(--text, #39354e);
          text-align: center;
          box-shadow: 0 20px 60px rgba(31, 25, 66, 0.2);
          animation: notificationSlideIn 0.25s ease;
        }

        .notification-modal-icon {
          width: 55px;
          height: 55px;
          margin: 0 auto 16px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: rgba(216, 91, 117, 0.11);
          color: #d85b75;
        }

        .notification-modal h3 {
          margin: 0 0 9px;
          color: var(--text, #39354e);
          font-family: "Space Grotesk", sans-serif;
          font-size: 19px;
        }

        .notification-modal p {
          margin: 0;
          color: var(--text-secondary, #9692a8);
          font-size: 11px;
          line-height: 1.7;
        }

        .notification-modal-actions {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 25px;
        }

        .notification-modal-actions button {
          min-height: 40px;
          padding: 0 17px;
          border-radius: 9px;
          font-family: inherit;
          font-size: 10px;
          font-weight: 750;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .notification-cancel {
          border: 1px solid var(--border, #eae8f3);
          background: var(--surface, #fff);
          color: var(--text-secondary, #77718e);
        }

        .notification-cancel:hover:not(:disabled) {
          background: var(--surface-soft, #f8f7fc);
        }

        .notification-confirm-delete {
          border: 1px solid #d85b75;
          background: #d85b75;
          color: #fff;
        }

        .notification-confirm-delete:hover:not(:disabled) {
          border-color: #bf405d;
          background: #bf405d;
        }

        .notification-modal-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        :root[data-theme="dark"] .notification-stat,
        :root[data-theme="dark"] .notification-list {
          box-shadow: none;
        }

        :root[data-theme="dark"] .notification-item.unread {
          background: var(--primary-soft, #29243d);
        }

        :root[data-theme="dark"] .notification-status.error {
          border-color: #59303c;
          background: #30202c;
          color: #f0a1b1;
        }

        :root[data-theme="dark"] .notification-status.success {
          border-color: #285344;
          background: #1e332c;
          color: #8ed7b6;
        }

        :root[data-theme="dark"] .notification-modal-overlay {
          background: rgba(0, 0, 0, 0.68);
        }

        :root[data-theme="dark"] .notification-modal {
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
        }

        @keyframes notificationFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes notificationSlideIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 800px) {
          .notifications-page {
            padding: 23px 20px 40px;
          }

          .notifications-heading {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 600px) {
          .notifications-page {
            padding: 20px 14px 35px;
          }

          .notifications-heading h1 {
            font-size: 25px;
          }

          .notifications-actions {
            width: 100%;
          }

          .notifications-actions button {
            flex: 1;
          }

          .notification-stats {
            gap: 8px;
          }

          .notification-stat {
            padding: 13px 11px;
          }

          .notification-stat span {
            font-size: 9px;
          }

          .notification-stat strong {
            font-size: 20px;
          }

          .notification-item {
            padding: 14px 12px;
            gap: 9px;
          }

          .notification-icon {
            width: 36px;
            height: 36px;
            border-radius: 11px;
          }

          .notification-item-actions {
            flex-direction: column;
            gap: 2px;
          }

          .notification-icon-btn {
            width: 29px;
            height: 29px;
          }

          .notification-content h3 {
            font-size: 11px;
          }

          .notification-content p {
            font-size: 10px;
          }

          .notification-modal {
            padding: 21px;
            border-radius: 16px;
          }

          .notification-modal-actions {
            flex-direction: column-reverse;
          }

          .notification-modal-actions button {
            width: 100%;
          }
        }

        @media (max-width: 360px) {
          .notification-stats {
            grid-template-columns: 1fr;
          }

          .notification-item {
            gap: 7px;
            padding: 11px 9px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .notification-action,
          .notification-tab,
          .notification-item,
          .notification-icon-btn,
          .notification-modal,
          .notification-modal-overlay {
            transition: none;
            animation: none;
          }
        }
      `}</style>

      {/* Header */}
      <div className="notifications-heading">
        <div>
          <span className="notifications-eyebrow">YOUR ACTIVITY</span>
          <h1>Notifications</h1>
          <p>
            Stay updated with what's happening in your workspace.
          </p>
        </div>

        <div className="notifications-actions">
          <button
            type="button"
            className="notification-action"
            onClick={markAllAsRead}
            disabled={unreadCount === 0 || actionLoading}
          >
            <Icon name="check" size={15} />
            Mark all read
          </button>

          <button
            type="button"
            className="notification-action danger"
            onClick={requestClearAll}
            disabled={notifications.length === 0 || actionLoading}
          >
            <Icon name="trash" size={15} />
            Clear all
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="notification-status error" role="alert">
          {error}

          <button
            type="button"
            className="notification-retry"
            onClick={() => fetchNotifications()}
            disabled={loading || actionLoading}
          >
            Try again
          </button>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="notification-status success" role="status">
          {success}
        </div>
      )}

      {/* Statistics */}
      <div className="notification-stats">
        <div className="notification-stat">
          <span>Total notifications</span>
          <strong>{notifications.length}</strong>
        </div>

        <div className="notification-stat">
          <span>Unread</span>
          <strong>{unreadCount}</strong>
        </div>

        <div className="notification-stat">
          <span>Read</span>
          <strong>{readCount}</strong>
        </div>
      </div>

      {/* Filters */}
      <div className="notification-tabs">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`notification-tab ${
              activeFilter === filter ? "active" : ""
            }`}
            onClick={() => setActiveFilter(filter)}
            aria-pressed={activeFilter === filter}
          >
            {filter}
            {filter === "Unread" && unreadCount > 0
              ? ` (${unreadCount})`
              : ""}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="notification-list">
        {loading ? (
          <div className="notification-empty">
            <div className="notification-empty-icon">
              <Icon name="bell" size={28} />
            </div>

            <h3>Loading notifications...</h3>
            <p>Please wait while we retrieve your activity.</p>
          </div>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => {
            const details =
              TYPE_DETAILS[notification.type] || DEFAULT_TYPE;

            const id = getNotificationId(notification);

            return (
              <article
                key={id || `${notification.title}-${notification.createdAt}`}
                className={`notification-item ${
                  !notification.isRead ? "unread" : ""
                }`}
              >
                <div
                  className="notification-icon"
                  style={{
                    color: details.color,
                    background: details.background,
                  }}
                >
                  <Icon name={details.icon} size={19} />
                </div>

                <div className="notification-content">
                  <h3>{notification.title || "Notification"}</h3>

                  <p>{notification.message || ""}</p>

                  <span className="notification-time">
                    <Icon name="clock" size={12} />
                    {formatTime(notification.createdAt)}
                  </span>
                </div>

                {!notification.isRead && (
                  <span
                    className="notification-dot"
                    title="Unread"
                    aria-label="Unread notification"
                  />
                )}

                <div className="notification-item-actions">
                  {!notification.isRead && (
                    <button
                      type="button"
                      className="notification-icon-btn"
                      title="Mark as read"
                      aria-label="Mark as read"
                      disabled={actionLoading || !id}
                      onClick={() => markAsRead(id)}
                    >
                      <Icon name="check" size={16} />
                    </button>
                  )}

                  <button
                    type="button"
                    className="notification-icon-btn delete"
                    title="Delete notification"
                    aria-label="Delete notification"
                    disabled={actionLoading || !id}
                    onClick={() => requestDelete(notification)}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="notification-empty">
            <div className="notification-empty-icon">
              <Icon name="bell" size={28} />
            </div>

            <h3>No notifications here</h3>

            <p>
              {activeFilter === "Unread"
                ? "You're all caught up!"
                : activeFilter === "Read"
                  ? "You don't have any read notifications."
                  : "Your notifications will appear here."}
            </p>
          </div>
        )}
      </div>

      <p className="notifications-note">
        Your notifications are securely stored in your COXEN account.
      </p>

      {/* Delete confirmation modal */}
      {confirmation && (
        <div
          className="notification-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !actionLoading
            ) {
              closeConfirmation();
            }
          }}
        >
          <div
            className="notification-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="notification-confirm-title"
            aria-describedby="notification-confirm-description"
          >
            <div className="notification-modal-icon">
              <Icon name="trash" size={25} />
            </div>

            <h3 id="notification-confirm-title">
              {confirmation.type === "all"
                ? "Clear all notifications?"
                : "Delete notification?"}
            </h3>

            <p id="notification-confirm-description">
              {confirmation.type === "all"
                ? "All your notifications will be permanently deleted. This action cannot be undone."
                : "This notification will be permanently deleted from your account. This action cannot be undone."}
            </p>

            <div className="notification-modal-actions">
              <button
                type="button"
                className="notification-cancel"
                onClick={closeConfirmation}
                disabled={actionLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="notification-confirm-delete"
                onClick={handleConfirmAction}
                disabled={actionLoading}
              >
                {actionLoading
                  ? "Processing..."
                  : confirmation.type === "all"
                    ? "Delete All"
                    : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
