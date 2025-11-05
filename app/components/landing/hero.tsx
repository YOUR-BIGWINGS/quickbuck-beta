"use client";

import { motion } from "motion/react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { TrendingUp, Zap, Trophy } from "lucide-react";

export const HeroSection = ({ isSignedIn }: { isSignedIn: boolean }) => {
  return (
    <section
      id="hero"
      className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-32"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-blue-500/10 to-purple-500/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.1),rgba(0,0,0,0))]" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border bg-background/50 backdrop-blur-sm px-4 py-2 text-sm"
          >
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-muted-foreground">
              Real-time market simulation
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl"
          >
            Play the Markets.
            <br />
            <span className="bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              Build Your Empire.
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto"
          >
            Trade stocks and crypto, manage companies, and compete against
            players worldwide. Master the markets and climb to the top of the
            leaderboard in this real-time financial simulation game.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button size="lg" asChild className="w-full sm:w-auto">
              <Link
                to={isSignedIn ? "/dashboard" : "/sign-up"}
                prefetch="viewport"
              >
                <TrendingUp className="h-5 w-5 mr-2" />
                {isSignedIn ? "Go to Dashboard" : "Start Playing"}
              </Link>
            </Button>
            {isSignedIn && (
              <Button
                size="lg"
                variant="outline"
                asChild
                className="w-full sm:w-auto"
              >
                <Link to="/leaderboard" prefetch="viewport">
                  <Trophy className="h-5 w-5 mr-2" />
                  View Leaderboard
                </Link>
              </Button>
            )}
          </motion.div>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-3 max-w-4xl mx-auto"
        >
          <FeatureCard
            icon={<TrendingUp className="h-6 w-6" />}
            title="Live Markets"
            description="Real-time price updates every 20 minutes"
          />
          <FeatureCard
            icon={<Trophy className="h-6 w-6" />}
            title="Compete"
            description="Climb the global leaderboard rankings"
          />
          <FeatureCard
            icon={<Zap className="h-6 w-6" />}
            title="Build"
            description="Create and manage your own companies"
          />
        </motion.div>
      </div>
    </section>
  );
};

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
      className="relative group"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-300" />
      <div className="relative bg-background border rounded-2xl p-6 h-full">
        <div className="text-emerald-500 mb-3">{icon}</div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  );
};
