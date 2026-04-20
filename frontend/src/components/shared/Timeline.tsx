import { useState } from "react"
import {
  MessageSquare,
  History,
  FileText,
  User,
  Send,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MentionTextarea } from "@/components/shared/MentionTextarea"
import { useAuthStore } from "@/stores/useAuthStore"
import { useComments, useCreateComment, useDeleteComment } from "@/api/hooks/useComments"
import { useCommentsSocket } from "@/hooks/useCommentsSocket"
import type { Comment } from "@/api/types"
import { formatDistanceToNow } from "@/lib/utils"

/**
 * A history record from simple_history API.
 */
export interface HistoryRecord {
  id: number
  type: string // "+", "~", "-"
  date: string
  user: string | null
  changes: { field: string; old: string | null; new: string | null }[]
}

/**
 * Unified timeline entry — either a comment or a history change.
 */
interface TimelineEntry {
  kind: "comment" | "history"
  date: string
  comment?: Comment
  history?: HistoryRecord
}

interface TimelineProps {
  targetModel: string
  targetId: number
  history?: HistoryRecord[]
  historyLoading?: boolean
}

/**
 * Unified Timeline: merges comments and simple_history records
 * into a single chronological feed.
 *
 * Inspired by ERPNext's document timeline which combines
 * activity log, comments, and file changes in one view.
 */
export function Timeline({
  targetModel,
  targetId,
  history = [],
  historyLoading = false,
}: TimelineProps) {
  const { data: comments = [], isLoading: commentsLoading } = useComments(targetModel, targetId)
  const createComment = useCreateComment(targetModel, targetId)
  const deleteComment = useDeleteComment(targetModel, targetId)
  const currentUser = useAuthStore((s) => s.user)

  useCommentsSocket(targetModel, targetId)

  const [commentText, setCommentText] = useState("")

  const handleSubmit = () => {
    const text = commentText.trim()
    if (!text) return
    createComment.mutate(text, {
      onSuccess: () => setCommentText(""),
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Merge comments and history into a single timeline
  const entries: TimelineEntry[] = [
    ...comments.map((c) => ({
      kind: "comment" as const,
      date: c.created_at,
      comment: c,
    })),
    ...history.map((h) => ({
      kind: "history" as const,
      date: h.date,
      history: h,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const isLoading = commentsLoading || historyLoading

  return (
    <div className="space-y-4">
      {/* Comment form */}
      <div className="space-y-2">
        <MentionTextarea
          placeholder="Оставить комментарий... (@ для упоминаний, Ctrl+Enter для отправки)"
          value={commentText}
          onChange={setCommentText}
          onKeyDown={handleKeyDown}
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!commentText.trim() || createComment.isPending}
          >
            <Send className="size-4 mr-1" />
            {createComment.isPending ? "Отправка..." : "Отправить"}
          </Button>
        </div>
      </div>

      {/* Timeline entries */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          Загрузка...
        </div>
      ) : entries.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          Нет записей
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-0">
            {entries.map((entry, i) => (
              <div key={`${entry.kind}-${entry.kind === "comment" ? entry.comment!.id : entry.history!.id}-${i}`}>
                {entry.kind === "comment" ? (
                  <CommentEntry
                    comment={entry.comment!}
                    isOwn={currentUser?.id === entry.comment!.author}
                    onDelete={() => deleteComment.mutate(entry.comment!.id)}
                  />
                ) : (
                  <HistoryEntry record={entry.history!} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CommentEntry({
  comment,
  isOwn,
  onDelete,
}: {
  comment: Comment
  isOwn: boolean
  onDelete: () => void
}) {
  return (
    <div className="relative pl-10 py-3 group">
      {/* Icon */}
      <div className="absolute left-2 top-4 size-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
        <MessageSquare className="size-3 text-blue-500" />
      </div>

      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {comment.author_name || comment.author_username}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(comment.created_at)}
            </span>
          </div>
          {isOwn && (
            <Button
              variant="ghost"
              size="sm"
              className="size-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onDelete}
            >
              <Trash2 className="size-3 text-muted-foreground" />
            </Button>
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap">{renderCommentText(comment.text, comment.mentioned_users)}</p>
      </div>
    </div>
  )
}

function HistoryEntry({ record }: { record: HistoryRecord }) {
  const typeLabels: Record<string, string> = {
    "+": "Создание",
    "~": "Изменение",
    "-": "Удаление",
  }

  const typeIcons: Record<string, typeof History> = {
    "+": FileText,
    "~": History,
    "-": Trash2,
  }

  const typeColors: Record<string, string> = {
    "+": "bg-green-100 dark:bg-green-900/30 text-green-600",
    "~": "bg-amber-100 dark:bg-amber-900/30 text-amber-600",
    "-": "bg-red-100 dark:bg-red-900/30 text-red-600",
  }

  const Icon = typeIcons[record.type] || History
  const colorClass = typeColors[record.type] || "bg-muted text-muted-foreground"

  return (
    <div className="relative pl-10 py-2">
      {/* Icon */}
      <div className={`absolute left-2 top-3 size-5 rounded-full flex items-center justify-center ${colorClass}`}>
        <Icon className="size-3" />
      </div>

      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {record.user && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="size-3" />
                {record.user}
              </span>
            )}
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0"
            >
              {typeLabels[record.type] || record.type}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(record.date)}
            </span>
          </div>

          {record.changes.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {record.changes.map((change, i) => (
                <div key={i} className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground/70">{change.field}:</span>{" "}
                  {change.old != null ? (
                    <>
                      <span className="line-through text-destructive/60">{change.old}</span>
                      {" → "}
                      <span className="text-foreground">{change.new || "—"}</span>
                    </>
                  ) : (
                    <span className="text-foreground">{change.new || "—"}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function renderCommentText(text: string, mentionedUsers: Record<string, string> = {}) {
  return text.split(/(@[\w.-]+)/g).map((part, i) => {
    const match = /^@([\w.-]+)$/.exec(part)
    if (!match) return <span key={i}>{part}</span>
    const username = match[1]
    const displayName = mentionedUsers[username] ?? username
    return (
      <span
        key={i}
        className="font-medium text-primary bg-primary/10 rounded px-1"
        title={`@${username}`}
      >
        @{displayName}
      </span>
    )
  })
}
