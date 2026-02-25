import { useRef, useState } from "react"
import { Upload, Trash2, FileText } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import type { OrderFile } from "@/api/types"
import { useUploadOrderFiles, useDeleteOrderFile } from "@/api/hooks/useOrders"

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
  const deleteMutation = useDeleteOrderFile()
  const [deleteFile, setDeleteFile] = useState<OrderFile | null>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? [])
    if (selectedFiles.length === 0) return
    try {
      await uploadMutation.mutateAsync({ id: orderId, files: selectedFiles })
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Файлы</CardTitle>
        <div>
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
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Нет файлов</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Имя файла</TableHead>
                <TableHead className="w-[100px]">Размер</TableHead>
                <TableHead className="w-[150px]">Дата</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <a
                      href={f.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm hover:underline"
                    >
                      <FileText className="size-4 text-muted-foreground" />
                      {f.original_name}
                    </a>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatFileSize(f.file_size)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(f.created_at).toLocaleString("ru")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteFile(f)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
