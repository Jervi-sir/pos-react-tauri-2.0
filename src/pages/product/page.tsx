import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { XCircle } from "lucide-react";
import { runSql } from "@/runSql";
import { PaginationSection } from "@/components/pagination-section";

type Product = {
  id: number;
  name: string;
  barcode: string;
  category_name: string;
  price_unit: number;
  current_stock: number;
  image_base64?: string;
};

type StockEntry = {
  id: number;
  quantity: number;
  purchase_price?: number;
  entry_type: "purchase" | "manual" | "correction" | "return";
  created_at: string;
};

type StoreInfo = {
  currency: string;
};

type ProductSuggestion = {
  id: number;
  name: string;
  barcode: string;
  category_name: string;
  current_stock: number;
  image_base64?: string | null;
};

const ENTRIES_PER_PAGE = 10;

export default function SingleProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [stockHistory, setStockHistory] = useState<StockEntry[]>([]);
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({ currency: "DZD" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newQuantity, setNewQuantity] = useState("");
  const [newPurchasePrice, setNewPurchasePrice] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewProducts, setPreviewProducts] = useState<ProductSuggestion[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1); // New state for pagination
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Calculate total pages for stock history
  const totalPages = Math.ceil(stockHistory.length / ENTRIES_PER_PAGE);

  // Get the stock history entries for the current page
  const paginatedStockHistory = stockHistory.slice(
    (currentPage - 1) * ENTRIES_PER_PAGE,
    currentPage * ENTRIES_PER_PAGE
  );
  // Sanitize inputs
  const sanitizeNumber = (value: number | string) => {
    const num = Number(value);
    if (isNaN(num) || !Number.isInteger(num) || num < 0) {
      throw new Error("Invalid number input");
    }
    return num;
  };

  const sanitizeDecimal = (value: string) => {
    const num = Number(value);
    if (isNaN(num) || num < 0) {
      throw new Error("Invalid decimal input");
    }
    return num.toFixed(2);
  };

  const escapeSqlString = (value: string) => value.trim().replace(/'/g, "''");

  // Fetch product suggestions
  useEffect(() => {
    if (!searchQuery.trim()) {
      setPreviewProducts([]);
      return;
    }
    setPreviewLoading(true);
    const escapedQuery = escapeSqlString(`%${searchQuery}%`);
    const query = `
      SELECT 
        p.id, 
        p.name, 
        p.barcode, 
        c.name as category_name,
        p.current_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE LOWER(p.name) LIKE '${escapedQuery}' OR p.barcode LIKE '${escapedQuery}'
      LIMIT 5
    `;
    runSql(query)
      // @ts-ignore
      .then((res: { rows: ProductSuggestion[] }) => {
        setPreviewProducts(res.rows || []);
        setPreviewLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching product suggestions:", err);
        setPreviewProducts([]);
        setPreviewLoading(false);
      });
  }, [searchQuery]);

  // Handle selecting a product from preview
  const handleSelectFromPreview = (product: ProductSuggestion) => {
    navigate(`/products/${product.id}`);
    setSearchQuery("");
    setPreviewProducts([]);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  // Handle search form submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (previewProducts.length > 0) {
      handleSelectFromPreview(previewProducts[0]);
    }
  };

  // Fetch product details and stock history
  const fetchData = async (productId?: string) => {
    setLoading(true);
    setError(null);
    setCurrentPage(1); // Reset to page 1 when fetching new data
    try {
      // Fetch store info
      const storeQuery = `SELECT currency FROM store_info WHERE id = 1`;
      // @ts-ignore
      const storeRes: { rows: StoreInfo[] } = await runSql(storeQuery);
      setStoreInfo(storeRes.rows?.[0] || { currency: "DZD" });

      if (productId) {
        const validatedId = sanitizeNumber(productId);

        // Fetch product details
        const productQuery = `
          SELECT 
            p.id, 
            p.name, 
            p.barcode, 
            c.name as category_name, 
            p.price_unit, 
            p.current_stock, 
            p.image_base64
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE p.id = ${validatedId}
        `;
        // @ts-ignore
        const productRes: { rows: Product[] } = await runSql(productQuery);
        if (!productRes.rows?.[0]) {
          throw new Error("Product not found");
        }
        setProduct(productRes.rows[0]);

        // Fetch stock history (no LIMIT needed since we're paginating on the client)
        const stockQuery = `
          SELECT id, quantity, purchase_price, entry_type, created_at
          FROM stock_entries
          WHERE product_id = ${validatedId}
          ORDER BY created_at DESC
        `;
        // @ts-ignore
        const stockRes: { rows: StockEntry[] } = await runSql(stockQuery);
        setStockHistory(stockRes.rows || []);
      } else {
        setProduct(null);
        setStockHistory([]);
      }
    } catch (err) {
      console.error("Error fetching product data:", err);
      setError("Failed to load product details or stock history.");
      setProduct(null);
      setStockHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle adding stock
  const handleAddStock = async () => {
    setDialogError(null);
    try {
      if (!product) throw new Error("No product selected");
      const quantity = sanitizeNumber(newQuantity);
      const purchasePrice = newPurchasePrice ? sanitizeDecimal(newPurchasePrice) : null;

      // Insert stock entry
      const stockInsertQuery = `
        INSERT INTO stock_entries (product_id, invoice_id, quantity, purchase_price, entry_type, created_at)
        VALUES (${sanitizeNumber(product.id)}, NULL, ${quantity}, ${purchasePrice ? purchasePrice : "NULL"}, 'manual', CURRENT_TIMESTAMP)
      `;
      await runSql(stockInsertQuery);

      // Update product current_stock
      const updateStockQuery = `
        UPDATE products
        SET current_stock = current_stock + ${quantity},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${sanitizeNumber(product.id)}
      `;
      await runSql(updateStockQuery);

      // Refresh data
      await fetchData(product.id.toString());
      setDialogOpen(false);
      setNewQuantity("");
      setNewPurchasePrice("");
    } catch (err) {
      console.error("Error adding stock:", err);
      setDialogError("Failed to add stock. Please check inputs and try again.");
    }
  };

  // Fetch data when product ID changes
  useEffect(() => {
    fetchData(id);
  }, [id]);

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Product Details</h2>
        <div className="relative">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or barcode"
              className="flex-1 max-w-md"
              autoFocus
              autoComplete="off"
            />
            <Button type="submit">Search</Button>
          </form>
          {searchQuery.trim() && (previewLoading || previewProducts.length > 0) && (
            <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-neutral-900 border rounded-xl shadow-lg z-20 p-2 max-w-md">
              {/* {previewLoading && <div className="px-2 py-2 text-gray-500">Loading...</div>} */}
              {!previewLoading &&
                previewProducts.map((p) => {
                  const isUnavailable = !p.current_stock || p.current_stock <= 0;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 px-2 py-2 rounded ${
                        isUnavailable
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                      }`}
                      onClick={() => !isUnavailable && handleSelectFromPreview(p)}
                      tabIndex={-1}
                    >
                      { p.image_base64 && (
                        <img
                          src={`data:image/png;base64,${p.image_base64}`}
                          alt={p.name}
                          className="h-8 w-8 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {p.name}
                          {isUnavailable && (
                            <span className="text-xs text-red-500 flex items-center gap-1 ml-2">
                              <XCircle size={16} className="inline" /> Out of stock
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          Barcode: {p.barcode} | Category: {p.category_name} | Stock: {p.current_stock}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {!loading && !error && !product && (
        <div className="text-center py-6">Select a product to view details.</div>
      )}
      {!loading && !error && product && (
        <div className="space-y-6">
          {/* Product Details */}
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {product.image_base64 && (
                  <img
                    src={product.image_base64}
                    alt={product.name}
                    className="max-w-xs max-h-48 object-contain"
                  />
                )}
                <div>
                  <p>
                    <strong>Name:</strong> {product.name}
                  </p>
                  <p>
                    <strong>Barcode:</strong> {product.barcode}
                  </p>
                  <p>
                    <strong>Category:</strong> {product.category_name}
                  </p>
                  <p>
                    <strong>Price:</strong> {storeInfo.currency}{" "}
                    {Number(product.price_unit).toFixed(2)}
                  </p>
                  <p>
                    <strong>Current Stock:</strong> {product.current_stock}
                  </p>
                  <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                    Add Stock
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock History */}
          <Card>
            <CardHeader>
              <CardTitle>Stock History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left px-4 py-2">Date</th>
                      <th className="text-left px-4 py-2">Entry Type</th>
                      <th className="text-right px-4 py-2">Quantity</th>
                      <th className="text-right px-4 py-2">Purchase Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStockHistory.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-gray-400 py-4">
                          No stock history
                        </td>
                      </tr>
                    ) : (
                      paginatedStockHistory.map((entry) => (
                        <tr key={entry.id} className="border-t">
                          <td className="px-4 py-2">
                            {new Date(entry.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 capitalize">{entry.entry_type}</td>
                          <td className="px-4 py-2 text-right">{entry.quantity}</td>
                          <td className="px-4 py-2 text-right">
                            {entry.purchase_price
                              ? `${storeInfo.currency} ${Number(entry.purchase_price).toFixed(2)}`
                              : "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {/* Add Pagination Component */}
              <PaginationSection
                page={currentPage}
                pageCount={totalPages}
                setPage={setCurrentPage}
                maxPagesToShow={5}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Stock Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stock for {product?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {dialogError && <div className="text-red-500">{dialogError}</div>}
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                placeholder="Enter quantity to add"
              />
            </div>
            <div>
              <Label htmlFor="purchasePrice">Purchase Price (Optional)</Label>
              <Input
                id="purchasePrice"
                type="number"
                step="0.01"
                min="0"
                value={newPurchasePrice}
                onChange={(e) => setNewPurchasePrice(e.target.value)}
                placeholder="Enter purchase price"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleAddStock}
              disabled={!newQuantity || Number(newQuantity) <= 0}
            >
              Add Stock
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setDialogOpen(false);
                setNewQuantity("");
                setNewPurchasePrice("");
                setDialogError(null);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}