"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useParams, useNavigate, Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { PriceChart } from "~/components/price-chart";
import { CryptoPriceChart } from "~/components/crypto-price-chart";
import { OwnershipDistributionChart } from "~/components/ownership-distribution-chart";
import { formatCurrency } from "~/lib/game-utils";
import {
  ArrowLeft,
  Coins,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import type { Route } from "./+types/crypto.$symbol";
import { toast } from "sonner";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    throw redirect("/sign-in");
  }
  return {};
}

export default function CryptoDetailPage() {
  const { symbol } = useParams();
  const navigate = useNavigate();

  // Queries
  const allCryptos = useQuery(api.crypto.getAllCryptos);
  const myWallet = useQuery(api.crypto.getMyPortfolio);
  const currentPlayer = useQuery(api.moderation.getCurrentPlayer);

  // Find the specific crypto first
  const crypto = allCryptos?.find(
    (c) => c.symbol.toUpperCase() === symbol?.toUpperCase()
  );

  // Query ownership data for this crypto
  const ownershipData = useQuery(
    api.crypto.getCryptoOwnership,
    crypto?._id ? { cryptoId: crypto._id } : "skip"
  );

  // Mutations
  const buyCrypto = useMutation(api.crypto.buyCrypto);
  const sellCrypto = useMutation(api.crypto.sellCrypto);

  // Find wallet balance
  const walletBalance = myWallet?.find((w) => w.cryptoId === crypto?._id);

  // State
  const [tradeTab, setTradeTab] = useState<"buy" | "sell">("buy");
  const [ownerType, setOwnerType] = useState<"player" | "company">("player");
  const [purchaseMode, setPurchaseMode] = useState<"coins" | "dollars">(
    "coins"
  );
  const [amount, setAmount] = useState("");

  if (!crypto) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <Coins className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-2xl font-bold">Cryptocurrency Not Found</h2>
          <p className="mt-2 text-muted-foreground">
            The cryptocurrency "{symbol}" does not exist.
          </p>
          <Button className="mt-4" onClick={() => navigate("/crypto")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Market
          </Button>
        </div>
      </div>
    );
  }

  const priceChange = crypto.lastPriceChange * 100;
  const isPositive = priceChange >= 0;
  const yourCoins = walletBalance?.balance || 0;
  const yourValue = yourCoins * crypto.currentPrice;
  const avgCost = walletBalance?.averagePurchasePrice || 0;
  const profitLoss = yourValue - yourCoins * avgCost;
  const profitLossPercent =
    avgCost > 0 ? (profitLoss / (yourCoins * avgCost)) * 100 : 0;

  const handleTrade = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      let coinsToTrade: number;

      if (purchaseMode === "coins") {
        coinsToTrade = parseFloat(amount);
        if (isNaN(coinsToTrade) || coinsToTrade <= 0) {
          toast.error("Please enter a valid number of coins");
          return;
        }
      } else {
        // Convert dollars to coins
        const dollarAmount = parseFloat(amount);
        if (isNaN(dollarAmount) || dollarAmount <= 0) {
          toast.error("Please enter a valid dollar amount");
          return;
        }
        // Convert dollars to cents, then divide by price per coin in cents
        const centAmount = dollarAmount * 100;
        const pricePerCoin = crypto.currentPrice;
        coinsToTrade = centAmount / pricePerCoin;

        if (coinsToTrade <= 0) {
          toast.error("Dollar amount too small to buy coins");
          return;
        }
      }

      if (tradeTab === "buy") {
        const result = await buyCrypto({
          cryptoId: crypto._id,
          amount: coinsToTrade,
        });
        toast.success(
          `Bought ${coinsToTrade.toFixed(2)} ${
            crypto.symbol
          } for ${formatCurrency(result.totalCost)}`
        );
      } else {
        const result = await sellCrypto({
          cryptoId: crypto._id,
          amount: coinsToTrade,
        });
        toast.success(
          `Sold ${coinsToTrade.toFixed(2)} ${
            crypto.symbol
          } for ${formatCurrency(result.totalRevenue)}`
        );
      }

      setAmount("");
    } catch (error: any) {
      toast.error(error.message || "Trade failed");
    }
  };

  const calculateEstimate = () => {
    if (!amount || parseFloat(amount) <= 0) return null;

    try {
      if (purchaseMode === "coins") {
        const coins = parseFloat(amount);
        if (isNaN(coins)) return null;
        const total = coins * crypto.currentPrice;
        return { coins, total };
      } else {
        const dollars = parseFloat(amount);
        if (isNaN(dollars)) return null;
        const centAmount = dollars * 100;
        const coins = centAmount / crypto.currentPrice;
        return { coins, total: dollars * 100 }; // Return in cents for formatCurrency
      }
    } catch {
      return null;
    }
  };

  const estimate = calculateEstimate();

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/crypto")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3 flex-1">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  {crypto.imageUrl ? (
                    <img
                      src={crypto.imageUrl}
                      alt={crypto.symbol}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <Coins className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-bold">
                      {crypto.symbol}
                    </h1>
                    {crypto.tags && crypto.tags.length > 0 && (
                      <div className="flex gap-1">
                        {crypto.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-lg text-muted-foreground">{crypto.name}</p>
                  {crypto.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {crypto.description}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-3xl md:text-4xl font-bold">
                    {formatCurrency(crypto.currentPrice)}
                  </div>
                  {priceChange !== 0 && (
                    <Badge
                      variant={isPositive ? "default" : "destructive"}
                      className="mt-1"
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
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Market Cap
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(crypto.marketCap)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Your Coins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {yourCoins.toLocaleString()}
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
                  {formatCurrency(yourValue)}
                </div>
                <div className="text-xs text-muted-foreground">
                  @ {formatCurrency(crypto.currentPrice)}/coin
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Profit/Loss
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    profitLoss >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {profitLoss >= 0 ? "+" : ""}
                  {formatCurrency(profitLoss)}
                </div>
                {profitLossPercent !== 0 && (
                  <div
                    className={`text-xs ${
                      profitLossPercent >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {profitLossPercent >= 0 ? "+" : ""}
                    {profitLossPercent.toFixed(2)}%
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Trading Panel */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Trade {crypto.symbol}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs
                  value={tradeTab}
                  onValueChange={(v: any) => setTradeTab(v)}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="buy">Buy</TabsTrigger>
                    <TabsTrigger value="sell">Sell</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div>
                  <Label className="text-xs text-muted-foreground mb-2">
                    Owner Type
                  </Label>
                  <Select
                    value={ownerType}
                    onValueChange={(v: any) => setOwnerType(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="player">Player</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-2">
                    Purchase Mode
                  </Label>
                  <Select
                    value={purchaseMode}
                    onValueChange={(v: any) => setPurchaseMode(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coins"># of Coins</SelectItem>
                      <SelectItem value="dollars">$ Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="amount">
                    {purchaseMode === "coins"
                      ? `Amount (${crypto.symbol})`
                      : "Amount (USD)"}
                  </Label>
                  <div className="relative">
                    {purchaseMode === "dollars" && (
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    )}
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="0"
                      step="0.01"
                      className={purchaseMode === "dollars" ? "pl-9" : ""}
                    />
                  </div>
                </div>

                {currentPlayer && (
                  <div className="rounded-lg bg-muted p-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Your Balance
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(currentPlayer.balance)}
                      </span>
                    </div>
                    {tradeTab === "sell" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Your Coins
                        </span>
                        <span className="font-semibold">
                          {yourCoins.toLocaleString()} {crypto.symbol}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {estimate && (
                  <div className="rounded-lg bg-primary/10 p-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Coins</span>
                      <span className="font-semibold">
                        {estimate.coins.toFixed(2)} {crypto.symbol}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Total Cost</span>
                      <span className="font-semibold">
                        {formatCurrency(estimate.total)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Price impact may apply for large orders
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleTrade}
                  disabled={!amount || parseFloat(amount) <= 0}
                  className="w-full"
                  variant={tradeTab === "buy" ? "default" : "outline"}
                >
                  {tradeTab === "buy" ? "Buy" : "Sell"} {crypto.symbol}
                </Button>

                {ownerType === "company" && (
                  <p className="text-xs text-muted-foreground text-center">
                    Company trading coming soon
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Chart & Analysis */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Price History</CardTitle>
                </CardHeader>
                <CardContent>
                  <CryptoPriceChart
                    cryptoId={crypto._id}
                    currentPrice={crypto.currentPrice}
                    symbol={crypto.symbol}
                    height={320}
                    showStats={true}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Coin Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <OwnershipDistributionChart
                    data={ownershipData}
                    currentPlayerId={currentPlayer?._id}
                    height={280}
                    type="balance"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
