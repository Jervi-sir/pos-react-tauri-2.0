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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { runSql } from "@/runSql";
import { PackageOpen } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

type AdjustInventoryDialogProps = {
  product: {
    id: number;
    name: string;
    quantity: number;
    current_price_unit: number;
  };
  fetchProducts: () => Promise<void>;
};

export const AdjustInventoryDialog = ({ product, fetchProducts }: AdjustInventoryDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"add" | "subtract">("add");
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Handle inventory adjustment
  const adjustInventory = async () => {
    if (!quantity) {
      setError("Quantity is required");
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setError("Quantity must be a positive number");
      return;
    }

    if (adjustmentType === "subtract" && qty > product.quantity) {
      setError(`Cannot subtract ${qty} units. Current stock is ${product.quantity}.`);
      return;
    }

    const newQuantity = adjustmentType === "add" ? product.quantity + qty : product.quantity - qty;

    setLoading(true);
    try {
      // Update products table
      const updateQuery = `
        UPDATE products 
        SET quantity = ${newQuantity}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${product.id}
      `;
      await runSql(updateQuery);

      // Insert into history_product_entries
      const historyQuantity = adjustmentType === "add" ? qty : -qty; // Negative for subtraction
      const historyQuery = `
        INSERT INTO history_product_entries (product_id, invoice_id, quantity, purchase_price, entry_type)
        VALUES (${product.id}, NULL, ${historyQuantity}, ${product.current_price_unit}, 'correction')
      `;
      await runSql(historyQuery);

      toast(`Stock for "${product.name}" ${adjustmentType === "add" ? "increased" : "decreased"} by ${qty} units.`);
      setError(null);
      setQuantity("");
      setAdjustmentType("add");
      setOpen(false);
      closeButtonRef.current?.click();
      await fetchProducts();
    } catch (err) {
      console.error("Error adjusting inventory:", err);
      setError(`Failed to adjust inventory: ${(err as Error).message}`);
      toast(`Failed to adjust inventory: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PackageOpen />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adjust Inventory for {product.name}</DialogTitle>
          <DialogDescription>
            Current stock: {product.quantity}. Select whether to add or subtract units and enter the quantity.
          </DialogDescription>
        </DialogHeader>
        <div className="flex  gap-4">
          <div className="grid gap-3">
            <Select value={adjustmentType} onValueChange={(value: "add" | "subtract") => setAdjustmentType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select adjustment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add</SelectItem>
                <SelectItem value="subtract">Subtract</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 gap-3">
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Quantity"
              required
            />
          </div>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <DialogFooter>
          <DialogClose asChild>
            <Button ref={closeButtonRef} type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={adjustInventory} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};