import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { runSql } from "@/runSql";
import { useStock } from "./stock-provider";

export const DialogDeleteConfirmation = ({ open = false, setOpen, deleteProductId, setDeleteProductId }: any) => {
  const { setActionLoading, refreshProducts } = useStock();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteProductId || isNaN(Number(deleteProductId))) {
      setError("Invalid product ID");
      return;
    }

    setIsDeleting(true);
    setActionLoading(true);
    setError(null);

    try {
      // Optionally delete related records first if foreign key constraints exist
      await runSql(`DELETE FROM stock_entries WHERE product_id = ${Number(deleteProductId)}`, []);
      await runSql(`DELETE FROM sale_products WHERE product_id = ${Number(deleteProductId)}`, []);

      // Delete the product
      const result: any = await runSql(`DELETE FROM products WHERE id = ${Number(deleteProductId)}`, []);
      
      // Check if any rows were affected
      if (result.rowsAffected === 0) {
        throw new Error("No product found with the specified ID");
      }

      setOpen(false);
      setDeleteProductId(null);
      await refreshProducts();
    } catch (e: any) {
      console.error("Delete product error:", e);
      setError(e?.message ?? "Failed to delete product");
    } finally {
      setIsDeleting(false);
      setActionLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setError(null);
        setDeleteProductId(null);
      }
      setOpen(isOpen);
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Deletion (ID: {deleteProductId})</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this product? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <div className="text-red-600 mt-2">{error}</div>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};