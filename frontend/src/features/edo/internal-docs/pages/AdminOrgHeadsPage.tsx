/** Справочник «Шапки организаций»: руководители для блока «Кому» в PDF.
 *
 *  Простая CRUD-таблица: org_unit + ФИО + должность + период действия.
 *  Активный head ищется по active_for(date) на стороне бэка. */
import { useState } from "react"
import { Link } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { ChevronLeft, Plus, Trash2, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"
import api from "@/api/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SearchableSelect } from "@/components/shared/SearchableSelect"
import {
  HelpPanel, HelpSection, HelpSteps, HelpStep, HelpCallout,
} from "@/components/shared/HelpPanel"
import { Building2, CalendarDays, Users2 } from "lucide-react"

interface OrgUnitHead {
  id: number
  org_unit: number
  org_unit_name: string
  head_name: string
  head_position: string
  from_date: string
  to_date: string | null
  note: string
}

interface OrgUnitOption {
  id: number
  name: string
}

const EMPTY: Partial<OrgUnitHead> = {
  head_name: "",
  head_position: "Директор",
  from_date: new Date().toISOString().slice(0, 10),
  to_date: null,
  note: "",
}

export function AdminOrgHeadsPage() {
  const qc = useQueryClient()

  const { data: heads, isLoading } = useQuery({
    queryKey: ["orgunit-heads"],
    queryFn: async (): Promise<OrgUnitHead[]> => {
      const r = await api.get("/directory/orgunit-heads/", { params: { page_size: 200 } })
      return Array.isArray(r.data) ? r.data : (r.data.results ?? [])
    },
  })

  const { data: orgUnits } = useQuery({
    queryKey: ["orgunits-internal"],
    queryFn: async (): Promise<OrgUnitOption[]> => {
      const r = await api.get("/directory/orgunits/", {
        params: { business_role: "internal", page_size: 100 },
      })
      const raw: { id: number; name: string }[] = Array.isArray(r.data) ? r.data : (r.data.results ?? [])
      return raw.map((o) => ({ id: o.id, name: o.name }))
    },
  })

  const [creating, setCreating] = useState<Partial<OrgUnitHead> | null>(null)

  const create = useMutation({
    mutationFn: (payload: Partial<OrgUnitHead>) => api.post("/directory/orgunit-heads/", payload),
    onSuccess: () => {
      toast.success("Запись создана")
      setCreating(null)
      qc.invalidateQueries({ queryKey: ["orgunit-heads"] })
    },
    onError: (e: AxiosError<{ detail?: string }>) =>
      toast.error(e.response?.data?.detail ?? "Ошибка"),
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/directory/orgunit-heads/${id}/`),
    onSuccess: () => {
      toast.success("Удалено")
      qc.invalidateQueries({ queryKey: ["orgunit-heads"] })
    },
    onError: (e: AxiosError<{ detail?: string }>) =>
      toast.error(e.response?.data?.detail ?? "Ошибка"),
  })

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <Button variant="ghost" asChild className="-ml-3">
        <Link to="/edo/my">
          <ChevronLeft className="mr-2 h-4 w-4" />К моим документам
        </Link>
      </Button>

      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Шапки организаций</h1>
            <p className="text-muted-foreground mt-1">
              Руководители компаний для блока «Кому» в PDF. На момент создания
              документа подставляется активный руководитель на эту дату.
            </p>
          </div>
          <OrgHeadsHelp />
        </div>
        <Button onClick={() => setCreating({ ...EMPTY })}>
          <Plus className="mr-2 h-4 w-4" />Добавить
        </Button>
      </header>

      {creating && (
        <Card>
          <CardHeader><CardTitle className="text-base">Новая запись</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Организация</Label>
                <SearchableSelect
                  options={(orgUnits ?? []).map((o) => ({ value: String(o.id), label: o.name }))}
                  value={creating.org_unit ? String(creating.org_unit) : ""}
                  onChange={(v) => setCreating((p) => ({ ...p!, org_unit: v ? Number(v) : undefined }))}
                  placeholder="Выберите..."
                  searchPlaceholder="Поиск..."
                />
              </div>
              <div>
                <Label>ФИО</Label>
                <Input
                  value={creating.head_name ?? ""}
                  onChange={(e) => setCreating((p) => ({ ...p!, head_name: e.target.value }))}
                  placeholder="Иванов Иван Иванович"
                />
              </div>
              <div>
                <Label>Должность</Label>
                <Input
                  value={creating.head_position ?? ""}
                  onChange={(e) => setCreating((p) => ({ ...p!, head_position: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Действует с</Label>
                  <Input
                    type="date"
                    value={creating.from_date ?? ""}
                    onChange={(e) => setCreating((p) => ({ ...p!, from_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Действует по</Label>
                  <Input
                    type="date"
                    value={creating.to_date ?? ""}
                    onChange={(e) => setCreating((p) => ({ ...p!, to_date: e.target.value || null }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCreating(null)}>Отмена</Button>
              <Button onClick={() => create.mutate(creating)} disabled={create.isPending}>
                {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Сохранить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Организация</TableHead>
                <TableHead>ФИО</TableHead>
                <TableHead>Должность</TableHead>
                <TableHead>Период</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(heads ?? []).map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="text-sm">{h.org_unit_name}</TableCell>
                  <TableCell className="font-medium">{h.head_name}</TableCell>
                  <TableCell>{h.head_position}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(h.from_date).toLocaleDateString("ru-RU")}
                    {h.to_date ? ` – ${new Date(h.to_date).toLocaleDateString("ru-RU")}` : " – по сей день"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => {
                        if (confirm(`Удалить запись «${h.head_name}»?`)) remove.mutate(h.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(heads ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    Записей ещё нет. Добавьте директоров для своих компаний.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}


function OrgHeadsHelp() {
  return (
    <HelpPanel
      title="Шапки организаций"
      description="Кто фигурирует в блоке «Кому» PDF-документов."
    >
      <HelpSection icon={Building2} title="Зачем это" tone="primary">
        <p>
          Внутренние документы при формировании PDF подставляют в шапку
          название компании автора + ФИО директора + должность. Эти данные
          берутся отсюда — справочник руководителей по датам действия.
        </p>
      </HelpSection>

      <HelpSection icon={CalendarDays} title="Как добавить запись" tone="primary">
        <HelpSteps>
          <HelpStep n={1}>
            Выберите организацию (компанию с{" "}
            <code>business_role=internal</code>).
          </HelpStep>
          <HelpStep n={2}>
            Введите ФИО и должность («Директор», «Генеральный директор», …).
          </HelpStep>
          <HelpStep n={3}>
            Укажите <strong>«Действует с»</strong> — обязательно.
          </HelpStep>
          <HelpStep n={4}>
            <strong>«Действует по»</strong> — оставьте пустым, если запись
            актуальна по сей день.
          </HelpStep>
        </HelpSteps>
      </HelpSection>

      <HelpSection icon={Users2} title="Несколько руководителей" tone="default">
        <p>
          При смене директора создайте новую запись и закройте старую (поставьте
          ей <code>to_date</code>). В архиве у каждого документа сохранится
          тот директор, который был активным на дату отправки — смена{" "}
          «задним числом» не ломает архив.
        </p>
      </HelpSection>

      <HelpCallout variant="info" title="Активный руководитель на дату">
        Это запись, у которой <code>from_date ≤ дата ≤ to_date</code> (либо{" "}
        <code>to_date IS NULL</code>). Если на нужную дату активной записи нет —
        блок «Кому» в PDF будет пустым.
      </HelpCallout>
    </HelpPanel>
  )
}
