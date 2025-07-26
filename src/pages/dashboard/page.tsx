import { LowStockProduct } from "./low-stock-detector";
import { SalesAreaChart } from "./sales-area-chart";
import { SalesByCategoryPieChart } from "./sales-by-category-pie-chart";
import { SummaryCards } from "./summary-cards";
import { TopProductsBarChart } from "./top-products-bar-chart";

const DashboardPage = () => {
  return (
    <div className="container mx-auto py-10">
      <h2 className="text-2xl font-bold mb-6">Analytics</h2>
      <SummaryCards />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SalesAreaChart />
        <TopProductsBarChart />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <SalesByCategoryPieChart />
        <LowStockProduct />
      </div>
    </div>
  );
};

export default DashboardPage;