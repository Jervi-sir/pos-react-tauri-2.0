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
import { toast } from "sonner";

type EditProductDialogProps = {
  product: {
    id: number;
    name: string;
    barcode: string | null;
    current_price_unit: number;
    image_base64: string | null;
  };
  fetchProducts: () => Promise<void>;
};

export const EditProductDialog = ({ product, fetchProducts }: EditProductDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(product.name);
  const [barcode, setBarcode] = useState<string | null>(product.barcode);
  const [currentPriceUnit, setCurrentPriceUnit] = useState(product.current_price_unit.toString());
  const [imageBase64, setImageBase64] = useState<string | null>(product.image_base64);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
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

        canvas.width = 200;
        canvas.height = 200;

        const scale = Math.min(img.width, img.height) / 200;
        const width = img.width / scale;
        const height = img.height / scale;
        const offsetX = (200 - width) / 2;
        const offsetY = (200 - height) / 2;

        ctx.drawImage(img, offsetX, offsetY, width, height);
        const base64 = canvas.toDataURL("image/jpeg", 0.7);
        resolve(base64);
      };
      img.onerror = (err) => reject(err);
    });
  };

  // Handle image file selection
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

  // Handle product update
  const updateProduct = async () => {
    if (!name) {
      setError("Name is required");
      return;
    }
    if (!currentPriceUnit) {
      setError("Price (Unit) is required");
      return;
    }

    const price = parseFloat(currentPriceUnit);
    if (isNaN(price) || price < 0) {
      setError("Price must be a valid non-negative number");
      return;
    }

    const updatedProduct = {
      id: product.id,
      name,
      barcode,
      current_price_unit: price,
      image_base64: imageBase64,
    };
    console.log("updatedProduct:", updatedProduct);

    setLoading(true);
    try {
      // Fallback: String interpolation (less secure)
      const query = `
        UPDATE products 
        SET name = '${updatedProduct.name.replace(/'/g, "''")}', 
            barcode = ${updatedProduct.barcode ? `'${updatedProduct.barcode.replace(/'/g, "''")}'` : "NULL"}, 
            current_price_unit = ${updatedProduct.current_price_unit}, 
            image_base64 = ${updatedProduct.image_base64 ? `'${updatedProduct.image_base64.replace(/'/g, "''")}'` : "NULL"}, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${updatedProduct.id}
      `;
      await runSql(query);

      toast(`Product "${updatedProduct.name}" updated successfully.`);
      setError(null);
      setImageFile(null);
      setOpen(false);
      await fetchProducts();
    } catch (err) {
      console.error("Error updating product:", err);
      setError(`Failed to update product: ${(err as Error).message}`);
      toast.error(`Failed to update product: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update the details for "{product.name}". Click save when you're done.
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
              onChange={(e) => setBarcode(e.target.value || null)}
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
            <Button ref={closeButtonRef} type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={updateProduct} disabled={loading}>
            {loading ? "Saving..." : "Save Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};