import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runSql } from "@/runSql";

type Summary = {
  revenue: number;
  sales: number;
  avgSale: number;
  inventoryValue: number;
};

const currencyFormatter = (n: number) =>
  `DZD ${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
  })}`;

export const SummaryCards = () => {
  const [summary, setSummary] = useState<Summary>({
    revenue: 0,
    sales: 0,
    avgSale: 0,
    inventoryValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const salesQuery = `
        SELECT 
          COUNT(*) as sales, 
          SUM(total_price) as revenue, 
          AVG(total_price) as avgSale 
        FROM invoices
        WHERE invoice_type = 'sold'
      `;
      const inventoryQuery = `
        SELECT SUM(quantity * current_price_unit) as inventoryValue
        FROM products
      `;
      const sres = await runSql(salesQuery);
      const ires = await runSql(inventoryQuery);
      setSummary({
        sales: sres[0]?.sales || 0,
        revenue: Number(sres[0]?.revenue) || 0,
        avgSale: Number(sres[0]?.avgSale) || 0,
        inventoryValue: Number(ires[0]?.inventoryValue) || 0,
      });
    } catch (err) {
      console.error("Error fetching summary stats:", err);
      setError("Failed to load summary stats.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Total Revenue</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-bold">
          {currencyFormatter(summary.revenue)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Total Sales</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-bold">{summary.sales}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Avg Sale</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-bold">
          {currencyFormatter(summary.avgSale)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Inventory Value</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-bold">
          {currencyFormatter(summary.inventoryValue)}
        </CardContent>
      </Card>
    </div>
  );
};