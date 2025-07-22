import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runSql } from "@/runSql";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { SalesByCategoryPieChart } from "./sales-by-category-pie-chart";
import { TopProductsBarChart } from "./top-products-bar-chart";
import { SalesAreaChart } from "./sales-area-chart";

// Utility for formatting
const currency = (n: number) => "DA" + (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ revenue: 0, sales: 0, avgSale: 0, inventoryValue: 0 });
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [categorySales, setCategorySales] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      // Summary Cards
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

      // Sales Trend (last 30 days)
      const trendRes: any = await runSql(`
        SELECT substr(created_at, 1, 10) as date, SUM(total_price) as daily_revenue
        FROM sales
        GROUP BY date
        ORDER BY date DESC
        LIMIT 30
      `);
      setSalesTrend((trendRes.rows || []).reverse());

      // Top Products
      const prodRes: any = await runSql(`
        SELECT p.name, SUM(si.quantity) as units_sold, SUM(si.subtotal) as total_sales
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        GROUP BY si.product_id
        ORDER BY units_sold DESC
        LIMIT 7
      `);
      setTopProducts(prodRes.rows || []);

      // Sales by Category
      const catRes: any = await runSql(`
        SELECT c.name as category, SUM(si.subtotal) as total_sales
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        GROUP BY c.id
        ORDER BY total_sales DESC
      `);
      setCategorySales(catRes.rows || []);

      // Low Stock Products (threshold = 5)
      const lowRes: any = await runSql(`
        SELECT p.id, p.name, p.barcode,
          IFNULL((SELECT SUM(se.quantity) FROM stock_entries se WHERE se.product_id = p.id), 0)
          - IFNULL((SELECT SUM(si.quantity) FROM sale_items si WHERE si.product_id = p.id), 0)
          as current_stock
        FROM products p
        HAVING current_stock <= 5
        ORDER BY current_stock ASC
        LIMIT 10
      `);
      setLowStock(lowRes.rows || []);

      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold mb-6">Analytics</h2>

      {/* Summary Cards */}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Sales Trend Line Chart */}
        <SalesAreaChart />
        {/* Top Products Bar Chart */}
        <TopProductsBarChart />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        {/* Category Pie Chart */}
        <SalesByCategoryPieChart />
        {/* Low Stock Table */}
        <Card>
          <CardHeader><CardTitle>Low Stock Products</CardTitle></CardHeader>
          <CardContent>
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left px-2 py-1">Product</th>
                  <th className="text-left px-2 py-1">Barcode</th>
                  <th className="text-right px-2 py-1">Stock</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-gray-400 py-2">All stock ok</td>
                  </tr>
                ) : (
                  lowStock.map((prod, idx) => (
                    <tr key={prod.id}>
                      <td className="px-2 py-1">{prod.name}</td>
                      <td className="px-2 py-1">{prod.barcode}</td>
                      <td className="px-2 py-1 text-right font-semibold text-red-600">{prod.current_stock}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
