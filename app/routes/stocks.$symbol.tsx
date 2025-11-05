"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { PriceChart } from "~/components/price-chart";
import { OwnershipDistributionChart } from "~/components/ownership-distribution-chart";
import { formatCurrency } from "~/lib/game-utils";
import {
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Building2,
  Wallet,
  DollarSign,
  Users,
} from "lucide-react";
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect, Link, useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import type { Route } from "./+types/stocks.$symbol";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    throw redirect("/sign-in");
  }
  return {};
}

// Helper function to get sector color
function getSectorColor(sector: string): string {
  const colors: Record<string, string> = {
    tech: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    energy: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    finance: "bg-green-500/10 text-green-500 border-green-500/20",
    healthcare: "bg-red-500/10 text-red-500 border-red-500/20",
    consumer: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    other: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };
  return colors[sector] || colors.other;
}

export default function StockDetailPage() {
  const { symbol } = useParams();
  const navigate = useNavigate();

  // Queries
  const allStocks = useQuery(api.stocks.getAllStocks);
  const myPortfolio = useQuery(api.stocks.getPlayerPortfolio);
  const currentPlayer = useQuery(api.moderation.getCurrentPlayer);
  const myCompanies = useQuery(
    api.companies.getPlayerCompanies,
    currentPlayer?._id ? { playerId: currentPlayer._id } : "skip"
  );

  // Find the stock first to get its ID
  const stock = allStocks?.find((s) => s.symbol === symbol);

  // Query ownership data for this stock
  const ownershipData = useQuery(
    api.stocks.getStockOwnership,
    stock?._id ? { stockId: stock._id } : "skip"
  );

  // Mutations
  const buyStock = useMutation(api.stocks.buyStock);
  const sellStock = useMutation(api.stocks.sellStock);
  const buyStockForCompany = useMutation(api.stocks.buyStockForCompany);
  const sellStockForCompany = useMutation(api.stocks.sellStockForCompany);

  // State
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [purchaseMode, setPurchaseMode] = useState<"shares" | "dollars">(
    "shares"
  );
  const [ownerType, setOwnerType] = useState<"player" | "company">("player");
  const [tradeAmount, setTradeAmount] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string>("");

  // Find holding for current player by comparing stock IDs (more reliable than symbol)
  const holding = myPortfolio?.find((p) => p.stockId === stock?._id);

  if (!stock) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <Building2 className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-2xl font-bold">Stock Not Found</h2>
        <p className="text-muted-foreground">
          The stock symbol "{symbol}" does not exist.
        </p>
        <Link to="/stocks">
          <Button className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Stocks
          </Button>
        </Link>
      </div>
    );
  }

  const priceChange = (stock.lastPriceChange ?? 0) * 100;
  const isPositive = priceChange >= 0;

  const handleTrade = async () => {
    if (!tradeAmount || !stock) return;

    // Validate company selection if trading as company
    if (ownerType === "company" && !selectedCompany) {
      toast.error("Please select a company");
      return;
    }

    try {
      let shares = 0;

      if (purchaseMode === "shares") {
        shares = parseInt(tradeAmount);
        if (isNaN(shares) || shares <= 0) {
          toast.error("Please enter a valid number of shares");
          return;
        }
      } else {
        // Dollar amount - calculate shares
        const dollarAmount = parseFloat(tradeAmount);
        if (isNaN(dollarAmount) || dollarAmount <= 0) {
          toast.error("Please enter a valid dollar amount");
          return;
        }
        // Convert dollars to cents, then divide by price per share in cents
        const centAmount = Math.round(dollarAmount * 100);
        const pricePerShare = stock.currentPrice ?? 1;
        shares = Math.floor(centAmount / pricePerShare);

        if (shares === 0) {
          toast.error(
            "Dollar amount too small to buy shares. Minimum purchase with current price."
          );
          return;
        }
      }

      if (ownerType === "company") {
        // Trading as company
        if (tradeType === "buy") {
          await buyStockForCompany({
            companyId: selectedCompany as any,
            stockId: stock._id,
            shares,
          });
          toast.success(`Company bought ${shares} shares of ${stock.symbol}`);
        } else {
          await sellStockForCompany({
            companyId: selectedCompany as any,
            stockId: stock._id,
            shares,
          });
          toast.success(`Company sold ${shares} shares of ${stock.symbol}`);
        }
      } else {
        // Trading as player
        if (tradeType === "buy") {
          await buyStock({
            stockId: stock._id,
            shares,
          });
          toast.success(`Bought ${shares} shares of ${stock.symbol}`);
        } else {
          await sellStock({
            stockId: stock._id,
            shares,
          });
          toast.success(`Sold ${shares} shares of ${stock.symbol}`);
        }
      }

      setTradeAmount("");
    } catch (error: any) {
      toast.error(error.message || "Trade failed");
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Back Button */}
          <Link to="/stocks">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Stocks
            </Button>
          </Link>

          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 flex-shrink-0 overflow-hidden">
              {stock.companyLogo ? (
                <img
                  src={stock.companyLogo}
                  alt={stock.symbol}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2 className="h-8 w-8 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-bold">
                  {stock.symbol}
                </h1>
                <Badge
                  variant="outline"
                  className={getSectorColor(stock.sector ?? "other")}
                >
                  {(stock.sector ?? "other").toUpperCase()}
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground">{stock.name}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">
                {formatCurrency(stock.currentPrice ?? 0)}
              </div>
              {priceChange !== 0 && (
                <Badge
                  variant={isPositive ? "default" : "destructive"}
                  className="mt-2"
                >
                  {isPositive ? (
                    <TrendingUp className="mr-1 h-3 w-3" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3" />
                  )}
                  {isPositive ? "+" : ""}
                  {priceChange.toFixed(2)}%
                </Badge>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-3 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Market Cap
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stock.marketCap ?? 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Your Shares
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {holding?.shares.toLocaleString() ?? 0}
                </div>
                <Link
                  to="/portfolio"
                  className="text-xs text-primary hover:underline"
                >
                  View in Portfolio
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Your Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {holding ? formatCurrency(holding.currentValue) : "$0.00"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  P&L
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    holding && holding.gainLoss >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {holding
                    ? `${holding.gainLoss >= 0 ? "+" : ""}${formatCurrency(
                        holding.gainLoss
                      )}`
                    : "$0.00"}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Chart Placeholder */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Price Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <PriceChart
                  currentPrice={stock.currentPrice ?? 0}
                  symbol={stock.symbol || "STOCK"}
                  height={320}
                  showStats={true}
                  days={7}
                  stockId={stock._id}
                />
              </CardContent>
            </Card>

            {/* Trade Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Trade {stock.symbol}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Buy/Sell Toggle */}
                <Tabs
                  value={tradeType}
                  onValueChange={(v: any) => setTradeType(v)}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="buy">Buy</TabsTrigger>
                    <TabsTrigger value="sell">Sell</TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Owner Type */}
                <div className="space-y-2">
                  <Label>Trade As</Label>
                  <Select
                    value={ownerType}
                    onValueChange={(v: any) => {
                      setOwnerType(v);
                      if (v === "company") {
                        setSelectedCompany("");
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="player">
                        <div className="flex items-center">
                          <Wallet className="mr-2 h-4 w-4" />
                          Personal Account
                        </div>
                      </SelectItem>
                      <SelectItem value="company">
                        <div className="flex items-center">
                          <Building2 className="mr-2 h-4 w-4" />
                          Company
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Company Selector (if trading as company) */}
                {ownerType === "company" && (
                  <div className="space-y-2">
                    <Label>Select Company</Label>
                    <Select
                      value={selectedCompany}
                      onValueChange={(v: any) => setSelectedCompany(v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a company..." />
                      </SelectTrigger>
                      <SelectContent>
                        {myCompanies?.map((company) => (
                          <SelectItem key={company._id} value={company._id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{company.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {formatCurrency(company.balance)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Purchase Mode */}
                <div className="space-y-2">
                  <Label>Purchase By</Label>
                  <Select
                    value={purchaseMode}
                    onValueChange={(v: any) => setPurchaseMode(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shares">Number of Shares</SelectItem>
                      <SelectItem value="dollars">Dollar Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <Label>
                    {purchaseMode === "shares"
                      ? "Number of Shares"
                      : "Dollar Amount"}
                  </Label>
                  <Input
                    type="number"
                    placeholder={purchaseMode === "shares" ? "100" : "1000.00"}
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    step={purchaseMode === "shares" ? "1" : "0.01"}
                  />
                </div>

                {/* Estimated Total */}
                {tradeAmount && (
                  <div className="rounded-lg bg-muted p-3">
                    {purchaseMode === "shares" ? (
                      <div className="flex justify-between text-sm">
                        <span>Estimated Total</span>
                        <span className="font-semibold">
                          {formatCurrency(
                            (parseInt(tradeAmount) || 0) *
                              (stock.currentPrice ?? 0)
                          )}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Dollar Amount</span>
                          <span className="font-semibold">
                            {formatCurrency(
                              Math.round(parseFloat(tradeAmount) * 100)
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Shares to Receive</span>
                          <span className="font-semibold">
                            {(() => {
                              const dollarAmount = parseFloat(tradeAmount);
                              if (isNaN(dollarAmount) || dollarAmount <= 0)
                                return 0;
                              return Math.floor(
                                (dollarAmount * 100) / (stock.currentPrice ?? 1)
                              );
                            })()}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Your Balance */}
                {currentPlayer && (
                  <div className="rounded-lg bg-muted p-3">
                    <div className="flex justify-between text-sm">
                      <span>Your Balance</span>
                      <span className="font-semibold">
                        {formatCurrency(currentPlayer.balance)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Trade Button */}
                <Button
                  className="w-full"
                  onClick={handleTrade}
                  disabled={
                    !tradeAmount ||
                    (ownerType === "company" && !selectedCompany)
                  }
                >
                  {tradeType === "buy" ? "Buy" : "Sell"} {stock.symbol}
                </Button>

                <p className="text-xs text-muted-foreground">
                  Maximum 1,000,000 shares per player
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Ownership Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Users className="inline mr-2 h-5 w-5" />
                Ownership Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OwnershipDistributionChart
                data={ownershipData}
                currentPlayerId={currentPlayer?._id}
                height={280}
                type="shares"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
