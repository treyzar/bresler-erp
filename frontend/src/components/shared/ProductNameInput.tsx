import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Check, Plus, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import apiClient from "@/api/client"
import type { PaginatedResponse, Product } from "@/api/types"
import { useDebounce } from "@/hooks/useDebounce"

interface ProductNameInputProps {
  value: string
  productId: number | null
  onChange: (name: string, productId: number | null, basePrice?: string) => void
  className?: string
  placeholder?: string
}

/**
 * Autocomplete input for product names.
 * - Type to search existing products
 * - Select from dropdown → fills name + productId + base_price
 * - Type a new name → check for duplicates → create new Product on confirm
 */
export function ProductNameInput({
  value, productId, onChange, className = "", placeholder = "Наименование или код",
}: ProductNameInputProps) {
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [showCreatePrompt, setShowCreatePrompt] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  const debouncedSearch = useDebounce(search, 300)

  const { data: results = [] } = useQuery({
    queryKey: ["product-autocomplete", debouncedSearch],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Product>>(
        "/devices/products/",
        { params: { search: debouncedSearch, page_size: 10, is_active: true } },
      )
      return data.results
    },
    enabled: debouncedSearch.length >= 2 && open,
  })

  // Check for duplicates when user typed a new name
  const { data: duplicates = [] } = useQuery({
    queryKey: ["product-duplicates", value],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Product>>(
        "/devices/products/",
        { params: { search: value, page_size: 5 } },
      )
      return data.results
    },
    enabled: showCreatePrompt && value.length >= 2 && !productId,
  })

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const code = `AUTO-${Date.now()}`
      const { data } = await apiClient.post<Product>("/devices/products/", {
        name,
        internal_code: code,
        is_active: true,
      })
      return data
    },
    onSuccess: (product) => {
      onChange(product.name, product.id, product.base_price)
      setShowCreatePrompt(false)
      qc.invalidateQueries({ queryKey: ["product-autocomplete"] })
      toast.success(`Продукт «${product.name}» создан`)
    },
    onError: () => toast.error("Ошибка создания продукта"),
  })

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleInputChange = (newValue: string) => {
    setSearch(newValue)
    setOpen(true)
    setShowCreatePrompt(false)
    // Clear product link when manually typing
    onChange(newValue, null)
  }

  const handleSelect = (product: Product) => {
    onChange(product.name, product.id, product.base_price)
    setSearch("")
    setOpen(false)
    setShowCreatePrompt(false)
  }

  const handleBlur = () => {
    // Delay to allow click on dropdown
    setTimeout(() => {
      setOpen(false)
      // If user typed something new (no product selected), offer to create
      if (value && value.length >= 2 && !productId) {
        setShowCreatePrompt(true)
      }
    }, 200)
  }

  const handleCreateNew = () => {
    createMutation.mutate(value)
  }

  const handleSelectDuplicate = (product: Product) => {
    onChange(product.name, product.id, product.base_price)
    setShowCreatePrompt(false)
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={open ? search || value : value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => { setSearch(value); setOpen(true) }}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`${className} ${productId ? "pr-8" : ""}`}
        />
        {productId && (
          <Badge variant="outline" className="absolute right-1 text-[8px] pointer-events-none">
            ID
          </Badge>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {open && debouncedSearch.length >= 2 && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-[200px] overflow-auto"
        >
          {results.map((p) => (
            <div
              key={p.id}
              className="px-3 py-1.5 text-xs cursor-pointer hover:bg-muted flex items-center justify-between"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(p) }}
            >
              <div className="min-w-0">
                <span className="font-medium">{p.name}</span>
                <span className="text-muted-foreground ml-2">{p.internal_code}</span>
              </div>
              {Number(p.base_price) > 0 && (
                <span className="text-muted-foreground shrink-0 ml-2">
                  {Number(p.base_price).toLocaleString("ru-RU")} руб.
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create prompt with duplicate check */}
      {showCreatePrompt && !productId && value.length >= 2 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg p-2 space-y-2">
          {duplicates.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle className="size-3" />
                <span>Похожие продукты найдены:</span>
              </div>
              {duplicates.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer hover:bg-muted"
                  onClick={() => handleSelectDuplicate(p)}
                >
                  <span>{p.name} <span className="text-muted-foreground">({p.internal_code})</span></span>
                  <Check className="size-3 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {duplicates.length > 0 ? "Или создать новый:" : "Продукт не найден"}
            </span>
            <Button
              variant="outline" size="sm" className="h-6 text-xs"
              onClick={handleCreateNew}
              disabled={createMutation.isPending}
            >
              <Plus className="size-3 mr-1" />
              {createMutation.isPending ? "Создание..." : `Создать «${value}»`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
