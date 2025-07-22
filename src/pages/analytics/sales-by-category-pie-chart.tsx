import { useEffect, useState } from "react";
import { Pie, PieChart } from "recharts";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import { runSql } from "@/runSql";

const chartConfig = {
  total: { label: "Sales" },
} satisfies ChartConfig;

export function SalesByCategoryPieChart() {
  const [chartData, setChartData] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const res: any = await runSql(`
        SELECT c.name as category, SUM(si.subtotal) as total
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        GROUP BY c.id
        ORDER BY total DESC
      `);
      setChartData(res.rows || []);
    })();
  }, []);
  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Sales by Category</CardTitle>
        <CardDescription>Revenue share by category</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px] pb-0"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie data={chartData} dataKey="total" nameKey="category" label />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          Sales distribution by category
        </div>
      </CardFooter>
    </Card>
  );
}
