import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runSql } from "@/runSql";
import { useEffect, useState } from "react";

const currency = (n: number) => "DA" + (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

export const SummaryCards = () => {
  // const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ revenue: 0, sales: 0, avgSale: 0, inventoryValue: 0 });

  const fetchStats = async () => {
    // setLoading(true);
    const sres: any = await runSql("SELECT COUNT(*) as sales, SUM(total_price) as revenue, AVG(total_price) as avgSale FROM sales");
    const ires: any = await runSql(`
        SELECT SUM(
          (IFNULL((SELECT SUM(se.quantity) FROM stock_entries se WHERE se.product_id = p.id), 0)
            - IFNULL((SELECT SUM(si.quantity) FROM sale_items si WHERE si.product_id = p.id), 0)
          ) * price_unit
        ) as inventoryValue
        FROM products p
      `);
    setSummary({
      sales: sres.rows?.[0]?.sales || 0,
      revenue: Number(sres.rows?.[0]?.revenue) || 0,
      avgSale: Number(sres.rows?.[0]?.avgSale) || 0,
      inventoryValue: Number(ires.rows?.[0]?.inventoryValue) || 0,
    });
    // setLoading(false);
  }

  useEffect(() => {
    fetchStats();
  });

  // if (loading) return null;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader><CardTitle>Total Revenue</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{currency(summary.revenue)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Sales</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{summary.sales}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Avg Sale</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{currency(summary.avgSale)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Inventory Value</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{currency(summary.inventoryValue)}</CardContent>
        </Card>
      </div>
    </>
  );
};