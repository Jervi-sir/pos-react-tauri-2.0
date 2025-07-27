// src/components/AlertDestructive.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { runSql } from "@/runSql";
import { toast } from "sonner";
import { routes } from "@/main";

export function DetectZeroPriceProducts() {
  const [hasZeroPriceProducts, setHasZeroPriceProducts] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check for products with current_price_unit = 0
  const checkZeroPriceProducts = async () => {
    try {
      setLoading(true);
      const query = `
        SELECT COUNT(*) as count
        FROM products
        WHERE current_price_unit = 0
      `;
      const result = await runSql(query);
      //@ts-ignore
      const count = result[0]?.count || 0;
      setHasZeroPriceProducts(count > 0);
    } catch (err) {
      console.error("Error checking zero price products:", err);
      toast.error(`Failed to check products: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkZeroPriceProducts();
  }, []);

  if (loading || !hasZeroPriceProducts) {
    return null; // Don't show alert while loading or if no zero-price products
  }

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Warning</AlertTitle>
      <AlertDescription>
        There are products with a price of 0. Please{" "}
        <div className="flex gap-2 items-center">
        <Link
          to={routes.ZeroPriceProducts}
          className="underline text-red-400 hover:text-red-800"
        >
          update their prices
        </Link>{" "}
        to ensure accurate sales and inventory tracking.
        </div>
      </AlertDescription>
    </Alert>
  );
}