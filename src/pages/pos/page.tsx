import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { runSql } from "@/runSql";
import { usePos } from "@/context/pos-context";
import { InvoicePrintDialog } from "../sales/invoice-print-dialog";
import { XCircle } from "lucide-react";

export default function PosPage() {
  const {
    cart, barcode, setBarcode, productLookup, error,
    lookupProduct, updateQuantity, removeItem, total,
    handleCompleteSale, addToCart
  } = usePos();

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Live preview state (local to this page)
  const [previewProducts, setPreviewProducts] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Invoice dialog state
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);

  // Live search as barcode changes
  useEffect(() => {
    if (!barcode.trim()) {
      setPreviewProducts([]);
      return;
    }
    setPreviewLoading(true);
    runSql(
      `SELECT id, name, barcode, price_unit as price, image_base64,
        (COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0) -
        COALESCE((SELECT SUM(quantity) FROM sale_items WHERE product_id = p.id), 0)) AS stock_left
      FROM products p
      WHERE barcode LIKE '%${barcode.replace(/'/g, "''")}%'
          OR name LIKE '%${barcode.replace(/'/g, "''")}%'
      LIMIT 10`
    ).then((res: any) => {
      setPreviewProducts(res.rows || []);
      setPreviewLoading(false);
    });
  }, [barcode]);

  // Add to cart from preview
  const handleAddFromPreview = (product: any) => {
    addToCart(product); // context handles logic!
    setBarcode("");
    setPreviewProducts([]);
    barcodeInputRef.current?.focus();
  };

  // On form submit: add first preview or fallback
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (previewProducts.length > 0) {
      handleAddFromPreview(previewProducts[0]);
    } else {
      await lookupProduct(barcode);
      setBarcode("");
    }
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  };

  // On mount, focus input
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Handle complete sale and show invoice dialog
  const handleCompleteSaleAndShowInvoice = async () => {
    // -- Insert into sales, sale_items, invoices, and fetch invoice data (from your previous context logic) --
    // The context method handles the DB inserts and returns invoice info
    const invoice = await handleCompleteSale() as any; // You may need to adapt this to return invoice info
    if (!invoice) return; // if failed
    // Set selectedSale for dialog
    setSelectedSale({
      id: invoice.invoice_id,
      total_price: invoice.amount,
      created_at: invoice.created_at,
      cashier: invoice.cashier,
    });
    setInvoiceDialogOpen(true);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">New Sale</h2>
      <div className="relative mb-4">
        <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2">
          <Input
            ref={barcodeInputRef}
            value={barcode}
            onChange={e => setBarcode(e.target.value)}
            placeholder="Scan or enter barcode or name"
            className="flex-1"
            autoFocus
            autoComplete="off"
          />
          <Button type="submit">Add</Button>
        </form>
        {/* Live preview panel */}
        {barcode.trim() && previewProducts.length > 0 && (
          <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-neutral-900 border rounded-xl shadow-lg z-20 p-2">
            {previewProducts.map((p) => {
              const isUnavailable = !p.stock_left || p.stock_left <= 0;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 px-2 py-2 rounded
                    ${isUnavailable ? "opacity-50 cursor-not-allowed" : "hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"}
                  `}
                  onClick={() => !isUnavailable && handleAddFromPreview(p)}
                  tabIndex={-1}
                >
                  {p.image_base64 && (
                    <img
                      src={`data:image/png;base64,${p.image_base64}`}
                      alt={p.name} 
                      className="h-8 w-8 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {p.name}
                      {isUnavailable && (
                        <span className="text-xs text-red-500 flex items-center gap-1 ml-2">
                          <XCircle size={16} className="inline" /> Out of stock
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">Barcode: {p.barcode}</div>
                  </div>
                  <div className="font-bold">{p.price.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {error && <div className="mb-2 text-red-600">{error}</div>}

      <div className="border rounded-xl shadow overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left">Product</th>
              <th className="px-4 py-2 text-left">Price</th>
              <th className="px-4 py-2 text-center">Qty</th>
              <th className="px-4 py-2 text-right">Subtotal</th>
              <th className="px-4 py-2 text-center">Remove</th>
            </tr>
          </thead>
          <tbody>
            {cart.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6">No products</td>
              </tr>
            )}
            {cart.map(item => (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-2 flex items-center gap-2">
                  {item.image_base64 && (
                    <img src={`data:image/png;base64,${item.image_base64}`} alt={item.name} className="h-10 w-10 object-cover rounded" />
                  )}
                  {item.name}
                </td>
                <td className="px-4 py-2">{item.price.toFixed(2)}</td>
                <td className="px-4 py-2 text-center">
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={e => updateQuantity(item.id, Number(e.target.value))}
                    className="w-16 text-center"
                  />
                </td>
                <td className="px-4 py-2 text-right">{item.subtotal.toFixed(2)}</td>
                <td className="px-4 py-2 text-center">
                  <Button size="sm" variant="destructive" onClick={() => removeItem(item.id)}>
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end items-center mt-6 gap-4">
        <span className="text-xl font-bold">Total: {total.toFixed(2)}</span>
        <Button
          size="lg"
          onClick={handleCompleteSaleAndShowInvoice}
          disabled={cart.length === 0}
        >
          Complete Sale
        </Button>
      </div>

      {/* Invoice Dialog */}
      <InvoicePrintDialog
        open={invoiceDialogOpen}
        onOpenChange={v => {
          setInvoiceDialogOpen(v);
          if (!v) {
            setSelectedSale(null);
          }
        }}
        sale={selectedSale}
      />
    </div>
  );
}
