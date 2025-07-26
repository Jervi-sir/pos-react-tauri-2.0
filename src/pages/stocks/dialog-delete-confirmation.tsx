import React, { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { runSql } from "@/runSql";
import { useStock } from "./stock-provider";

export const DialogDeleteConfirmation = ({ open = false, setOpen, deleteProductId, setDeleteProductId }: any) => {
  const { setActionLoading, refreshProducts } = useStock();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteProductId) return;
    setIsDeleting(true);
    setActionLoading(true);
    try {
      await runSql(`DELETE FROM products WHERE id = ${deleteProductId}`);
      setOpen(false);
      setDeleteProductId(null);
      await refreshProducts();
    } catch (e: any) {
      console.error(e?.message ?? "Failed to delete product");
    } finally {
      setIsDeleting(false);
      setActionLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Deletion {deleteProductId }</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this product? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
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