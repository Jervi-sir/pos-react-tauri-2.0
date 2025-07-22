import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import { runSql } from "@/runSql";

const chartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function SalesAreaChart() {
  const [chartData, setChartData] = useState<any[]>([]) as any;
  useEffect(() => {
    (async () => {
      // Query: revenue by day for last 30 days
      const res: any = await runSql(`
        SELECT substr(created_at,1,10) as date, SUM(total_price) as revenue
        FROM sales
        GROUP BY date
        ORDER BY date DESC
        LIMIT 30
      `);
      setChartData((res.rows || []).reverse());
    })();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Revenue (Last 30 Days)</CardTitle>
        <CardDescription>Revenue trend, daily totals</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            data={chartData}
            margin={{ left: 12, right: 12, top: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={val => new Date(val).toLocaleDateString()}
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
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 font-medium">
              Trending up <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground">
              {chartData[0]?.date} - {chartData.at(-1)?.date}
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
