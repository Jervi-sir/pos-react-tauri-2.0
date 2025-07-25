import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { runSql } from "@/runSql";
import { InvoicePrintDialog } from "./invoice-print-dialog";
import { ExportDialog } from "./invoice-export-dialog";
import { X } from "lucide-react";
import { PaginationSection } from "@/components/pagination-section";

type Invoice = {
  id: number;
  invoice_type: "sold" | "bought";
  amount: number;
  created_at: string;
  user_id: number;
  cashier: string;
  sale_id?: number;
  purchase_id?: number;
};

type User = {
  id: number;
  name: string;
};

const PAGE_SIZE = 10;

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedInvoiceType, setSelectedInvoiceType] = useState<string>("");
  const [users, setUsers] = useState<User[]>([]);

  // For print dialog
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Sanitize inputs to prevent SQL injection
  const sanitizeNumber = (value: number) => {
    const num = Number(value);
    if (isNaN(num) || !Number.isInteger(num) || num < 0) {
      throw new Error("Invalid number input");
    }
    return num;
  };

  const sanitizeDate = (date: string) => {
    if (!date) return "";
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new Error("Invalid date format");
    }
    return date.replace(/'/g, "''"); // Escape single quotes
  };

  const sanitizeInvoiceType = (type: string) => {
    if (!type) return "";
    if (!["sold", "bought"].includes(type)) {
      throw new Error("Invalid invoice type");
    }
    return type.replace(/'/g, "''");
  };

  // Fetch users for the dropdown
  const fetchUsers = async () => {
    try {
      const query = `SELECT id, name FROM users ORDER BY name`;
      const res: any = await runSql(query);
      setUsers(res.rows?.map((row: any) => ({
        id: row.id,
        name: row.name,
      })) || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users. Please try again.");
    }
  };

  // Fetch invoices with filters
  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = sanitizeNumber((page - 1) * PAGE_SIZE);
      let query = `
        SELECT 
          i.id, 
          i.invoice_type, 
          i.amount, 
          i.created_at, 
          i.user_id, 
          i.sale_id, 
          i.purchase_id,
          u.name as cashier
        FROM invoices i
        LEFT JOIN users u ON i.user_id = u.id
      `;
      const conditions: string[] = [];
      if (startDate && endDate) {
        try {
          conditions.push(
            `date(i.created_at) BETWEEN '${sanitizeDate(startDate)}' AND '${sanitizeDate(endDate)}'`
          );
        } catch (err) {
          setError("Invalid date format. Please use YYYY-MM-DD.");
          setLoading(false);
          return;
        }
      }
      if (selectedUserId) {
        conditions.push(`i.user_id = ${sanitizeNumber(Number(selectedUserId))}`);
      }
      if (selectedInvoiceType) {
        conditions.push(`i.invoice_type = '${sanitizeInvoiceType(selectedInvoiceType)}'`);
      }
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
      }
      query += ` ORDER BY i.created_at DESC LIMIT ${sanitizeNumber(PAGE_SIZE)} OFFSET ${offset}`;
      const res: any = await runSql(query);

      setInvoices(
        res.rows?.map((row: any) => ({
          id: row.id,
          invoice_type: row.invoice_type as "sold" | "bought",
          amount: row.amount,
          created_at: row.created_at,
          user_id: row.user_id,
          cashier: row.cashier || "Unknown",
          sale_id: row.sale_id,
          purchase_id: row.purchase_id,
        })) || []
      );

      // Total count with the same filters
      let countQuery = `SELECT COUNT(*) as cnt FROM invoices i`;
      if (conditions.length > 0) {
        countQuery += ` WHERE ${conditions.join(" AND ")}`;
      }
      const countRes: any = await runSql(countQuery);
      setTotalCount(countRes.rows?.[0]?.cnt || 0);
    } catch (err) {
      console.error("Error fetching invoices:", err);
      setError("Failed to load invoices. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch users and invoices on mount and when filters/page change
  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [page, startDate, endDate, selectedUserId, selectedInvoiceType]);

  const pageCount = Math.ceil(totalCount / PAGE_SIZE);

  // Clear filters
  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedUserId("");
    setSelectedInvoiceType("");
    setPage(1);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Invoices</h2>
        <ExportDialog
          buildQuery={(range: string, s: string, e: string, exportUserId: string, exportInvoiceType: string) => {
            let query = `
              SELECT 
                i.id, 
                i.invoice_type, 
                i.amount, 
                i.created_at, 
                u.name as cashier
              FROM invoices i
              LEFT JOIN users u ON i.user_id = u.id
            `;
            const conditions: string[] = [];
            if (range === "with_filter") {
              if (startDate && endDate) {
                try {
                  conditions.push(`date(i.created_at) BETWEEN '${sanitizeDate(startDate)}' AND '${sanitizeDate(endDate)}'`);
                } catch (err) {
                  console.error("Invalid date input:", err);
                  // Fallback to no date filter
                }
              }
              if (selectedUserId) {
                conditions.push(`i.user_id = ${sanitizeNumber(Number(selectedUserId))}`);
              }
              if (selectedInvoiceType) {
                conditions.push(`i.invoice_type = '${sanitizeInvoiceType(selectedInvoiceType)}'`);
              }
            } else if (range === "all") {
              // No conditions for "All Time"
            }
            if (exportUserId) {
              conditions.push(`i.user_id = ${sanitizeNumber(Number(exportUserId))}`);
            }
            if (exportInvoiceType) {
              conditions.push(`i.invoice_type = '${sanitizeInvoiceType(exportInvoiceType)}'`);
            }
            if (conditions.length > 0) {
              query += ` WHERE ${conditions.join(" AND ")}`;
            }
            query += ` ORDER BY i.created_at DESC`;
            return query;
          }}
          filePrefix="invoices"
          dialogTitle="Export Invoices"
          users={users}
          selectedUserId={selectedUserId}
          selectedInvoiceType={selectedInvoiceType}
          currentStartDate={startDate} // Pass current start date
          currentEndDate={endDate} // Pass current end date
        />
      </div>
      {/* Filters */}
      <div className="mb-4 flex gap-4 flex-wrap">
        <div className="flex gap-2 items-center">
          <label htmlFor="start-date" className="text-sm font-medium">
            Start:
          </label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="w-34"
          />
        </div>
        <div className="flex gap-2 items-center">
          <label htmlFor="end-date" className="text-sm font-medium">
            End:
          </label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="w-34"
          />
        </div>
        <div className="flex gap-2 items-center">
          <label htmlFor="user" className="text-sm font-medium">
            Created By:
          </label>
          <Select
            value={selectedUserId}
            onValueChange={(value) => {
              setSelectedUserId(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-34">
              <SelectValue placeholder="user" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>All Users</SelectLabel>
                {users.map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 items-center">
          <label htmlFor="invoice-type" className="text-sm font-medium">
            Invoice Type:
          </label>
          <Select
            value={selectedInvoiceType}
            onValueChange={(value) => {
              setSelectedInvoiceType(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-34">
              <SelectValue placeholder="invoice type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>All Types</SelectLabel>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="bought">Bought</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size={'icon'}
          onClick={clearFilters}
          disabled={!startDate && !endDate && !selectedUserId && !selectedInvoiceType}
        >
          <X />
        </Button>
      </div>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {/* {loading && <div>Loading...</div>} */}
      <div className="border rounded-xl shadow overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-left">Created By</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-center">Print</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="text-center py-6">
                  No invoices
                </td>
              </tr>
            )}
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t">
                <td className="px-4 py-2">{inv.id}</td>
                <td className="px-4 py-2 capitalize">{inv.invoice_type}</td>
                <td className="px-4 py-2 text-right">
                  {Number(inv.amount).toFixed(2)}
                </td>
                <td className="px-4 py-2">{inv.cashier}</td>
                <td className="px-4 py-2">
                  {new Date(inv.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedInvoice(inv);
                      setInvoiceDialogOpen(true);
                    }}
                  >
                    Print
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <PaginationSection page={page} pageCount={pageCount} setPage={setPage} maxPagesToShow={5} />
      {/* Print Invoice Dialog */}
      <InvoicePrintDialog
        open={invoiceDialogOpen}
        onOpenChange={(v) => {
          setInvoiceDialogOpen(v);
          if (!v) setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
      />
    </div>
  );
}