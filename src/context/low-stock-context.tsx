import React, { createContext, useContext, useEffect } from "react";
import { toast } from "sonner";
import { runSql } from "@/runSql";

type Product = { id: number; name: string; stock_left?: number };

type LowStockContextType = {};

const LowStockContext = createContext<LowStockContextType>({});

// ----- MODULE-LEVEL SHARED STATE -----
const alertedSet = new Set<number>();

// ----- EXPORTED FUNCTION (no args needed) -----
export async function checkLowStock() {
  const res: any = await runSql(`
    SELECT
      p.id,
      p.name,
      (
        COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0)
        -
        COALESCE((SELECT SUM(quantity) FROM sale_items WHERE product_id = p.id), 0)
      ) AS stock_left
    FROM products p
    WHERE (
      COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0)
      -
      COALESCE((SELECT SUM(quantity) FROM sale_items WHERE product_id = p.id), 0)
    ) <= 5
  `);

  const products: Product[] = res.rows || [];

  products.forEach((prod) => {
    if (typeof prod.stock_left === "number" && prod.stock_left <= 5) {
      if (!alertedSet.has(prod.id)) {
        toast(`Low Stock: ${prod.name}`, {
          description: `Only ${prod.stock_left} left in stock.`,
          duration: 3000,
        });
        alertedSet.add(prod.id);
      }
    } else {
      alertedSet.delete(prod.id);
    }
  });

  // Remove alerted ids that are no longer low-stock
  alertedSet.forEach((id) => {
    if (!products.find((p) => p.id === id)) {
      alertedSet.delete(id);
    }
  });
}

// Provider just calls the exported function on a timer
export function LowStockProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    checkLowStock(); // Immediate run
    const interval = setInterval(checkLowStock, 600_000); // 10 min
    return () => clearInterval(interval);
  }, []);

  return (
    <LowStockContext.Provider value={{}}>
      {children}
    </LowStockContext.Provider>
  );
}

export function useLowStock() {
  return useContext(LowStockContext);
}
