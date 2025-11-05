import { useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { useEffect } from "react";
import { useAuth } from "@clerk/react-router";
import { api } from "../../convex/_generated/api";

export function MaintenanceCheck() {
  const navigate = useNavigate();
  const { userId } = useAuth();

  const maintenanceStatus = useQuery(api.maintenance.getMaintenanceStatus);
  const currentPlayer = userId
    ? useQuery(api.moderation.getCurrentPlayer)
    : null;

  const isAdminOrMod =
    currentPlayer?.role === "admin" || currentPlayer?.role === "mod";

  useEffect(() => {
    if (
      maintenanceStatus?.isEnabled &&
      !isAdminOrMod &&
      userId &&
      currentPlayer
    ) {
      navigate("/maintenance");
    }
  }, [maintenanceStatus, isAdminOrMod, userId, navigate, currentPlayer]);

  return null;
}

export default MaintenanceCheck;
