import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runSql } from "@/runSql";
import { useEffect, useState } from "react";

export const LowStockProduct = () => {
  const [lowStock, setLowStock] = useState<any[]>([]);

  const fetchData = async () => {
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
  }

  useEffect(() => {
    fetchData();
  })

  return (
    <>
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
                lowStock.map((prod) => (
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
    </>
  );
};