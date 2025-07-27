// src/components/EditProductDialog.tsx
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
import { Edit3 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import { useImagePath } from "@/context/document-path-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

type Category = {
  id: number;
  name: string;
};

type EditProductDialogProps = {
  product: {
    id: number;
    name: string;
    barcode: string | null;
    current_price_unit: number;
    original_bought_price: number;
    image_path: string | null;
    category_id: number; // Added category_id
  };
  fetchProducts: () => Promise<void>;
  categories: Category[]
};

export const EditProductDialog = ({ product, fetchProducts, categories }: EditProductDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(product.name);
  const [barcode, setBarcode] = useState<string | null>(product.barcode);
  const [currentPriceUnit, setCurrentPriceUnit] = useState(product.current_price_unit.toString());
  const [categoryId, setCategoryId] = useState(product.category_id.toString());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product.image_path);
  const [error, setError] = useState<string | null>(null);

  // Compress and crop image to 480x480 pixels
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

        // Set canvas to 480x480
        canvas.width = 480;
        canvas.height = 480;

        // Crop to square (use the smaller dimension)
        const size = Math.min(img.width, img.height);
        const offsetX = (img.width - size) / 2;
        const offsetY = (img.height - size) / 2;

        // Draw cropped image
        ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, 480, 480);

        // Convert to JPEG with quality 0.7
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

  // Handle image file selection and preview
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
      // Clean up previous blob URL if it exists
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    } else {
      // Clean up blob URL if it exists
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
      setImageFile(null);
      setImagePreview(product.image_path); // Revert to original image path
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
    if (parseFloat(currentPriceUnit) < product.original_bought_price) {
      setError("Price Should be greater then Original Price");
      return;
    }

    if (!categoryId) {
      setError("Category is required");
      return;
    }

    const price = parseFloat(currentPriceUnit);
    const catId = parseInt(categoryId, 10);
    if (isNaN(price) || price < 0) {
      setError("Price must be a valid non-negative number");
      return;
    }
    if (isNaN(catId) || catId <= 0) {
      setError("Please select a valid category");
      return;
    }

    let imagePath: string | null = product.image_path; // Default to existing path
    if (imageFile) {
      try {
        // Compress and crop image
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

    const updatedProduct = {
      id: product.id,
      name,
      barcode,
      current_price_unit: price,
      category_id: catId,
      image_path: imagePath,
    };

    setLoading(true);
    try {
      const query = `
        UPDATE products 
        SET name = '${updatedProduct.name.replace(/'/g, "''")}', 
            barcode = ${updatedProduct.barcode ? `'${updatedProduct.barcode.replace(/'/g, "''")}'` : "NULL"}, 
            current_price_unit = ${updatedProduct.current_price_unit}, 
            category_id = ${updatedProduct.category_id},
            image_path = ${updatedProduct.image_path ? `'${updatedProduct.image_path.replace(/'/g, "''")}'` : "NULL"}, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${updatedProduct.id}
      `;
      await runSql(query);

      // Clean up blob URL if it was used
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }

      toast(`Product "${updatedProduct.name}" updated successfully.`);
      setError(null);
      setImageFile(null);
      setImagePreview(imagePath); // Update preview to new path
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

  // Clean up blob URL on dialog close
  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen && imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(product.image_path); // Reset to original path
    }
    setOpen(isOpen);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} >
          <Edit3 />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update the details for "{product.name}". Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="min-h-80 rounded-md border p-2">
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label>Name</Label>
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
                value={"Original Price: DA " + product.original_bought_price}
                // onChange={(e) => setCurrentPriceUnit(e.target.value)}
                disabled
              />
            </div>
            <div className="grid gap-3">
              <Input
                id="current_price_unit"
                value={currentPriceUnit}
                onChange={(e) => setCurrentPriceUnit(e.target.value)}
                type="number"
                step="0.01"
                min={product.original_bought_price}
                placeholder="Price (Unit)"
                required
              />
            </div>
            <div className="gap-3">
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
                    {categories.map((category) => (
                      <SelectItem key={category?.id} value={category?.id.toString()} className="w-full">
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
                    src={imagePreview.startsWith("blob:") ? imagePreview : useImagePath(imagePreview)}
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
            <Button type="button" variant="outline" disabled={loading} onClick={() => handleDialogClose(false)}>
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