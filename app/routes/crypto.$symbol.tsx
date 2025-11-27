"use client";

import { useMemo, useState } from "react";
import { Link, redirect, useNavigate, useParams } from "react-router";
import { getAuth } from "@clerk/react-router/ssr.server";
import { useMutation, useQuery } from "convex/react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Coins,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "convex/_generated/api";
import type { Route } from "./+types/crypto.$symbol";
import { AnimatedNumber } from "~/components/ui/animated-number";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { formatCurrency, formatCompactNumber } from "~/lib/game-utils";
import { PriceChart } from "~/components/price-chart";
import { OwnershipDistributionChart } from "~/components/ownership-distribution-chart";

type TradeType = "buy" | "sell";
type PurchaseMode = "coins" | "dollars";

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

  const crypto = useQuery(api.crypto.getCryptoBySymbolWithCreator, 
    symbol ? { symbol } : "skip"
  );
  const cryptoStats = useQuery(
    api.crypto.getCryptoStats,
    crypto?._id ? { cryptoId: crypto._id } : "skip",
  );
  const ownershipData = useQuery(
    api.crypto.getCryptoOwnership,
    crypto?._id ? { cryptoId: crypto._id } : "skip",
  );
  const portfolio = useQuery(api.crypto.getMyPortfolio);
  const currentPlayer = useQuery(api.moderation.getCurrentPlayer);

  const buyCrypto = useMutation(api.crypto.buyCrypto);
  const sellCrypto = useMutation(api.crypto.sellCrypto);

  const [tradeType, setTradeType] = useState<TradeType>("buy");
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>("coins");
  const [tradeAmount, setTradeAmount] = useState<string>("");

  const playerHolding = useMemo(() => {
    if (!portfolio || !crypto?._id) return null;
    return portfolio.find((item) => item.cryptoId === crypto._id) ?? null;
  }, [portfolio, crypto?._id]);

  const priceChangePercent = crypto ? (crypto.lastPriceChange ?? 0) * 100 : 0;
  const priceChangePositive = priceChangePercent >= 0;

  const tradeCalculation = useMemo(() => {
    if (!crypto) return null;

    const price = crypto.currentPrice ?? 0;
    if (price <= 0) return null;

    const inputValue = parseFloat(tradeAmount);
    if (!inputValue || inputValue <= 0 || !Number.isFinite(inputValue)) {
      return null;
    }

    let estimatedCoins: number;
    let estimatedTotal: number;

    if (purchaseMode === "coins") {
      estimatedCoins = Math.floor(inputValue);
      estimatedTotal = estimatedCoins * price;
    } else {
      // dollars mode - input is in dollars, convert to cents
      const inputCents = Math.floor(inputValue * 100);
      estimatedCoins = Math.floor(inputCents / price);
      estimatedTotal = estimatedCoins * price;
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    if (estimatedCoins <= 0) {
      errors.push("Amount must result in at least 1 coin");
    }

    if (tradeType === "buy") {
      const balance = currentPlayer?.balance ?? 0;
      if (estimatedTotal > balance) {
        errors.push("Insufficient balance");
      }
      
      const currentHolding = playerHolding?.balance ?? 0;
      if (currentHolding + estimatedCoins > 1000000) {
        errors.push("Cannot own more than 1,000,000 coins per cryptocurrency");
      }
    } else {
      const ownedCoins = playerHolding?.balance ?? 0;
      if (estimatedCoins > ownedCoins) {
        errors.push(`You only own ${ownedCoins.toLocaleString()} coins`);
      }
    }

    return {
      estimatedCoins,
      estimatedTotal,
      errors,
      warnings,
      canSubmit: errors.length === 0 && estimatedCoins > 0,
    };
  }, [crypto, tradeAmount, purchaseMode, tradeType, currentPlayer?.balance, playerHolding?.balance]);

  const dailyRange = useMemo(() => {
    if (!cryptoStats || !crypto) return null;
    return {
      dayHigh: cryptoStats.dayHigh ?? crypto.currentPrice ?? 0,
      dayLow: cryptoStats.dayLow ?? crypto.currentPrice ?? 0,
      weekHigh: cryptoStats.weekHigh ?? crypto.currentPrice ?? 0,
      weekLow: cryptoStats.weekLow ?? crypto.currentPrice ?? 0,
      volume24h: cryptoStats.volume24h ?? 0,
      priceChange24h: cryptoStats.priceChange24h ?? 0,
      priceChangePercent24h: cryptoStats.priceChangePercent24h ?? 0,
    };
  }, [cryptoStats, crypto]);

  const handleTrade = async () => {
    if (!crypto || !tradeCalculation?.canSubmit) return;

    const coins = tradeCalculation.estimatedCoins;

    try {
      if (tradeType === "buy") {
        await buyCrypto({ cryptoId: crypto._id, amount: coins });
        toast.success(
          `Bought ${coins.toLocaleString()} ${crypto.symbol} coins!`,
        );
      } else {
        await sellCrypto({ cryptoId: crypto._id, amount: coins });
        toast.success(
          `Sold ${coins.toLocaleString()} ${crypto.symbol} coins!`,
        );
      }
      setTradeAmount("");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to complete the trade.";
      toast.error(message);
    }
  };

  if (crypto === undefined) {
    return (
      <div className="flex flex-1 flex-col p-6">
        <Skeleton className="h-12 w-40 rounded-full" />
        <Skeleton className="mt-6 h-64 w-full rounded-3xl" />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!crypto) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <Coins className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-6 text-2xl font-semibold">Crypto not found</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          We couldn't find the cryptocurrency{" "}
          {symbol ? `"${symbol}"` : "you were looking for"}. It may have been
          deleted or does not exist.
        </p>
        <Button className="mt-6" onClick={() => navigate("/crypto")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to crypto market
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <motion.div
        className="flex flex-1 flex-col gap-6 p-4 md:p-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="relative overflow-hidden border-0 text-white shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6] to-[#6366F1]" />
          <div className="absolute -right-32 -top-32 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -left-32 bottom-0 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
          <CardContent className="relative z-10 flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="flex flex-1 flex-col gap-4">
              <div className="flex items-center gap-3">
                <Button
                  asChild
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 rounded-full bg-white/15 text-white hover:bg-white/25"
                >
                  <Link to="/crypto">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
                {crypto.creatorName && (
                  <Badge
                    variant="outline"
                    className="border-white/40 bg-white/10 text-white"
                  >
                    <User className="mr-1 h-3 w-3" />
                    {crypto.creatorName}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4">
                {crypto.imageUrl ? (
                  <img
                    src={crypto.imageUrl}
                    alt={crypto.symbol}
                    className="h-16 w-16 rounded-lg object-cover shadow-lg"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white/10 text-lg font-bold text-white shadow-lg">
                    {crypto.symbol?.slice(0, 2) ?? "CR"}
                  </div>
                )}
                <div>
                  <h1 className="text-3xl font-bold md:text-4xl">
                    {crypto.symbol}
                  </h1>
                  <p className="mt-1 text-sm text-white/80 md:text-base">
                    {crypto.name}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-6">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/60">
                    Price
                  </p>
                  <p className="mt-1 text-4xl font-semibold">
                    {formatCurrency(crypto.currentPrice ?? 0)}
                  </p>
                </div>
                <Badge
                  variant={priceChangePositive ? "secondary" : "destructive"}
                  className={cn(
                    "flex items-center gap-1 rounded-full border-0 px-3 py-1 text-xs font-semibold",
                    priceChangePositive
                      ? "bg-emerald-500/20 text-emerald-100"
                      : "bg-rose-500/20 text-rose-100",
                  )}
                >
                  {priceChangePositive ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  {priceChangePercent >= 0 ? "+" : ""}
                  {priceChangePercent.toFixed(2)}%
                </Badge>
              </div>
            </div>
            <div className="grid flex-initial gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <HeroMetric label="Your holdings" icon={Wallet}>
                {playerHolding ? playerHolding.balance.toLocaleString() : "0"} coins
              </HeroMetric>
              <HeroMetric label="Holding value" icon={DollarSign}>
                {playerHolding
                  ? formatCurrency(playerHolding.currentValue)
                  : "$0.00"}
              </HeroMetric>
              <HeroMetric
                label="Unrealized P&L"
                icon={priceChangePositive ? TrendingUp : TrendingDown}
                tone={
                  playerHolding && playerHolding.profitLoss >= 0
                    ? "positive"
                    : playerHolding
                      ? "negative"
                      : "neutral"
                }
              >
                {playerHolding
                  ? `${playerHolding.profitLoss >= 0 ? "+" : ""}${formatCurrency(playerHolding.profitLoss)}`
                  : "$0.00"}
              </HeroMetric>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Price action & Trade</CardTitle>
              <CardDescription>
                Seven-day performance with live trading.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="space-y-6">
                <PriceChart
                  currentPrice={crypto.currentPrice ?? 0}
                  symbol={crypto.symbol || "CRYPTO"}
                  height={320}
                  showStats
                  days={7}
                  cryptoId={crypto._id}
                />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <RangeMetric
                    label="Day high"
                    value={dailyRange?.dayHigh ?? crypto.currentPrice ?? 0}
                  />
                  <RangeMetric
                    label="Day low"
                    value={dailyRange?.dayLow ?? crypto.currentPrice ?? 0}
                  />
                  <RangeMetric
                    label="Week high"
                    value={dailyRange?.weekHigh ?? crypto.currentPrice ?? 0}
                  />
                  <RangeMetric
                    label="Week low"
                    value={dailyRange?.weekLow ?? crypto.currentPrice ?? 0}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">
                    Trade {crypto.symbol}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Select your trade parameters and execute instantly.
                  </p>
                </div>
                <Tabs
                  value={tradeType}
                  onValueChange={(value) => setTradeType(value as TradeType)}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="buy">Buy</TabsTrigger>
                    <TabsTrigger value="sell">Sell</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Purchase mode</Label>
                    <Select
                      value={purchaseMode}
                      onValueChange={(value) =>
                        setPurchaseMode(value as PurchaseMode)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coins">Number of coins</SelectItem>
                        <SelectItem value="dollars">Dollar amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>
                      {purchaseMode === "coins" ? "Coins" : "Dollar amount"}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step={purchaseMode === "coins" ? "1" : "0.01"}
                      value={tradeAmount}
                      onChange={(event) => setTradeAmount(event.target.value)}
                      placeholder={
                        purchaseMode === "coins" ? "1000" : "100.00"
                      }
                    />
                  </div>

                  {tradeCalculation?.errors.length ? (
                    <div className="rounded-lg border border-rose-400/60 bg-rose-50 px-4 py-3 text-xs text-rose-600">
                      <ul className="space-y-1">
                        {tradeCalculation.errors.map((error, index) => (
                          <li key={`error-${index}`}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="rounded-lg border bg-muted/50 p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Estimated coins
                      </span>
                      <span className="font-semibold">
                        {(tradeCalculation?.estimatedCoins ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Estimated total
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(tradeCalculation?.estimatedTotal ?? 0)}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Your balance
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(currentPlayer?.balance ?? 0)}
                      </span>
                    </div>
                    {playerHolding && (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Your {crypto.symbol} holdings
                        </span>
                        <span className="font-semibold">
                          {playerHolding.balance.toLocaleString()} coins
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleTrade}
                  disabled={!tradeCalculation?.canSubmit}
                >
                  {tradeType === "buy" ? "Buy" : "Sell"} {crypto.symbol}
                </Button>

                <p className="text-xs text-muted-foreground">
                  Maximum position size is 1,000,000 coins per cryptocurrency.
                  Creator earns 2% fee on trades.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ownership distribution & Market insights</CardTitle>
            <CardDescription>
              Track holder concentration and key market metrics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 grid-cols-2">
              <div className="space-y-6">
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-base font-semibold">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Top holders
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    See how coins are distributed across players.
                  </p>
                </div>
                <OwnershipDistributionChart
                  data={ownershipData?.map(d => ({
                    playerId: d.playerId,
                    playerName: d.playerName,
                    shares: d.balance,
                  }))}
                  currentPlayerId={currentPlayer?._id}
                  height={280}
                  type="shares"
                />
                <OwnershipTable ownership={ownershipData} />
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-base font-semibold">
                    Market metrics
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Key indicators for this cryptocurrency.
                  </p>
                </div>
                {[
                  {
                    title: "Market capitalization",
                    value: crypto.marketCap ?? 0,
                    formatter: (value: number) => (
                      <AnimatedNumber value={value} compact />
                    ),
                  },
                  {
                    title: "Circulating supply",
                    value: crypto.circulatingSupply ?? 0,
                    formatter: (value: number) => value.toLocaleString(),
                  },
                  {
                    title: "24h volume (coins)",
                    value: dailyRange?.volume24h ?? 0,
                    formatter: (value: number) => value.toLocaleString(),
                  },
                  {
                    title: "24h price change",
                    value: dailyRange?.priceChange24h ?? 0,
                    formatter: (value: number) => formatCurrency(value),
                    tone:
                      (dailyRange?.priceChange24h ?? 0) >= 0
                        ? "positive"
                        : "negative",
                  },
                  {
                    title: "24h change (%)",
                    value: dailyRange?.priceChangePercent24h ?? 0,
                    formatter: (value: number) =>
                      `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`,
                    tone:
                      (dailyRange?.priceChangePercent24h ?? 0) >= 0
                        ? "positive"
                        : "negative",
                  },
                ].map((insight) => (
                  <div
                    key={insight.title}
                    className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {insight.title}
                    </span>
                    <span
                      className={cn(
                        "font-semibold",
                        insight.tone === "positive"
                          ? "text-emerald-600"
                          : insight.tone === "negative"
                            ? "text-rose-600"
                            : "text-foreground",
                      )}
                    >
                      {insight.formatter(insight.value)}
                    </span>
                  </div>
                ))}
                <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                  Crypto prices update automatically every 5 minutes. Large trades may impact price due to liquidity effects.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function HeroMetric({
  label,
  icon: Icon,
  children,
  tone = "neutral",
}: {
  label: string;
  icon: typeof Wallet;
  children: React.ReactNode;
  tone?: "positive" | "negative" | "neutral";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-300"
      : tone === "negative"
        ? "text-rose-300"
        : "text-white";

  return (
    <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/70">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={cn("mt-2 text-xl font-semibold", toneClass)}>
        {children}
      </div>
    </div>
  );
}

function RangeMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{formatCurrency(value)}</p>
    </div>
  );
}

function OwnershipTable({
  ownership,
}: {
  ownership:
    | {
        playerId: string;
        playerName: string;
        balance: number;
      }[]
    | undefined;
}) {
  if (!ownership || ownership.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        No ownership data available yet.
      </div>
    );
  }

  const topHolders = ownership.slice(0, 5);

  return (
    <div className="mt-6 space-y-3">
      {topHolders.map((holder, index) => (
        <div
          key={holder.playerId}
          className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3 text-sm"
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground">
              #{index + 1}
            </span>
            <span className="font-medium">{holder.playerName}</span>
          </div>
          <div className="font-semibold">
            {holder.balance.toLocaleString()} coins
          </div>
        </div>
      ))}
    </div>
  );
}
