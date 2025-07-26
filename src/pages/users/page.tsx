import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { runSql } from "@/runSql";
import { PaginationSection } from "@/components/pagination-section";

type User = {
  id: number;
  name: string;
  email: string;
  password: string;
  role: "owner" | "admin" | "cashier";
};

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  // { value: "admin", label: "Admin" },
  { value: "cashier", label: "Cashier" },
];

const PAGE_SIZE = 10; // Number of users per page

export default function UsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1); // Pagination state
  const [totalCount, setTotalCount] = useState(0); // Total number of users
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState<"owner" | "admin" | "cashier">("cashier");
  const [error, setError] = useState<string | null>(null);

  // Fetch users with pagination
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * PAGE_SIZE;

      // Fetch paginated users
      const res: any = await runSql(`
        SELECT id, name, email, role, password FROM users 
        WHERE role != 'admin'  AND role != 'jervi'
        ORDER BY id DESC
        LIMIT ${PAGE_SIZE} OFFSET ${offset}
      `);
      setUsers(res || []);

      // Fetch total count for pagination
      const countRes: any = await runSql(`
        SELECT COUNT(*) as cnt FROM users WHERE role != 'admin'
      `);
      setTotalCount(countRes?.[0]?.cnt || 0);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage]); // Refetch when page changes

  // Open dialog for create/edit
  const openDialog = (user?: User) => {
    setEditId(user?.id ?? null);
    setUserName(user?.name ?? "");
    setUserEmail(user?.email ?? "");
    setUserPassword(user?.password ?? "");
    setUserRole(user?.role ?? "cashier");
    setOpen(true);
    setError(null);
  };

  // Create or edit user
  const handleSave = async () => {
    if (!userName.trim() || !userEmail.trim() || (!editId && !userPassword.trim()) || !userRole) {
      setError("All fields are required");
      return;
    }
    try {
      if (editId) {
        await runSql(`
          UPDATE users SET 
            name = '${userName.replace(/'/g, "''")}', 
            email = '${userEmail.replace(/'/g, "''")}',
            ${userPassword ? `password = '${userPassword.replace(/'/g, "''")}',` : ""}
            role = '${userRole}',
            updated_at = '${new Date().toISOString()}'
          WHERE id = ${editId}
        `);
      } else {
        // Passwords should be hashed in production!
        await runSql(`
          INSERT INTO users (name, email, password, role, created_at, updated_at)
          VALUES (
            '${userName.replace(/'/g, "''")}',
            '${userEmail.replace(/'/g, "''")}',
            '${userPassword.replace(/'/g, "''")}',
            '${userRole}',
            '${new Date().toISOString()}',
            '${new Date().toISOString()}'
          )
        `);
      }
      setOpen(false);
      setUserName("");
      setUserEmail("");
      setUserPassword("");
      setUserRole("cashier");
      setEditId(null);
      setError(null);
      setCurrentPage(1); // Reset to first page after save
      await fetchUsers();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  };

  // Delete user
  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await runSql(`DELETE FROM users WHERE id = ${id}`);
      setCurrentPage(1); // Reset to first page after delete
      await fetchUsers();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  };

  const pageCount = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <>
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Users</h2>
        <Button onClick={() => openDialog()} size={'sm'}>New User</Button>
      </div>
      {/* {loading && <div>Loading...</div>} */}
      {error && <div className="mb-2 text-red-600">{error}</div>}
      <div className="border rounded-xl shadow overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="">
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-6">No users</td>
              </tr>
            )}
            {users.map(user => (
              <tr key={user.id} className="border-t">
                <td className="px-4 py-2">{user.name}</td>
                <td className="px-4 py-2">{user.email}</td>
                <td className="px-4 py-2">
                  <Select
                    value={user.role}
                    onValueChange={async (role: any) => {
                      await runSql(`
                        UPDATE users SET role = '${role}' WHERE id = ${user.id}
                      `);
                      fetchUsers();
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-2 text-center space-x-2">
                  <Button size="sm" variant="outline" onClick={() => openDialog(user)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(user.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {pageCount > 1
        &&
        <PaginationSection
          page={currentPage}
          pageCount={pageCount}
          setPage={setCurrentPage}
          maxPagesToShow={5}
        />
      }
      {/* Dialog for Create/Edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit User" : "New User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={userName}
              onChange={e => setUserName(e.target.value)}
              placeholder="Name"
            />
            <Input
              value={userEmail}
              onChange={e => setUserEmail(e.target.value)}
              placeholder="Email"
              type="email"
            />
            <Input
              value={userPassword}
              onChange={e => setUserPassword(e.target.value)}
              placeholder={editId ? "New Password (optional)" : "Password"}
              type="password"
            />
            <Select
              value={userRole}
              onValueChange={v => setUserRole(v as any)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
    </>
  );
}