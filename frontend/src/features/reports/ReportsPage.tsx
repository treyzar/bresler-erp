import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { BarChart3, PieChart, TrendingUp, AlertTriangle, CreditCard, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import apiClient from "@/api/client"
import { ReportView } from "./ReportView"

interface ReportMeta {
  name: string
  title: string
  description: string
  filters: any[]
  columns: any[]
  chart: any
}

const reportIcons: Record<string, typeof BarChart3> = {
  orders_by_status: PieChart,
  orders_by_manager: Users,
  orders_by_customer: BarChart3,
  overdue_orders: AlertTriangle,
  orders_timeline: TrendingUp,
  contract_payments: CreditCard,
}

export function ReportsPage() {
  const [activeReport, setActiveReport] = useState<string | null>(null)

  const { data: reports = [] } = useQuery({
    queryKey: ["reports", "list"],
    queryFn: async () => {
      const { data } = await apiClient.get<ReportMeta[]>("/reports/")
      return data
    },
  })

  if (activeReport) {
    return (
      <ReportView
        reportName={activeReport}
        onBack={() => setActiveReport(null)}
      />
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Отчёты</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Аналитика по заказам, контрактам и организациям
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => {
          const Icon = reportIcons[report.name] || BarChart3
          return (
            <Card
              key={report.name}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5"
              onClick={() => setActiveReport(report.name)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-base">{report.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{report.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
