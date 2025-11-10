import { AlertCircle, Ban } from "lucide-react";
import { useState } from "react";

interface LimitedAccountAlertProps {
  reason: string;
}

export function LimitedAccountAlert({ reason }: LimitedAccountAlertProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <>
      <div className="limited-account-modal-overlay">
        <div className="limited-account-modal">
          <div className="modal-header">
            <AlertCircle className="modal-icon" size={32} />
            <h2>⚠️ Your Account is Limited</h2>
          </div>
          <div className="modal-body">
            <p className="reason">
              <strong>Reason:</strong> {reason}
            </p>
            <p className="info">
              Your account has been restricted. You cannot create new companies,
              products, or cryptocurrencies. If you believe this is an error,
              please contact support.
            </p>
          </div>
          <div className="modal-footer">
            <button className="modal-button" onClick={() => setDismissed(true)}>
              I Understand
            </button>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .limited-account-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .limited-account-modal {
          background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%);
          border: 4px solid #f59e0b;
          border-radius: 8px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .limited-account-modal .modal-header {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 20px;
          border-bottom: 2px solid #f59e0b;
        }

        .limited-account-modal .modal-icon {
          color: #f59e0b;
          flex-shrink: 0;
        }

        .limited-account-modal .modal-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: bold;
          color: #92400e;
        }

        .limited-account-modal .modal-body {
          padding: 20px;
        }

        .limited-account-modal .reason {
          margin: 0 0 15px 0;
          font-weight: 600;
          color: #b45309;
          font-size: 14px;
        }

        .limited-account-modal .info {
          margin: 0;
          font-size: 13px;
          color: #78350f;
          line-height: 1.5;
        }

        .limited-account-modal .modal-footer {
          padding: 20px;
          border-top: 2px solid #f59e0b;
          display: flex;
          justify-content: flex-end;
        }

        .limited-account-modal .modal-button {
          padding: 10px 20px;
          background: #f59e0b;
          color: #ffffff;
          border: 2px solid #d97706;
          border-radius: 4px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s;
        }

        .limited-account-modal .modal-button:hover {
          background: #d97706;
        }
      `,
        }}
      />
    </>
  );
}

interface WarningModalProps {
  warnings: Array<{ reason: string; createdAt: number }>;
  onDismiss: () => void;
}

export function WarningModal({ warnings, onDismiss }: WarningModalProps) {
  return (
    <>
      <div className="warning-modal-overlay">
        <div className="warning-modal">
          <div className="modal-header">
            <AlertCircle className="modal-icon warning-icon" size={32} />
            <h2>⚠️ Account Warning</h2>
          </div>
          <div className="modal-body">
            <p className="warning-text">
              You have received{" "}
              <strong>
                {warnings.length} warning{warnings.length !== 1 ? "s" : ""}
              </strong>
              :
            </p>
            <div className="warnings-list">
              {warnings.map((warning, index) => (
                <div key={index} className="warning-item">
                  <p className="warning-reason">{warning.reason}</p>
                  <p className="warning-date">
                    {new Date(warning.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <p className="warning-info">
              Please review our community guidelines. Multiple warnings may
              result in account limitation or suspension.
            </p>
          </div>
          <div className="modal-footer">
            <button className="modal-button" onClick={onDismiss}>
              I Understand
            </button>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .warning-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.3s ease-out;
        }

        .warning-modal {
          background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
          border: 4px solid #f97316;
          border-radius: 8px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease-out;
        }

        .warning-modal .modal-header {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 20px;
          border-bottom: 2px solid #f97316;
        }

        .warning-modal .modal-icon {
          color: #f97316;
          flex-shrink: 0;
        }

        .warning-modal .modal-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: bold;
          color: #92400e;
        }

        .warning-modal .modal-body {
          padding: 20px;
        }

        .warning-modal .warning-text {
          margin: 0 0 15px 0;
          font-weight: 600;
          color: #92400e;
          font-size: 14px;
        }

        .warning-modal .warnings-list {
          background: rgba(255, 255, 255, 0.7);
          border-left: 4px solid #f97316;
          border-radius: 4px;
          padding: 15px;
          margin: 15px 0;
          max-height: 200px;
          overflow-y: auto;
        }

        .warning-modal .warning-item {
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .warning-modal .warning-item:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }

        .warning-modal .warning-reason {
          margin: 0 0 5px 0;
          font-size: 13px;
          color: #92400e;
          font-weight: 500;
        }

        .warning-modal .warning-date {
          margin: 0;
          font-size: 11px;
          color: #b45309;
        }

        .warning-modal .warning-info {
          margin: 15px 0 0 0;
          font-size: 12px;
          color: #7c2d12;
          line-height: 1.5;
        }

        .warning-modal .modal-footer {
          padding: 20px;
          border-top: 2px solid #f97316;
          display: flex;
          justify-content: flex-end;
        }

        .warning-modal .modal-button {
          padding: 10px 20px;
          background: #f97316;
          color: #ffffff;
          border: 2px solid #ea580c;
          border-radius: 4px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s;
        }

        .warning-modal .modal-button:hover {
          background: #ea580c;
        }
      `,
        }}
      />
    </>
  );
}

import type { Id } from "convex/_generated/dataModel";

interface ModeratorMessageModalProps {
  messages: Array<{
    _id: Id<"moderatorMessages">;
    message: string;
    sentAt: number;
    senderName: string;
  }>;
  onDismiss: () => void;
  onMarkAsRead: (messageId: Id<"moderatorMessages">) => void;
}

export function ModeratorMessageModal({
  messages,
  onDismiss,
  onMarkAsRead,
}: ModeratorMessageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentMessage = messages[currentIndex];

  const handleNext = () => {
    if (currentMessage) {
      onMarkAsRead(currentMessage._id);
    }

    if (currentIndex < messages.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onDismiss();
    }
  };

  if (!currentMessage) return null;

  return (
    <>
      <div className="mod-message-modal-overlay">
        <div className="mod-message-modal">
          <div className="modal-header">
            <AlertCircle className="modal-icon message-icon" size={32} />
            <h2>✉️ Message from Moderator</h2>
          </div>
          <div className="modal-body">
            <p className="message-from">
              From: <strong>{currentMessage.senderName}</strong>
            </p>
            <p className="message-date">
              {new Date(currentMessage.sentAt).toLocaleString()}
            </p>
            <div className="message-content">
              <p>{currentMessage.message}</p>
            </div>
            {messages.length > 1 && (
              <p className="message-counter">
                Message {currentIndex + 1} of {messages.length}
              </p>
            )}
          </div>
          <div className="modal-footer">
            <button className="modal-button" onClick={handleNext}>
              {currentIndex < messages.length - 1 ? "Next Message" : "Dismiss"}
            </button>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .mod-message-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .mod-message-modal {
          max-width: 600px;
          width: 90%;
          background: #ffffff;
          border: 3px solid #3b82f6;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease-out;
        }

        .mod-message-modal .modal-header {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 20px;
          border-bottom: 2px solid #3b82f6;
        }

        .mod-message-modal .modal-icon {
          color: #3b82f6;
          flex-shrink: 0;
        }

        .mod-message-modal .modal-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: bold;
          color: #1e40af;
        }

        .mod-message-modal .modal-body {
          padding: 20px;
        }

        .mod-message-modal .message-from {
          margin: 0 0 5px 0;
          font-weight: 600;
          color: #1e40af;
          font-size: 14px;
        }

        .mod-message-modal .message-date {
          margin: 0 0 15px 0;
          font-size: 12px;
          color: #6b7280;
        }

        .mod-message-modal .message-content {
          background: rgba(59, 130, 246, 0.1);
          border-left: 4px solid #3b82f6;
          border-radius: 4px;
          padding: 15px;
          margin: 15px 0;
          max-height: 300px;
          overflow-y: auto;
        }

        .mod-message-modal .message-content p {
          margin: 0;
          font-size: 14px;
          color: #1f2937;
          line-height: 1.6;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .mod-message-modal .message-counter {
          margin: 15px 0 0 0;
          font-size: 12px;
          color: #6b7280;
          text-align: center;
          font-weight: 600;
        }

        .mod-message-modal .modal-footer {
          padding: 20px;
          border-top: 2px solid #3b82f6;
          display: flex;
          justify-content: flex-end;
        }

        .mod-message-modal .modal-button {
          padding: 10px 20px;
          background: #3b82f6;
          color: #ffffff;
          border: 2px solid #2563eb;
          border-radius: 4px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s;
        }

        .mod-message-modal .modal-button:hover {
          background: #2563eb;
        }
      `,
        }}
      />
    </>
  );
}

interface BannedAccountScreenProps {
  reason: string;
}

export function BannedAccountScreen({ reason }: BannedAccountScreenProps) {
  return (
    <>
      <div className="banned-screen">
        <div className="banned-content">
          <Ban className="banned-icon" size={80} />
          <h1>🚫 Account Banned 🚫</h1>
          <div className="ban-info">
            <p className="ban-reason">
              <strong>Reason:</strong> {reason}
            </p>
            <p className="ban-message">
              Your account has been banned from Quickbuck. You no
              longer have access to any features or content. You may be unbanned
              in the future at the discretion of the moderation team.
            </p>
            <p className="contact-info">
              If you believe this ban was made in error, please contact support
              at{" brodie.lamprecht@gmail.com"}
              <a href="mailto:support@quickbuck.com">support@quickbuck.com</a>
            </p>
          </div>
          <a href="/" className="return-home">
            Return to Home
          </a>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .banned-screen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          animation: fadeIn 0.5s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .banned-screen .banned-content {
          max-width: 600px;
          width: 90%;
          background: #ffffff;
          border: 5px solid #dc2626;
          border-radius: 12px;
          padding: 40px;
          text-align: center;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          animation: scaleIn 0.3s ease-out 0.2s backwards;
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .banned-screen .banned-icon {
          color: #dc2626;
          margin-bottom: 20px;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        .banned-screen .banned-content h1 {
          color: #dc2626;
          font-size: 32px;
          margin: 0 0 20px 0;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
        }

        .banned-screen .ban-info {
          background: #fee2e2;
          border: 2px solid #dc2626;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          text-align: left;
        }

        .banned-screen .ban-reason {
          font-size: 16px;
          margin: 0 0 15px 0;
          color: #991b1b;
          line-height: 1.5;
        }

        .banned-screen .ban-reason strong {
          display: block;
          margin-bottom: 5px;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .banned-screen .ban-message {
          font-size: 14px;
          margin: 15px 0;
          color: #7f1d1d;
          line-height: 1.6;
        }

        .banned-screen .contact-info {
          font-size: 13px;
          margin: 15px 0 0 0;
          color: #991b1b;
          line-height: 1.5;
        }

        .banned-screen .contact-info a {
          color: #dc2626;
          text-decoration: underline;
          font-weight: bold;
        }

        .banned-screen .return-home {
          display: inline-block;
          margin-top: 20px;
          padding: 12px 24px;
          background: #dc2626;
          color: #ffffff;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          transition: background 0.2s;
        }

        .banned-screen .return-home:hover {
          background: #b91c1c;
        }
      `,
        }}
      />
    </>
  );
}
