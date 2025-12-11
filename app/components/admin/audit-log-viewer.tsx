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

  if (logs === undefined || stats === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading</CardTitle>
          <CardDescription>Please wait...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Actions (7d)</CardDescription>
            <CardTitle className="text-3xl">{stats.totalActions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Moderation</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {stats.categoryCounts?.moderation || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Tickets</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {stats.categoryCounts?.ticket || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Admin</CardDescription>
            <CardTitle className="text-3xl text-orange-600">
              {stats.categoryCounts?.admin || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search descriptions..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Limit</Label>
              <Select value={limit.toString()} onValueChange={(v) => setLimit(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 entries</SelectItem>
                  <SelectItem value="100">100 entries</SelectItem>
                  <SelectItem value="200">200 entries</SelectItem>
                  <SelectItem value="500">500 entries</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Logs ({logs.length})</CardTitle>
          <CardDescription>Recent system actions and events</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No logs found
            </p>
          ) : (
            <div className="space-y-2">
              {logs.map((log: any) => (
                <div
                  key={log._id}
                  className="border rounded-lg p-3 space-y-2 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(log.category)}
                      {getCategoryBadge(log.category)}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(log.timestamp)}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {log.actionType}
                    </Badge>
                  </div>
                  
                  <p className="text-sm">{log.description}</p>
                  
                  {(log.actorName || log.targetName) && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {log.actorName && (
                        <span>
                          <span className="font-medium">Actor:</span> {log.actorName}
                          {log.actorRole && ` (${log.actorRole})`}
                        </span>
                      )}
                      {log.targetName && (
                        <span>
                          <span className="font-medium">Target:</span> {log.targetName}
                        </span>
                      )}
                    </div>
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
