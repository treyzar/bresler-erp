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
import type { AxiosError } from "axios"
import api from "@/api/client"
import {
  HelpPanel, HelpSection, HelpItem,
} from "@/components/shared/HelpPanel"
import {
  FormInput, GitBranch, Bell as BellIcon, Ban, Code2,
} from "lucide-react"
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
    onError: (e: AxiosError<unknown>) => {
      const detail = e.response?.data
      const msg =
        typeof detail === "string"
          ? detail
          : (detail as { detail?: string })?.detail
            ? (detail as { detail: string }).detail
            : Object.entries((detail as Record<string, unknown>) ?? {})
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
                .join("; ")
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
                onValueChange={(v) =>
                  setType((p) => ({ ...p, category: v as AdminDocumentType["category"] }))
                }
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
                onValueChange={(v) =>
                  setType((p) => ({ ...p, visibility: v as AdminDocumentType["visibility"] }))
                }
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
      <HelpSection icon={FormInput} title="Поля формы (field_schema)" tone="primary">
        <p>
          Конструктор полей — список со стрелками ↑/↓ для перестановки. Для
          каждого поля укажите имя (snake_case, в шаблонах как{" "}
          <code>{`{{ name }}`}</code>), подпись для пользователя, тип и
          обязательность.
        </p>
        <HelpItem label="type=choice">
          Открывается редактор вариантов (код → подпись). В шаблоне доступна
          также <code>{`{{ <name>_display }}`}</code> с человекочитаемой меткой.
        </HelpItem>
        <HelpItem label="type=table">
          Открывается редактор колонок. Каждая колонка имеет имя, подпись
          и тип. Внутри таблицы можно использовать любые типы, кроме
          вложенных таблиц. В шаблоне:{" "}
          <code>{`{% for row in rows %}{{ row.col_name }}{% endfor %}`}</code>.
        </HelpItem>
      </HelpSection>

      <HelpSection icon={Code2} title="Переменные шаблонов (DTL)" tone="default">
        <p>
          В <code>title_template</code> и <code>body_template</code> доступны:
        </p>
        <HelpItem label="author">
          User: <code>author.full_name</code>, <code>author.position</code>,{" "}
          <code>author.department_unit.name</code>.
        </HelpItem>
        <HelpItem label="today">
          Текущая дата (для <code>{`{{ today|date:"d.m.Y" }}`}</code>).
        </HelpItem>
        <HelpItem label="document">
          После submit: <code>document.number</code>,{" "}
          <code>document.created_at</code>.
        </HelpItem>
        <HelpItem label="fields и поля по имени">
          <code>fields</code> — dict со всеми гидрированными значениями. Также
          каждое поле доступно по имени напрямую (date → date-объект, user →
          User-объект).
        </HelpItem>
      </HelpSection>

      <HelpSection icon={GitBranch} title="Цепочка согласования" tone="primary">
        <p>
          Список шагов с reorder ↑/↓. Для каждого шага role_key редактируется
          в текстовом поле напрямую — это основной источник истины. Дропдаун
          справа — shortcut с готовыми пресетами: выбираешь нужный → значение
          попадает в поле, при необходимости можно дописать аргумент.
        </p>
        <HelpItem label="dept_head_type:<unit_type>">
          Самый универсальный резолвер для уровня в иерархии:{" "}
          <code>division</code> (директор управления),{" "}
          <code>service</code> (руководитель службы) и т.д. Поднимается от
          автора по дереву до первого узла нужного типа. <strong>Не зависит
          от глубины автора</strong> — рекомендуется вместо{" "}
          <code>dept_head:up(N)</code>.
        </HelpItem>
        <HelpItem label="fixed_user:<id>">
          Прибито к конкретному человеку. Хрупко при кадровых изменениях, но
          самое предсказуемое.
        </HelpItem>
        <HelpItem label="Параллельные ветки">
          Задайте шагам одинаковый текстовый <code>parallel_group</code>, и они
          активизируются одновременно. AND — все должны одобрить;
          OR — достаточно одного approve, остальные → SKIPPED.
        </HelpItem>
        <p className="text-xs">
          Полный список форматов role_key — в <code>docs/edo_admin_guide.md</code>.
        </p>
      </HelpSection>

      <HelpSection icon={BellIcon} title="Inform-шаги" tone="default">
        <p>
          Действие <code>inform</code> / <code>notify_only</code> — шаг закрывается
          автоматически, как только активируется следующий active-шаг.
          Удобно для «Бухгалтерии в копию» и подобного.
        </p>
      </HelpSection>

      <HelpSection icon={Ban} title="Чего нельзя" tone="red">
        <HelpItem label="Менять code">
          После первого сохранения — поле заблокировано.
        </HelpItem>
        <HelpItem label="Удалять с документами">
          Тип, у которого есть документы — PROTECT FK заблокирует удаление.
          Выключайте через <code>is_active=False</code>.
        </HelpItem>
        <HelpItem label="Ретроактивные правки">
          Изменения шаблона или цепочки <strong>не</strong> применятся к старым
          документам — у них зафиксирован <code>chain_snapshot</code>.
        </HelpItem>
      </HelpSection>
    </HelpPanel>
  )
}
