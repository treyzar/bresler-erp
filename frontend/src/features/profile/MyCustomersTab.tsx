import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2, Building2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import apiClient from "@/api/client"
import type { PaginatedResponse, OrgUnit } from "@/api/types"
import { ORG_UNIT_BUSINESS_ROLES } from "@/api/types"
import { usersApi, type MyCustomer } from "@/api/usersApi"
import { useDebounce } from "@/hooks/useDebounce"

export function MyCustomersTab() {
  const qc = useQueryClient()
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["users", "me", "customers"],
    queryFn: () => usersApi.myCustomers(),
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => usersApi.removeCustomer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", "me", "customers"] })
      toast.success("Заказчик убран")
    },
  })

  const [addOpen, setAddOpen] = useState(false)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Мои заказчики</CardTitle>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-4 mr-1" /> Добавить
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : customers.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Building2 className="size-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Нет привязанных заказчиков</p>
          </div>
        ) : (
          <div className="space-y-2">
            {customers.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30">
                <div>
                  <span className="text-sm font-medium">{c.name}</span>
                  {c.business_role && (
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      {ORG_UNIT_BUSINESS_ROLES[c.business_role] ?? c.business_role}
                    </Badge>
                  )}
                  {c.full_name !== c.name && (
                    <p className="text-xs text-muted-foreground mt-0.5">{c.full_name}</p>
                  )}
                </div>
                <Button
                  variant="ghost" size="icon" className="size-7"
                  onClick={() => removeMutation.mutate(c.id)}
                  disabled={removeMutation.isPending}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AddCustomerDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        existingIds={customers.map((c) => c.id)}
      />
    </Card>
  )
}

function AddCustomerDialog({ open, onOpenChange, existingIds }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  existingIds: number[]
}) {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["orgunits-search", debouncedSearch],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<OrgUnit>>(
        "/directory/orgunits/", { params: { search: debouncedSearch, page_size: 20 } },
      )
      return data.results
    },
    enabled: debouncedSearch.length >= 2,
  })

  const addMutation = useMutation({
    mutationFn: (id: number) => usersApi.addCustomer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", "me", "customers"] })
      toast.success("Заказчик добавлен")
      onOpenChange(false)
    },
    onError: () => toast.error("Ошибка"),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Добавить заказчика</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Поиск организации (мин. 2 символа)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <ScrollArea className="h-[350px] rounded-md border">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : results.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">
              {search.length < 2 ? "Введите минимум 2 символа" : "Не найдено"}
            </p>
          ) : (
            <div className="p-1 space-y-1">
              {results.map((org) => {
                const alreadyAdded = existingIds.includes(org.id)
                return (
                  <div
                    key={org.id}
                    className={`flex items-center justify-between p-2 rounded text-sm ${alreadyAdded ? "opacity-40" : "cursor-pointer hover:bg-muted/50"}`}
                    onClick={() => !alreadyAdded && addMutation.mutate(org.id)}
                  >
                    <div>
                      <span className="font-medium">{org.name}</span>
                      {org.business_role && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          {ORG_UNIT_BUSINESS_ROLES[org.business_role] ?? org.business_role}
                        </Badge>
                      )}
                    </div>
                    {alreadyAdded && <Badge variant="outline" className="text-[10px]">Добавлен</Badge>}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
