"use client";

import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { formatCompactCurrency } from "~/lib/game-utils";

type Props = {
  cash: number;
  stocksValue: number;
  cryptoValue: number;
  companyEquity: number;
  isLoading?: boolean;
};

export function NetWorthBreakdownModern({
  cash,
  stocksValue,
  cryptoValue,
  companyEquity,
  isLoading,
}: Props) {
  const total = Math.max(0, cash + stocksValue + cryptoValue + companyEquity);
  const components = [
    { label: "Cash", value: cash, color: "bg-emerald-500" },
    { label: "Stocks", value: stocksValue, color: "bg-indigo-500" },
    { label: "Crypto", value: cryptoValue, color: "bg-purple-500" },
    { label: "Equity", value: companyEquity, color: "bg-amber-500" },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Net Worth Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Horizontal Stacked Bar Skeleton */}
          <Skeleton className="h-10 w-full rounded-md" />

          {/* Legend Skeletons */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-3 w-3 rounded-sm" />
                <div className="min-w-0 space-y-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Net Worth Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex h-10 w-full items-stretch overflow-hidden rounded-md border">
          {components.map((c) => {
            const pct = total > 0 ? (c.value / total) * 100 : 0;
            return pct > 0 ? (
              <motion.div
                key={c.label}
                className={`${c.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                title={`${c.label}: ${formatCompactCurrency(c.value)}`}
              />
            ) : null;
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {components.map((c) => {
            const pct = total > 0 ? (c.value / total) * 100 : 0;
            return (
              <div key={c.label} className="flex items-center gap-3">
                <span className={`h-3 w-3 rounded-sm ${c.color}`} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{c.label}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {formatCompactCurrency(c.value)} ({pct.toFixed(1)}%)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
