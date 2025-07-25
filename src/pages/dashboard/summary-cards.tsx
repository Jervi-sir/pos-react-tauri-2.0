import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runSql } from "@/runSql";

type Summary = {
  revenue: number;
  sales: number;
  avgSale: number;
  inventoryValue: number;
};

const currencyFormatter = (n: number, currency: string) =>
  `${currency} ${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
  })}`;

export const SummaryCards = () => {
  const [summary, setSummary] = useState<Summary>({
    revenue: 0,
    sales: 0,
    avgSale: 0,
    inventoryValue: 0,
  });
  const [currency, setCurrency] = useState<string>("DZD");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch currency from store_info
      const storeQuery = `SELECT currency FROM store_info WHERE id = 1`;
      // @ts-ignore
      const storeRes: { rows: { currency: string }[] } = await runSql(storeQuery);
      setCurrency(storeRes.rows?.[0]?.currency || "DZD");

      // Fetch sales stats
      // @ts-ignore
      const sres: { rows: Summary[] } = await runSql(`
        SELECT 
          COUNT(*) as sales, 
          SUM(total_price) as revenue, 
          AVG(total_price) as avgSale 
        FROM sales
      `);
      // Fetch inventory value
      // @ts-ignore
      const ires: { rows: { inventoryValue: number }[] } = await runSql(`
        SELECT SUM(p.current_stock * p.price_unit) as inventoryValue
        FROM products p
      `);
      setSummary({
        sales: sres.rows?.[0]?.sales || 0,
        revenue: Number(sres.rows?.[0]?.revenue) || 0,
        avgSale: Number(sres.rows?.[0]?.avgSale) || 0,
        inventoryValue: Number(ires.rows?.[0]?.inventoryValue) || 0,
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <Card>
        <CardHeader>
          <CardTitle>Total Revenue</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-bold">
          {currencyFormatter(summary.revenue, currency)}
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
          {currencyFormatter(summary.avgSale, currency)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Inventory Value</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-bold">
          {currencyFormatter(summary.inventoryValue, currency)}
        </CardContent>
      </Card>
    </div>
  );
};