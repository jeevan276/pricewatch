import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { PriceHistory } from "../../types/product";

interface PriceChartProps {
  history: PriceHistory[];
}

interface ChartData {
  timestamp: string;
  date: string;
  price: number;
  change: number;
  trend: "up" | "down" | "same";
}

const formatPrice = (value: number) =>
  `Rs. ${value.toLocaleString("en-IN")}`;

const formatDate = (date: Date) =>
  date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function PriceChart({ history }: PriceChartProps) {
  const chartData: ChartData[] = [...history]
    .filter((item) => {
      const timestamp = new Date(item.checked_at).getTime();
      const price = Number(item.price);

      return Number.isFinite(timestamp) && Number.isFinite(price);
    })
    .sort(
      (a, b) =>
        new Date(a.checked_at).getTime() -
        new Date(b.checked_at).getTime(),
    )
    .map((item, index, sortedHistory) => {
      const date = new Date(item.checked_at);
      const price = Number(item.price);

      const previousPrice =
        index > 0 ? Number(sortedHistory[index - 1].price) : price;

      const change = price - previousPrice;

      const trend: ChartData["trend"] =
        change > 0 ? "up" : change < 0 ? "down" : "same";

      return {
        timestamp: item.checked_at,
        date: formatDate(date),
        price,
        change,
        trend,
      };
    });

  if (chartData.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
        No price history available yet.
      </div>
    );
  }

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 10,
            right: 20,
            left: 20,
            bottom: 10,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            minTickGap={30}
          />

          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => formatPrice(Number(value))}
          />

          <Tooltip
            labelFormatter={(_, payload) => {
              const item = payload?.[0]?.payload as
                | ChartData
                | undefined;

              return item
                ? new Date(item.timestamp).toLocaleString()
                : "";
            }}
            formatter={(value) => {
              const numericValue = Number(
                Array.isArray(value) ? value[0] : value,
              );

              return [formatPrice(numericValue), "Price"];
            }}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid var(--border)",
              backgroundColor: "var(--card)",
            }}
          />

          <Line
            type="monotone"
            dataKey="price"
            name="Price"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 