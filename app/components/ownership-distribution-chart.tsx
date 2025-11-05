import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { Id } from "convex/_generated/dataModel";

interface OwnershipData {
  name: string;
  value: number;
  color: string;
}

export interface RawOwnershipData {
  playerId: Id<"players">;
  playerName: string;
  shares?: number;
  balance?: number;
}

interface OwnershipDistributionChartProps {
  data?: RawOwnershipData[];
  currentPlayerId?: Id<"players">;
  height?: number;
  type?: "shares" | "balance";
}

// Color palette for different owners
const COLORS = [
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#10b981", // Green
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#14b8a6", // Teal
];

export function OwnershipDistributionChart({
  data,
  currentPlayerId,
  height = 256,
  type = "shares",
}: OwnershipDistributionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No ownership data available
      </div>
    );
  }

  // Transform raw data into chart format
  const chartData: OwnershipData[] = [];
  let othersTotal = 0;
  const TOP_OWNERS = 5; // Show top 5 owners individually

  data.forEach((owner, index) => {
    const value = type === "shares" ? owner.shares || 0 : owner.balance || 0;
    const isCurrentPlayer =
      currentPlayerId && owner.playerId === currentPlayerId;
    const name = isCurrentPlayer
      ? `${owner.playerName} (You)`
      : owner.playerName;

    if (index < TOP_OWNERS) {
      chartData.push({
        name,
        value,
        color: COLORS[index % COLORS.length],
      });
    } else {
      othersTotal += value;
    }
  });

  // Add "Others" category if there are more than TOP_OWNERS
  if (data.length > TOP_OWNERS) {
    chartData.push({
      name: `Others (${data.length - TOP_OWNERS})`,
      value: othersTotal,
      color: "#6b7280", // Gray
    });
  }

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No ownership data available
      </div>
    );
  }

  const formattedData = chartData.map((item) => ({
    ...item,
    percentage: ((item.value / total) * 100).toFixed(1),
  }));

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 text-sm">
        {formattedData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <div className="min-w-0">
              <div
                className="text-muted-foreground text-xs truncate"
                title={item.name}
              >
                {item.name}
              </div>
              <div className="font-semibold">{item.percentage}%</div>
            </div>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={formattedData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            animationDuration={800}
            label={({ percentage }) => `${percentage}%`}
          >
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any) => {
              const percentage = ((value / total) * 100).toFixed(1);
              const formattedValue =
                type === "shares" ? value.toLocaleString() : value.toFixed(4);
              return [`${formattedValue} (${percentage}%)`, "Value"];
            }}
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "0.5rem",
              padding: "0.75rem",
              color: "#e5e7eb",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
