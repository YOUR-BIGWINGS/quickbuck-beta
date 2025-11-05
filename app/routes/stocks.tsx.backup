"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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
  BarChart3,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Building2,
} from "lucide-react";
import type { Id } from "convex/_generated/dataModel";
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import { toast } from "sonner";

export async function loader(args: any) {
  const { userId } = await getAuth(args);
  if (!userId) {
    throw redirect("/sign-in");
  }
  return {};
}

export default function StocksPage() {
  // Queries
  const allStocks = useQuery(api.stocks.getAllStocks);
  const myPortfolio = useQuery(api.stocks.getPlayerPortfolio);
  const marketOverview = useQuery(api.stocks.getMarketOverview);
  const currentPlayer = useQuery(api.moderation.getCurrentPlayer);

  // Mutations
  const buyStock = useMutation(api.stocks.buyStock);
  const sellStock = useMutation(api.stocks.sellStock);

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<
    "price-asc" | "price-desc" | "marketcap-desc" | "change-desc"
  >("marketcap-desc");
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [tradeShares, setTradeShares] = useState("");

  // Get unique sectors
  const sectors = useMemo(() => {
    if (!allStocks) return [];
    const uniqueSectors = [...new Set(allStocks.map((s) => s.sector))];
    return uniqueSectors.sort();
  }, [allStocks]);

  // Filter and sort stocks
  const filteredStocks = useMemo(() => {
    if (!allStocks) return [];

    let filtered = allStocks.filter((stock) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const name = stock.name ?? "";
        const symbol = stock.symbol ?? "";
        if (
          !name.toLowerCase().includes(query) &&
          !symbol.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Sector filter
      if (sectorFilter !== "all" && stock.sector !== sectorFilter) {
        return false;
      }

      return true;
    });

    // Sort
    switch (sortBy) {
      case "price-asc":
        filtered.sort((a, b) => (a.currentPrice ?? 0) - (b.currentPrice ?? 0));
        break;
      case "price-desc":
        filtered.sort((a, b) => (b.currentPrice ?? 0) - (a.currentPrice ?? 0));
        break;
      case "marketcap-desc":
        filtered.sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));
        break;
      case "change-desc":
        filtered.sort(
          (a, b) => (b.lastPriceChange ?? 0) - (a.lastPriceChange ?? 0)
        );
        break;
    }

    return filtered;
  }, [allStocks, searchQuery, sectorFilter, sortBy]);

  // Calculate portfolio total
  const portfolioTotal = useMemo(() => {
    if (!myPortfolio) return 0;
    return myPortfolio.reduce((sum, item) => sum + item.currentValue, 0);
  }, [myPortfolio]);

  const handleTrade = async () => {
    if (!selectedStock || !tradeShares) return;

    const shares = parseInt(tradeShares);
    if (isNaN(shares) || shares <= 0) {
      toast.error("Please enter a valid number of shares");
      return;
    }

    try {
      if (tradeType === "buy") {
        const result = await buyStock({
          stockId: selectedStock._id,
          shares: shares,
        });
        toast.success(
          `Bought ${shares} shares of ${
            selectedStock.symbol
          } for ${formatCurrency(result.totalCost)}`
        );
      } else {
        const result = await sellStock({
          stockId: selectedStock._id,
          shares: shares,
        });
        toast.success(
          `Sold ${shares} shares of ${
            selectedStock.symbol
          } for ${formatCurrency(result.totalProceeds)}`
        );
      }
      setTradeDialogOpen(false);
      setTradeShares("");
    } catch (error: any) {
      toast.error(error.message || "Trade failed");
    }
  };

  const openTradeDialog = (stock: any, type: "buy" | "sell") => {
    setSelectedStock(stock);
    setTradeType(type);
    setTradeDialogOpen(true);
  };

  const getHoldingShares = (stockId: Id<"stocks">) => {
    const holding = myPortfolio?.find((h) => h.stockId === stockId);
    return holding?.shares || 0;
  };

  const getSectorColor = (sector: string) => {
    const colors: Record<string, string> = {
      tech: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      energy: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      finance: "bg-green-500/10 text-green-600 border-green-500/20",
      healthcare: "bg-red-500/10 text-red-600 border-red-500/20",
      consumer: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    };
    return colors[sector] || "bg-gray-500/10 text-gray-600 border-gray-500/20";
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Header */}
          <div className="flex flex-col gap-3">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-primary/70 bg-clip-text text-transparent">
                Stock Market
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Trade stocks with realistic price movements, volatility, and
                market dynamics.
              </p>
            </div>

            {/* Market Stats */}
            {marketOverview && (
              <div className="grid gap-3 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Market Cap
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(marketOverview.totalMarketCap)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Avg. Change
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-2xl font-bold ${
                        marketOverview.averageChange24h >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {marketOverview.averageChange24h >= 0 ? "+" : ""}
                      {(marketOverview.averageChange24h * 100).toFixed(2)}%
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Stocks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {marketOverview.stockCount}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Sectors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {marketOverview.sectors.length}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <Tabs defaultValue="market" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="market">
                <Activity className="mr-2 h-4 w-4" />
                Market
              </TabsTrigger>
              <TabsTrigger value="portfolio">
                <Wallet className="mr-2 h-4 w-4" />
                My Portfolio
              </TabsTrigger>
            </TabsList>

            {/* Market Tab */}
            <TabsContent value="market" className="space-y-4">
              {/* Search, Filter, and Sort */}
              <div className="grid gap-3 md:grid-cols-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Search stocks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Select value={sectorFilter} onValueChange={setSectorFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Sectors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sectors</SelectItem>
                      {sectors
                        .filter((s): s is string => s !== undefined)
                        .map((sector) => (
                          <SelectItem key={sector} value={sector}>
                            {sector.charAt(0).toUpperCase() + sector.slice(1)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
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

              {/* Stock List */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredStocks.map((stock) => {
                  const priceChange = (stock.lastPriceChange ?? 0) * 100;
                  const isPositive = priceChange >= 0;
                  const holdingShares = getHoldingShares(stock._id);

                  return (
                    <Card
                      key={stock._id}
                      className="hover:shadow-lg transition-shadow"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                              <Building2 className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">
                                {stock.symbol}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {stock.name}
                              </p>
                            </div>
                          </div>
                          {priceChange !== 0 && (
                            <Badge
                              variant={isPositive ? "default" : "destructive"}
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
                        <div className="mt-2">
                          <Badge
                            variant="outline"
                            className={getSectorColor(stock.sector ?? "other")}
                          >
                            {(stock.sector ?? "other").charAt(0).toUpperCase() +
                              (stock.sector ?? "other").slice(1)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-1">
                          <div className="text-2xl font-bold">
                            {formatCurrency(stock.currentPrice ?? 0)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Market Cap: {formatCurrency(stock.marketCap ?? 0)}
                          </div>
                          {holdingShares > 0 && (
                            <div className="text-xs text-primary font-medium">
                              You own: {holdingShares.toLocaleString()} shares
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => openTradeDialog(stock, "buy")}
                            className="flex-1"
                            size="sm"
                          >
                            <ArrowUpRight className="mr-1 h-4 w-4" />
                            Buy
                          </Button>
                          <Button
                            onClick={() => openTradeDialog(stock, "sell")}
                            variant="outline"
                            className="flex-1"
                            size="sm"
                            disabled={holdingShares === 0}
                          >
                            <ArrowDownRight className="mr-1 h-4 w-4" />
                            Sell
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {filteredStocks.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">
                      No stocks found
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {searchQuery || sectorFilter !== "all"
                        ? "Try adjusting your filters"
                        : "No stocks available yet"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Portfolio Tab */}
            <TabsContent value="portfolio" className="space-y-4">
              {/* Portfolio Summary */}
              <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
                <CardHeader>
                  <CardTitle>Total Portfolio Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {formatCurrency(portfolioTotal)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Across {myPortfolio?.length || 0} stocks
                  </p>
                </CardContent>
              </Card>

              {/* Holdings */}
              <div className="space-y-3">
                {myPortfolio && myPortfolio.length > 0 ? (
                  myPortfolio.map((holding) => {
                    if (!holding.stock) return null;
                    const stock = holding.stock;
                    const isProfitable = holding.gainLoss >= 0;

                    return (
                      <Card key={holding._id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                <Building2 className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <div className="font-semibold flex items-center gap-2">
                                  {stock.symbol}
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${getSectorColor(
                                      stock.sector ?? "other"
                                    )}`}
                                  >
                                    {stock.sector ?? "other"}
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {holding.shares.toLocaleString()} shares
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">
                                {formatCurrency(holding.currentValue)}
                              </div>
                              <div
                                className={`text-sm ${
                                  isProfitable
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {isProfitable ? "+" : ""}
                                {formatCurrency(holding.gainLoss)} (
                                {holding.gainLossPercent.toFixed(2)}%)
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                            <div>
                              <div>Avg. Cost</div>
                              <div className="font-medium text-foreground">
                                {formatCurrency(holding.averageCost)}
                              </div>
                            </div>
                            <div>
                              <div>Current Price</div>
                              <div className="font-medium text-foreground">
                                {formatCurrency(stock.currentPrice ?? 0)}
                              </div>
                            </div>
                            <div>
                              <div>Invested</div>
                              <div className="font-medium text-foreground">
                                {formatCurrency(holding.totalInvested)}
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <Button
                              onClick={() => openTradeDialog(stock, "buy")}
                              variant="outline"
                              size="sm"
                              className="flex-1"
                            >
                              Buy More
                            </Button>
                            <Button
                              onClick={() => openTradeDialog(stock, "sell")}
                              variant="outline"
                              size="sm"
                              className="flex-1"
                            >
                              Sell
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-4 text-lg font-medium">
                        No Holdings Yet
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Start trading stocks to build your portfolio
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Trade Dialog */}
      <Dialog open={tradeDialogOpen} onOpenChange={setTradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tradeType === "buy" ? "Buy" : "Sell"} {selectedStock?.symbol}
            </DialogTitle>
            <DialogDescription>
              {tradeType === "buy"
                ? `Purchase ${selectedStock?.name} shares at current market price`
                : `Sell your ${selectedStock?.name} holdings`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Price</Label>
              <div className="text-2xl font-bold">
                {selectedStock && formatCurrency(selectedStock.currentPrice)}
              </div>
            </div>
            {tradeType === "sell" && (
              <div>
                <Label>Your Holdings</Label>
                <div className="text-lg font-semibold">
                  {selectedStock &&
                    getHoldingShares(selectedStock._id).toLocaleString()}{" "}
                  shares
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
              <Label htmlFor="shares">Number of Shares</Label>
              <Input
                id="shares"
                type="number"
                placeholder="0"
                value={tradeShares}
                onChange={(e) => setTradeShares(e.target.value)}
                min="1"
                step="1"
              />
            </div>
            {tradeShares && selectedStock && (
              <div className="rounded-lg bg-muted p-3">
                <div className="flex justify-between text-sm">
                  <span>Estimated Total</span>
                  <span className="font-semibold">
                    {formatCurrency(
                      parseInt(tradeShares || "0") * selectedStock.currentPrice
                    )}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Bid/ask spread and price impact may apply
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTradeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTrade} disabled={!tradeShares}>
              {tradeType === "buy" ? "Buy" : "Sell"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
