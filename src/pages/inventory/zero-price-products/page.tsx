import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { runSql } from "@/runSql";
import { toast } from "sonner";
import { routes } from "@/main";
import { useImagePath } from "@/context/document-path-context";

type Product = {
  id: number;
  name: string;
  barcode: string | null;
  current_price_unit: number;
  original_bought_price: number;
  quantity: number;
  category_id: number;
  category_name: string;
  image_path: string | null;
};

type EditProduct = {
  id: number;
  name: string;
  current_price_unit: number;
  original_bought_price: number;
};

export default function ZeroPriceProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [editProduct, setEditProduct] = useState<EditProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Fetch products with current_price_unit = 0
  const fetchZeroPriceProducts = async () => {
    try {
      setLoading(true);
      const query = `
        SELECT p.id, p.name, p.barcode, p.current_price_unit, p.original_bought_price, p.quantity, p.category_id, p.image_path, pc.name as category_name
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        WHERE p.current_price_unit = 0
        ORDER BY p.name
      `;
      const result = await runSql(query);
      setProducts(result as Product[]);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError(`Failed to fetch products: ${(err as Error).message}`);
      toast.error(`Failed to fetch products: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZeroPriceProducts();
  }, []);

  // Open edit dialog
  const openEditDialog = (product: Product) => {
    setEditProduct({
      id: product.id,
      name: product.name,
      current_price_unit: product.current_price_unit,
      original_bought_price: product.original_bought_price,
    });
    setShowEditDialog(true);
  };

  // Handle edit form submission
  const handleEditSubmit = async () => {
    if (!editProduct) return;
    if (editProduct.current_price_unit <= 0) {
      setError("Price must be greater than 0");
      return;
    }
    if (editProduct.original_bought_price <= 0) {
      setError("Original Bought Price must be greater than 0");
      return;
    }

    if (editProduct.current_price_unit <= editProduct.original_bought_price) {
      setError("Price must be greater than Original Bought Price");
      return;
    }

    setLoading(true);
    try {
      const updateQuery = `
        UPDATE products
        SET current_price_unit = ${editProduct.current_price_unit},
            original_bought_price = ${editProduct.original_bought_price},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${editProduct.id}
      `;
      await runSql(updateQuery);

      const historyQuery = `
        INSERT INTO history_product_entries (product_id, invoice_id, quantity, purchase_price, original_bought_price, entry_type, created_at)
        VALUES (${editProduct.id}, NULL, 0, ${editProduct.current_price_unit}, ${editProduct.original_bought_price}, 'correction', CURRENT_TIMESTAMP)
      `;
      await runSql(historyQuery);

      // Update local state
      setProducts((prev) =>
        prev.filter((p) => p.id !== editProduct.id) // Remove updated product since it no longer has current_price_unit = 0
      );
      setShowEditDialog(false);
      setEditProduct(null);
      setError(null);
      toast.success("Product price updated successfully!");
    } catch (err) {
      console.error("Error updating product:", err);
      setError(`Failed to update product: ${(err as Error).message}`);
      toast.error(`Failed to update product: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center ">
        <h1 className="text-2xl font-bold">Products with Zero Price</h1>
        <Button variant="outline" onClick={() => navigate(routes.productInventory)} size="sm">
          Back to Inventory
        </Button>
      </div>
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      <div className="border rounded-md shadow overflow-x-auto mb-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Orig. Bought Price</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : products.length > 0 ? (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.image_path ? (
                      <img
                        src={useImagePath(product.image_path)}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 flex items-center justify-center rounded">
                        N/A
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.barcode || "N/A"}</TableCell>
                  <TableCell>{product.category_name || "N/A"}</TableCell>
                  <TableCell>DA{product.original_bought_price.toFixed(2)}</TableCell>
                  <TableCell>{product.quantity}</TableCell>
                  <TableCell>
                    <Button onClick={() => openEditDialog(product)} size="sm">
                      Edit Price
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No products with zero price found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Price Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product Price</DialogTitle>
            <DialogDescription>
              Update the price for {editProduct?.name || "the product"}.
            </DialogDescription>
          </DialogHeader>
          {editProduct && (
            <div className="grid gap-6 pt-1">
              <Input
                placeholder="Original Bought Price (Unit)"
                type="number"
                step="0.01"
                min="0"
                value={editProduct.original_bought_price || ""}
                onChange={(e) =>
                  setEditProduct({
                    ...editProduct,
                    original_bought_price: parseFloat(e.target.value) || 0,
                  })
                }
                required
              />
               <Input
                placeholder="Price (Unit)"
                type="number"
                step="0.01"
                min={editProduct.original_bought_price || "1"}
                value={editProduct.current_price_unit || ""}
                onChange={(e) =>
                  setEditProduct({
                    ...editProduct,
                    current_price_unit: parseFloat(e.target.value) || 0,
                  })
                }
                required
              />
            </div>
          )}
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={loading} onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={handleEditSubmit} disabled={loading || !editProduct}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}