import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  Loader2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Separator } from "../ui/separator";
import { Textarea } from "../ui/textarea";
import { useToast } from "~/hooks/use-toast";

export function ModeratorTicketManager() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [resolution, setResolution] = useState("");
  const [resolveStatus, setResolveStatus] = useState<"resolved" | "closed">("resolved");
  const [isResolving, setIsResolving] = useState(false);
  const { toast } = useToast();

  const tickets = useQuery(api.tickets.getAllTickets, {
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    category: categoryFilter || undefined,
  });

  const stats = useQuery(api.tickets.getTicketStats);
  const resolveTicket = useMutation(api.tickets.resolveTicket);
  const updatePriority = useMutation(api.tickets.updateTicketPriority);

  const handleResolveTicket = async () => {
    if (!selectedTicket || !resolution) {
      toast({
        title: "Missing information",
        description: "Please provide a resolution",
        variant: "destructive",
      });
      return;
    }

    setIsResolving(true);
    try {
      await resolveTicket({
        ticketId: selectedTicket._id,
        resolution,
        status: resolveStatus,
      });

      toast({
        title: "Success",
        description: "Ticket has been resolved",
      });

      setSelectedTicket(null);
      setResolution("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resolve ticket",
        variant: "destructive",
      });
    } finally {
      setIsResolving(false);
    }
  };

  const handleUpdatePriority = async (ticketId: Id<"tickets">, priority: string) => {
    try {
      await updatePriority({
        ticketId,
        priority: priority as "low" | "medium" | "high" | "urgent",
      });

      toast({
        title: "Success",
        description: "Priority updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update priority",
        variant: "destructive",
      });
    }
  };

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

  if (tickets === undefined || stats === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading</CardTitle>
          <CardDescription>Please wait...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Handle null case (no access)
  if (tickets === null || stats === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>You do not have permission to view tickets.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Tickets</CardDescription>
            <CardTitle className="text-3xl">{stats?.total ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Open</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{stats?.open ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Urgent</CardDescription>
            <CardTitle className="text-3xl text-red-600">{stats?.urgent ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>High Priority</CardDescription>
            <CardTitle className="text-3xl text-orange-600">{stats?.high ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  <SelectItem value="player_behavior">Player Behavior</SelectItem>
                  <SelectItem value="bug_report">Bug Report</SelectItem>
                  <SelectItem value="content_violation">Content Violation</SelectItem>
                  <SelectItem value="exploit_abuse">Exploit/Abuse</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tickets ({tickets?.length ?? 0})</CardTitle>
          <CardDescription>Manage user-submitted tickets</CardDescription>
        </CardHeader>
        <CardContent>
          {!tickets || tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No tickets found
            </p>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket: any) => (
                <div
                  key={ticket._id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(ticket.status ?? "open")}
                        <h3 className="font-semibold">{ticket.subject ?? "No Subject"}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {ticket.description ?? ""}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {getStatusBadge(ticket.status ?? "open")}
                      {getPriorityBadge(ticket.priority ?? "medium")}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium">Reporter:</span> {ticket.reporterName ?? "Unknown"}
                    </div>
                    <div>
                      <span className="font-medium">Category:</span> {(ticket.category ?? "other").replace("_", " ")}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span> {ticket.createdAt ? formatDate(ticket.createdAt) : "Unknown"}
                    </div>
                    {ticket.targetPlayerName && (
                      <div>
                        <span className="font-medium">Target:</span> {ticket.targetPlayerName}
                      </div>
                    )}
                  </div>

                  {ticket.status !== "resolved" && ticket.status !== "closed" && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2">
                        <Select
                          onValueChange={(value) => handleUpdatePriority(ticket._id, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Change priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setResolution("");
                          }}
                        >
                          Resolve Ticket
                        </Button>
                      </div>
                    </>
                  )}

                  {ticket.resolution && (
                    <>
                      <Separator />
                      <div className="space-y-1">
                        <p className="text-xs font-medium">Resolution:</p>
                        <p className="text-sm text-muted-foreground">{ticket.resolution ?? ""}</p>
                        {ticket.resolvedByModName && (
                          <p className="text-xs text-muted-foreground">
                            {ticket.resolvedByModName} at {ticket.resolvedAt ? formatDate(ticket.resolvedAt) : "Unknown"}
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

      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolve Ticket</DialogTitle>
            <DialogDescription>Provide resolution details</DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-semibold">{selectedTicket.subject ?? "No Subject"}</h4>
                <p className="text-sm text-muted-foreground">{selectedTicket.description ?? ""}</p>
                <div className="flex items-center gap-2 text-xs">
                  <span>Reporter: {selectedTicket.reporterName ?? "Unknown"}</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span>Category: {(selectedTicket.category ?? "other").replace("_", " ")}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={resolveStatus} onValueChange={(value: any) => setResolveStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Resolution Notes</Label>
                <Textarea
                  placeholder="Explain the resolution..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTicket(null)} disabled={isResolving}>
              Cancel
            </Button>
            <Button onClick={handleResolveTicket} disabled={isResolving}>
              {isResolving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resolving...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
