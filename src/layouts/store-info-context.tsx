import React, { createContext, useContext, useEffect, useState } from "react";
import { runSql } from "@/runSql";

// Define the StoreInfo type
type StoreInfo = {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  tax_id: string;
  currency: string;
  logo_base64: string;
};

// Define the context shape
interface StoreInfoContextType {
  storeInfo: StoreInfo;
  setStoreInfo: (data: StoreInfo) => void;
}

// Create the context
const StoreInfoContext = createContext<StoreInfoContextType | undefined>(undefined);

// Storage key for localStorage/AsyncStorage
const STORAGE_KEY = "store_info";

// Browser: localStorage functions
const getStoredData = (): StoreInfo | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error reading from localStorage:", error);
    return null;
  }
};

const saveToStorage = (data: StoreInfo): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log("Saved to localStorage:", data);
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
};

// Default store info
const defaultStoreInfo: StoreInfo = {
  id: 1,
  name: "",
  address: "",
  phone: "",
  email: "",
  tax_id: "",
  currency: "DZD",
  logo_base64: "",
};

// Context Provider Component
export const StoreInfoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storeInfo, setStoreInfo] = useState<StoreInfo>(defaultStoreInfo);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeStoreInfo = async () => {
      setLoading(true);
      // Try to get data from storage
      const storedData = await getStoredData();
      if (storedData && storedData.id === 1) {
        console.log("Loaded from storage:", storedData);
        setStoreInfo(storedData);
        setLoading(false);
      } else {
        // Fetch from database if no valid storage data
        try {
          const response = await runSql("SELECT * FROM store_info WHERE id = 1 LIMIT 1");
          console.log("Raw response from runSql:", response);
          // @ts-ignore
          const rows = response.rows || [];
          if (rows && Array.isArray(rows) && rows.length > 0 && rows[0]) {
            const fetchedData = rows[0];
            console.log("Fetched store_info:", fetchedData);
            const newStoreInfo: StoreInfo = {
              id: fetchedData.id || 1,
              name: fetchedData.name || "",
              address: fetchedData.address || "",
              phone: fetchedData.phone || "",
              email: fetchedData.email || "",
              tax_id: fetchedData.tax_id || "",
              currency: fetchedData.currency || "DZD",
              logo_base64: fetchedData.logo_base64 || "",
            };
            setStoreInfo(newStoreInfo);
            await saveToStorage(newStoreInfo); // Save to storage
          } else {
            console.warn("No row found in store_info with id = 1, using default values");
            setStoreInfo(defaultStoreInfo);
            await saveToStorage(defaultStoreInfo); // Save defaults to storage
          }
        } catch (error) {
          console.error("Error fetching store_info:", error);
          setStoreInfo(defaultStoreInfo);
          await saveToStorage(defaultStoreInfo); // Save defaults to storage
        } finally {
          setLoading(false);
        }
      }
    };

    initializeStoreInfo();
  }, []);

  if (loading) return <div>Loading store info...</div>;

  return (
    <StoreInfoContext.Provider value={{ storeInfo, setStoreInfo }}>
      {children}
    </StoreInfoContext.Provider>
  );
};

// Custom hook to use the context
export const useStoreInfo = (): StoreInfoContextType => {
  const context = useContext(StoreInfoContext);
  if (!context) {
    throw new Error("useStoreInfo must be used within a StoreInfoProvider");
  }
  return context;
};