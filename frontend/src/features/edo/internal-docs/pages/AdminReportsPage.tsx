/** Отчёты по EDO для админа: висящие документы, нарушения SLA, топ по типам.
 *
 *  Бэкенд: 3 endpoint'а под /admin/reports/. Все принимают `?days=N`. */
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, AlertTriangle, Clock, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import api from "@/api/client"

interface StuckDoc {
  id: number
  number: string
  title: string
  type_name: string
  author: string
  submitted_at: string | null
  days_pending: number | null
  current_step_label: string
  current_approver: string
}

interface SlaBreach {
  step_id: number
  document_id: number
  number: string
  type_name: string
  role_label: string
  approver: string
  sla_due_at: string | null
  sla_breached_at: string | null
  current_status: string
}

interface TopRow {
  type_code: string
  type_name: string
  total: number
  approved: number
  rejected: number
  pending: number
}

const fetchReport = async <T,>(path: string, days: number): Promise<{ results: T[] }> => {
  const r = await api.get(path, { params: { days } })
  return r.data
}

export function AdminReportsPage() {
  const { data: stuck, isLoading: l1 } = useQuery({
    queryKey: ["edo-report", "stuck", 3],
    queryFn: () => fetchReport<StuckDoc>("/edo/internal/admin/reports/stuck-documents/", 3),
  })

  const { data: breaches, isLoading: l2 } = useQuery({
    queryKey: ["edo-report", "sla", 30],
    queryFn: () => fetchReport<SlaBreach>("/edo/internal/admin/reports/sla-breaches/", 30),
  })

  const { data: top, isLoading: l3 } = useQuery({
    queryKey: ["edo-report", "top", 30],
    queryFn: () => fetchReport<TopRow>("/edo/internal/admin/reports/top-by-type/", 30),
  })

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <Button variant="ghost" asChild className="-ml-3">
        <Link to="/edo/my">
          <ChevronLeft className="mr-2 h-4 w-4" />К моим документам
        </Link>
      </Button>

      <header>
        <h1 className="text-3xl font-bold tracking-tight">Отчёты ЭДО</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Висящие документы (≥ 3 дней в работе)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {l1 ? <Skeleton className="h-32" /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>№</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Заголовок</TableHead>
                  <TableHead>Автор</TableHead>
                  <TableHead>На ком висит</TableHead>
                  <TableHead className="text-right">Дней</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(stuck?.results ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">
                      <Link to={`/edo/documents/${r.id}`} className="hover:underline">{r.number}</Link>
                    </TableCell>
                    <TableCell className="text-sm">{r.type_name}</TableCell>
                    <TableCell className="max-w-md truncate">{r.title}</TableCell>
                    <TableCell className="text-sm">{r.author}</TableCell>
                    <TableCell className="text-sm">
                      {r.current_step_label}
                      {r.current_approver && (
                        <span className="text-muted-foreground"> — {r.current_approver}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">{r.days_pending}</TableCell>
                  </TableRow>
                ))}
                {(stuck?.results ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Зависших документов нет.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Нарушения SLA за 30 дней
          </CardTitle>
        </CardHeader>
        <CardContent>
          {l2 ? <Skeleton className="h-32" /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Документ</TableHead>
                  <TableHead>Шаг</TableHead>
                  <TableHead>Согласующий</TableHead>
                  <TableHead>SLA до</TableHead>
                  <TableHead>Зафиксировано</TableHead>
                  <TableHead>Статус шага</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(breaches?.results ?? []).map((r) => (
                  <TableRow key={r.step_id}>
                    <TableCell className="font-mono text-xs">
                      <Link to={`/edo/documents/${r.document_id}`} className="hover:underline">{r.number}</Link>
                    </TableCell>
                    <TableCell className="text-sm">{r.role_label}</TableCell>
                    <TableCell className="text-sm">{r.approver}</TableCell>
                    <TableCell className="text-sm">
                      {r.sla_due_at ? new Date(r.sla_due_at).toLocaleString("ru-RU") : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.sla_breached_at ? new Date(r.sla_breached_at).toLocaleString("ru-RU") : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{r.current_status}</TableCell>
                  </TableRow>
                ))}
                {(breaches?.results ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Просрочек SLA не зафиксировано.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Топ типов за 30 дней
          </CardTitle>
        </CardHeader>
        <CardContent>
          {l3 ? <Skeleton className="h-32" /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тип</TableHead>
                  <TableHead className="text-right">Всего</TableHead>
                  <TableHead className="text-right">Согласовано</TableHead>
                  <TableHead className="text-right">Отклонено</TableHead>
                  <TableHead className="text-right">В работе</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(top?.results ?? []).map((r) => (
                  <TableRow key={r.type_code}>
                    <TableCell>{r.type_name}</TableCell>
                    <TableCell className="text-right font-mono">{r.total}</TableCell>
                    <TableCell className="text-right text-green-700 font-mono">{r.approved}</TableCell>
                    <TableCell className="text-right text-destructive font-mono">{r.rejected}</TableCell>
                    <TableCell className="text-right font-mono">{r.pending}</TableCell>
                  </TableRow>
                ))}
                {(top?.results ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Документов за 30 дней нет.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
