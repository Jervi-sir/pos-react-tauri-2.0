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
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { runSql } from "@/runSql";
import { useImagePath } from "@/context/document-path-context";

type Product = {
  id: number;
  name: string;
  barcode: string | null;
  current_price_unit: number;
  quantity: number;
  image_path: string | null;
};

type SaleItem = {
  product_id: number;
  name: string;
  barcode: string | null;
  price_unit: number;
  quantity: number;
  stock: number;
  image_path: string | null;
};

type StoreInfo = {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  tax_id: string | null;
  logo_path: string | null;
};

// New ReceiptPrintDialog component
type ReceiptPrintDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  saleItems: SaleItem[];
  storeInfo: StoreInfo | null;
  invoiceId?: number;
};

function ReceiptPrintDialog({ open, onOpenChange, saleItems, storeInfo, invoiceId }: ReceiptPrintDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!receiptRef.current) return;
    const printContents = receiptRef.current.innerHTML;
    const win = window.open("", "PRINT", "height=600,width=800");
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>Sale Receipt</title>
            <style>
              body { font-family: sans-serif; margin: 2rem; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #aaa; padding: 4px 8px; }
              th { background: #f6f6f6; }
              .text-right { text-align: right; }
              .font-bold { font-weight: bold; }
              .text-lg { font-size: 18px; }
              .mb-1 { margin-bottom: 0.25rem; }
              .mb-2 { margin-bottom: 0.5rem; }
            </style>
          </head>
          <body>
            ${printContents}
          </body>
        </html>
      `);
      win.document.close();
      win.focus();
      win.print();
      setTimeout(() => win.close(), 500);
    } else {
      toast.error("Failed to open print window.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Receipt Preview</DialogTitle>
        </DialogHeader>
        <div ref={receiptRef} id="receipt-print-area" className="text-sm">
          {saleItems.length > 0 ? (
            <>
              <div className="text-center mb-2">
                {storeInfo?.logo_path && (
                  <img
                    src={useImagePath(storeInfo.logo_path)}
                    alt="Store Logo"
                    style={{ maxWidth: "100px", maxHeight: "100px" }}
                  />
                )}
                <div className="font-bold text-lg">{storeInfo?.name || "Store Name"}</div>
                {storeInfo?.address && <div>{storeInfo.address}</div>}
                {storeInfo?.phone && <div>Phone: {storeInfo.phone}</div>}
                {storeInfo?.email && <div>Email: {storeInfo.email}</div>}
                {/* {storeInfo?.tax_id && <div>Tax ID: {storeInfo.tax_id}</div>} */}
              </div>
              <div className="font-bold text-lg mb-1">Receipt #{invoiceId || "N/A"}</div>
              <div>Date: {new Date().toLocaleString()}</div>
              <table className="min-w-full mt-3 mb-2 border">
                <thead>
                  <tr>
                    <th className="text-left p-1">Product</th>
                    <th className="text-left p-1">Barcode</th>
                    <th className="text-right p-1">Qty</th>
                    <th className="text-right p-1">Unit</th>
                    <th className="text-right p-1">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {saleItems.map((item) => (
                    <tr key={item.product_id}>
                      <td className="p-1">{item.name}</td>
                      <td className="p-1">{item.barcode || "N/A"}</td>
                      <td className="p-1 text-right">{item.quantity}</td>
                      <td className="p-1 text-right">${item.price_unit.toFixed(2)}</td>
                      <td className="p-1 text-right">${(item.quantity * item.price_unit).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-right font-bold mt-2">
                TOTAL: ${saleItems.reduce((sum, item) => sum + item.quantity * item.price_unit, 0).toFixed(2)}
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-gray-500">No sale items</div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handlePrint} disabled={saleItems.length === 0}>
            Print Receipt
          </Button>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PosPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [lastSaleItems, setLastSaleItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [saleCompleted, setSaleCompleted] = useState(false);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [openPrintDialog, setOpenPrintDialog] = useState(false);
  const [lastInvoiceId, setLastInvoiceId] = useState<number | undefined>(undefined);

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

  // Fetch search results
  const fetchSearchResults = async (query: string) => {
    if (!query) {
      setSearchResults([]);
      return;
    }
    try {
      const escapedSearch = query.replace(/'/g, "''");
      const searchQuery = `
        SELECT id, name, barcode, current_price_unit, quantity, image_path
        FROM products
        WHERE name LIKE '%${escapedSearch}%' OR barcode = '${escapedSearch}'
        LIMIT 10
      `;
      const results = await runSql(searchQuery);
      // @ts-ignore
      const exactMatch = results.find((product: Product) => product.barcode === query);
      if (exactMatch) {
        const existingItem = saleItems.find((item) => item.product_id === exactMatch.id);
        if (existingItem) {
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
          setSaleItems([
            ...saleItems,
            {
              product_id: exactMatch.id,
              name: exactMatch.name,
              barcode: exactMatch.barcode,
              price_unit: exactMatch.current_price_unit,
              quantity: 1,
              stock: exactMatch.quantity,
              image_path: exactMatch.image_path,
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

  // Add product to sale
  const addToSale = (product: Product) => {
    const existingItem = saleItems.find((item) => item.product_id === product.id);
    if (existingItem) {
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
      setSaleItems([
        ...saleItems,
        {
          product_id: product.id,
          name: product.name,
          barcode: product.barcode,
          price_unit: product.current_price_unit,
          quantity: 1,
          stock: product.quantity,
          image_path: product.image_path,
        },
      ]);
      toast.success(`Added ${product.name} to sale.`);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  // Update quantity
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

  // Remove item
  const removeItem = (product_id: number) => {
    setSaleItems((items) => items.filter((item) => item.product_id !== product_id));
    toast.success("Item removed from sale.");
  };

  // Calculate total
  const calculateTotal = () => {
    return saleItems.reduce((sum, item) => sum + item.quantity * item.price_unit, 0).toFixed(2);
  };

  // Sanitize number inputs to prevent SQL injection
  const sanitizeNumber = (value: number) => {
    const num = Number(value);
    if (isNaN(num) || !Number.isInteger(num) || num < 0) {
      throw new Error("Invalid number input");
    }
    return num;
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
      const user_id = 1; // Replace with actual user_id
      const total_quantity = saleItems.reduce((sum, item) => sum + item.quantity, 0);
      const total_price = parseFloat(calculateTotal());

      const invoiceQuery = `
        INSERT INTO invoices (invoice_type, total_quantity, total_price, user_id)
        VALUES ('sold', ${sanitizeNumber(total_quantity)}, ${total_price}, ${sanitizeNumber(user_id)})
      `;
      await runSql(invoiceQuery);

      const invoiceIdQuery = `SELECT id FROM invoices ORDER BY ID DESC LIMIT 1`;
      const invoiceResult = await runSql(invoiceIdQuery);
      // @ts-ignore
      const invoice_id = invoiceResult[0].id;
      setLastInvoiceId(invoice_id);

      for (const item of saleItems) {
        const total_item_price = (item.quantity * item.price_unit).toFixed(2);
        const soldProductQuery = `
          INSERT INTO sold_products (product_id, invoice_id, quantity, total_price, price_unit)
          VALUES (${sanitizeNumber(item.product_id)}, ${sanitizeNumber(invoice_id)}, ${sanitizeNumber(item.quantity)}, ${total_item_price}, ${item.price_unit})
        `;
        await runSql(soldProductQuery);

        const newStock = item.stock - item.quantity;
        const updateStockQuery = `
          UPDATE products 
          SET quantity = ${sanitizeNumber(newStock)}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${sanitizeNumber(item.product_id)}
        `;
        await runSql(updateStockQuery);

        const historyQuery = `
          INSERT INTO history_product_entries (product_id, invoice_id, quantity, purchase_price, entry_type)
          VALUES (${sanitizeNumber(item.product_id)}, ${sanitizeNumber(invoice_id)}, ${-sanitizeNumber(item.quantity)}, ${item.price_unit}, 'purchase')
        `;
        await runSql(historyQuery);
      }

      setLastSaleItems(saleItems);
      setSaleItems([]);
      setError(null);
      setOpenConfirmModal(false);
      setSaleCompleted(true);
      setOpenPrintDialog(true); // Open print dialog instead of printing directly
    } catch (err) {
      console.error("Error completing sale:", err);
      setError(`Failed to complete sale: ${(err as Error).message}`);
      toast.error(`Failed to complete sale: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  // Start new session
  const startNewSession = () => {
    setSaleCompleted(false);
    setLastSaleItems([]);
    setLastInvoiceId(undefined);
    setSearchQuery("");
    setSearchResults([]);
    setError(null);
    toast.success("Started a new session.");
  };

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
                    className="cursor-pointer"
                  >
                    <TableCell>
                      {product.image_path ? (
                        <img
                          src={useImagePath(product.image_path)}
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
              <TableHead className="text-right px-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {saleItems.length > 0 ? (
              saleItems.map((item) => (
                <TableRow key={item.product_id}>
                  <TableCell>
                    {item.image_path ? (
                      <img
                        src={useImagePath(item.image_path)}
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
                  <TableCell className="text-right">
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
      {/* Print and New Session Buttons */}
      {saleCompleted && (
        <div className="flex flex-col gap-2 mt-4">
          <Button onClick={() => setOpenPrintDialog(true)} disabled={lastSaleItems.length === 0}>
            Preview Receipt
          </Button>
          <Button onClick={startNewSession} variant="outline">
            New Session
          </Button>
        </div>
      )}
      <ReceiptPrintDialog
        open={openPrintDialog}
        onOpenChange={setOpenPrintDialog}
        saleItems={lastSaleItems}
        storeInfo={storeInfo}
        invoiceId={lastInvoiceId}
      />
    </>
  );
}