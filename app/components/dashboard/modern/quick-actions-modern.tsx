"use client";

import { motion } from "motion/react";
import { Building2, ShoppingCart, TrendingUp, Wallet } from "lucide-react";
import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

export function QuickActionsModern() {
  const actions = [
    {
      title: "Manage Companies",
      description: "Create and manage your companies",
      icon: Building2,
      href: "/companies",
    },
    {
      title: "Browse Marketplace",
      description: "Shop for products",
      icon: ShoppingCart,
      href: "/marketplace",
    },
    {
      title: "Trade Stocks",
      description: "Buy and sell company stocks",
      icon: TrendingUp,
      href: "/stocks",
    },
    {
      title: "View Accounts",
      description: "Manage your accounts",
      icon: Wallet,
      href: "/accounts",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((a, i) => {
            const Icon = a.icon;
            return (
              <motion.div
                key={a.href}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * i }}
              >
                <Link to={a.href} className="block">
                  <Button
                    variant="outline"
                    className="h-auto w-full flex-col items-start gap-2 p-4 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-muted p-2 text-muted-foreground">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="font-semibold">{a.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {a.description}
                    </span>
                  </Button>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
