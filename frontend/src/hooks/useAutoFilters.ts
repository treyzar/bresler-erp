import { useCallback, useMemo, useState } from "react"
import type { FilterMeta } from "@/api/hooks/useFilterMeta"
import type { ListParams } from "@/api/types"

/**
 * Manages filter state based on filter metadata from /meta/ endpoint.
 * Returns current values, setter, reset, active filter detection, and
 * a params object ready to pass to API calls.
 */
export function useAutoFilters(filters: FilterMeta[] | undefined) {
  const [values, setValues] = useState<Record<string, string>>({})

  const setValue = useCallback((name: string, value: string) => {
    setValues((prev) => {
      if (!value || value === "all") {
        const next = { ...prev }
        delete next[name]
        return next
      }
      return { ...prev, [name]: value }
    })
  }, [])

  const reset = useCallback(() => {
    setValues({})
  }, [])

  const hasActiveFilters = useMemo(
    () => Object.keys(values).length > 0,
    [values],
  )

  /** Build API params from current filter values. */
  const params = useMemo(() => {
    const result: ListParams = {}
    for (const [key, val] of Object.entries(values)) {
      if (val && val !== "all") {
        ;(result as Record<string, unknown>)[key] = val
      }
    }
    return result
  }, [values])

  return { values, setValue, reset, hasActiveFilters, params }
}
