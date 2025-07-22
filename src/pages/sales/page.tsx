import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { runSql } from "@/runSql";

type Sale = {
  id: number;
  total_price: number;
  created_at: string;
  cashier: string;
};

type SaleItem = {
  id: number;
  product_id: number;
  sale_id: number;
  quantity: number;
  price_unit: number;
  subtotal: number;
  created_at: string;
  updated_at: string;
  product_name: string;
  barcode: string;
};

const PAGE_SIZE = 10;

export default function SalesListPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expandedSale, setExpandedSale] = useState<number | null>(null);
  const [saleItems, setSaleItems] = useState<Record<number, SaleItem[]>>({});
  const [page, setPage] = useState(1);

  // Fetch sales
  const fetchSales = async () => {
    setLoading(true);
    const offset = (page - 1) * PAGE_SIZE;
    const res: any = await runSql(`
      SELECT s.id, s.total_price, s.created_at, u.name AS cashier
      FROM sales s
      LEFT JOIN users u ON s.sold_by = u.id
      ORDER BY s.created_at DESC
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `);
    setSales(res.rows || []);
    // Count
    const countRes: any = await runSql("SELECT COUNT(*) as cnt FROM sales");
    setTotalCount(countRes.rows?.[0]?.cnt || 0);
    setLoading(false);
  };

  // Fetch sale items for a sale
  const fetchSaleItems = async (saleId: number) => {
    if (saleItems[saleId]) {
      setExpandedSale(expandedSale === saleId ? null : saleId);
      return; // Already loaded
    }
    const res: any = await runSql(`
      SELECT si.*, p.name as product_name, p.barcode
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ${saleId}
    `);
    setSaleItems(prev => ({
      ...prev,
      [saleId]: res.rows || []
    }));
    setExpandedSale(saleId);
  };

  useEffect(() => {
    fetchSales();
    // eslint-disable-next-line
  }, [page]);

  const pageCount = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold mb-4">Sales</h2>
      {loading && <div>Loading...</div>}
      <div className="border rounded-xl shadow overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Cashier</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-center">Items</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6">No sales</td>
              </tr>
            )}
            {sales.map(sale => (
              <React.Fragment key={sale.id}>
                <tr className="border-t">
                  <td className="px-4 py-2">{sale.id}</td>
                  <td className="px-4 py-2">{new Date(sale.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2">{sale.cashier || "-"}</td>
                  <td className="px-4 py-2 text-right">{sale.total_price?.toFixed(2)}</td>
                  <td className="px-4 py-2 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fetchSaleItems(sale.id)}
                    >
                      {expandedSale === sale.id ? "Hide" : "Show"}
                    </Button>
                  </td>
                </tr>
                {/* Expandable sale items */}
                {expandedSale === sale.id && (
                  <tr>
                    <td colSpan={5} className="px-8 py-4">
                      <div>
                        <div className="font-semibold mb-2">Items</div>
                        {saleItems[sale.id] && saleItems[sale.id].length > 0 ? (
                          <table className="min-w-full">
                            <thead>
                              <tr>
                                <th className="text-left">Barcode</th>
                                <th className="text-left">Product</th>
                                <th className="text-right">Unit Price</th>
                                <th className="text-right">Qty</th>
                                <th className="text-right">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {saleItems[sale.id].map(item => (
                                <tr key={item.id}>
                                  <td>{item.barcode}</td>
                                  <td>{item.product_name}</td>
                                  <td className="text-right">{item.price_unit.toFixed(2)}</td>
                                  <td className="text-right">{item.quantity}</td>
                                  <td className="text-right">{item.subtotal.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="text-gray-500">No items</div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex gap-2 justify-center my-4">
          <Button size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          {Array.from({ length: pageCount }, (_, i) => (
            <Button
              key={i + 1}
              size="sm"
              variant={page === i + 1 ? "default" : "outline"}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </Button>
          ))}
          <Button size="sm" disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
