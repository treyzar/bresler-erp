import { useState } from "react"
import { ChevronRight, FolderOpen, Package, Search } from "lucide-react"
import { toast } from "sonner"
import type { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/shared/DataTable"
import type { Product, ProductCategoryTree, ListParams } from "@/api/types"
import { PRODUCT_CURRENCIES } from "@/api/types"
import {
  useProductCategoryTree,
  useProductsInCategory,
  productHooks,
} from "@/api/hooks/useDevices"
import { useDebounce } from "@/hooks/useDebounce"

const PAGE_SIZE = 50

function CategoryTreeNode({
  node,
  selectedId,
  onSelect,
  depth = 0,
}: {
  node: ProductCategoryTree
  selectedId: number | null
  onSelect: (id: number) => void
  depth?: number
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.children.length > 0
  const isSelected = node.id === selectedId

  return (
    <div>
      <button
        onClick={() => {
          onSelect(node.id)
          if (hasChildren) setExpanded(!expanded)
        }}
        className={`flex w-full items-center gap-1 rounded px-2 py-1.5 text-sm hover:bg-accent ${
          isSelected ? "bg-accent font-medium" : ""
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <ChevronRight
            className={`size-4 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        ) : (
          <span className="w-4" />
        )}
        <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{node.name}</span>
      </button>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function CatalogPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)

  const { data: tree, isLoading: treeLoading } = useProductCategoryTree()

  // Either show products in category or search all
  const categoryParams: ListParams = { page, page_size: PAGE_SIZE }
  const searchParams: ListParams = { page, page_size: PAGE_SIZE, search: debouncedSearch }

  const { data: categoryProducts } = useProductsInCategory(
    debouncedSearch ? null : selectedCategoryId,
    categoryParams,
  )
  const { data: searchResults } = productHooks.useList(
    debouncedSearch ? searchParams : undefined,
    { enabled: !!debouncedSearch },
  )

  const products = debouncedSearch ? searchResults : categoryProducts

  const columns: ColumnDef<Product, unknown>[] = [
    { accessorKey: "internal_code", header: "Артикул", size: 140 },
    { accessorKey: "name", header: "Наименование" },
    { accessorKey: "product_type_name", header: "Тип", size: 160 },
    {
      accessorKey: "base_price",
      header: "Цена",
      size: 130,
      cell: ({ row }) => {
        const p = row.original
        return `${Number(p.base_price).toLocaleString("ru-RU")} ${PRODUCT_CURRENCIES[p.currency] || p.currency}`
      },
    },
    {
      accessorKey: "is_active",
      header: "Статус",
      size: 100,
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge variant="default">Активен</Badge>
        ) : (
          <Badge variant="secondary">Неактивен</Badge>
        ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Package className="size-5" />
        <h1 className="text-2xl font-semibold">Каталог продуктов</h1>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по артикулу или наименованию..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        {/* Category Tree */}
        <Card className="h-fit max-h-[calc(100vh-220px)] overflow-y-auto">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Категории</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {treeLoading ? (
              <p className="p-2 text-sm text-muted-foreground">Загрузка...</p>
            ) : tree?.length ? (
              tree.map((node) => (
                <CategoryTreeNode
                  key={node.id}
                  node={node}
                  selectedId={selectedCategoryId}
                  onSelect={(id) => {
                    setSelectedCategoryId(id)
                    setPage(1)
                    setSearch("")
                  }}
                />
              ))
            ) : (
              <p className="p-2 text-sm text-muted-foreground">Нет категорий</p>
            )}
          </CardContent>
        </Card>

        {/* Products Table */}
        <div>
          {!selectedCategoryId && !debouncedSearch ? (
            <div className="flex h-40 items-center justify-center rounded-md border text-muted-foreground">
              Выберите категорию или воспользуйтесь поиском
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={products?.results ?? []}
              pageCount={products ? Math.ceil(products.count / PAGE_SIZE) : 0}
              pageIndex={page - 1}
              onPageChange={(p) => setPage(p + 1)}
              isLoading={false}
            />
          )}
        </div>
      </div>
    </div>
  )
}
