import { LowStockProduct } from "./low-stock-detector";
import { SalesAreaChart } from "./sales-area-chart";
import { SalesByCategoryPieChart } from "./sales-by-category-pie-chart";
import { SummaryCards } from "./summary-cards";
import { TopProductsBarChart } from "./top-products-bar-chart";

const DashboardPage = () => {
  return (
    <>
      <h2 className="text-2xl font-bold">Analytics</h2>
      <SummaryCards />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SalesAreaChart />
        <TopProductsBarChart />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SalesByCategoryPieChart />
        <LowStockProduct />
      </div>
    </>
  );
};

export default DashboardPage;