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
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const offset = (currentPage - 1) * PAGE_SIZE;
  const pageCount = Math.ceil(totalCount / PAGE_SIZE);

  useEffect(() => {
    loadCategories();
  }, [currentPage]);

  async function loadCategories() {
    setLoading(true);

    const query = `
      SELECT pc.id, pc.name, pc.created_at, 
             COUNT(p.id) AS product_count
      FROM product_categories pc
      LEFT JOIN products p ON p.category_id = pc.id
      GROUP BY pc.id
      ORDER BY pc.created_at DESC
      LIMIT ${PAGE_SIZE} OFFSET ${offset};
    `;
    const countQuery = `SELECT COUNT(*) AS total FROM product_categories`;

    try {
      // Pass parameters for LIMIT and OFFSET
      const data = await runSql(query);
      const countRes = await runSql(countQuery);

      // Extract rows from the response
      const rows = data || [];
      const countRows = countRes || [];

      // Validate and set categories
      if (Array.isArray(rows)) {
        setCategories(rows as Category[]);
      } else {
        console.error("Unexpected response format from runSql:", data);
        setCategories([]);
      }

      // Extract total count
      const total = Number(countRows[0]?.total || 0);
      setTotalCount(total);
    } catch (err) {
      console.error("Error loading categories:", err);
      setError("Failed to load categories.");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  function openDialog(cat?: Category) {
    setEditId(cat?.id ?? null);
    setCategoryName(cat?.name ?? "");
    setError(null);
    setOpen(true);
  }

  async function handleSave() {
    if (!categoryName.trim()) {
      setError("Category name is required.");
      return;
    }

    try {
      if (editId) {
        const updateQuery = `
          UPDATE product_categories 
          SET name = '${categoryName}', updated_at = CURRENT_TIMESTAMP 
          WHERE id = ${editId};
        `;
        await runSql(updateQuery);
      } else {
        const insertQuery = `
          INSERT INTO product_categories (name, created_at, updated_at) 
          VALUES ('${categoryName}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        `;
        await runSql(insertQuery);
      }

      setOpen(false);
      await loadCategories();
    } catch (err) {
      console.error("Error saving category:", err);
      setError("Failed to save category.");
    }
  }

  async function handleDelete(id: number) {
    try {
      const deleteQuery = `DELETE FROM product_categories WHERE id = ${id}`;
      await runSql(deleteQuery);
      await loadCategories();
    } catch (err) {
      console.error("Error deleting category:", err);
      setError("Failed to delete category.");
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Categories</h2>
        <Button onClick={() => openDialog()}>New Category</Button>
      </div>

      {error && (
        <div className="mb-2 text-red-600">
          {error}
        </div>
      )}

      <div className="border rounded-lg shadow overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-center">Products</th>
              <th className="px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories?.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-6">No categories</td>
              </tr>
            )}
            {categories?.map(cat => (
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
            <Button onClick={handleSave}>
              {editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}