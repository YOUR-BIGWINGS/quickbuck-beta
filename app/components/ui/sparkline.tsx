"use client";

import { memo } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";

export type SparklinePoint = { timestamp: number; price: number };

type SparklineProps = {
  data: SparklinePoint[] | undefined;
  positive?: boolean;
  height?: number;
  stroke?: string;
  className?: string;
};

// Minimal, fast sparkline for compact cards
export const Sparkline = memo(function Sparkline({
  data,
  positive,
  height = 48,
  stroke,
  className,
}: SparklineProps) {
  const color = stroke || (positive ? "#16a34a" : "#dc2626"); // green/red
  const safeData = (data && data.length > 1 ? data : []).map((d) => ({
    t: d.timestamp,
    p: d.price,
  }));

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={safeData}
          margin={{ left: 0, right: 0, top: 6, bottom: 0 }}
        >
          {/* Hidden tooltip for better hover feeling without labels */}
          <Tooltip
            cursor={{ stroke: color, strokeOpacity: 0.15 }}
            content={<div />}
          />
          <Line
            type="monotone"
            dataKey="p"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            animationDuration={400}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});
