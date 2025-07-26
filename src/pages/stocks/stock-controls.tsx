import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Product, useStock } from "./stock-provider";
import { DialogNewProduct } from "./dialog-new-product";

export const sortOptions = [
  { value: "name ASC", label: "Name (A-Z)" },
  { value: "name DESC", label: "Name (Z-A)" },
  { value: "price_unit ASC", label: "Price (Low to High)" },
  { value: "price_unit DESC", label: "Price (High to Low)" },
  { value: "stock_left DESC", label: "Stock (High to Low)" },
  { value: "stock_left ASC", label: "Stock (Low to High)" },
  { value: "created_at DESC", label: "Newest" },
  { value: "created_at ASC", label: "Oldest" },
];

export const StockControls: React.FC = () => {
  const { categories, actionLoading, refreshProducts } = useStock();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState(sortOptions[0].value);
  const [openProductDialog, setOpenProductDialog] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const openDialog = () => {
    setEditProduct(null);
    setOpenProductDialog(true);
  };

  useEffect(() => {
    refreshProducts();
  }, [search, filterCategory, sortBy]);

  return (
    <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
      <h2 className="text-2xl font-bold">Products</h2>
      <div className="flex gap-4 flex-1 items-center">
        <Input
          placeholder="Search product or barcode"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Categories</SelectLabel>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id.toString()}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Sort</SelectLabel>
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button onClick={openDialog} disabled={actionLoading}>
          New Product
        </Button>
      </div>
      {openProductDialog && (
        <DialogNewProduct
          open={openProductDialog}
          setOpen={setOpenProductDialog}
          editProduct={editProduct}
          setEditProduct={setEditProduct}
        />
      )}
    </div>
  );
};