import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { runSql } from "@/runSql";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

type User = {
  id: number;
  name: string;
};

type ExportDialogProps = {
  buildQuery: (
    range: "all" | "with_filter",
    startDate: string,
    endDate: string,
    exportUserId: string,
    exportInvoiceType: string
  ) => string;
  filePrefix: string;
  excludeFields?: string[];
  buttonLabel?: string;
  dialogTitle?: string;
  exportTransform?: (rows: any[]) => any[];
  users: User[];
  selectedUserId: string;
  selectedInvoiceType: string;
  currentStartDate: string;
  currentEndDate: string;
};

export function ExportDialog({
  buildQuery,
  filePrefix,
  excludeFields = [],
  buttonLabel = "Export",
  dialogTitle = "Export Data",
  exportTransform,
  users,
  selectedUserId,
  selectedInvoiceType,
  currentStartDate,
  currentEndDate,
}: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<"all" | "with_filter">("with_filter");
  const [startDate, setStartDate] = useState<string>(currentStartDate);
  const [endDate, setEndDate] = useState<string>(currentEndDate);
  const [exportUserId, setExportUserId] = useState<string>(selectedUserId);
  const [exportInvoiceType, setExportInvoiceType] = useState<string>(selectedInvoiceType);
  const [format, setFormat] = useState<"csv" | "excel" | "json">("csv");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  function isValidRange() {
    if (range === "all") return true;
    if (!startDate || !endDate) return false;
    return startDate <= endDate;
  }

  const handleExport = async () => {
    setError("");
    if (range === "with_filter") {
      if (!startDate || !endDate) {
        setError("Please select both start and end dates.");
        return;
      }
      if (startDate > endDate) {
        setError("Start date cannot be after end date.");
        return;
      }
    }

    setLoading(true);

    try {
      const sql = buildQuery(range, startDate, endDate, exportUserId, exportInvoiceType);
      const res: any = await runSql(sql);
      let rows = res.rows || [];

      // Remove excluded fields
      if (excludeFields.length) {
        rows = rows.map((row: any) => {
          const copy = { ...row };
          excludeFields.forEach((f) => delete copy[f]);
          return copy;
        });
      }

      // Optional: transform rows before export (custom logic)
      if (exportTransform) {
        rows = exportTransform(rows);
      }

      if (format === "csv") {
        const csv = toCSV(rows);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        saveAs(blob, `${filePrefix}_export_${Date.now()}.csv`);
      } else if (format === "excel") {
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, dialogTitle);
        const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([wbout], { type: "application/octet-stream" }), `${filePrefix}_export_${Date.now()}.xlsx`);
      } else if (format === "json") {
        const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
        saveAs(blob, `${filePrefix}_export_${Date.now()}.json`);
      }

      setOpen(false);
      setError("");
    } catch (err) {
      console.error("Error exporting data:", err);
      setError("Failed to export data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">{buttonLabel}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="range"
                  checked={range === "all"}
                  onChange={() => setRange("all")}
                  className="mr-2"
                />
                Export all
              </label>
              <label className="inline-flex items-center ml-8">
                <input
                  type="radio"
                  name="range"
                  checked={range === "with_filter"}
                  onChange={() => setRange("with_filter")}
                  className="mr-2"
                />
                Export with current filters
              </label>
            </div>
            {range === "with_filter" && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div>
                    <label htmlFor="start-date" className="mb-1 block text-sm font-medium">Start Date</label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-40"
                      max={endDate || undefined}
                    />
                  </div>
                  <div>
                    <label htmlFor="end-date" className="mb-1 block text-sm font-medium">End Date</label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-40"
                      min={startDate || undefined}
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div>
                    <label htmlFor="user" className="mb-1 block text-sm font-medium">Created By</label>
                    <Select
                      value={exportUserId}
                      onValueChange={setExportUserId}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Select a user" />
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
                  <div>
                    <label htmlFor="invoice-type" className="mb-1 block text-sm font-medium">Invoice Type</label>
                    <Select
                      value={exportInvoiceType}
                      onValueChange={setExportInvoiceType}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Select invoice type" />
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
                </div>
              </div>
            )}
            <div>
              <label htmlFor="format" className="mb-1 block text-sm font-medium">Export Format</label>
              <Select
                value={format}
                onValueChange={(v) => setFormat(v as "csv" | "excel" | "json")}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <div className="text-red-500">{error}</div>}
          </div>
          <DialogFooter>
            <Button
              onClick={handleExport}
              disabled={loading || (range === "with_filter" && !isValidRange())}
            >
              {loading ? "Exporting..." : "Export"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <style>{`
        .date-input {
          background: var(--background, #fff);
          color: var(--foreground, #222);
        }
        html.dark .date-input {
          background: #18181b;
          color: #fff;
          border-color: #333;
        }
      `}</style>
    </>
  );
}

function toCSV(rows: any[]) {
  if (!rows || rows.length === 0) return "";
  const keys = Object.keys(rows[0] ?? {});
  const escape = (v: any) =>
    typeof v === "string" && (v.includes(",") || v.includes('"') || v.includes("\n"))
      ? `"${v.replace(/"/g, '""')}"`
      : v ?? "";
  return [
    keys.join(","),
    ...rows.map((row) => keys.map((k) => escape(row[k])).join(",")),
  ].join("\n");
}