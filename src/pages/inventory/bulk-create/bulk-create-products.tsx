// src/components/BulkCreateProducts.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import { routes } from "@/main";
import { useImagePath } from "@/context/document-path-context";

type Category = {
  id: number;
  name: string;
};

type ProductEntry = {
  id?: number;
  name: string;
  barcode: string | null;
  quantity: number;
  current_price_unit: number;
  original_bought_price: number;
  category_id: number;
  category_name?: string;
  image_path?: string | null;
  isNew: boolean;
};

export default function BulkCreateProducts() {
  const navigate = useNavigate();
  const [barcode, setBarcode] = useState("");
  const [products, setProducts] = useState<ProductEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newProduct, setNewProduct] = useState<ProductEntry>({
    name: "",
    barcode: null,
    quantity: 0,
    current_price_unit: 0,
    original_bought_price: 0,
    category_id: 0,
    isNew: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showNewProductDialog, setShowNewProductDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch categories (unchanged)
  const fetchCategories = async () => {
    try {
      const query = `SELECT id, name FROM product_categories ORDER BY name`;
      const result = await runSql(query);
      setCategories(result as Category[]);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError(`Failed to fetch categories: ${(err as Error).message}`);
      toast.error(`Failed to fetch categories: ${(err as Error).message}`);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Compress and crop image to 200x200 pixels (unchanged)
  const compressAndCropImage = (file: File): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context not supported"));
          return;
        }
        canvas.width = 200;
        canvas.height = 200;
        const size = Math.min(img.width, img.height);
        const offsetX = (img.width - size) / 2;
        const offsetY = (img.height - size) / 2;
        ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, 200, 200);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to create blob"));
              return;
            }
            blob.arrayBuffer().then((buffer) => {
              resolve(new Uint8Array(buffer));
            }).catch(reject);
          },
          "image/jpeg",
          0.7
        );
      };
      img.onerror = (err) => reject(err);
    });
  };

  // Handle image file selection (unchanged)
  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  // Handle barcode input (unchanged)
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode) return;

    try {
      setLoading(true);
      const query = `SELECT p.id, p.name, p.barcode, p.current_price_unit, p.original_bought_price, p.quantity, p.category_id, p.image_path, pc.name as category_name
                    FROM products p
                    LEFT JOIN product_categories pc ON p.category_id = pc.id
                    WHERE p.barcode = '${barcode.replace(/'/g, "''")}'`;
      const result = await runSql(query);
      //@ts-ignore
      if (result.length > 0) {
        //@ts-ignore
        const product = result[0] as ProductEntry;
        product.isNew = false;
        product.quantity = 1; // Default quantity to add
        setProducts((prev) => {
          const existing = prev.find((p) => p.barcode === product.barcode);
          if (existing) {
            return prev.map((p) =>
              p.barcode === product.barcode
                ? { ...p, quantity: p.quantity + 1 }
                : p
            );
          }
          return [...prev, product];
        });
      } else {
        setNewProduct({ ...newProduct, barcode });
        setShowNewProductDialog(true);
      }
      setBarcode("");
    } catch (err) {
      console.error("Error checking barcode:", err);
      setError(`Failed to check barcode: ${(err as Error).message}`);
      toast.error(`Failed to check barcode: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle new product form submission (unchanged)
  const handleNewProductSubmit = async () => {
    if (!newProduct.name) {
      setError("Name is required");
      return;
    }
    if (newProduct.current_price_unit <= 0) {
      setError("Price must be greater than 0");
      return;
    }
    if (newProduct.original_bought_price <= 0) {
      setError("Original Bought Price must be greater than 0");
      return;
    }
    if (newProduct.quantity <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }
    if (!newProduct.category_id) {
      setError("Category is required");
      return;
    }

    let imagePath: string | null = null;
    if (imageFile) {
      try {
        const compressedData = await compressAndCropImage(imageFile);
        const fileName = `${Date.now()}_${imageFile.name.replace(/\.[^/.]+$/, "")}.jpg`;
        imagePath = await invoke("save_image", {
          fileName,
          data: Array.from(compressedData),
        });
      } catch (err) {
        console.error("Error processing or saving image:", err);
        setError("Failed to process or save image");
        toast.error("Failed to process or save image");
        return;
      }
    }

    setProducts((prev) => [
      ...prev,
      {
        ...newProduct,
        isNew: true,
        image_path: imagePath,
        category_name: categories.find((c) => c.id === newProduct.category_id)?.name,
      },
    ]);
    setNewProduct({
      name: "",
      barcode: null,
      quantity: 0,
      current_price_unit: 0,
      original_bought_price: 0,
      category_id: 0,
      isNew: true,
    });
    setImageFile(null);
    setImagePreview(null);
    setShowNewProductDialog(false);
    setError(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
  };

  // Handle quantity change in table (unchanged)
  const updateQuantity = (index: number, quantity: string) => {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 0) return;
    setProducts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, quantity: qty } : p))
    );
  };

  // Handle save all products
  const handleSave = async () => {
    if (products.length === 0) {
      toast.error("No products to save");
      return;
    }
    setLoading(true);
    try {
      // Calculate invoice totals
      const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);
      const totalPrice = products.reduce((sum, p) => sum + p.quantity * p.current_price_unit, 0);
      const totalOriginalBoughtPrice = products.reduce(
        (sum, p) => sum + p.quantity * p.original_bought_price,
        0
      );

      // Create invoice
      const userId = 1; // Replace with actual user ID (e.g., from auth context)
      const invoiceQuery = `
        INSERT INTO invoices (invoice_type, total_quantity, total_price, total_original_bought_price, user_id)
        VALUES ('bought', ${totalQuantity}, ${totalPrice}, ${totalOriginalBoughtPrice}, ${userId})
      `;
      await runSql(invoiceQuery);

      // Fetch the created invoice ID
      const fetchInvoiceQuery = `
        SELECT id FROM invoices
        WHERE created_at >= datetime('now', '-1 minute')
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const invoiceResult = await runSql(fetchInvoiceQuery);
      //@ts-ignore
      if (!invoiceResult.length) {
        throw new Error("Failed to retrieve invoice ID");
      }
      //@ts-ignore
      const invoiceId = invoiceResult[0].id;

      // Save products and link to invoice
      for (const product of products) {
        if (product.isNew) {
          const productQuery = `
            INSERT INTO products (name, barcode, current_price_unit, original_bought_price, quantity, category_id, image_path)
            VALUES ('${product.name.replace(/'/g, "''")}', 
                    ${product.barcode ? `'${product.barcode.replace(/'/g, "''")}'` : "NULL"}, 
                    ${product.current_price_unit}, 
                    ${product.original_bought_price}, 
                    ${product.quantity}, 
                    ${product.category_id}, 
                    ${product.image_path ? `'${product.image_path.replace(/'/g, "''")}'` : "NULL"})
          `;
          await runSql(productQuery);

          const fetchProductQuery = `
            SELECT id FROM products
            WHERE name = '${product.name.replace(/'/g, "''")}'
              AND barcode = ${product.barcode ? `'${product.barcode.replace(/'/g, "''")}'` : "NULL"}
              AND created_at >= datetime('now', '-1 minute')
            ORDER BY created_at DESC
            LIMIT 1
          `;
          const productResult = await runSql(fetchProductQuery);
          //@ts-ignore
          if (!productResult.length) {
            throw new Error(`Failed to retrieve product ID for ${product.name}`);
          }
          //@ts-ignore
          product.id = productResult[0].id;
        } else {
          const updateQuery = `
            UPDATE products
            SET quantity = quantity + ${product.quantity},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${product.id}
          `;
          await runSql(updateQuery);
        }

        const historyQuery = `
          INSERT INTO history_product_entries (product_id, invoice_id, quantity, purchase_price, original_bought_price, entry_type, created_at)
          VALUES (${product.id}, ${invoiceId}, ${product.quantity}, ${product.current_price_unit}, ${product.original_bought_price}, 'purchase', CURRENT_TIMESTAMP)
        `;
        await runSql(historyQuery);
      }

      toast.success("Products and invoice saved successfully!");
      setProducts([]);
      navigate(routes.productInventory);
    } catch (err) {
      console.error("Error saving products:", err);
      setError(`Failed to save products: ${(err as Error).message}`);
      toast.error(`Failed to save products: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Bulk Create Products</h1>
        <Button variant="outline" onClick={() => navigate(routes.productInventory)} size={'sm'}>
          Back to Inventory
        </Button>
      </div>
      <form onSubmit={handleBarcodeSubmit} className="mb-6">
        <div className="flex gap-4">
          <Input
            placeholder="Scan or enter barcode"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            className="w-full sm:w-[300px]"
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !barcode}>
            {loading ? "Checking..." : "Add Product"}
          </Button>
        </div>
      </form>
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      <div className="border rounded-md shadow overflow-x-auto mb-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Original Bought Price</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length > 0 ? (
              products.map((product, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {product.image_path && (
                      <img
                        src={useImagePath(product.image_path)}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                  </TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.barcode || "N/A"}</TableCell>
                  <TableCell>{product.category_name || "N/A"}</TableCell>
                  <TableCell>{product.current_price_unit.toFixed(2)}</TableCell>
                  <TableCell>{product.original_bought_price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={product.quantity}
                      onChange={(e) => updateQuantity(index, e.target.value)}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        setProducts(products.filter((_, i) => i !== index))
                      }
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  No products added yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <Button onClick={handleSave} disabled={loading || products.length === 0}>
        {loading ? "Saving..." : "Save All Products"}
      </Button>

      {/* New Product Dialog */}
      <Dialog open={showNewProductDialog} onOpenChange={setShowNewProductDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Product</DialogTitle>
            <DialogDescription>
              Enter details for the new product with barcode {newProduct.barcode}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6">
            <Input
              placeholder="Name"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              required
            />
            <Input
              placeholder="Original Bought Price (Unit)"
              type="number"
              step="0.01"
              min="0"
              value={newProduct.original_bought_price || ""}
              onChange={(e) =>
                setNewProduct({ ...newProduct, original_bought_price: parseFloat(e.target.value) || 0 })
              }
              required
            />
            <Input
              placeholder="Price (Unit)"
              type="number"
              step="0.01"
              min="0"
              value={newProduct.current_price_unit || ""}
              onChange={(e) =>
                setNewProduct({ ...newProduct, current_price_unit: parseFloat(e.target.value) || 0 })
              }
              required
            />
            <Input
              placeholder="Quantity"
              type="number"
              min="0"
              value={newProduct.quantity || ""}
              onChange={(e) =>
                setNewProduct({ ...newProduct, quantity: parseInt(e.target.value) || 0 })
              }
              required
            />
            <Select
              value={newProduct.category_id.toString()}
              onValueChange={(value) =>
                setNewProduct({ ...newProduct, category_id: parseInt(value) })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Select a Category</SelectLabel>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Input type="file" accept="image/*" onChange={handleImageChange} />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                className="w-24 h-24 object-cover rounded"
              />
            )}
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={loading} onClick={() => setShowNewProductDialog(false)}>
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={handleNewProductSubmit} disabled={loading}>
              {loading ? "Adding..." : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}