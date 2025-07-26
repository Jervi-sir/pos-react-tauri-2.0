import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { StockActionsDropdown } from "./stock-action-dropdown";
import { Product, useStock } from "./stock-provider";
import { DialogNewProduct } from "./dialog-new-product";
import { DialogStockAdjustment } from "./dialog-stock-adjustment";
import { DialogDeleteConfirmation } from "./dialog-delete-confirmation";

export const StockTable: React.FC = () => {
  const { products, loading, actionLoading } = useStock();
  const [openProductDialog, setOpenProductDialog] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockProductId, setStockProductId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null);

  const openDialog = (prod: Product) => {
    setEditProduct(prod);
    setOpenProductDialog(true);
  };

  const openStockDialog = (productId: number, currentStock: number) => {
    setStockProductId(productId);
    setStockDialogOpen(true);
  };

  if (loading) {
    return <div className="text-center py-6">Loading...</div>;
  }

  if (products.length === 0) {
    return <div className="text-center py-6">No products found</div>;
  }

  return (
    <div className="border rounded-md shadow overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left">Image</th>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Barcode</th>
            <th className="px-4 py-2 text-left">Category</th>
            <th className="px-4 py-2 text-left">Price</th>
            <th className="px-4 py-2 text-left">Stock</th>
            <th className="px-4 py-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((prod: any) => (
            <tr key={prod.id} className="border-t">
              <td className="px-2 py-1">
                {prod.image_base64 ? (
                  <img
                    src={`data:image/png;base64,${prod.image_base64}`}
                    alt={prod.name}
                    className="h-10 w-10 object-cover rounded"
                  />
                ) : (
                  <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                    -
                  </div>
                )}
              </td>
              <td
                className={cn([
                  "px-4 py-2",
                  prod.stock_left && prod.stock_left < 2 ? "text-orange-700" : "",
                ])}
              >
                {prod.name}
              </td>
              <td className="px-4 py-2">{prod.barcode}</td>
              <td className="px-4 py-2">{prod.category_name}</td>
              <td className="px-4 py-2">{prod.price_unit?.toFixed(2)}</td>
              <td
                className={cn([
                  "px-4 py-2",
                  prod.stock_left && prod.stock_left < 2 ? "text-orange-700" : "",
                ])}
              >
                {prod.stock_left ?? 0}
              </td>
              <td className="text-center space-x-2">
                <StockActionsDropdown
                  productId={prod.id}
                  stockLeft={prod.stock_left ?? 0}
                  // @ts-ignore
                  openDialog={openDialog}
                  openStockDialog={openStockDialog}
                  setDeleteProductId={setDeleteProductId}
                  setDeleteDialogOpen={setDeleteDialogOpen}
                  actionLoading={actionLoading}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {openProductDialog && (
        <DialogNewProduct
          open={openProductDialog}
          setOpen={setOpenProductDialog}
          editProduct={editProduct}
          setEditProduct={setEditProduct}
        />
      )}
      {stockDialogOpen && (
        <DialogStockAdjustment
          open={stockDialogOpen}
          setOpen={setStockDialogOpen}
          stockProductId={stockProductId}
          setStockProductId={setStockProductId}
        />
      )}
      {deleteDialogOpen && (
        <DialogDeleteConfirmation
          open={deleteDialogOpen}
          setOpen={setDeleteDialogOpen}
          deleteProductId={deleteProductId}
          setDeleteProductId={setDeleteProductId}
        />
      )}
    </div>
  );
};