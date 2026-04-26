/** Inline-хелп для страниц: круглая `?`-кнопка → выезжающая боковая панель
 *  с детальным описанием раздела.
 *
 *  Стилевая система: структурированные блоки вместо голого prose-текста.
 *  Каждая секция — отдельный визуальный блок с иконкой и заголовком,
 *  callout'ы выделяют важные моменты цветом, шаги нумеруются stepper'ом.
 *
 *  Использование:
 *    <HelpPanel title="Мои документы">
 *      <HelpSection icon={Inbox} title="Четыре вкладки">
 *        <HelpItem label="Ждут меня">Описание...</HelpItem>
 *      </HelpSection>
 *      <HelpCallout variant="warning">Важное предупреждение</HelpCallout>
 *      <HelpSteps>
 *        <HelpStep n={1} title="Заголовок">Шаг 1...</HelpStep>
 *      </HelpSteps>
 *    </HelpPanel>
 */
import * as React from "react"
import { HelpCircle, Info, AlertTriangle, Lightbulb, CheckCircle2, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet"

// ============== главный контейнер ==============

interface HelpPanelProps {
  title: string
  description?: string
  ariaLabel?: string
  children: React.ReactNode
}

export function HelpPanel({
  title, description, ariaLabel = "Помощь по разделу", children,
}: HelpPanelProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
          aria-label={ariaLabel}
          title={ariaLabel}
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto p-0"
      >
        <SheetHeader className="border-b px-6 py-4 bg-muted/30">
          <SheetTitle className="text-lg">{title}</SheetTitle>
          {description && (
            <SheetDescription className="text-sm">{description}</SheetDescription>
          )}
        </SheetHeader>
        <div className="px-6 py-5 space-y-5">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}


// ============== секция с иконкой + заголовком ==============

interface HelpSectionProps {
  icon?: LucideIcon
  title: string
  /** Тон акцентной полоски слева. */
  tone?: "default" | "primary" | "amber" | "green" | "red"
  children: React.ReactNode
}

const TONE_BAR: Record<NonNullable<HelpSectionProps["tone"]>, string> = {
  default: "bg-border",
  primary: "bg-primary",
  amber: "bg-amber-500",
  green: "bg-green-500",
  red: "bg-destructive",
}

const TONE_ICON_BG: Record<NonNullable<HelpSectionProps["tone"]>, string> = {
  default: "bg-muted text-foreground",
  primary: "bg-primary/10 text-primary",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  green: "bg-green-500/10 text-green-600 dark:text-green-400",
  red: "bg-destructive/10 text-destructive",
}

export function HelpSection({ icon: Icon, title, tone = "default", children }: HelpSectionProps) {
  return (
    <section className="relative rounded-lg border bg-card overflow-hidden">
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", TONE_BAR[tone])} />
      <div className="px-4 py-3 pl-5">
        <header className="flex items-center gap-2 mb-2">
          {Icon && (
            <span className={cn("inline-flex items-center justify-center rounded-md w-7 h-7 shrink-0", TONE_ICON_BG[tone])}>
              <Icon className="h-4 w-4" />
            </span>
          )}
          <h3 className="text-sm font-semibold leading-tight">{title}</h3>
        </header>
        <div className="text-sm leading-relaxed text-muted-foreground space-y-2 [&_strong]:text-foreground [&_strong]:font-semibold [&_code]:font-mono [&_code]:text-xs [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded">
          {children}
        </div>
      </div>
    </section>
  )
}


// ============== пункт списка с label + описанием ==============

interface HelpItemProps {
  /** Bold-метка слева (обычно — название вкладки/опции). */
  label: string
  children: React.ReactNode
}

export function HelpItem({ label, children }: HelpItemProps) {
  return (
    <div className="flex gap-2 py-0.5">
      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
      <div>
        <span className="font-semibold text-foreground">{label}.</span>{" "}
        <span>{children}</span>
      </div>
    </div>
  )
}


// ============== callout: info / warning / tip ==============

type CalloutVariant = "info" | "warning" | "tip" | "danger"

interface HelpCalloutProps {
  variant?: CalloutVariant
  title?: string
  children: React.ReactNode
}

const CALLOUT_STYLES: Record<CalloutVariant, { wrap: string; icon: LucideIcon; iconClass: string }> = {
  info: {
    wrap: "border-blue-500/30 bg-blue-500/5 text-foreground",
    icon: Info,
    iconClass: "text-blue-600 dark:text-blue-400",
  },
  warning: {
    wrap: "border-amber-500/40 bg-amber-500/5 text-foreground",
    icon: AlertTriangle,
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  tip: {
    wrap: "border-emerald-500/30 bg-emerald-500/5 text-foreground",
    icon: Lightbulb,
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  danger: {
    wrap: "border-destructive/40 bg-destructive/5 text-foreground",
    icon: AlertTriangle,
    iconClass: "text-destructive",
  },
}

const CALLOUT_TITLE: Record<CalloutVariant, string> = {
  info: "К сведению",
  warning: "Внимание",
  tip: "Совет",
  danger: "Важно",
}

export function HelpCallout({ variant = "info", title, children }: HelpCalloutProps) {
  const cfg = CALLOUT_STYLES[variant]
  const Icon = cfg.icon
  return (
    <div className={cn("flex gap-3 rounded-lg border px-3 py-2.5 text-sm leading-relaxed", cfg.wrap)}>
      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", cfg.iconClass)} />
      <div className="space-y-1 [&_strong]:font-semibold [&_code]:font-mono [&_code]:text-xs [&_code]:bg-background [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded">
        <div className="font-semibold">{title ?? CALLOUT_TITLE[variant]}</div>
        <div className="text-muted-foreground">{children}</div>
      </div>
    </div>
  )
}


// ============== пошаговые инструкции ==============

interface HelpStepsProps {
  children: React.ReactNode
}

export function HelpSteps({ children }: HelpStepsProps) {
  return <ol className="space-y-2.5">{children}</ol>
}

interface HelpStepProps {
  n: number
  title?: string
  children: React.ReactNode
}

export function HelpStep({ n, title, children }: HelpStepProps) {
  return (
    <li className="flex gap-3 text-sm">
      <span className="flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold mt-0.5">
        {n}
      </span>
      <div className="flex-1 leading-relaxed [&_strong]:font-semibold [&_code]:font-mono [&_code]:text-xs [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded">
        {title && <div className="font-semibold text-foreground mb-0.5">{title}</div>}
        <div className="text-muted-foreground">{children}</div>
      </div>
    </li>
  )
}


// ============== compact key-value list (для «Что есть в таблице» и т.п.) ==============

interface HelpDefListProps {
  children: React.ReactNode
}

export function HelpDefList({ children }: HelpDefListProps) {
  return <dl className="space-y-2 text-sm">{children}</dl>
}

interface HelpDefProps {
  term: string
  children: React.ReactNode
}

export function HelpDef({ term, children }: HelpDefProps) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3">
      <dt className="font-semibold text-foreground text-xs uppercase tracking-wide pt-0.5">{term}</dt>
      <dd className="text-muted-foreground leading-relaxed [&_strong]:text-foreground [&_strong]:font-semibold [&_code]:font-mono [&_code]:text-xs [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded">{children}</dd>
    </div>
  )
}
