// src/components/DeleteProductDialog.tsx
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

import { runSql } from "@/runSql";
import { useState } from "react";
import { toast } from "sonner";

type DeleteProductDialogProps = {
  product: { id: number; name: string };
  fetchProducts: () => Promise<void>;
};

export const DeleteProductDialog = ({ product, fetchProducts }: DeleteProductDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const query = `DELETE FROM products WHERE id = ${product.id}`;
      await runSql(query);

      toast(`Product "${product.name}" deleted successfully.`);
      await fetchProducts();
      setOpen(false);
    } catch (err) {
      console.error("Error deleting product:", err);
      toast.error(`Failed to delete product: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Product</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the product "{product.name}"? This action cannot be undone, and related history entries will also be deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};