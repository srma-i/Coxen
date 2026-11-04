
import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "./Icon";

const navigationGroups = [
  {
    title: "WORKSPACE",
    items: [
      { id: "chat", label: "AI Chat", icon: "messageSquare" },
    ],
  },
  {
    title: "PERSONAL",
    items: [
      { id: "settings", label: "Settings", icon: "settings" },
    ],
  },
];

function getConversationId(conversation) {
  return (
    conversation?.conversationId ||
    conversation?._id ||
    conversation?.id ||
    null
  );
}

function getConversationTitle(conversation) {
  const title = [
    conversation?.title,
    conversation?.lastMessage,
    conversation?.preview,
  ].find((value) => typeof value === "string" && value.trim());

  if (title) return title.trim().slice(0, 45);

  if (Array.isArray(conversation?.messages)) {
    const firstUserMessage = conversation.messages.find(
      (message) => message?.role === "user"
    );

    const messageText =
      firstUserMessage?.text || firstUserMessage?.content;

    if (typeof messageText === "string" && messageText.trim()) {
      return messageText.trim().slice(0, 45);
    }
  }

  return "New conversation";
}

function getConversationDate(conversation) {
  const date = new Date(
    conversation?.updatedAt || conversation?.createdAt || 0
  ).getTime();

  return Number.isFinite(date) ? date : 0;
}

function getProfileImage(user) {
  return (
    user?.picture ||
    user?.avatar ||
    user?.profilePicture ||
    user?.photoURL ||
    user?.image ||
    user?.pictureUrl ||
    ""
  );
}

export default function Sidebar({
  activeView,
  setActiveView,
  sidebarOpen,
  setSidebarOpen,
  user,
  logout,
  conversations = [],
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
}) {
  const [conversationToDelete, setConversationToDelete] =
    useState(null);

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [avatarFailed, setAvatarFailed] = useState(false);

  const profileImage = getProfileImage(user);

  useEffect(() => {
    setAvatarFailed(false);
  }, [profileImage]);

  const validConversations = useMemo(() => {
    return [...conversations]
      .filter((conversation) => getConversationId(conversation))
      .sort(
        (a, b) =>
          getConversationDate(b) - getConversationDate(a)
      );
  }, [conversations]);

  const selectedTitle = conversationToDelete
    ? getConversationTitle(conversationToDelete)
    : "";

  const handleNavigation = useCallback(
    (view) => {
      setActiveView?.(view);
      setSidebarOpen?.(false);
    },
    [setActiveView, setSidebarOpen]
  );

  const handleNewChat = useCallback(
    (event) => {
      event.preventDefault();

      if (typeof onNewChat === "function") {
        onNewChat();
      } else {
        setActiveView?.("chat");
      }

      setSidebarOpen?.(false);
    },
    [onNewChat, setActiveView, setSidebarOpen]
  );

  const handleConversationClick = useCallback(
    (conversationId) => {
      if (!conversationId) return;

      if (typeof onSelectConversation === "function") {
        onSelectConversation(String(conversationId));
      } else {
        setActiveView?.("chat");
      }

      setSidebarOpen?.(false);
    },
    [onSelectConversation, setActiveView, setSidebarOpen]
  );

  const handleDeleteClick = (event, conversation) => {
    event.preventDefault();
    event.stopPropagation();

    if (deleting) return;

    setDeleteError("");
    setConversationToDelete(conversation);
  };

  const handleCancelDelete = useCallback(() => {
    if (deleting) return;

    setConversationToDelete(null);
    setDeleteError("");
  }, [deleting]);

  useEffect(() => {
    if (!conversationToDelete) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !deleting) {
        setConversationToDelete(null);
        setDeleteError("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [conversationToDelete, deleting]);

  const handleConfirmDelete = async () => {
    if (!conversationToDelete || deleting) return;

    const conversationId = getConversationId(
      conversationToDelete
    );

    if (!conversationId) {
      setDeleteError("Invalid conversation ID.");
      return;
    }

    if (typeof onDeleteConversation !== "function") {
      setDeleteError("Delete functionality is unavailable.");
      return;
    }

    setDeleting(true);
    setDeleteError("");

    try {
      await onDeleteConversation(String(conversationId));

      setConversationToDelete(null);
      setDeleteError("");
    } catch (error) {
      console.error("Unable to delete conversation:", error);

      setDeleteError(
        error?.message || "Unable to delete this conversation."
      );
    } finally {
      setDeleting(false);
    }
  };

  const userInitial = (
    user?.name ||
    user?.email ||
    "U"
  )
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <>
      <style>{`
        .nv-sidebar {
          width: 270px;
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          overflow: hidden;
          background: var(--surface, #ffffff);
          border-right: 1px solid var(--border, #e8e8e8);
          color: var(--text, #202124);
          transition: transform 0.25s ease;
          z-index: 100;
        }

        .nv-sidebar-header {
          padding: 22px 18px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .nv-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .nv-brand-logo {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
          border-radius: 11px;
          background: linear-gradient(135deg, #171923 0%, #292D3A 100%);
          color: #ffffff;
          font-size: 18px;
          font-weight: 800;
        }

        .nv-brand-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .nv-brand-name {
          color: var(--text, #202124);
          font-family: "Space Grotesk", sans-serif;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.7px;
        }

        .nv-brand-subtitle {
          margin-top: 2px;
          color: var(--muted, #888888);
          font-size: 10px;
          letter-spacing: 1.2px;
        }

        .nv-sidebar-close {
          display: none;
          padding: 7px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: var(--text-secondary, #777777);
          cursor: pointer;
        }

        .nv-new-chat {
          width: calc(100% - 30px);
          min-height: 44px;
          margin: 5px 15px 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          flex-shrink: 0;
          border: 1px solid var(--border, #e5e5e5);
          border-radius: 11px;
          background: var(--surface, #ffffff);
          color: var(--text, #202124);
          font-size: 13px;
          font-weight: 650;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .nv-new-chat:hover {
          transform: translateY(-1px);
          border-color: var(--primary);
          background: var(--primary-soft, #f5f3ff);
          color: var(--primary);
        }

        .nv-new-chat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          line-height: 1;
        }

        .nv-sidebar-content {
          flex: 1 1 auto;
          min-height: 0;
          overflow-x: hidden;
          overflow-y: auto;
          padding: 0 12px 16px;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: var(--border-strong) transparent;
          -webkit-overflow-scrolling: touch;
        }

        .nv-sidebar-content::-webkit-scrollbar {
          width: 5px;
        }

        .nv-sidebar-content::-webkit-scrollbar-thumb {
          border-radius: 10px;
          background: var(--border-strong);
        }

        .nv-nav-group {
          margin-bottom: 23px;
        }

        .nv-section-title,
        .nv-recent-title {
          color: var(--muted);
          font-size: 10px;
          font-weight: 750;
          letter-spacing: 1.3px;
        }

        .nv-section-title {
          margin-bottom: 9px;
          padding: 0 10px;
        }

        .nv-nav-item {
          width: 100%;
          min-height: 40px;
          margin-bottom: 3px;
          padding: 0 11px;
          display: flex;
          align-items: center;
          gap: 11px;
          border: none;
          border-radius: 9px;
          background: transparent;
          color: var(--text-secondary);
          text-align: left;
          font-size: 13px;
          font-weight: 550;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .nv-nav-item:hover {
          background: var(--primary-soft);
          color: var(--primary);
        }

        .nv-nav-item.active {
          background: var(--primary-light);
          color: var(--primary);
          font-weight: 700;
        }

        .nv-nav-icon {
          width: 19px;
          height: 19px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .nv-recent-header {
          margin-bottom: 9px;
          padding: 0 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .nv-recent-count {
          padding: 3px 7px;
          border-radius: 20px;
          background: var(--surface-soft);
          color: var(--text-secondary);
          font-size: 10px;
        }

        .nv-conversation-list {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .nv-conversation-item {
          width: 100%;
          min-width: 0;
          min-height: 38px;
          padding: 0 7px 0 10px;
          display: flex;
          align-items: center;
          gap: 5px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: var(--text-secondary);
          transition: background 0.18s ease;
        }

        .nv-conversation-item:hover {
          background: var(--surface-soft);
        }

        .nv-conversation-item.active {
          background: var(--primary-light);
          color: var(--primary);
        }

        .nv-conversation-main {
          flex: 1;
          min-width: 0;
          padding: 0;
          display: flex;
          align-items: center;
          gap: 9px;
          overflow: hidden;
          border: none;
          background: transparent;
          color: inherit;
          text-align: left;
          cursor: pointer;
        }

        .nv-conversation-icon {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          opacity: 0.75;
        }

        .nv-conversation-name {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 12px;
          font-weight: 500;
        }

        .nv-delete-conversation {
          width: 30px;
          height: 30px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
          border-radius: 8px;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          opacity: 0;
          transition: all 0.18s ease;
        }

        .nv-conversation-item:hover .nv-delete-conversation,
        .nv-delete-conversation:focus-visible {
          opacity: 1;
        }

        .nv-delete-conversation:hover {
          border-color: rgba(220, 50, 50, 0.15);
          background: rgba(220, 50, 50, 0.1);
          color: #dc4545;
        }

        .nv-delete-conversation:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .nv-empty-conversations {
          padding: 12px 10px;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.5;
        }

        .nv-delete-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(15, 18, 30, 0.48);
          backdrop-filter: blur(5px);
          animation: nv-fade-in 0.18s ease;
        }

        .nv-delete-dialog {
          width: 100%;
          max-width: 390px;
          padding: 25px;
          border: 1px solid var(--border);
          border-radius: 19px;
          background: var(--surface);
          color: var(--text);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.2);
          animation: nv-dialog-in 0.2s ease;
        }

        .nv-delete-dialog-icon {
          width: 48px;
          height: 48px;
          margin-bottom: 17px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: rgba(220, 65, 75, 0.1);
          color: #dc4545;
        }

        .nv-delete-dialog h3 {
          margin: 0 0 9px;
          color: var(--text);
          font-size: 18px;
          font-weight: 750;
          letter-spacing: -0.4px;
        }

        .nv-delete-dialog-description {
          margin: 0;
          color: var(--text-secondary);
          font-size: 12px;
          line-height: 1.7;
        }

        .nv-delete-conversation-preview {
          margin-top: 16px;
          padding: 11px 12px;
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 9px;
          background: var(--surface-soft);
          color: var(--text);
          font-size: 12px;
          font-weight: 650;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .nv-delete-warning {
          margin: 12px 0 0;
          color: var(--text-secondary);
          font-size: 10px;
          line-height: 1.6;
        }

        .nv-delete-error {
          margin-top: 13px;
          color: #dc4545;
          font-size: 11px;
          line-height: 1.5;
        }

        .nv-delete-dialog-actions {
          margin-top: 23px;
          display: flex;
          justify-content: flex-end;
          gap: 9px;
        }

        .nv-dialog-button {
          min-width: 94px;
          min-height: 39px;
          padding: 0 15px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 1px solid var(--border);
          border-radius: 9px;
          background: var(--surface);
          color: var(--text);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .nv-dialog-button:hover:not(:disabled) {
          background: var(--surface-soft);
        }

        .nv-dialog-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .nv-dialog-button.danger {
          border-color: #dc4545;
          background: #dc4545;
          color: #ffffff;
        }

        .nv-dialog-button.danger:hover:not(:disabled) {
          border-color: #c73535;
          background: #c73535;
        }

        @keyframes nv-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes nv-dialog-in {
          from {
            opacity: 0;
            transform: translateY(9px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .nv-sidebar-footer {
          padding: 13px 12px;
          flex-shrink: 0;
          border-top: 1px solid var(--border);
        }

        .nv-user-profile {
          min-width: 0;
          padding: 7px;
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 10px;
        }

        .nv-user-avatar {
          width: 35px;
          height: 35px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: #ffffff;
          font-size: 13px;
          font-weight: 750;
          text-transform: uppercase;
        }

        .nv-user-avatar img {
          width: 100%;
          height: 100%;
          display: block;
          border-radius: 50%;
          object-fit: cover;
        }

        .nv-user-details {
          flex: 1;
          min-width: 0;
        }

        .nv-user-name,
        .nv-user-email {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .nv-user-name {
          color: var(--text);
          font-size: 12px;
          font-weight: 700;
        }

        .nv-user-email {
          margin-top: 3px;
          color: var(--text-secondary);
          font-size: 10px;
        }

        .nv-logout-button {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .nv-logout-button:hover {
          background: rgba(220, 50, 50, 0.1);
          color: #dc4545;
        }

        @media (max-width: 800px) {
          .nv-sidebar {
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            height: 100dvh;
            transform: translateX(-105%);
            box-shadow: none;
          }

          .nv-sidebar.open {
            transform: translateX(0);
            box-shadow: 10px 0 35px rgba(0, 0, 0, 0.12);
          }

          .nv-sidebar-close {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .nv-delete-conversation {
            opacity: 1;
          }
        }

        @media (max-width: 420px) {
          .nv-delete-dialog {
            padding: 21px;
          }

          .nv-delete-dialog-actions {
            flex-direction: column-reverse;
          }

          .nv-dialog-button {
            width: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .nv-delete-overlay,
          .nv-delete-dialog {
            animation: none;
          }

          .nv-sidebar,
          .nv-new-chat,
          .nv-nav-item,
          .nv-dialog-button {
            transition: none;
          }
        }
      `}</style>

      <aside
        className={`nv-sidebar ${sidebarOpen ? "open" : ""}`}
        aria-label="Main navigation"
      >
        <div className="nv-sidebar-header">
          <div className="nv-brand">
            <div className="nv-brand-logo">
              <img src="/logo.png" alt="COXEN logo" />
            </div>

            <div>
              <div className="nv-brand-name">COXEN</div>
              <div className="nv-brand-subtitle">
                YOUR INTELLIGENT SPACE
              </div>
            </div>
          </div>

          <button
            type="button"
            className="nv-sidebar-close"
            onClick={() => setSidebarOpen?.(false)}
            aria-label="Close sidebar"
          >
            <Icon name="close" />
          </button>
        </div>

        <button
          type="button"
          className="nv-new-chat"
          onClick={handleNewChat}
          aria-label="Start a new conversation"
        >
          <span className="nv-new-chat-icon">
            <Icon name="plus" size={19} />
          </span>
          <span>New Conversation</span>
        </button>

        <div className="nv-sidebar-content">
          {navigationGroups.map((group) => (
            <div className="nv-nav-group" key={group.title}>
              <div className="nv-section-title">{group.title}</div>

              {group.items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`nv-nav-item ${
                    activeView === item.id ? "active" : ""
                  }`}
                  onClick={() => handleNavigation(item.id)}
                >
                  <span className="nv-nav-icon">
                    <Icon name={item.icon} />
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}

          <section className="nv-recent-section">
            <div className="nv-recent-header">
              <span className="nv-recent-title">RECENT CHATS</span>
              <span className="nv-recent-count">
                {validConversations.length}
              </span>
            </div>

            <div className="nv-conversation-list">
              {validConversations.length === 0 ? (
                <div className="nv-empty-conversations">
                  Your conversations will appear here.
                </div>
              ) : (
                validConversations.map((conversation) => {
                  const id = getConversationId(conversation);
                  const title = getConversationTitle(conversation);

                  const isActive =
                    String(id) === String(activeConversationId);

                  return (
                    <div
                      className={`nv-conversation-item ${
                        isActive ? "active" : ""
                      }`}
                      key={String(id)}
                    >
                      <button
                        type="button"
                        className="nv-conversation-main"
                        onClick={() => handleConversationClick(id)}
                        title={title}
                      >
                        <span className="nv-conversation-icon">
                          <Icon name="messageSquare" />
                        </span>

                        <span className="nv-conversation-name">
                          {title}
                        </span>
                      </button>

                      <button
                        type="button"
                        className="nv-delete-conversation"
                        onClick={(event) =>
                          handleDeleteClick(event, conversation)
                        }
                        title="Delete conversation"
                        aria-label={`Delete ${title}`}
                        disabled={deleting}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <div className="nv-sidebar-footer">
          <div className="nv-user-profile">
            <div className="nv-user-avatar">
              {profileImage && !avatarFailed ? (
                <img
                  src={profileImage}
                  alt={`${user?.name || "User"} profile`}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                userInitial
              )}
            </div>

            <div className="nv-user-details">
              <div className="nv-user-name">
                {user?.name || "User"}
              </div>

              <div className="nv-user-email">
                {user?.email || ""}
              </div>
            </div>

            <button
              type="button"
              className="nv-logout-button"
              onClick={() => logout?.()}
              title="Logout"
              aria-label="Logout"
            >
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </aside>

      {conversationToDelete && (
        <div
          className="nv-delete-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !deleting
            ) {
              handleCancelDelete();
            }
          }}
        >
          <div
            className="nv-delete-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="nv-delete-title"
            aria-describedby="nv-delete-description"
          >
            <div className="nv-delete-dialog-icon">
              <Icon name="trash" size={23} />
            </div>

            <h3 id="nv-delete-title">Delete conversation?</h3>

            <p
              className="nv-delete-dialog-description"
              id="nv-delete-description"
            >
              Are you sure you want to delete this conversation?
              This action cannot be undone.
            </p>

            <div className="nv-delete-conversation-preview">
              {selectedTitle}
            </div>

            <p className="nv-delete-warning">
              All messages in this conversation will be permanently
              removed from your chat history.
            </p>

            {deleteError && (
              <div className="nv-delete-error" role="alert">
                {deleteError}
              </div>
            )}

            <div className="nv-delete-dialog-actions">
              <button
                type="button"
                className="nv-dialog-button"
                onClick={handleCancelDelete}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="nv-dialog-button danger"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Icon name="loader" size={15} />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Icon name="trash" size={15} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
