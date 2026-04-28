import { useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import api from "@/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { SearchableSelect } from "@/components/shared/SearchableSelect"
import { MultiSelect } from "@/components/shared/MultiSelect"
import type { ColumnSpec, DateRangeValue, FieldSpec } from "../api/types"

interface DynamicFieldProps {
  spec: FieldSpec
  value: unknown
  onChange: (value: unknown) => void
  error?: string
}

interface UserOption {
  id: number
  full_name: string
  position: string
}

interface DepartmentOption {
  id: number
  name: string
  company: number
}

export function DynamicField({ spec, value, onChange, error }: DynamicFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={spec.name} className="text-sm font-medium">
        {spec.label}
        {spec.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <FieldControl spec={spec} value={value} onChange={onChange} />
      {spec.help_text && <p className="text-xs text-muted-foreground">{spec.help_text}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function FieldControl({ spec, value, onChange }: Omit<DynamicFieldProps, "error">) {
  switch (spec.type) {
    case "text":
      return (
        <Input
          id={spec.name}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={spec.placeholder}
        />
      )
    case "number":
    case "money":
      return (
        <Input
          id={spec.name}
          type="number"
          step={spec.type === "money" ? "0.01" : "1"}
          value={(value as number | string) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          placeholder={spec.placeholder}
        />
      )
    case "textarea":
    case "markdown":
      return (
        <Textarea
          id={spec.name}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={spec.placeholder}
          rows={spec.type === "markdown" ? 8 : 4}
        />
      )
    case "date":
      return (
        <Input
          id={spec.name}
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case "date_range": {
      const range = (value as DateRangeValue | null) ?? { from: null, to: null }
      return (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={range.from ?? ""}
            onChange={(e) => onChange({ ...range, from: e.target.value || null })}
            placeholder="С"
          />
          <span className="text-muted-foreground text-sm">—</span>
          <Input
            type="date"
            value={range.to ?? ""}
            onChange={(e) => onChange({ ...range, to: e.target.value || null })}
            placeholder="По"
          />
        </div>
      )
    }
    case "time":
      return (
        <Input
          id={spec.name}
          type="time"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case "boolean":
      return (
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id={spec.name}
            checked={Boolean(value)}
            onCheckedChange={(c) => onChange(Boolean(c))}
          />
          <label htmlFor={spec.name} className="text-sm cursor-pointer">
            Да
          </label>
        </div>
      )
    case "choice":
      return (
        <Select value={(value as string) ?? ""} onValueChange={onChange}>
          <SelectTrigger id={spec.name}>
            <SelectValue placeholder="Выберите..." />
          </SelectTrigger>
          <SelectContent>
            {(spec.choices ?? []).map(([code, label]) => (
              <SelectItem key={code} value={code}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case "user":
      return <UserField value={value as number | null} onChange={onChange} filter={spec.filter} />
    case "user_multi":
      return <UserMultiField value={(value as number[]) ?? []} onChange={onChange} filter={spec.filter} />
    case "department":
      return <DepartmentField value={value as number | null} onChange={onChange} />
    case "table":
      return (
        <TableField
          columns={spec.columns ?? []}
          value={(value as Record<string, unknown>[] | null) ?? []}
          onChange={onChange}
        />
      )
    default:
      return (
        <Input
          id={spec.name}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${spec.type} (unsupported)`}
        />
      )
  }
}

interface UserRow {
  id: number
  first_name?: string
  last_name?: string
  patronymic?: string
  username: string
  position?: string
}

async function fetchUsers(params: Record<string, unknown>): Promise<UserOption[]> {
  const r = await api.get("/users/", { params: { page_size: 500, ...params } })
  const raw: UserRow[] = r.data?.results ?? r.data ?? []
  return raw.map((u) => ({
    id: u.id,
    full_name: [u.last_name, u.first_name, u.patronymic].filter(Boolean).join(" ") || u.username,
    position: u.position ?? "",
  }))
}

/** Преобразует FieldSpec.filter в query-параметры для GET /api/users/. */
function _filterToParams(filter: Record<string, unknown> | undefined): Record<string, unknown> {
  const p: Record<string, unknown> = {}
  if (!filter) return p
  // scope: 'subtree' — мой department_unit + поддерево; 'company' — моя компания
  if (filter.scope === "subtree" || filter.subordinates_only) p.in_my_subtree = true
  if (filter.scope === "company" || filter.in_my_company) p.in_my_company = true
  if (filter.is_department_head) p.is_department_head = true
  return p
}

function UserField({
  value, onChange, filter,
}: { value: number | null; onChange: (v: number | null) => void; filter?: Record<string, unknown> }) {
  const [options, setOptions] = useState<UserOption[]>([])
  useEffect(() => {
    fetchUsers(_filterToParams(filter)).then(setOptions)
  }, [filter])

  return (
    <SearchableSelect
      options={options.map((u) => ({
        value: String(u.id),
        label: u.position ? `${u.full_name} — ${u.position}` : u.full_name,
      }))}
      value={value ? String(value) : ""}
      onChange={(v) => onChange(v ? Number(v) : null)}
      placeholder="Выберите сотрудника..."
      searchPlaceholder="Поиск по имени..."
    />
  )
}

function UserMultiField({
  value, onChange, filter,
}: { value: number[]; onChange: (v: number[]) => void; filter?: Record<string, unknown> }) {
  const [options, setOptions] = useState<UserOption[]>([])
  useEffect(() => {
    fetchUsers(_filterToParams(filter)).then(setOptions)
  }, [filter])

  return (
    <MultiSelect
      options={options.map((u) => ({
        value: u.id,
        label: u.position ? `${u.full_name} — ${u.position}` : u.full_name,
      }))}
      value={value}
      onChange={onChange}
      placeholder="Выберите сотрудников..."
    />
  )
}

function DepartmentField({
  value, onChange,
}: { value: number | null; onChange: (v: number | null) => void }) {
  const [options, setOptions] = useState<DepartmentOption[]>([])
  useEffect(() => {
    api.get("/directory/departments/", { params: { page_size: 200 } })
      .then((r) => {
        const raw = r.data?.results ?? r.data ?? []
        setOptions(raw)
      })
      .catch(() => setOptions([]))
  }, [])

  return (
    <SearchableSelect
      options={options.map((d) => ({ value: String(d.id), label: d.name }))}
      value={value ? String(value) : ""}
      onChange={(v) => onChange(v ? Number(v) : null)}
      placeholder="Выберите подразделение..."
      searchPlaceholder="Поиск по названию..."
    />
  )
}


/** Универсальный редактор таблицы: колонки описаны в `columns`, значение — массив строк-объектов.
 *  Каждая ячейка использует FieldControl для нужного типа; добавление/удаление строк — кнопками. */
function TableField({
  columns, value, onChange,
}: {
  columns: ColumnSpec[]
  value: Record<string, unknown>[]
  onChange: (v: Record<string, unknown>[]) => void
}) {
  const rows = value ?? []

  const addRow = () => {
    const empty: Record<string, unknown> = {}
    for (const col of columns) empty[col.name] = null
    onChange([...rows, empty])
  }

  const removeRow = (idx: number) => {
    onChange(rows.filter((_, i) => i !== idx))
  }

  const updateCell = (rowIdx: number, name: string, cellValue: unknown) => {
    const next = rows.map((r, i) => (i === rowIdx ? { ...r, [name]: cellValue } : r))
    onChange(next)
  }

  if (columns.length === 0) {
    return <p className="text-sm text-destructive">Колонки таблицы не настроены в типе документа.</p>
  }

  return (
    <div className="space-y-2 border rounded-md p-3 bg-muted/20">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Список пуст</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="grid gap-2 p-2 rounded bg-background border" style={{
              gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr)) auto`,
            }}>
              {columns.map((col) => (
                <div key={col.name} className="space-y-1">
                  {rowIdx === 0 && (
                    <Label className="text-xs text-muted-foreground">{col.label || col.name}</Label>
                  )}
                  <FieldControl
                    spec={{
                      name: `${col.name}__${rowIdx}`,
                      label: col.label || col.name,
                      type: col.type as FieldSpec["type"],
                    }}
                    value={row[col.name]}
                    onChange={(v) => updateCell(rowIdx, col.name, v)}
                  />
                </div>
              ))}
              <div className="flex items-end pb-1">
                <Button
                  type="button"
                  variant="ghost" size="icon"
                  onClick={() => removeRow(rowIdx)}
                  title="Удалить строку"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="mr-2 h-4 w-4" />
        Добавить строку
      </Button>
    </div>
  )
}
