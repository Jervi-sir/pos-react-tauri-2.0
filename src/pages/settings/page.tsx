import React, { useEffect, useState, ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { runSql } from "@/runSql";
import { ModeToggle } from "@/components/mode-toggle";

type StoreInfo = {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  tax_id: string;
  currency: string;
  logo_base64: string;
};

// Basic sanitization function to escape single quotes
const sanitizeSql = (input: string): string => {
  if (!input) return "";
  // Replace single quotes with double single quotes to escape them in SQLite
  return input.replace(/'/g, "''");
};

export default function SettingsPage() {
  const [data, setData] = useState<StoreInfo>({
    id: 1, // Fixed ID for the single row
    name: "",
    address: "",
    phone: "",
    email: "",
    tax_id: "",
    currency: "DZD",
    logo_base64: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Fetch the single row with id = 1
    runSql("SELECT * FROM store_info WHERE id = 1 LIMIT 1")
      // @ts-ignore
      .then((response: { rows: StoreInfo[] }) => {
        console.log("Raw response from runSql:", response); // Debug: Log raw response
        const rows = response.rows || [];
        console.log("Rows array:", rows); // Debug: Log rows array
        if (rows && Array.isArray(rows) && rows.length > 0 && rows[0]) {
          const fetchedData = rows[0];
          console.log("Fetched store_info:", fetchedData);
          // Map fetched data to StoreInfo, ensuring all fields are strings
          setData({
            id: fetchedData.id || 1,
            name: fetchedData.name || "",
            address: fetchedData.address || "",
            phone: fetchedData.phone || "",
            email: fetchedData.email || "",
            tax_id: fetchedData.tax_id || "",
            currency: fetchedData.currency || "DZD",
            logo_base64: fetchedData.logo_base64 || "",
          });
        } else {
          console.warn("No row found in store_info with id = 1, using default values");
          setData({
            id: 1,
            name: "",
            address: "",
            phone: "",
            email: "",
            tax_id: "",
            currency: "DZD",
            logo_base64: "",
          });
        }
      })
      .catch((error) => {
        console.error("Error fetching store_info:", error);
        setData({
          id: 1,
          name: "",
          address: "",
          phone: "",
          email: "",
          tax_id: "",
          currency: "DZD",
          logo_base64: "",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    console.log(`Input changed: ${name} = ${value}`); // Debug: Log input changes
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      console.log("Logo base64 updated:", base64.slice(0, 50) + "..."); // Debug: Log partial base64
      setData((prev) => ({ ...prev, logo_base64: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!data || data.id !== 1) {
      console.error("Cannot save: invalid data or incorrect id");
      return;
    }
    setSaving(true);
    try {
      // Sanitize inputs to prevent SQL injection
      const sanitizedData = {
        name: sanitizeSql(data.name),
        address: sanitizeSql(data.address),
        phone: sanitizeSql(data.phone),
        email: sanitizeSql(data.email),
        tax_id: sanitizeSql(data.tax_id),
        currency: sanitizeSql(data.currency),
        logo_base64: sanitizeSql(data.logo_base64),
      };

      console.log("Saving store_info:", data); // Debug: Log data being saved
      const result = await runSql(
        `
        UPDATE store_info
        SET name = '${sanitizedData.name}',
            address = '${sanitizedData.address}',
            phone = '${sanitizedData.phone}',
            email = '${sanitizedData.email}',
            tax_id = '${sanitizedData.tax_id}',
            currency = '${sanitizedData.currency}',
            logo_base64 = '${sanitizedData.logo_base64}',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
        `,
      );
      console.log("Update result:", result); // Debug: Log result of update
      // Check if any rows were affected (if runSql returns changes)
      if (result && typeof result === "object" && "changes" in result && result.changes === 0) {
        console.warn("No row with id = 1 found to update");
      } else {
        console.log("Store info updated successfully");
      }
    } catch (error) {
      console.error("Error updating store_info:", error);
    }
    setSaving(false);
  };

  if (loading) return <div className="p-8">Loading...</div>;

  // Debug: Log current state to ensure it's being set
  console.log("Current state data:", data);

  return (
    <div className="py-2 px-2 space-y-4 ">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Theme</CardTitle>
          <ModeToggle />
        </CardHeader>
      </Card>
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
              <Input id="name" name="name" value={data.name} onChange={handleChange} autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" value={data.address} onChange={handleChange} autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" value={data.phone} onChange={handleChange} autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" value={data.email} onChange={handleChange} autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_id">Tax ID</Label>
              <Input id="tax_id" name="tax_id" value={data.tax_id} onChange={handleChange} autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" name="currency" value={data.currency} onChange={handleChange} autoComplete="off" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="logo_base64">Logo</Label>
              <Input id="logo_base64" type="file" accept="image/*" onChange={handleLogoChange} />
              <div className="mt-2">
                {data.logo_base64 && (
                  <img
                    src={data.logo_base64}
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