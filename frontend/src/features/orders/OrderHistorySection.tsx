import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useOrderHistory } from "@/api/hooks/useOrders"

const HISTORY_TYPE_LABELS: Record<string, string> = {
  "+": "Создание",
  "~": "Изменение",
  "-": "Удаление",
}

const HISTORY_TYPE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  "+": "default",
  "~": "secondary",
  "-": "destructive",
}

interface OrderHistorySectionProps {
  orderId: number
}

export function OrderHistorySection({ orderId }: OrderHistorySectionProps) {
  const { data: history, isLoading } = useOrderHistory(orderId)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground text-center">Нет записей истории</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {history.map((record) => (
        <Card key={record.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={HISTORY_TYPE_VARIANT[record.type] ?? "outline"} className="text-xs">
                  {HISTORY_TYPE_LABELS[record.type] ?? record.type}
                </Badge>
                {record.user && (
                  <span className="text-sm text-muted-foreground">{record.user}</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(record.date).toLocaleString("ru")}
              </span>
            </div>
          </CardHeader>
          {record.changes.length > 0 && (
            <CardContent className="pt-0">
              <div className="space-y-1.5">
                {record.changes.map((change, i) => (
                  <div key={i} className="text-sm flex gap-2">
                    <span className="text-muted-foreground shrink-0 font-medium">
                      {change.field}:
                    </span>
                    <span>
                      {change.old != null ? (
                        <>
                          <span className="line-through text-destructive/70">{change.old}</span>
                          {" → "}
                          <span className="font-medium">{change.new || "—"}</span>
                        </>
                      ) : (
                        <span className="font-medium">{change.new || "—"}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}
