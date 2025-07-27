import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { runSql } from "@/runSql";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { useStoreInfo } from "@/context/store-info-context";

interface SetupStorePageProps {
  onComplete: () => void;
}

// @ts-ignore
export function SetupStorePage({ onComplete }: SetupStorePageProps) {
  const { saveToStorage } = useStoreInfo();
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    logo_path: null as string | null,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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
            blob
              .arrayBuffer()
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
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setImagePreview(null);
    }
  };

  // Handle form save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Validation
    if (!form.name) {
      setError("Store name is required");
      setSaving(false);
      return;
    }
    if (!imageFile) {
      setError("Store image is required");
      setSaving(false);
      return;
    }

    let logoPath: string | null = null;
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

    try {
      const query = `
        INSERT INTO store_info (name, address, phone, email, logo_path) 
        VALUES (
          '${form.name.replace(/'/g, "''")}',
          '${form.address.replace(/'/g, "''")}',
          '${form.phone.replace(/'/g, "''")}',
          '${form.email.replace(/'/g, "''")}',
          ${logoPath ? `'${logoPath.replace(/'/g, "''")}'` : "NULL"}
        )
      `;
      await runSql(query);

      // Clean up blob URL if it was used
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
      saveToStorage({
        name: form.name.replace(/'/g, "''"),
        address: form.address.replace(/'/g, "''"),
        phone: form.phone.replace(/'/g, "''"),
        email: form.email.replace(/'/g, "''"),
        logo_path: logoPath ? logoPath.replace(/'/g, "''") : null,
      })
      toast.success("Store information saved successfully!");
      setError(null);
      setImageFile(null);
      setImagePreview(null);
      setForm({ name: "", address: "", phone: "", email: "", logo_path: null });
      location.reload()
      // onComplete();
    } catch (err) {
      console.error("Error saving store info:", err);
      setError(`Failed to save store information: ${(err as Error).message}`);
      toast.error(`Failed to save store information: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Setup Store Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Store Name</Label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={form.address}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo_path">Logo</Label>
              <Input
                id="logo_path"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
              />
              {imagePreview && (
                <img
                  src={
                    imagePreview.startsWith("blob:")
                      ? imagePreview
                      : `file://${imagePreview}`
                  }
                  alt="Logo Preview"
                  className="max-h-24 rounded shadow mt-2"
                />
              )}
            </div>
            {error && <div className="text-red-600">{error}</div>}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Saving..." : "Save and Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}