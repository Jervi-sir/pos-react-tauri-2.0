import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { runSql } from "@/runSql";
import { fileToBase64 } from "@/lib/utils";

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
};

type Category = {
  id: number;
  name: string;
};

const PAGE_SIZE = 10;

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Dialog states
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [productName, setProductName] = useState("");
  const [productBarcode, setProductBarcode] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [priceUnit, setPriceUnit] = useState<number | "">(""); // NEW
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load categories for select
  const fetchCategories = async () => {
    const res: any = await runSql("SELECT id, name FROM categories ORDER BY name");
    setCategories(res.rows || []);
  };

  // Load products for current page
  const fetchProducts = async () => {
    setLoading(true);
    const offset = (page - 1) * PAGE_SIZE;
    const res: any = await runSql(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY p.created_at DESC
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `);
    setProducts(res.rows || []);

    // Get total count
    const countRes: any = await runSql(`SELECT COUNT(*) as cnt FROM products`);
    setTotalCount(countRes.rows?.[0]?.cnt || 0);

    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);
  useEffect(() => {
    fetchProducts();
  }, [page]);

  // Open dialog for create/edit
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

  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImageFile(e.target.files[0]);
      setImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  // Save product (create or update)
  const handleSave = async () => {
    if (!productName.trim() || !productBarcode.trim() || !categoryId || !priceUnit || isNaN(Number(priceUnit))) {
      setError("All fields required");
      return;
    }
    let imageBase64 = null;
    // If new image uploaded
    if (imageFile) {
      imageBase64 = await fileToBase64(imageFile);
    } else if (editId) {
      // keep existing image if editing and no new file selected
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

  // Pagination helpers
  const pageCount = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="py-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Products</h2>
        <Button onClick={() => openDialog()}>New Product</Button>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="mb-2 text-red-600">{error}</div>}
      <div className="border rounded-xl shadow overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left">Image</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Barcode</th>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-left">Price</th> {/* NEW */}
              <th className="px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6">
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
                <td className="px-4 py-2">{prod.name}</td>
                <td className="px-4 py-2">{prod.barcode}</td>
                <td className="px-4 py-2">{prod.category_name}</td>
                <td className="px-4 py-2">{prod.price_unit?.toFixed(2)}</td>
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
              value={categoryId.toString()}
              onValueChange={v => setCategoryId(Number(v))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
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
