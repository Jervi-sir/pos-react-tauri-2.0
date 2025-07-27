import { useEffect, useState } from "react"
import { TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

type ChartData = {
  date: string
  revenue: number
  original_cost: number
  profit: number
}

const chartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  original_cost: { label: "Original Cost", color: "var(--chart-2)" },
  profit: { label: "Profit", color: "var(--chart-3)" },
} satisfies ChartConfig

export function SalesAreaChart() {
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  //@ts-ignore
  const sanitizeNumber = (value: number) => {
    const num = Number(value)
    if (isNaN(num) || !Number.isFinite(num) || num < 0) {
      throw new Error("Invalid number input")
    }
    return num
  }

  const fetchData = async (date: Date) => {
    setLoading(true)
    setError(null)
    try {
      const year = date.getFullYear()
      const month = date.getMonth() + 1 // JavaScript months are 0-based
      const startDate = `${year}-${month.toString().padStart(2, "0")}-01`
      const endDate = new Date(year, month, 0).toISOString().split("T")[0] // Last day of the month

      const query = `
        SELECT 
          substr(i.created_at, 1, 10) as date,
          SUM(i.total_price) as revenue,
          SUM(i.total_original_bought_price) as original_cost,
          SUM(i.total_price - i.total_original_bought_price) as profit
        FROM invoices i
        WHERE i.invoice_type = 'sold'
        AND i.created_at BETWEEN '${startDate}' AND '${endDate} 23:59:59'
        GROUP BY date
        ORDER BY date ASC
      `
      const res = await runSql(query)
      // @ts-ignore
      const formattedData: ChartData[] = res.map((item: any) => ({
        date: item.date,
        revenue: parseFloat(item.revenue) || 0,
        original_cost: parseFloat(item.original_cost) || 0,
        profit: parseFloat(item.profit) || 0,
      }))
      setChartData(formattedData)
    } catch (err) {
      console.error("Error fetching sales data:", err)
      setError("Failed to load sales data.")
      toast.error(`Failed to load sales data: ${(err as Error).message}`)
    } finally {
      setLoading(false)
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

  useEffect(() => {
    fetchData(currentMonth)
  }, [currentMonth])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Overview</CardTitle>
        <CardDescription>
          Showing revenue, cost, and profit for{" "}
          {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end gap-2 mb-4">
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
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {!loading && !error && (
          <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
            <AreaChart
              data={chartData}
              margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
                    indicator="line"
                    labelFormatter={(val) => new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    formatter={(value, name) => [
                      `DA${Number(value).toFixed(2)}`,
                      chartConfig[name as keyof typeof chartConfig]?.label || name,
                    ]}
                  />
                }
              />
              <Area
                dataKey="revenue"
                type="natural"
                fill={chartConfig.revenue.color}
                fillOpacity={0.3}
                stroke={chartConfig.revenue.color}
                stackId="1"
              />
              <Area
                dataKey="original_cost"
                type="natural"
                fill={chartConfig.original_cost.color}
                fillOpacity={0.3}
                stroke={chartConfig.original_cost.color}
                stackId="1"
              />
              <Area
                dataKey="profit"
                type="natural"
                fill={chartConfig.profit.color}
                fillOpacity={0.3}
                stroke={chartConfig.profit.color}
                stackId="1"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 font-medium">
              Trending up <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground">
              {chartData[0]?.date ? new Date(chartData[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""} - 
              {chartData[chartData.length - 1]?.date ? new Date(chartData[chartData.length - 1].date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}