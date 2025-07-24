import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ExportDialog } from "@/components/export-dialog";
import { runSql } from "@/runSql";
import { InvoicePrintDialog } from "../sales/invoice-print-dialog";

type Invoice = {
  id: number;
  invoice_type: string;
  amount: number;
  created_at: string;
  created_by: number;
  cashier: string;
};

const PAGE_SIZE = 10;

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  // For print dialog
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

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

  return (
    <div>
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedInvoice(inv);
                      setInvoiceDialogOpen(true);
                    }}
                  >
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
      <InvoicePrintDialog
        open={invoiceDialogOpen}
        onOpenChange={v => {
          setInvoiceDialogOpen(v);
          if (!v) setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
      />
    </div>
  );
}
