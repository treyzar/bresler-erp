import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import {
  FileText, ClockAlert, CalendarSync, Mail, Plane, Bell, HelpCircle,
  TrendingUp, Award, CalendarX, BellRing,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronLeft } from "lucide-react"
import { internalDocsApi } from "../api/client"
import type { DocumentType } from "../api/types"

const ICONS: Record<string, React.ElementType> = {
  "file-text": FileText,
  "clock-alert": ClockAlert,
  "calendar-sync": CalendarSync,
  "mail": Mail,
  "plane": Plane,
  "bell": Bell,
  // Phase 2 типы
  "trending-up": TrendingUp,
  "award": Award,
  "calendar-x": CalendarX,
  "bell-ring": BellRing,
}

export function CatalogPage() {
  const { data: types, isLoading } = useQuery({
    queryKey: ["internal-docs", "types"],
    queryFn: () => internalDocsApi.listTypes(),
  })

  const byCategory = (types ?? []).reduce<Record<string, DocumentType[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = []
    acc[t.category].push(t)
    return acc
  }, {})

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <Button variant="ghost" asChild className="-ml-3">
        <Link to="/edo/my">
          <ChevronLeft className="mr-2 h-4 w-4" />
          К моим документам
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Создать документ</h1>
        <p className="text-muted-foreground mt-1">
          Выберите тип документа, который хотите создать.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        Object.entries(byCategory).map(([category, items]) => (
          <section key={category} className="space-y-3">
            <h2 className="text-xl font-semibold">{items[0].category_display}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((t) => (
                <TypeCard key={t.code} type={t} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

function TypeCard({ type }: { type: DocumentType }) {
  const Icon = ICONS[type.icon] ?? HelpCircle
  return (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer">
      <Link to={`/edo/new/${type.code}`}>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-secondary/80 p-2">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base leading-snug">{type.name}</CardTitle>
            </div>
          </div>
        </CardHeader>
        {type.description && (
          <CardContent className="pt-0">
            <CardDescription className="line-clamp-2">{type.description}</CardDescription>
          </CardContent>
        )}
      </Link>
    </Card>
  )
}
