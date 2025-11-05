"use client";

import { motion } from "motion/react";
import { Activity, PieChart, ShieldCheck } from "lucide-react";
import { formatCompactCurrency, formatCurrency } from "~/lib/game-utils";

type InsightsProps = {
  cash: number;
  stocksValue: number;
  cryptoValue: number;
  companyEquity: number;
  netWorth: number;
};

export function Insights({
  cash,
  stocksValue,
  cryptoValue,
  companyEquity,
  netWorth,
}: InsightsProps) {
  const total = Math.max(0, cash + stocksValue + cryptoValue + companyEquity);
  const liquidity = total > 0 ? Math.round((cash / total) * 100) : 0;
  const volatile =
    total > 0 ? Math.round(((stocksValue + cryptoValue) / total) * 100) : 0;
  const diversification = [
    cash,
    stocksValue,
    cryptoValue,
    companyEquity,
  ].filter((v) => v > 0).length;

  const items = [
    {
      title: "Liquidity",
      value: `${liquidity}% in cash`,
      sub: `Cash ${formatCompactCurrency(cash)} of ${formatCompactCurrency(
        total
      )}`,
      icon: Activity,
    },
    {
      title: "Volatility Exposure",
      value: `${volatile}% in markets`,
      sub: `${formatCompactCurrency(
        stocksValue + cryptoValue
      )} in stocks & crypto`,
      icon: ShieldCheck,
    },
    {
      title: "Diversification",
      value: `${diversification} asset classes`,
      sub: `Cash, Stocks, Crypto, Equity`,
      icon: PieChart,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it, i) => {
        const Icon = it.icon;
        return (
          <motion.div
            key={it.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.04 }}
            className="rounded-xl border bg-card p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm text-muted-foreground">{it.title}</div>
                <div className="truncate text-lg font-semibold">{it.value}</div>
                <div className="text-xs text-muted-foreground">{it.sub}</div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
