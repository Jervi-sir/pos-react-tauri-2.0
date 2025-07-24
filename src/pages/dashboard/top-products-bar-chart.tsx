import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import { runSql } from "@/runSql";

const chartConfig = {
  units: { label: "Units Sold", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function TopProductsBarChart() {
  const [chartData, setChartData] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      // Query: top 7 products by units sold
      const res: any = await runSql(`
        SELECT p.name, SUM(si.quantity) as units
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        GROUP BY si.product_id
        ORDER BY units DESC
        LIMIT 7
      `);
      setChartData(res.rows || []);
    })();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Selling Products</CardTitle>
        <CardDescription>By units sold (top 7)</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip
              content={<ChartTooltipContent className="w-[150px]" nameKey="units" />}
            />
            <Bar dataKey="units" fill="var(--chart-2)" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
