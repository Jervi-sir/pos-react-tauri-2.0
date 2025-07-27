"use client"

import { useEffect, useState } from "react"
import { Pie, PieChart } from "recharts"
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
import { runSql } from "@/runSql"
import { toast } from "sonner"

type ChartData = {
  category: string
  total: number
  fill: string // Added for dynamic colors
}

const chartConfig = {
  total: { label: "Sales" },
} satisfies ChartConfig

export function SalesByCategoryPieChart() {
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Function to generate random color
  const generateRandomColor = () => {
    const letters = "0123456789ABCDEF"
    let color = "#"
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)]
    }
    return color
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const query = `
          SELECT pc.name as category, SUM(sp.total_price) as total
          FROM sold_products sp
          JOIN products p ON sp.product_id = p.id
          JOIN product_categories pc ON p.category_id = pc.id
          JOIN invoices i ON sp.invoice_id = i.id
          WHERE i.invoice_type = 'sold'
          GROUP BY pc.id
          ORDER BY total DESC
        `
        const res = await runSql(query)
        // Map results and assign random colors
      //@ts-ignore
        const formattedData: ChartData[] = res.map((item: any) => ({
          category: item.category,
          total: parseFloat(item.total) || 0,
          fill: generateRandomColor(),
        }))
        setChartData(formattedData)
      } catch (err) {
        console.error("Error fetching sales by category:", err)
        setError("Failed to load sales by category.")
        toast.error(`Failed to load sales by category: ${(err as Error).message}`)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Sales by Category</CardTitle>
        <CardDescription>Revenue share by category</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {!loading && !error && (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[250px] pb-0"
          >
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, name) => [
                      `DA ${Number(value).toFixed(2)} `,
                      name,
                    ]}
                  />
                }
              />
              <Pie
                data={chartData}
                dataKey="total"
                nameKey="category"
                label={({ category, total }) => `${category}: DA${total.toFixed(2)}`}
                fill="fill"
              />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          Sales distribution by category
        </div>
      </CardFooter>
    </Card>
  )
}