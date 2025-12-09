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
  const [resolveStatus, setResolveStatus] = useState<"resolved" | "closed">(
    "resolved"
  );
  const [isResolving, setIsResolving] = useState(false);
  const [newPriority, setNewPriority] = useState<string>("");
  const { toast } = useToast();

  const tickets = useQuery(api.tickets.getAllTickets as any, {
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    category: categoryFilter || undefined,
  });

  const stats = useQuery(api.tickets.getTicketStats as any);
  const resolveTicket = useMutation(api.tickets.resolveTicket as any);
  const updatePriority = useMutation(api.tickets.updateTicketPriority as any);

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
        title: "Ticket resolved",
        description: "The ticket has been updated successfully",
      });

      setSelectedTicket(null);
      setResolution("");
    } catch (error: any) {
      toast({
        title: "Failed to resolve ticket",
        description: error.message || "An error occurred",
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
        priority: priority as any,
      });

      toast({
        title: "Priority updated",
        description: "Ticket priority has been updated",
      });
    } catch (error: any) {
      toast({
        title: "Failed to update priority",
        description: error.message || "An error occurred",
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
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
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

  if (!tickets || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ticket Management</CardTitle>
          <CardDescription>Loading tickets...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Tickets</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Open</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">
              {stats.open}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Urgent</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {stats.urgent}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>High Priority</CardDescription>
            <CardTitle className="text-3xl text-orange-600">
              {stats.high}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
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
                  <SelectItem value="content_violation">
                    Content Violation
                  </SelectItem>
                  <SelectItem value="exploit_abuse">Exploit/Abuse</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets ({tickets.length})</CardTitle>
          <CardDescription>
            Manage and respond to user-submitted tickets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No tickets match the current filters
            </p>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket._id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                >
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

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium">Reporter:</span>{" "}
                      {ticket.reporterName}
                    </div>
                    <div>
                      <span className="font-medium">Category:</span>{" "}
                      {ticket.category.replace("_", " ")}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>{" "}
                      {formatDate(ticket.createdAt)}
                    </div>
                    {ticket.targetPlayerName && (
                      <div>
                        <span className="font-medium">Target:</span>{" "}
                        {ticket.targetPlayerName}
                      </div>
                    )}
                  </div>

                  {ticket.status !== "resolved" && ticket.status !== "closed" && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2">
                        <Select
                          value={newPriority}
                          onValueChange={(value) => {
                            setNewPriority(value);
                            handleUpdatePriority(ticket._id, value);
                          }}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Update priority" />
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
                        <p className="text-sm text-muted-foreground">
                          {ticket.resolution}
                        </p>
                        {ticket.resolvedByModName && (
                          <p className="text-xs text-muted-foreground">
                            — {ticket.resolvedByModName} at{" "}
                            {ticket.resolvedAt && formatDate(ticket.resolvedAt)}
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

      {/* Resolve Dialog */}
      <Dialog
        open={!!selectedTicket}
        onOpenChange={(open) => !open && setSelectedTicket(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolve Ticket</DialogTitle>
            <DialogDescription>
              Provide a resolution for this ticket
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-semibold">{selectedTicket.subject}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedTicket.description}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span>Reporter: {selectedTicket.reporterName}</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span>
                    Category: {selectedTicket.category.replace("_", " ")}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Resolution Status</Label>
                <Select
                  value={resolveStatus}
                  onValueChange={(value: any) => setResolveStatus(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed (No Action)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Resolution Notes</Label>
                <Textarea
                  placeholder="Explain how this ticket was resolved or why it was closed..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedTicket(null)}
              disabled={isResolving}
            >
              Cancel
            </Button>
            <Button onClick={handleResolveTicket} disabled={isResolving}>
              {isResolving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resolving...
                </>
              ) : (
                "Submit Resolution"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
