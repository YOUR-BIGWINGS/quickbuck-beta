"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { formatCurrency } from "~/lib/game-utils";
import { TrendingUp, TrendingDown, Search, Building2 } from "lucide-react";
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect, Link } from "react-router";
import { PriceChart } from "~/components/price-chart";

export async function loader(args: any) {
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

export default function StocksPage() {
  // Queries
  const allStocks = useQuery(api.stocks.getAllStocks);
  const marketOverview = useQuery(api.stocks.getMarketOverview);

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<
    "price-asc" | "price-desc" | "marketcap-desc" | "change-desc"
  >("marketcap-desc");

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
            {!marketOverview ? (
              <div className="grid gap-3 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardContent className="pt-6 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-7 w-32" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium text-muted-foreground">
                      Total Market Cap
                    </div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(marketOverview.totalMarketCap)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium text-muted-foreground">
                      Avg. Change
                    </div>
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
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium text-muted-foreground">
                      Stocks
                    </div>
                    <div className="text-2xl font-bold">
                      {marketOverview.stockCount}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium text-muted-foreground">
                      Sectors
                    </div>
                    <div className="text-2xl font-bold">
                      {marketOverview.sectors.length}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

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
                  <SelectItem value="price-asc">Price (Low to High)</SelectItem>
                  <SelectItem value="change-desc">Biggest Movers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stock Cards Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {!allStocks ? (
              // Skeleton loading state
              <>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Card key={i}>
                    <CardContent className="pt-6 space-y-4">
                      {/* Logo and ticker skeleton */}
                      <div className="flex items-start gap-3">
                        <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                        <div className="flex-1 min-w-0 space-y-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>

                      {/* Chart skeleton */}
                      <Skeleton className="h-20 rounded-lg" />

                      {/* Market cap skeleton */}
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-5 w-32" />
                      </div>

                      {/* Price and change skeleton */}
                      <div className="flex items-end justify-between">
                        <div className="space-y-1">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-6 w-32" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              filteredStocks.map((stock) => {
                const priceChange = (stock.lastPriceChange ?? 0) * 100;
                const isPositive = priceChange >= 0;

                return (
                  <Link
                    to={`/stocks/${stock.symbol}`}
                    key={stock._id}
                    className="block"
                  >
                    <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
                      <CardContent className="pt-6 space-y-4">
                        {/* Company Logo, Ticker, Name */}
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 flex-shrink-0 overflow-hidden">
                            {stock.companyLogo ? (
                              <img
                                src={stock.companyLogo}
                                alt={stock.symbol}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Building2 className="h-6 w-6 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-lg">
                              {stock.symbol}
                            </div>
                            <div className="text-sm text-muted-foreground truncate">
                              {stock.name}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={getSectorColor(stock.sector ?? "other")}
                          >
                            {(stock.sector ?? "other").toUpperCase()}
                          </Badge>
                        </div>

                        {/* Mini 7-day chart */}
                        <div className="h-20 rounded-lg overflow-hidden">
                          <PriceChart
                            currentPrice={stock.currentPrice ?? 0}
                            symbol={stock.symbol || ""}
                            height={80}
                            showStats={false}
                            days={7}
                            stockId={stock._id}
                          />
                        </div>

                        {/* Market Cap */}
                        <div>
                          <div className="text-xs text-muted-foreground">
                            Market Cap
                          </div>
                          <div className="font-semibold">
                            {formatCurrency(stock.marketCap ?? 0)}
                          </div>
                        </div>

                        {/* Share Price and Change */}
                        <div className="flex items-end justify-between">
                          <div>
                            <div className="text-xs text-muted-foreground">
                              Share Price
                            </div>
                            <div className="text-2xl font-bold">
                              {formatCurrency(stock.currentPrice ?? 0)}
                            </div>
                          </div>
                          {priceChange !== 0 && (
                            <Badge
                              variant={isPositive ? "default" : "destructive"}
                              className="h-fit"
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
                      </CardContent>
                    </Card>
                  </Link>
                );
              })
            )}
          </div>

          {allStocks && filteredStocks.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No stocks found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try adjusting your search or filters
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
