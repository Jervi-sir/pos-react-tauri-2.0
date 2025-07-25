import React, { ChangeEvent, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useStoreInfo } from "@/context/store-info-context";
import { ThemeSettings } from "./theme-settings";

export default function SettingsPage() {
  const { storeInfo, updateStoreInfo } = useStoreInfo();
  // For local form editing state
  const [form, setForm] = useState({ ...storeInfo });
  const [saving, setSaving] = useState(false);

  // Update local form state when context data changes (if storeInfo is updated elsewhere)
  React.useEffect(() => {
    setForm({ ...storeInfo });
  }, [storeInfo]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setForm((prev) => ({ ...prev, logo_base64: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    await updateStoreInfo(form); // Will update state & localStorage via context
    setSaving(false);
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
              <Input id="name" name="name" value={form.name} onChange={handleChange} autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" value={form.address} onChange={handleChange} autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" value={form.phone} onChange={handleChange} autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" value={form.email} onChange={handleChange} autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_id">Tax ID</Label>
              <Input id="tax_id" name="tax_id" value={form.tax_id} onChange={handleChange} autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" name="currency" value={form.currency} onChange={handleChange} autoComplete="off" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="logo_base64">Logo</Label>
              <Input id="logo_base64" type="file" accept="image/*" onChange={handleLogoChange} />
              <div className="mt-2">
                {form.logo_base64 && (
                  <img
                    src={form.logo_base64}
                    alt="Logo Preview"
                    className="max-h-24 rounded shadow"
                    style={{ maxWidth: "100%" }}
                  />
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <Button className="w-full mt-6" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
