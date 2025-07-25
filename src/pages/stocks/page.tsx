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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PaginationSection } from "@/components/pagination-section";
import { StockActionsDropdown } from "./stock-action-dropdown";

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
  const [actionLoading, setActionLoading] = useState(false);

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

  // Stock adjustment dialog
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockProductId, setStockProductId] = useState<number | null>(null);
  const [stockQuantity, setStockQuantity] = useState<number | "">("");
  const [stockEntryType, setStockEntryType] = useState<"manual" | "correction" | "return">("manual");

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null);

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const res: any = await runSql("SELECT id, name FROM categories ORDER BY name");
      setCategories(res.rows || []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to fetch categories");
    }
  };

  // Dynamic fetch for products
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

      // Count total for pagination
      const countRes: any = await runSql(`
        SELECT COUNT(*) as cnt
        FROM products p
        WHERE ${where}
      `);
      setTotalCount(countRes.rows?.[0]?.cnt || 0);
    } catch (e: any) {
      setError(e?.message ?? "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { setPage(1); }, [search, filterCategory, sortBy]);
  useEffect(() => { fetchProducts(); }, [page, search, filterCategory, sortBy]);

  // Open product dialog
  const openDialog = (prod?: Product) => {
    setEditId(prod?.id ?? null);
    setProductName(prod?.name ?? "");
    setProductBarcode(prod?.barcode ?? "");
    setCategoryId(prod?.category_id ?? "");
    setPriceUnit(prod?.price_unit ?? "");
    setImagePreview(prod?.image_base64 || null);
    setImageFile(null);
    setOpen(true);
    setError(null);
  };

  // Open stock adjustment dialog
  const openStockDialog = (productId: number, currentStock: number) => {
    setStockProductId(productId);
    setStockQuantity(currentStock);
    setStockEntryType("manual");
    setStockDialogOpen(true);
    setError(null);
  };

  // File input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Save product
  const handleSave = async () => {
    if (!productName.trim() || !productBarcode.trim() || !categoryId || !priceUnit || isNaN(Number(priceUnit))) {
      setError("All fields are required and price must be a valid number");
      return;
    }
    if (Number(priceUnit) < 0) {
      setError("Price cannot be negative");
      return;
    }
    setActionLoading(true);
    try {
      // Check for duplicate barcode
      const barcodeCheck: any = await runSql(`
        SELECT id FROM products WHERE barcode = '${productBarcode.replace(/'/g, "''")}' ${editId ? `AND id != ${editId}` : ""}
      `);
      if (barcodeCheck.rows?.length > 0) {
        setError("Barcode already exists");
        return;
      }

      let imageBase64 = null;
      if (imageFile) {
        imageBase64 = await fileToBase64(imageFile);
      } else if (editId) {
        const oldProd = products.find((p) => p.id === editId);
        imageBase64 = oldProd?.image_base64 || null;
      }

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
      resetForm();
      await fetchProducts();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save product");
    } finally {
      setActionLoading(false);
    }
  };

  // Save stock adjustment
  const handleStockSave = async () => {
    if (!stockProductId || !stockQuantity || isNaN(Number(stockQuantity)) || Number(stockQuantity) < 0) {
      setError("Valid stock quantity is required");
      return;
    }
    setActionLoading(true);
    try {
      const product = products.find((p) => p.id === stockProductId);
      if (!product) {
        setError("Product not found");
        return;
      }
      const currentStock = product.stock_left ?? 0;
      const quantityDelta = Number(stockQuantity) - currentStock;

      if (quantityDelta !== 0) {
        await runSql(`
          INSERT INTO stock_entries 
            (product_id, quantity, entry_type, created_at)
          VALUES (
            ${stockProductId},
            ${Math.abs(quantityDelta)},
            '${quantityDelta > 0 ? stockEntryType : "correction"}',
            '${new Date().toISOString()}'
          )
        `);
      }
      setStockDialogOpen(false);
      setStockProductId(null);
      setStockQuantity("");
      setStockEntryType("manual");
      await fetchProducts();
    } catch (e: any) {
      setError(e?.message ?? "Failed to adjust stock");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete product
  const handleDelete = async () => {
    if (!deleteProductId) return;
    setActionLoading(true);
    try {
      await runSql(`DELETE FROM products WHERE id = ${deleteProductId}`);
      setDeleteDialogOpen(false);
      setDeleteProductId(null);
      await fetchProducts();
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete product");
    } finally {
      setActionLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setProductName("");
    setProductBarcode("");
    setCategoryId("");
    setPriceUnit("");
    setImageFile(null);
    setImagePreview(null);
    setEditId(null);
    setError(null);
  };

  const pageCount = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="p-4">
      {/* Controls: Search, Filter, Sort */}
      <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Products</h2>
        <div className="flex gap-4 flex-1 items-center">
          <Input
            placeholder="Search product or barcode"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Categories</SelectLabel>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Sort</SelectLabel>
                {sortOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button onClick={() => openDialog()} disabled={actionLoading}>
            New Product
          </Button>
          <ExportDialog
            buildQuery={(range, s, e) =>
              `SELECT p.*, c.name as category_name,
                COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0)
                  -
                COALESCE((SELECT SUM(quantity) FROM sale_products WHERE product_id = p.id), 0)
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

      {/* Error Display */}
      {error && <div className="mb-4 text-red-600">{error}</div>}

      {/* Table */}
      {/* {loading && <div className="text-center py-6">Loading...</div>} */}
      {!loading && products.length === 0 && (
        <div className="text-center py-6">No products found</div>
      )}
      {!loading && products.length > 0 && (
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
                  <td className={cn(["px-4 py-2", prod.stock_left && prod.stock_left < 2 ? "text-orange-700" : ""])}>
                    {prod.name}
                  </td>
                  <td className="px-4 py-2">{prod.barcode}</td>
                  <td className="px-4 py-2">{prod.category_name}</td>
                  <td className="px-4 py-2">{prod.price_unit?.toFixed(2)}</td>
                  <td className={cn(["px-4 py-2", prod.stock_left && prod.stock_left < 2 ? "text-orange-700" : ""])}>
                    {prod.stock_left ?? 0}
                  </td>
                  <td className="text-center space-x-2">
                    <StockActionsDropdown
                      productId={prod.id}
                      stockLeft={prod.stock_left ?? 0}
                      // @ts-ignore
                      openDialog={openDialog}
                      openStockDialog={openStockDialog}
                      setDeleteProductId={setDeleteProductId}
                      setDeleteDialogOpen={setDeleteDialogOpen}
                      actionLoading={actionLoading}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <PaginationSection
        page={page}
        pageCount={pageCount}
        setPage={setPage}
        maxPagesToShow={5}
      />

      {/* Product Dialog */}
      <Dialog open={open} onOpenChange={(open) => { if (!open) resetForm(); setOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Product" : "New Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Product name"
              className="w-full"
            />
            <Input
              value={productBarcode}
              onChange={(e) => setProductBarcode(e.target.value)}
              placeholder="Barcode"
              className="w-full"
            />
            <Select
              value={categoryId === "" ? "" : categoryId.toString()}
              onValueChange={(v) => setCategoryId(Number(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Categories</SelectLabel>
                  {categories.map((cat) => (
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
              step="0.01"
              value={priceUnit}
              onChange={(e) => setPriceUnit(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Unit Price"
              className="w-full"
            />
            <div>
              <label className="block text-sm text-gray-500 mb-1">Image (optional)</label>
              <Input type="file" accept="image/*" onChange={handleFileChange} />
              {imagePreview && (
                <img
                  src={imagePreview.startsWith("data:") ? imagePreview : `data:image/png;base64,${imagePreview}`}
                  alt="preview"
                  className="h-20 mt-2 rounded"
                />
              )}
            </div>
          </div>
          {error && <div className="text-red-600 mt-2">{error}</div>}
          <DialogFooter className="gap-2">
            <Button onClick={() => setOpen(false)} variant="secondary" disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={actionLoading}>
              {actionLoading ? "Saving..." : editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Product</label>
              <Input
                value={products.find((p) => p.id === stockProductId)?.name ?? ""}
                disabled
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Current Stock</label>
              <Input
                value={products.find((p) => p.id === stockProductId)?.stock_left ?? 0}
                disabled
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">New Stock Quantity</label>
              <Input
                type="number"
                min={0}
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="New stock quantity"
                className="w-full"
              />
            </div>
            <Select value={stockEntryType} onValueChange={(v) => setStockEntryType(v as "manual" | "correction" | "return")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select entry type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Entry Type</SelectLabel>
                  <SelectItem value="manual">Manual Adjustment</SelectItem>
                  <SelectItem value="correction">Correction</SelectItem>
                  <SelectItem value="return">Return</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          {error && <div className="text-red-600 mt-2">{error}</div>}
          <DialogFooter className="gap-2">
            <Button onClick={() => setStockDialogOpen(false)} variant="secondary" disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleStockSave} disabled={actionLoading}>
              {actionLoading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={actionLoading}>
              {actionLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}