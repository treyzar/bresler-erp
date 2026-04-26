/** Визуальный редактор `field_schema`: список полей с типом, обязательностью,
 *  conditional блоками для choice (choices) и table (columns). Reorder через
 *  кнопки ↑/↓, без drag-and-drop библиотек — для простоты. */
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { COLUMN_TYPE_OPTIONS, FIELD_TYPE_OPTIONS } from "../api/admin"
import type { ColumnSpec, FieldSpec, FieldType } from "../api/types"

type Choice = [string, string]

interface Props {
  value: FieldSpec[]
  onChange: (next: FieldSpec[]) => void
}

export function FieldSchemaEditor({ value, onChange }: Props) {
  const update = (idx: number, patch: Partial<FieldSpec>) => {
    onChange(value.map((f, i) => (i === idx ? { ...f, ...patch } : f)))
  }
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx))
  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= value.length) return
    const next = [...value]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    onChange(next)
  }
  const add = () => {
    onChange([...value, { name: `field_${value.length + 1}`, label: "Новое поле", type: "text" }])
  }

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          Полей нет — добавьте первое.
        </p>
      )}
      {value.map((field, idx) => (
        <Card key={idx} className="p-0">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground w-6">#{idx + 1}</span>
              <Input
                placeholder="имя_поля (snake_case)"
                value={field.name}
                onChange={(e) => update(idx, { name: e.target.value })}
                className="font-mono text-sm w-56"
              />
              <Input
                placeholder="Подпись для пользователя"
                value={field.label}
                onChange={(e) => update(idx, { label: e.target.value })}
                className="flex-1"
              />
              <Button variant="ghost" size="icon" onClick={() => move(idx, -1)} disabled={idx === 0}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => move(idx, 1)} disabled={idx === value.length - 1}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => remove(idx)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            <div className="grid grid-cols-[200px_1fr_auto] gap-2 items-center">
              <Select
                value={field.type}
                onValueChange={(v) => update(idx, {
                  type: v as FieldType,
                  // При смене типа — почистим conditional ключи.
                  choices: v === "choice" ? (field.choices ?? [["a", "Вариант A"]]) : undefined,
                  columns: v === "table" ? (field.columns ?? [
                    { name: "col1", type: "text", label: "Колонка 1" },
                  ]) : undefined,
                })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIELD_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Подсказка под полем (help_text)"
                value={field.help_text ?? ""}
                onChange={(e) => update(idx, { help_text: e.target.value || undefined })}
              />
              <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                <Checkbox
                  checked={!!field.required}
                  onCheckedChange={(c) => update(idx, { required: !!c })}
                />
                Обязательное
              </label>
            </div>

            {field.type === "choice" && (
              <ChoicesEditor
                value={field.choices ?? []}
                onChange={(c) => update(idx, { choices: c })}
              />
            )}
            {field.type === "table" && (
              <ColumnsEditor
                value={field.columns ?? []}
                onChange={(c) => update(idx, { columns: c })}
              />
            )}
          </CardContent>
        </Card>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="mr-2 h-4 w-4" />Добавить поле
      </Button>
    </div>
  )
}

function ChoicesEditor({ value, onChange }: { value: Choice[]; onChange: (v: Choice[]) => void }) {
  const update = (i: number, code: string, label: string) =>
    onChange(value.map((c, idx) => (idx === i ? [code, label] : c)))
  const add = () => onChange([...value, [`val_${value.length + 1}`, ""]])
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))

  return (
    <div className="border rounded-md p-3 bg-muted/20 space-y-2">
      <Label className="text-xs text-muted-foreground">Варианты выбора (код → подпись)</Label>
      {value.map(([code, label], i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={code}
            onChange={(e) => update(i, e.target.value, label)}
            placeholder="код"
            className="font-mono text-xs w-40"
          />
          <Input
            value={label}
            onChange={(e) => update(i, code, e.target.value)}
            placeholder="Подпись"
            className="flex-1"
          />
          <Button variant="ghost" size="icon" onClick={() => remove(i)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="mr-2 h-4 w-4" />Добавить вариант
      </Button>
    </div>
  )
}

function ColumnsEditor({ value, onChange }: { value: ColumnSpec[]; onChange: (v: ColumnSpec[]) => void }) {
  const update = (i: number, patch: Partial<ColumnSpec>) =>
    onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  const add = () => onChange([...value, { name: `col_${value.length + 1}`, type: "text", label: "" }])
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))

  return (
    <div className="border rounded-md p-3 bg-muted/20 space-y-2">
      <Label className="text-xs text-muted-foreground">Колонки таблицы</Label>
      {value.map((col, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={col.name}
            onChange={(e) => update(i, { name: e.target.value })}
            placeholder="имя_колонки"
            className="font-mono text-xs w-32"
          />
          <Input
            value={col.label ?? ""}
            onChange={(e) => update(i, { label: e.target.value })}
            placeholder="Заголовок"
            className="flex-1"
          />
          <Select
            value={col.type}
            onValueChange={(v) => update(i, { type: v as ColumnSpec["type"] })}
          >
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COLUMN_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={() => remove(i)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="mr-2 h-4 w-4" />Добавить колонку
      </Button>
    </div>
  )
}
