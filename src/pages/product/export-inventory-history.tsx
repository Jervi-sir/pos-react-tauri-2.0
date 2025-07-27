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

type HistoryEntry = {
  id: number;
  product_id: number;
  invoice_id: number | null;
  quantity: number;
  purchase_price: number;
  entry_type: string;
  created_at: string;
};

interface ExportInventoryHistoryDialogProps {
  productId: number;
  productName: string;
}

export function ExportInventoryHistoryDialog({
  productId,
  productName,
}: ExportInventoryHistoryDialogProps) {
  const [exportFormat, setExportFormat] = useState<string>("csv");
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const exportInventoryHistory = async () => {
    try {
      setIsExporting(true);

      // Fetch history entries (same query as in ProductDetails)
      const query = `
        SELECT *
        FROM history_product_entries
        WHERE product_id = ${parseInt(productId.toString(), 10)}
        ORDER BY created_at DESC
      `;
      const historyEntries = (await runSql(query)) as HistoryEntry[];

      // Prepare data for export
      const exportData = historyEntries.map((entry) => ({
        ID: entry.id,
        Date: format(new Date(entry.created_at), "PPP p"),
        Type: entry.entry_type,
        Quantity: entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity.toString(),
        Purchase_Price: entry.purchase_price.toFixed(2),
        Invoice_ID: entry.invoice_id || "N/A",
      }));

      // Sanitize product name for filename
      const sanitizedProductName = productName.replace(/[^a-zA-Z0-9]/g, "_");

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
        saveAs(blob, `inventory_history_${sanitizedProductName}_${productId}.csv`);
      } else if (exportFormat === "excel") {
        // Convert to Excel
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory History");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(blob, `inventory_history_${sanitizedProductName}_${productId}.xlsx`);
      } else if (exportFormat === "json") {
        // Convert to JSON
        const jsonContent = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
        saveAs(blob, `inventory_history_${sanitizedProductName}_${productId}.json`);
      }

      setIsOpen(false);
      toast.success("Inventory history exported successfully!");
    } catch (err) {
      console.error("Error exporting inventory history:", err);
      toast.error(`Failed to export inventory history: ${(err as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Export History</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Inventory History</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Export Format</label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger className="w-full">
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
            onClick={exportInventoryHistory}
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