import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"
import { MultiSelect } from "./MultiSelect"

const options = [
  { value: 1, label: "Терминал РЗА" },
  { value: 2, label: "Шкаф управления" },
  { value: 3, label: "Контроллер" },
]

describe("MultiSelect", () => {
  it("renders placeholder when nothing selected", () => {
    render(
      <MultiSelect
        options={options}
        value={[]}
        onChange={() => {}}
        placeholder="Выберите оборудование..."
      />,
    )
    expect(screen.getByRole("combobox")).toHaveTextContent("Выберите оборудование...")
  })

  it("shows selected count when items are selected", () => {
    render(
      <MultiSelect
        options={options}
        value={[1, 2]}
        onChange={() => {}}
      />,
    )
    expect(screen.getByRole("combobox")).toHaveTextContent("Выбрано: 2")
  })

  it("renders badges for selected items", () => {
    render(
      <MultiSelect
        options={options}
        value={[1, 3]}
        onChange={() => {}}
      />,
    )
    expect(screen.getByText("Терминал РЗА")).toBeInTheDocument()
    expect(screen.getByText("Контроллер")).toBeInTheDocument()
  })

  it("calls onChange when removing a badge", async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <MultiSelect
        options={options}
        value={[1, 2]}
        onChange={onChange}
      />,
    )

    // Click the X button on the first badge
    const removeButtons = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".size-3"),
    )
    await user.click(removeButtons[0])

    expect(onChange).toHaveBeenCalledWith([2])
  })

  it("is disabled when disabled prop is true", () => {
    render(
      <MultiSelect
        options={options}
        value={[]}
        onChange={() => {}}
        disabled
      />,
    )
    expect(screen.getByRole("combobox")).toBeDisabled()
  })
})
