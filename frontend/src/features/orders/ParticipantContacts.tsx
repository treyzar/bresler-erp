import { useState } from "react"
import { Plus, Trash2, Star, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import apiClient from "@/api/client"
import type { PaginatedResponse, Contact, OrderParticipantEntry } from "@/api/types"
import {
  useParticipantContacts,
  useAddParticipantContact,
  useRemoveParticipantContact,
} from "@/api/hooks/useSpecs"
import { useDebounce } from "@/hooks/useDebounce"

interface ParticipantContactsProps {
  participants: OrderParticipantEntry[]
}

export function ParticipantContacts({ participants }: ParticipantContactsProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [activeParticipantId, setActiveParticipantId] = useState<number | null>(null)

  if (participants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Нет участников запроса
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {participants.map((p) => (
        <ParticipantContactsList
          key={p.id}
          participant={p}
          onAdd={() => { setActiveParticipantId(p.id); setAddOpen(true) }}
        />
      ))}

      {activeParticipantId && (
        <AddContactDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          participantId={activeParticipantId}
        />
      )}
    </div>
  )
}

function ParticipantContactsList({
  participant, onAdd,
}: {
  participant: OrderParticipantEntry
  onAdd: () => void
}) {
  const { data, isLoading } = useParticipantContacts(participant.id)
  const removeMutation = useRemoveParticipantContact(participant.id)

  const contacts = data?.results ?? []

  const handleRemove = (linkId: number) => {
    removeMutation.mutate(linkId, {
      onSuccess: () => toast.success("Контакт отвязан"),
      onError: () => toast.error("Ошибка"),
    })
  }

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">#{participant.order_index}</Badge>
          <span className="text-sm font-medium">{participant.org_unit_name}</span>
        </div>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="size-3.5 mr-1" /> Добавить контакт
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : contacts.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">Нет контактов</p>
      ) : (
        <div className="space-y-1">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-2 rounded bg-muted/20 hover:bg-muted/40 text-sm"
            >
              <div className="flex items-center gap-2">
                {c.is_primary && <Star className="size-3.5 text-amber-500 fill-amber-500" />}
                <span>{c.contact_name}</span>
              </div>
              <Button
                variant="ghost" size="icon" className="size-7"
                onClick={() => handleRemove(c.id)}
                disabled={removeMutation.isPending}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Add contact dialog ──────────────────────────────────────────

function useContactSearch(search: string) {
  const debouncedSearch = useDebounce(search, 300)
  return useQuery({
    queryKey: ["contacts-search", debouncedSearch],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Contact>>(
        "/directory/contacts/", { params: { search: debouncedSearch, page_size: 30 } },
      )
      return data.results
    },
    enabled: debouncedSearch.length >= 2,
  })
}

function useCreateContact(participantId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      // 1. Create contact in directory
      const { data: contact } = await apiClient.post<Contact>("/directory/contacts/", payload)
      // 2. Link to participant
      await apiClient.post(`/participants/${participantId}/contacts/`, {
        participant: participantId,
        contact: contact.id,
        is_primary: payload.is_primary ?? false,
      })
      return contact
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["participantContacts", participantId] })
    },
  })
}

function AddContactDialog({
  open, onOpenChange, participantId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  participantId: number
}) {
  const [mode, setMode] = useState<"search" | "create">("search")
  const [search, setSearch] = useState("")
  const { data: contacts = [], isLoading } = useContactSearch(search)
  const addMutation = useAddParticipantContact(participantId)
  const createMutation = useCreateContact(participantId)
  const { data: existingData } = useParticipantContacts(participantId)

  // Create form state
  const [newContact, setNewContact] = useState({
    full_name: "", position: "", email: "", phone: "", is_primary: false,
  })

  const existingContactIds = (existingData?.results ?? []).map((c) => c.contact)

  const handleAdd = (contactId: number, isPrimary = false) => {
    addMutation.mutate(
      { contactId, isPrimary },
      {
        onSuccess: () => {
          toast.success("Контакт привязан")
          onOpenChange(false)
        },
        onError: () => toast.error("Ошибка привязки"),
      },
    )
  }

  const handleCreate = () => {
    if (!newContact.full_name.trim()) {
      toast.error("Укажите ФИО")
      return
    }
    createMutation.mutate(newContact, {
      onSuccess: () => {
        toast.success("Контакт создан и привязан")
        onOpenChange(false)
      },
      onError: () => toast.error("Ошибка создания контакта"),
    })
  }

  const resetState = () => {
    setMode("search")
    setSearch("")
    setNewContact({ full_name: "", position: "", email: "", phone: "", is_primary: false })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState() }}>
      <DialogContent className="max-w-lg max-h-[80vh]" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {mode === "search" ? "Добавить контакт" : "Новый контакт"}
          </DialogTitle>
        </DialogHeader>

        {mode === "search" ? (
          <>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Поиск по ФИО (мин. 2 символа)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={() => setMode("create")}>
                <UserPlus className="size-3.5 mr-1" /> Создать
              </Button>
            </div>
            <ScrollArea className="h-[350px] rounded-md border">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : contacts.length === 0 ? (
                <div className="p-4 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {search.length < 2 ? "Введите минимум 2 символа" : "Не найдено"}
                  </p>
                  {search.length >= 2 && contacts.length === 0 && (
                    <Button variant="outline" size="sm" onClick={() => {
                      setNewContact({ ...newContact, full_name: search })
                      setMode("create")
                    }}>
                      <UserPlus className="size-3.5 mr-1" /> Создать «{search}»
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ФИО</TableHead>
                      <TableHead className="w-36">Должность</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((c) => {
                      const alreadyAdded = existingContactIds.includes(c.id)
                      return (
                        <TableRow key={c.id} className={alreadyAdded ? "opacity-40" : ""}>
                          <TableCell className="text-sm">{c.full_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.position}</TableCell>
                          <TableCell>
                            {alreadyAdded ? (
                              <Badge variant="outline" className="text-[10px]">Добавлен</Badge>
                            ) : (
                              <div className="flex gap-1">
                                <Button
                                  variant="outline" size="sm" className="h-7 text-xs"
                                  onClick={() => handleAdd(c.id)}
                                  disabled={addMutation.isPending}
                                >
                                  Добавить
                                </Button>
                                <Button
                                  variant="outline" size="sm" className="h-7 text-xs"
                                  onClick={() => handleAdd(c.id, true)}
                                  disabled={addMutation.isPending}
                                  title="Добавить как основной контакт"
                                >
                                  <Star className="size-3" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </>
        ) : (
          /* ── Create new contact form ── */
          <div className="space-y-4">
            <Button variant="ghost" size="sm" className="text-xs -ml-2" onClick={() => setMode("search")}>
              &larr; Назад к поиску
            </Button>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>ФИО <span className="text-destructive">*</span></Label>
                <Input
                  value={newContact.full_name}
                  onChange={(e) => setNewContact({ ...newContact, full_name: e.target.value })}
                  placeholder="Иванов Иван Иванович"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Должность</Label>
                <Input
                  value={newContact.position}
                  onChange={(e) => setNewContact({ ...newContact, position: e.target.value })}
                  placeholder="Ведущий инженер"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    placeholder="ivanov@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Телефон</Label>
                  <Input
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMode("search")}>Отмена</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending || !newContact.full_name.trim()}>
                {createMutation.isPending ? "Создание..." : "Создать и привязать"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
