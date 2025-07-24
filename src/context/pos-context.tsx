// pos-context.tsx
import React, { createContext, useContext, useRef, useState } from "react";
import { runSql } from "@/runSql";
import { useAuth } from "./auth-context";
import { checkLowStock } from "./low-stock-context";

type Product = {
  id: number;
  name: string;
  barcode: string;
  price: number;
  image_base64?: string;
};

type CartItem = Product & {
  quantity: number;
  subtotal: number;
};

type InvoiceData = any; // Define as needed

type PosContextType = {
  cart: CartItem[];
  barcode: string;
  productLookup: Product | null;
  error: string | null;
  invoiceData: InvoiceData | null;
  doneDialog: boolean;
  total: number;
  setBarcode: (v: string) => void;
  lookupProduct: (code: string) => Promise<void>;
  addToCart: (product: Product) => void;
  updateQuantity: (productId: number, qty: number) => void;
  removeItem: (productId: number) => void;
  handleCompleteSale: () => Promise<void>;
  setDoneDialog: (open: boolean) => void;
  setInvoiceData: (data: any) => void;
  clearCart: () => void;
};

const PosContext = createContext<PosContextType | undefined>(undefined);

export const usePos = () => {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error("usePos must be used within PosProvider");
  return ctx;
};

export const PosProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcode, setBarcode] = useState("");
  const [productLookup, setProductLookup] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneDialog, setDoneDialog] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any | null>(null);

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const lookupProduct = async (code: string) => {
    setError(null);
    if (!code.trim()) return;
    const res: any = await runSql(
      `SELECT id, name, barcode, price_unit as price, image_base64 FROM products WHERE barcode = '${code.replace(/'/g, "''")}' LIMIT 1`
    );
    const product = res.rows?.[0];
    if (!product) {
      setError("Product not found.");
      setProductLookup(null);
      return;
    }
    setProductLookup(product);
    addToCart(product);
    setBarcode("");
  };

  const addToCart = (product: Product) => {
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
  };

  const updateQuantity = (productId: number, qty: number) => {
    setCart(cart =>
      cart
        .map(item =>
          item.id === productId
            ? { ...item, quantity: qty, subtotal: qty * item.price }
            : item
        )
        .filter(item => item.quantity > 0)
    );
  };

  const removeItem = (productId: number) => {
    setCart(cart => cart.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setProductLookup(null);
    setError(null);
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    try {
      const now = new Date().toISOString();
      await runSql(`
        INSERT INTO sales (sold_by, total_price, created_at, updated_at)
        VALUES (${userId}, ${total}, '${now}', '${now}')
      `);

      const saleRes: any = await runSql(`SELECT id FROM sales ORDER BY id DESC LIMIT 1`);
      const saleId = saleRes.rows?.[0]?.id;

      for (const item of cart) {
        await runSql(`
          INSERT INTO sale_items 
            (product_id, sale_id, quantity, price_unit, subtotal, created_at, updated_at)
          VALUES (
            ${item.id}, ${saleId}, ${item.quantity}, ${item.price}, ${item.subtotal}, '${now}', '${now}'
          )
        `);
      }

      await runSql(`
        INSERT INTO invoices (invoice_type, amount, created_at, updated_at, created_by)
        VALUES ('sale', ${total}, '${now}', '${now}', ${userId})
      `);

      const invoiceRes: any = await runSql(`SELECT id FROM invoices ORDER BY id DESC LIMIT 1`);
      const invoiceId = invoiceRes.rows?.[0]?.id;

      const invoiceInfo: any = await runSql(`
        SELECT i.id as invoice_id, i.amount, i.created_at, u.name AS cashier, s.id as sale_id
        FROM invoices i
        LEFT JOIN users u ON i.created_by = u.id
        LEFT JOIN sales s ON s.total_price = i.amount AND s.created_at = i.created_at
        WHERE i.id = ${invoiceId}
        LIMIT 1
      `);

      const sale_id = invoiceInfo.rows?.[0]?.sale_id;

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
      await checkLowStock();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  };

  return (
    <PosContext.Provider
      value={{
        cart,
        barcode,
        productLookup,
        error,
        invoiceData,
        doneDialog,
        total,
        setBarcode,
        lookupProduct,
        addToCart,
        updateQuantity,
        removeItem,
        handleCompleteSale,
        setDoneDialog,
        setInvoiceData,
        clearCart,
      }}
    >
      {children}
    </PosContext.Provider>
  );
};
