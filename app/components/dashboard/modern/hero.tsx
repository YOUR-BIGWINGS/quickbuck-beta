"use client";

import { motion } from "motion/react";
import { AnimatedNumber } from "~/components/ui/animated-number";
import { Button } from "~/components/ui/button";
import { Link } from "react-router";
import { TrendingUp, Coins } from "lucide-react";

type HeroProps = {
  balance: number;
  netWorth: number;
  lastTickTime?: number;
};

export function DashboardHero({ balance, netWorth }: HeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 px-6 py-12 text-white shadow-2xl md:px-8 md:py-14">
      {/* Animated background gradients */}
      <div className="pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_20%,transparent_70%)]">
        <motion.div
          className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl"
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_60%_60%_at_100%_100%,#000_20%,transparent_70%)]">
        <motion.div
          className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl"
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 6, repeat: Infinity, delay: 1 }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <motion.div
          className="flex-1"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.p
            className="mb-2 text-sm font-medium text-zinc-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            Total Net Worth
          </motion.p>
          <motion.div
            className="mb-4 text-5xl font-bold tracking-tight md:text-6xl"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <AnimatedNumber value={netWorth} compact={false} isCents={true} />
          </motion.div>
          <motion.div
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <p className="text-sm text-zinc-300">Cash on hand:</p>
            <span className="font-semibold text-zinc-100">
              <AnimatedNumber value={balance} isCents={true} compact={true} />
            </span>
          </motion.div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          className="flex gap-3 flex-col sm:flex-row"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <Link to="/companies">
            <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white">
              <TrendingUp className="mr-2 h-4 w-4" />
              Manage Companies
            </Button>
          </Link>
          <Link to="/portfolio">
            <Button
              variant="outline"
              className="w-full sm:w-auto border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              <Coins className="mr-2 h-4 w-4" />
              View Portfolio
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
