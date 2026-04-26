import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { useQuery, useMutation } from "@tanstack/react-query"
import { ChevronLeft, Save, Send, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  HelpPanel, HelpSection, HelpSteps, HelpStep, HelpCallout,
} from "@/components/shared/HelpPanel"
import { Workflow, Lock, Sparkles } from "lucide-react"
import { DynamicField } from "../components/DynamicField"
import { useAutoCompute } from "../hooks/useAutoCompute"
import { internalDocsApi } from "../api/client"
import type { FieldSpec } from "../api/types"

export function CreateDocumentPage() {
  const { code = "" } = useParams<{ code: string }>()
  const navigate = useNavigate()

  const { data: type, isLoading } = useQuery({
    queryKey: ["internal-docs", "type", code],
    queryFn: () => internalDocsApi.getType(code),
    enabled: !!code,
  })

  const [values, setValues] = useState<Record<string, unknown>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  useAutoCompute(code, values, setValues)

  const create = useMutation({
    mutationFn: async (submitAfter: boolean) => {
      const doc = await internalDocsApi.createDocument({
        type: code, field_values: values,
      })
      if (submitAfter) {
        return await internalDocsApi.submitDocument(doc.id)
      }
      return doc
    },
    onSuccess: (doc) => {
      toast.success(doc.status === "pending" ? "Документ отправлен на согласование" : "Черновик сохранён")
      navigate(`/edo/documents/${doc.id}`)
    },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail ?? e?.message ?? "Ошибка"
      toast.error(detail)
    },
  })

  if (isLoading || !type) {
    return <div className="container mx-auto p-6 max-w-3xl"><Skeleton className="h-96" /></div>
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    for (const spec of type.field_schema) {
      if (spec.required) {
        const v = values[spec.name]
        const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)
        if (empty) next[spec.name] = "Обязательное поле"
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSave = (submit: boolean) => {
    if (submit && !validate()) {
      toast.error("Заполните обязательные поля")
      return
    }
    create.mutate(submit)
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl space-y-6">
      <Button variant="ghost" asChild className="-ml-3">
        <Link to="/edo/new">
          <ChevronLeft className="mr-2 h-4 w-4" />К каталогу типов
        </Link>
      </Button>

      <div className="flex items-start gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{type.name}</h1>
          {type.description && <p className="text-muted-foreground mt-1">{type.description}</p>}
        </div>
        <CreateHelp typeCode={code} typeName={type.name} description={type.description} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Заполнить поля</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {type.field_schema.map((spec: FieldSpec) => (
            <DynamicField
              key={spec.name}
              spec={spec}
              value={values[spec.name]}
              onChange={(v) => setValues((prev) => ({ ...prev, [spec.name]: v }))}
              error={errors[spec.name]}
            />
          ))}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">Цепочка согласования</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {type.default_chain.steps.map((s) => (
              <li key={s.order} className="flex items-start gap-3 text-sm">
                <span className="flex-none w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                  {s.order}
                </span>
                <div>
                  <div className="font-medium">{s.label}</div>
                  <div className="text-muted-foreground text-xs">
                    {s.action === "inform" ? "Для информации" : "Требуется согласование"}
                    {s.sla_hours ? ` · SLA ${s.sla_hours}ч` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2 sticky bottom-4 bg-background/80 backdrop-blur p-3 rounded-lg border shadow-sm">
        <Button variant="outline" onClick={() => onSave(false)} disabled={create.isPending}>
          <Save className="mr-2 h-4 w-4" />
          Сохранить черновик
        </Button>
        <Button onClick={() => onSave(true)} disabled={create.isPending}>
          {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Отправить на согласование
        </Button>
      </div>
    </div>
  )
}


/** Per-type advice — словарь подсказок для специфичных типов. */
const TYPE_TIPS: Record<string, React.ReactNode> = {
  memo_overtime: (
    <>
      <p>
        В <strong>списке сотрудников</strong> можно выбирать только тех, кто
        находится в вашем подразделении или его подчинённых секторах.
        Если нужного сотрудника нет — попросите администратора проверить
        его <code>department_unit</code>.
      </p>
      <HelpCallout variant="info">
        Шаг <strong>«Бухгалтерия»</strong> в этой цепочке — на approve, не inform.
        Бухгалтер реально просмотрит запись и одобрит (или отклонит); он не
        закроется автоматически.
      </HelpCallout>
    </>
  ),
  memo_bonus_monthly: (
    <>
      <p>
        В таблице «Список премий» нажимайте{" "}
        <strong>«Добавить строку»</strong> для каждого сотрудника. Сумма
        прописывается вручную, обоснование опционально. Поле{" "}
        <strong>«Итого»</strong> пересчитывается автоматически.
      </p>
      <HelpCallout variant="warning" title="Только для руководителей">
        Создавать этот тип может только руководитель подразделения
        (<code>is_department_head=True</code>).
      </HelpCallout>
    </>
  ),
  memo_bonus_quarterly: (
    <p>
      Поле <strong>«Период»</strong> — квартал (Q1–Q4) или «По итогам года».
      Поле <strong>«Год»</strong> — четырёхзначное число. Остальное — как в
      ежемесячном премировании.
    </p>
  ),
  app_dayoff_workoff: (
    <HelpCallout variant="tip">
      Шаг <strong>«Бухгалтерия»</strong> в цепочке — <code>inform</code>: он
      закроется автоматически после одобрения руководителя. Отдельных
      действий бухгалтерии не требует.
    </HelpCallout>
  ),
  app_dayoff_unpaid: (
    <HelpCallout variant="warning">
      Шаг бухгалтерии — на <strong>approve</strong> (отгул за свой счёт требует
      подтверждения). Указывайте период точно — на эти дни не начислится
      зарплата.
    </HelpCallout>
  ),
  vacation_notification: (
    <>
      <HelpCallout variant="info" title="Обратный поток">
        Этот тип создаёт бухгалтер, а сотрудник подписывает в знак
        ознакомления. Шаги идут по порядку:
      </HelpCallout>
      <HelpSteps>
        <HelpStep n={1}>
          Бухгалтер заполняет форму, выбирает сотрудника, отправляет.
        </HelpStep>
        <HelpStep n={2}>
          Бухгалтер первым подписывает (требуется рисованная подпись).
        </HelpStep>
        <HelpStep n={3}>
          Сотрудник получает документ в <strong>«Ждут меня»</strong>,
          расписывается в знак ознакомления (тоже рисованная подпись).
        </HelpStep>
        <HelpStep n={4}>
          Руководителю сотрудника уходит копия «к сведению» — закрывается
          автоматически.
        </HelpStep>
      </HelpSteps>
    </>
  ),
  travel_estimate: (
    <>
      <p>
        Все денежные поля — в рублях, два знака после запятой.{" "}
        <strong>«Итого»</strong> пересчитывается автоматически (транспорт +
        проживание + суточные). Суточные заполняются вручную: зависят от
        политики компании и региона.
      </p>
      <HelpCallout variant="warning" title="Понадобится подпись">
        На последнем шаге (директор) нужна рисованная подпись — место для
        неё появится в панели одобрения.
      </HelpCallout>
    </>
  ),
}


function CreateHelp({
  typeCode, typeName, description,
}: { typeCode: string; typeName: string; description?: string }) {
  const tips = TYPE_TIPS[typeCode]
  return (
    <HelpPanel
      title={typeName}
      description={description || "Заполнение и отправка документа"}
    >
      <HelpSection icon={Workflow} title="Общий порядок" tone="primary">
        <HelpSteps>
          <HelpStep n={1}>
            Заполните все обязательные поля (помечены красной звёздочкой).
          </HelpStep>
          <HelpStep n={2}>
            Проверьте preview цепочки согласования внизу страницы.
          </HelpStep>
          <HelpStep n={3}>
            Нажмите <strong>«Отправить на согласование»</strong> — присвоится
            номер, документ уйдёт первому в цепочке. Или{" "}
            <strong>«Сохранить черновик»</strong> — останется без номера, можно
            будет вернуться позже.
          </HelpStep>
        </HelpSteps>
      </HelpSection>

      <HelpSection icon={Lock} title="Изменение после отправки" tone="amber">
        <p>
          После submit редактирование заблокировано. Если нужно поправить —
          попросите согласующего нажать <strong>«Запросить правки»</strong>:
          документ вернётся к вам в статус <code>revision_requested</code>, поля
          снова станут редактируемыми, и после правок отправите заново.
        </p>
      </HelpSection>

      {tips && (
        <HelpSection icon={Sparkles} title={`Особенности: ${typeName}`} tone="primary">
          {tips}
        </HelpSection>
      )}

      <HelpCallout variant="info" title="Подробнее">
        Полное описание всех 9 типов — в файле{" "}
        <code>docs/edo_user_guide.md</code> (раздел 3). Тест-сценарии для
        самопроверки — <code>docs/edo_test_scenarios.md</code>.
      </HelpCallout>
    </HelpPanel>
  )
}
