import { useQuery } from "convex/react";
import { useNavigate, useLocation } from "react-router";
import { useEffect } from "react";
import { useAuth } from "@clerk/react-router";
import { api } from "../../convex/_generated/api";

export function MaintenanceCheck() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useAuth();

  const maintenanceStatus = useQuery(api.maintenance.getMaintenanceStatus);
  const currentPlayer = userId
    ? useQuery(api.moderation.getCurrentPlayer)
    : undefined;

  const isAdminOrMod =
    currentPlayer?.role === "admin" || currentPlayer?.role === "mod";

  useEffect(() => {
    // Wait for maintenance status to load
    if (maintenanceStatus === undefined) {
      return;
    }

    // Don't redirect if:
    // 1. Maintenance is not enabled
    // 2. User is admin or mod
    // 3. Already on the maintenance page
    // 4. On admin pages (let them handle their own auth)
    if (
      !maintenanceStatus?.isEnabled ||
      isAdminOrMod ||
      location.pathname === "/maintenance" ||
      location.pathname.startsWith("/admin/")
    ) {
      return;
    }

    // If maintenance is enabled and user is not exempt, redirect to maintenance page
    if (userId !== null) {
      navigate("/maintenance");
    }
  }, [maintenanceStatus, isAdminOrMod, userId, navigate, location.pathname, currentPlayer]);

  return null;
}

export default MaintenanceCheck;
