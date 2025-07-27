import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { documentDir } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";

const STORAGE_KEY = "documentsPath";
const EXPIRY_KEY = "documentsPath_expiry";
const EXPIRY_DURATION = 1000 * 60 * 60 * 24 * 7; // 7 days in ms

type DocumentsPathContextType = {
  documentsPath: string | null;
  loading: boolean;
};

const DocumentsPathContext = createContext<DocumentsPathContextType>({
  documentsPath: null,
  loading: true,
});

export function DocumentsPathProvider({ children }: { children: ReactNode }) {
  const [documentsPath, setDocumentsPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initPath() {
      const cached = localStorage.getItem(STORAGE_KEY);
      const expiry = localStorage.getItem(EXPIRY_KEY);
      const now = Date.now();

      if (cached && expiry && now < Number(expiry)) {
        setDocumentsPath(cached);
        setLoading(false);
      } else {
        const newPath = await documentDir();
        localStorage.setItem(STORAGE_KEY, newPath);
        localStorage.setItem(EXPIRY_KEY, (now + EXPIRY_DURATION).toString());
        setDocumentsPath(newPath);
        setLoading(false);
      }
    }

    initPath();
  }, []);

  return (
    <DocumentsPathContext.Provider value={{ documentsPath, loading }}>
      {children}
    </DocumentsPathContext.Provider>
  );
}

export function useDocumentsPath() {
  return useContext(DocumentsPathContext);
}

export function useImagePath(relativeImagePath: string): string {
  // const cached = localStorage.getItem(STORAGE_KEY);
  // return convertFileSrc(`${cached}/${relativeImagePath}`); // gives you a safe blob:// URL
  return convertFileSrc(`${relativeImagePath}`); // gives you a safe blob:// URL
}
// <img src={useImagePath('1.png')} alt="product" />
