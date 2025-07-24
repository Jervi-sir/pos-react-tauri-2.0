import React, { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { runSql } from "@/runSql";

type SaleType = {
  id: number;
  total_price: number;
  created_at: string;
  cashier: string;
};

type InvoiceType = {
  id: number;
  amount: number;
  created_at: string;
  cashier: string;
  invoice_type?: string;
};

type InvoicePrintDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sale?: SaleType | null;
  invoice?: InvoiceType | null;
};

export function InvoicePrintDialog({ open, onOpenChange, sale, invoice }: InvoicePrintDialogProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Pick the display source: sale wins over invoice if both passed
  const display = sale
    ? {
        id: sale.id,
        amount: sale.total_price,
        created_at: sale.created_at,
        cashier: sale.cashier,
        invoice_type: undefined,
        isSale: true,
      }
    : invoice
    ? {
        id: invoice.id,
        amount: invoice.amount,
        created_at: invoice.created_at,
        cashier: invoice.cashier,
        invoice_type: invoice.invoice_type,
        isSale: false,
      }
    : null;

  useEffect(() => {
    if (!display) {
      setItems([]);
      return;
    }
    setLoading(true);

    if (display.isSale) {
      // POS or Sales List: fetch items by sale ID
      runSql(
        `SELECT si.*, p.name as product_name, p.barcode
         FROM sale_items si
         LEFT JOIN products p ON si.product_id = p.id
         WHERE si.sale_id = ${display.id}`
      ).then((res: any) => {
        setItems(res.rows || []);
        setLoading(false);
      });
    } else {
      // Invoices List: fetch sale ID by amount and created_at, then fetch items
      runSql(
        `SELECT s.id FROM sales s WHERE s.total_price = ${display.amount} AND s.created_at = '${display.created_at}' LIMIT 1`
      ).then((saleRes: any) => {
        const saleId = saleRes.rows?.[0]?.id;
        if (!saleId) {
          setItems([]);
          setLoading(false);
          return;
        }
        runSql(
          `SELECT p.name as product_name, p.barcode, si.quantity, si.price_unit, si.subtotal
           FROM sale_items si
           LEFT JOIN products p ON si.product_id = p.id
           WHERE si.sale_id = ${saleId}`
        ).then((res: any) => {
          setItems(res.rows || []);
          setLoading(false);
        });
      });
    }
  }, [display?.id, display?.created_at, display?.amount, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Invoice Preview</DialogTitle>
        </DialogHeader>
        <div ref={invoiceRef} id="invoice-print-area" className="text-sm">
          {display ? (
            <>
              <div className="font-bold text-lg mb-1">INVOICE #{display.id}</div>
              <div>Date: {new Date(display.created_at).toLocaleString()}</div>
              <div>Cashier: <span className="font-medium">{display.cashier || "-"}</span></div>
              {display.invoice_type && (
                <div>Type: <span className="capitalize">{display.invoice_type}</span></div>
              )}
              <div className="mb-2">Total: <span className="font-bold">{Number(display.amount).toFixed(2)}</span></div>
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
                        <td colSpan={5} className="text-center text-gray-400 py-4">No sale items</td>
                      </tr>
                    ) : (
                      items.map((item: any, idx: number) => (
                        <tr key={item.id || idx}>
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
                TOTAL: {Number(display.amount).toFixed(2)}
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
            disabled={!display}
          >Print Invoice</Button>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
