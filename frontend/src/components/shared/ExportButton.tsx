import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthStore } from "@/stores/useAuthStore"

interface ExportButtonProps {
  /** Base API endpoint, e.g. "/api/orders" */
  endpoint: string
  /** Current search/filter params to pass through */
  params?: Record<string, string | number | undefined>
}

/**
 * Export button with dropdown for CSV/Excel.
 * Downloads the file by constructing a URL with current filters + auth token.
 */
export function ExportButton({ endpoint, params = {} }: ExportButtonProps) {
  const token = useAuthStore((s) => s.accessToken)

  const handleExport = (format: "xlsx" | "csv") => {
    const url = new URL(`${endpoint}/export/`, window.location.origin)
    url.searchParams.set("export_format", format)

    // Pass through current filters
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value))
      }
    }

    // Download via fetch with auth header (can't use simple <a> with JWT)
    fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Export failed")
        return res.blob()
      })
      .then((blob) => {
        const a = document.createElement("a")
        a.href = URL.createObjectURL(blob)

        // Extract filename from Content-Disposition or use default
        const ext = format === "csv" ? "csv" : "xlsx"
        a.download = `export.${ext}`
        a.click()
        URL.revokeObjectURL(a.href)
      })
      .catch((err) => {
        console.error("Export error:", err)
      })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="size-4 mr-2" />
          Экспорт
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("xlsx")}>
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          CSV (.csv)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
