import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runSql } from "@/runSql";

type Product = {
  id: number;
  name: string;
  barcode: string;
  current_stock: number;
};

export const LowStockProduct = () => {
  const [lowStock, setLowStock] = useState<Product[]>([]);
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

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const threshold = 5;
      const limit = 10;
      const query = `
        SELECT p.id, p.name, p.barcode, p.current_stock
        FROM products p
        WHERE p.current_stock <= ${sanitizeNumber(threshold)}
        ORDER BY p.current_stock ASC
        LIMIT ${sanitizeNumber(limit)}
      `;
      const res: { rows: Product[] } = await runSql(query);
      setLowStock(res.rows || []);
    } catch (err) {
      console.error("Error fetching low stock products:", err);
      setError("Failed to load low stock products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Low Stock Products</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {!loading && !error && (
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
                  <td colSpan={3} className="text-center text-gray-400 py-2">
                    All stock ok
                  </td>
                </tr>
              ) : (
                lowStock.map((prod) => (
                  <tr key={prod.id}>
                    <td className="px-2 py-1">{prod.name}</td>
                    <td className="px-2 py-1">{prod.barcode}</td>
                    <td className="px-2 py-1 text-right font-semibold text-red-600">
                      {prod.current_stock}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
};