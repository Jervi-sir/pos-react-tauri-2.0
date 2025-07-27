// src/components/NewProduct.tsx
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { runSql } from "@/runSql";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

export const NewProduct = ({ categories, fetchProducts }: any) => {
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState<string | null>(null);
  const [currentPriceUnit, setCurrentPriceUnit] = useState("");
  const [originalBoughtPrice, setOriginalBoughtPrice] = useState(""); // New state
  const [quantity, setQuantity] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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

  // Handle image file selection and preview (unchanged)
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

  // Handle product creation
  const createProduct = async () => {
    // Validation
    if (!name) {
      setError("Name is required");
      return;
    }
    // if (!currentPriceUnit) {
    //   setError("Price (Unit) is required");
    //   return;
    // }
    if (!originalBoughtPrice) {
      setError("Original Bought Price is required");
      return;
    }
    if (!quantity) {
      setError("Quantity is required");
      return;
    }
    if (!categoryId) {
      setError("Category is required");
      return;
    }

    const price = currentPriceUnit ? parseFloat(currentPriceUnit) : 0;
    const boughtPrice = parseFloat(originalBoughtPrice); // New validation
    const qty = parseInt(quantity, 10);
    if (isNaN(price) || price < 0) {
      setError("Price must be a valid non-negative number");
      return;
    }
    if (isNaN(boughtPrice) || boughtPrice < 0) {
      setError("Original Bought Price must be a valid non-negative number");
      return;
    }
    if (isNaN(qty) || qty < 0) {
      setError("Quantity must be a valid non-negative number");
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

    const newProduct = {
      name,
      barcode,
      current_price_unit: price,
      original_bought_price: boughtPrice, // New field
      quantity: qty,
      category_id: parseInt(categoryId, 10),
      image_path: imagePath,
    };

    setLoading(true);
    try {
      const productQuery = `
        INSERT INTO products (name, barcode, current_price_unit, original_bought_price, quantity, category_id, image_path)
        VALUES ('${newProduct.name.replace(/'/g, "''")}', 
                ${newProduct.barcode ? `'${newProduct.barcode.replace(/'/g, "''")}'` : "NULL"}, 
                ${newProduct.current_price_unit}, 
                ${newProduct.original_bought_price}, 
                ${newProduct.quantity}, 
                ${newProduct.category_id}, 
                ${newProduct.image_path ? `'${newProduct.image_path.replace(/'/g, "''")}'` : "NULL"})
      `;
      await runSql(productQuery);

      let productId: number;
      if (newProduct.barcode) {
        const idQuery = `
          SELECT id FROM products 
          WHERE barcode = '${newProduct.barcode.replace(/'/g, "''")}'
          ORDER BY created_at DESC LIMIT 1
        `;
        const idResult = await runSql(idQuery);
        // @ts-ignore
        if (!idResult.length) {
          throw new Error("Product not found by barcode");
        }
        productId = (idResult as { id: number }[])[0].id;
      } else {
        const idQuery = `
          SELECT id FROM products 
          WHERE name = '${newProduct.name.replace(/'/g, "''")}' 
          ORDER BY created_at DESC LIMIT 1
        `;
        const idResult = await runSql(idQuery);
        // @ts-ignore
        if (!idResult.length) {
          throw new Error("Product not found by name");
        }
        productId = (idResult as { id: number }[])[0].id;
      }

      const historyQuery = `
        INSERT INTO history_product_entries (product_id, invoice_id, quantity, purchase_price, original_bought_price, entry_type)
        VALUES (${productId}, NULL, ${newProduct.quantity}, ${newProduct.current_price_unit}, ${newProduct.original_bought_price}, 'manual')
      `;
      await runSql(historyQuery);

      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }

      toast(`Product "${newProduct.name}" created successfully.`);
      setError(null);
      setImageFile(null);
      setImagePreview(null);
      setName("");
      setBarcode(null);
      setCurrentPriceUnit("");
      setOriginalBoughtPrice(""); // Reset new field
      setQuantity("");
      setCategoryId("");
      setIsOpen(false);
      await fetchProducts();
    } catch (err) {
      console.error("Error creating product:", err);
      setError(`Failed to create product: ${(err as Error).message}`);
      toast.error(`Failed to create product: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" onClick={() => setIsOpen(true)}>
          Create Product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
          <DialogDescription>
            Enter the details for the new product. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="min-h-96 rounded-md border p-2">
          <div className="grid gap-6 pt-4">
            <div className="grid gap-3">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                required
              />
            </div>
            <div className="grid gap-3">
              <Input
                id="barcode"
                value={barcode || ""}
                onChange={(e) => setBarcode(e.target.value || null)}
                placeholder="Barcode"
              />
            </div>
            <div className="grid gap-3">
              <Input
                id="original_bought_price"
                value={originalBoughtPrice}
                onChange={(e) => setOriginalBoughtPrice(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                placeholder="Original Bought Price (Unit)"
                required
              />
            </div>
            <div className="grid gap-3">
              <Input
                id="quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                type="number"
                min="0"
                placeholder="Quantity"
                required
              />
            </div>
            <div className="grid gap-3">
              <Input
                id="current_price_unit"
                value={currentPriceUnit}
                onChange={(e) => setCurrentPriceUnit(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                placeholder="Price (Unit)"
              />
            </div>
            <div className="grid gap-3">
              <Select
                value={categoryId}
                onValueChange={(value) => setCategoryId(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Select a Categories</SelectLabel>
                    {categories.map((category: any) => (
                      <SelectItem key={category.id} value={category.id.toString()} className="w-full">
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3">
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              {imagePreview && (
                <div className="mt-2">
                  <p className="text-sm font-medium">Image Preview:</p>
                  <img
                    src={imagePreview}
                    alt="Selected product"
                    className="w-24 h-24 object-cover rounded mt-1"
                  />
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={loading} onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={createProduct} disabled={loading}>
            {loading ? "Saving..." : "Save Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};