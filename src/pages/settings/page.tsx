// src/components/SettingsPage.tsx
import React, { ChangeEvent, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useStoreInfo } from "@/context/store-info-context";
import { ThemeSettings } from "./theme-settings";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { useImagePath } from "@/context/document-path-context";
import StoragePath from "./storage-path";

type StoreInfo = {
  name: string;
  address: string;
  phone: string;
  email: string;
  tax_id: string;
  currency: string;
  logo_path: string; // Changed from logo_path to logo_path
};

export default function SettingsPage() {
  const { storeInfo, updateStoreInfo } = useStoreInfo();
  // For local form editing state
  // @ts-ignore
  const [form, setForm] = useState<StoreInfo>({ ...storeInfo });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(storeInfo.logo_path || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update local form state when context data changes
  useEffect(() => {
    // @ts-ignore
    setForm({ ...storeInfo });
    setImagePreview(storeInfo.logo_path || null);
  }, [storeInfo]);

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
            blob.arrayBuffer()
              .then((buffer) => {
                resolve(new Uint8Array(buffer));
              })
              .catch(reject);
          },
          "image/jpeg",
          0.7
        );
      };
      img.onerror = (err) => reject(err);
    });
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handle logo file selection and preview
  const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
      setImagePreview(form.logo_path || null);
    }
  };

  // Handle form save
  const handleSave = async () => {
    setSaving(true);
    setError(null);

    let logoPath: string | null = form.logo_path;
    if (imageFile) {
      try {
        // Compress and crop image
        const compressedData = await compressAndCropImage(imageFile);
        const fileName = `${Date.now()}_${imageFile.name.replace(/\.[^/.]+$/, "")}.jpg`;
        logoPath = await invoke("save_image", {
          fileName,
          data: Array.from(compressedData),
        });
      } catch (err) {
        console.error("Error processing or saving image:", err);
        setError("Failed to process or save image");
        toast.error("Failed to process or save image");
        setSaving(false);
        return;
      }
    }

    const updatedForm = { ...form, logo_path: logoPath };

    try {
      // @ts-ignore
      await updateStoreInfo(updatedForm);
      toast.success("Store settings saved successfully!");
      // Clean up blob URL if it was used
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
      setImageFile(null);
      setImagePreview(logoPath || null);
    } catch (err) {
      console.error("Error saving store settings:", err);
      setError(`Failed to save settings: ${(err as Error).message}`);
      toast.error(`Failed to save settings: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <ThemeSettings />
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Store Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="name">Store Name</Label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={form.address}
                onChange={handleChange}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_id">Tax ID</Label>
              <Input
                id="tax_id"
                name="tax_id"
                value={form.tax_id}
                onChange={handleChange}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                name="currency"
                value={form.currency}
                onChange={handleChange}
                autoComplete="off"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="logo_path">Logo</Label>
              <Input
                id="logo_path"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
              />
              <div className="mt-2">
                {imagePreview && (
                  <img
                    src={
                      imagePreview.startsWith("blob:")
                        ? imagePreview
                        : useImagePath(imagePreview)
                    }
                    alt="Logo Preview"
                    className="max-h-24 rounded shadow"
                    style={{ maxWidth: "100%" }}
                  />
                )}
              </div>
            </div>
            {error && <p className="text-red-500 text-sm md:col-span-2">{error}</p>}
            <div className="md:col-span-2">
              <Button className="w-full mt-6" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <StoragePath />
    </div>
  );
}