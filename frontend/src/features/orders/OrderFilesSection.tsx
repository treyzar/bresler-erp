import { useRef, useState, useMemo } from "react"
import { Upload, Trash2, FileText, Pencil, Check, X, ChevronDown, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import type { OrderFile } from "@/api/types"
import { FILE_CATEGORIES } from "@/api/types"
import { useUploadOrderFiles, useUpdateOrderFile, useDeleteOrderFile } from "@/api/hooks/useOrders"

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface OrderFilesSectionProps {
  orderId: number
  files: OrderFile[]
}

export function OrderFilesSection({ orderId, files }: OrderFilesSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadMutation = useUploadOrderFiles()
  const updateMutation = useUpdateOrderFile()
  const deleteMutation = useDeleteOrderFile()

  const [deleteFile, setDeleteFile] = useState<OrderFile | null>(null)
  const [editingFile, setEditingFile] = useState<number | null>(null)
  const [editValues, setEditValues] = useState({ category: "", description: "" })
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [uploadCategory, setUploadCategory] = useState("general")
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Filter files
  const filteredFiles = useMemo(() => {
    if (filterCategory === "all") return files
    return files.filter((f) => f.category === filterCategory)
  }, [files, filterCategory])

  // Group files by category
  const grouped = useMemo(() => {
    const groups = new Map<string, OrderFile[]>()
    for (const f of filteredFiles) {
      const cat = f.category || "general"
      if (!groups.has(cat)) groups.set(cat, [])
      groups.get(cat)!.push(f)
    }
    // Sort by category order
    const catOrder = Object.keys(FILE_CATEGORIES)
    return Array.from(groups.entries()).sort(
      (a, b) => catOrder.indexOf(a[0]) - catOrder.indexOf(b[0]),
    )
  }, [filteredFiles])

  const toggleGroup = (cat: string) => {
    const next = new Set(collapsedGroups)
    if (next.has(cat)) next.delete(cat); else next.add(cat)
    setCollapsedGroups(next)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? [])
    if (selectedFiles.length === 0) return
    try {
      await uploadMutation.mutateAsync({ id: orderId, files: selectedFiles, category: uploadCategory })
      toast.success(`Загружено файлов: ${selectedFiles.length}`)
    } catch {
      toast.error("Ошибка при загрузке файлов")
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleDelete = async () => {
    if (!deleteFile) return
    try {
      await deleteMutation.mutateAsync({ orderId, fileId: deleteFile.id })
      toast.success("Файл удалён")
      setDeleteFile(null)
    } catch {
      toast.error("Ошибка при удалении файла")
    }
  }

  const startEdit = (f: OrderFile) => {
    setEditingFile(f.id)
    setEditValues({ category: f.category, description: f.description })
  }

  const saveEdit = async (fileId: number) => {
    try {
      await updateMutation.mutateAsync({ orderId, fileId, data: editValues })
      toast.success("Файл обновлён")
      setEditingFile(null)
    } catch {
      toast.error("Ошибка обновления")
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Файлы ({files.length})</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              {Object.entries(FILE_CATEGORIES).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={uploadCategory} onValueChange={setUploadCategory}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FILE_CATEGORIES).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            <Upload className="size-4 mr-1" />
            {uploadMutation.isPending ? "Загрузка..." : "Загрузить"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {filteredFiles.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Нет файлов</p>
        ) : (
          <div className="space-y-2">
            {grouped.map(([category, catFiles]) => (
              <Collapsible
                key={category}
                open={!collapsedGroups.has(category)}
                onOpenChange={() => toggleGroup(category)}
              >
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted/50 text-sm font-medium">
                  {collapsedGroups.has(category)
                    ? <ChevronRight className="size-4" />
                    : <ChevronDown className="size-4" />
                  }
                  {FILE_CATEGORIES[category as keyof typeof FILE_CATEGORIES] ?? category}
                  <Badge variant="outline" className="text-[10px] ml-1">{catFiles.length}</Badge>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Имя файла</TableHead>
                        <TableHead className="w-[200px]">Описание</TableHead>
                        <TableHead className="w-[100px]">Размер</TableHead>
                        <TableHead className="w-[140px]">Дата</TableHead>
                        <TableHead className="w-[80px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {catFiles.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell>
                            <a
                              href={f.file}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm hover:underline"
                            >
                              <FileText className="size-4 text-muted-foreground shrink-0" />
                              {f.original_name}
                            </a>
                          </TableCell>
                          <TableCell>
                            {editingFile === f.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={editValues.description}
                                  onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                                  className="h-7 text-xs"
                                  placeholder="Описание"
                                />
                                <Select
                                  value={editValues.category}
                                  onValueChange={(v) => setEditValues({ ...editValues, category: v })}
                                >
                                  <SelectTrigger className="h-7 w-[110px] text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(FILE_CATEGORIES).map(([k, label]) => (
                                      <SelectItem key={k} value={k}>{label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button variant="ghost" size="icon" className="size-6" onClick={() => saveEdit(f.id)}>
                                  <Check className="size-3.5 text-green-600" />
                                </Button>
                                <Button variant="ghost" size="icon" className="size-6" onClick={() => setEditingFile(null)}>
                                  <X className="size-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">{f.description || "—"}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatFileSize(f.file_size)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(f.created_at).toLocaleString("ru")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-0.5">
                              <Button variant="ghost" size="icon" className="size-7" onClick={() => startEdit(f)}>
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="size-7" onClick={() => setDeleteFile(f)}>
                                <Trash2 className="size-3.5 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!deleteFile}
        onOpenChange={(open) => { if (!open) setDeleteFile(null) }}
        title="Удалить файл?"
        description={`Файл «${deleteFile?.original_name}» будет удалён безвозвратно.`}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </Card>
  )
}
