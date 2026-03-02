import { useState, useMemo } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
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

export interface MultiSelectOption {
  value: number
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: number[]
  onChange: (value: number[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Выберите...",
  searchPlaceholder = "Поиск...",
  emptyMessage = "Ничего не найдено",
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search) return options
    const lower = search.toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(lower))
  }, [options, search])

  const selectedLabels = useMemo(() => {
    const map = new Map(options.map((o) => [o.value, o.label]))
    return value.map((v) => ({ value: v, label: map.get(v) ?? `ID: ${v}` }))
  }, [options, value])

  const handleToggle = (optionValue: number) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  const handleRemove = (optionValue: number) => {
    onChange(value.filter((v) => v !== optionValue))
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            disabled={disabled}
          >
            {value.length === 0
              ? placeholder
              : `Выбрано: ${value.length}`}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {filtered.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={String(option.value)}
                    onSelect={() => handleToggle(option.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        value.includes(option.value) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedLabels.map((item) => (
            <Badge key={item.value} variant="secondary" className="gap-1">
              {item.label}
              <button
                type="button"
                onClick={() => handleRemove(item.value)}
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
