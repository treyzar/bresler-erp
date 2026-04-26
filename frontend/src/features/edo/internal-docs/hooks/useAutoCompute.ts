/**
 * Per-type автокалькуляции значений field_values.
 *
 * Реактивно пересчитывает производные поля и пишет их в values на каждом
 * onChange источника. Вычисление детерминировано — поэтому не зацикливается:
 * если новое значение равно старому, setValues не вызывается.
 *
 * Поддерживаемые типы:
 * - memo_bonus_monthly / memo_bonus_quarterly: total = sum(employees_with_amounts.amount)
 * - travel_estimate: total = transport_cost + lodging_cost + per_diem
 *   (per_diem остаётся ручным — командировочные суточные сильно зависят
 *    от региона/политики, проще оставить пользователю править).
 */
import { useEffect } from "react"

type Values = Record<string, unknown>
type SetValues = (updater: (prev: Values) => Values) => void

const BONUS_TYPES = new Set(["memo_bonus_monthly", "memo_bonus_quarterly"])
const TRAVEL_TYPE = "travel_estimate"

function asNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function bonusTotal(values: Values): number {
  const rows = values.employees_with_amounts
  if (!Array.isArray(rows)) return 0
  return rows.reduce<number>((sum, row) => {
    if (row && typeof row === "object" && !Array.isArray(row)) {
      return sum + asNumber((row as Record<string, unknown>).amount)
    }
    return sum
  }, 0)
}

function travelTotal(values: Values): number {
  return (
    asNumber(values.transport_cost) +
    asNumber(values.lodging_cost) +
    asNumber(values.per_diem)
  )
}

export function useAutoCompute(typeCode: string | undefined, values: Values, setValues: SetValues) {
  useEffect(() => {
    if (!typeCode) return

    let computed: Partial<Values> | null = null

    if (BONUS_TYPES.has(typeCode)) {
      const total = bonusTotal(values)
      if (asNumber(values.total) !== total) computed = { total }
    } else if (typeCode === TRAVEL_TYPE) {
      const total = travelTotal(values)
      if (asNumber(values.total) !== total) computed = { total }
    }

    if (computed) {
      setValues((prev) => ({ ...prev, ...computed! }))
    }
  }, [typeCode, values, setValues])
}
