// src/pages/Products.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { runSql } from "@/runSql";
import { PaginationSection } from "@/components/pagination-section";
import { NewProduct } from "./new-product";
import { EditProductDialog } from "./edit-product";
import { DeleteProductDialog } from "./delete-product";
import { SelectLabel } from "@radix-ui/react-select";
import { useDebounce } from "use-debounce";
import { AdjustInventoryDialog } from "./adjust-inventory";
import { useNavigate } from "react-router-dom";
import { routes } from "@/main";
import { ExportProductsDialog } from "./export-dialog";
import { Eye } from "lucide-react";

// Define the Product type based on your schema
type Product = {
  id: number;
  name: string;
  barcode: string | null;
  current_price_unit: number;
  quantity: number;
  image_base64: string | null;
  category_id: number;
  category_name: string;
  created_at: string;
  updated_at: string;
};

type Category = {
  id: number;
  name: string;
};

export default function ProductsPage() {
  const navigate = useNavigate(); // Add navigate hook
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  // @ts-ignore
  const [loading, setLoading] = useState(true);
  // @ts-ignore
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalProducts, setTotalProducts] = useState(0);
  const [categoryId, setCategoryId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("created_at DESC");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300); // Debounce search input by 300ms

  // Calculate total pages
  const pageCount = Math.ceil(totalProducts / pageSize);

  // Fetch categories for filter dropdown
  const fetchCategories = async () => {
    try {
      const query = `SELECT id, name FROM product_categories ORDER BY name`;
      const result = await runSql(query);
      setCategories(result as Category[]);
    } catch (err) {
      console.error("Error in fetchCategories:", err);
      setError(`Failed to fetch categories: ${(err as Error).message}`);
    }
  };

  // Fetch products with filtering, searching, and sorting
  const fetchProducts = async () => {
    try {
      setLoading(true);

      // Build WHERE clause
      let whereClauses: string[] = [];
      let countWhereClauses: string[] = [];
      if (categoryId) {
        const escapedCategoryId = parseInt(categoryId, 10);
        if (!isNaN(escapedCategoryId)) {
          whereClauses.push(`p.category_id = ${escapedCategoryId}`);
          countWhereClauses.push(`category_id = ${escapedCategoryId}`);
        }
      }
      if (debouncedSearchQuery) {
        const escapedSearch = debouncedSearchQuery.replace(/'/g, "''");
        whereClauses.push(
          `(p.name LIKE '%${escapedSearch}%' OR p.barcode LIKE '%${escapedSearch}%')`
        );
        countWhereClauses.push(
          `(name LIKE '%${escapedSearch}%' OR barcode LIKE '%${escapedSearch}%')`
        );
      }
      const whereClause = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
      const countWhereClause = countWhereClauses.length
        ? `WHERE ${countWhereClauses.join(" AND ")}`
        : "";

      // Query to get total count
      const countQuery = `SELECT COUNT(*) as total FROM products ${countWhereClause}`;
      const countResult = await runSql(countQuery);
      // @ts-ignore
      setTotalProducts(countResult[0].total);

      // Query to get paginated products
      const offset = (page - 1) * pageSize;
      const query = `
        SELECT p.*, pc.name as category_name
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        ${whereClause}
        ORDER BY ${sortOption}
        LIMIT ${pageSize} OFFSET ${offset}
      `;
      const result = await runSql(query);
      // @ts-ignore
      setProducts(result);
    } catch (err) {
      console.error("Error in fetchProducts:", err);
      setError(`Failed to fetch products: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories and products on mount, and re-fetch on filter/sort/page change
  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, [page, categoryId, debouncedSearchQuery, sortOption]);

  // Reset page to 1 when filters or sort change
  useEffect(() => {
    setPage(1);
  }, [categoryId, debouncedSearchQuery, sortOption]);

  // if (loading) return <div>Loading products...</div>;
  // if (error) return <div>Error: {error}</div>;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex gap-4">
          <Button onClick={() => navigate(routes.BulkCreateProducts)} variant={'outline'} size={'sm'}>
            Bulk Create Products
          </Button>
          <NewProduct categories={categories} fetchProducts={fetchProducts} />
        </div>
      </div>
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>All Categories</SelectLabel>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Input
          placeholder="Search by name or barcode"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
        <Select value={sortOption} onValueChange={setSortOption}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name ASC">Name (A-Z)</SelectItem>
            <SelectItem value="name DESC">Name (Z-A)</SelectItem>
            <SelectItem value="current_price_unit ASC">Price (Low to High)</SelectItem>
            <SelectItem value="current_price_unit DESC">Price (High to Low)</SelectItem>
            <SelectItem value="quantity ASC">Stock (Low to High)</SelectItem>
            <SelectItem value="quantity DESC">Stock (High to Low)</SelectItem>
            <SelectItem value="created_at DESC">Newest First</SelectItem>
            <SelectItem value="created_at ASC">Oldest First</SelectItem>
          </SelectContent>
        </Select>
         <ExportProductsDialog
          categoryId={categoryId}
          searchQuery={debouncedSearchQuery}
        />
      </div>
      {/* Table */}
      <div className="border rounded-md shadow overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left">Image</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Barcode</th>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-left">Price</th>
              <th className="px-4 py-2 text-left">Stock</th>
              <th className="px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length > 0 ? (
              products.map((product) => (
                <tr key={product.id} className="border-t">
                  <td className="px-4 py-2">
                    {product.image_base64 ? (
                      <img
                        src={product.image_base64}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 flex items-center justify-center rounded">
                        No Image
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2">{product.name}</td>
                  <td className="px-4 py-2">{product.barcode || "N/A"}</td>
                  <td className="px-4 py-2">{product.category_name || "N/A"}</td>
                  <td className="px-4 py-2">${product.current_price_unit.toFixed(2)}</td>
                  <td className="px-4 py-2">{product.quantity}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <Button variant={'link'} size={'sm'} onClick={() => navigate(routes.productId + product.id)}>
                      <Eye />
                    </Button>
                    <AdjustInventoryDialog
                      product={{
                        id: product.id,
                        name: product.name,
                        quantity: product.quantity,
                        current_price_unit: product.current_price_unit,
                      }}
                      fetchProducts={fetchProducts}
                    />
                    <EditProductDialog
                      product={{
                        id: product.id,
                        name: product.name,
                        barcode: product.barcode,
                        current_price_unit: product.current_price_unit,
                        image_base64: product.image_base64,
                      }}
                      fetchProducts={fetchProducts}
                    />
                    <DeleteProductDialog
                      product={{ id: product.id, name: product.name }}
                      fetchProducts={fetchProducts}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-2 text-center">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <PaginationSection
        page={page}
        pageCount={pageCount}
        setPage={setPage}
        maxPagesToShow={5}
      />
    </>
  );
}