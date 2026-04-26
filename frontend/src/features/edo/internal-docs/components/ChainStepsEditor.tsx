/** Визуальный редактор шагов цепочки `ApprovalChainTemplate.steps`.
 *
 *  Поддерживает: role_key (preset + ручной ввод), action, sla_hours,
 *  parallel_group + parallel_mode (для параллельных веток). */
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ACTION_OPTIONS, ROLE_KEY_PRESETS, type AdminChainStep } from "../api/admin"

interface Props {
  value: AdminChainStep[]
  onChange: (next: AdminChainStep[]) => void
}

export function ChainStepsEditor({ value, onChange }: Props) {
  const update = (idx: number, patch: Partial<AdminChainStep>) =>
    onChange(value.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  const remove = (idx: number) => {
    const next = value.filter((_, i) => i !== idx)
    onChange(next.map((s, i) => ({ ...s, order: i + 1 })))
  }
  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= value.length) return
    const next = [...value]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    onChange(next.map((s, i) => ({ ...s, order: i + 1 })))
  }
  const add = () => {
    onChange([
      ...value,
      {
        order: value.length + 1,
        role_key: "supervisor",
        label: "Непосредственный руководитель",
        action: "approve",
        sla_hours: 24,
        parallel_group: "",
        parallel_mode: "and",
      },
    ])
  }

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          Шагов нет — добавьте первый.
        </p>
      )}
      {value.map((step, idx) => (
        <Card key={idx} className="p-0">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground w-8">#{step.order}</span>
              <Input
                placeholder="Подпись («Бухгалтерия», «Директор»…)"
                value={step.label}
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

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground w-24 shrink-0">role_key</Label>
                <Input
                  value={step.role_key}
                  onChange={(e) => update(idx, { role_key: e.target.value })}
                  placeholder="например: supervisor, fixed_user:42, dept_head:up(2)"
                  className="font-mono text-xs flex-1"
                />
                <Select
                  value=""
                  onValueChange={(v) => {
                    // Dropdown — shortcut: выбор пресета пишет его в Input.
                    // Input — единственный source of truth, можно дописать вручную.
                    update(idx, { role_key: v })
                  }}
                >
                  <SelectTrigger className="w-44 shrink-0">
                    <SelectValue placeholder="Готовые шаблоны…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_KEY_PRESETS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground pl-26">
                Поле редактируется вручную. Дропдаун справа — пресеты для удобства.
                Полный список форматов role_key — см. <code>docs/edo_admin_guide.md</code>.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Действие</Label>
                <Select
                  value={step.action}
                  onValueChange={(v) => update(idx, { action: v as AdminChainStep["action"] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">SLA (часы)</Label>
                <Input
                  type="number"
                  value={step.sla_hours ?? ""}
                  onChange={(e) =>
                    update(idx, { sla_hours: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  placeholder="24"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Параллельная группа</Label>
                <Input
                  value={step.parallel_group ?? ""}
                  onChange={(e) => update(idx, { parallel_group: e.target.value })}
                  placeholder="напр. review"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Режим параллели</Label>
                <Select
                  value={step.parallel_mode ?? "and"}
                  onValueChange={(v) => update(idx, { parallel_mode: v as "and" | "or" })}
                  disabled={!step.parallel_group}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="and">Все (AND)</SelectItem>
                    <SelectItem value="or">Любой (OR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="mr-2 h-4 w-4" />Добавить шаг
      </Button>
    </div>
  )
}
