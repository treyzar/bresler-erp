import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { useUserList } from "@/api/hooks/useUsers"
import { useDebounce } from "@/hooks/useDebounce"
import type { User } from "@/api/types"
import { cn } from "@/lib/utils"

interface Props {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  rows?: number
  className?: string
}

const TRIGGER_RE = /@([\w.-]*)$/

export const MentionTextarea = forwardRef<HTMLTextAreaElement, Props>(function MentionTextarea(
  { value, onChange, onKeyDown, placeholder, rows, className },
  ref,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  useImperativeHandle(ref, () => textareaRef.current!, [])

  const [query, setQuery] = useState<string | null>(null)
  const [mentionStart, setMentionStart] = useState(0)
  const [activeIdx, setActiveIdx] = useState(0)

  const debouncedQuery = useDebounce(query ?? "", 150)
  const { data: usersData } = useUserList(
    query !== null ? { search: debouncedQuery, page_size: 8 } : undefined,
  )
  const users: User[] = query !== null ? (usersData?.results ?? []) : []

  useEffect(() => {
    setActiveIdx(0)
  }, [debouncedQuery])

  const detectMention = (text: string, cursor: number) => {
    const before = text.substring(0, cursor)
    const match = before.match(TRIGGER_RE)
    if (match) {
      setMentionStart(cursor - match[0].length)
      setQuery(match[1])
    } else {
      setQuery(null)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    detectMention(e.target.value, e.target.selectionStart)
  }

  const insertMention = (user: User) => {
    const cursor = textareaRef.current?.selectionStart ?? value.length
    const before = value.substring(0, mentionStart)
    const after = value.substring(cursor)
    const insertion = `@${user.username} `
    const newValue = before + insertion + after
    onChange(newValue)
    setQuery(null)
    const newCursor = before.length + insertion.length
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(newCursor, newCursor)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (query !== null && users.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIdx((i) => (i + 1) % users.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIdx((i) => (i - 1 + users.length) % users.length)
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        insertMention(users[activeIdx])
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setQuery(null)
        return
      }
    }
    onKeyDown?.(e)
  }

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />
      {query !== null && users.length > 0 && (
        <div className="absolute z-20 bottom-full mb-1 left-0 w-72 max-h-56 overflow-auto rounded-md border bg-popover shadow-md">
          {users.map((u, idx) => (
            <button
              key={u.id}
              type="button"
              className={cn(
                "block w-full px-3 py-2 text-left text-sm transition-colors",
                idx === activeIdx ? "bg-accent" : "hover:bg-muted",
              )}
              onMouseDown={(e) => {
                e.preventDefault()
                insertMention(u)
              }}
            >
              <span className="font-medium">@{u.username}</span>
              {u.full_name && (
                <span className="ml-2 text-muted-foreground">{u.full_name}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
})
