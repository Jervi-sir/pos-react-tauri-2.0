import { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { runSql } from "@/runSql";

type InvoiceType = {
  id: number;
  sale_id?: number;
  amount: number;
  created_at: string;
  cashier: string;
};

type SaleProduct = {
  id: number;
  product_name: string;
  barcode: string;
  quantity: number;
  price_unit: number;
  subtotal: number;
};

type InvoicePrintDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoice?: InvoiceType | null;
};

export function InvoicePrintDialog({ open, onOpenChange, invoice }: InvoicePrintDialogProps) {
  const [items, setItems] = useState<SaleProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !invoice || !invoice.id) {
      setItems([]);
      return;
    }

    setLoading(true);

    const fetchItems = async () => {
      try {
        let saleId = invoice.sale_id;

        // Validate invoice.id
        if (!Number.isInteger(invoice.id) || invoice.id <= 0) {
          throw new Error("Invalid invoice ID.");
        }

        if (!saleId) {
          // Fallback: fetch sale_id from invoices table
          const invoiceQuery = `SELECT sale_id FROM invoices WHERE id = ${invoice.id} LIMIT 1`;
          const invoiceRes: any = await runSql(invoiceQuery);
          saleId = invoiceRes.rows?.[0]?.sale_id;
        }

        if (!saleId || !Number.isInteger(saleId) || saleId <= 0) {
          setItems([]);
          setLoading(false);
          return;
        }

        // Fetch sale products
        const itemsQuery = `SELECT sp.id, sp.quantity, sp.price_unit, p.name as product_name, p.barcode 
                           FROM sale_products sp 
                           LEFT JOIN products p ON sp.product_id = p.id 
                           WHERE sp.sale_id = ${saleId}`;
        const itemsRes: any = await runSql(itemsQuery);

        setItems(
          itemsRes.rows.map((item: any) => ({
            id: item.id,
            product_name: item.product_name,
            barcode: item.barcode,
            quantity: item.quantity,
            price_unit: item.price_unit,
            subtotal: item.quantity * item.price_unit, // Calculate subtotal
          })) || []
        );
      } catch (error) {
        console.error("Error fetching sale items:", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [invoice?.id, invoice?.sale_id, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Invoice Preview</DialogTitle>
        </DialogHeader>
        <div ref={invoiceRef} id="invoice-print-area" className="text-sm">
          {invoice ? (
            <>
              <div className="font-bold text-lg mb-1">INVOICE #{invoice.id}</div>
              <div>Date: {new Date(invoice.created_at).toLocaleString()}</div>
              <div>
                Cashier: <span className="font-medium">{invoice.cashier || "-"}</span>
              </div>
              <div className="mb-2">
                Total: <span className="font-bold">{Number(invoice.amount).toFixed(2)}</span>
              </div>
              {loading ? (
                <div className="py-4">Loading items…</div>
              ) : (
                <table className="min-w-full mt-3 mb-2 border">
                  <thead>
                    <tr>
                      <th className="text-left p-1">Product</th>
                      <th className="text-left p-1">Barcode</th>
                      <th className="text-right p-1">Qty</th>
                      <th className="text-right p-1">Unit</th>
                      <th className="text-right p-1">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-gray-400 py-4">
                          No sale items
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <tr key={item.id}>
                          <td className="p-1">{item.product_name}</td>
                          <td className="p-1">{item.barcode}</td>
                          <td className="p-1 text-right">{item.quantity}</td>
                          <td className="p-1 text-right">{Number(item.price_unit).toFixed(2)}</td>
                          <td className="p-1 text-right">{Number(item.subtotal).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
              <div className="text-right font-bold mt-2">
                TOTAL: {Number(invoice.amount).toFixed(2)}
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-gray-500">No data</div>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (!invoiceRef.current) return;
              const printContents = invoiceRef.current.innerHTML;
              const win = window.open("", "PRINT", "height=600,width=800");
              if (win) {
                win.document.write(`
                  <html>
                    <head>
                      <title>Invoice</title>
                      <style>
                        body { font-family: sans-serif; margin: 2rem; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #aaa; padding: 4px 8px; }
                        th { background: #f6f6f6; }
                      </style>
                    </head>
                    <body>
                      ${printContents}
                    </body>
                  </html>
                `);
                win.document.close();
                win.focus();
                win.print();
                setTimeout(() => win.close(), 500);
              }
            }}
            disabled={!invoice || loading}
          >
            Print Invoice
          </Button>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}