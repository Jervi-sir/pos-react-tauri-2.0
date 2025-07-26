// src/pages/export-sales-dialog.tsx
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { runSql } from "@/runSql";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { format } from "date-fns";

type Invoice = {
  id: number;
  invoice_type: string;
  total_quantity: number;
  total_price: number;
  user_id: number;
  created_at: string;
};

interface ExportSalesDialogProps {
  selectedCategory: string;
  selectedInvoiceType: string;
  startDate: string;
  endDate: string;
  userId: string;
}

export function ExportSalesDialog({
  selectedCategory,
  selectedInvoiceType,
  startDate,
  endDate,
  userId,
}: ExportSalesDialogProps) {
  const [exportFormat, setExportFormat] = useState<string>("csv");
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const exportSales = async () => {
    try {
      setIsExporting(true);

      // Build the same query as in fetchInvoices
      let query = `
        SELECT DISTINCT i.id, i.invoice_type, i.total_quantity, i.total_price, i.user_id, i.created_at
        FROM invoices i
        JOIN sold_products sp ON i.id = sp.invoice_id
        JOIN products p ON sp.product_id = p.id
        WHERE 1=1
      `;

      if (selectedInvoiceType !== "all") {
        query += ` AND i.invoice_type = '${selectedInvoiceType}'`;
      }
      if (selectedCategory !== "all") {
        query += ` AND p.category_id = ${parseInt(selectedCategory)}`;
      }
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
          toast.error("Invalid User ID in export. Skipping user_id filter.");
        }
      }

      query += ` ORDER BY i.created_at DESC`;

      const invoices = (await runSql(query)) as Invoice[];

      // Prepare data for export
      const exportData = invoices.map((invoice) => ({
        Invoice_ID: invoice.id,
        Invoice_Type: invoice.invoice_type,
        Date: format(new Date(invoice.created_at), "PPP p"),
        Total_Quantity: invoice.total_quantity,
        Total_Price: invoice.total_price.toFixed(2),
        User_ID: invoice.user_id,
      }));

      if (exportFormat === "csv") {
        // Convert to CSV
        const headers = Object.keys(exportData[0]).join(",");
        const rows = exportData.map((row) =>
          Object.values(row)
            .map((val) => `"${val}"`)
            .join(",")
        );
        const csvContent = [headers, ...rows].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        saveAs(blob, "sales_export.csv");
      } else if (exportFormat === "excel") {
        // Convert to Excel
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sales");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(blob, "sales_export.xlsx");
      } else if (exportFormat === "json") {
        // Convert to JSON
        const jsonContent = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
        saveAs(blob, "sales_export.json");
      }

      setIsOpen(false);
      toast.success("Sales data exported successfully!");
    } catch (err) {
      console.error("Error exporting sales:", err);
      toast.error(`Failed to export sales: ${(err as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Export</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Sales</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Export Format</label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={exportSales}
            disabled={isExporting}
            className="w-full"
          >
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}