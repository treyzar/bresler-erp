import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Paperclip, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUserList } from "@/api/hooks/useUsers"
import { registryApi, type LetterCreatePayload } from "../api/registry"

const schema = z.object({
  date: z.string().min(1, "Укажите дату"),
  direction: z.enum(["outgoing", "incoming"]),
  recipient: z.string().optional(),
  sender: z.string().optional(),
  subject: z.string().min(1, "Укажите тему"),
  executor: z.coerce.number({ required_error: "Укажите исполнителя" }).min(1, "Укажите исполнителя"),
  note: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  letterId: number | null
  onClose: () => void
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

export function LetterFormDialog({ open, letterId, onClose }: Props) {
  const isEdit = letterId !== null
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const { data: users } = useUserList({ page_size: 200, same_group: 1 })

  const { data: letter } = useQuery({
    queryKey: ["letter", letterId],
    queryFn: () => registryApi.get(letterId!),
    enabled: isEdit && open,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      direction: "outgoing",
      recipient: "",
      sender: "",
      subject: "",
      executor: 0,
      note: "",
    },
  })

  useEffect(() => {
    if (!open) {
      setPendingFiles([])
    }
    if (isEdit && letter) {
      form.reset({
        date: letter.date,
        direction: letter.direction,
        recipient: letter.recipient,
        sender: letter.sender,
        subject: letter.subject,
        executor: letter.executor.id,
        note: letter.note,
      })
    } else if (!isEdit && open) {
      form.reset({
        date: new Date().toISOString().slice(0, 10),
        direction: "outgoing",
        recipient: "",
        sender: "",
        subject: "",
        executor: 0,
        note: "",
      })
    }
  }, [letter, isEdit, open])

  const createMutation = useMutation({
    mutationFn: async (data: LetterCreatePayload) => {
      const created = await registryApi.create(data)
      if (pendingFiles.length > 0) {
        await registryApi.uploadFiles(created.id, pendingFiles)
      }
      return created
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["letters"] })
      toast.success("Письмо создано")
      onClose()
    },
    onError: () => toast.error("Ошибка при создании"),
  })

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<LetterCreatePayload>) => {
      const updated = await registryApi.update(letterId!, data)
      if (pendingFiles.length > 0) {
        await registryApi.uploadFiles(letterId!, pendingFiles)
      }
      return updated
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["letters"] })
      queryClient.invalidateQueries({ queryKey: ["letter"] })
      toast.success("Письмо обновлено")
      onClose()
    },
    onError: () => toast.error("Ошибка при сохранении"),
  })

  const direction = form.watch("direction")

  const onSubmit = (values: FormValues) => {
    const payload: LetterCreatePayload = {
      date: values.date,
      direction: values.direction,
      subject: values.subject,
      executor: values.executor,
      note: values.note,
      recipient: values.direction === "outgoing" ? values.recipient : undefined,
      sender: values.direction === "incoming" ? values.sender : undefined,
    }
    if (isEdit) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setPendingFiles((prev) => [...prev, ...files])
    e.target.value = ""
  }

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать письмо" : "Новое письмо"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="direction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Направление</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="outgoing">Исходящее</SelectItem>
                        <SelectItem value="incoming">Входящее</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {direction === "outgoing" ? (
              <FormField
                control={form.control}
                name="recipient"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Получатель</FormLabel>
                    <FormControl>
                      <Input placeholder="Организация или ФИО" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="sender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Отправитель</FormLabel>
                    <FormControl>
                      <Input placeholder="Организация или ФИО" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тема</FormLabel>
                  <FormControl>
                    <Input placeholder="Краткое описание письма" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="executor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Исполнитель</FormLabel>
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите исполнителя" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users?.results?.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.full_name || u.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Заметки</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Дополнительная информация..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File attachments */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Файлы</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="mr-2 h-4 w-4" />
                  Прикрепить
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              {pendingFiles.length > 0 && (
                <ul className="space-y-1">
                  {pendingFiles.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="text-muted-foreground shrink-0">{formatBytes(f.size)}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Отмена
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Сохранение..." : isEdit ? "Сохранить" : "Создать"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
