import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fileToBase64 } from "@/lib/utils";
import { runSql } from "@/runSql";
import { useStock } from "./stock-provider";

export const DialogNewProduct = ({ open = false, setOpen, editProduct, setEditProduct }: any) => {
  const { categories, setActionLoading, refreshProducts } = useStock();
  const [productName, setProductName] = useState("");
  const [productBarcode, setProductBarcode] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [priceUnit, setPriceUnit] = useState<number | "">("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editProduct) {
      setProductName(editProduct.name);
      setProductBarcode(editProduct.barcode);
      setCategoryId(editProduct.category_id);
      setPriceUnit(editProduct.price_unit);
      setQuantity(editProduct.stock_left ?? "");
      setImagePreview(editProduct.image_base64 || null);
      setImageFile(null);
    } else {
      resetForm();
    }
  }, [editProduct]);

  const resetForm = () => {
    setProductName("");
    setProductBarcode("");
    setCategoryId("");
    setPriceUnit("");
    setQuantity("");
    setImageFile(null);
    setImagePreview(null);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!productName.trim() || !productBarcode.trim() || !categoryId || !priceUnit || isNaN(Number(priceUnit)) || !quantity || isNaN(Number(quantity))) {
      setError("All fields are required, and price and quantity must be valid numbers");
      return;
    }
    if (Number(priceUnit) < 0 || Number(quantity) < 0) {
      setError("Price and quantity cannot be negative");
      return;
    }

    setIsSaving(true);
    setActionLoading(true);
    try {
      let imageBase64 = editProduct?.image_base64 || null;
      if (imageFile) {
        imageBase64 = await fileToBase64(imageFile);
      }

      const productData = {
        id: editProduct?.id,
        name: productName,
        barcode: productBarcode,
        category_id: Number(categoryId),
        price_unit: Number(priceUnit),
        quantity: Number(quantity),
        image_base64: imageBase64,
      };

      // Check for duplicate barcode
      const barcodeCheck: any = await runSql(
        `SELECT id FROM products WHERE barcode = '${productData.barcode.replace(/'/g, "''")}' ${productData.id ? `AND id != ${productData.id}` : ""}`,
        []
      );
      if (barcodeCheck.rows?.length > 0) {
        throw new Error("Barcode already exists");
      }

      if (productData.id) {
        // Update product
        await runSql(
          `UPDATE products SET 
          name = '${productData.name.replace(/'/g, "''")}', 
          barcode = '${productData.barcode.replace(/'/g, "''")}', 
          category_id = ${productData.category_id}, 
          price_unit = ${productData.price_unit},
          image_base64 = ${productData.image_base64 ? `'${productData.image_base64}'` : "NULL"},
          updated_at = '${new Date().toISOString()}'
        WHERE id = ${productData.id}`,
          []
        );
        // Adjust stock if quantity changed
        const oldProd: any = await runSql(
          `SELECT COALESCE((
          SELECT SUM(quantity) FROM stock_entries WHERE product_id = ${productData.id}
        ), 0) - COALESCE((
          SELECT SUM(quantity) FROM sale_products WHERE product_id = ${productData.id}
        ), 0) AS stock_left`,
          []
        );
        const currentStock = oldProd.rows?.[0]?.stock_left ?? 0;
        const quantityDelta = Number(productData.quantity) - currentStock;
        if (quantityDelta !== 0) {
          await runSql(
            `INSERT INTO stock_entries 
            (product_id, quantity, entry_type, created_at)
          VALUES (
            ${productData.id},
            ${Math.abs(quantityDelta)},
            '${quantityDelta > 0 ? "manual" : "correction"}',
            '${new Date().toISOString()}'
          )`,
            []
          );
        }
      } else {
        // Insert new product
        await runSql(
          `INSERT INTO products 
          (name, barcode, category_id, price_unit, image_base64, created_at, updated_at)
        VALUES (
          '${productData.name.replace(/'/g, "''")}', 
          '${productData.barcode.replace(/'/g, "''")}', 
          ${productData.category_id}, 
          ${productData.price_unit},
          ${productData.image_base64 ? `'${productData.image_base64}'` : "NULL"}, 
          '${new Date().toISOString()}', 
          '${new Date().toISOString()}'
        )`,
          []
        );
        // Get the last inserted ID
        const result: any = await runSql(`SELECT last_insert_rowid() as id`, []);
        const newProductId = result.rows?.[0]?.id;
        if (newProductId && Number(productData.quantity) > 0) {
          await runSql(
            `INSERT INTO stock_entries 
            (product_id, quantity, entry_type, created_at)
          VALUES (
            ${newProductId},
            ${Number(productData.quantity)},
            'manual',
            '${new Date().toISOString()}'
          )`,
            []
          );
        }
      }

      resetForm();
      setOpen(false);
      setEditProduct(null);
      await refreshProducts();
    } catch (e: any) {
      console.error("Save product error:", e);
      setError(e?.message ?? "Failed to save product");
    } finally {
      setIsSaving(false);
      setActionLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          resetForm();
          setEditProduct(null);
        }
        setOpen(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editProduct ? "Edit Product" : "New Product"}</DialogTitle>
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
          <Input
            type="number"
            min={0}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="Initial Quantity"
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
          <Button
            onClick={() => setOpen(false)}
            variant="secondary"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : editProduct ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};