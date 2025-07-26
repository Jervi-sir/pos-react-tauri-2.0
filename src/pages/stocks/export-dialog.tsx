import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { runSql } from "@/runSql";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

type ExportDialogProps = {
  buildQuery: (range: "all" | "between", startDate: string, endDate: string) => string;
  filePrefix: string;
  excludeFields?: string[];
  buttonLabel?: string;
  dialogTitle?: string;
  exportTransform?: (rows: any[]) => any[];
};

export function ExportDialog({
  buildQuery,
  filePrefix,
  excludeFields = [],
  buttonLabel = "Export",
  dialogTitle = "Export Data",
  exportTransform,
}: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<"all" | "between">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [format, setFormat] = useState<"csv" | "excel" | "json">("csv");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res: any = await runSql("SELECT id, name FROM categories ORDER BY name");
        setCategories(res.rows || []);
      } catch (e: any) {
        setError(e?.message ?? "Failed to fetch categories");
      }
    };
    fetchCategories();
  }, []);

  function isValidRange() {
    if (range === "all") return true;
    if (!startDate || !endDate) return false;
    return startDate <= endDate;
  }

  const handleExport = async () => {
    setError("");
    if (range === "between") {
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
      let sql = buildQuery(range, startDate, endDate);
      if (categoryId !== "all") {
        const whereClause = `WHERE p.category_id = ${Number(categoryId)}`;
        sql = sql.replace("WHERE", `${whereClause} AND`).replace("ORDER BY", `WHERE ${whereClause} ORDER BY`);
      }

      const res: any = await runSql(sql);
      let rows = res.rows || [];

      if (excludeFields.length) {
        rows = rows.map((row: any) => {
          const copy = { ...row };
          excludeFields.forEach((f) => delete copy[f]);
          return copy;
        });
      }

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
    } catch (e: any) {
      setError(e?.message ?? "Failed to export data");
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
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="date-input border rounded px-2 py-1 w-40"
                    max={endDate || undefined}
                  />
                </div>
                <div>
                  <div className="mb-1">End date</div>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="date-input border rounded px-2 py-1 w-40"
                    min={startDate || undefined}
                  />
                </div>
              </div>
            )}
            <div>
              <div className="mb-1">Category</div>
              <Select
                value={categoryId}
                onValueChange={setCategoryId}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1">Export format</div>
              <Select
                value={format}
                onValueChange={(v) => setFormat(v as any)}
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
              disabled={loading || (range === "between" && !isValidRange())}
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