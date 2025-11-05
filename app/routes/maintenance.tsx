import { useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { Skeleton } from "~/components/ui/skeleton";

export default function MaintenancePage() {
  const navigate = useNavigate();
  const maintenanceStatus = useQuery(api.maintenance.getMaintenanceStatus);

  // Redirect back to dashboard if maintenance is disabled
  useEffect(() => {
    if (maintenanceStatus && !maintenanceStatus.isEnabled) {
      navigate("/dashboard");
    }
  }, [maintenanceStatus, navigate]);

  if (!maintenanceStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
        <div className="text-center max-w-md space-y-6">
          {/* Animated icon skeleton */}
          <div className="mb-8 inline-block">
            <Skeleton className="w-24 h-24 rounded-full" />
          </div>

          {/* Title skeleton */}
          <Skeleton className="h-10 w-64 mx-auto" />

          {/* Message skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4 mx-auto" />
          </div>

          {/* Reason box skeleton */}
          <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-full" />
          </div>

          {/* Timer skeleton */}
          <div className="p-4 bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg border border-slate-600 space-y-2">
            <Skeleton className="h-3 w-32 mx-auto" />
            <Skeleton className="h-4 w-40 mx-auto" />
          </div>

          {/* Footer text skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-56 mx-auto" />
            <Skeleton className="h-3 w-40 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return "Unknown";
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="text-center max-w-md">
        {/* Animated icon */}
        <div className="mb-8 inline-block">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
            <div className="relative w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center border-2 border-amber-400">
              <svg
                className="w-12 h-12 text-amber-400 animate-bounce"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4v2m0 4v2M6.25 6.25L8 4.5M18 15.75l1.75 1.75M18 8l1.75-1.75M6.25 17.75L8 19.5"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-white mb-2">Maintenance</h1>

        {/* Message */}
        <p className="text-xl text-slate-300 mb-6">
          {maintenanceStatus.message}
        </p>

        {/* Reason (if provided) */}
        {maintenanceStatus.reason && (
          <div className="mb-6 p-4 bg-slate-800 border border-slate-700 rounded-lg">
            <p className="text-sm text-slate-400 mb-1">Reason:</p>
            <p className="text-slate-200">{maintenanceStatus.reason}</p>
          </div>
        )}

        {/* Timer */}
        {maintenanceStatus.startedAt && (
          <div className="mb-8 p-4 bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg border border-slate-600">
            <p className="text-xs text-slate-400 mb-1">Maintenance started</p>
            <p className="text-sm text-slate-300">
              {formatTime(maintenanceStatus.startedAt)}
            </p>
          </div>
        )}

        {/* Footer text */}
        <div className="space-y-2">
          <p className="text-sm text-slate-400">
            We're working hard to improve your experience.
          </p>
          <p className="text-xs text-slate-500">Please check back soon!</p>
        </div>
      </div>
    </div>
  );
}
