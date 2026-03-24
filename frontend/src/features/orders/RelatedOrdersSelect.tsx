import { useState } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { useOrderList } from "@/api/hooks/useOrders"
import { useDebounce } from "@/hooks/useDebounce"

interface RelatedOrdersSelectProps {
  value: number[]
  onChange: (value: number[]) => void
  excludeOrderNumber?: number
}

export function RelatedOrdersSelect({ value, onChange, excludeOrderNumber }: RelatedOrdersSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const debouncedSearch = useDebounce(searchInput, 300)

  const { data, isLoading } = useOrderList(
    debouncedSearch
      ? { search: debouncedSearch, page_size: 30 }
      : { page_size: 30 }
  )

  const results = (data?.results ?? []).filter(
    (o) => o.order_number !== excludeOrderNumber
  )

  const handleSelect = (orderNumber: number) => {
    if (value.includes(orderNumber)) {
      onChange(value.filter((v) => v !== orderNumber))
    } else {
      onChange([...value, orderNumber])
    }
  }

  const handleRemove = (orderNumber: number) => {
    onChange(value.filter((v) => v !== orderNumber))
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
          >
            {value.length === 0
              ? "Выберите связанные заказы..."
              : `Выбрано: ${value.length}`}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Поиск по номеру заказа..."
              value={searchInput}
              onValueChange={setSearchInput}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading ? "Поиск..." : "Ничего не найдено"}
              </CommandEmpty>
              <CommandGroup>
                {results.map((order) => (
                  <CommandItem
                    key={order.order_number}
                    value={String(order.order_number)}
                    onSelect={() => handleSelect(order.order_number)}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        value.includes(order.order_number) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="font-medium">#{order.order_number}</span>
                    {order.customer_name && (
                      <span className="ml-2 text-muted-foreground text-xs truncate">
                        {order.customer_name}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((orderNum) => (
            <Badge key={orderNum} variant="secondary" className="gap-1">
              #{orderNum}
              <button
                type="button"
                onClick={() => handleRemove(orderNum)}
                className="ml-1 rounded-full outline-none"
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
