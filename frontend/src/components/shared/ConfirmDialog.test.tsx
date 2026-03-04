import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ConfirmDialog } from "./ConfirmDialog"

describe("ConfirmDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: "Удалить запись?",
    description: "Это действие нельзя отменить.",
    onConfirm: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders title and description when open", () => {
    render(<ConfirmDialog {...defaultProps} />)

    expect(screen.getByText("Удалить запись?")).toBeInTheDocument()
    expect(screen.getByText("Это действие нельзя отменить.")).toBeInTheDocument()
  })

  it("does not render content when closed", () => {
    render(<ConfirmDialog {...defaultProps} open={false} />)

    expect(screen.queryByText("Удалить запись?")).not.toBeInTheDocument()
  })

  it("renders default confirm label 'Удалить'", () => {
    render(<ConfirmDialog {...defaultProps} />)

    expect(screen.getByRole("button", { name: "Удалить" })).toBeInTheDocument()
  })

  it("renders custom confirm label", () => {
    render(<ConfirmDialog {...defaultProps} confirmLabel="Подтвердить" />)

    expect(screen.getByRole("button", { name: "Подтвердить" })).toBeInTheDocument()
  })

  it("renders cancel button", () => {
    render(<ConfirmDialog {...defaultProps} />)

    expect(screen.getByRole("button", { name: "Отмена" })).toBeInTheDocument()
  })

  it("calls onConfirm when confirm button is clicked", async () => {
    const user = userEvent.setup()
    render(<ConfirmDialog {...defaultProps} />)

    await user.click(screen.getByRole("button", { name: "Удалить" }))

    expect(defaultProps.onConfirm).toHaveBeenCalledOnce()
  })

  it("shows loading text when loading", () => {
    render(<ConfirmDialog {...defaultProps} loading={true} />)

    expect(screen.getByRole("button", { name: "Удаление..." })).toBeInTheDocument()
  })

  it("disables buttons when loading", () => {
    render(<ConfirmDialog {...defaultProps} loading={true} />)

    expect(screen.getByRole("button", { name: "Удаление..." })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Отмена" })).toBeDisabled()
  })
})
