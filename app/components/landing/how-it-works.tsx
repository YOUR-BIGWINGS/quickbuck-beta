"use client";

import { motion } from "motion/react";
import {
  UserPlus,
  TrendingUp,
  Building2,
  Trophy,
  ArrowRight,
} from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Sign Up & Start",
    description:
      "Create your account and receive starting capital to begin your trading journey.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: TrendingUp,
    title: "Trade Assets",
    description:
      "Buy and sell stocks and cryptocurrencies to grow your portfolio and maximize returns.",
    color: "from-emerald-500 to-green-500",
  },
  {
    icon: Building2,
    title: "Build Companies",
    description:
      "Create your own companies, list them on the stock market, and generate revenue through products.",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Trophy,
    title: "Compete & Win",
    description:
      "Climb the leaderboard rankings and prove you're the best trader in the game.",
    color: "from-yellow-500 to-orange-500",
  },
];

export const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-20 md:py-32 bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Four simple steps to start building your financial empire
          </p>
        </motion.div>

        <div className="relative">
          {/* Connection lines for desktop */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-yellow-500 opacity-20" />

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <StepCard key={step.title} step={step} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const StepCard = ({
  step,
  index,
}: {
  step: (typeof steps)[0];
  index: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.15, duration: 0.5 }}
      className="relative"
    >
      <div className="relative bg-background border rounded-2xl p-6 h-full">
        {/* Step number */}
        <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-background border-4 border-background flex items-center justify-center">
          <div
            className={`w-full h-full rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center text-white font-bold`}
          >
            {index + 1}
          </div>
        </div>

        {/* Icon */}
        <div className="mt-4 mb-6">
          <div
            className={`inline-flex p-4 rounded-xl bg-gradient-to-r ${step.color}`}
          >
            <step.icon className="h-8 w-8 text-white" />
          </div>
        </div>

        {/* Content */}
        <h3 className="font-semibold text-xl mb-3">{step.title}</h3>
        <p className="text-muted-foreground leading-relaxed">
          {step.description}
        </p>

        {/* Arrow for non-last items on desktop */}
        {index < steps.length - 1 && (
          <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 z-10">
            <div className="bg-background p-2 rounded-full border">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
