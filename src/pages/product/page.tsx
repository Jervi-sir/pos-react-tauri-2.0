import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { runSql } from "@/runSql"
import { useDebounce } from "use-debounce"
import { toast } from "sonner"
import { routes } from "@/main"
import { ExportInventoryHistoryDialog } from "./export-inventory-history"
import { PaginationSection } from "@/components/pagination-section"
import { useImagePath } from "@/context/document-path-context"

type Product = {
  id: number
  name: string
  barcode: string | null
  current_price_unit: number | null
  original_bought_price: number | null
  quantity: number
  image_path: string | null
  category_id: number
  category_name: string
  created_at: string
  updated_at: string
}

type HistoryEntry = {
  id: number
  product_id: number
  invoice_id: number | null
  quantity: number
  purchase_price: number | null
  original_bought_price: number | null
  entry_type: string
  created_at: string
}

type SearchResult = {
  id: number
  name: string
  barcode: string | null
  image_path: string | null
  category_name: string | null
  current_price_unit: number | null
  original_bought_price: number | null
  quantity: number
}

export default function SingleProductPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const [itemsPerPage] = useState(10)

  const sanitizeNumber = (value: number) => {
    const num = Number(value)
    if (isNaN(num) || !Number.isFinite(num) || num < 0) {
      throw new Error("Invalid number input")
    }
    return num
  }

  const fetchProductDetails = async (productId: string, currentPage: number = 1) => {
    try {
      setLoading(true)
      setError(null)

      const parsedId = parseInt(productId, 10)
      if (isNaN(parsedId)) {
        throw new Error("Invalid product ID")
      }

      // Fetch product
      const productQuery = `
        SELECT p.*, pc.name as category_name
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        WHERE p.id = ${sanitizeNumber(parsedId)}
      `
      const productResult = await runSql(productQuery)
      // @ts-ignore
      if (!productResult.length) {
        setError("Product not found")
        setProduct(null)
        setHistoryEntries([])
        setPageCount(1)
        return
      }
      // @ts-ignore
      setProduct(productResult[0] as Product)

      // Fetch total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM history_product_entries
        WHERE product_id = ${sanitizeNumber(parsedId)}
      `
      const countResult = await runSql(countQuery)
      // @ts-ignore
      const totalItems = countResult[0]?.total || 0
      setPageCount(Math.ceil(totalItems / itemsPerPage))

      // Fetch history entries for current page
      const offset = (currentPage - 1) * itemsPerPage
      const historyQuery = `
        SELECT *
        FROM history_product_entries
        WHERE product_id = ${sanitizeNumber(parsedId)}
        ORDER BY created_at DESC
        LIMIT ${sanitizeNumber(itemsPerPage)} OFFSET ${sanitizeNumber(offset)}
      `
      const historyResult = await runSql(historyQuery)
      setHistoryEntries(historyResult as HistoryEntry[])
    } catch (err) {
      console.error("Error fetching product details:", err)
      setError(`Failed to fetch product details: ${(err as Error).message}`)
      toast.error(`Failed to fetch product details: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchSearchResults = async (query: string) => {
    if (!query) {
      setSearchResults([])
      return
    }
    try {
      const escapedSearch = query.replace(/'/g, "''")
      const searchQuery = `
        SELECT p.*, pc.name as category_name
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        WHERE p.name LIKE '%${escapedSearch}%' OR p.barcode LIKE '%${escapedSearch}%'
        LIMIT 10
      `
      const results = await runSql(searchQuery)
      setSearchResults(results as SearchResult[])
    } catch (err) {
      console.error("Error fetching search results:", err)
      setError(`Failed to fetch search results: ${(err as Error).message}`)
      toast.error(`Failed to fetch search results: ${(err as Error).message}`)
    }
  }

  useEffect(() => {
    if (id) {
      fetchProductDetails(id, page)
    } else {
      setProduct(null)
      setHistoryEntries([])
      setPage(1)
      setPageCount(1)
    }
  }, [id, page])

  useEffect(() => {
    fetchSearchResults(debouncedSearchQuery)
  }, [debouncedSearchQuery])

  const handleSelectProduct = (productId: number) => {
    setSearchQuery("")
    setSearchResults([])
    setPage(1)
    navigate(routes.productId + productId)
  }

  if (error) return <div className="container mx-auto py-10">Error: {error}</div>
  if (loading) return <div className="container mx-auto py-10">Loading...</div>

  return (
    <>
      <h1 className="text-2xl font-bold">Product Details</h1>
      {/* Search Input */}
      <div>
        <Input
          placeholder="Search by name or barcode"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-[400px]"
        />
        {searchResults.length > 0 && (
          <div className="border rounded-md shadow mt-2 max-h-[200px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Orig. Bought</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((result) => (
                  <TableRow
                    key={result.id}
                    onClick={() => handleSelectProduct(result.id)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      {result.image_path ? (
                        <img
                          src={useImagePath(result.image_path)}
                          alt={result.name}
                          className="h-14 w-14 object-cover rounded"
                        />
                      ) : (
                        <div className="h-14 w-14 bg-gray-200 flex items-center justify-center rounded">
                          No Image
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{result.name}</TableCell>
                    <TableCell>{result.barcode || "N/A"}</TableCell>
                    <TableCell>{result.category_name || "N/A"}</TableCell>
                    <TableCell>{result.quantity || "N/A"}</TableCell>
                    <TableCell>DA{(result.current_price_unit ?? 0).toFixed(2)}</TableCell>
                    <TableCell>DA{(result.original_bought_price ?? 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      {/* Product Details */}
      {product ? (
        <div className="grid gap-6">
          <div className="border rounded-md p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              {product.image_path ? (
                <img
                  src={useImagePath(product.image_path)}
                  alt={product.name}
                  className="w-24 h-24 object-cover rounded"
                />
              ) : (
                <div className="w-24 h-24 bg-gray-200 flex items-center justify-center rounded">
                  No Image
                </div>
              )}
              <div className="flex-1">
                <Table>
                  <TableBody>
                    {[
                      { label: "Name", content: product.name || "N/A" },
                      { label: "Barcode", content: product.barcode || "N/A" },
                      { label: "Category", content: product.category_name || "N/A" },
                      { label: "Price", content: `DA${(product.current_price_unit ?? 0).toFixed(2)}` },
                      { label: "Orig. Bought", content: `DA${(product.original_bought_price ?? 0).toFixed(2)}` },
                      { label: "Stock", content: product.quantity },
                      { label: "Created At", content: new Date(product.created_at).toLocaleString() },
                    ].map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.label}</TableCell>
                        <TableCell>{item.content}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          {/* History Entries */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Inventory History</h2>
              {historyEntries.length > 0 && (
                <ExportInventoryHistoryDialog
                  productId={product.id}
                  productName={product.name}
                />
              )}
            </div>
            <div className="border rounded-md shadow overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Purchase Price</TableHead>
                    <TableHead>Orig. Bought</TableHead>
                    <TableHead>Invoice ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyEntries.length > 0 ? (
                    historyEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{new Date(entry.created_at).toLocaleString()}</TableCell>
                        <TableCell>{entry.entry_type}</TableCell>
                        <TableCell>{entry.quantity > 0 ? `+${sanitizeNumber(entry.quantity)}` : sanitizeNumber(entry.quantity)}</TableCell>
                        <TableCell>DA{(entry.purchase_price ?? 0).toFixed(2)}</TableCell>
                        <TableCell>DA{(entry.original_bought_price ?? 0).toFixed(2)}</TableCell>
                        <TableCell>{entry.invoice_id || "N/A"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        No history entries found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Pagination */}
            <PaginationSection
              page={page}
              pageCount={pageCount}
              setPage={setPage}
              maxPagesToShow={5}
            />
          </div>
        </div>
      ) : (
        <p>Please search for a product or provide a product ID.</p>
      )}
    </>
  )
}