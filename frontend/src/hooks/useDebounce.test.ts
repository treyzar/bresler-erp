import { renderHook, act } from "@testing-library/react"
import { useDebounce } from "./useDebounce"

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 300))
    expect(result.current).toBe("hello")
  })

  it("does not update value before delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "initial" } },
    )

    rerender({ value: "updated" })
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current).toBe("initial")
  })

  it("updates value after delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "initial" } },
    )

    rerender({ value: "updated" })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current).toBe("updated")
  })

  it("resets timer on rapid changes and only applies last value", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "a" } },
    )

    rerender({ value: "b" })
    act(() => { vi.advanceTimersByTime(100) })

    rerender({ value: "c" })
    act(() => { vi.advanceTimersByTime(100) })

    rerender({ value: "d" })
    act(() => { vi.advanceTimersByTime(300) })

    expect(result.current).toBe("d")
  })

  it("uses default delay of 300ms", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: "start" } },
    )

    rerender({ value: "end" })
    act(() => { vi.advanceTimersByTime(299) })
    expect(result.current).toBe("start")

    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current).toBe("end")
  })

  it("works with non-string types", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 42 } },
    )

    rerender({ value: 99 })
    act(() => { vi.advanceTimersByTime(100) })

    expect(result.current).toBe(99)
  })
})
