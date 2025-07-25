import { Button } from "@/components/ui/button"; // Assuming you're using a Button component from a UI library like shadcn
import { Dispatch, SetStateAction } from "react";

interface PaginationProps {
  page: number;
  pageCount: number;
  setPage: Dispatch<SetStateAction<number>>;
  maxPagesToShow?: number; // Optional prop to control how many page buttons to display
}

export const PaginationSection = ({
  page,
  pageCount,
  setPage,
  maxPagesToShow = 5, // Default to showing up to 5 page numbers
}: PaginationProps) => {
  // Don't render pagination if there's only one page
  if (pageCount <= 1) return null;

  // Calculate the range of pages to display
  const getPageRange = () => {
    const delta = Math.floor(maxPagesToShow / 2); // Pages to show on each side of current page
    let start = Math.max(1, page - delta);
    let end = Math.min(pageCount, page + delta);

    // Adjust start and end to ensure we show `maxPagesToShow` pages when possible
    if (end - start + 1 < maxPagesToShow) {
      if (page < pageCount / 2) {
        end = Math.min(pageCount, start + maxPagesToShow - 1);
      } else {
        start = Math.max(1, end - maxPagesToShow + 1);
      }
    }

    const pages: (number | string)[] = [];

    // Always include the first page
    pages.push(1);

    // Add ellipsis if there's a gap between first page and start
    if (start > 2) {
      pages.push("...");
    }

    // Add pages in the calculated range
    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== pageCount) {
        pages.push(i);
      }
    }

    // Add ellipsis if there's a gap between end and last page
    if (end < pageCount - 1) {
      pages.push("...");
    }

    // Always include the last page if not already included
    if (end < pageCount) {
      pages.push(pageCount);
    }

    return pages;
  };

  return (
    <div className="flex gap-2 justify-center my-4">
      {/* Previous Button */}
      <Button
        size="sm"
        disabled={page === 1}
        onClick={() => setPage((p) => p - 1)}
      >
        Prev
      </Button>

      {/* Page Numbers */}
      {getPageRange().map((pageNum, index) => (
        <Button
          key={index}
          size="sm"
          variant={pageNum === page ? "default" : "outline"}
          disabled={pageNum === "..."}
          onClick={() =>
            typeof pageNum === "number" && setPage(pageNum)
          }
        >
          {pageNum}
        </Button>
      ))}

      {/* Next Button */}
      <Button
        size="sm"
        disabled={page === pageCount}
        onClick={() => setPage((p) => p + 1)}
      >
        Next
      </Button>
    </div>
  );
};