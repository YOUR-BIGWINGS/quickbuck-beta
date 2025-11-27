"use client";

import { useEffect, useMemo, useState, memo } from "react";
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect, Link } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { motion } from "motion/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "~/components/ui/dialog";
import { Skeleton } from "~/components/ui/skeleton";
import { AnimatedNumber } from "~/components/ui/animated-number";
import { formatCurrency, formatCompactNumber } from "~/lib/game-utils";
import { useTheme } from "~/contexts/theme-context";
import { cn } from "~/lib/utils";
import {
  getTopMovers,
  selectCryptos,
  toPercent,
  type CryptoSortOption,
} from "~/lib/crypto-page-utils";
import {
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  Plus,
  User,
} from "lucide-react";
import { toast } from "sonner";
import type { Route } from "./+types/crypto";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    throw redirect("/sign-in");
  }
  return {};
}

const CARD_GRID_CLASSES =
  "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export default function CryptoPage() {
  const { preset } = useTheme();
  const allCryptos = useQuery(api.crypto.getAllCryptosWithCreator);
  const marketOverview = useQuery(api.crypto.getMarketOverview);
  const currentPlayer = useQuery(api.moderation.getCurrentPlayer);
  const createCrypto = useMutation(api.crypto.createCryptocurrency);

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<CryptoSortOption>("marketcap-desc");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCrypto, setNewCrypto] = useState({
    name: "",
    symbol: "",
    description: "",
    initialSupply: "1000000",
    initialPrice: "10",
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredCryptos = useMemo(() => {
    if (!allCryptos) return [];
    return selectCryptos(allCryptos, {
      searchQuery,
      sortBy,
    });
  }, [allCryptos, searchQuery, sortBy]);

  const { topGainers, topLosers } = useMemo(() => {
    if (!allCryptos?.length) {
      return { topGainers: [], topLosers: [] };
    }
    return getTopMovers(allCryptos, 3);
  }, [allCryptos]);

  const handleCreateCrypto = async () => {
    if (!newCrypto.name || !newCrypto.symbol) {
      toast.error("Name and symbol are required");
      return;
    }

    if (newCrypto.symbol.length > 10) {
      toast.error("Symbol must be 10 characters or less");
      return;
    }

    setIsCreating(true);
    try {
      await createCrypto({
        name: newCrypto.name,
        symbol: newCrypto.symbol.toUpperCase(),
        description: newCrypto.description || undefined,
        initialSupply: parseInt(newCrypto.initialSupply) || 1000000,
        initialPrice: parseInt(newCrypto.initialPrice) || 10,
      });
      toast.success(`Created ${newCrypto.symbol.toUpperCase()} successfully!`);
      setCreateDialogOpen(false);
      setNewCrypto({
        name: "",
        symbol: "",
        description: "",
        initialSupply: "1000000",
        initialPrice: "10",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create cryptocurrency";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  if (!mounted) {
    return <div className="flex flex-1 flex-col" />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <motion.div
        className="@container/main flex flex-1 flex-col gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          <HeroSection preset={preset} marketOverview={marketOverview} />

          <motion.div
            className="grid gap-4 lg:grid-cols-[1fr_340px]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold">
                    Discover Cryptocurrencies
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Search and sort to find player-created cryptocurrencies.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Crypto
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create a Cryptocurrency</DialogTitle>
                        <DialogDescription>
                          Create your own cryptocurrency for $10,000. You'll earn 2% on every trade.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            value={newCrypto.name}
                            onChange={(e) => setNewCrypto({ ...newCrypto, name: e.target.value })}
                            placeholder="GameCoin"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="symbol">Symbol (max 10 chars)</Label>
                          <Input
                            id="symbol"
                            value={newCrypto.symbol}
                            onChange={(e) => setNewCrypto({ ...newCrypto, symbol: e.target.value.toUpperCase() })}
                            placeholder="GMC"
                            maxLength={10}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="description">Description (optional)</Label>
                          <Input
                            id="description"
                            value={newCrypto.description}
                            onChange={(e) => setNewCrypto({ ...newCrypto, description: e.target.value })}
                            placeholder="A fun cryptocurrency for gamers"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="supply">Initial Supply</Label>
                            <Input
                              id="supply"
                              type="number"
                              value={newCrypto.initialSupply}
                              onChange={(e) => setNewCrypto({ ...newCrypto, initialSupply: e.target.value })}
                              placeholder="1000000"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="price">Initial Price (cents)</Label>
                            <Input
                              id="price"
                              type="number"
                              value={newCrypto.initialPrice}
                              onChange={(e) => setNewCrypto({ ...newCrypto, initialPrice: e.target.value })}
                              placeholder="10"
                            />
                          </div>
                        </div>
                        <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                          <p className="font-medium">Cost: $10,000</p>
                          <p className="text-muted-foreground">
                            Your balance: {formatCurrency(currentPlayer?.balance ?? 0)}
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={handleCreateCrypto}
                          disabled={isCreating || (currentPlayer?.balance ?? 0) < 1000000}
                        >
                          {isCreating ? "Creating..." : "Create Cryptocurrency"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Filter className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, symbol, or creator"
                      className="h-11 pl-10"
                    />
                  </div>
                  <Select
                    value={sortBy}
                    onValueChange={(value) => setSortBy(value as CryptoSortOption)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Sort cryptos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="marketcap-desc">
                        Market cap (high to low)
                      </SelectItem>
                      <SelectItem value="price-desc">
                        Price (high to low)
                      </SelectItem>
                      <SelectItem value="price-asc">
                        Price (low to high)
                      </SelectItem>
                      <SelectItem value="change-desc">Biggest gainers</SelectItem>
                      <SelectItem value="change-asc">Biggest losers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <TopMovers
                    title="Top gainers"
                    icon={TrendingUp}
                    cryptos={topGainers}
                  />
                  <TopMovers
                    title="Top decliners"
                    icon={TrendingDown}
                    cryptos={topLosers}
                    negative
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Market insights
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Track market metrics across all cryptocurrencies.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {!marketOverview ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((item) => (
                      <Skeleton key={item} className="h-16 w-full rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border bg-muted/40 p-4">
                      <div className="text-sm text-muted-foreground">Total Market Cap</div>
                      <div className="text-lg font-semibold">
                        {formatCompactNumber(marketOverview.totalMarketCap)}
                      </div>
                    </div>
                    <div className="rounded-xl border bg-muted/40 p-4">
                      <div className="text-sm text-muted-foreground">24h Volume</div>
                      <div className="text-lg font-semibold">
                        {formatCompactNumber(marketOverview.totalVolume24h)}
                      </div>
                    </div>
                    <div className="rounded-xl border bg-muted/40 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">Avg Change</div>
                        <span
                          className={cn(
                            "flex items-center text-sm font-semibold",
                            marketOverview.averageChange24h >= 0
                              ? "text-emerald-600"
                              : "text-rose-600",
                          )}
                        >
                          {marketOverview.averageChange24h >= 0 ? (
                            <ArrowUpRight className="mr-1 h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="mr-1 h-4 w-4" />
                          )}
                          {marketOverview.averageChange24h >= 0 ? "+" : ""}
                          {(marketOverview.averageChange24h * 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl border bg-muted/40 p-4">
                      <div className="text-sm text-muted-foreground">Total Cryptocurrencies</div>
                      <div className="text-lg font-semibold">
                        {marketOverview.cryptoCount}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <div className={CARD_GRID_CLASSES}>
            {!allCryptos ? (
              Array.from({ length: 8 }).map((_, index) => (
                <Card key={`skeleton-${index}`} className="border-dashed">
                  <CardContent className="space-y-4 p-6">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full rounded-lg" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-6 w-1/4" />
                  </CardContent>
                </Card>
              ))
            ) : filteredCryptos.length === 0 ? (
              <Card className="col-span-full border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Coins className="h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-6 text-xl font-semibold">
                    No cryptocurrencies found
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    {searchQuery
                      ? "Try a different search term."
                      : "Be the first to create a cryptocurrency!"}
                  </p>
                  {!searchQuery && (
                    <Button
                      className="mt-4"
                      onClick={() => setCreateDialogOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Crypto
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredCryptos.map((crypto) => (
                <CryptoCard key={crypto._id} crypto={crypto} />
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function HeroSection({
  preset,
  marketOverview,
}: {
  preset: string;
  marketOverview: any;
}) {
  return (
    <motion.div
      className="relative overflow-hidden rounded-3xl border-0 text-white shadow-2xl"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div
        className={cn(
          "relative z-10 grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)] md:p-8",
          preset === "default" || preset === "dark-default"
            ? "bg-gradient-to-br from-[#8B5CF6] to-[#6366F1]"
            : "bg-primary",
        )}
      >
        <div className="space-y-3 lg:space-y-4">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Crypto Market
          </h1>
          <p className="max-w-xl text-sm text-white/80 md:text-base">
            Trade player-created cryptocurrencies. Create your own crypto for $10,000 and earn 2% on every trade. Monitor prices, track momentum, and build your portfolio.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {marketOverview ? (
              <>
                <HeroStat
                  label="Total market cap"
                  value={marketOverview.totalMarketCap}
                />
                <HeroStat
                  label="Average 24h change"
                  value={marketOverview.averageChange24h * 100}
                  isPercent
                />
                <HeroStat
                  label="Active cryptos"
                  value={marketOverview.cryptoCount ?? 0}
                  isCount
                />
                <HeroStat
                  label="24h volume"
                  value={marketOverview.totalVolume24h ?? 0}
                />
              </>
            ) : (
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`hero-skeleton-${index}`}
                  className="space-y-2 rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm"
                >
                  <Skeleton className="h-4 w-24 bg-white/30" />
                  <Skeleton className="h-7 w-32 bg-white/40" />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-lg">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.25)_0,rgba(255,255,255,0)_70%)]" />
          <div className="relative space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Creator economy
              </h2>
              <Badge
                variant="outline"
                className="border-white/30 bg-white/20 text-xs font-medium text-white"
              >
                Player-driven
              </Badge>
            </div>
            <p className="text-sm text-white/80">
              Create and trade cryptocurrencies. Creators earn a 2% fee on all trades of their tokens.
            </p>
            <div className="grid gap-3">
              <InsightRow
                label="Creation cost"
                value="$10,000"
                tone="neutral"
              />
              <InsightRow
                label="Creator fee"
                value="2% per trade"
                tone="positive"
              />
              <InsightRow
                label="Max holdings"
                value="1M coins/crypto"
                tone="neutral"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-32 -top-32 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -left-28 bottom-0 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12)_0,rgba(255,255,255,0)_70%)]" />
      </div>
    </motion.div>
  );
}

function HeroStat({
  label,
  value,
  isPercent,
  isCount,
}: {
  label: string;
  value: number;
  isPercent?: boolean;
  isCount?: boolean;
}) {
  return (
    <div className="space-y-1 rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
      <div className="text-xs uppercase tracking-wide text-white/70">
        {label}
      </div>
      <div className="text-xl font-semibold text-white">
        {isPercent ? (
          <>
            {value >= 0 ? "+" : ""}
            {value.toFixed(2)}%
          </>
        ) : isCount ? (
          value.toLocaleString()
        ) : (
          <AnimatedNumber value={value} />
        )}
      </div>
    </div>
  );
}

function InsightRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "positive" | "negative" | "neutral";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-300"
      : tone === "negative"
        ? "text-rose-300"
        : "text-white";

  return (
    <div className="flex items-center justify-between rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm text-white">
      <span className="text-white/70">{label}</span>
      <span className={cn("font-semibold", toneClass)}>{value}</span>
    </div>
  );
}

const CryptoCard = memo(function CryptoCard({ crypto }: { crypto: any }) {
  const price = crypto.currentPrice ?? 0;
  const marketCap = crypto.marketCap ?? 0;
  const changePercent = toPercent(crypto.lastPriceChange);
  const changePositive = changePercent >= 0;

  return (
    <Link to={`/crypto/${crypto.symbol}`} className="group">
      <Card className="h-full border-transparent bg-card/60 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl">
        <CardContent className="flex h-full flex-col space-y-4 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
              {crypto.imageUrl ? (
                <img
                  src={crypto.imageUrl}
                  alt={crypto.symbol ?? "Crypto"}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <Coins className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-lg font-semibold">
                  {crypto.symbol}
                </h3>
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {crypto.name}
              </p>
            </div>
          </div>

          {crypto.creatorName && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>Created by {crypto.creatorName}</span>
            </div>
          )}

          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Market cap
            </span>
            <div className="text-lg font-semibold">
              {formatCompactNumber(marketCap)}
            </div>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Price
              </span>
              <div className="text-2xl font-bold">{formatCurrency(price)}</div>
            </div>
            <Badge
              variant={changePositive ? "default" : "destructive"}
              className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
            >
              {changePositive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {changePercent >= 0 ? "+" : ""}
              {changePercent.toFixed(2)}%
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});

function TopMovers({
  title,
  icon: Icon,
  cryptos,
  negative,
}: {
  title: string;
  icon: typeof TrendingUp;
  cryptos: any[];
  negative?: boolean;
}) {
  return (
    <Card className="border border-dashed bg-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              "h-4 w-4",
              negative ? "text-rose-500" : "text-emerald-500",
            )}
          />
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!cryptos.length ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          cryptos.map((crypto) => {
            const changePercent = toPercent(crypto.lastPriceChange);
            return (
              <Link
                key={`mover-${crypto._id}`}
                to={`/crypto/${crypto.symbol}`}
                className="flex items-center justify-between rounded-lg bg-background px-4 py-3 text-sm shadow-sm transition hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  {crypto.imageUrl ? (
                    <img
                      src={crypto.imageUrl}
                      alt={crypto.symbol}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {crypto.symbol?.slice(0, 2) ?? "CR"}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-foreground">
                      {crypto.symbol}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {crypto.name}
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    "flex items-center text-sm font-semibold",
                    changePercent >= 0 ? "text-emerald-600" : "text-rose-600",
                  )}
                >
                  {changePercent >= 0 ? "+" : ""}
                  {changePercent.toFixed(2)}%
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
