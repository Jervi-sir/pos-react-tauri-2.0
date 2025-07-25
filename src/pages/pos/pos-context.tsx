import React, { createContext, useContext, useState } from "react";
import { runSql } from "@/runSql";
import { useAuth } from "../../context/auth-context";
import { checkLowStock } from "../../context/low-stock-context";

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

type InvoiceData = {
  invoice_id: number;
  sale_id: number;
  amount: number;
  created_at: string;
  cashier: string;
  items: {
    id: number;
    product_name: string;
    barcode: string;
    quantity: number;
    price_unit: number;
    subtotal: number;
  }[];
};

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
  handleCompleteSale: () => Promise<InvoiceData | null>;
  setDoneDialog: (open: boolean) => void;
  setInvoiceData: (data: InvoiceData | null) => void;
  clearCart: () => void;
};

const PosContext = createContext<PosContextType | undefined>(undefined);

export const usePos = () => {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error("usePos must be used within PosProvider");
  return ctx;
};

// Simple escaping function for SQLite string values
const escapeSqlString = (value: string) => `'${value.replace(/'/g, "''")}'`;

export const PosProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcode, setBarcode] = useState("");
  const [productLookup, setProductLookup] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneDialog, setDoneDialog] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const lookupProduct = async (code: string) => {
    setError(null);
    if (!code.trim()) return;
    const escapedCode = escapeSqlString(code);
    const query = `SELECT id, name, barcode, price_unit as price, image_base64 
                   FROM products 
                   WHERE barcode = ${escapedCode} LIMIT 1`;
    try {
      const res: any = await runSql(query);
      const product = res.rows?.[0];
      if (!product) {
        setError("Product not found.");
        setProductLookup(null);
        return;
      }
      setProductLookup(product);
      addToCart(product);
      setBarcode("");
    } catch (e: any) {
      setError(e?.message ?? "Error looking up product.");
      console.error(e);
    }
  };

  const addToCart = (product: Product) => {
    setCart((cart) => {
      const idx = cart.findIndex((c) => c.id === product.id);
      if (idx >= 0) {
        const newCart = [...cart];
        newCart[idx].quantity += 1;
        newCart[idx].subtotal = newCart[idx].quantity * newCart[idx].price;
        return newCart;
      }
      return [...cart, { ...product, quantity: 1, subtotal: product.price }];
    });
  };

  const updateQuantity = (productId: number, qty: number) => {
    setCart((cart) =>
      cart
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: qty, subtotal: qty * item.price }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (productId: number) => {
    setCart((cart) => cart.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setProductLookup(null);
    setError(null);
  };

  const handleCompleteSale = async (): Promise<InvoiceData | null> => {
    if (cart.length === 0 || !userId) {
      setError("Cart is empty or user not authenticated.");
      return null;
    }
    try {
      const now = new Date().toISOString();
      const escapedNow = escapeSqlString(now);
      // Insert into sales
      const salesQuery = `INSERT INTO sales (user_id, total_price, created_at, updated_at) 
                          VALUES (${userId}, ${total}, ${escapedNow}, ${escapedNow})`;
      await runSql(salesQuery);

      const saleRes: any = await runSql(`SELECT id FROM sales ORDER BY id DESC LIMIT 1`);
      const saleId = saleRes.rows?.[0]?.id;

      if (!saleId) {
        throw new Error("Failed to retrieve sale ID.");
      }

      // Insert sale_products
      for (const item of cart) {
        const saleProductsQuery = `INSERT INTO sale_products 
                                  (sale_id, product_id, quantity, price_unit, created_at, updated_at) 
                                  VALUES (${saleId}, ${item.id}, ${item.quantity}, ${item.price}, ${escapedNow}, ${escapedNow})`;
        await runSql(saleProductsQuery);
      }

      // Insert invoice
      const invoiceQuery = `INSERT INTO invoices (user_id, sale_id, amount, created_at, updated_at) 
                           VALUES (${userId}, ${saleId}, ${total}, ${escapedNow}, ${escapedNow})`;
      await runSql(invoiceQuery);

      const invoiceRes: any = await runSql(`SELECT id FROM invoices ORDER BY id DESC LIMIT 1`);
      const invoiceId = invoiceRes.rows?.[0]?.id;

      if (!invoiceId) {
        throw new Error("Failed to retrieve invoice ID.");
      }

      // Fetch invoice data with cashier name
      const invoiceInfoQuery = `SELECT i.id as invoice_id, i.sale_id, i.amount, i.created_at, u.name AS cashier 
                               FROM invoices i 
                               LEFT JOIN users u ON i.user_id = u.id 
                               WHERE i.id = ${invoiceId} LIMIT 1`;
      const invoiceInfo: any = await runSql(invoiceInfoQuery);

      const sale_id = invoiceInfo.rows?.[0]?.sale_id;

      // Fetch sale products
      const itemsQuery = `SELECT sp.id, sp.quantity, sp.price_unit, p.name as product_name, p.barcode 
                          FROM sale_products sp 
                          LEFT JOIN products p ON sp.product_id = p.id 
                          WHERE sp.sale_id = ${sale_id}`;
      const itemsRes: any = await runSql(itemsQuery);

      const invoiceData: InvoiceData = {
        invoice_id: invoiceInfo.rows?.[0]?.invoice_id,
        sale_id: sale_id,
        amount: invoiceInfo.rows?.[0]?.amount,
        created_at: invoiceInfo.rows?.[0]?.created_at,
        cashier: invoiceInfo.rows?.[0]?.cashier || "Unknown",
        items: itemsRes.rows.map((item: any) => ({
          id: item.id,
          product_name: item.product_name,
          barcode: item.barcode,
          quantity: item.quantity,
          price_unit: item.price_unit,
          subtotal: item.quantity * item.price_unit, // Calculate subtotal
        })) || [],
      };

      setInvoiceData(invoiceData);
      setCart([]);
      setProductLookup(null);
      setError(null);
      setDoneDialog(true);
      await checkLowStock();

      return invoiceData;
    } catch (e: any) {
      setError(e?.message ?? "Error completing sale.");
      console.error("Error in handleCompleteSale:", e);
      return null;
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