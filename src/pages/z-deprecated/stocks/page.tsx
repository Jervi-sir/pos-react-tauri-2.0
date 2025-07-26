import { PaginationSection } from "@/components/pagination-section";
import { StockProvider, useStock } from "./stock-provider";
import { StockControls } from "./stock-controls";
import { StockTable } from "./stock-table";

export default function StockPage() {
  return (
    <StockProvider>
      <Content />
    </StockProvider>
  );
}

function Content() {
  const { page, totalCount, setPage } = useStock();
  const pageCount = Math.ceil(totalCount / 10);

  return (
    <div className="p-4">
      <StockControls />
      <StockTable />
      <PaginationSection
        page={page}
        pageCount={pageCount}
        // @ts-ignore
        setPage={setPage}
        maxPagesToShow={5}
      />
    </div>
  );
}