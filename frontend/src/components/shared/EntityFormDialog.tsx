import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface EntityFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
}

export function EntityFormDialog({
  open,
  onOpenChange,
  title,
  children,
}: EntityFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
