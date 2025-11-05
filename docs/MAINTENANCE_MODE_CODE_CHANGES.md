# Maintenance Mode - Exact Code Changes After Convex API Regeneration

After running `convex dev`, make these exact changes:

## File 1: `app/routes/admin/maintenance.tsx`

### Change 1: Update imports (Line 5-6)

**BEFORE:**
```tsx
import type { Route } from "./+types/admin-maintenance";

// Note: After Convex API regeneration, import from:
// import { api } from "../../../convex/_generated/api";
```

**AFTER:**
```tsx
import type { Route } from "./+types/admin-maintenance";
import { api } from "../../../convex/_generated/api";
```

---

### Change 2: Uncomment API hooks (Line 19-22)

**BEFORE:**
```tsx
  // TODO: Replace with actual API queries after Convex regeneration
  // const maintenanceStatus = useQuery(api.maintenance.getMaintenanceStatus);
  // const enableMaintenance = useMutation(api.maintenance.enableMaintenanceMode);
  // const disableMaintenance = useMutation(api.maintenance.disableMaintenanceMode);
```

**AFTER:**
```tsx
  const maintenanceStatus = useQuery(api.maintenance.getMaintenanceStatus);
  const enableMaintenance = useMutation(api.maintenance.enableMaintenanceMode);
  const disableMaintenance = useMutation(api.maintenance.disableMaintenanceMode);
```

---

### Change 3: Wire enable button (Line 51)

**BEFORE:**
```tsx
      // await enableMaintenance({ message, reason });
```

**AFTER:**
```tsx
      await enableMaintenance({ message, reason });
```

---

### Change 4: Wire disable button (Line 65)

**BEFORE:**
```tsx
      // await disableMaintenance();
```

**AFTER:**
```tsx
      await disableMaintenance();
```

---

### Change 5: Update status display (Lines 107-116)

**BEFORE:**
```tsx
        <div className="mt-8 bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Current Status</h3>
          <div className="space-y-2 text-sm">
            <p className="text-slate-400">
              Maintenance Mode: <span className="text-white">TODO - Fetch from API</span>
            </p>
            <p className="text-slate-400">
              Started At: <span className="text-white">TODO - Fetch from API</span>
            </p>
            <p className="text-slate-400">
              Reason: <span className="text-white">TODO - Fetch from API</span>
            </p>
          </div>
        </div>
```

**AFTER:**
```tsx
        <div className="mt-8 bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Current Status</h3>
          <div className="space-y-2 text-sm">
            <p className="text-slate-400">
              Maintenance Mode:{" "}
              <span className={maintenanceStatus?.isEnabled ? "text-red-400 font-semibold" : "text-green-400 font-semibold"}>
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
```

---

## File 2: `app/routes/maintenance.tsx`

### Change 1: Replace imports and useMemo (Lines 1-25)

**BEFORE:**
```tsx
import { useMemo } from "react";
import { Zap } from "lucide-react";

export default function MaintenancePage() {
  const maintenanceStatus = useMemo(() => ({
    isEnabled: true,
    message: "The server is under maintenance. Please try again later.",
    startedAt: Date.now(),
    reason: "Example maintenance reason",
  }), []);
```

**AFTER:**
```tsx
import { useQuery } from "convex/react";
import { Zap } from "lucide-react";
import { api } from "../../convex/_generated/api";

export default function MaintenancePage() {
  const maintenanceStatus = useQuery(api.maintenance.getMaintenanceStatus);
```

---

## File 3: `app/components/maintenance-check.tsx`

### Change 1: Complete rewrite - uncomment everything

**BEFORE:**
```tsx
import { useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { useEffect } from "react";
import { useAuth } from "@clerk/react-router";

// This component will check maintenance status and redirect non-admins
// After Convex API regeneration, uncomment and use:
// import { api } from "../../convex/_generated/api";

export function MaintenanceCheck() {
  const navigate = useNavigate();
  const { userId } = useAuth();

  // TODO: After Convex API regeneration, uncomment:
  // const maintenanceStatus = useQuery(api.maintenance.getMaintenanceStatus);
  // const currentPlayer = useQuery(userId ? api.moderation.getCurrentPlayer : null);

  // const isAdminOrMod = currentPlayer?.role === "admin" || currentPlayer?.role === "mod";

  // useEffect(() => {
  //   if (maintenanceStatus?.isEnabled && !isAdminOrMod && userId) {
  //     navigate("/maintenance");
  //   }
  // }, [maintenanceStatus, isAdminOrMod, userId, navigate]);

  // For now, return null - this will be implemented after API regeneration
  return null;
}

export default MaintenanceCheck;
```

**AFTER:**
```tsx
import { useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { useEffect } from "react";
import { useAuth } from "@clerk/react-router";
import { api } from "../../convex/_generated/api";

export function MaintenanceCheck() {
  const navigate = useNavigate();
  const { userId } = useAuth();

  const maintenanceStatus = useQuery(api.maintenance.getMaintenanceStatus);
  const currentPlayer = useQuery(userId ? api.moderation.getCurrentPlayer : null);

  const isAdminOrMod = currentPlayer?.role === "admin" || currentPlayer?.role === "mod";

  useEffect(() => {
    if (maintenanceStatus?.isEnabled && !isAdminOrMod && userId) {
      navigate("/maintenance");
    }
  }, [maintenanceStatus, isAdminOrMod, userId, navigate]);

  return null;
}

export default MaintenanceCheck;
```

---

## Summary

**Total changes: 9 across 3 files**

1. ✅ `app/routes/admin/maintenance.tsx` - 5 changes (import + uncomment queries + wire buttons + update status)
2. ✅ `app/routes/maintenance.tsx` - 2 changes (update imports + replace useMemo)
3. ✅ `app/components/maintenance-check.tsx` - 1 change (complete uncomment + import)

After these changes:
- Run `npm run type-check` - should have no errors
- Run `npm run dev` - server should start clean
- Navigate to `/admin/maintenance` as admin to test
