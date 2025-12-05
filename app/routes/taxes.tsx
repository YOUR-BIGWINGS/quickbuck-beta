"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useAuth } from "@clerk/react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { AlertTriangle, TrendingDown, Shield, DollarSign, Receipt, History } from "lucide-react";
import { toast } from "sonner";

export default function TaxesRoute() {
  const { isSignedIn } = useAuth();
  // @ts-ignore - API will be generated after convex dev runs
  const currentPlayer = useQuery(api.moderation?.getCurrentPlayer);
  // @ts-ignore - taxes API will be generated after convex dev runs
  const taxStats = useQuery(
    api.taxes?.getPlayerTaxStats,
    currentPlayer ? { playerId: currentPlayer._id } : "skip"
  );
  // @ts-ignore - taxes API will be generated after convex dev runs
  const evasionStatus = useQuery(
    api.taxes?.isEvadingTaxes,
    currentPlayer ? { playerId: currentPlayer._id } : "skip"
  );
  // @ts-ignore - taxes API will be generated after convex dev runs
  const taxHistory = useQuery(
    api.taxes?.getRecentTaxHistory,
    currentPlayer ? { playerId: currentPlayer._id, limit: 20 } : "skip"
  );
  // @ts-ignore - taxes API will be generated after convex dev runs
  const taxTiers = useQuery(api.taxes?.getTaxTiers);

  // @ts-ignore - taxes API will be generated after convex dev runs
  const attemptEvasion = useMutation(api.taxes?.attemptTaxEvasion);
  const [isAttempting, setIsAttempting] = useState(false);

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = Math.abs(now - timestamp);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    return "just now";
  };

  const handleAttemptEvasion = async () => {
    if (!currentPlayer) return;

    setIsAttempting(true);
    try {
      const result = await attemptEvasion({ playerId: currentPlayer._id });
      
      if (result.success) {
        toast.success("Tax Evasion Successful!", {
          description: result.message,
        });
      } else {
        toast.error("Caught Evading Taxes!", {
          description: result.message,
        });
      }
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "Failed to attempt tax evasion",
      });
    } finally {
      setIsAttempting(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (!isSignedIn) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <h1 className="text-4xl font-bold">Tax System</h1>
          <p className="text-muted-foreground text-center max-w-md">
            Sign in to view your tax information and manage your tax obligations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold flex items-center gap-2">
              <Receipt className="w-8 h-8" />
              Tax System
            </h1>
            <p className="text-muted-foreground">
              Manage your taxes, view your tax obligations, and attempt to evade taxes.
            </p>
          </div>

          {/* Tax Evasion Status */}
          {evasionStatus?.isEvading && (
            <Card className="border-green-500 bg-green-50 dark:bg-green-950">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                  <Shield className="h-5 w-5 text-green-600" />
                  <p className="font-medium">
                    You are currently evading taxes! Tax-free until{" "}
                    {evasionStatus.evadingUntil
                      ? formatRelativeTime(evasionStatus.evadingUntil)
                      : "unknown"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tax Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Taxes Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(taxStats?.totalTaxesPaid || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Transaction Taxes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(taxStats?.totalTransactionTax || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {taxStats?.transactionTaxCount || 0} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Wealth Taxes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(taxStats?.totalWealthTax || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {taxStats?.wealthTaxCount || 0} collections
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Evasion Fines</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {formatCurrency(taxStats?.totalFines || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{taxStats?.fineCount || 0} fines</p>
              </CardContent>
            </Card>
          </div>

          {/* Current Tax Bracket */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Your Current Tax Bracket
              </CardTitle>
              <CardDescription>Based on your current net worth</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Net Worth:</span>
                  <span className="font-bold">{formatCurrency(taxStats?.netWorth || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Daily Tax Rate:</span>
                  <span className="font-bold text-destructive">
                    {((taxStats?.currentTaxBracket.rate || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Daily Tax Amount:</span>
                  <span className="font-bold text-destructive">
                    {formatCurrency(taxStats?.currentTaxBracket.dailyTax || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tax Evasion Card */}
          <Card className="border-yellow-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Tax Evasion
              </CardTitle>
              <CardDescription>
                Attempt to evade taxes with a 60% success rate. If caught, you'll pay a 50% net worth fine.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold text-green-600">60%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Catch Rate</p>
                  <p className="text-2xl font-bold text-destructive">40%</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Successful Evasions:</span>
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-950">
                    {evasionStatus?.successfulEvasions || 0}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Times Caught:</span>
                  <Badge variant="outline" className="bg-red-50 dark:bg-red-950">
                    {evasionStatus?.failedEvasions || 0}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm">
                    <strong>If successful:</strong> You won't pay any taxes for 1 week.
                    <br />
                    <strong>If caught:</strong> You'll pay a fine of{" "}
                    {formatCurrency(Math.floor((taxStats?.netWorth || 0) * 0.5))} (50% of your net worth).
                  </p>
                </div>

                <Button
                  className="w-full"
                  variant={evasionStatus?.isEvading ? "outline" : "default"}
                  disabled={evasionStatus?.isEvading || isAttempting || !currentPlayer}
                  onClick={handleAttemptEvasion}
                >
                  {evasionStatus?.isEvading
                    ? "Already Evading Taxes"
                    : isAttempting
                      ? "Attempting..."
                      : "Attempt Tax Evasion"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tax Tiers Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Tax Rate Tiers
              </CardTitle>
              <CardDescription>Daily wealth tax rates based on net worth</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {taxTiers?.map((tier: any, index: number) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm">
                      {formatCurrency(tier.min)} - {tier.max === "∞" ? "∞" : formatCurrency(Number(tier.max))}
                    </span>
                    <Badge variant="secondary">{tier.ratePercent} daily</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tax History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Recent Tax History
              </CardTitle>
              <CardDescription>Your last 20 tax payments</CardDescription>
            </CardHeader>
            <CardContent>
              {!taxHistory || taxHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No tax history yet</p>
              ) : (
                <div className="space-y-2">
                  {taxHistory.map((tax: any) => (
                    <div
                      key={tax._id}
                      className="flex justify-between items-center p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{tax.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(tax.timestamp)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-bold ${
                            tax.taxType === "evasion_fine" ? "text-destructive" : "text-foreground"
                          }`}
                        >
                          -{formatCurrency(tax.amount)}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {tax.taxType === "transaction"
                            ? "Transaction"
                            : tax.taxType === "wealth"
                              ? "Wealth"
                              : "Fine"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
    </div>
  );
}
