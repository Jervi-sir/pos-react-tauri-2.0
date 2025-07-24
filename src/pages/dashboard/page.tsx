import { LowStockProduct } from "./low-stock-detector";
import { SalesAreaChart } from "./sales-area-chart";
import { SalesByCategoryPieChart } from "./sales-by-category-pie-chart";
import { SummaryCards } from "./summary-cards";
import { TopProductsBarChart } from "./top-products-bar-chart";

const DashboardPage = () => {

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Analytics</h2>
      <SummaryCards />
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Sales Trend Line Chart */}
        <SalesAreaChart />
        {/* Top Products Bar Chart */}
        <TopProductsBarChart />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        {/* Category Pie Chart */}
        <SalesByCategoryPieChart />
        {/* Low Stock Table */}
        <LowStockProduct />
      </div>
    </div>
  );
};

export default DashboardPage;