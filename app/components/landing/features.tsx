"use client";

import { motion } from "motion/react";
import {
  TrendingUp,
  Building2,
  Coins,
  Trophy,
  ShoppingCart,
  LineChart,
  Wallet,
  Users,
  Zap,
  Target,
  BarChart3,
  Briefcase,
} from "lucide-react";

const features = [
  {
    icon: TrendingUp,
    title: "Stock Trading",
    description:
      "Buy and sell shares of player-owned companies with real-time price movements and market dynamics.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Coins,
    title: "Cryptocurrency",
    description:
      "Trade digital currencies, create your own crypto, and ride the waves of volatile crypto markets.",
    gradient: "from-orange-500 to-yellow-500",
  },
  {
    icon: Building2,
    title: "Company Management",
    description:
      "Build and manage your own companies, create products, and watch your business empire grow.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: ShoppingCart,
    title: "Marketplace",
    description:
      "Buy and sell products from other companies in a dynamic player-driven economy.",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: LineChart,
    title: "Portfolio Analytics",
    description:
      "Track your investments with detailed charts, performance metrics, and asset allocation insights.",
    gradient: "from-indigo-500 to-blue-500",
  },
  {
    icon: Trophy,
    title: "Leaderboards",
    description:
      "Compete against players worldwide and climb the ranks to become the ultimate financial tycoon.",
    gradient: "from-yellow-500 to-orange-500",
  },
  {
    icon: Wallet,
    title: "Multi-Account System",
    description:
      "Manage personal and business accounts separately with seamless transfers between them.",
    gradient: "from-teal-500 to-green-500",
  },
  {
    icon: Briefcase,
    title: "Loans & Credit",
    description:
      "Access capital through the loan system to accelerate your growth and investments.",
    gradient: "from-red-500 to-pink-500",
  },
  {
    icon: Zap,
    title: "Real-Time Updates",
    description:
      "Markets update every 20 minutes with bot trading activity and dynamic price changes.",
    gradient: "from-violet-500 to-purple-500",
  },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Everything You Need to Dominate
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            A complete financial simulation with all the tools and features you
            need to build your empire
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

const FeatureCard = ({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -5 }}
      className="relative group"
    >
      <div
        className={`absolute -inset-0.5 bg-gradient-to-r ${feature.gradient} rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-300`}
      />
      <div className="relative bg-background border rounded-2xl p-6 h-full">
        <div
          className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.gradient} mb-4`}
        >
          <feature.icon className="h-6 w-6 text-white" />
        </div>
        <h3 className="font-semibold text-xl mb-2">{feature.title}</h3>
        <p className="text-muted-foreground leading-relaxed">
          {feature.description}
        </p>
      </div>
    </motion.div>
  );
};
