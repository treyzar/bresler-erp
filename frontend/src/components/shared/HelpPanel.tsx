/** Inline-хелп для страниц: круглая `?`-кнопка → выезжающая боковая панель
 *  с детальным описанием раздела и подсказками.
 *
 *  Использование:
 *    <HelpPanel title="Мои документы">
 *      <p>...</p>
 *      <ul>...</ul>
 *    </HelpPanel>
 *
 *  Можно встраивать как угодно в header страницы. Внутри children — обычный
 *  TSX, поддерживается prose-стиль (списки, заголовки, код).
 */
import { HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet"

interface HelpPanelProps {
  title: string
  /** Короткое описание под заголовком панели. Опционально. */
  description?: string
  /** Текст кнопки на ховере / для screen reader'ов. По умолчанию «Помощь». */
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
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
          aria-label={ariaLabel}
          title={ariaLabel}
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="px-4 pb-6 prose prose-sm max-w-none
          prose-headings:font-semibold
          prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2
          prose-p:text-sm prose-p:leading-relaxed
          prose-ul:text-sm prose-ul:my-2
          prose-li:my-0.5
          prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
          prose-strong:text-foreground">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}
