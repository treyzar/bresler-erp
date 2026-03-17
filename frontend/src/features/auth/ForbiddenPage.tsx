import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"

export function ForbiddenPage() {
  const navigate = useNavigate()

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-6xl font-bold text-muted-foreground">403</h1>
      <p className="text-xl font-medium">Доступ запрещён</p>
      <p className="text-muted-foreground">У вас нет прав для просмотра этого раздела.</p>
      <Button variant="outline" onClick={() => navigate(-1)}>
        Назад
      </Button>
    </div>
  )
}
