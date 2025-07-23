import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { runSql } from "@/runSql";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { DatePickerSingle } from "@/components/date-picker-single";

// You can copy the DatePickerSingle code below and put it in the same file or import it.

export function ExportSalesDialog() {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<"all" | "between">("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [format, setFormat] = useState<"csv" | "excel" | "json">("csv");
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);

    let sql = `
      SELECT s.id, s.total_price, s.created_at, u.name AS cashier
      FROM sales s
      LEFT JOIN users u ON s.sold_by = u.id
    `;
    if (range === "between" && startDate && endDate) {
      const s = startDate.toISOString().slice(0, 10);
      const e = endDate.toISOString().slice(0, 10);
      sql += ` WHERE date(s.created_at) >= '${s}' AND date(s.created_at) <= '${e}'`;
    }
    sql += " ORDER BY s.created_at DESC";

    const res: any = await runSql(sql);
    const rows = res.rows || [];

    if (format === "csv") {
      const csv = toCSV(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      saveAs(blob, `sales_export_${Date.now()}.csv`);
    } else if (format === "excel") {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sales");
      const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      saveAs(new Blob([wbout], { type: "application/octet-stream" }), `sales_export_${Date.now()}.xlsx`);
    } else if (format === "json") {
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
      saveAs(blob, `sales_export_${Date.now()}.json`);
    }
    setLoading(false);
    setOpen(false);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Export Sales</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Sales Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label>
                <input
                  type="radio"
                  name="range"
                  checked={range === "all"}
                  onChange={() => setRange("all")}
                  className="mr-2"
                />
                Export all
              </label>
              <label className="ml-8">
                <input
                  type="radio"
                  name="range"
                  checked={range === "between"}
                  onChange={() => setRange("between")}
                  className="mr-2"
                />
                Between dates
              </label>
            </div>
            {range === "between" && (
              <div className="flex gap-4">
                <div>
                  <div className="mb-1">Start date</div>
                  <DatePickerSingle date={startDate} setDate={setStartDate} />
                </div>
                <div>
                  <div className="mb-1">End date</div>
                  <DatePickerSingle date={endDate} setDate={setEndDate} />
                </div>
              </div>
            )}
            <div>
              <div className="mb-1">Export format</div>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="border rounded px-2 py-1"
              >
                <option value="csv">CSV</option>
                <option value="excel">Excel (.xlsx)</option>
                <option value="json">JSON</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleExport} disabled={loading}>
              {loading ? "Exporting..." : "Export"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// CSV helper
function toCSV(rows: any[]) {
  if (!rows || rows.length === 0) return "";
  const keys = Object.keys(rows[0]);
  const escape = (v: any) =>
    typeof v === "string" && (v.includes(",") || v.includes('"') || v.includes("\n"))
      ? `"${v.replace(/"/g, '""')}"`
      : v;
  return [
    keys.join(","),
    ...rows.map((row) => keys.map((k) => escape(row[k])).join(","))
  ].join("\n");
}
