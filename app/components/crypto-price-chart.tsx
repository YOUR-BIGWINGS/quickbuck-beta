import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { createChart, ColorType, LineSeries } from "lightweight-charts";
import { formatCurrency } from "~/lib/game-utils";
import type { Id } from "convex/_generated/dataModel";

interface CryptoPriceChartProps {
  cryptoId: Id<"cryptocurrencies">;
  currentPrice: number;
  symbol: string;
  height?: number;
  showStats?: boolean;
}

interface ChartDataPoint {
  timestamp: number;
  price: number;
  displayTime: string;
}

export function CryptoPriceChart({
  cryptoId,
  currentPrice,
  symbol,
  height = 320,
  showStats = true,
}: CryptoPriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Fetch actual price history from database
  const priceHistoryRaw = useQuery(api.crypto.getPriceHistory, {
    cryptoId,
    limit: 168, // ~7 days of hourly data
  });

  // Transform database data to chart format
  const data: ChartDataPoint[] = [];
  if (priceHistoryRaw && priceHistoryRaw.length > 0) {
    // Sort by timestamp ascending (oldest first)
    const sorted = [...priceHistoryRaw].reverse();

    sorted.forEach((item) => {
      const date = new Date(item.timestamp);
      data.push({
        timestamp: item.timestamp,
        price: item.close ?? item.open ?? currentPrice, // Use close if available, fall back to open
        displayTime: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    });
  }

  // If no data, show current price as a single point
  if (data.length === 0) {
    const now = new Date();
    data.push({
      timestamp: Date.now(),
      price: currentPrice,
      displayTime: now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    });
  }

  // Calculate statistics
  const prices = data.map((d) => d.price);
  const high = Math.max(...prices);
  const low = Math.min(...prices);
  const average = prices.reduce((a, b) => a + b, 0) / prices.length;
  const change = prices[prices.length - 1] - prices[0];
  const changePercent = (change / prices[0]) * 100;

  const isPositive = change >= 0;

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
        attributionLogo: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      grid: {
        vertLines: { color: "#e5e7eb" },
        horzLines: { color: "#e5e7eb" },
      },
      rightPriceScale: {
        borderColor: "#e5e7eb",
      },
      timeScale: {
        borderColor: "#e5e7eb",
      },
    });

    const lineSeries = chart.addSeries(LineSeries, {
      color: isPositive ? "#10b981" : "#ef4444",
      lineWidth: 3,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => `${price.toFixed(2)}¢`,
      },
    });

    // Transform data for TradingView (time-based horizontal scale using timestamps)
    const chartData = data.map((d) => ({
      time: Math.floor(d.timestamp / 1000) as any, // Convert to Unix timestamp in seconds
      value: d.price,
    }));

    lineSeries.setData(chartData);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, height, isPositive]);

  return (
    <div className="w-full space-y-3">
      {showStats && (
        <div className="grid grid-cols-4 gap-2 text-sm">
          <div>
            <div className="text-muted-foreground">High</div>
            <div className="font-semibold">{high.toFixed(2)}¢</div>
          </div>
          <div>
            <div className="text-muted-foreground">Low</div>
            <div className="font-semibold">{low.toFixed(2)}¢</div>
          </div>
          <div>
            <div className="text-muted-foreground">Avg</div>
            <div className="font-semibold">{average.toFixed(2)}¢</div>
          </div>
          <div>
            <div className="text-muted-foreground">Change</div>
            <div
              className={`font-semibold ${
                isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {isPositive ? "+" : ""}
              {changePercent.toFixed(2)}%
            </div>
          </div>
        </div>
      )}

      <div ref={chartContainerRef} />
    </div>
  );
}
