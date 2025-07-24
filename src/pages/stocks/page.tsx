import React, { useEffect, useState } from "react";
import {
  Button,
} from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { runSql } from "@/runSql";
import { cn, fileToBase64 } from "@/lib/utils";
import { ExportDialog } from "@/components/export-dialog";

type Product = {
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
};

type Category = {
  id: number;
  name: string;
};

const PAGE_SIZE = 10;

const sortOptions = [
  { value: "name ASC", label: "Name (A-Z)" },
  { value: "name DESC", label: "Name (Z-A)" },
  { value: "price_unit ASC", label: "Price (Low to High)" },
  { value: "price_unit DESC", label: "Price (High to Low)" },
  { value: "stock_left DESC", label: "Stock (High to Low)" },
  { value: "stock_left ASC", label: "Stock (Low to High)" },
  { value: "created_at DESC", label: "Newest" },
  { value: "created_at ASC", label: "Oldest" },
];

export default function StockPage() {
  // Main states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filter, sort, search
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState(sortOptions[0].value);

  // Dialog states
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [productName, setProductName] = useState("");
  const [productBarcode, setProductBarcode] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [priceUnit, setPriceUnit] = useState<number | "">("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories
  const fetchCategories = async () => {
    const res: any = await runSql("SELECT id, name FROM categories ORDER BY name");
    setCategories(res.rows || []);
  };

  // Dynamic fetch for products (with filters/sort/search)
  const fetchProducts = async () => {
    setLoading(true);
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
        COALESCE((SELECT SUM(quantity) FROM sale_items WHERE product_id = p.id), 0)
          AS stock_left
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${where}
      ORDER BY ${sortField}
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `);
    setProducts(res.rows || []);

    // Count total for pagination
    const countRes: any = await runSql(`
      SELECT COUNT(*) as cnt
      FROM products p
      WHERE ${where}
    `);
    setTotalCount(countRes.rows?.[0]?.cnt || 0);

    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { setPage(1); }, [search, filterCategory, sortBy]);
  useEffect(() => { fetchProducts(); }, [page, search, filterCategory, sortBy]);

  // Open dialog
  const openDialog = (prod?: Product) => {
    setEditId(prod?.id ?? null);
    setProductName(prod?.name ?? "");
    setProductBarcode(prod?.barcode ?? "");
    setCategoryId(prod?.category_id ?? "");
    setPriceUnit(prod?.price_unit ?? "");
    setImagePreview(prod?.image_base64 ? `${prod.image_base64}` : null);
    setImageFile(null);
    setOpen(true);
    setError(null);
  };

  // File input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImageFile(e.target.files[0]);
      setImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  // Save product
  const handleSave = async () => {
    if (!productName.trim() || !productBarcode.trim() || !categoryId || !priceUnit || isNaN(Number(priceUnit))) {
      setError("All fields required");
      return;
    }
    let imageBase64 = null;
    if (imageFile) {
      imageBase64 = await fileToBase64(imageFile);
    } else if (editId) {
      const oldProd = products.find((p) => p.id === editId);
      imageBase64 = oldProd?.image_base64 || null;
    }

    try {
      if (editId) {
        await runSql(`
          UPDATE products SET 
            name = '${productName.replace(/'/g, "''")}', 
            barcode = '${productBarcode.replace(/'/g, "''")}', 
            category_id = ${categoryId}, 
            price_unit = ${Number(priceUnit)},
            image_base64 = ${imageBase64 ? `'${imageBase64}'` : "NULL"},
            updated_at = '${new Date().toISOString()}'
          WHERE id = ${editId}
        `);
      } else {
        await runSql(`
          INSERT INTO products 
            (name, barcode, category_id, price_unit, image_base64, created_at, updated_at)
          VALUES (
            '${productName.replace(/'/g, "''")}', 
            '${productBarcode.replace(/'/g, "''")}', 
            ${categoryId}, 
            ${Number(priceUnit)},
            ${imageBase64 ? `'${imageBase64}'` : "NULL"}, 
            '${new Date().toISOString()}', 
            '${new Date().toISOString()}'
          )
        `);
      }
      setOpen(false);
      setProductName("");
      setProductBarcode("");
      setCategoryId("");
      setPriceUnit("");
      setImageFile(null);
      setImagePreview(null);
      setEditId(null);
      setError(null);
      await fetchProducts();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  };

  // Delete product
  const handleDelete = async (id: number) => {
    try {
      await runSql(`DELETE FROM products WHERE id = ${id}`);
      await fetchProducts();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  };

  const pageCount = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      {/* Controls: Search, Filter, Sort */}
      <div className="flex flex-wrap gap-2 justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Products</h2>
        <div className="flex gap-2 flex-1">
          {/* Search input */}
          <Input
            placeholder="Search product or barcode"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full"
          />

          {/* Category Filter */}
          <Select
            value={filterCategory}
            onValueChange={v => setFilterCategory(v)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Categories</SelectLabel>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Sort</SelectLabel>
                {sortOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Button onClick={() => openDialog()}>New Product</Button>
          <ExportDialog
            buildQuery={(range, s, e) =>
              `SELECT p.*, c.name as category_name,
                COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0)
                  -
                COALESCE((SELECT SUM(quantity) FROM sale_items WHERE product_id = p.id), 0)
                  AS stock_left
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                ${range === "between" && s && e ? `WHERE (date(p.created_at) >= '${s}' AND date(p.created_at) <= '${e}')
                OR (date(p.updated_at) >= '${s}' AND date(p.updated_at) <= '${e}')` : ""}
                ORDER BY p.created_at DESC`
            }
            filePrefix="products"
            excludeFields={["image_base64"]}
          />
        </div>
      </div>

      {/* Table */}
      {/* {loading && <div>Loading...</div>} */}
      {error && <div className="mb-2 text-red-600">{error}</div>}
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
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-6">
                  No products
                </td>
              </tr>
            )}
            {products.map((prod) => (
              <tr key={prod.id} className="border-t">
                <td className="px-2 py-1">
                  {prod.image_base64 ? (
                    <img
                      src={`data:image/png;base64,${prod.image_base64}`}
                      alt={prod.name}
                      className="h-10 w-10 object-cover rounded"
                    />
                  ) : (
                    <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center text-gray-400">-</div>
                  )}
                </td>
                {[
                  prod.name,
                  prod.barcode,
                  prod.category_name,
                  prod.price_unit?.toFixed(2),
                  prod.stock_left ?? 0,
                ].map((item, index) => (
                  <td className={cn(["px-4 py-2", prod.stock_left && (prod.stock_left < 2 ? "text-orange-700" : "")])} key={index}>{item}</td>
                ))}
                <td className="px-4 py-2 text-center space-x-2">
                  <Button size="sm" variant="outline" onClick={() => openDialog(prod)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(prod.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex gap-2 justify-center my-4">
          <Button size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          {Array.from({ length: pageCount }, (_, i) => (
            <Button
              key={i + 1}
              size="sm"
              variant={page === i + 1 ? "default" : "outline"}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </Button>
          ))}
          <Button size="sm" disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      {/* Dialog for Create/Edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Product" : "New Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={productName}
              onChange={e => setProductName(e.target.value)}
              placeholder="Product name"
              className="w-full"
            />
            <Input
              value={productBarcode}
              onChange={e => setProductBarcode(e.target.value)}
              placeholder="Barcode"
              className="w-full"
            />
            <Select
              value={categoryId === "" ? "" : categoryId.toString()}
              onValueChange={v => setCategoryId(Number(v))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Categories</SelectLabel>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={0}
              value={priceUnit}
              onChange={e => setPriceUnit(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Unit Price"
              className="w-full"
            />
            <div>
              <label className="block text-xs text-gray-500 mb-1">Image</label>
              <Input type="file" accept="image/*" onChange={handleFileChange} />
              {imageFile ? (
                <img
                  src={imagePreview!}
                  alt="preview"
                  className="h-20 mt-2 rounded"
                />
              ) : imagePreview ? (
                <img
                  src={imagePreview.startsWith("blob:") ? imagePreview : "/" + imagePreview.replace(/^\//, "")}
                  alt="preview"
                  className="h-20 mt-2 rounded"
                />
              ) : null}
            </div>
            {/* Show stock left (readonly) when editing */}
            {editId && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Stock Left</label>
                <Input
                  value={products.find(p => p.id === editId)?.stock_left ?? 0}
                  className="w-full bg-gray-100 dark:bg-neutral-900 cursor-not-allowed"
                />
              </div>
            )}
          </div>
          {error && <div className="text-red-600 mt-2">{error}</div>}
          <DialogFooter className="gap-2">
            <Button onClick={() => setOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleSave}>{editId ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
