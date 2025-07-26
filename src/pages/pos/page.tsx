// src/pages/POS.tsx
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { runSql } from "@/runSql";
import { useDebounce } from "use-debounce";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";

type Product = {
  id: number;
  name: string;
  barcode: string | null;
  current_price_unit: number;
  quantity: number;
  image_base64: string | null;
};

type SaleItem = {
  product_id: number;
  name: string;
  barcode: string | null;
  price_unit: number;
  quantity: number; // Editable quantity for sale
  stock: number; // Available stock
  image_base64: string | null;
};

type StoreInfo = {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  tax_id: string | null;
  logo_base64: string | null;
};

export default function PosPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch store info
  const fetchStoreInfo = async () => {
    try {
      const query = `SELECT * FROM store_info LIMIT 1`;
      const result = await runSql(query);
      // @ts-ignore
      if (result.length) {
      // @ts-ignore
        setStoreInfo(result[0] as StoreInfo);
      }
    } catch (err) {
      console.error("Error fetching store info:", err);
    }
  };

  // Fetch search results for preview and auto-add on exact barcode match
  const fetchSearchResults = async (query: string) => {
    if (!query) {
      setSearchResults([]);
      return;
    }
    try {
      const escapedSearch = query.replace(/'/g, "''");
      const searchQuery = `
        SELECT id, name, barcode, current_price_unit, quantity, image_base64
        FROM products
        WHERE name LIKE '%${escapedSearch}%' OR barcode = '${escapedSearch}'
        LIMIT 10
      `;
      const results = await runSql(searchQuery);

      // Check for exact barcode match
      // @ts-ignore
      const exactMatch = results.find((product: Product) => product.barcode === query);
      if (exactMatch) {
        const existingItem = saleItems.find((item) => item.product_id === exactMatch.id);
        if (existingItem) {
          // Increment quantity if within stock
          if (existingItem.quantity < existingItem.stock) {
            setSaleItems((items) =>
              items.map((item) =>
                item.product_id === exactMatch.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              )
            );
            toast.success(`Added 1 more ${existingItem.name} to sale.`);
          } else {
            toast.error(`Cannot add more ${existingItem.name}. Stock limit: ${existingItem.stock}.`);
          }
        } else {
          // Add new item with quantity 1
          setSaleItems([
            ...saleItems,
            {
              product_id: exactMatch.id,
              name: exactMatch.name,
              barcode: exactMatch.barcode,
              price_unit: exactMatch.current_price_unit,
              quantity: 1,
              stock: exactMatch.quantity,
              image_base64: exactMatch.image_base64,
            },
          ]);
          toast.success(`Added ${exactMatch.name} to sale.`);
        }
        setSearchQuery("");
        setSearchResults([]);
      } else {
        setSearchResults(results as Product[]);
      }
    } catch (err) {
      console.error("Error fetching search results:", err);
      setError(`Failed to fetch search results: ${(err as Error).message}`);
      toast.error(`Failed to fetch search results: ${(err as Error).message}`);
    }
  };

  // Add product to sale (for manual selection from preview)
  const addToSale = (product: Product) => {
    const existingItem = saleItems.find((item) => item.product_id === product.id);
    if (existingItem) {
      // Increment quantity if within stock
      if (existingItem.quantity < existingItem.stock) {
        setSaleItems((items) =>
          items.map((item) =>
            item.product_id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
        toast.success(`Added 1 more ${existingItem.name} to sale.`);
      } else {
        toast.error(`Cannot add more ${existingItem.name}. Stock limit: ${existingItem.stock}.`);
      }
    } else {
      // Add new item with quantity 1
      setSaleItems([
        ...saleItems,
        {
          product_id: product.id,
          name: product.name,
          barcode: product.barcode,
          price_unit: product.current_price_unit,
          quantity: 1,
          stock: product.quantity,
          image_base64: product.image_base64,
        },
      ]);
      toast.success(`Added ${product.name} to sale.`);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  // Update quantity for a sale item
  const updateQuantity = (product_id: number, newQuantity: string) => {
    const qty = parseInt(newQuantity, 10);
    setSaleItems((items) =>
      items.map((item) =>
        item.product_id === product_id
          ? {
              ...item,
              quantity: isNaN(qty) || qty < 1 ? 1 : qty > item.stock ? item.stock : qty,
            }
          : item
      )
    );
  };

  // Remove item from sale
  const removeItem = (product_id: number) => {
    setSaleItems((items) => items.filter((item) => item.product_id !== product_id));
    toast.success("Item removed from sale.");
  };

  // Calculate total
  const calculateTotal = () => {
    return saleItems.reduce((sum, item) => sum + item.quantity * item.price_unit, 0).toFixed(2);
  };

  // Complete sale
  const completeSale = async () => {
    if (saleItems.length === 0) {
      setError("No items in the sale.");
      toast.error("No items in the sale.");
      return;
    }
    for (const item of saleItems) {
      if (item.quantity > item.stock) {
        setError(`Quantity for ${item.name} exceeds available stock (${item.stock}).`);
        toast.error(`Quantity for ${item.name} exceeds available stock (${item.stock}).`);
        return;
      }
    }

    setLoading(true);
    try {
      const user_id = 1; // Replace with actual user_id from auth system
      const total_quantity = saleItems.reduce((sum, item) => sum + item.quantity, 0);
      const total_price = parseFloat(calculateTotal());

      // Insert invoice
      const invoiceQuery = `
        INSERT INTO invoices (invoice_type, total_quantity, total_price, user_id)
        VALUES ('sold', ${total_quantity}, ${total_price}, ${user_id})
      `;
      await runSql(invoiceQuery);

      // Get the new invoice ID
      const invoiceIdQuery = `SELECT id FROM invoices ORDER BY id DESC LIMIT 1`;
      const invoiceResult = await runSql(invoiceIdQuery);
      // @ts-ignore
      const invoice_id = invoiceResult[0].id;

      // Insert sold_products and update stock
      for (const item of saleItems) {
        const total_item_price = (item.quantity * item.price_unit).toFixed(2);
        const soldProductQuery = `
          INSERT INTO sold_products (product_id, invoice_id, quantity, total_price, price_unit)
          VALUES (${item.product_id}, ${invoice_id}, ${item.quantity}, ${total_item_price}, ${item.price_unit})
        `;
        await runSql(soldProductQuery);

        // Update product stock
        const newStock = item.stock - item.quantity;
        const updateStockQuery = `
          UPDATE products 
          SET quantity = ${newStock}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${item.product_id}
        `;
        await runSql(updateStockQuery);

        // Insert history entry
        const historyQuery = `
          INSERT INTO history_product_entries (product_id, invoice_id, quantity, purchase_price, entry_type)
          VALUES (${item.product_id}, ${invoice_id}, ${-item.quantity}, ${item.price_unit}, 'purchase')
        `;
        await runSql(historyQuery);
      }

      toast.success("Sale completed successfully.");
      setSaleItems([]);
      setError(null);
      setOpenConfirmModal(false);
    } catch (err) {
      console.error("Error completing sale:", err);
      setError(`Failed to complete sale: ${(err as Error).message}`);
      toast.error(`Failed to complete sale: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  // Print invoice
  const handlePrint = useReactToPrint({
    // @ts-ignore
    content: () => printRef.current,
    documentTitle: `Invoice_${new Date().toISOString()}`,
  });

  useEffect(() => {
    fetchStoreInfo();
    fetchSearchResults(debouncedSearchQuery);
  }, [debouncedSearchQuery]);

  return (
    <>
      <h1 className="text-2xl font-bold">Point of Sale</h1>
      {/* Search Input */}
      <div>
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
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((product) => (
                  <TableRow
                    key={product.id}
                    onClick={() => addToSale(product)}
                    className="cursor-pointer hover:bg-gray-100"
                  >
                    <TableCell>
                      {product.image_base64 ? (
                        <img
                          src={product.image_base64}
                          alt={product.name}
                          className="w-8 h-8 object-cover rounded"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 flex items-center justify-center rounded">
                          N/A
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.barcode || "N/A"}</TableCell>
                    <TableCell>{product.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      {/* Sale Table */}
      <div className="border rounded-md shadow overflow-x-auto mb-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead>Price/Unit</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {saleItems.length > 0 ? (
              saleItems.map((item) => (
                <TableRow key={item.product_id}>
                  <TableCell>
                    {item.image_base64 ? (
                      <img
                        src={item.image_base64}
                        alt={item.name}
                        className="w-8 h-8 object-cover rounded"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 flex items-center justify-center rounded">
                        N/A
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.barcode || "N/A"}</TableCell>
                  <TableCell>${item.price_unit.toFixed(2)}</TableCell>
                  <TableCell>{item.stock}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      max={item.stock}
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.product_id, e.target.value)}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>${(item.quantity * item.price_unit).toFixed(2)}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeItem(item.product_id)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  No items in sale.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Total and Actions */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-lg font-semibold">Total: ${calculateTotal()}</div>
        <Dialog open={openConfirmModal} onOpenChange={setOpenConfirmModal}>
          <DialogTrigger asChild>
            <Button disabled={saleItems.length === 0}>Complete Sale</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Sale</DialogTitle>
              <DialogDescription>
                Are you sure you want to complete this sale? This will update stock and create an invoice.
                Total: ${calculateTotal()}
              </DialogDescription>
            </DialogHeader>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <DialogFooter>
              <DialogClose>
                <Button variant="outline" disabled={loading}>
                  Cancel
                </Button>
              </DialogClose>
              <Button onClick={completeSale} disabled={loading}>
                {loading ? "Processing..." : "Complete Sale"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {/* Printable Invoice */}
      <div style={{ display: "none" }}>
        <div ref={printRef} className="p-6">
          <div className="text-center">
            {storeInfo?.logo_base64 && (
              <img
                src={storeInfo.logo_base64}
                alt="Store Logo"
                className="w-24 h-24 mx-auto mb-4"
              />
            )}
            <h1 className="text-2xl font-bold">{storeInfo?.name || "Store Name"}</h1>
            {storeInfo?.address && <p>{storeInfo.address}</p>}
            {storeInfo?.phone && <p>Phone: {storeInfo.phone}</p>}
            {storeInfo?.email && <p>Email: {storeInfo.email}</p>}
            {storeInfo?.tax_id && <p>Tax ID: {storeInfo.tax_id}</p>}
          </div>
          <h2 className="text-xl font-semibold mt-6">Sale Receipt</h2>
          <p>Date: {new Date().toLocaleString()}</p>
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price/Unit</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {saleItems.map((item) => (
                <TableRow key={item.product_id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>${item.price_unit.toFixed(2)}</TableCell>
                  <TableCell>${(item.quantity * item.price_unit).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="text-right mt-4">
            <p className="font-semibold">Total: ${calculateTotal()}</p>
          </div>
        </div>
      </div>
      {saleItems.length > 0 && (
        <Button onClick={handlePrint} className="mt-4">
          Print Receipt
        </Button>
      )}
    </>
  );
}