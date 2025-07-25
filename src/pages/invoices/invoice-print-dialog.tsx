import React, { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { runSql } from "@/runSql";

type InvoiceType = {
  id: number;
  invoice_type: "sold" | "bought"; // Updated to match database values
  amount: number;
  created_at: string;
  user_id: number;
  cashier: string;
  sale_id?: number;
  purchase_id?: number;
};

type SaleProduct = {
  id: number;
  product_name: string;
  barcode: string;
  quantity: number;
  price_unit: number;
  subtotal: number;
};

type PurchaseItem = {
  id: number;
  product_name: string;
  barcode: string;
  quantity: number;
  purchase_price: number;
  subtotal: number;
};

type StoreInfo = {
  name: string;
  address: string;
  phone: string;
  email: string;
  tax_id: string;
  currency: string;
  logo_base64?: string;
};

type InvoicePrintDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoice?: InvoiceType | null;
};

export function InvoicePrintDialog({ open, onOpenChange, invoice }: InvoicePrintDialogProps) {
  const [saleItems, setSaleItems] = useState<SaleProduct[]>([]);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Sanitize number inputs to prevent SQL injection
  const sanitizeNumber = (value: number) => {
    const num = Number(value);
    if (isNaN(num) || !Number.isInteger(num) || num < 0) {
      throw new Error("Invalid number input");
    }
    return num;
  };

  useEffect(() => {
    if (!open || !invoice || !invoice.id) {
      setSaleItems([]);
      setPurchaseItems([]);
      setStoreInfo(null);
      setError(null);
      return;
    }

    setLoading(true);
    const fetchData = async () => {
      try {
        // Fetch store info
        const storeQuery = `SELECT * FROM store_info WHERE id = 1`;
        const storeRes: any = await runSql(storeQuery);
        setStoreInfo(storeRes.rows?.[0] || null);

        if (invoice.invoice_type === "sold" && invoice.sale_id) {
          // Fetch sale products
          const itemsQuery = `
            SELECT 
              sp.id, 
              sp.quantity, 
              sp.price_unit, 
              p.name as product_name, 
              p.barcode 
            FROM sale_products sp 
            LEFT JOIN products p ON sp.product_id = p.id 
            WHERE sp.sale_id = ${sanitizeNumber(invoice.sale_id)}
          `;
          const itemsRes: any = await runSql(itemsQuery);
          setSaleItems(
            itemsRes.rows?.map((item: any) => ({
              id: item.id,
              product_name: item.product_name,
              barcode: item.barcode,
              quantity: item.quantity,
              price_unit: item.price_unit,
              subtotal: item.quantity * item.price_unit,
            })) || []
          );
          setPurchaseItems([]);
        } else if (invoice.invoice_type === "bought" && invoice.purchase_id) {
          // Fetch purchase items from stock_entries
          const itemsQuery = `
            SELECT 
              se.id, 
              se.quantity, 
              se.purchase_price, 
              p.name as product_name, 
              p.barcode 
            FROM stock_entries se 
            LEFT JOIN products p ON se.product_id = p.id 
            WHERE se.invoice_id = ${sanitizeNumber(invoice.id)}
          `;
          const itemsRes: any = await runSql(itemsQuery);
          setPurchaseItems(
            itemsRes.rows?.map((item: any) => ({
              id: item.id,
              product_name: item.product_name,
              barcode: item.barcode,
              quantity: item.quantity,
              purchase_price: item.purchase_price,
              subtotal: item.quantity * item.purchase_price,
            })) || []
          );
          setSaleItems([]);
        }
      } catch (error) {
        console.error("Error fetching invoice data:", error);
        setError("Failed to load invoice details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [invoice?.id, invoice?.invoice_type, invoice?.sale_id, invoice?.purchase_id, open]);

  const handlePrint = () => {
    if (!invoiceRef.current) return;
    const printContents = invoiceRef.current.innerHTML;
    const win = window.open("", "PRINT", "height=600,width=800");
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>Invoice #${invoice?.id}</title>
            <style>
              body { font-family: sans-serif; margin: 2rem; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #aaa; padding: 4px 8px; }
              th { background: #f6f6f6; }
              .header { text-align: center; margin-bottom: 1rem; }
              .logo { max-width: 100px; max-height: 100px; }
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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Invoice Preview</DialogTitle>
        </DialogHeader>
        <div ref={invoiceRef} id="invoice-print-area" className="text-sm">
          {invoice ? (
            <>
              <div className="header">
                {storeInfo?.logo_base64 && (
                  <img src={storeInfo.logo_base64} alt="Store Logo" className="logo" />
                )}
                <div className="font-bold text-lg">{storeInfo?.name || "Store Name"}</div>
                {storeInfo?.address && <div>{storeInfo.address}</div>}
                {storeInfo?.phone && <div>Phone: {storeInfo.phone}</div>}
                {storeInfo?.email && <div>Email: {storeInfo.email}</div>}
                {storeInfo?.tax_id && <div>Tax ID: {storeInfo.tax_id}</div>}
              </div>
              <div className="font-bold text-lg mb-1">INVOICE #{invoice.id}</div>
              <div>Date: {new Date(invoice.created_at).toLocaleString()}</div>
              <div>
                Cashier: <span className="font-medium">{invoice.cashier || "-"}</span>
              </div>
              <div className="mb-2">
                Type: <span className="font-medium capitalize">{invoice.invoice_type}</span>
              </div>
              {loading ? (
                <div className="py-4">Loading items…</div>
              ) : error ? (
                <div className="py-4 text-red-500">{error}</div>
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
                    {invoice.invoice_type === "sold" && saleItems.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-gray-400 py-4">
                          No sale items
                        </td>
                      </tr>
                    )}
                    {invoice.invoice_type === "bought" && purchaseItems.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-gray-400 py-4">
                          No purchase items
                        </td>
                      </tr>
                    )}
                    {invoice.invoice_type === "sold" &&
                      saleItems.map((item) => (
                        <tr key={item.id}>
                          <td className="p-1">{item.product_name}</td>
                          <td className="p-1">{item.barcode}</td>
                          <td className="p-1 text-right">{item.quantity}</td>
                          <td className="p-1 text-right">{Number(item.price_unit).toFixed(2)}</td>
                          <td className="p-1 text-right">{Number(item.subtotal).toFixed(2)}</td>
                        </tr>
                      ))}
                    {invoice.invoice_type === "bought" &&
                      purchaseItems.map((item) => (
                        <tr key={item.id}>
                          <td className="p-1">{item.product_name}</td>
                          <td className="p-1">{item.barcode}</td>
                          <td className="p-1 text-right">{item.quantity}</td>
                          <td className="p-1 text-right">
                            {Number(item.purchase_price).toFixed(2)}
                          </td>
                          <td className="p-1 text-right">{Number(item.subtotal).toFixed(2)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
              <div className="text-right font-bold mt-2">
                TOTAL: {storeInfo?.currency || "DZD"} {Number(invoice.amount).toFixed(2)}
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-gray-500">No data</div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handlePrint} disabled={!invoice || loading || !!error}>
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