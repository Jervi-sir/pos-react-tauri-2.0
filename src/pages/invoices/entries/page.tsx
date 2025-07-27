import { useEffect, useState, useRef } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { runSql } from "@/runSql";
import { toast } from "sonner";
import { format } from "date-fns";
import { ExportEntryInvoicesDialog } from "./export-entry-invoices-dialog";
// Import PaginationSection
import { PaginationSection } from "@/components/pagination-section";

type Invoice = {
  id: number;
  invoice_type: string;
  total_quantity: number;
  total_price: number;
  user_id: number;
  user_name?: string; // Add user_name to store the user's name
  created_at: string;
};

type SoldProduct = {
  id: number;
  product_id: number;
  name: string;
  quantity: number;
  price_unit: number;
  total_price: number;
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

type User = {
  id: number;
  name: string;
};

export default function EntryInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [userId, setUserId] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([]);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Add pagination state
  const [page, setPage] = useState<number>(1);
  const [pageCount, setPageCount] = useState<number>(1);
  const pageSize = 10; // Number of invoices per page
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
      toast.error(`Failed to fetch store info: ${(err as Error).message}`);
    }
  };

  // Fetch users (unchanged)
  const fetchUsers = async () => {
    try {
      const query = `SELECT id, name FROM users ORDER BY name`;
      const result = await runSql(query);
      setUsers(result as User[]);
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error(`Failed to fetch users: ${(err as Error).message}`);
    }
  };

  // Fetch total number of invoices for pagination
  const fetchInvoiceCount = async () => {
    try {
      let query = `
        SELECT COUNT(DISTINCT i.id) as total
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
      if (userId !== "all") {
        const parsedUserId = parseInt(userId, 10);
        if (!isNaN(parsedUserId)) {
          query += ` AND i.user_id = ${parsedUserId}`;
        } else {
          toast.error("Invalid User ID selected.");
          return 0;
        }
      }

      console.log("Fetch Invoice Count Query:", query); // Debug
      const result = await runSql(query);
      // @ts-ignore
      const totalInvoices = result[0]?.total || 0;
      return totalInvoices;
    } catch (err) {
      console.error("Error fetching invoice count:", err);
      toast.error(`Failed to fetch invoice count: ${(err as Error).message}`);
      return 0;
    }
  };

  // Fetch invoices with pagination
  const fetchInvoices = async () => {
    try {
      const offset = (page - 1) * pageSize;

      let query = `
        SELECT DISTINCT i.id, i.invoice_type, i.total_quantity, i.total_price, i.user_id, 
               u.name AS user_name, i.created_at
        FROM invoices i
        LEFT JOIN history_product_entries hpe ON i.id = hpe.invoice_id
        LEFT JOIN products p ON hpe.product_id = p.id
        LEFT JOIN users u ON i.user_id = u.id
        WHERE i.invoice_type = 'bought'
      `;
      if (startDate) {
        query += ` AND i.created_at >= '${startDate}'`;
      }
      if (endDate) {
        query += ` AND i.created_at <= '${endDate} 23:59:59'`;
      }
      if (userId !== "all") {
        const parsedUserId = parseInt(userId, 10);
        if (!isNaN(parsedUserId)) {
          query += ` AND i.user_id = ${parsedUserId}`;
        } else {
          toast.error("Invalid User ID selected.");
          return;
        }
      }

      query += ` ORDER BY i.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;

      console.log("Fetch Invoices Query:", query); // Debug
      const results = await runSql(query);
      console.log("Fetch Invoices Results:", results); // Debug
      setInvoices(results as Invoice[]);

      const totalInvoices = await fetchInvoiceCount();
      setPageCount(Math.ceil(totalInvoices / pageSize));
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
        SELECT hpe.id, hpe.product_id, p.name, hpe.quantity, hpe.purchase_price AS price_unit, 
              (hpe.quantity * hpe.purchase_price) AS total_price, p.image_path
        FROM history_product_entries hpe
        JOIN products p ON hpe.product_id = p.id
        WHERE hpe.invoice_id = ${invoiceId}
      `;
      console.log("Fetch Purchase Products Query:", query); // Debug
      const results = await runSql(query);
      console.log("Fetch Purchase Products Results:", results); // Debug
      setSoldProducts(results as SoldProduct[]);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError(`Failed to fetch products: ${(err as Error).message}`);
      toast.error(`Failed to fetch products: ${(err as Error).message}`);
    }
  };



  // Print receipt
  const handlePrint = () => {
    if (!printRef.current || !selectedInvoice) return;

    const printContents = printRef.current.innerHTML;
    const win = window.open("", "PRINT", "height=600,width=800");
    if (win) {
      win.document.write(`
      <html>
        <head>
          <title>Receipt_${selectedInvoice.id}_${new Date().toISOString()}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 2rem; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 8px; }
            th { background: #f0f0f0; text-align: left; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .text-center { text-center: center; }
            img { max-width: 100px; max-height: 100px; }
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
    setPage(1); // Reset to first page when filters change
  };

  // Validate end date
  const handleEndDateChange = (value: string) => {
    if (startDate && value < startDate) {
      toast.error("End date cannot be before start date.");
      return;
    }
    setEndDate(value);
    setPage(1); // Reset to first page when filters change
  };

  // Handle user ID change
  const handleUserIdChange = (value: string) => {
    setUserId(value);
    setPage(1); // Reset to first page when filters change
  };

  useEffect(() => {
    fetchStoreInfo();
    fetchUsers();
    fetchInvoices();
  }, [startDate, endDate, userId, page]); // Added page to dependencies

  return (
    <>
      <h1 className="text-2xl font-bold">Purchase History</h1>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-3 flex-1">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            placeholder="Start Date"
            max={endDate}
            className="w-[150px]"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
            placeholder="End Date"
            min={startDate}
            className="w-[150px]"
          />
          <Select value={userId} onValueChange={handleUserIdChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select User" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setStartDate("");
            setEndDate("");
            setUserId("all");
            setPage(1); // Reset page when clearing filters
          }}
          className="w-full sm:w-auto"
        >
          Clear Filters
        </Button>
        <ExportEntryInvoicesDialog
          startDate={startDate}
          endDate={endDate}
          userId={userId}
        />
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
              <TableHead>User</TableHead>
              <TableHead className="text-right px-4">Actions</TableHead>
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
                  <TableCell>{invoice.user_name || `Unknown (ID: ${invoice.user_id})`}</TableCell>
                  <TableCell className="text-right">
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

      {/* Pagination */}
      <PaginationSection
        page={page}
        pageCount={pageCount}
        setPage={setPage}
        maxPagesToShow={5}
      />

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
                        {product.image_path ? (
                          <img
                            src={product.image_path}
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
            {storeInfo?.logo_path && (
              <img
                src={storeInfo.logo_path}
                alt={storeInfo.name}
                className="w-24 h-24 mx-auto mb-4"
              />
            )}
            <h1 className="text-2xl font-bold">{storeInfo?.name || "Store Name"}</h1>
            {storeInfo?.address && <p>{storeInfo.address}</p>}
            {storeInfo?.phone && <p>Phone: {storeInfo.phone}</p>}
            {storeInfo?.email && <p>Email: {storeInfo.email}</p>}
            {/* {storeInfo?.tax_id && <p>Tax ID: {storeInfo.tax_id}</p>} */}
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
    </>
  );
}