import { useEffect, useState, useRef } from "react";
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
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { format } from "date-fns";
import { routes } from "@/main";

type Invoice = {
  id: number;
  invoice_type: string;
  total_quantity: number;
  total_price: number;
  user_id: number;
  created_at: string;
};

type SoldProduct = {
  id: number;
  product_id: number;
  name: string;
  quantity: number;
  price_unit: number;
  total_price: number;
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

export default function EntryInvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([]);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch store info
  const fetchStoreInfo = async () => {
    try {
      const query = `SELECT * FROM store_info LIMIT 1`;
      const result = await runSql(query);
      if (result.length) {
        setStoreInfo(result[0] as StoreInfo);
      }
    } catch (err) {
      console.error("Error fetching store info:", err);
      toast.error(`Failed to fetch store info: ${(err as Error).message}`);
    }
  };

  // Fetch invoices with filters
  const fetchInvoices = async () => {
    try {
      let query = `
        SELECT DISTINCT i.id, i.invoice_type, i.total_quantity, i.total_price, i.user_id, i.created_at
        FROM invoices i
        LEFT JOIN sold_products sp ON i.id = sp.invoice_id
        LEFT JOIN products p ON sp.product_id = p.id
        WHERE i.invoice_type = 'bought'
      `;
      if (startDate) {
        query += ` AND i.created_at >= '${startDate}'`;
      }
      if (endDate) {
        query += ` AND i.created_at <= '${endDate} 23:59:59'`;
      }

      query += ` ORDER BY i.created_at DESC`;

      console.log("Fetch Invoices Query:", query); // Debug
      const results = await runSql(query);
      console.log("Fetch Invoices Results:", results); // Debug
      setInvoices(results as Invoice[]);
    } catch (err) {
      console.error("Error fetching invoices:", err);
      setError(`Failed to fetch invoices: ${(err as Error).message}`);
      toast.error(`Failed to fetch invoices: ${(err as Error).message}`);
    }
  };

  // Fetch products for a specific invoice
  const fetchSoldProducts = async (invoiceId: number) => {
    try {
      const query = `
        SELECT sp.id, sp.product_id, p.name, sp.quantity, sp.price_unit, sp.total_price, p.image_base64
        FROM sold_products sp
        JOIN products p ON sp.product_id = p.id
        WHERE sp.invoice_id = ${invoiceId}
      `;
      console.log("Fetch Sold Products Query:", query); // Debug
      const results = await runSql(query);
      console.log("Fetch Sold Products Results:", results); // Debug
      setSoldProducts(results as SoldProduct[]);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError(`Failed to fetch products: ${(err as Error).message}`);
      toast.error(`Failed to fetch products: ${(err as Error).message}`);
    }
  };

  // Print receipt
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Purchase_Receipt_${selectedInvoice?.id || "unknown"}_${new Date().toISOString()}`,
  });

  // Handle invoice click
  const handleInvoiceClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    fetchSoldProducts(invoice.id);
  };

  // Validate start date
  const handleStartDateChange = (value: string) => {
    if (endDate && value > endDate) {
      toast.error("Start date cannot be after end date.");
      return;
    }
    setStartDate(value);
  };

  // Validate end date
  const handleEndDateChange = (value: string) => {
    if (startDate && value < startDate) {
      toast.error("End date cannot be before start date.");
      return;
    }
    setEndDate(value);
  };

  useEffect(() => {
    fetchStoreInfo();
    fetchInvoices();
  }, [startDate, endDate]);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Purchase History</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Input
          type="date"
          value={startDate}
          onChange={(e) => handleStartDateChange(e.target.value)}
          placeholder="Start Date"
          max={endDate}
          className="w-full sm:w-[200px]"
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => handleEndDateChange(e.target.value)}
          placeholder="End Date"
          min={startDate}
          className="w-full sm:w-[200px]"
        />
        <Button
          variant="outline"
          onClick={() => {
            setStartDate("");
            setEndDate("");
          }}
          className="w-full sm:w-auto"
        >
          Clear Filters
        </Button>
      </div>

      {/* Error Display */}
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* Invoices Table */}
      <div className="border rounded-md shadow overflow-x-auto mb-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total Quantity</TableHead>
              <TableHead>Total Price</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length > 0 ? (
              invoices.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  onClick={() => handleInvoiceClick(invoice)}
                  className="cursor-pointer hover:bg-gray-100"
                >
                  <TableCell>{invoice.id}</TableCell>
                  <TableCell>{format(new Date(invoice.created_at), "PPP p")}</TableCell>
                  <TableCell>{invoice.total_quantity}</TableCell>
                  <TableCell>${invoice.total_price.toFixed(2)}</TableCell>
                  <TableCell>{invoice.user_id}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInvoiceClick(invoice);
                      }}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  No purchases found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Invoice Details Dialog */}
      {selectedInvoice && (
        <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Purchase Invoice #{selectedInvoice.id}</DialogTitle>
              <DialogDescription>
                Details for purchase on {format(new Date(selectedInvoice.created_at), "PPP p")}.
                Total: ${selectedInvoice.total_price.toFixed(2)}
              </DialogDescription>
            </DialogHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price/Unit</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {soldProducts.length > 0 ? (
                  soldProducts.map((product) => (
                    <TableRow key={product.id}>
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
                      <TableCell>{product.quantity}</TableCell>
                      <TableCell>${product.price_unit.toFixed(2)}</TableCell>
                      <TableCell>${product.total_price.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No products found for this invoice.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
              <Button onClick={handlePrint}>Print Receipt</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Printable Receipt (Hidden) */}
      <div style={{ display: "none" }}>
        <div ref={printRef} className="p-6">
          <div className="text-center">
            {storeInfo?.logo_base64 && (
              <img
                src={storeInfo.logo_base64}
                alt={storeInfo.name}
                className="w-24 h-24 mx-auto mb-4"
              />
            )}
            <h1 className="text-2xl font-bold">{storeInfo?.name || "Store Name"}</h1>
            {storeInfo?.address && <p>{storeInfo.address}</p>}
            {storeInfo?.phone && <p>Phone: {storeInfo.phone}</p>}
            {storeInfo?.email && <p>Email: {storeInfo.email}</p>}
            {storeInfo?.tax_id && <p>Tax ID: {storeInfo.tax_id}</p>}
          </div>
          <h2 className="text-xl font-semibold mt-6">Purchase Receipt #{selectedInvoice?.id}</h2>
          <p>Date: {selectedInvoice && format(new Date(selectedInvoice.created_at), "PPP p")}</p>
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
              {soldProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.quantity}</TableCell>
                  <TableCell>${product.price_unit.toFixed(2)}</TableCell>
                  <TableCell>${product.total_price.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="text-right mt-4">
            <p className="font-semibold">Total: ${selectedInvoice?.total_price.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        className="mt-4"
        onClick={() => navigate(routes.pos)}
      >
        Back to POS
      </Button>
    </div>
  );
}