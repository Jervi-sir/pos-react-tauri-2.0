import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { runSql } from "@/runSql";

export function SetupOwnerPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await runSql(
         `INSERT INTO users (name, email, password, role) 
         VALUES ('${form.name}', '${form.email}', '${form.password}', 'owner')`);
      // Auto-login the owner after creation
      location.reload()
      // const success = await login(form.email, form.password);
      // if (success) {
      //   onComplete(); // Signal completion
      // } else {
      //   setError("Failed to log in after account creation");
      // }
    } catch (error) {
      setError("Error creating owner account");
      console.error("Error:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Setup Owner Account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" value={form.password} onChange={handleChange} required />
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