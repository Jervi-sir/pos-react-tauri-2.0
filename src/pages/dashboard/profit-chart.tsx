import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { runSql } from "@/runSql"
import { toast } from "sonner"

export const description = "A bar chart showing sales statistics"

type ProductStats = {
  name: string
  sold_price: number
  original_price: number
  profit: number
  quantity: number
}

const chartConfig = {
  sold_price: {
    label: "Sold Price",
    color: "var(--chart-1)",
  },
  original_price: {
    label: "Original Price",
    color: "var(--chart-3)",
  },
  profit: {
    label: "Profit",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function SalesStatsChart() {
  const [chartData, setChartData] = React.useState<ProductStats[]>([])
  const [currentMonth, setCurrentMonth] = React.useState(new Date())
  const [totalQuantity, setTotalQuantity] = React.useState(0)

  const fetchSalesData = async (date: Date) => {
    try {
      const year = date.getFullYear()
      const month = date.getMonth() + 1 // JavaScript months are 0-based
      const startDate = `${year}-${month.toString().padStart(2, "0")}-01`
      const endDate = new Date(year, month, 0).toISOString().split("T")[0] // Last day of the month

      const query = `
        SELECT 
          p.name,
          SUM(sp.quantity) as quantity,
          SUM(sp.total_price) as sold_price,
          SUM(sp.total_original_bought_price) as original_price
        FROM sold_products sp
        JOIN products p ON sp.product_id = p.id
        JOIN invoices i ON sp.invoice_id = i.id
        WHERE i.created_at BETWEEN '${startDate}' AND '${endDate} 23:59:59'
        GROUP BY p.id, p.name
        LIMIT 10
      `
      const results = await runSql(query)
      // @ts-ignore
      const data: ProductStats[] = results.map((item: any) => ({
        name: item.name,
        sold_price: parseFloat(item.sold_price) || 0,
        original_price: parseFloat(item.original_price) || 0,
        profit: (parseFloat(item.sold_price) || 0) - (parseFloat(item.original_price) || 0),
        quantity: parseInt(item.quantity) || 0,
      }))
      setChartData(data)
      setTotalQuantity(data.reduce((sum, item) => sum + item.quantity, 0))
    } catch (err) {
      console.error("Error fetching sales data:", err)
      toast.error(`Failed to fetch sales data: ${(err as Error).message}`)
    }
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    if (nextMonth <= new Date()) {
      setCurrentMonth(nextMonth)
    }
  }

  React.useEffect(() => {
    fetchSalesData(currentMonth)
  }, [currentMonth])

  return (
    <Card className="py-0">
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
          <CardTitle>Sales Statistics</CardTitle>
          <CardDescription>
            Showing sales for {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            <br />
            Total Products Sold: {totalQuantity}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 px-6 py-4 sm:py-6">
          <Button variant="outline" onClick={handlePrevMonth}>
            Previous Month
          </Button>
          <Button
            variant="outline"
            onClick={handleNextMonth}
            disabled={currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()}
          >
            Next Month
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => value.slice(0, 10) + (value.length > 10 ? "..." : "")}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `DA${value.toFixed(0)}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[200px]"
                  labelFormatter={(label) => label}
                  formatter={(value, name) => [
                    `DA${Number(value).toFixed(2)}`,
                    chartConfig[name as keyof typeof chartConfig]?.label || name,
                  ]}
                />
              }
            />
            <Legend />
            <Bar dataKey="sold_price" fill={chartConfig.sold_price.color} name={chartConfig.sold_price.label} />
            <Bar dataKey="original_price" fill={chartConfig.original_price.color} name={chartConfig.original_price.label} />
            <Bar dataKey="profit" fill={chartConfig.profit.color} name={chartConfig.profit.label} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}