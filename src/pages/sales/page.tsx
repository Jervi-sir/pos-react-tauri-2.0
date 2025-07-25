import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { runSql } from "@/runSql";
import { ExportDialog } from "@/components/export-dialog";
import { InvoicePrintDialog } from "./invoice-print-dialog";
import { PrinterIcon } from "lucide-react";
import { PaginationSection } from "@/components/pagination-section";

type Sale = {
  id: number;
  total_price: number;
  created_at: string;
  cashier: string;
};

type Invoice = {
  id: number;
  sale_id: number;
  amount: number;
  created_at: string;
  cashier: string;
};

type SaleProduct = {
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

// Simple escaping function for SQLite string values
const escapeSqlString = (value: string) => `'${value.replace(/'/g, "''")}'`;

export default function SalesListPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  // @ts-ignore
  const [loading, setLoading] = useState(false);
  const [expandedSale, setExpandedSale] = useState<number | null>(null);
  const [saleProducts, setSaleProducts] = useState<Record<number, SaleProduct[]>>({});
  const [page, setPage] = useState(1);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Fetch sales
  const fetchSales = async () => {
    setLoading(true);
    const offset = (page - 1) * PAGE_SIZE;
    const salesQuery = `
      SELECT s.id, s.total_price, s.created_at, u.name AS cashier
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `;
    try {
      const res: any = await runSql(salesQuery);
      setSales(res.rows || []);
      // Count
      const countRes: any = await runSql("SELECT COUNT(*) as cnt FROM sales");
      setTotalCount(countRes.rows?.[0]?.cnt || 0);
    } catch (e: any) {
      console.error("Error fetching sales:", e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch sale products for a sale
  const fetchSaleProducts = async (saleId: number) => {
    if (!Number.isInteger(saleId) || saleId <= 0) {
      console.error("Invalid sale ID:", saleId);
      return;
    }
    if (saleProducts[saleId]) {
      setExpandedSale(expandedSale === saleId ? null : saleId);
      return; // Already loaded
    }
    const itemsQuery = `
      SELECT sp.id, sp.product_id, sp.sale_id, sp.quantity, sp.price_unit, sp.created_at, sp.updated_at, p.name as product_name, p.barcode
      FROM sale_products sp
      LEFT JOIN products p ON sp.product_id = p.id
      WHERE sp.sale_id = ${saleId}
    `;
    try {
      const res: any = await runSql(itemsQuery);
      setSaleProducts((prev) => ({
        ...prev,
        [saleId]: res.rows.map((item: any) => ({
          ...item,
          subtotal: item.quantity * item.price_unit, // Calculate subtotal
        })) || [],
      }));
      setExpandedSale(saleId);
    } catch (e: any) {
      console.error("Error fetching sale products:", e);
      setSaleProducts((prev) => ({
        ...prev,
        [saleId]: [],
      }));
    }
  };

  // Fetch invoice data for a sale
  const fetchInvoiceForSale = async (sale: Sale) => {
    if (!Number.isInteger(sale.id) || sale.id <= 0) {
      console.error("Invalid sale ID:", sale.id);
      return;
    }
    const invoiceQuery = `
      SELECT i.id, i.sale_id, i.amount, i.created_at, u.name AS cashier
      FROM invoices i
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.sale_id = ${sale.id} LIMIT 1
    `;
    try {
      const res: any = await runSql(invoiceQuery);
      const invoice = res.rows?.[0];
      if (invoice) {
        setSelectedInvoice({
          id: invoice.id,
          sale_id: invoice.sale_id,
          amount: invoice.amount,
          created_at: invoice.created_at,
          cashier: invoice.cashier || "-",
        });
        setInvoiceDialogOpen(true);
      } else {
        console.error("No invoice found for sale ID:", sale.id);
      }
    } catch (e: any) {
      console.error("Error fetching invoice:", e);
    }
  };

  useEffect(() => {
    fetchSales();
    // eslint-disable-next-line
  }, [page]);

  const pageCount = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Sales</h2>
        <ExportDialog
          buildQuery={(range, s, e) => {
            const startDate = s ? escapeSqlString(s) : null;
            const endDate = e ? escapeSqlString(e) : null;
            return `
              SELECT s.id, s.total_price, s.created_at, u.name AS cashier
              FROM sales s
              LEFT JOIN users u ON s.user_id = u.id
              ${range === "between" && startDate && endDate ? `WHERE date(s.created_at) >= ${startDate} AND date(s.created_at) <= ${endDate}` : ""}
              ORDER BY s.created_at DESC
            `;
          }}
          filePrefix="sales"
          dialogTitle="Export Sales Data"
        />
      </div>
      {/* {loading && <div>Loading...</div>} */}
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
            {sales.map((sale) => (
              <React.Fragment key={sale.id}>
                <tr className="border-t">
                  <td className="px-4 py-2">{sale.id}</td>
                  <td className="px-4 py-2">{new Date(sale.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2">{sale.cashier || "-"}</td>
                  <td className="px-4 py-2 text-right">{sale.total_price?.toFixed(2)}</td>
                  <td className="px-4 py-2 flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fetchSaleProducts(sale.id)}
                    >
                      {expandedSale === sale.id ? "Hide" : "Show"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fetchInvoiceForSale(sale)}
                    >
                      <PrinterIcon />
                    </Button>
                  </td>
                </tr>
                {/* Expandable sale products */}
                {expandedSale === sale.id && (
                  <tr>
                    <td colSpan={5} className="px-8 py-4">
                      <div>
                        <div className="font-semibold mb-2">Items</div>
                        {saleProducts[sale.id] && saleProducts[sale.id].length > 0 ? (
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
                              {saleProducts[sale.id].map((item) => (
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

      <InvoicePrintDialog
        open={invoiceDialogOpen}
        onOpenChange={(v) => {
          setInvoiceDialogOpen(v);
          if (!v) setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
      />
      {/* Pagination */}
      <PaginationSection
        page={page}
        pageCount={pageCount}
        setPage={setPage}
        maxPagesToShow={5}
      />
    </div>
  );
}