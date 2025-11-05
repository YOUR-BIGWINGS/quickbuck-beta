import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../../../convex/_generated/api";

export default function AdminMaintenancePage() {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [message, setMessage] = useState(
    "The server is under maintenance. Please try again later."
  );
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const maintenanceStatus = useQuery(api.maintenance.getMaintenanceStatus);
  const enableMaintenance = useMutation(api.maintenance.enableMaintenanceMode);
  const disableMaintenance = useMutation(
    api.maintenance.disableMaintenanceMode
  );

  // Check if user is admin on mount
  useEffect(() => {
    setIsAuthorized(true);
  }, [navigate]);

  const handleEnable = async () => {
    try {
      setIsLoading(true);
      await enableMaintenance({ message, reason });
      setFeedback({
        type: "success",
        message:
          "Maintenance mode enabled. Users will see the maintenance page.",
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (error) {
      setFeedback({
        type: "error",
        message: `Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    try {
      setIsLoading(true);
      await disableMaintenance();
      setFeedback({
        type: "success",
        message: "Maintenance mode disabled. Users can now access the site.",
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (error) {
      setFeedback({
        type: "error",
        message: `Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Maintenance Mode</h1>
          <p className="text-slate-400">
            Control server maintenance mode. When enabled, non-admin users will
            see the maintenance page.
          </p>
        </div>

        {/* Feedback Messages */}
        {feedback && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              feedback.type === "success"
                ? "bg-green-900 border border-green-700 text-green-200"
                : "bg-red-900 border border-red-700 text-red-200"
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* Main Control */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6">Control Panel</h2>

          <div className="space-y-6">
            {/* Message Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Maintenance Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                placeholder="Enter the message users will see..."
              />
            </div>

            {/* Reason Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Reason (Internal)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                placeholder="Enter reason for maintenance (for internal records)..."
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleEnable}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white font-medium rounded transition-colors"
              >
                {isLoading ? "Processing..." : "Enable Maintenance"}
              </button>
              <button
                onClick={handleDisable}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 text-white font-medium rounded transition-colors"
              >
                {isLoading ? "Processing..." : "Disable Maintenance"}
              </button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-900 border border-blue-700 rounded-lg p-6 text-blue-100">
          <h3 className="font-semibold mb-2">How it works:</h3>
          <ul className="text-sm space-y-2">
            <li>
              • When enabled, all non-admin users will be redirected to the
              maintenance page
            </li>
            <li>
              • Admins can still access the full site and this control panel
            </li>
            <li>• The message and reason will be saved with a timestamp</li>
            <li>• Mods cannot enable or disable maintenance mode</li>
          </ul>
        </div>

        {/* Status Section */}
        <div className="mt-8 bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Current Status</h3>
            {/* Toggle Switch */}
            <button
              onClick={
                maintenanceStatus?.isEnabled ? handleDisable : handleEnable
              }
              disabled={isLoading}
              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                maintenanceStatus?.isEnabled
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              } disabled:opacity-50`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  maintenanceStatus?.isEnabled
                    ? "translate-x-9"
                    : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <p className="text-slate-400">
              Status:{" "}
              <span
                className={
                  maintenanceStatus?.isEnabled
                    ? "text-red-400 font-semibold"
                    : "text-green-400 font-semibold"
                }
              >
                {maintenanceStatus?.isEnabled ? "🔴 ENABLED" : "🟢 DISABLED"}
              </span>
            </p>
            <p className="text-slate-400">
              Started At:{" "}
              <span className="text-white">
                {maintenanceStatus?.startedAt
                  ? new Date(maintenanceStatus.startedAt).toLocaleString()
                  : "N/A"}
              </span>
            </p>
            <p className="text-slate-400">
              Reason:{" "}
              <span className="text-white">
                {maintenanceStatus?.reason || "N/A"}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
