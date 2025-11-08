"use client";

import { motion } from "motion/react";
import { useEffect, useState, useRef } from "react";
import React from "react";
import { Users, TrendingUp, Building2, Coins } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";

export const StatsSection = () => {
  const [mounted, setMounted] = useState(false);
  
  // Fetch real-time game stats
  const gameStats = useQuery(api.gameStats.getGameStats);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Convert market cap from cents to millions
  const marketCapInMillions = gameStats?.totalMarketCap 
    ? (gameStats.totalMarketCap / 100 / 1_000_000).toFixed(1) 
    : 0;

  const stats = [
    {
      label: "Active Players",
      value: gameStats?.activePlayers ?? 0,
      icon: Users,
      suffix: "+",
    },
    {
      label: "Total Trades",
      value: gameStats?.totalTrades ?? 0,
      icon: TrendingUp,
      suffix: "+",
    },
    {
      label: "Companies Listed",
      value: gameStats?.totalCompanies ?? 0,
      icon: Building2,
      suffix: "",
    },
    {
      label: "Market Cap",
      value: parseFloat(marketCapInMillions as string),
      icon: Coins,
      prefix: "$",
      suffix: "M",
    },
  ];

  return (
    <section className="py-16 md:py-24 border-y bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Join the Growing Community
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Thousands of players are already building their financial empires
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <StatCard
              key={stat.label}
              stat={stat}
              index={index}
              mounted={mounted}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

interface StatItem {
  label: string;
  value: number;
  icon: any;
  suffix?: string;
  prefix?: string;
}

const StatCard = ({
  stat,
  index,
  mounted,
}: {
  stat: StatItem;
  index: number;
  mounted: boolean;
}) => {
  const ref = useRef<any>(null);

  useEffect(() => {
    if (!mounted || !ref.current) return;

    const el = ref.current;

    // Set attributes using setAttribute for read-only properties
    el.setAttribute("trend", "0");
    el.setAttribute("locales", "en-US");

    // Set format as an object property
    el.format = {
      minimumFractionDigits: 0,
      maximumFractionDigits: stat.label === "Market Cap" ? 1 : 0,
    };

    // Use setAttribute for prefix and suffix since they are read-only
    if (stat.prefix) {
      el.setAttribute("prefix", stat.prefix);
    }
    if (stat.suffix) {
      el.setAttribute("suffix", stat.suffix);
    }
  }, [mounted, stat.prefix, stat.suffix, stat.label]);

  useEffect(() => {
    if (!mounted || !ref.current) return;

    const el = ref.current;
    if (typeof el.update === "function") {
      el.update(stat.value);
    }
  }, [stat.value, mounted]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="relative group"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-300" />
      <div className="relative bg-background border rounded-2xl p-6 text-center h-full flex flex-col items-center justify-center">
        <stat.icon className="h-8 w-8 text-emerald-500 mb-3" />
        <div className="text-3xl font-bold mb-1">
          {mounted ? (
            React.createElement("number-flow", {
              ref,
              trend: 0,
              locales: "en-US",
              suppressHydrationWarning: true,
            } as any)
          ) : (
            <span>0</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{stat.label}</p>
      </div>
    </motion.div>
  );
};
