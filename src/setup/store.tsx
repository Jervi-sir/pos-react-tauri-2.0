import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { runSql } from "@/runSql";

interface SetupStorePageProps {
  onComplete: () => void;
}

export function SetupStorePage({ onComplete }: SetupStorePageProps) {
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    logo_base64: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setForm((prev) => ({ ...prev, logo_base64: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await runSql(
        `INSERT INTO store_info (name, address, phone, email, logo_base64) 
         VALUES ('${form.name}', '${form.address}', '${form.phone}', '${form.email}', '${form.logo_base64}')`);
      // location.reload()
      onComplete(); // Signal completion
    } catch (error) {
      console.error("Error saving store info:", error);
      setError("Failed to save store information");
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
              <Input id="name" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" value={form.address} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" value={form.phone} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo_base64">Logo</Label>
              <Input id="logo_base64" type="file" accept="image/*" onChange={handleLogoChange} />
              {form.logo_base64 && (
                <img src={form.logo_base64} alt="Logo Preview" className="max-h-24 rounded shadow mt-2" />
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