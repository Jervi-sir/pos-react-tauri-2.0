import React, { createContext, useContext, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { runSql } from "@/runSql";

type LowStockContextType = {};

const LowStockContext = createContext<LowStockContextType>({});

// ----- MODULE-LEVEL SHARED STATE -----
let lastCount = 0;

// ----- EXPORTED FUNCTION -----
export async function checkLowStock() {
  const start = performance.now();
  console.log("checkLowStock started");
  const query = `
    SELECT COUNT(*) as low_stock_count
    FROM products
    WHERE quantity <= 5;
  `;
  try {
    const res: any = await runSql(query);
    const count = res[0]?.low_stock_count || 0;

    if (count > 0 && count !== lastCount) {
      toast(`Low Stock Alert`, {
        description: `${count} product${count === 1 ? '' : 's'} ha${count === 1 ? 's' : 've'} low stock (<= 5). Please verify.`,
        duration: 3000,
      });
      lastCount = count;
    } else if (count === 0) {
      lastCount = 0;
    }

    console.log(`checkLowStock completed in ${performance.now() - start} ms`);
  } catch (e: any) {
    console.error("Error in checkLowStock:", e);
  }
}

// Provider
export function LowStockProvider({ children }: { children: React.ReactNode }) {
  const isRunning = useRef(false);

  const runCheckLowStock = useCallback(async () => {
    if (isRunning.current) {
      console.log("checkLowStock already running, skipping");
      return;
    }
    isRunning.current = true;
    try {
      await checkLowStock();
    } finally {
      isRunning.current = false;
    }
  }, []);

  useEffect(() => {
    runCheckLowStock(); // Immediate run
    const interval = setInterval(runCheckLowStock, 600_000); // 10 min
    return () => clearInterval(interval);
  }, [runCheckLowStock]);

  return (
    <LowStockContext.Provider value={{}}>
      {children}
    </LowStockContext.Provider>
  );
}

export function useLowStock() {
  return useContext(LowStockContext);
}