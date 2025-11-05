"use client";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { formatCurrency, formatCompactCurrency } from "~/lib/game-utils";
import { TrendingUp } from "lucide-react";

interface TopPlayer {
  _id: string;
  balance: number;
  netWorth: number;
  userName: string;
}

interface TopPlayersProps {
  title: string;
  players: TopPlayer[] | undefined;
  sortBy: "balance" | "netWorth";
  isLoading?: boolean;
}

export function TopPlayersCard({
  title,
  players,
  sortBy,
  isLoading,
}: TopPlayersProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!players || players.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No players yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {players.slice(0, 5).map((player, index) => (
            <div
              key={player._id}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="w-6 text-center">
                  {index + 1}
                </Badge>
                <span className="font-medium">{player.userName}</span>
              </div>
              <span className="text-muted-foreground">
                {sortBy === "balance"
                  ? formatCompactCurrency(player.balance)
                  : formatCompactCurrency(player.netWorth)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
