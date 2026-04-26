/** Создание/редактирование типа документа.
 *
 * Тип ссылается на цепочку через FK. В этой странице мы редактируем и тип,
 * и его дефолтную цепочку (создаём встроенно при первом создании типа). */
import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ChevronLeft, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import api from "@/api/client"
import { HelpPanel } from "@/components/shared/HelpPanel"
import { adminApi, type AdminChainStep, type AdminDocumentType } from "../api/admin"
import { FieldSchemaEditor } from "../components/FieldSchemaEditor"
import { ChainStepsEditor } from "../components/ChainStepsEditor"
import type { FieldSpec } from "../api/types"

const CATEGORIES = [
  ["memo", "Служебные записки"],
  ["application", "Заявления"],
  ["notification", "Уведомления"],
  ["travel", "Командировки"],
  ["bonus", "Премирование"],
  ["other", "Другое"],
] as const

const VISIBILITY = [
  ["personal_only", "Только автор и согласующие"],
  ["department_visible", "Виден сотрудникам подразделения"],
  ["public", "Виден всем (в рамках tenant-скоупа)"],
] as const

const INITIATOR = [
  ["author", "Любой сотрудник"],
  ["department_head", "Только руководитель подразделения"],
  ["group:accounting", "Бухгалтерия"],
  ["group:hr", "HR / Отдел кадров"],
  ["group:admin", "Администраторы"],
] as const

interface NumberSequence {
  id: number
  name: string
  prefix: string
  pattern: string
}

const EMPTY_TYPE: Partial<AdminDocumentType> = {
  code: "",
  name: "",
  description: "",
  category: "memo",
  icon: "file-text",
  field_schema: [],
  body_template: "",
  title_template: "",
  visibility: "personal_only",
  tenancy_override: "",
  initiator_resolver: "author",
  addressee_mode: "none",
  is_active: true,
  requires_drawn_signature: false,
}

export function AdminTypeEditPage() {
  const { code } = useParams<{ code: string }>()
  const isNew = !code || code === "new"
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [type, setType] = useState<Partial<AdminDocumentType>>(EMPTY_TYPE)
  const [steps, setSteps] = useState<AdminChainStep[]>([])

  const { data: existing, isLoading } = useQuery({
    queryKey: ["edo-admin", "type", code],
    queryFn: () => adminApi.getType(code!),
    enabled: !isNew,
  })

  useEffect(() => {
    if (existing) {
      setType(existing)
      setSteps(existing.default_chain_detail?.steps ?? [])
    }
  }, [existing])

  const { data: sequences } = useQuery({
    queryKey: ["number-sequences"],
    queryFn: async (): Promise<NumberSequence[]> => {
      const r = await api.get("/core/sequences/")
      const data = r.data
      return Array.isArray(data) ? data : (data.results ?? [])
    },
  })

  const save = useMutation({
    mutationFn: async () => {
      // 1. Цепочка: создаём или обновляем по существующему ID.
      let chainId = type.default_chain
      if (existing?.default_chain) {
        await adminApi.updateChain(existing.default_chain, {
          steps,
          name: existing.default_chain_detail?.name ?? `${type.name ?? "chain"} — стандартная`,
        })
        chainId = existing.default_chain
      } else {
        const created = await adminApi.createChain({
          name: `${type.name} — стандартная`,
          steps,
          is_default: true,
        })
        chainId = created.id
      }

      // 2. Тип.
      const payload = { ...type, default_chain: chainId }
      if (isNew) {
        return adminApi.createType(payload)
      } else {
        return adminApi.updateType(code!, payload)
      }
    },
    onSuccess: (saved) => {
      toast.success("Тип сохранён")
      qc.invalidateQueries({ queryKey: ["edo-admin"] })
      qc.invalidateQueries({ queryKey: ["internal-docs"] })
      navigate(`/edo/admin/types/${saved.code}`)
    },
    onError: (e: any) => {
      const detail = e?.response?.data
      const msg = typeof detail === "string"
        ? detail
        : detail?.detail
          ? detail.detail
          : Object.entries(detail ?? {}).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("; ")
      toast.error(msg || "Ошибка сохранения")
    },
  })

  if (isLoading && !isNew) {
    return <div className="container mx-auto p-6 max-w-4xl"><Skeleton className="h-96" /></div>
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <Button variant="ghost" asChild className="-ml-3">
        <Link to="/edo/admin/types">
          <ChevronLeft className="mr-2 h-4 w-4" />К списку типов
        </Link>
      </Button>

      <header className="flex items-start gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {isNew ? "Новый тип документа" : `Редактирование: ${type.name}`}
        </h1>
        <AdminTypeEditHelp />
      </header>

      <Card>
        <CardHeader><CardTitle>Основное</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Код (slug)</Label>
              <Input
                value={type.code ?? ""}
                onChange={(e) => setType((p) => ({ ...p, code: e.target.value }))}
                placeholder="memo_overtime"
                disabled={!isNew}
                className="font-mono"
              />
            </div>
            <div>
              <Label>Название</Label>
              <Input
                value={type.name ?? ""}
                onChange={(e) => setType((p) => ({ ...p, name: e.target.value }))}
                placeholder="Служебная записка о переработке"
              />
            </div>
          </div>
          <div>
            <Label>Описание</Label>
            <Textarea
              value={type.description ?? ""}
              onChange={(e) => setType((p) => ({ ...p, description: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Категория</Label>
              <Select
                value={type.category}
                onValueChange={(v) => setType((p) => ({ ...p, category: v as any }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(([code, label]) => (
                    <SelectItem key={code} value={code}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Иконка (lucide)</Label>
              <Input
                value={type.icon ?? ""}
                onChange={(e) => setType((p) => ({ ...p, icon: e.target.value }))}
                placeholder="file-text"
              />
            </div>
            <div>
              <Label>Нумерация</Label>
              <Select
                value={type.numbering_sequence ? String(type.numbering_sequence) : ""}
                onValueChange={(v) => setType((p) => ({ ...p, numbering_sequence: Number(v) }))}
              >
                <SelectTrigger><SelectValue placeholder="Выберите..." /></SelectTrigger>
                <SelectContent>
                  {(sequences ?? []).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name} ({s.prefix})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Видимость</Label>
              <Select
                value={type.visibility}
                onValueChange={(v) => setType((p) => ({ ...p, visibility: v as any }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VISIBILITY.map(([code, label]) => (
                    <SelectItem key={code} value={code}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Кто может создавать</Label>
              <Select
                value={type.initiator_resolver}
                onValueChange={(v) => setType((p) => ({ ...p, initiator_resolver: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INITIATOR.map(([code, label]) => (
                    <SelectItem key={code} value={code}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={!!type.requires_drawn_signature}
                onCheckedChange={(c) => setType((p) => ({ ...p, requires_drawn_signature: !!c }))}
              />
              Требует рисованную подпись
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={type.is_active ?? true}
                onCheckedChange={(c) => setType((p) => ({ ...p, is_active: !!c }))}
              />
              Активен
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Поля формы (field_schema)</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldSchemaEditor
            value={(type.field_schema as FieldSpec[]) ?? []}
            onChange={(v) => setType((p) => ({ ...p, field_schema: v }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Шаблоны</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Шаблон заголовка (title_template)</Label>
            <Input
              value={type.title_template ?? ""}
              onChange={(e) => setType((p) => ({ ...p, title_template: e.target.value }))}
              placeholder="Служебная записка «{{ subject }}»"
              className="font-mono text-sm"
            />
          </div>
          <div>
            <Label>Тело документа (body_template)</Label>
            <Textarea
              value={type.body_template ?? ""}
              onChange={(e) => setType((p) => ({ ...p, body_template: e.target.value }))}
              rows={8}
              placeholder="{{ body|linebreaks }}"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Django Template Language. Доступны: <code>author</code>, <code>today</code>,{" "}
              <code>document</code>, <code>fields</code> + поля по имени.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Цепочка согласования</CardTitle>
        </CardHeader>
        <CardContent>
          <ChainStepsEditor value={steps} onChange={setSteps} />
        </CardContent>
      </Card>

      <div className="flex justify-end sticky bottom-4 bg-background/80 backdrop-blur p-3 rounded-lg border shadow-sm">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Сохранить
        </Button>
      </div>
    </div>
  )
}


function AdminTypeEditHelp() {
  return (
    <HelpPanel
      title="Редактор типа документа"
      description="Поля, шаблоны, цепочка согласования."
    >
      <h3>Поля формы (field_schema)</h3>
      <p>
        Конструктор полей — список со стрелками ↑/↓ для перестановки. Для
        каждого поля укажите <strong>имя</strong> (snake_case, используется в шаблонах
        как <code>{`{{ name }}`}</code>), <strong>подпись</strong> для пользователя, <strong>тип</strong>{" "}
        и <strong>обязательность</strong>.
      </p>

      <h3>Conditional подразделы</h3>
      <ul>
        <li><strong>type=choice</strong> — открывается редактор вариантов (код → подпись).
          В шаблоне доступна также <code>{`{{ <name>_display }}`}</code> с человекочитаемой
          меткой.</li>
        <li><strong>type=table</strong> — открывается редактор колонок. Каждая колонка
          имеет имя, подпись и тип. Внутри таблицы можно использовать любые
          типы, кроме вложенных таблиц. В шаблоне:{" "}
          <code>{`{% for row in rows %}{{ row.col_name }}{% endfor %}`}</code>.</li>
      </ul>

      <h3>Шаблоны (Django Template Language)</h3>
      <p>
        В <code>title_template</code> и <code>body_template</code> доступны:
      </p>
      <ul>
        <li><code>author</code> — User: <code>author.full_name</code>, <code>author.position</code>,{" "}
          <code>author.department_unit.name</code>.</li>
        <li><code>today</code> — текущая дата (для <code>{`{{ today|date:"d.m.Y" }}`}</code>).</li>
        <li><code>document</code> — после submit: <code>document.number</code>,{" "}
          <code>document.created_at</code>.</li>
        <li><code>fields</code> — dict со всеми гидрированными значениями.</li>
        <li>Каждое поле — по имени, гидрированное (date → date-объект, user →
          User-объект и т.п.).</li>
      </ul>

      <h3>Цепочка согласования</h3>
      <p>
        Список шагов с reorder. Для каждого выберите <strong>role_key</strong> (preset из
        списка или ручной ввод). Полный список префиксов — в админ-гайде.
      </p>
      <p>
        <strong>Параллельные ветки.</strong> Чтобы шаги шли одновременно — задайте им
        одинаковый текстовый <code>parallel_group</code>. Режим:
      </p>
      <ul>
        <li><code>AND</code> — нужны все одобрения; любой reject убивает документ.</li>
        <li><code>OR</code> — достаточно одного approve, остальные → SKIPPED. Reject в
          OR не блокирует, документ rejected только если все откажут.</li>
      </ul>

      <h3>Inform-шаги</h3>
      <p>
        Действие <code>inform</code> / <code>notify_only</code> — шаг закрывается автоматически,
        как только активируется следующий active-шаг. Удобно для «Бухгалтерии
        в копию» и подобного.
      </p>

      <h3>Что нельзя</h3>
      <ul>
        <li>Менять <code>code</code> после создания.</li>
        <li>Удалять тип, у которого есть документы (PROTECT FK).</li>
        <li>Изменения шаблона/цепочки <strong>не</strong> ретроактивны — старые
          документы останутся со своим <code>chain_snapshot</code>.</li>
      </ul>
    </HelpPanel>
  )
}
