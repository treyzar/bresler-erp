import { useState } from "react"
import { Upload, ArrowRight, ArrowLeft, Check, AlertCircle, FileSpreadsheet } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { importApi } from "@/api/importApi"
import type { ImportSession } from "@/api/types"
import { IMPORT_TARGET_MODELS } from "@/api/types"

type Step = "upload" | "mapping" | "preview" | "result"

export function ImportPage() {
  const [step, setStep] = useState<Step>("upload")
  const [session, setSession] = useState<ImportSession | null>(null)
  const [availableFields, setAvailableFields] = useState<{ name: string; label: string }[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [validationResult, setValidationResult] = useState<{
    total_rows: number
    valid_count: number
    error_count: number
    errors: { row: number; field: string; message: string }[]
    preview: Record<string, string>[]
  } | null>(null)
  const [importResult, setImportResult] = useState<{
    success_count: number
    error_count: number
    errors: { row: number; field: string; message: string }[]
  } | null>(null)
  const [loading, setLoading] = useState(false)

  // Step 1: Upload
  const [file, setFile] = useState<File | null>(null)
  const [targetModel, setTargetModel] = useState("")

  const handleUpload = async () => {
    if (!file || !targetModel) return
    setLoading(true)
    try {
      const sess = await importApi.upload(file, targetModel)
      setSession(sess)
      setMapping(sess.column_mapping)
      const fields = await importApi.fields(sess.id)
      setAvailableFields(fields)
      setStep("mapping")
    } catch {
      toast.error("Ошибка загрузки файла")
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Update mapping and validate
  const handleValidate = async () => {
    if (!session) return
    setLoading(true)
    try {
      await importApi.updateMapping(session.id, mapping)
      const result = await importApi.validate(session.id)
      setValidationResult(result)
      setStep("preview")
    } catch {
      toast.error("Ошибка валидации")
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Apply
  const handleApply = async () => {
    if (!session) return
    setLoading(true)
    try {
      const result = await importApi.apply(session.id)
      if (result.status === "processing") {
        toast.info("Импорт запущен в фоне. Уведомление придёт по завершении.")
        setImportResult({ success_count: 0, error_count: 0, errors: [] })
      } else {
        setImportResult(result)
      }
      setStep("result")
    } catch {
      toast.error("Ошибка импорта")
    } finally {
      setLoading(false)
    }
  }

  const handleMappingChange = (fileCol: string, modelField: string) => {
    setMapping((prev) => {
      const next = { ...prev }
      if (modelField === "__none__") {
        delete next[fileCol]
      } else {
        next[fileCol] = modelField
      }
      return next
    })
  }

  const steps = [
    { key: "upload", label: "Загрузка" },
    { key: "mapping", label: "Маппинг" },
    { key: "preview", label: "Предпросмотр" },
    { key: "result", label: "Результат" },
  ] as const

  const currentStepIndex = steps.findIndex((s) => s.key === step)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="size-6" />
        <h1 className="text-2xl font-bold tracking-tight">Импорт данных</h1>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center size-8 rounded-full text-xs font-bold ${
                i < currentStepIndex
                  ? "bg-primary text-primary-foreground"
                  : i === currentStepIndex
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < currentStepIndex ? <Check className="size-4" /> : i + 1}
            </div>
            <span className={`text-sm ${i === currentStepIndex ? "font-medium" : "text-muted-foreground"}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && <ArrowRight className="size-4 text-muted-foreground mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Загрузите файл (CSV или Excel)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Целевая модель</label>
              <Select value={targetModel} onValueChange={setTargetModel}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Выберите модель..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(IMPORT_TARGET_MODELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Файл</label>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-[400px]"
              />
            </div>

            <Button onClick={handleUpload} disabled={!file || !targetModel || loading}>
              <Upload className="size-4 mr-2" />
              {loading ? "Загрузка..." : "Загрузить и продолжить"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Mapping */}
      {step === "mapping" && session && (
        <Card>
          <CardHeader>
            <CardTitle>Маппинг колонок</CardTitle>
            <p className="text-sm text-muted-foreground">
              Сопоставьте колонки файла с полями модели. Автоматически определено: {Object.keys(mapping).length} из {session.columns.length}.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Колонка в файле</TableHead>
                  <TableHead>Поле модели</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {session.columns.map((col) => (
                  <TableRow key={col}>
                    <TableCell className="font-medium">{col}</TableCell>
                    <TableCell>
                      <Select
                        value={mapping[col] || "__none__"}
                        onValueChange={(val) => handleMappingChange(col, val)}
                      >
                        <SelectTrigger className="w-[250px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Пропустить —</SelectItem>
                          {availableFields.map((f) => (
                            <SelectItem key={f.name} value={f.name}>
                              {f.label} ({f.name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ArrowLeft className="size-4 mr-1" />
                Назад
              </Button>
              <Button onClick={handleValidate} disabled={Object.keys(mapping).length === 0 || loading}>
                {loading ? "Проверка..." : "Проверить данные"}
                <ArrowRight className="size-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && validationResult && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold">{validationResult.total_rows}</p>
                <p className="text-sm text-muted-foreground">Всего строк</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-green-600">{validationResult.valid_count}</p>
                <p className="text-sm text-muted-foreground">Валидных</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className={`text-3xl font-bold ${validationResult.error_count > 0 ? "text-red-600" : "text-green-600"}`}>
                  {validationResult.error_count}
                </p>
                <p className="text-sm text-muted-foreground">С ошибками</p>
              </CardContent>
            </Card>
          </div>

          {/* Errors */}
          {validationResult.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <AlertCircle className="size-5" />
                  Ошибки валидации
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-60">
                  <div className="space-y-1">
                    {validationResult.errors.map((e, i) => (
                      <div key={i} className="text-sm flex gap-2">
                        <Badge variant="destructive" className="text-xs shrink-0">
                          Строка {e.row}
                        </Badge>
                        <span>{e.message}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Preview table */}
          {validationResult.preview.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Предпросмотр (первые {validationResult.preview.length} записей)</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-80">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(validationResult.preview[0]).map((key) => (
                          <TableHead key={key}>{key}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResult.preview.map((row, i) => (
                        <TableRow key={i}>
                          {Object.values(row).map((val, j) => (
                            <TableCell key={j}>{val}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("mapping")}>
              <ArrowLeft className="size-4 mr-1" />
              Назад
            </Button>
            <Button
              onClick={handleApply}
              disabled={validationResult.valid_count === 0 || loading}
            >
              {loading ? "Импортируем..." : `Импортировать ${validationResult.valid_count} записей`}
              <Check className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === "result" && importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Импорт завершён</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                <p className="text-3xl font-bold text-green-600">{importResult.success_count}</p>
                <p className="text-sm text-muted-foreground">Успешно создано</p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                <p className={`text-3xl font-bold ${importResult.error_count > 0 ? "text-red-600" : "text-green-600"}`}>
                  {importResult.error_count}
                </p>
                <p className="text-sm text-muted-foreground">Ошибок</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <ScrollArea className="max-h-40">
                <div className="space-y-1">
                  {importResult.errors.map((e, i) => (
                    <div key={i} className="text-sm text-red-600">
                      Строка {e.row}: {e.message}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            <Button onClick={() => { setStep("upload"); setSession(null); setFile(null); setTargetModel(""); }}>
              Новый импорт
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
