"use client";

import { motion } from "motion/react";
import { DollarSign, TrendingUp, Wallet } from "lucide-react";
import { AnimatedNumber } from "~/components/ui/animated-number";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

type StatsCardsProps = {
  balance: number;
  netWorth: number;
};

export function StatsCards({ balance, netWorth }: StatsCardsProps) {
  const portfolio = Math.max(0, netWorth - balance);

  const cards = [
    {
      label: "Cash",
      icon: DollarSign,
      value: balance,
    },
    {
      label: "Net Worth",
      icon: TrendingUp,
      value: netWorth,
    },
    {
      label: "Portfolio",
      icon: Wallet,
      value: portfolio,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.05 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{c.label}</CardTitle>
                <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  <AnimatedNumber
                    value={c.value}
                    compact={false}
                    isCents={true}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
