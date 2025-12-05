import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { AlertTriangle, Trash2, Users, Database, RotateCcw, Shield } from "lucide-react";

export default function AdminWipePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"all" | "player" | "reset">("all");
  const [selectedPlayerId, setSelectedPlayerId] = useState<Id<"players"> | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const maintenanceStatus = useQuery(api.maintenance.getMaintenanceStatus);
  const players = useQuery(api.maintenance.getPlayersForWipe);
  const currentPlayer = useQuery(api.moderation.getCurrentPlayer);

  const wipeAllData = useMutation(api.maintenance.wipeAllData);
  const wipePlayerData = useMutation(api.maintenance.wipePlayerData);
  const gameReset = useMutation(api.maintenance.gameReset);

  const isMaintenanceEnabled = maintenanceStatus?.isEnabled ?? false;
  const isAdmin = currentPlayer?.role === "admin";

  // Redirect if not admin
  if (currentPlayer && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <div className="max-w-2xl mx-auto text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-4">Only administrators can access this page.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 8000);
  };

  const getConfirmationWord = () => {
    switch (activeTab) {
      case "all":
        return "WIPE ALL";
      case "player":
        return "WIPE PLAYER";
      case "reset":
        return "RESET GAME";
      default:
        return "";
    }
  };

  const handleWipeAll = async () => {
    if (confirmText !== getConfirmationWord()) {
      showFeedback("error", `Please type "${getConfirmationWord()}" to confirm`);
      return;
    }
    setIsLoading(true);
    try {
      const result = await wipeAllData();
      showFeedback("success", result.message);
      setConfirmText("");
    } catch (e: any) {
      showFeedback("error", e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWipePlayer = async () => {
    if (!selectedPlayerId) {
      showFeedback("error", "Please select a player");
      return;
    }
    if (confirmText !== getConfirmationWord()) {
      showFeedback("error", `Please type "${getConfirmationWord()}" to confirm`);
      return;
    }
    setIsLoading(true);
    try {
      const result = await wipePlayerData({ playerId: selectedPlayerId });
      showFeedback("success", result.message);
      setConfirmText("");
      setSelectedPlayerId(null);
    } catch (e: any) {
      showFeedback("error", e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGameReset = async () => {
    if (confirmText !== getConfirmationWord()) {
      showFeedback("error", `Please type "${getConfirmationWord()}" to confirm`);
      return;
    }
    setIsLoading(true);
    try {
      const result = await gameReset();
      showFeedback("success", result.message);
      setConfirmText("");
    } catch (e: any) {
      showFeedback("error", e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPlayers = players?.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedPlayer = players?.find((p) => p._id === selectedPlayerId);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trash2 className="h-8 w-8 text-red-500" />
            <h1 className="text-4xl font-bold">Full Wipe Panel</h1>
          </div>
          <p className="text-slate-400">
            Dangerous operations for wiping game data. All actions require maintenance mode.
          </p>
        </div>

        {/* Maintenance Mode Warning */}
        <div
          className={`mb-6 p-4 rounded-lg border ${
            isMaintenanceEnabled
              ? "bg-green-900/50 border-green-700 text-green-200"
              : "bg-red-900/50 border-red-700 text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <span className="font-semibold">
              Maintenance Mode: {isMaintenanceEnabled ? "ENABLED" : "DISABLED"}
            </span>
          </div>
          {!isMaintenanceEnabled && (
            <p className="mt-2 text-sm">
              You must enable maintenance mode before performing any wipe operations.
              <button
                onClick={() => navigate("/admin/maintenance")}
                className="ml-2 underline hover:no-underline"
              >
                Go to Maintenance Settings
              </button>
            </p>
          )}
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

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setActiveTab("all");
              setConfirmText("");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "all"
                ? "bg-red-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Database className="h-4 w-4" />
            All Data
          </button>
          <button
            onClick={() => {
              setActiveTab("player");
              setConfirmText("");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "player"
                ? "bg-orange-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Users className="h-4 w-4" />
            Player Data
          </button>
          <button
            onClick={() => {
              setActiveTab("reset");
              setConfirmText("");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "reset"
                ? "bg-yellow-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <RotateCcw className="h-4 w-4" />
            Game Reset
          </button>
        </div>

        {/* Content */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          {activeTab === "all" && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Database className="h-5 w-5 text-red-500" />
                Wipe All Data
              </h2>
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-red-300 mb-2">Warning: This will delete:</h3>
                <ul className="text-sm text-red-200 space-y-1 list-disc list-inside">
                  <li>All transactions and loans</li>
                  <li>All companies, products, and marketplace data</li>
                  <li>All stock and crypto portfolios and transactions</li>
                  <li>All player inventory, upgrades, and gambling history</li>
                  <li>All messages and alerts</li>
                  <li>All tick history</li>
                  <li>Reset all player balances to $1,000</li>
                </ul>
                <p className="mt-3 text-red-300 font-semibold">
                  Player accounts and badges will be preserved.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Type "{getConfirmationWord()}" to confirm:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-red-500"
                    placeholder={getConfirmationWord()}
                    disabled={!isMaintenanceEnabled}
                  />
                </div>
                <button
                  onClick={handleWipeAll}
                  disabled={isLoading || !isMaintenanceEnabled || confirmText !== getConfirmationWord()}
                  className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:opacity-50 text-white font-medium rounded transition-colors"
                >
                  {isLoading ? "Processing..." : "Wipe All Data"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "player" && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-500" />
                Wipe Player Data
              </h2>
              <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-orange-300 mb-2">
                  This will delete all data for the selected player:
                </h3>
                <ul className="text-sm text-orange-200 space-y-1 list-disc list-inside">
                  <li>Companies, products, and marketplace listings</li>
                  <li>Stock and crypto portfolios</li>
                  <li>Transactions and loans</li>
                  <li>Inventory, upgrades, and gambling history</li>
                  <li>Reset balance to $1,000</li>
                </ul>
                <p className="mt-3 text-orange-300 font-semibold">
                  The player account will be preserved but reset.
                </p>
              </div>

              <div className="space-y-4">
                {/* Player Search */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Search for player:
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
                    placeholder="Search by name or email..."
                    disabled={!isMaintenanceEnabled}
                  />
                </div>

                {/* Player List */}
                <div className="max-h-64 overflow-y-auto border border-slate-600 rounded">
                  {filteredPlayers?.map((player) => (
                    <div
                      key={player._id}
                      onClick={() => isMaintenanceEnabled && setSelectedPlayerId(player._id)}
                      className={`p-3 border-b border-slate-700 cursor-pointer transition-colors ${
                        selectedPlayerId === player._id
                          ? "bg-orange-600/30 border-orange-500"
                          : "hover:bg-slate-700"
                      } ${!isMaintenanceEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{player.name}</span>
                          {player.hasBadges && (
                            <span className="ml-2 text-xs bg-purple-600 px-2 py-0.5 rounded">
                              Has Badges
                            </span>
                          )}
                          {player.role !== "normal" && (
                            <span
                              className={`ml-2 text-xs px-2 py-0.5 rounded ${
                                player.role === "admin"
                                  ? "bg-red-600"
                                  : player.role === "mod"
                                  ? "bg-blue-600"
                                  : "bg-yellow-600"
                              }`}
                            >
                              {player.role?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-slate-400">
                          ${(player.balance / 100).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400">{player.email}</div>
                    </div>
                  ))}
                  {filteredPlayers?.length === 0 && (
                    <div className="p-4 text-center text-slate-400">No players found</div>
                  )}
                </div>

                {/* Selected Player */}
                {selectedPlayer && (
                  <div className="bg-slate-700 p-4 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">Selected player:</div>
                    <div className="font-semibold">
                      {selectedPlayer.name} ({selectedPlayer.email})
                    </div>
                    <div className="text-sm text-slate-400">
                      Balance: ${(selectedPlayer.balance / 100).toLocaleString()} | Net Worth: $
                      {(selectedPlayer.netWorth / 100).toLocaleString()}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Type "{getConfirmationWord()}" to confirm:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
                    placeholder={getConfirmationWord()}
                    disabled={!isMaintenanceEnabled || !selectedPlayerId}
                  />
                </div>

                <button
                  onClick={handleWipePlayer}
                  disabled={
                    isLoading ||
                    !isMaintenanceEnabled ||
                    !selectedPlayerId ||
                    confirmText !== getConfirmationWord()
                  }
                  className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:opacity-50 text-white font-medium rounded transition-colors"
                >
                  {isLoading ? "Processing..." : "Wipe Player Data"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "reset" && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-yellow-500" />
                Game Reset
              </h2>
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-yellow-300 mb-2">
                  This performs a selective reset based on player badges:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-red-900/40 p-4 rounded-lg">
                    <h4 className="font-semibold text-red-300 mb-2">Players WITHOUT badges:</h4>
                    <ul className="text-sm text-red-200 space-y-1 list-disc list-inside">
                      <li>Completely deleted from the game</li>
                      <li>User/Clerk account removed</li>
                      <li>All their data wiped</li>
                    </ul>
                  </div>
                  <div className="bg-green-900/40 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-300 mb-2">Players WITH badges:</h4>
                    <ul className="text-sm text-green-200 space-y-1 list-disc list-inside">
                      <li>Account preserved</li>
                      <li>Game data reset</li>
                      <li>Balance reset to $1,000</li>
                      <li>Badges kept</li>
                    </ul>
                  </div>
                </div>
                <p className="mt-4 text-yellow-300 font-semibold">
                  Admin accounts are always preserved.
                </p>
              </div>

              {/* Badge Stats */}
              {players && (
                <div className="bg-slate-700 p-4 rounded-lg mb-6">
                  <h4 className="font-semibold mb-2">Current Player Stats:</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Total Players:</span>{" "}
                      <span className="font-semibold">{players.length}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">With Badges:</span>{" "}
                      <span className="font-semibold text-green-400">
                        {players.filter((p) => p.hasBadges).length}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Without Badges:</span>{" "}
                      <span className="font-semibold text-red-400">
                        {players.filter((p) => !p.hasBadges).length}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Admins:</span>{" "}
                      <span className="font-semibold text-blue-400">
                        {players.filter((p) => p.role === "admin").length}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Type "{getConfirmationWord()}" to confirm:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-yellow-500"
                    placeholder={getConfirmationWord()}
                    disabled={!isMaintenanceEnabled}
                  />
                </div>
                <button
                  onClick={handleGameReset}
                  disabled={isLoading || !isMaintenanceEnabled || confirmText !== getConfirmationWord()}
                  className="w-full px-6 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-700 disabled:opacity-50 text-white font-medium rounded transition-colors"
                >
                  {isLoading ? "Processing..." : "Reset Game"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="mt-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
