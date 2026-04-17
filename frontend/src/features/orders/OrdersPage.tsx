import { useState } from "react"
import { useNavigate } from "react-router"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { Plus, Search, X, Sparkles, Filter, RotateCcw, Hash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DataTable } from "@/components/shared/DataTable"
import { ExportButton } from "@/components/shared/ExportButton"
import { OrgUnitCombobox } from "@/components/shared/OrgUnitCombobox"
import { SearchableSelect } from "@/components/shared/SearchableSelect"
import type { ListParams, OrderListItem } from "@/api/types"
import { ORDER_STATUSES } from "@/api/types"
import { useOrderList, useOrderFuzzySearch, useMissingOrderNumbers } from "@/api/hooks/useOrders"
import { useDebounce } from "@/hooks/useDebounce"
import { countryHooks } from "@/api/hooks/useCountries"
import { equipmentHooks } from "@/api/hooks/useEquipment"
import { worksHooks } from "@/api/hooks/useWorks"

const DEFAULT_PAGE_SIZE = 20

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  N: "outline",
  D: "secondary",
  P: "default",
  C: "secondary",
  S: "default",
  A: "outline",
}

const LABEL_CLASS = "text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block pl-1"

export function OrdersPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({})
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [missingOpen, setMissingOpen] = useState(false)

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [customerFilter, setCustomerFilter] = useState<number | null>(null)
  const [countryFilter, setCountryFilter] = useState<string>("")
  const [branchFilter, setBranchFilter] = useState<number | null>(null)
  const [divisionFilter, setDivisionFilter] = useState<number | null>(null)
  const [facilityFilter, setFacilityFilter] = useState<number | null>(null)
  const [equipmentFilter, setEquipmentFilter] = useState<string>("")
  const [workFilter, setWorkFilter] = useState<string>("")
  const [tenderFilter, setTenderFilter] = useState("")
  const debouncedTender = useDebounce(tenderFilter, 300)
  const [participantFilter, setParticipantFilter] = useState<number | null>(null)
  const [shipDateFrom, setShipDateFrom] = useState("")
  const [shipDateTo, setShipDateTo] = useState("")

  // Reference data for filter selects
  const { data: countriesData } = countryHooks.useList({ page_size: 200 })
  const { data: equipmentData } = equipmentHooks.useList({ page_size: 200 })
  const { data: worksData } = worksHooks.useList({ page_size: 200 })

  const countries = countriesData?.results ?? []
  const equipments = equipmentData?.results ?? []
  const works = worksData?.results ?? []

  const listParams: ListParams = { page, page_size: pageSize }
  if (debouncedSearch) listParams.search = debouncedSearch
  if (statusFilter && statusFilter !== "all") listParams.status = statusFilter
  if (customerFilter) listParams.customer = customerFilter
  if (countryFilter && countryFilter !== "all") listParams.country = Number(countryFilter)
  if (branchFilter) listParams.branch = branchFilter
  if (divisionFilter) listParams.division = divisionFilter
  if (facilityFilter) listParams.facility = facilityFilter
  if (equipmentFilter && equipmentFilter !== "all") listParams.equipment = Number(equipmentFilter)
  if (workFilter && workFilter !== "all") listParams.work = Number(workFilter)
  if (debouncedTender) listParams.tender_number = debouncedTender
  if (participantFilter) listParams.participant = participantFilter
  if (shipDateFrom) listParams.ship_date_from = shipDateFrom
  if (shipDateTo) listParams.ship_date_to = shipDateTo

  const { data, isLoading } = useOrderList(listParams)
  const { data: suggestions } = useOrderFuzzySearch(data?.count === 0 && debouncedSearch ? debouncedSearch : "")
  const { data: missingData, isLoading: missingLoading } = useMissingOrderNumbers(missingOpen)

  const hasActiveFilters = (statusFilter !== "all") || !!customerFilter ||
    (!!countryFilter && countryFilter !== "all") ||
    !!branchFilter || !!divisionFilter || !!facilityFilter ||
    (!!equipmentFilter && equipmentFilter !== "all") ||
    (!!workFilter && workFilter !== "all") ||
    !!tenderFilter || !!participantFilter || !!shipDateFrom || !!shipDateTo

  const resetFilters = () => {
    setStatusFilter("all")
    setCustomerFilter(null)
    setCountryFilter("")
    setBranchFilter(null)
    setDivisionFilter(null)
    setFacilityFilter(null)
    setEquipmentFilter("")
    setWorkFilter("")
    setTenderFilter("")
    setParticipantFilter(null)
    setShipDateFrom("")
    setShipDateTo("")
    setPage(1)
  }

  const handleSuggestionClick = (tender: string) => {
    setSearch(tender)
    setPage(1)
  }

  const columns: ColumnDef<OrderListItem, unknown>[] = [
    {
      accessorKey: "order_number",
      header: "№",
      size: 70,
      cell: ({ row }) => <span className="font-bold">{row.original.order_number}</span>,
    },
    {
      accessorKey: "country_name",
      header: "Страна",
      size: 100,
    },
    {
      accessorKey: "customer_name",
      header: "Заказчик",
      size: 180,
    },
    {
      accessorKey: "branch_name",
      header: "Филиал",
      size: 180,
    },
    {
      accessorKey: "division_name",
      header: "Пр. отделение",
      size: 180,
    },
    {
      accessorKey: "facility_names",
      header: "Объект",
      size: 180,
      cell: ({ row }) => (
        <span className="break-words" title={row.original.facility_names}>
          {row.original.facility_names}
        </span>
      ),
    },
    {
      accessorKey: "equipment_names",
      header: "Оборудование",
      size: 180,
      cell: ({ row }) => (
        <span className="break-words" title={row.original.equipment_names}>
          {row.original.equipment_names}
        </span>
      ),
    },
    {
      accessorKey: "work_names",
      header: "Работы",
      size: 150,
      cell: ({ row }) => (
        <span className="break-words" title={row.original.work_names}>
          {row.original.work_names}
        </span>
      ),
    },
    {
      accessorKey: "tender_number",
      header: "№ тендера",
      size: 120,
    },
    {
      accessorKey: "participant_names",
      header: "Участник запроса",
      size: 180,
      cell: ({ row }) => (
        <span className="break-words" title={row.original.participant_names}>
          {row.original.participant_names}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Статус",
      size: 150,
      cell: ({ row }) => (
        <div className="overflow-hidden">
          <Badge variant={statusVariant[row.original.status] ?? "outline"} className="whitespace-nowrap">
            {row.original.status_display}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "ship_date",
      header: "Отгрузка",
      size: 110,
      cell: ({ row }) => row.original.ship_date ? new Date(row.original.ship_date).toLocaleDateString("ru") : "—",
    },
  ]

  return (
    <div className="p-6 space-y-4">
      {/* Header: title + search + buttons */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Заказы</h1>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Поиск..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9 pr-9 h-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <ExportButton endpoint="/api/orders" params={listParams} />
          <Button variant="outline" size="sm" onClick={() => setMissingOpen(true)}>
            <Hash className="size-4 mr-1" />
            Пропущенные номера
          </Button>
          <Button size="sm" onClick={() => navigate("/orders/new")}>
            <Plus className="size-4 mr-1" />
            Создать заказ
          </Button>
        </div>
      </div>

      {/* Filters block */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Filter className="size-4" />
              Фильтры
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                  !
                </Badge>
              )}
            </Button>
          </CollapsibleTrigger>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 text-muted-foreground">
              <RotateCcw className="size-3.5" />
              Сбросить
            </Button>
          )}
        </div>

        <CollapsibleContent className="mt-3">
          <div className="flex flex-wrap items-end gap-3 bg-muted/20 p-4 rounded-xl border">
            {/* Status */}
            <div>
              <Label className={LABEL_CLASS}>Статус</Label>
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1) }}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="Все статусы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  {Object.entries(ORDER_STATUSES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Country */}
            <div className="w-[180px]">
              <Label className={LABEL_CLASS}>Страна</Label>
              <SearchableSelect
                options={[
                  { value: "all", label: "Все страны" },
                  ...countries.map((c) => ({ value: String(c.id), label: c.name })),
                ]}
                value={countryFilter || "all"}
                onChange={(val) => { setCountryFilter(val === "all" ? "" : val); setPage(1) }}
                placeholder="Все страны"
                searchPlaceholder="Поиск страны..."
              />
            </div>

            {/* Customer */}
            <div className="w-[200px]">
              <Label className={LABEL_CLASS}>Заказчик</Label>
              <OrgUnitCombobox
                mode="single"
                value={customerFilter}
                onChange={(val) => { setCustomerFilter(val); setPage(1) }}
              />
            </div>

            {/* Branch */}
            <div className="w-[200px]">
              <Label className={LABEL_CLASS}>Филиал</Label>
              <OrgUnitCombobox
                mode="single"
                value={branchFilter}
                onChange={(val) => { setBranchFilter(val); setPage(1) }}
              />
            </div>

            {/* Division */}
            <div className="w-[200px]">
              <Label className={LABEL_CLASS}>Пр. отделение</Label>
              <OrgUnitCombobox
                mode="single"
                value={divisionFilter}
                onChange={(val) => { setDivisionFilter(val); setPage(1) }}
              />
            </div>

            {/* Facility */}
            <div className="w-[200px]">
              <Label className={LABEL_CLASS}>Объект</Label>
              <OrgUnitCombobox
                mode="single"
                value={facilityFilter}
                onChange={(val) => { setFacilityFilter(val); setPage(1) }}
              />
            </div>

            {/* Equipment */}
            <div className="w-[200px]">
              <Label className={LABEL_CLASS}>Оборудование</Label>
              <SearchableSelect
                options={[
                  { value: "all", label: "Все" },
                  ...equipments.map((e) => ({ value: String(e.id), label: e.name })),
                ]}
                value={equipmentFilter || "all"}
                onChange={(val) => { setEquipmentFilter(val === "all" ? "" : val); setPage(1) }}
                placeholder="Все"
                searchPlaceholder="Поиск оборудования..."
              />
            </div>

            {/* Works */}
            <div className="w-[200px]">
              <Label className={LABEL_CLASS}>Работы</Label>
              <SearchableSelect
                options={[
                  { value: "all", label: "Все" },
                  ...works.map((w) => ({ value: String(w.id), label: w.name })),
                ]}
                value={workFilter || "all"}
                onChange={(val) => { setWorkFilter(val === "all" ? "" : val); setPage(1) }}
                placeholder="Все"
                searchPlaceholder="Поиск работ..."
              />
            </div>

            {/* Tender number */}
            <div>
              <Label className={LABEL_CLASS}>№ тендера</Label>
              <Input
                placeholder="Номер тендера..."
                value={tenderFilter}
                onChange={(e) => { setTenderFilter(e.target.value); setPage(1) }}
                className="w-[150px] h-9"
              />
            </div>

            {/* Participant */}
            <div className="w-[200px]">
              <Label className={LABEL_CLASS}>Участник запроса</Label>
              <OrgUnitCombobox
                mode="single"
                value={participantFilter}
                onChange={(val) => { setParticipantFilter(val); setPage(1) }}
              />
            </div>

            {/* Ship date range */}
            <div className="flex gap-2 items-end">
              <div>
                <Label className={LABEL_CLASS}>Отгрузка от</Label>
                <Input
                  type="date"
                  className="w-[140px] h-9"
                  value={shipDateFrom}
                  onChange={(e) => { setShipDateFrom(e.target.value); setPage(1) }}
                />
              </div>
              <div>
                <Label className={LABEL_CLASS}>до</Label>
                <Input
                  type="date"
                  className="w-[140px] h-9"
                  value={shipDateTo}
                  onChange={(e) => { setShipDateTo(e.target.value); setPage(1) }}
                />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Fuzzy search suggestions */}
      {data?.count === 0 && debouncedSearch && suggestions && suggestions.length > 0 && (
        <div className="bg-primary/5 border border-primary/10 p-4 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <Sparkles className="size-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Ничего не найдено по запросу «{debouncedSearch}»</p>
            <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
              <span>Возможно, вы имели в виду:</span>
              {suggestions.map((s, i) => (
                <button
                  key={`${s.order_number}-${i}`}
                  onClick={() => handleSuggestionClick(s.text)}
                  className="text-primary hover:underline font-medium bg-primary/10 px-2 py-0.5 rounded"
                >
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.results ?? []}
        totalCount={data?.count ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={(p) => { setPage(p); setSelectedRows({}) }}
        searchValue={search}
        onSearchChange={setSearch}
        isLoading={isLoading}
        selectedRows={selectedRows}
        onSelectedRowsChange={setSelectedRows}
        enableSelection={false}
        enableSearch={false}
        onRowClick={(row) => navigate(`/orders/${row.order_number}`)}
        getRowHref={(row) => `/orders/${row.order_number}`}
        fixedLayout
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
      />

      {/* Missing numbers dialog */}
      <Dialog open={missingOpen} onOpenChange={setMissingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Пропущенные номера заказов</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {missingLoading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Загрузка...</p>
            ) : missingData && missingData.total > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Всего пропущенных номеров: <span className="font-medium text-foreground">{missingData.total}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {missingData.missing_formatted.map((range) => (
                    <Badge key={range} variant="outline" className="text-sm">
                      {range}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">Пропущенных номеров нет</p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
