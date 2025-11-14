"use client";

import { useState, useMemo, memo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { formatCurrency } from "~/lib/game-utils";
import {
  TrendingUp,
  TrendingDown,
  Search,
  Coins,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  DollarSign,
} from "lucide-react";
import type { Id } from "convex/_generated/dataModel";
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import type { Route } from "./+types/crypto";
import { toast } from "sonner";
import { CryptoPriceChart } from "~/components/crypto-price-chart";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    throw redirect("/sign-in");
  }
  return {};
}

export default function CryptoPage() {
  // Queries
  const allCryptos = useQuery(api.crypto.getAllCryptos);
  const myPortfolio = useQuery(api.crypto.getMyPortfolio);
  const marketStats = useQuery(api.crypto.getMarketStats);
  const currentPlayer = useQuery(api.moderation.getCurrentPlayer);

  // Mutations
  const buyCrypto = useMutation(api.crypto.buyCrypto);
  const sellCrypto = useMutation(api.crypto.sellCrypto);
  const createCrypto = useMutation(api.crypto.createCryptocurrency);

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "price-asc" | "price-desc" | "marketcap-desc" | "change-desc"
  >("marketcap-desc");
  const [selectedCrypto, setSelectedCrypto] = useState<any>(null);
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [tradeAmount, setTradeAmount] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCryptoName, setNewCryptoName] = useState("");
  const [newCryptoSymbol, setNewCryptoSymbol] = useState("");
  const [newCryptoDescription, setNewCryptoDescription] = useState("");
  const [newCryptoTags, setNewCryptoTags] = useState("");
  const [newCryptoImageUrl, setNewCryptoImageUrl] = useState("");

  // Filter and sort cryptos
  const filteredCryptos = useMemo(() => {
    if (!allCryptos) return [];

    let filtered = allCryptos.filter((crypto) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        crypto.name.toLowerCase().includes(query) ||
        crypto.symbol.toLowerCase().includes(query)
      );
    });

    // Sort
    switch (sortBy) {
      case "price-asc":
        filtered.sort((a, b) => a.currentPrice - b.currentPrice);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.currentPrice - a.currentPrice);
        break;
      case "marketcap-desc":
        filtered.sort((a, b) => b.marketCap - a.marketCap);
        break;
      case "change-desc":
        filtered.sort((a, b) => b.lastPriceChange - a.lastPriceChange);
        break;
    }

    return filtered;
  }, [allCryptos, searchQuery, sortBy]);

  // Calculate portfolio total
  const portfolioTotal = useMemo(() => {
    if (!myPortfolio) return 0;
    return myPortfolio.reduce((sum, item) => sum + item.currentValue, 0);
  }, [myPortfolio]);

  const handleTrade = async () => {
    if (!selectedCrypto || !tradeAmount) return;

    const amount = parseFloat(tradeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      if (tradeType === "buy") {
        const result = await buyCrypto({
          cryptoId: selectedCrypto._id,
          amount: amount,
        });
        toast.success(
          `Bought ${amount} ${selectedCrypto.symbol} for ${formatCurrency(
            result.totalCost
          )}`
        );
      } else {
        const result = await sellCrypto({
          cryptoId: selectedCrypto._id,
          amount: amount,
        });
        toast.success(
          `Sold ${amount} ${selectedCrypto.symbol} for ${formatCurrency(
            result.totalRevenue
          )}`
        );
      }
      setTradeDialogOpen(false);
      setTradeAmount("");
    } catch (error: any) {
      toast.error(error.message || "Trade failed");
    }
  };

  const openTradeDialog = (crypto: any, type: "buy" | "sell") => {
    setSelectedCrypto(crypto);
    setTradeType(type);
    setTradeDialogOpen(true);
  };

  const getWalletBalance = (cryptoId: Id<"cryptocurrencies">) => {
    const wallet = myPortfolio?.find((w) => w.cryptoId === cryptoId);
    return wallet?.balance || 0;
  };

  const handleCreateCrypto = async () => {
    if (!newCryptoName || !newCryptoSymbol) {
      toast.error("Please fill in name and symbol");
      return;
    }

    try {
      // Parse tags from comma-separated string
      const tags = newCryptoTags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      await createCrypto({
        name: newCryptoName,
        symbol: newCryptoSymbol.toUpperCase(),
        description: newCryptoDescription || undefined,
        tags: tags.length > 0 ? tags : undefined,
        imageUrl: newCryptoImageUrl || undefined,
      });
      toast.success(
        `Created ${newCryptoName} (${newCryptoSymbol.toUpperCase()}) cryptocurrency for $10,000!`
      );
      setCreateDialogOpen(false);
      setNewCryptoName("");
      setNewCryptoSymbol("");
      setNewCryptoDescription("");
      setNewCryptoTags("");
      setNewCryptoImageUrl("");
    } catch (error: any) {
      toast.error(error.message || "Failed to create cryptocurrency");
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Header */}
          <div className="flex flex-col gap-3">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-primary/70 bg-clip-text text-transparent">
                Cryptocurrency Market
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Trade digital currencies with real-time market dynamics and
                volatility.
              </p>
            </div>

            {/* Market Stats */}
            {!marketStats ? (
              <div className="grid gap-3 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-7 w-40" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Market Cap
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(marketStats.totalMarketCap)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      24h Volume
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(marketStats.totalVolume24h)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Cryptocurrencies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {marketStats.cryptoCount}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Create Crypto Button */}
            <div className="flex justify-end">
              <Button
                onClick={() => setCreateDialogOpen(true)}
                variant="outline"
              >
                <Coins className="mr-2 h-4 w-4" />
                Create Cryptocurrency ($10,000)
              </Button>
            </div>

            <div className="space-y-4">
              {/* Search and Sort */}
              <div className="grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Search cryptocurrencies..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Select
                    value={sortBy}
                    onValueChange={(value: any) => setSortBy(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="marketcap-desc">
                        Market Cap (High to Low)
                      </SelectItem>
                      <SelectItem value="price-desc">
                        Price (High to Low)
                      </SelectItem>
                      <SelectItem value="price-asc">
                        Price (Low to High)
                      </SelectItem>
                      <SelectItem value="change-desc">
                        Biggest Movers
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Crypto List */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {!allCryptos ? (
                  // Skeleton loading state
                  <>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <Card key={i}>
                        <CardHeader className="pb-3">
                          <div className="flex flex-col items-center gap-2">
                            <Skeleton className="h-16 w-16 rounded-full" />
                            <div className="text-center w-full space-y-2">
                              <Skeleton className="h-5 w-24 mx-auto" />
                              <Skeleton className="h-4 w-28 mx-auto" />
                            </div>
                            <Skeleton className="h-6 w-20" />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Chart skeleton */}
                          <Skeleton className="h-20 rounded-md" />

                          {/* Stats skeleton */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Skeleton className="h-4 w-20" />
                              <Skeleton className="h-4 w-24" />
                            </div>
                            <div className="flex items-center justify-between">
                              <Skeleton className="h-4 w-12" />
                              <Skeleton className="h-5 w-28" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                ) : (
                  filteredCryptos.map((crypto) => (
                    <CryptoCard key={crypto._id} crypto={crypto} />
                  ))
                )}
              </div>

              {allCryptos && filteredCryptos.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Coins className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">
                      No cryptocurrencies found
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {searchQuery
                        ? "Try adjusting your search query"
                        : "No cryptocurrencies available yet"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trade Dialog */}
      <Dialog open={tradeDialogOpen} onOpenChange={setTradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tradeType === "buy" ? "Buy" : "Sell"} {selectedCrypto?.symbol}
            </DialogTitle>
            <DialogDescription>
              {tradeType === "buy"
                ? `Purchase ${selectedCrypto?.name} at current market price`
                : `Sell your ${selectedCrypto?.name} holdings`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Price</Label>
              <div className="text-2xl font-bold">
                {selectedCrypto && formatCurrency(selectedCrypto.currentPrice)}
              </div>
            </div>
            {tradeType === "sell" && (
              <div>
                <Label>Your Balance</Label>
                <div className="text-lg font-semibold">
                  {selectedCrypto &&
                    getWalletBalance(selectedCrypto._id).toLocaleString()}{" "}
                  {selectedCrypto?.symbol}
                </div>
              </div>
            )}
            {tradeType === "buy" && currentPlayer && (
              <div>
                <Label>Your Balance</Label>
                <div className="text-lg font-semibold">
                  {formatCurrency(currentPlayer.balance)}
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="amount">Amount ({selectedCrypto?.symbol})</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={tradeAmount}
                onChange={(e) => setTradeAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            {tradeAmount && selectedCrypto && (
              <div className="rounded-lg bg-muted p-3">
                <div className="flex justify-between text-sm">
                  <span>Estimated Total</span>
                  <span className="font-semibold">
                    {formatCurrency(
                      parseFloat(tradeAmount || "0") *
                        selectedCrypto.currentPrice
                    )}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Price impact may apply for large orders
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTradeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTrade} disabled={!tradeAmount}>
              {tradeType === "buy" ? "Buy" : "Sell"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Crypto Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Cryptocurrency</DialogTitle>
            <DialogDescription>
              Launch your own cryptocurrency for $10,000. You'll receive
              1,000,000 coins at $0.10 each ($10,000 market cap).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {currentPlayer && (
              <div>
                <Label>Your Balance</Label>
                <div className="text-lg font-semibold">
                  {formatCurrency(currentPlayer.balance)}
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="crypto-name">Cryptocurrency Name</Label>
              <Input
                id="crypto-name"
                type="text"
                placeholder="e.g., Bitcoin"
                value={newCryptoName}
                onChange={(e) => setNewCryptoName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="crypto-symbol">Symbol (3-5 characters)</Label>
              <Input
                id="crypto-symbol"
                type="text"
                placeholder="e.g., BTC"
                value={newCryptoSymbol}
                onChange={(e) =>
                  setNewCryptoSymbol(e.target.value.toUpperCase())
                }
                maxLength={5}
              />
            </div>
            <div>
              <Label htmlFor="crypto-description">Description (optional)</Label>
              <Textarea
                id="crypto-description"
                placeholder="Brief description of your cryptocurrency"
                value={newCryptoDescription}
                onChange={(e) => setNewCryptoDescription(e.target.value)}
                className="min-h-20"
              />
            </div>
            <div>
              <Label htmlFor="crypto-tags">Tags (optional)</Label>
              <Input
                id="crypto-tags"
                type="text"
                placeholder="e.g., gaming, defi, meme (comma-separated)"
                value={newCryptoTags}
                onChange={(e) => setNewCryptoTags(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="crypto-image">Image URL (optional)</Label>
              <Input
                id="crypto-image"
                type="url"
                placeholder="https://example.com/image.png"
                value={newCryptoImageUrl}
                onChange={(e) => setNewCryptoImageUrl(e.target.value)}
              />
            </div>
            <div className="rounded-lg bg-muted p-3">
              <div className="flex justify-between text-sm">
                <span>Creation Cost</span>
                <span className="font-semibold">$10,000</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Initial Supply</span>
                <span className="font-semibold">1,000,000 coins</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Initial Price</span>
                <span className="font-semibold">$0.10 per coin</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Market Cap</span>
                <span className="font-semibold">$10,000</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCrypto}
              disabled={
                !newCryptoName || !newCryptoSymbol || newCryptoSymbol.length < 3
              }
            >
              Create for $10,000
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const CryptoCard = memo(function CryptoCard({ crypto }: { crypto: any }) {
  const priceChange = crypto.lastPriceChange * 100;
  const isPositive = priceChange >= 0;

  return (
    <Link
      to={`/crypto/${crypto.symbol}`}
      className="group"
    >
      <Card className="hover:shadow-lg transition-all hover:scale-[1.02] h-full">
        <CardHeader className="pb-3">
          <div className="flex flex-col items-center gap-2">
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
            <div className="text-center">
              <CardTitle className="text-lg">
                {crypto.symbol}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {crypto.name}
              </p>
            </div>
            {priceChange !== 0 && (
              <Badge
                variant={
                  isPositive ? "default" : "destructive"
                }
                className="text-xs"
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
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Mini 7-day chart */}
          <div className="h-20 rounded-md overflow-hidden">
            <CryptoPriceChart
              cryptoId={crypto._id}
              currentPrice={crypto.currentPrice}
              symbol={crypto.symbol}
              height={80}
              showStats={false}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Market Cap
              </span>
              <span className="font-medium">
                {formatCurrency(crypto.marketCap)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Price
              </span>
              <span className="text-lg font-bold">
                {formatCurrency(crypto.currentPrice)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});
