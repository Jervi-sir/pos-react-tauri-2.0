import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { runSql } from "@/runSql";
import { ExportInvoicesDialog } from "./export-invoice-dialog";
import { ExportDialog } from "@/components/export-dialog";

type Invoice = {
  id: number;
  invoice_type: string;
  amount: number;
  created_at: string;
  created_by: number;
  cashier: string;
  // Optionally add more fields as needed
};

type SaleItem = {
  name: string;
  barcode: string;
  quantity: number;
  price_unit: number;
  subtotal: number;
};

const PAGE_SIZE = 10;

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  // For print dialog
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [invoiceDetail, setInvoiceDetail] = useState<any | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch invoices
  const fetchInvoices = async () => {
    setLoading(true);
    const offset = (page - 1) * PAGE_SIZE;
    const res: any = await runSql(`
      SELECT i.*, u.name as cashier
      FROM invoices i
      LEFT JOIN users u ON i.created_by = u.id
      ORDER BY i.created_at DESC
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `);
    setInvoices(res.rows || []);
    // Total count for pagination
    const countRes: any = await runSql(`SELECT COUNT(*) as cnt FROM invoices`);
    setTotalCount(countRes.rows?.[0]?.cnt || 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line
  }, [page]);

  const pageCount = Math.ceil(totalCount / PAGE_SIZE);

  // Print dialog
  const handlePrint = async (invoice: Invoice) => {
    setInvoiceDetail(null);
    setSaleItems([]);
    setPrintDialogOpen(true);
    setDetailLoading(true);

    // Try to fetch related sale by amount and created_at (if you don't store sale_id on invoice)
    const saleRes: any = await runSql(`
      SELECT s.id FROM sales s
      WHERE s.total_price = ${invoice.amount} AND s.created_at = '${invoice.created_at}'
      LIMIT 1
    `);
    const saleId = saleRes.rows?.[0]?.id;

    let saleItemsRes = { rows: [] as SaleItem[] };
    if (saleId) {
      // @ts-ignore
      saleItemsRes = await runSql(`
        SELECT p.name, p.barcode, si.quantity, si.price_unit, si.subtotal
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ${saleId}
      `);
    }

    setInvoiceDetail(invoice);
    setSaleItems(saleItemsRes.rows || []);
    setDetailLoading(false);
  };

  const printInvoice = () => {
    // Print only the invoice area
    const printContents = document.getElementById("invoice-print-area")?.innerHTML;
    const originalContents = document.body.innerHTML;
    if (printContents) {
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); // Simple reload to re-mount app
    }
  };

  return (
    <div className="py-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Invoices</h2>
        <ExportDialog
          buildQuery={(range, s, e) =>
            `SELECT i.*, u.name as cashier
            FROM invoices i
            LEFT JOIN users u ON i.created_by = u.id
            ${range === "between" && s && e ? `WHERE date(i.created_at) >= '${s}' AND date(i.created_at) <= '${e}'` : ""}
            ORDER BY i.created_at DESC`
          }
          filePrefix="invoices"
          dialogTitle="Export Invoices"
        />
      </div>
      {loading && <div>Loading...</div>}
      <div className="border rounded-xl shadow overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-left">Created By</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-center">Print</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6">No invoices</td>
              </tr>
            )}
            {invoices.map(inv => (
              <tr key={inv.id} className="border-t">
                <td className="px-4 py-2">{inv.id}</td>
                <td className="px-4 py-2 capitalize">{inv.invoice_type}</td>
                <td className="px-4 py-2 text-right">{Number(inv.amount).toFixed(2)}</td>
                <td className="px-4 py-2">{inv.cashier || inv.created_by}</td>
                <td className="px-4 py-2">{new Date(inv.created_at).toLocaleString()}</td>
                <td className="px-4 py-2 text-center">
                  <Button size="sm" variant="outline" onClick={() => handlePrint(inv)}>
                    Print
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex gap-2 justify-center my-4">
          <Button size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
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
          <Button size="sm" disabled={page === pageCount} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      )}

      {/* Print Invoice Dialog */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invoice</DialogTitle>
          </DialogHeader>
          {detailLoading || !invoiceDetail ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : (
            <div id="invoice-print-area" className="text-sm">
              <div className="font-bold text-lg mb-1">INVOICE #{invoiceDetail.id}</div>
              <div>Date: {new Date(invoiceDetail.created_at).toLocaleString()}</div>
              <div>Cashier: {invoiceDetail.cashier || invoiceDetail.created_by}</div>
              <div>Type: {invoiceDetail.invoice_type}</div>
              <table className="min-w-full mt-3 mb-2 border">
                <thead>
                  <tr>
                    <th className="text-left p-1">Name</th>
                    <th className="text-left p-1">Barcode</th>
                    <th className="text-right p-1">Qty</th>
                    <th className="text-right p-1">Unit</th>
                    <th className="text-right p-1">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {saleItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-gray-400 py-4">No sale items</td>
                    </tr>
                  ) : (
                    saleItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-1">{item.name}</td>
                        <td className="p-1">{item.barcode}</td>
                        <td className="p-1 text-right">{item.quantity}</td>
                        <td className="p-1 text-right">{Number(item.price_unit).toFixed(2)}</td>
                        <td className="p-1 text-right">{Number(item.subtotal).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="text-right font-bold">TOTAL: {Number(invoiceDetail.amount).toFixed(2)}</div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={printInvoice} disabled={!invoiceDetail}>
              Print
            </Button>
            <Button onClick={() => setPrintDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
