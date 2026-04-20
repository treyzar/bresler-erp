import { Construction } from "lucide-react"

interface Props {
  title: string
  hint?: string
}

export function ComingSoon({ title, hint }: Props) {
  return (
    <div className="flex flex-1 items-center justify-center p-12">
      <div className="flex flex-col items-center gap-3 text-center max-w-md">
        <div className="rounded-full bg-muted p-4">
          <Construction className="size-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {hint ?? "Раздел находится в разработке."}
        </p>
      </div>
    </div>
  )
}
