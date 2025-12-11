import { useQuery } from "convex/react";
import {
  Activity,
  AlertCircle,
  Building2,
  Download,
  FileText,
  Filter,
  Search,
  Shield,
  Ticket,
  TrendingUp,
  User,
} from "lucide-react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Separator } from "../ui/separator";

export function AuditLogViewer() {
  const [category, setCategory] = useState<string>("");
  const [actionType, setActionType] = useState<string>("");
  const [searchText, setSearchText] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [limit, setLimit] = useState<number>(100);

  const logs = useQuery(api.auditLog.searchAuditLogs, {
    category: category || undefined,
    actionType: actionType || undefined,
    searchText: searchText || undefined,
    startDate: startDate ? new Date(startDate).getTime() : undefined,
    endDate: endDate ? new Date(endDate).getTime() : undefined,
    limit,
  });

  const stats = useQuery(api.auditLog.getAuditStats, { days: 7 });

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "moderation":
        return <Shield className="h-4 w-4" />;
      case "ticket":
        return <Ticket className="h-4 w-4" />;
      case "player":
        return <User className="h-4 w-4" />;
      case "company":
        return <Building2 className="h-4 w-4" />;
      case "transaction":
        return <TrendingUp className="h-4 w-4" />;
      case "system":
        return <Activity className="h-4 w-4" />;
      case "admin":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getCategoryBadge = (cat: string) => {
    const colors: Record<string, string> = {
      moderation: "bg-red-500",
      ticket: "bg-blue-500",
      player: "bg-green-500",
      company: "bg-purple-500",
      transaction: "bg-yellow-500",
      system: "bg-gray-500",
      admin: "bg-orange-500",
    };
    return (
      <Badge className={colors[cat] || "bg-gray-500"}>
        {cat.toUpperCase()}
      </Badge>
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDateForInput = (timestamp: number) => {
    return new Date(timestamp).toISOString().slice(0, 16);
  };

  const handleExport = () => {
    if (!logs) return;

    const csv = [
      ["Timestamp", "Category", "Action Type", "Actor", "Target", "Description"].join(","),
      ...logs.map((log: any) =>
        [
          formatDate(log.timestamp),
          log.category,
          log.actionType,
          log.actorName || "System",
          log.targetName || "-",
          `"${log.description.replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!logs || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
          <CardDescription>Loading audit logs...</CardDescription>
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
            <CardDescription>Total Actions (7d)</CardDescription>
            <CardTitle className="text-3xl">{stats.totalActions}</CardTitle>
          </CardHeader>
        </Card>
        {Object.entries(stats.categoryCounts)
          .sort((a: any, b: any) => b[1] - a[1])
          .slice(0, 3)
          .map(([cat, count]) => (
            <Card key={cat}>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  {getCategoryIcon(cat)}
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </CardDescription>
                <CardTitle className="text-3xl">{count as number}</CardTitle>
              </CardHeader>
            </Card>
          ))}
      </div>

      {/* Search & Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filters
          </CardTitle>
          <CardDescription>
            Search and filter audit logs with precision
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search description, actor, target, or action type..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  <SelectItem value="moderation">Moderation</SelectItem>
                  <SelectItem value="ticket">Ticket</SelectItem>
                  <SelectItem value="player">Player</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="transaction">Transaction</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Result Limit</Label>
              <Select
                value={limit.toString()}
                onValueChange={(val) => setLimit(parseInt(val))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 results</SelectItem>
                  <SelectItem value="100">100 results</SelectItem>
                  <SelectItem value="250">250 results</SelectItem>
                  <SelectItem value="500">500 results</SelectItem>
                  <SelectItem value="1000">1000 results</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCategory("");
                setActionType("");
                setSearchText("");
                setStartDate("");
                setEndDate("");
                setLimit(100);
              }}
            >
              Clear Filters
            </Button>
            <span className="text-sm text-muted-foreground self-center">
              Showing {logs.length} result(s)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Action Type Breakdown */}
      {stats.actionTypeCounts && Object.keys(stats.actionTypeCounts).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Action Type Breakdown (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.actionTypeCounts)
                .sort((a: any, b: any) => b[1] - a[1])
                .slice(0, 8)
                .map(([type, count]) => (
                  <div
                    key={type}
                    className="flex flex-col p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setActionType(type)}
                  >
                    <span className="text-xs text-muted-foreground truncate">
                      {type.replace(/_/g, " ")}
                    </span>
                    <span className="text-2xl font-bold">{count as number}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs ({logs.length})</CardTitle>
          <CardDescription>
            Detailed record of all system actions (auto-deleted after 3 days)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No audit logs match the current filters
            </p>
          ) : (
            <div className="space-y-3">
              {logs.map((log: any) => (
                <div
                  key={log._id}
                  className="border rounded-lg p-4 space-y-2 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(log.category)}
                        <span className="font-mono text-xs text-muted-foreground">
                          {log.actionType}
                        </span>
                      </div>
                      <p className="text-sm">{log.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getCategoryBadge(log.category)}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(log.timestamp)}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {log.actorName && (
                      <div>
                        <span className="font-medium">Actor:</span>{" "}
                        {log.actorName}
                        {log.actorRole && ` (${log.actorRole})`}
                      </div>
                    )}
                    {log.targetName && (
                      <div>
                        <span className="font-medium">Target:</span>{" "}
                        {log.targetName}
                      </div>
                    )}
                    {log.ipAddress && (
                      <div>
                        <span className="font-medium">IP:</span> {log.ipAddress}
                      </div>
                    )}
                  </div>

                  {log.metadata && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        View metadata
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                        {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
