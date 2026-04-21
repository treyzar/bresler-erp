import { useNavigate } from "react-router"
import {
  Mail,
  FileText,
  ClipboardList,
  StickyNote,
  Wrench,
  Scan,
} from "lucide-react"

interface EdoSection {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  available: boolean
  badge?: string
}

const sections: EdoSection[] = [
  {
    title: "Мои документы",
    description: "Служебки, заявления, уведомления: создание, согласование, архив. Инбокс входящих на согласование.",
    href: "/edo/my",
    icon: <ClipboardList className="h-8 w-8" />,
    available: true,
    badge: "Новое",
  },
  {
    title: "Реестр писем",
    description: "Входящие и исходящие письма. Регистрация, поиск, история изменений, вложения.",
    href: "/edo/registry",
    icon: <Mail className="h-8 w-8" />,
    available: true,
  },
  {
    title: "Служебные записки (legacy)",
    description: "Старый путь; переехал в «Мои документы».",
    href: "/edo/my",
    icon: <StickyNote className="h-8 w-8" />,
    available: true,
    badge: "→ Мои документы",
  },
  {
    title: "Шаблоны документов",
    description: "Редактор шаблонов с плейсхолдерами. Генерация PDF и DOCX из шаблонов.",
    href: "/edo/templates",
    icon: <FileText className="h-8 w-8" />,
    available: true,
  },
  {
    title: "Конструктор",
    description: "Визуальный редактор документов с позиционированием элементов на холсте.",
    href: "/edo/builder",
    icon: <Wrench className="h-8 w-8" />,
    available: true,
  },
  {
    title: "Распознавание документов",
    description: "Загрузка и автоматическое извлечение данных из PDF, DOCX и HTML в формат редактора.",
    href: "/edo/parser",
    icon: <Scan className="h-8 w-8" />,
    available: true,
  },
]

export function EdoHomePage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-8 p-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Электронный документооборот</h1>
        <p className="mt-2 text-muted-foreground">
          Управление документами, письмами и внутренней перепиской организации.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => (
          <button
            key={section.href}
            onClick={() => section.available && navigate(section.href)}
            disabled={!section.available}
            className={[
              "group relative flex flex-col gap-4 rounded-xl border p-6 text-left transition-all",
              section.available
                ? "cursor-pointer hover:border-primary hover:shadow-md hover:bg-accent/30"
                : "cursor-default opacity-60",
            ].join(" ")}
          >
            {section.badge && (
              <span className="absolute top-4 right-4 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {section.badge}
              </span>
            )}
            <div className={[
              "w-14 h-14 rounded-lg flex items-center justify-center transition-colors",
              section.available
                ? "bg-primary/10 text-primary group-hover:bg-primary/20"
                : "bg-muted text-muted-foreground",
            ].join(" ")}>
              {section.icon}
            </div>
            <div>
              <p className="font-semibold text-base">{section.title}</p>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {section.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
