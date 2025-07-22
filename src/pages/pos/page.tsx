import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { runSql } from "@/runSql";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Product = {
  id: number;
  name: string;
  barcode: string;
  price: number;
  image_url?: string;
};

type CartItem = Product & {
  quantity: number;
  subtotal: number;
};

export default function PosPage() {
  const userId = 1;
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productLookup, setProductLookup] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneDialog, setDoneDialog] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [invoiceData, setInvoiceData] = useState<any | null>(null);

  // Sum up the cart
  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

  // Find product by barcode
  const lookupProduct = async (code: string) => {
    setError(null);
    if (!code.trim()) return;
    const res: any = await runSql(
      `SELECT id, name, barcode, price_unit as price, image_url FROM products WHERE barcode = '${code.replace(/'/g, "''")}' LIMIT 1`
    );
    const product = res.rows?.[0];
    if (!product) {
      setError("Product not found.");
      setProductLookup(null);
      return;
    }
    setProductLookup(product);
    // Add to cart or increase qty
    setCart(cart => {
      const idx = cart.findIndex(c => c.id === product.id);
      if (idx >= 0) {
        const newCart = [...cart];
        newCart[idx].quantity += 1;
        newCart[idx].subtotal = newCart[idx].quantity * newCart[idx].price;
        return newCart;
      } else {
        return [
          ...cart,
          { ...product, quantity: 1, subtotal: product.price }
        ];
      }
    });
    setBarcode("");
  };

  // When user presses Enter or barcode scanner finishes
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await lookupProduct(barcode);
    setBarcode("");
    // Focus input for next scan
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  };

  // Update quantity in cart
  const updateQuantity = (productId: number, qty: number) => {
    setCart(cart =>
      cart.map(item =>
        item.id === productId
          ? { ...item, quantity: qty, subtotal: qty * item.price }
          : item
      ).filter(item => item.quantity > 0)
    );
  };

  // Remove item
  const removeItem = (productId: number) => {
    setCart(cart => cart.filter(item => item.id !== productId));
  };

  // Complete sale: save to db
  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    try {
      // Insert into sales
      const now = new Date().toISOString();
      await runSql(`
      INSERT INTO sales (sold_by, total_price, created_at, updated_at)
      VALUES (${userId}, ${total}, '${now}', '${now}')
    `);

      // Get sale id (last inserted row)
      const saleRes: any = await runSql(`SELECT id FROM sales ORDER BY id DESC LIMIT 1`);
      const saleId = saleRes.rows?.[0]?.id;

      // Insert sale items
      for (const item of cart) {
        await runSql(`
        INSERT INTO sale_items 
          (product_id, sale_id, quantity, price_unit, subtotal, created_at, updated_at)
        VALUES (
          ${item.id}, ${saleId}, ${item.quantity}, ${item.price}, ${item.subtotal}, '${now}', '${now}'
        )
      `);
      }

      // Insert invoice
      await runSql(`
      INSERT INTO invoices (invoice_type, amount, created_at, updated_at, created_by)
      VALUES ('sale', ${total}, '${now}', '${now}', ${userId})
    `);

      // Get invoice id
      const invoiceRes: any = await runSql(`SELECT id FROM invoices ORDER BY id DESC LIMIT 1`);
      const invoiceId = invoiceRes.rows?.[0]?.id;

      // Fetch invoice details for print
      const invoiceInfo: any = await runSql(`
      SELECT i.id as invoice_id, i.amount, i.created_at, u.name AS cashier, s.id as sale_id
      FROM invoices i
      LEFT JOIN users u ON i.created_by = u.id
      LEFT JOIN sales s ON s.total_price = i.amount AND s.created_at = i.created_at
      WHERE i.id = ${invoiceId}
      LIMIT 1
    `);

      const sale_id = invoiceInfo.rows?.[0]?.sale_id;
      // Fetch sale items
      const itemsRes: any = await runSql(`
      SELECT si.quantity, si.price_unit, si.subtotal, p.name, p.barcode
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ${sale_id}
    `);

      setInvoiceData({
        ...invoiceInfo.rows?.[0],
        items: itemsRes.rows || [],
      });

      setCart([]);
      setProductLookup(null);
      setError(null);
      setDoneDialog(true);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  };


  // Focus barcode input on load
  React.useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold mb-4">New Sale</h2>
      <form onSubmit={handleBarcodeSubmit} className="mb-4 flex items-center gap-2">
        <Input
          ref={barcodeInputRef}
          value={barcode}
          onChange={e => setBarcode(e.target.value)}
          placeholder="Scan or enter barcode"
          className="flex-1"
          autoFocus
        />
        <Button type="submit">Add</Button>
      </form>
      {error && <div className="mb-2 text-red-600">{error}</div>}

      <div className="border rounded-xl shadow  overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="">
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
                  {item.image_url && (
                    <img src={`/${item.image_url}`} alt={item.name} className="h-10 w-10 object-cover rounded" />
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
          onClick={handleCompleteSale}
          disabled={cart.length === 0}
        >
          Complete Sale
        </Button>
      </div>

      {/* Success Dialog */}
      <Dialog open={doneDialog} onOpenChange={setDoneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invoice</DialogTitle>
          </DialogHeader>
          {invoiceData ? (
            <div id="invoice-print-area" className="text-sm">
              <div className="font-bold text-lg mb-1">INVOICE #{invoiceData.invoice_id}</div>
              <div>Date: {new Date(invoiceData.created_at).toLocaleString()}</div>
              {/* <div>Cashier: {invoiceData.cashier || userId}</div> */}
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
                  {invoiceData.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-1">{item.name}</td>
                      <td className="p-1">{item.barcode}</td>
                      <td className="p-1 text-right">{item.quantity}</td>
                      <td className="p-1 text-right">{Number(item.price_unit).toFixed(2)}</td>
                      <td className="p-1 text-right">{Number(item.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-right font-bold">TOTAL: {Number(invoiceData.amount).toFixed(2)}</div>
            </div>
          ) : (
            <div className="py-8 text-center">Loading invoice…</div>
          )}
          <DialogFooter>
            <Button onClick={() => window.print()}>Print Invoice</Button>
            <Button onClick={() => { setDoneDialog(false); setInvoiceData(null); }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
