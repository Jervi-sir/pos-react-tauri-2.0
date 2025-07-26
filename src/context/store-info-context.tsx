import React, { createContext, useContext, useEffect, useState } from "react";
import { runSql } from "@/runSql";
import LoadingScreen from "@/layouts/loading-screen";

type StoreInfo = {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  tax_id: string;
  logo_base64: string;
};

interface StoreInfoContextType {
  storeInfo: StoreInfo;
  updateStoreInfo: (newInfo: Partial<StoreInfo>) => Promise<void>;
}

const StoreInfoContext = createContext<StoreInfoContextType | undefined>(undefined);
const STORAGE_KEY = "store_info";

const getStoredData = (): StoreInfo | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};
const saveToStorage = (data: StoreInfo): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
};

const defaultStoreInfo: StoreInfo = {
  id: 1,
  name: "",
  address: "",
  phone: "",
  email: "",
  tax_id: "",
  logo_base64: "",
};

export const StoreInfoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storeInfo, setStoreInfo] = useState<StoreInfo>(defaultStoreInfo);
  const [loading, setLoading] = useState(true);

  // Fetch on mount
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      const stored = getStoredData();
      if (stored && stored.id === 1) {
        setStoreInfo(stored);
        setLoading(false);
        return;
      }
      try {
        const response = await runSql("SELECT * FROM store_info WHERE id = 1 LIMIT 1");
        // @ts-ignore
        const rows = response || [];
        if (rows && rows.length > 0 && rows[0]) {
          setStoreInfo(rows[0]);
          saveToStorage(rows[0]);
        } else {
          setStoreInfo(defaultStoreInfo);
          saveToStorage(defaultStoreInfo);
        }
      } catch {
        setStoreInfo(defaultStoreInfo);
        saveToStorage(defaultStoreInfo);
      }
      setLoading(false);
    };
    initialize();
  }, []);

  // THE OPTIMIZED UPDATE FUNCTION
  const updateStoreInfo = async (newInfo: Partial<StoreInfo>) => {
    // Merge with previous
    const updated: StoreInfo = { ...storeInfo, ...newInfo };

    // You can sanitize here as needed
    const sanitize = (v: string) => v?.replace(/'/g, "''") || "";

    await runSql(`
      UPDATE store_info
      SET
        name = '${sanitize(updated.name)}',
        address = '${sanitize(updated.address)}',
        phone = '${sanitize(updated.phone)}',
        email = '${sanitize(updated.email)}',
        tax_id = '${sanitize(updated.tax_id)}',
        logo_base64 = '${sanitize(updated.logo_base64)}',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `);

    // Update state and localStorage
    setStoreInfo(updated);
    saveToStorage(updated);
  };

  if (loading) return <LoadingScreen />;

  return (
    <StoreInfoContext.Provider value={{ storeInfo, updateStoreInfo }}>
      {children}
    </StoreInfoContext.Provider>
  );
};

export const useStoreInfo = (): StoreInfoContextType => {
  const context = useContext(StoreInfoContext);
  if (!context) throw new Error("useStoreInfo must be used within a StoreInfoProvider");
  return context;
};
