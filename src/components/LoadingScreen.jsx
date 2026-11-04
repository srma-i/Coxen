
export default function LoadingScreen({
  message = "Restoring your COXEN workspace...",
  subtitle = "Preparing your conversations and memories",
}) {
  return (
    <div className="startup-screen">
      <style>{`
        .startup-screen {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 24px;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 50% 42%,
              rgba(167, 139, 250, 0.15),
              transparent 36%
            ),
            linear-gradient(135deg, #ffffff 0%, #f8f7ff 100%);
          font-family: "DM Sans", sans-serif;
          animation: startupFadeIn 0.5s ease both;
        }

        .startup-glow {
          position: absolute;
          width: 340px;
          height: 340px;
          border-radius: 50%;
          background: rgba(109, 40, 217, 0.09);
          filter: blur(100px);
          animation: startupGlow 3.5s ease-in-out infinite alternate;
          pointer-events: none;
        }

        .startup-content {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 380px;
          display: flex;
          align-items: center;
          flex-direction: column;
          text-align: center;
        }

        .startup-logo {
          width: 94px;
          height: 94px;
          display: grid;
          place-items: center;
          margin-bottom: 24px;
          padding: 12px;
          border: 1px solid rgba(109, 40, 217, 0.13);
          border-radius: 27px;
          background: #ffffff;
          box-shadow:
            0 14px 40px rgba(109, 40, 217, 0.13),
            0 4px 12px rgba(30, 20, 60, 0.04);
          animation: startupFloat 2.8s ease-in-out infinite;
        }

        .startup-logo img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .startup-title {
          margin: 0;
          color: #201936;
          font-family: "Space Grotesk", sans-serif;
          font-size: 30px;
          font-weight: 800;
          letter-spacing: 3px;
        }

        .startup-tagline {
          margin-top: 9px;
          color: #6D28D9;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 2.8px;
        }

        .startup-message {
          margin: 37px 0 9px;
          color: #302747;
          font-size: 13px;
          font-weight: 700;
        }

        .startup-subtitle {
          margin: 0;
          color: #9189a3;
          font-size: 11px;
          line-height: 1.7;
        }

        .startup-progress {
          width: 100%;
          max-width: 280px;
          height: 5px;
          margin-top: 28px;
          overflow: hidden;
          border-radius: 20px;
          background: #eee9f8;
        }

        .startup-progress-bar {
          width: 35%;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #A78BFA,
            #6D28D9
          );
          animation: startupProgress 1.8s ease-in-out infinite;
        }

        .startup-status {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 17px;
          color: #9991aa;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2px;
        }

        .startup-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #6D28D9;
          box-shadow: 0 0 10px rgba(109, 40, 217, 0.35);
          animation: startupPulse 1.2s ease-in-out infinite;
        }

        @keyframes startupFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes startupFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        @keyframes startupGlow {
          from {
            transform: scale(0.85);
            opacity: 0.5;
          }
          to {
            transform: scale(1.15);
            opacity: 1;
          }
        }

        @keyframes startupProgress {
          0% { transform: translateX(-110%); }
          100% { transform: translateX(310%); }
        }

        @keyframes startupPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }

        @media (max-width: 480px) {
          .startup-logo {
            width: 84px;
            height: 84px;
            border-radius: 23px;
          }

          .startup-title {
            font-size: 27px;
          }

          .startup-message {
            font-size: 12px;
          }

          .startup-subtitle {
            max-width: 280px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .startup-screen *,
          .startup-screen *::before,
          .startup-screen *::after {
            animation: none !important;
          }
        }
      `}</style>

      <div className="startup-glow" />

      <div className="startup-content">
        <div className="startup-logo">
          <img src="/logo.png" alt="COXEN logo" />
        </div>

        <h1 className="startup-title">COXEN</h1>

        <span className="startup-tagline">
          INTELLIGENCE, REIMAGINED
        </span>

        <p className="startup-message">{message}</p>

        <p className="startup-subtitle">{subtitle}</p>

        <div
          className="startup-progress"
          role="progressbar"
          aria-label="Loading workspace"
        >
          <div className="startup-progress-bar" />
        </div>

        <div className="startup-status">
          <span className="startup-status-dot" />
          Initializing your workspace
        </div>
      </div>
    </div>
  );
}
