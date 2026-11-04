
import { useCallback, useMemo, useState } from "react";
import Icon from "./Icon";

const PAGE_TITLES = {
  chat: {
    title: "AI Workspace",
    subtitle: "Your intelligent space to think, create and explore.",
  },
  memories: {
    title: "My Memories",
    subtitle: "Manage what COXEN remembers about you.",
  },
  profile: {
    title: "My Profile",
    subtitle: "Manage your personal information.",
  },
  settings: {
    title: "Settings",
    subtitle: "Customize your COXEN experience.",
  },
  notifications: {
    title: "Notifications",
    subtitle: "Stay updated with your activity.",
  },
};

export default function Topbar({
  user,
  setSidebarOpen,
  setActiveView,
  activeView,
}) {
  const currentPage = PAGE_TITLES[activeView] || PAGE_TITLES.chat;

  const [avatarError, setAvatarError] = useState(false);

  const displayName = useMemo(() => {
    return (
      user?.name?.trim() ||
      user?.username?.trim() ||
      user?.email?.split("@")[0] ||
      "User"
    );
  }, [user]);

  const avatar = useMemo(() => {
    return (
      user?.picture ||
      user?.avatar ||
      user?.profilePicture ||
      ""
    );
  }, [user]);

  const initial = displayName.charAt(0).toUpperCase() || "U";

  const navigateTo = useCallback(
    (view) => {
      setActiveView?.(view);
    },
    [setActiveView]
  );

  const openSidebar = useCallback(() => {
    setSidebarOpen?.(true);
  }, [setSidebarOpen]);

  const handleAvatarError = () => {
    setAvatarError(true);
  };

  return (
    <>
      <style>{`
        .topbar {
          position: relative;
          z-index: 40;
          width: 100%;
          min-width: 0;
          height: var(--topbar-height, 68px);
          min-height: var(--topbar-height, 68px);
          padding: 0 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
          gap: 16px;
          background: var(--surface, #ffffff);
          border-bottom: 1px solid var(--border, #e8e8e8);
          transition: background 0.25s ease, border-color 0.25s ease;
        }

        .topbar-left {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .topbar-menu-button {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          display: none;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border, #e8e8e8);
          border-radius: 11px;
          background: var(--surface, #ffffff);
          color: var(--text-secondary, #666666);
          cursor: pointer;
          margin-left: 4px;
          transition: all 0.2s ease;
        }

        .topbar-menu-button:hover {
          border-color: var(--primary-light, #e5e0ff);
          background: var(--primary-soft, #f5f3ff);
          color: var(--primary, #7564e8);
        }

        .topbar-menu-button:focus-visible,
        .topbar-icon-button:focus-visible,
        .topbar-profile-button:focus-visible {
          outline: 3px solid var(--primary-light, #c9c0ff);
          outline-offset: 2px;
        }

        .topbar-heading {
          min-width: 0;
          overflow: hidden;
        }

        .topbar-heading h1 {
          margin: 0;
          overflow: hidden;
          color: var(--text, #202124);
          font-family: "Space Grotesk", sans-serif;
          font-size: 19px;
          font-weight: 700;
          letter-spacing: -0.5px;
          line-height: 1.3;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .topbar-heading p {
          margin: 4px 0 0;
          overflow: hidden;
          color: var(--muted, #888888);
          font-size: 11px;
          font-weight: 400;
          line-height: 1.4;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .topbar-actions {
          margin-left: auto;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-shrink: 0;
          gap: 10px;
        }

        .topbar-icon-button {
          position: relative;
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border, #e8e8e8);
          border-radius: 12px;
          background: var(--surface, #ffffff);
          color: var(--text-secondary, #666666);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .topbar-icon-button:hover,
        .topbar-icon-button.active {
          border-color: var(--primary-light, #e5e0ff);
          background: var(--primary-soft, #f5f3ff);
          color: var(--primary, #7564e8);
        }

        .topbar-icon-button.active::after {
          content: "";
          position: absolute;
          top: 8px;
          right: 8px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--primary, #7564e8);
        }

        .topbar-profile-button {
          width: 42px;
          height: 42px;
          padding: 2px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 1px solid var(--border, #e8e8e8);
          border-radius: 50%;
          background: var(--surface, #ffffff);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .topbar-profile-button:hover {
          transform: scale(1.05);
          border-color: var(--primary, #7564e8);
        }

        .topbar-profile-button.active {
          border-color: var(--primary, #7564e8);
        }

        .topbar-avatar {
          width: 100%;
          height: 100%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #e9e9ee;
          color: #555568;
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .topbar-avatar img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          border-radius: 50%;
        }

        .topbar-avatar.has-image {
          background: transparent;
        }

        :root[data-theme="dark"] .topbar {
          background: var(--surface, #191927);
          border-bottom-color: var(--border, #343449);
        }

        :root[data-theme="dark"] .topbar-menu-button,
        :root[data-theme="dark"] .topbar-icon-button {
          border-color: var(--border, #343449);
          background: var(--surface, #191927);
          color: var(--text-secondary, #b8b8c9);
        }

        :root[data-theme="dark"] .topbar-menu-button:hover,
        :root[data-theme="dark"] .topbar-icon-button:hover,
        :root[data-theme="dark"] .topbar-icon-button.active {
          border-color: #5142a0;
          background: #2b2647;
          color: #b2a8ff;
        }

        :root[data-theme="dark"] .topbar-profile-button {
          border-color: var(--border, #343449);
          background: var(--surface, #191927);
        }

        :root[data-theme="dark"] .topbar-avatar {
          background: #343449;
          color: #eeeeff;
        }

        @media (max-width: 900px) {
          .topbar {
            padding: 0 20px;
          }

          .topbar-menu-button {
            display: flex;
          }
        }

        @media (max-width: 600px) {
          .topbar {
            padding: 0 14px;
            gap: 9px;
          }

          .topbar-left {
            gap: 10px;
          }

          .topbar-menu-button {
            width: 37px;
            height: 37px;
            margin-left: 0;
          }

          .topbar-heading h1 {
            font-size: 16px;
          }

          .topbar-heading p {
            max-width: 190px;
            font-size: 10px;
          }

          .topbar-actions {
            gap: 7px;
          }

          .topbar-icon-button {
            width: 36px;
            height: 36px;
          }

          .topbar-profile-button {
            width: 38px;
            height: 38px;
          }
        }

        @media (max-width: 380px) {
          .topbar-heading p {
            display: none;
          }

          .topbar-heading h1 {
            font-size: 15px;
          }

          .topbar-menu-button {
            width: 35px;
            height: 35px;
          }

          .topbar-actions {
            gap: 5px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .topbar,
          .topbar button {
            transition: none;
          }
        }
      `}</style>

      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-heading">
            <h1>{currentPage.title}</h1>
            <p>{currentPage.subtitle}</p>
          </div>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className={`topbar-icon-button ${
              activeView === "notifications" ? "active" : ""
            }`}
            onClick={() => navigateTo("notifications")}
            aria-label="Open notifications"
            aria-current={
              activeView === "notifications" ? "page" : undefined
            }
            title="Notifications"
          >
            <Icon name="bell" size={19} />
          </button>

          <button
            type="button"
            className={`topbar-profile-button ${
              activeView === "profile" ? "active" : ""
            }`}
            onClick={() => navigateTo("profile")}
            aria-label={`Open profile for ${displayName}`}
            aria-current={
              activeView === "profile" ? "page" : undefined
            }
            title="My Profile"
          >
            <div
              className={`topbar-avatar ${
                avatar && !avatarError ? "has-image" : ""
              }`}
            >
              {(!avatar || avatarError) && initial}

              {avatar && !avatarError && (
                <img
                  src={avatar}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={handleAvatarError}
                />
              )}
            </div>
          </button>
        </div>

        {/* Navigation button at the extreme right */}
        <button
          type="button"
          className="topbar-menu-button"
          onClick={openSidebar}
          aria-label="Open navigation menu"
          title="Open menu"
        >
          <Icon name="menu" size={21} />
        </button>
      </header>
    </>
  );
}
