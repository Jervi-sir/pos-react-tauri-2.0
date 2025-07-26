// src/pages/ExportProductsDialog.tsx
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { runSql } from "@/runSql";
import { saveAs } from "file-saver"; // You'll need to install file-saver: npm install file-saver
import * as XLSX from "xlsx"; // You'll need to install xlsx: npm install xlsx

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

interface ExportProductsDialogProps {
  categoryId: string;
  searchQuery: string;
}

export function ExportProductsDialog({ categoryId, searchQuery }: ExportProductsDialogProps) {
  const [exportFormat, setExportFormat] = useState<string>("csv");
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const exportProducts = async () => {
    try {
      setIsExporting(true);

      // Build WHERE clause (same as in ProductsPage)
      let whereClauses: string[] = [];
      if (categoryId) {
        const escapedCategoryId = parseInt(categoryId, 10);
        if (!isNaN(escapedCategoryId)) {
          whereClauses.push(`p.category_id = ${escapedCategoryId}`);
        }
      }
      if (searchQuery) {
        const escapedSearch = searchQuery.replace(/'/g, "''");
        whereClauses.push(
          `(p.name LIKE '%${escapedSearch}%' OR p.barcode LIKE '%${escapedSearch}%')`
        );
      }
      const whereClause = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

      // Fetch all products (without pagination)
      const query = `
        SELECT p.*, pc.name as category_name
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        ${whereClause}
        ORDER BY created_at DESC
      `;
      const products = (await runSql(query)) as Product[];

      // Prepare data for export (removing image_base64 as it's not needed in export)
      const exportData = products.map(({ image_base64, ...product }) => ({
        ID: product.id,
        Name: product.name,
        Barcode: product.barcode || "N/A",
        Category: product.category_name || "N/A",
        Price: product.current_price_unit.toFixed(2),
        Stock: product.quantity,
        Created_At: product.created_at,
        Updated_At: product.updated_at,
      }));

      if (exportFormat === "csv") {
        // Convert to CSV
        const headers = Object.keys(exportData[0]).join(",");
        const rows = exportData.map((row) => Object.values(row).map(val => `"${val}"`).join(","));
        const csvContent = [headers, ...rows].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        saveAs(blob, "products_export.csv");
      } else if (exportFormat === "excel") {
        // Convert to Excel
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(blob, "products_export.xlsx");
      } else if (exportFormat === "json") {
        // Convert to JSON
        const jsonContent = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
        saveAs(blob, "products_export.json");
      }

      setIsOpen(false);
    } catch (err) {
      console.error("Error exporting products:", err);
      // You might want to show a toast notification here
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Export Products</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Products</DialogTitle>
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
            onClick={exportProducts}
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