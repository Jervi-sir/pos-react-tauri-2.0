// src/pages/ProductDetails.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { runSql } from "@/runSql";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";

type Product = {
  id: number;
  name: string;
  barcode: string | null;
  current_price_unit: number;
  quantity: number;
  image_base64: string | null;
  category_id: number;
  category_name: string;
  created_at: string;
  updated_at: string;
};

type HistoryEntry = {
  id: number;
  product_id: number;
  invoice_id: number | null;
  quantity: number;
  purchase_price: number;
  entry_type: string;
  created_at: string;
};

type SearchResult = {
  id: number;
  name: string;
  barcode: string | null;
  image_base64: string;
};

export default function SingleProductPage() {
  const { id } = useParams<{ id?: string }>(); // Optional id from URL
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch product details and history by id
  const fetchProductDetails = async (productId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch product
      const productQuery = `
        SELECT p.*, pc.name as category_name
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        WHERE p.id = ${parseInt(productId, 10)}
      `;
      const productResult = await runSql(productQuery);
      if (!productResult.length) {
        setError("Product not found");
        setProduct(null);
        setHistoryEntries([]);
        return;
      }
      setProduct(productResult[0] as Product);

      // Fetch history entries
      const historyQuery = `
        SELECT *
        FROM history_product_entries
        WHERE product_id = ${parseInt(productId, 10)}
        ORDER BY created_at DESC
      `;
      const historyResult = await runSql(historyQuery);
      setHistoryEntries(historyResult as HistoryEntry[]);

      // Preferred: Parameterized queries
      // const productQuery = `
      //   SELECT p.*, pc.name as category_name
      //   FROM products p
      //   LEFT JOIN product_categories pc ON p.category_id = pc.id
      //   WHERE p.id = ?
      // `;
      // const productResult = await runSql(productQuery, [parseInt(productId, 10)]);
      //
      // const historyQuery = `
      //   SELECT *
      //   FROM history_product_entries
      //   WHERE product_id = ?
      //   ORDER BY created_at DESC
      // `;
      // const historyResult = await runSql(historyQuery, [parseInt(productId, 10)]);
    } catch (err) {
      console.error("Error fetching product details:", err);
      setError(`Failed to fetch product details: ${(err as Error).message}`);
      toast.error(`Failed to fetch product details: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch search results for preview
  const fetchSearchResults = async (query: string) => {
    if (!query) {
      setSearchResults([]);
      return;
    }
    try {
      const escapedSearch = query.replace(/'/g, "''");
      const searchQuery = `
        SELECT id, name, barcode, image_base64
        FROM products
        WHERE name LIKE '%${escapedSearch}%' OR barcode LIKE '%${escapedSearch}%'
        LIMIT 10
      `;
      const results = await runSql(searchQuery);
      setSearchResults(results as SearchResult[]);
    } catch (err) {
      console.error("Error fetching search results:", err);
      setError(`Failed to fetch search results: ${(err as Error).message}`);
    }
  };

  // Fetch product details when id changes
  useEffect(() => {
    if (id) {
      fetchProductDetails(id);
    } else {
      setProduct(null);
      setHistoryEntries([]);
    }
  }, [id]);

  // Fetch search results when debounced query changes
  useEffect(() => {
    fetchSearchResults(debouncedSearchQuery);
  }, [debouncedSearchQuery]);

  // Handle clicking a search result
  const handleSelectProduct = (productId: number) => {
    setSearchQuery("");
    setSearchResults([]);
    navigate(`/products/${productId}`);
  };

  if (error) return <div className="container mx-auto py-10">Error: {error}</div>;
  if (loading) return <div className="container mx-auto py-10">Loading...</div>;

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Product Details</h1>
      {/* Search Input */}
      <div className="mb-6">
        <Input
          placeholder="Search by name or barcode"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-[400px]"
        />
        {/* Search Results Preview */}
        {searchResults.length > 0 && (
          <div className="border rounded-md shadow mt-2 max-h-[200px] overflow-y-auto">
            <Table>
              <TableBody>
                {searchResults.map((result) => (
                  <TableRow
                    key={result.id}
                    onClick={() => handleSelectProduct(result.id)}
                    className="cursor-pointer "
                  >
                    <TableCell><img src={result.image_base64} className="h-14 w-14" /></TableCell>
                    <TableCell>{result.name}</TableCell>
                    <TableCell>{result.barcode || "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      {/* Product Details */}
      {product ? (
        <div className="grid gap-6">
          <div className="border rounded-md p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              {product.image_base64 ? (
                <img
                  src={product.image_base64}
                  alt={product.name}
                  className="w-24 h-24 object-cover rounded"
                />
              ) : (
                <div className="w-24 h-24 bg-gray-200 flex items-center justify-center rounded">
                  No Image
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold">{product.name}</h2>
                <p><strong>Barcode:</strong> {product.barcode || "N/A"}</p>
                <p><strong>Category:</strong> {product.category_name || "N/A"}</p>
                <p><strong>Price:</strong> ${product.current_price_unit.toFixed(2)}</p>
                <p><strong>Stock:</strong> {product.quantity}</p>
                <p><strong>Created At:</strong> {new Date(product.created_at).toLocaleString()}</p>
                <p><strong>Updated At:</strong> {new Date(product.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
          {/* History Entries */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Inventory History</h2>
            <div className="border rounded-md shadow overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Purchase Price</TableHead>
                    <TableHead>Invoice ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyEntries.length > 0 ? (
                    historyEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{new Date(entry.created_at).toLocaleString()}</TableCell>
                        <TableCell>{entry.entry_type}</TableCell>
                        <TableCell>{entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}</TableCell>
                        <TableCell>${entry.purchase_price.toFixed(2)}</TableCell>
                        <TableCell>{entry.invoice_id || "N/A"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        No history entries found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      ) : (
        <p>Please search for a product or provide a product ID.</p>
      )}
    </div>
  );
}