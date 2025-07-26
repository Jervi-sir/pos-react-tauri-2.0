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
import { useRef, useState } from "react";

export const NewProduct = ({ categories, fetchProducts }: any) => {
  const [error, setError] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  // @ts-ignore
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState<string | null>(null);
  const [currentPriceUnit, setCurrentPriceUnit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);


  // Compress and resize image to 200x200 pixels
  const compressAndResizeImage = (file: File): Promise<string> => {
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

        // Set canvas size to 200x200
        canvas.width = 200;
        canvas.height = 200;

        // Calculate scaling to maintain aspect ratio
        const scale = Math.min(img.width, img.height) / 200;
        const width = img.width / scale;
        const height = img.height / scale;
        const offsetX = (200 - width) / 2;
        const offsetY = (200 - height) / 2;

        // Draw resized image
        ctx.drawImage(img, offsetX, offsetY, width, height);

        // Compress to JPEG with quality 0.7
        const base64 = canvas.toDataURL("image/jpeg", 0.7);
        resolve(base64);
      };
      img.onerror = (err) => reject(err);
    });
  };

  // Handle image file selection and conversion to Base64
  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }
      setImageFile(file);
      try {
        const compressedBase64 = await compressAndResizeImage(file);
        setImageBase64(compressedBase64);
      } catch (err) {
        console.error("Error compressing image:", err);
        setError("Failed to process image");
      }
    } else {
      setImageFile(null);
      setImageBase64(null);
    }
  };

  // Handle product creation
  const createProduct = async () => {
    // Validation
    if (!name) {
      setError("Name is required");
      return;
    }
    if (!currentPriceUnit) {
      setError("Price (Unit) is required");
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

    const price = parseFloat(currentPriceUnit);
    const qty = parseInt(quantity, 10);
    if (isNaN(price) || price < 0) {
      setError("Price must be a valid non-negative number");
      return;
    }
    if (isNaN(qty) || qty < 0) {
      setError("Quantity must be a valid non-negative number");
      return;
    }

    const newProduct = {
      name,
      barcode,
      current_price_unit: price,
      quantity: qty,
      category_id: parseInt(categoryId, 10),
      image_base64: imageBase64,
    };
    console.log("newProduct:", newProduct);

    try {
      // Insert into products
      const productQuery = `
        INSERT INTO products (name, barcode, current_price_unit, quantity, category_id, image_base64)
        VALUES ('${newProduct.name.replace(/'/g, "''")}', 
                ${newProduct.barcode ? `'${newProduct.barcode.replace(/'/g, "''")}'` : "NULL"}, 
                ${newProduct.current_price_unit}, 
                ${newProduct.quantity}, 
                ${newProduct.category_id}, 
                ${newProduct.image_base64 ? `'${newProduct.image_base64.replace(/'/g, "''")}'` : "NULL"})
      `;
      await runSql(productQuery);

      // Get the new product ID by barcode or name and created_at
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
        // Fallback to name and recent created_at
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

      // Insert into history_product_entries
      const historyQuery = `
        INSERT INTO history_product_entries (product_id, invoice_id, quantity, purchase_price, entry_type)
        VALUES (${productId}, NULL, ${newProduct.quantity}, ${newProduct.current_price_unit}, 'manual')
      `;
      await runSql(historyQuery);

      // Reset state and close dialog
      setError(null);
      setImageBase64(null);
      setImageFile(null);
      setName("");
      setBarcode(null);
      setCurrentPriceUnit("");
      setQuantity("");
      setCategoryId("");
      closeButtonRef.current?.click();
      await fetchProducts();
    } catch (err) {
      console.error("Error creating product:", err);
      setError(`Failed to create product: ${(err as Error).message}`);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size={'sm'}>Create Product</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
          <DialogDescription>
            Enter the details for the new product. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
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
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Barcode"
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
            <select
              id="category_id"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="border rounded p-2"
              required
            >
              <option value="">Select a category</option>
              {// @ts-ignore
                categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="grid gap-3">
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            {imageBase64 && (
              <div className="mt-2">
                <p className="text-sm font-medium">Image Preview:</p>
                <img
                  src={imageBase64}
                  alt="Selected product"
                  className="w-24 h-24 object-cover rounded mt-1"
                />
              </div>
            )}
          </div>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <DialogFooter>
          <DialogClose asChild>
            <Button ref={closeButtonRef} type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={createProduct}>Save Product</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};