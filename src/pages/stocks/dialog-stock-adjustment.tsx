import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { runSql } from "@/runSql";
import { useStock } from "./stock-provider";

export const DialogStockAdjustment = ({ open = false, setOpen, stockProductId, setStockProductId }: any) => {
  const { products, setActionLoading, refreshProducts } = useStock();
  const [stockAction, setStockAction] = useState<"add" | "subtract">("add");
  const [stockChange, setStockChange] = useState<number | "">("");
  const [stockEntryType, setStockEntryType] = useState<"manual" | "correction" | "return">("manual");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStockAction("add");
      setStockChange("");
      setStockEntryType("manual");
      setError(null);
    }
  }, [open, stockProductId]);

  const handleSave = async () => {
    if (!stockChange || isNaN(Number(stockChange)) || Number(stockChange) < 0) {
      setError("Valid stock change quantity is required");
      return;
    }
    const product = products.find((p) => p.id === stockProductId);
    if (!product) {
      setError("Product not found");
      return;
    }
    const currentStock = product.stock_left ?? 0;
    const changeAmount = Number(stockChange);
    if (stockAction === "subtract" && currentStock < changeAmount) {
      setError("Cannot subtract more than current stock");
      return;
    }

    setIsSaving(true);
    setActionLoading(true);
    try {
      if (changeAmount > 0) {
        await runSql(`
          INSERT INTO stock_entries 
            (product_id, quantity, entry_type, created_at)
          VALUES (
            ${stockProductId},
            ${changeAmount},
            '${stockAction === "add" ? stockEntryType : "correction"}',
            '${new Date().toISOString()}'
          )
        `);
      }
      setOpen(false);
      setStockProductId(null);
      setStockChange("");
      setStockAction("add");
      setStockEntryType("manual");
      await refreshProducts();
    } catch (e: any) {
      setError(e?.message ?? "Failed to adjust stock");
    } finally {
      setIsSaving(false);
      setActionLoading(false);
    }
  };

  const product = products.find((p) => p.id === stockProductId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Product</label>
            <Input value={product?.name ?? ""} disabled className="w-full" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Current Stock</label>
            <Input value={product?.stock_left ?? 0} disabled className="w-full" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Action</label>
            <Select value={stockAction} onValueChange={(v) => setStockAction(v as "add" | "subtract")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add to Stock</SelectItem>
                <SelectItem value="subtract">Subtract from Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Quantity to {stockAction === "add" ? "Add" : "Subtract"}
            </label>
            <Input
              type="number"
              min={0}
              value={stockChange}
              onChange={(e) => setStockChange(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder={`Quantity to ${stockAction === "add" ? "add" : "subtract"}`}
              className="w-full"
            />
          </div>
          <Select
            value={stockEntryType}
            onValueChange={(v) => setStockEntryType(v as "manual" | "correction" | "return")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select entry type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Entry Type</SelectLabel>
                <SelectItem value="manual">Manual Adjustment</SelectItem>
                <SelectItem value="correction">Correction</SelectItem>
                <SelectItem value="return">Return</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        {error && <div className="text-red-600 mt-2">{error}</div>}
        <DialogFooter className="gap-2">
          <Button
            onClick={() => setOpen(false)}
            variant="secondary"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};