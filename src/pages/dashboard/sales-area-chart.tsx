import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { runSql } from "@/runSql";

type ChartData = {
  date: string;
  revenue: number;
};

const chartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function SalesAreaChart() {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [currency, setCurrency] = useState<string>("DZD");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sanitize number inputs
  const sanitizeNumber = (value: number) => {
    const num = Number(value);
    if (isNaN(num) || !Number.isInteger(num) || num < 0) {
      throw new Error("Invalid number input");
    }
    return num;
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch currency from store_info
        const storeQuery = `SELECT currency FROM store_info WHERE id = 1`;
        // @ts-ignore
        const storeRes: { rows: { currency: string }[] } = await runSql(storeQuery);
        setCurrency(storeRes.rows?.[0]?.currency || "DZD");

        // Fetch revenue by day for last 30 days
        const limit = 30;
        const query = `
          SELECT substr(created_at, 1, 10) as date, SUM(total_price) as revenue
          FROM sales
          GROUP BY date
          ORDER BY date DESC
          LIMIT ${sanitizeNumber(limit)}
        `;
        // @ts-ignore
        const res: { rows: ChartData[] } = await runSql(query);
        setChartData((res.rows || []).reverse());
      } catch (err) {
        console.error("Error fetching sales data:", err);
        setError("Failed to load sales data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Revenue (Last 30 Days)</CardTitle>
        <CardDescription>Revenue trend, daily totals</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {!loading && !error && (
          <ChartContainer config={chartConfig}>
            <AreaChart
              data={chartData}
              margin={{ left: 12, right: 12, top: 12 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(val) => new Date(val).toLocaleDateString()}
                    // @ts-ignore
                    valueFormatter={(value) =>
                      `${currency} ${Number(value).toFixed(2)}`
                    }
                  />
                }
              />
              <Area
                dataKey="revenue"
                type="natural"
                fill="var(--chart-1)"
                fillOpacity={0.3}
                stroke="var(--chart-1)"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 font-medium">
              Trending up <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground">
              {/* @ts-ignore */}
              {chartData[0]?.date} - {chartData.at(-1)?.date}
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}