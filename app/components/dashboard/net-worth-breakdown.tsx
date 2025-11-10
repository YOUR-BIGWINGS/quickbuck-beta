"use client";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { formatCurrency, formatCompactCurrency } from "~/lib/game-utils";

interface NetWorthBreakdownProps {
  cash: number;
  stocksValue: number;
  cryptoValue: number;
  companyEquity: number;
  isLoading?: boolean;
}

export function NetWorthBreakdown({
  cash,
  stocksValue,
  cryptoValue,
  companyEquity,
  isLoading,
}: NetWorthBreakdownProps) {
  const total = cash + stocksValue + cryptoValue + companyEquity;

  const components = [
    {
      label: "Cash",
      value: cash,
      color: "bg-[var(--chart-2)]",
      percentage: total > 0 ? (cash / total) * 100 : 0,
    },
    {
      label: "Stocks",
      value: stocksValue,
      color: "bg-[var(--chart-1)]",
      percentage: total > 0 ? (stocksValue / total) * 100 : 0,
    },
    {
      label: "Crypto",
      value: cryptoValue,
      color: "bg-[var(--chart-5)]",
      percentage: total > 0 ? (cryptoValue / total) * 100 : 0,
    },
    {
      label: "Company Equity",
      value: companyEquity,
      color: "bg-[var(--chart-3)]",
      percentage: total > 0 ? (companyEquity / total) * 100 : 0,
    },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Net Worth Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Horizontal Stacked Bar Skeleton */}
          <Skeleton className="h-8 w-full rounded-md" />

          {/* Legend Skeletons */}
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-sm" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>

          {/* Total Skeleton */}
          <div className="border-t pt-4">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
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
      <CardContent className="space-y-4">
        {/* Horizontal Stacked Bar */}
        <div className="flex h-8 w-full overflow-hidden rounded-md">
          {components.map((component) =>
            component.percentage > 0 ? (
              <div
                key={component.label}
                className={component.color}
                style={{ width: `${component.percentage}%` }}
                title={`${component.label}: ${formatCurrency(component.value)}`}
              />
            ) : null
          )}
        </div>

        {/* Legend with values */}
        <div className="grid grid-cols-2 gap-4">
          {components.map((component) => (
            <div key={component.label} className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-sm ${component.color}`} />
              <div className="flex-1">
                <div className="text-sm font-medium">{component.label}</div>
                <div className="text-xs text-muted-foreground">
                  {formatCompactCurrency(component.value)} (
                  {component.percentage.toFixed(1)}%)
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="border-t pt-4">
          <div className="flex justify-between text-sm font-semibold">
            <span>Total Net Worth</span>
            <span>{formatCompactCurrency(total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
