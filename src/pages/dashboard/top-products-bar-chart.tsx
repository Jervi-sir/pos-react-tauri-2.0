import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
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
  name: string;
  units: number;
};

const chartConfig = {
  units: { label: "Units Sold", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function TopProductsBarChart() {
  const [chartData, setChartData] = useState<ChartData[]>([]);
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
        const limit = 7;
        const query = `
          SELECT p.name, SUM(sp.quantity) as units
          FROM sale_products sp
          LEFT JOIN products p ON sp.product_id = p.id
          GROUP BY sp.product_id
          ORDER BY units DESC
          LIMIT ${sanitizeNumber(limit)}
        `;
        const res: { rows: ChartData[] } = await runSql(query);
        setChartData(res.rows || []);
      } catch (err) {
        console.error("Error fetching top products:", err);
        setError("Failed to load top products.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Selling Products</CardTitle>
        <CardDescription>By units sold (top 7)</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {!loading && !error && (
          <ChartContainer config={chartConfig}>
            <BarChart data={chartData} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                content={<ChartTooltipContent className="w-[150px]" nameKey="units" />}
              />
              <Bar dataKey="units" fill="var(--chart-2)" />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}