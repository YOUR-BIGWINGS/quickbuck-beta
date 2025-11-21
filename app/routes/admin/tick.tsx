"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export default function AdminTickPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const manualTick = useMutation(api.tick.manualTick);
  const tickHistory = useQuery(api.tick.getTickHistory, {});

  const handleTick = async () => {
    try {
      setIsRunning(true);
      setError("");
      const res = await manualTick();
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tick failed");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col p-6">
      <h1 className="text-3xl font-bold mb-6">Admin - Manual Tick Trigger</h1>

      <div className="grid gap-6">
        {/* Tick Trigger Card */}
        <Card>
          <CardHeader>
            <CardTitle>Trigger Tick</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleTick}
              disabled={isRunning}
              size="lg"
              className="w-full"
            >
              {isRunning ? "Running..." : "Execute Tick"}
            </Button>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {result && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                <p className="font-semibold">
                  Tick #{result.tickNumber} Completed
                </p>
                <p className="text-sm mt-2">
                  Bot Purchases: {result.botPurchases}
                </p>
                <p className="text-sm">
                  Crypto Updates: {result.cryptoUpdates}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Ticks */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Ticks</CardTitle>
          </CardHeader>
          <CardContent>
            {!tickHistory || tickHistory.length === 0 ? (
              <p className="text-muted-foreground">No ticks recorded yet</p>
            ) : (
              <div className="space-y-2">
                {tickHistory.slice(0, 10).map((tick: any) => (
                  <div
                    key={tick._id}
                    className="flex justify-between items-center p-2 bg-muted rounded"
                  >
                    <div>
                      <p className="font-semibold">Tick #{tick.tickNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tick.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p>Purchases: {tick.botPurchases?.length || 0}</p>
                      <p>Updates: {tick.cryptoPriceUpdates?.length || 0}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
