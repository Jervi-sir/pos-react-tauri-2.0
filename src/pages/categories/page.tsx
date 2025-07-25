import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { runSql } from "@/runSql";
import { PaginationSection } from "@/components/pagination-section";

type Category = {
  id: number;
  name: string;
  created_at: string;
  product_count: number;
};

const PAGE_SIZE = 10;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  // @ts-ignore
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Load categories from DB
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * PAGE_SIZE;
      const res: any = await runSql(`
        SELECT c.id, c.name, c.created_at, COUNT(p.id) as product_count
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id
        GROUP BY c.id, c.name, c.created_at
        ORDER BY c.created_at DESC
        LIMIT ${PAGE_SIZE} OFFSET ${offset}
      `);
      setCategories(res.rows || []);

      // Fetch total count
      const countRes: any = await runSql(`
        SELECT COUNT(*) as cnt FROM categories
      `);
      setTotalCount(countRes.rows?.[0]?.cnt || 0);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [currentPage]);

  // Create or Edit
  const handleSave = async () => {
    if (!categoryName.trim()) {
      setError("Category name required");
      return;
    }
    try {
      if (editId) {
        await runSql(
          `UPDATE categories SET name = '${categoryName.replace(/'/g, "''")}' WHERE id = ${editId}`
        );
      } else {
        // Use current ISO string for created_at
        const now = new Date().toISOString();
        await runSql(
          `INSERT INTO categories (name, created_at) VALUES ('${categoryName.replace(/'/g, "''")}', '${now}')`
        );
      }
      setOpen(false);
      setCategoryName("");
      setEditId(null);
      setError(null);
      setCurrentPage(1); // Reset to first page
      await fetchCategories();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  };

  // Delete
  const handleDelete = async (id: number) => {
    try {
      await runSql(`DELETE FROM categories WHERE id = ${id}`);
      setCurrentPage(1); // Reset to first page
      await fetchCategories();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  };

  // Open dialog for new/edit
  const openDialog = (cat?: Category) => {
    setEditId(cat?.id || null);
    setCategoryName(cat?.name || "");
    setOpen(true);
    setError(null);
  };

  const pageCount = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Categories</h2>
        <Button onClick={() => openDialog()}>New Category</Button>
      </div>
      {/* {loading && <div>Loading...</div>} */}
      {error && (
        <div className="mb-2 text-red-600">
          {error}
        </div>
      )}
      <div className="border rounded-lg shadow overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="">
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-center">Products</th>
              <th className="px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-6">No categories</td>
              </tr>
            )}
            {categories.map(cat => (
              <tr key={cat.id} className="border-t">
                <td className="px-4 py-2">{cat.name}</td>
                <td className="px-4 py-2 text-center">{cat.product_count}</td>
                <td className="px-4 py-2 text-center space-x-2">
                  <Button size="sm" variant="outline" onClick={() => openDialog(cat)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(cat.id)}
                    disabled={cat.product_count > 0}
                    title={cat.product_count > 0 ? "Cannot delete: has products" : ""}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationSection
        page={currentPage}
        pageCount={pageCount}
        setPage={setCurrentPage}
        maxPagesToShow={5}
      />
      {/* Dialog for Create/Edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Category" : "New Category"}
            </DialogTitle>
          </DialogHeader>
          <div>
            <Input
              value={categoryName}
              onChange={e => setCategoryName(e.target.value)}
              placeholder="Category name"
            />
          </div>
          {error && <div className="text-red-600 mt-2">{error}</div>}
          <DialogFooter className="gap-2">
            <Button onClick={() => setOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleSave}>{editId ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}