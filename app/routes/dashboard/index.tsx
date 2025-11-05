"use client";

import { useAuth } from "@clerk/react-router";
import { useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { api } from "convex/_generated/api";
import { CountdownTimer } from "~/components/dashboard/countdown-timer";
import { usePlayerData } from "~/hooks/use-player-data";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Link } from "react-router";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  PieChart,
  Activity,
  Building2,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  BarChart3,
} from "lucide-react";
import { AnimatedNumber } from "~/components/ui/animated-number";
import { formatCompactCurrency, formatCurrency } from "~/lib/game-utils";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

const cardHoverVariants = {
  hover: {
    scale: 1.02,
    transition: {
      duration: 0.2,
      ease: "easeInOut",
    },
  },
};

export default function DashboardPage() {
  const { userId } = useAuth();
  const {
    player,
    balance,
    netWorth,
    stocksValue,
    cryptoValue,
    companyEquity,
    transactions,
    isLoading,
  } = usePlayerData(userId || null);

  const lastTick = useQuery(api.tick.getLastTick);
  const lastTickTime = lastTick?.timestamp;

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="flex flex-1 flex-col" />;
  }

  const totalAssets = balance + stocksValue + cryptoValue + companyEquity;
  const portfolio = stocksValue + cryptoValue + companyEquity;
  const liquidityRatio = totalAssets > 0 ? (balance / totalAssets) * 100 : 0;
  const portfolioGrowth = 12.5; // Mock growth percentage
  const isPositiveGrowth = portfolioGrowth >= 0;

  const quickStats = [
    {
      label: "Total Balance",
      value: balance,
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/50",
      change: "+2.4%",
      isPositive: true,
    },
    {
      label: "Net Worth",
      value: netWorth,
      icon: TrendingUp,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/50",
      change: `${isPositiveGrowth ? "+" : ""}${portfolioGrowth.toFixed(1)}%`,
      isPositive: isPositiveGrowth,
    },
    {
      label: "Portfolio Value",
      value: portfolio,
      icon: Wallet,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/50",
      change: "+8.1%",
      isPositive: true,
    },
    {
      label: "Liquidity Ratio",
      value: liquidityRatio,
      icon: Activity,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/50",
      change: "-1.2%",
      isPositive: false,
      isPercentage: true,
    },
  ];

  const portfolioBreakdown = [
    {
      label: "Cash",
      value: balance,
      color: "bg-emerald-500",
      percentage: totalAssets > 0 ? (balance / totalAssets) * 100 : 0,
    },
    {
      label: "Stocks",
      value: stocksValue,
      color: "bg-blue-500",
      percentage: totalAssets > 0 ? (stocksValue / totalAssets) * 100 : 0,
    },
    {
      label: "Crypto",
      value: cryptoValue,
      color: "bg-purple-500",
      percentage: totalAssets > 0 ? (cryptoValue / totalAssets) * 100 : 0,
    },
    {
      label: "Companies",
      value: companyEquity,
      color: "bg-orange-500",
      percentage: totalAssets > 0 ? (companyEquity / totalAssets) * 100 : 0,
    },
  ].filter((item) => item.value > 0);

  const quickActions = [
    {
      title: "Trade Stocks",
      description: "Buy and sell company stocks",
      icon: TrendingUp,
      href: "/stocks",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/50",
    },
    {
      title: "Manage Companies",
      description: "Create and manage your companies",
      icon: Building2,
      href: "/companies",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/50",
    },
    {
      title: "Browse Marketplace",
      description: "Shop for products and services",
      icon: ShoppingCart,
      href: "/marketplace",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/50",
    },
    {
      title: "View Portfolio",
      description: "Track your financial performance",
      icon: BarChart3,
      href: "/portfolio",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/50",
    },
  ];

  const recentTransactions = transactions?.slice(0, 5) || [];

  return (
    <motion.div
      className="flex flex-1 flex-col"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="@container/main flex flex-1 flex-col">
        <div className="flex flex-col gap-6 p-6">
          {/* Hero Section */}
          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#FF934F] to-[#EF7176] text-white shadow-2xl dark:from-[#FF934F] dark:to-[#EF7176]">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent dark:from-black/20 dark:via-black/10 dark:to-transparent" />
              <div className="absolute -right-32 -top-32 h-64 w-64 rounded-full bg-white/20 blur-3xl dark:bg-black/30" />
              <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-white/20 blur-3xl dark:bg-black/30" />

              <CardContent className="relative z-10 p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-4">
                    <div>
                      <h1 className="text-sm font-medium text-white/70">
                        Total Net Worth
                      </h1>
                      <div className="text-4xl font-bold tracking-tight lg:text-5xl">
                        <AnimatedNumber
                          value={netWorth}
                          compact={true}
                          isCents={true}
                          className="text-white"
                        />
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <span className="text-white/70">Cash Available:</span>
                        <span className="font-semibold text-white">
                          {formatCurrency(balance)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                    <Link to="/stocks">
                      <Button className="w-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm">
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Trade Now
                      </Button>
                    </Link>
                    <Link to="/companies">
                      <Button
                        variant="outline"
                        className="w-full border-white/20 bg-transparent text-white hover:bg-white/10"
                      >
                        <Building2 className="mr-2 h-4 w-4" />
                        Manage Companies
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats Grid */}
          <motion.div variants={itemVariants}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {quickStats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    variants={cardHoverVariants}
                    whileHover="hover"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="relative overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              {stat.label}
                            </p>
                            <div className="text-2xl font-bold">
                              {stat.isPercentage ? (
                                <span>{stat.value.toFixed(1)}%</span>
                              ) : (
                                <AnimatedNumber
                                  value={stat.value}
                                  compact={true}
                                  isCents={true}
                                />
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs">
                              {stat.isPositive ? (
                                <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <ArrowDownRight className="h-3 w-3 text-red-600" />
                              )}
                              <span
                                className={
                                  stat.isPositive
                                    ? "text-emerald-600"
                                    : "text-red-600"
                                }
                              >
                                {stat.change}
                              </span>
                            </div>
                          </div>
                          <div className={`rounded-full p-3 ${stat.bgColor}`}>
                            <Icon className={`h-6 w-6 ${stat.color}`} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Portfolio Breakdown & Timer */}
          <div className="grid gap-6 lg:grid-cols-3">
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Portfolio Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex h-4 overflow-hidden rounded-full bg-muted">
                    {portfolioBreakdown.map((item, index) => (
                      <motion.div
                        key={item.label}
                        className={item.color}
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percentage}%` }}
                        transition={{
                          delay: index * 0.2,
                          duration: 0.8,
                          ease: "easeOut",
                        }}
                      />
                    ))}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {portfolioBreakdown.map((item, index) => (
                      <motion.div
                        key={item.label}
                        className="flex items-center justify-between rounded-lg border p-3"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-3 w-3 rounded-full ${item.color}`}
                          />
                          <span className="font-medium">{item.label}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            <AnimatedNumber
                              value={item.value}
                              compact={true}
                              isCents={true}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.percentage.toFixed(1)}%
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <CountdownTimer lastTickTime={lastTickTime} />
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {quickActions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <motion.div
                        key={action.href}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Link to={action.href}>
                          <Card className="h-full cursor-pointer transition-all hover:shadow-md">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div
                                  className={`inline-flex rounded-lg p-2 ${action.bgColor}`}
                                >
                                  <Icon className={`h-5 w-5 ${action.color}`} />
                                </div>
                                <div>
                                  <h3 className="font-semibold">
                                    {action.title}
                                  </h3>
                                  <p className="text-xs text-muted-foreground">
                                    {action.description}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Transactions */}
          {recentTransactions.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                  <Link to="/dashboard/transactions">
                    <Button variant="outline" size="sm">
                      View All
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentTransactions.map((transaction, index) => (
                      <motion.div
                        key={transaction._id}
                        className="flex items-center justify-between rounded-lg border p-3"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`rounded-full p-2 ${
                              transaction.amount > 0
                                ? "bg-emerald-50 dark:bg-emerald-950/50"
                                : "bg-red-50 dark:bg-red-950/50"
                            }`}
                          >
                            {transaction.amount > 0 ? (
                              <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {transaction.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(
                                transaction._creationTime
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`font-semibold ${
                            transaction.amount > 0
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          <AnimatedNumber
                            value={Math.abs(transaction.amount)}
                            compact={true}
                            isCents={true}
                            prefix={transaction.amount > 0 ? "+" : "-"}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
