import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Edit, Tally5, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockActionsDropdownProps {
  productId: number;
  stockLeft: number;
  openDialog: (prod: { id: number }) => void;
  openStockDialog: (productId: number, stockLeft: number) => void;
  setDeleteProductId: (id: number | null) => void;
  setDeleteDialogOpen: (open: boolean) => void;
  actionLoading: boolean;
}

export const StockActionsDropdown = ({
  productId,
  stockLeft,
  openDialog,
  openStockDialog,
  setDeleteProductId,
  setDeleteDialogOpen,
  actionLoading,
}: StockActionsDropdownProps) => {
  const itemClassName = cn(
    "relative flex cursor-default select-none items-center rounded-sm px-4 py-2 text-sm outline-none transition-colors",
    "hover:bg-neutral-100 dark:hover:bg-neutral-700",
    "text-neutral-700 dark:text-neutral-200",
    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
  );

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-md transition-colors",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-300 dark:focus-visible:ring-neutral-600",
            "disabled:pointer-events-none disabled:opacity-50",
            "border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800",
            "shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-700",
            "text-neutral-500 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300",
            "h-8 w-8"
          )}
          disabled={actionLoading}
        >
          <svg
            className="fill-current"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
          >
            <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM12.5 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM3.5 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
          </svg>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            "z-50 min-w-[12rem] overflow-hidden rounded-md border",
            "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800",
            "py-1 text-neutral-700 dark:text-neutral-200",
            "shadow-xl shadow-black/[.08] dark:shadow-black/[.2]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
            "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          )}
          align="end"
          sideOffset={8}
        >
          <DropdownMenu.Item
            className={itemClassName}
            onClick={() => openDialog({ id: productId })}
            disabled={actionLoading}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={itemClassName}
            onClick={() => openStockDialog(productId, stockLeft)}
            disabled={actionLoading}
          >
            <Tally5 className="mr-2 h-4 w-4" />
            Adjust Stock
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={cn(itemClassName, "text-red-600 dark:text-red-400 hover:!text-red-600 dark:hover:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20")}
            onClick={() => {
              setDeleteProductId(productId);
              setDeleteDialogOpen(true);
            }}
            disabled={actionLoading}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};