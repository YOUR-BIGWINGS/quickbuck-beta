"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { AlertCircle, CheckCircle, Loader } from "lucide-react";

export default function AdminStocksPage() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const initializeStockMarket = useMutation(api.stocks.initializeStockMarket);
  const getAllStocks = useQuery(api.stocks.getAllStocks);

  const handleInitialize = async () => {
    try {
      setIsInitializing(true);
      setError("");
      setResult(null);
      const res = await initializeStockMarket();
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Initialization failed");
    } finally {
      setIsInitializing(false);
    }
  };

  const stockCount = getAllStocks?.length || 0;
  const isInitialized = stockCount >= 5;

  return (
    <div className="flex flex-1 flex-col p-6">
      <h1 className="text-3xl font-bold mb-6">Admin - Stock Market</h1>

      <div className="grid gap-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Stock Market Status</span>
              <Badge
                variant={isInitialized ? "default" : "destructive"}
                className="flex items-center gap-2"
              >
                {isInitialized ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Initialized
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    Not Initialized
                  </>
                )}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Stocks Created</p>
                <p className="text-3xl font-bold">{stockCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Required</p>
                <p className="text-3xl font-bold">5</p>
              </div>
            </div>

            {isInitialized && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                Stock market is properly initialized with {stockCount} stocks.
              </div>
            )}

            {!isInitialized && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                {stockCount === 0
                  ? "Stock market has not been initialized. Click below to initialize with default stocks."
                  : `Stock market is partially initialized (${stockCount}/5 stocks). Run initialization to complete setup.`}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Initialization Card */}
        <Card>
          <CardHeader>
            <CardTitle>Initialize Stock Market</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Creates 5 default stocks (TCH, ENRG, GFC, MHS, CGC) with initial
              price data and trading history. This only needs to be run once.
            </p>

            <Button
              onClick={handleInitialize}
              disabled={isInitializing || isInitialized}
              size="lg"
              className="w-full"
            >
              {isInitializing ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Initializing...
                </>
              ) : isInitialized ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Already Initialized
                </>
              ) : (
                "Initialize Stock Market"
              )}
            </Button>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p className="font-semibold">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {result && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                <p className="font-semibold">Success!</p>
                <p className="text-sm mt-2">
                  Created {result.stocksCreated} stocks
                </p>
                {result.stocks && (
                  <ul className="text-sm mt-2 space-y-1">
                    {result.stocks.slice(0, 5).map((id: string) => (
                      <li key={id}>✓ Stock {id.slice(-6)}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stocks List */}
        {getAllStocks && getAllStocks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Active Stocks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getAllStocks.map((stock) => (
                  <div
                    key={stock._id}
                    className="flex justify-between items-center p-3 bg-muted rounded border"
                  >
                    <div>
                      <p className="font-semibold">{stock.symbol}</p>
                      <p className="text-xs text-muted-foreground">
                        {stock.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        ${((stock.currentPrice ?? 0) / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {stock.sector}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
