import { useQuery } from "convex/react";
import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Badge } from "../ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Separator } from "../ui/separator";

export function MyTicketsList() {
  const tickets = useQuery(api.tickets.getMyTickets as any);

  if (!tickets) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Tickets</CardTitle>
          <CardDescription>Loading your submitted tickets...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "resolved":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "closed":
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "default",
      in_progress: "secondary",
      resolved: "outline",
      closed: "outline",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-gray-500",
      medium: "bg-blue-500",
      high: "bg-orange-500",
      urgent: "bg-red-500",
    };
    return (
      <Badge className={colors[priority] || "bg-gray-500"}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Tickets</CardTitle>
        <CardDescription>
          View the status of your submitted tickets
        </CardDescription>
      </CardHeader>
      <CardContent>
        {tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            You haven't submitted any tickets yet
          </p>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket: any) => (
              <div key={ticket._id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(ticket.status)}
                      <h3 className="font-semibold">{ticket.subject}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {ticket.description}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {getStatusBadge(ticket.status)}
                    {getPriorityBadge(ticket.priority)}
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium">Category:</span>{" "}
                    {ticket.category.replace("_", " ")}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>{" "}
                    {formatDate(ticket.createdAt)}
                  </div>
                  {ticket.assignedToModName && (
                    <div>
                      <span className="font-medium">Assigned to:</span>{" "}
                      {ticket.assignedToModName}
                    </div>
                  )}
                  {ticket.resolvedAt && (
                    <div>
                      <span className="font-medium">Resolved:</span>{" "}
                      {formatDate(ticket.resolvedAt)}
                    </div>
                  )}
                </div>

                {ticket.resolution && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-xs font-medium">Resolution:</p>
                      <p className="text-sm text-muted-foreground">
                        {ticket.resolution}
                      </p>
                      {ticket.resolvedByModName && (
                        <p className="text-xs text-muted-foreground">
                          — {ticket.resolvedByModName}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
