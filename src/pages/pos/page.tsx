// Modified PosPage.tsx
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
  current_price_unit: number | null;
  original_bought_price: number | null;
  quantity: number;
  image_path: string | null;
  category_name: string;
};

type SaleItem = {
  product_id: number;
  name: string;
  barcode: string | null;
  price_unit: number;
  original_bought_price: number;
  quantity: number;
  stock: number;
  image_path: string | null;
  category_name: string;
};

type StoreInfo = {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  tax_id: string | null;
  logo_path: string | null;
};

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
              <div className="flex gap-4 mb-2">
                {storeInfo?.logo_path && (
                  <img
                    src={useImagePath(storeInfo.logo_path)}
                    alt="Store Logo"
                    style={{ maxWidth: "100px", maxHeight: "100px" }}
                  />
                )}
                <div>
                  <div className="font-bold text-lg">{storeInfo?.name || "Store Name"}</div>
                  {storeInfo?.address && <div>{storeInfo.address}</div>}
                  {storeInfo?.phone && <div>Phone: {storeInfo.phone}</div>}
                  {storeInfo?.email && <div>Email: {storeInfo.email}</div>}
                </div>
              </div>
              <hr />
              <div className="font-bold text-lg mb-1">Receipt #{invoiceId || "N/A"}</div>
              <div>Date: {new Date().toLocaleString()}</div>
              <table className="min-w-full mt-3 mb-2 border">
                <thead>
                  <tr>
                    <th className="text-left p-1">Product</th>
                    <th className="text-left p-1">Barcode</th>
                    <th className="text-right p-1">Qty</th>
                    <th className="text-right p-1">Unit</th>
                    {/* <th className="text-right p-1">Orig. Bought</th> */}
                    <th className="text-right p-1">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {saleItems.map((item) => (
                    <tr key={item.product_id}>
                      <td className="p-1">{item.name}</td>
                      <td className="p-1">{item.barcode || "N/A"}</td>
                      <td className="p-1 text-right">{item.quantity}</td>
                      <td className="p-1 text-right">DA{(item.price_unit ?? 0).toFixed(2)}</td>
                      {/* <td className="p-1 text-right">DA{(item.original_bought_price ?? 0).toFixed(2)}</td> */}
                      <td className="p-1 text-right">DA{(item.quantity * (item.price_unit ?? 0)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-right font-bold mt-2">
                TOTAL: DA{' '}
                {saleItems.reduce((sum, item) => sum + item.quantity * (item.price_unit ?? 0), 0).toFixed(2)}
              </div>
              {/* <div className="text-right font-bold mt-1">
                TOTAL ORIGINAL BOUGHT: DA{' '}
                {saleItems.reduce((sum, item) => sum + item.quantity * (item.original_bought_price ?? 0), 0).toFixed(2)}
              </div> */}
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

  const fetchSearchResults = async (query: string) => {
    if (!query) {
      setSearchResults([]);
      return;
    }
    try {
      const escapedSearch = query.replace(/'/g, "''");
      const searchQuery = `
        SELECT p.id, p.name, p.barcode, p.current_price_unit, p.original_bought_price, p.quantity, p.image_path, pc.name as category_name
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        WHERE (p.name LIKE '%${escapedSearch}%' OR p.barcode = '${escapedSearch}')
        AND p.current_price_unit IS NOT NULL AND p.current_price_unit > 0.0
        AND p.original_bought_price IS NOT NULL AND p.original_bought_price >= 0.0
        LIMIT 10
      `;
      const results = await runSql(searchQuery);
      // @ts-ignore
      const exactMatch = results.find((product: Product) => product.barcode === query);
      if (exactMatch) {
        const existingItem = saleItems.find((item) => item.product_id === exactMatch.id);
        if (existingItem) {
          if (existingItem.quantity < existingItem.stock) {
            setSaleItems((items) => items.map((item) =>
              item.product_id === exactMatch.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ));
            toast.success(`Added 1 more ${existingItem.name} to sale.`);
          } else {
            toast.error(`Cannot add more ${existingItem.name}. Stock limit: ${existingItem.stock}.`);
          }
        } else {
          if (exactMatch.current_price_unit == null || exactMatch.original_bought_price == null) {
            toast.error(`Cannot add ${exactMatch.name}: Price information missing.`);
            return;
          }
          setSaleItems([
            ...saleItems,
            {
              product_id: exactMatch.id,
              name: exactMatch.name,
              barcode: exactMatch.barcode,
              price_unit: exactMatch.current_price_unit,
              original_bought_price: exactMatch.original_bought_price,
              quantity: 1,
              stock: exactMatch.quantity,
              image_path: exactMatch.image_path,
              category_name: exactMatch.category_name,
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

  const addToSale = (product: Product) => {
    if (product.current_price_unit == null || product.original_bought_price == null) {
      toast.error(`Cannot add ${product.name}: Price information missing.`);
      return;
    }
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
          original_bought_price: product.original_bought_price,
          quantity: 1,
          stock: product.quantity,
          image_path: product.image_path,
          category_name: product.category_name,
        },
      ]);
      toast.success(`Added ${product.name} to sale.`);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

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

  const removeItem = (product_id: number) => {
    setSaleItems((items) => items.filter((item) => item.product_id !== product_id));
    toast.success("Item removed from sale.");
  };

  const calculateTotal = () => {
    return saleItems.reduce((sum, item) => sum + item.quantity * (item.price_unit ?? 0), 0).toFixed(2);
  };

  const calculateTotalOriginalBoughtPrice = () => {
    return saleItems
      .reduce((sum, item) => sum + item.quantity * (item.original_bought_price ?? 0), 0)
      .toFixed(2);
  };

  const sanitizeNumber = (value: number) => {
    const num = Number(value);
    if (isNaN(num) || !Number.isFinite(num) || num < 0) {
      throw new Error("Invalid number input");
    }
    return num;
  };

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
      if (item.price_unit == null || item.original_bought_price == null) {
        setError(`Price information missing for ${item.name}.`);
        toast.error(`Price information missing for ${item.name}.`);
        return;
      }
    }

    setLoading(true);
    try {
      const user_id = 1;
      const total_quantity = saleItems.reduce((sum, item) => sum + item.quantity, 0);
      const total_price = parseFloat(calculateTotal());
      const total_original_bought_price = parseFloat(calculateTotalOriginalBoughtPrice());

      const invoiceQuery = `
        INSERT INTO invoices (invoice_type, total_quantity, total_price, total_original_bought_price, user_id)
        VALUES ('sold', ${sanitizeNumber(total_quantity)}, ${sanitizeNumber(total_price)}, ${sanitizeNumber(total_original_bought_price)}, ${sanitizeNumber(user_id)})
      `;
      await runSql(invoiceQuery);

      const invoiceIdQuery = `SELECT id FROM invoices ORDER BY ID DESC LIMIT 1`;
      const invoiceResult = await runSql(invoiceIdQuery);
      // @ts-ignore
      const invoice_id = invoiceResult[0].id;
      setLastInvoiceId(invoice_id);

      for (const item of saleItems) {
        const total_item_price = sanitizeNumber(item.quantity * item.price_unit);
        const total_item_original_bought_price = sanitizeNumber(item.quantity * item.original_bought_price);
        const soldProductQuery = `
          INSERT INTO sold_products (product_id, invoice_id, quantity, total_price, price_unit, original_bought_price, total_original_bought_price)
          VALUES (${sanitizeNumber(item.product_id)}, ${sanitizeNumber(invoice_id)}, ${sanitizeNumber(item.quantity)}, ${total_item_price}, ${sanitizeNumber(item.price_unit)}, ${sanitizeNumber(item.original_bought_price)}, ${total_item_original_bought_price})
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
          INSERT INTO history_product_entries (product_id, invoice_id, quantity, purchase_price, original_bought_price, entry_type)
          VALUES (${sanitizeNumber(item.product_id)}, ${sanitizeNumber(invoice_id)}, ${-sanitizeNumber(item.quantity)}, ${sanitizeNumber(item.price_unit)}, ${sanitizeNumber(item.original_bought_price)}, 'purchase')
        `;
        await runSql(historyQuery);
      }

      setLastSaleItems(saleItems);
      setSaleItems([]);
      setError(null);
      setOpenConfirmModal(false);
      setSaleCompleted(true);
      setOpenPrintDialog(true);
    } catch (err) {
      console.error("Error completing sale:", err);
      setError(`Failed to complete sale: ${(err as Error).message}`);
      toast.error(`Failed to complete sale: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

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
      <div>
        <Input
          placeholder="Search by name or barcode"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-[400px]"
          disabled={saleCompleted}
        />
        {searchResults.length > 0 && (
          <div className="border rounded-md shadow mt-2 max-h-[200px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Orig. Bought</TableHead>
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
                    <TableCell>{product.category_name || "N/A"}</TableCell>
                    <TableCell>{product.barcode || "N/A"}</TableCell>
                    <TableCell>{product.quantity}</TableCell>
                    <TableCell>DA{(product.current_price_unit ?? 0).toFixed(2)}</TableCell>
                    <TableCell>DA{(product.original_bought_price ?? 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <div className="border rounded-md shadow overflow-x-auto mb-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price/Unit</TableHead>
              <TableHead>Orig. Bought</TableHead>
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
                  <TableCell>{item.category_name}</TableCell>
                  <TableCell>DA{(item.price_unit ?? 0).toFixed(2)}</TableCell>
                  <TableCell>DA{(item.original_bought_price ?? 0).toFixed(2)}</TableCell>
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
                  <TableCell>DA{(item.quantity * (item.price_unit ?? 0)).toFixed(2)}</TableCell>
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
                <TableCell colSpan={10} className="text-center">
                  No items in sale.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-between items-center mb-6">
        <div className="text-lg font-semibold">
          Total: DA{' '}{calculateTotal()}
          {/* <br />
          Total Original Bought: DA{' '}{calculateTotalOriginalBoughtPrice()} */}
        </div>
        <Dialog open={openConfirmModal} onOpenChange={setOpenConfirmModal}>
          <DialogTrigger asChild>
            <Button disabled={saleItems.length === 0}>Complete Sale</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Sale</DialogTitle>
              <DialogDescription>
                Are you sure you want to complete this sale? This will update stock and create an invoice.
                <br />
                Total: DA{' '}{calculateTotal()}
                {/* <br />
                Total Original Bought: DA{' '}{calculateTotalOriginalBoughtPrice()} */}
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