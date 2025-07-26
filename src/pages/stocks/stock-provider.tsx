// stock-provider.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { runSql } from "@/runSql";

export type Product = {
  id: number;
  name: string;
  barcode: string;
  category_id: number;
  category_name?: string;
  image_base64?: string;
  price_unit: number;
  created_at: string;
  updated_at: string;
  stock_left?: number;
  quantity?: number;
};

export type Category = {
  id: number;
  name: string;
};

type StockContextType = {
  products: Product[];
  categories: Category[];
  page: number;
  totalCount: number;
  loading: boolean;
  actionLoading: boolean;
  setPage: (page: number) => void;
  setActionLoading: (loading: boolean) => void;
  refreshProducts: () => Promise<void>;
};

const StockContext = createContext<StockContextType | undefined>(undefined);

const PAGE_SIZE = 10;

export const StockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState("name ASC");

  const fetchCategories = async () => {
    try {
      const res: any = await runSql("SELECT id, name FROM categories ORDER BY name");
      setCategories(res.rows || []);
    } catch (e: any) {
      console.error(e?.message ?? "Failed to fetch categories");
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * PAGE_SIZE;
      let where = "1=1";
      if (search.trim())
        where += ` AND (LOWER(p.name) LIKE '%${search.toLowerCase().replace(/'/g, "''")}%' OR p.barcode LIKE '%${search.replace(/'/g, "''")}%')`;
      if (filterCategory !== "all")
        where += ` AND p.category_id = ${Number(filterCategory)}`;

      const sortField = sortBy.startsWith("stock_left")
        ? `stock_left ${sortBy.endsWith("DESC") ? "DESC" : "ASC"}`
        : `p.${sortBy}`;

      const res: any = await runSql(`
        SELECT
          p.*,
          c.name as category_name,
          COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0)
            -
          COALESCE((SELECT SUM(quantity) FROM sale_products WHERE product_id = p.id), 0)
            AS stock_left
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE ${where}
        ORDER BY ${sortField}
        LIMIT ${PAGE_SIZE} OFFSET ${offset}
      `);
      setProducts(res.rows || []);

      const countRes: any = await runSql(`
        SELECT COUNT(*) as cnt
        FROM products p
        WHERE ${where}
      `);
      setTotalCount(countRes.rows?.[0]?.cnt || 0);
    } catch (e: any) {
      console.error(e?.message ?? "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, filterCategory, sortBy]);

  useEffect(() => {
    fetchProducts();
  }, [page, search, filterCategory, sortBy]);

  const refreshProducts = async () => {
    await fetchProducts();
  };

  return (
    <StockContext.Provider
      value={{
        products,
        categories,
        page,
        totalCount,
        loading,
        actionLoading,
        setPage,
        setActionLoading,
        refreshProducts,
      }}
    >
      {children}
    </StockContext.Provider>
  );
};

export const useStock = () => {
  const context = useContext(StockContext);
  if (!context) {
    throw new Error("useStock must be used within a StockProvider");
  }
  return context;
};