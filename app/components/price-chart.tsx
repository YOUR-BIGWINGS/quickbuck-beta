import { useEffect, useRef, useMemo, memo } from "react";
import { createChart, ColorType, LineSeries } from "lightweight-charts";
import { formatCurrency } from "~/lib/game-utils";
import {
  generatePriceHistory,
  smoothPriceHistory,
  calculatePriceStats,
} from "~/lib/price-chart-utils";
import { useStockPriceHistory } from "~/hooks/use-stock-price-history";
import type { Id } from "convex/_generated/dataModel";

interface PriceChartProps {
  currentPrice: number;
  symbol: string;
  height?: number;
  showStats?: boolean;
  days?: number;
  stockId?: Id<"stocks"> | null;
}

export const PriceChart = memo(function PriceChart({
  currentPrice,
  symbol,
  height = 320,
  showStats = true,
  days = 7,
  stockId,
}: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);

  // Fetch real price history from database with limit for performance
  const realHistory = useStockPriceHistory(stockId, showStats ? undefined : 50);

  // Memoize data processing to avoid recalculation on every render
  const data = useMemo(() => {
    if (realHistory && realHistory.length > 0) {
      // Real data is already in cents, use as-is
      return realHistory;
    }
    // Fallback: generate mock data while real data loads
    return smoothPriceHistory(generatePriceHistory(currentPrice, days, symbol));
  }, [realHistory, currentPrice, days, symbol]);

  // Memoize stats calculation
  const stats = useMemo(() => {
    return calculatePriceStats(
      data.map((d) => ({
        timestamp: d.timestamp ?? 0,
        price: d.price,
        displayTime: d.displayTime ?? "",
        formattedPrice: d.formattedPrice ?? "",
      }))
    );
  }, [data]);

  const isPositive = stats.change >= 0;

  // Memoize chart data transformation
  const chartData = useMemo(() => {
    return data.map((d) => ({
      time: Math.floor((d.timestamp ?? Date.now()) / 1000) as any,
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
        formatter: (price: number) => `$${(price / 100).toFixed(2)}`,
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
            <div className="font-semibold">{formatCurrency(stats.high)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Low</div>
            <div className="font-semibold">{formatCurrency(stats.low)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Avg</div>
            <div className="font-semibold">{formatCurrency(stats.average)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Change</div>
            <div
              className={`font-semibold ${
                isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {isPositive ? "+" : ""}
              {stats.changePercent.toFixed(2)}%
            </div>
          </div>
        </div>
      )}

      <div ref={chartContainerRef} />
    </div>
  );
});
