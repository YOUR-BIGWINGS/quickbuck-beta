import { useAuth } from "@clerk/react-router";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { MyTicketsList } from "~/components/tickets/my-tickets-list";
import { TicketSubmissionForm } from "~/components/tickets/ticket-submission-form";

export default function TicketsPage() {
  const { isSignedIn } = useAuth();

  if (!isSignedIn) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Sign In Required</h1>
          <p className="text-muted-foreground mb-4">
            You need to be signed in to submit tickets.
          </p>
          <Link to="/sign-in">
            <Button>Sign In</Button>
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

      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Support Tickets</h1>
          <p className="text-muted-foreground">
            Report issues, bugs, or player behavior to our moderation team
          </p>
        </div>

        <TicketSubmissionForm />
        <MyTicketsList />
      </div>
    </div>
  );
}
