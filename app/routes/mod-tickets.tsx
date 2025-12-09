import { useAuth } from "@clerk/react-router";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { Link, Navigate } from "react-router";
import { ModeratorTicketManager } from "~/components/admin/moderator-ticket-manager";
import { Button } from "~/components/ui/button";
import { api } from "../../convex/_generated/api";

export default function ModTicketsPage() {
  const { isSignedIn, userId } = useAuth();
  const upsertUser = useMutation(api.users.upsertUser);

  const user = useQuery(
    api.users.findUserByToken,
    isSignedIn ? { tokenIdentifier: "" } : "skip"
  );

  const player = useQuery(
    api.players.getPlayerByUserId,
    user?._id ? { userId: user._id } : "skip"
  );

  // Sync user when signed in
  useEffect(() => {
    if (isSignedIn) {
      upsertUser().catch(console.error);
    }
  }, [isSignedIn, upsertUser]);

  if (!isSignedIn) {
    return <Navigate to="/sign-in" />;
  }

  if (!player) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Loading...</h1>
          <p className="text-muted-foreground">Please wait...</p>
        </div>
      </div>
    );
  }

  const role = player.role || "normal";
  const isModerator = ["lil_mod", "mod", "high_mod", "admin"].includes(role);

  if (!isModerator) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You need moderator permissions to access this page.
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
          <h1 className="text-3xl font-bold mb-2">Ticket Management</h1>
          <p className="text-muted-foreground">
            Review and manage user-submitted support tickets
          </p>
        </div>

        <ModeratorTicketManager />
      </div>
    </div>
  );
}
