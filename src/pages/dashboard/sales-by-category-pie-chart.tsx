import { useEffect, useState } from "react";
import { Pie, PieChart } from "recharts";
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
  category: string;
  total: number;
};

const chartConfig = {
  total: { label: "Sales" },
} satisfies ChartConfig;

export function SalesByCategoryPieChart() {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [currency, setCurrency] = useState<string>("DZD");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch currency from store_info
        const storeQuery = `SELECT currency FROM store_info WHERE id = 1`;
        const storeRes: { rows: { currency: string }[] } = await runSql(storeQuery);
        setCurrency(storeRes.rows?.[0]?.currency || "DZD");

        // Fetch sales by category
        const query = `
          SELECT c.name as category, SUM(sp.quantity * sp.price_unit) as total
          FROM sale_products sp
          LEFT JOIN products p ON sp.product_id = p.id
          LEFT JOIN categories c ON p.category_id = c.id
          GROUP BY c.id
          ORDER BY total DESC
        `;
        const res: { rows: ChartData[] } = await runSql(query);
        setChartData(res.rows || []);
      } catch (err) {
        console.error("Error fetching sales by category:", err);
        setError("Failed to load sales by category.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Sales by Category</CardTitle>
        <CardDescription>Revenue share by category</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {!loading && !error && (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[250px] pb-0"
          >
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    valueFormatter={(value) =>
                      `${currency} ${Number(value).toFixed(2)}`
                    }
                  />
                }
              />
              <Pie data={chartData} dataKey="total" nameKey="category" label />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          Sales distribution by category
        </div>
      </CardFooter>
    </Card>
  );
}