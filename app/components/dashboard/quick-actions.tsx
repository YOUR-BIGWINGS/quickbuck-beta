"use client";

import { Building2, ShoppingCart, TrendingUp, Wallet } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export function QuickActions() {
  const actions = [
    {
      title: "Manage Companies",
      description: "Create and manage your companies",
      icon: Building2,
      href: "/companies",
      color: "text-[var(--chart-1)]",
    },
    {
      title: "Browse Marketplace",
      description: "Shop for products",
      icon: ShoppingCart,
      href: "/marketplace",
      color: "text-[var(--chart-2)]",
    },
    {
      title: "Trade Stocks",
      description: "Buy and sell company stocks",
      icon: TrendingUp,
      href: "/stocks",
      color: "text-[var(--chart-5)]",
    },
    {
      title: "View Accounts",
      description: "Manage your accounts",
      icon: Wallet,
      href: "/accounts",
      color: "text-[var(--chart-3)]",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} to={action.href}>
                <Button
                  variant="outline"
                  className="h-auto w-full flex-col items-start gap-2 p-4 text-left"
                >
                  <Icon className={`h-6 w-6 ${action.color}`} />
                  <div>
                    <div className="font-semibold">{action.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {action.description}
                    </div>
                  </div>
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
