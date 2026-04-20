import { useEffect, useState } from "react"
import { Filter, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { SearchableSelect } from "@/components/shared/SearchableSelect"
import { OrgUnitCombobox } from "@/components/shared/OrgUnitCombobox"
import type { FilterMeta } from "@/api/hooks/useFilterMeta"
import apiClient from "@/api/client"

const LABEL_CLASS = "text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block pl-1"

interface AutoFiltersProps {
  filters: FilterMeta[]
  values: Record<string, string>
  onChange: (name: string, value: string) => void
  onReset: () => void
  hasActiveFilters: boolean
  /** If true, filters start expanded */
  defaultOpen?: boolean
}

/**
 * Renders filter controls dynamically based on metadata from /meta/ endpoint.
 *
 * Supports: choice (Select), boolean (Select), text (Input), date (Input[date]),
 * combobox widget (SearchableSelect with data from endpoint or OrgUnitCombobox).
 */
export function AutoFilters({
  filters,
  values,
  onChange,
  onReset,
  hasActiveFilters,
  defaultOpen = false,
}: AutoFiltersProps) {
  const [open, setOpen] = useState(defaultOpen)

  if (!filters.length) return null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter className="size-4" />
            Фильтры
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">!</Badge>
            )}
          </Button>
        </CollapsibleTrigger>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-1 text-muted-foreground">
            <RotateCcw className="size-3.5" />
            Сбросить
          </Button>
        )}
      </div>

      <CollapsibleContent className="mt-3">
        <div className="flex flex-wrap items-end gap-3 bg-muted/20 p-4 rounded-xl border">
          {filters.map((filter) => (
            <FilterField
              key={filter.name}
              filter={filter}
              value={values[filter.name] ?? ""}
              onChange={(val) => onChange(filter.name, val)}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

interface FilterFieldProps {
  filter: FilterMeta
  value: string
  onChange: (value: string) => void
}

function FilterField({ filter, value, onChange }: FilterFieldProps) {
  // Combobox widget with OrgUnit endpoint → use OrgUnitCombobox
  if (filter.widget === "combobox" && filter.endpoint?.includes("/orgunits")) {
    return (
      <div className="w-[200px]">
        <Label className={LABEL_CLASS}>{filter.label}</Label>
        <OrgUnitCombobox
          mode="single"
          value={value ? Number(value) : null}
          onChange={(val) => onChange(val ? String(val) : "")}
        />
      </div>
    )
  }

  // Combobox widget with endpoint → fetch options and use SearchableSelect
  if (filter.widget === "combobox" && filter.endpoint) {
    return (
      <RemoteCombobox filter={filter} value={value} onChange={onChange} />
    )
  }

  // Choice / boolean → Select
  if ((filter.type === "choice" || filter.type === "boolean") && filter.choices) {
    return (
      <div>
        <Label className={LABEL_CLASS}>{filter.label}</Label>
        <Select value={value || "all"} onValueChange={(val) => onChange(val === "all" ? "" : val)}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder={`Все`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            {filter.choices.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  // Date
  if (filter.type === "date") {
    return (
      <div>
        <Label className={LABEL_CLASS}>{filter.label}</Label>
        <Input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-[160px] h-9"
        />
      </div>
    )
  }

  // Text / number → Input
  return (
    <div>
      <Label className={LABEL_CLASS}>{filter.label}</Label>
      <Input
        type={filter.type === "number" ? "number" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={filter.label}
        className="w-[180px] h-9"
      />
    </div>
  )
}

/**
 * Combobox that fetches options from a remote API endpoint.
 * Caches fetched options in local state.
 */
function RemoteCombobox({
  filter,
  value,
  onChange,
}: FilterFieldProps) {
  const [options, setOptions] = useState<{ value: string; label: string }[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (loaded || !filter.endpoint) return
    let cancelled = false

    // Backend meta_extra stores paths like "/api/directory/…" but apiClient
    // already has baseURL "/api" — strip the duplicate prefix.
    const path = filter.endpoint.replace(/^\/api\//, "/")

    apiClient.get(path, { params: { page_size: 200 } }).then((res) => {
      if (cancelled) return
      const results = res.data?.results ?? res.data ?? []
      const opts = results.map((item: { id: number; name: string }) => ({
        value: String(item.id),
        label: item.name,
      }))
      setOptions(opts)
      setLoaded(true)
    }).catch(() => {
      setLoaded(true)
    })

    return () => { cancelled = true }
  }, [filter.endpoint, loaded])

  return (
    <div className="w-[200px]">
      <Label className={LABEL_CLASS}>{filter.label}</Label>
      <SearchableSelect
        options={[{ value: "all", label: "Все" }, ...options]}
        value={value || "all"}
        onChange={(val) => onChange(val === "all" ? "" : val)}
        placeholder="Все"
        searchPlaceholder={`Поиск...`}
      />
    </div>
  )
}
