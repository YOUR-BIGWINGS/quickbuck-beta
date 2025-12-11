import { useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { Link, Navigate } from "react-router";
import { AuditLogViewer } from "~/components/admin/audit-log-viewer";
import { Button } from "~/components/ui/button";
import { api } from "convex/_generated/api";

export default function AuditLogPage() {
  const player = useQuery(api.moderation.getCurrentPlayer);

  if (player === undefined) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Loading...</h1>
          <p className="text-muted-foreground">Please wait...</p>
        </div>
      </div>
    );
  }

  if (player === null) {
    return <Navigate to="/sign-in" />;
  }

  if (!player) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Error Loading Page</h1>
          <p className="text-muted-foreground mb-4">
            Failed to load your player data. Please try refreshing the page.
          </p>
          <Link to="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const role = player.role || "normal";
  const hasAccess = ["mod", "high_mod", "admin"].includes(role);

  if (!hasAccess) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You need mod or higher permissions to access the audit log.
          </p>
          <Link to="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Audit Log</h1>
          <p className="text-muted-foreground">
            Comprehensive record of all system actions (automatically cleared after 3 days)
          </p>
        </div>

        <AuditLogViewer />
      </div>
    </div>
  );
}
