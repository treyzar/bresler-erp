import { useState } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { useOrgUnitSearch } from "@/api/hooks/useOrgUnits"
import { useDebounce } from "@/hooks/useDebounce"
import apiClient from "@/api/client"

interface OrgUnitComboboxSingleProps {
  mode?: "single"
  value: number | null
  onChange: (value: number | null) => void
  onSelectItem?: (id: number, name: string) => void
}

interface OrgUnitComboboxMultiProps {
  mode: "multi"
  value: number[]
  onChange: (value: number[]) => void
  onSelectItem?: (id: number, name: string) => void
}

type OrgUnitComboboxProps = OrgUnitComboboxSingleProps | OrgUnitComboboxMultiProps

export function OrgUnitCombobox(props: OrgUnitComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const debouncedSearch = useDebounce(searchInput, 300)
  const { data: results = [], isLoading } = useOrgUnitSearch(debouncedSearch)

  const isMulti = props.mode === "multi"

  const selectedIds = isMulti ? props.value : props.value !== null ? [props.value] : []

  const handleSelect = (id: number) => {
    const selected = results.find((r) => r.id === id)
    if (selected && props.onSelectItem) {
      props.onSelectItem(id, selected.name)
    }
    if (isMulti) {
      const current = props.value as number[]
      if (current.includes(id)) {
        props.onChange(current.filter((v) => v !== id))
      } else {
        props.onChange([...current, id])
      }
    } else {
      (props as OrgUnitComboboxSingleProps).onChange(id)
      setOpen(false)
    }
  }

  const handleRemove = (id: number) => {
    if (isMulti) {
      props.onChange((props.value as number[]).filter((v) => v !== id))
    } else {
      (props as OrgUnitComboboxSingleProps).onChange(null)
    }
  }

  // Fetch names for selected IDs that aren't in the current search results
  // (e.g. when the form is first opened with pre-selected values).
  const missingIds = selectedIds.filter((id) => !results.some((r) => r.id === id))
  const { data: missingOrgs = [] } = useQuery({
    queryKey: ["orgunits-by-ids", missingIds.sort().join(",")],
    queryFn: async () => {
      if (missingIds.length === 0) return []
      const { data } = await apiClient.get<{ results: { id: number; name: string }[] }>(
        "/directory/orgunits/",
        { params: { ids: missingIds.join(","), page_size: missingIds.length } },
      )
      return data.results ?? []
    },
    enabled: missingIds.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  const selectedNames = [...results, ...missingOrgs]
    .filter((r) => selectedIds.includes(r.id))
    .reduce<Record<number, string>>((acc, r) => {
      acc[r.id] = r.name
      return acc
    }, {})

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="truncate">
              {selectedIds.length === 0
                ? "Выберите организацию..."
                : isMulti
                  ? `Выбрано: ${selectedIds.length}`
                  : selectedNames[selectedIds[0]] ?? `ID: ${selectedIds[0]}`}
            </span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Поиск организации..."
              value={searchInput}
              onValueChange={setSearchInput}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading
                  ? "Поиск..."
                  : debouncedSearch.length < 2
                    ? "Введите минимум 2 символа"
                    : "Ничего не найдено"}
              </CommandEmpty>
              <CommandGroup>
                {results.map((org) => (
                  <CommandItem
                    key={org.id}
                    value={String(org.id)}
                    onSelect={() => handleSelect(org.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        selectedIds.includes(org.id) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{org.name}</span>
                      {org.full_name && org.full_name !== org.name && (
                        <span className="text-xs text-muted-foreground">{org.full_name}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected badges (multi mode) */}
      {isMulti && selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedIds.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1">
              {selectedNames[id] ?? `ID: ${id}`}
              <button
                type="button"
                onClick={() => handleRemove(id)}
                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
