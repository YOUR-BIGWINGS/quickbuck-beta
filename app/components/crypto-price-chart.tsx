import { useEffect, useRef, useMemo, memo } from "react";
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

export const CryptoPriceChart = memo(function CryptoPriceChart({
  cryptoId,
  currentPrice,
  symbol,
  height = 320,
  showStats = true,
}: CryptoPriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);

  // Fetch actual price history from database - reduce data for mini charts
  const priceHistoryRaw = useQuery(api.crypto.getPriceHistory, {
    cryptoId,
    limit: showStats ? 168 : 50, // ~7 days for full, ~2 days for mini charts
  });

  // Memoize data transformation to avoid recalculation on every render
  const data: ChartDataPoint[] = useMemo(() => {
    const result: ChartDataPoint[] = [];

    if (priceHistoryRaw && priceHistoryRaw.length > 0) {
      // Sort by timestamp ascending (oldest first)
      const sorted = [...priceHistoryRaw].reverse();

      sorted.forEach((item) => {
        const date = new Date(item.timestamp);
        result.push({
          timestamp: item.timestamp,
          price: item.close ?? item.open ?? currentPrice,
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
    if (result.length === 0) {
      const now = new Date();
      result.push({
        timestamp: Date.now(),
        price: currentPrice,
        displayTime: now.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      });
    }

    return result;
  }, [priceHistoryRaw, currentPrice]);

  // Memoize statistics calculation
  const { high, low, average, change, changePercent, isPositive } = useMemo(() => {
    const prices = data.map((d) => d.price);
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const average = prices.reduce((a, b) => a + b, 0) / prices.length;
    const change = prices[prices.length - 1] - prices[0];
    const changePercent = (change / prices[0]) * 100;
    const isPositive = change >= 0;

    return { high, low, average, change, changePercent, isPositive };
  }, [data]);

  // Memoize chart data transformation
  const chartData = useMemo(() => {
    return data.map((d) => ({
      time: Math.floor(d.timestamp / 1000) as any,
      value: d.price,
    }));
  }, [data]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Reuse chart instance if it exists
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = createChart(chartContainerRef.current, {
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
    }

    const chart = chartInstanceRef.current;

    // Remove existing series if any
    const existingSeries = chart.getSeries?.();
    if (existingSeries) {
      existingSeries.forEach((series: any) => chart.removeSeries(series));
    }

    const lineSeries = chart.addSeries(LineSeries, {
      color: isPositive ? "#10b981" : "#ef4444",
      lineWidth: 3,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => `${price.toFixed(2)}¢`,
      },
    });

    lineSeries.setData(chartData);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      // Don't remove chart on every update, only on unmount
    };
  }, [chartData, height, isPositive]);

  // Cleanup chart instance only on unmount
  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, []);

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
});
