import { useState } from "react"
import { useParams, useNavigate } from "react-router"
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import {
  useDeviceRZA,
  useDeviceModifications,
  useDeviceParameters,
  useDeviceComponents,
  useDeleteModRZA,
  useRemoveDeviceParameter,
  useRemoveDeviceComponent,
} from "@/api/hooks/useDevices"
import type { ModRZA, DeviceRZAParameter, DeviceRZAComponent } from "@/api/types"
import { ModificationFormDialog } from "./ModificationFormDialog"
import { AddParameterDialog } from "./AddParameterDialog"
import { AddComponentDialog } from "./AddComponentDialog"

export function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const deviceId = id ? Number(id) : null

  const { data: device, isLoading } = useDeviceRZA(deviceId)
  const { data: modifications } = useDeviceModifications(deviceId)
  const { data: parameters } = useDeviceParameters(deviceId)
  const { data: components } = useDeviceComponents(deviceId)

  const [modFormOpen, setModFormOpen] = useState(false)
  const [editingMod, setEditingMod] = useState<ModRZA | null>(null)
  const [paramDialogOpen, setParamDialogOpen] = useState(false)
  const [compDialogOpen, setCompDialogOpen] = useState(false)
  const [deleteModItem, setDeleteModItem] = useState<ModRZA | null>(null)
  const [deleteParamItem, setDeleteParamItem] = useState<DeviceRZAParameter | null>(null)
  const [deleteCompItem, setDeleteCompItem] = useState<DeviceRZAComponent | null>(null)

  const deleteModMutation = useDeleteModRZA()
  const removeParamMutation = useRemoveDeviceParameter()
  const removeCompMutation = useRemoveDeviceComponent()

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
  }

  if (!device) {
    return <div className="p-8 text-center text-muted-foreground">Устройство не найдено</div>
  }

  const handleDeleteMod = async () => {
    if (!deleteModItem) return
    try {
      await deleteModMutation.mutateAsync(deleteModItem.id)
      toast.success("Модификация удалена")
      setDeleteModItem(null)
    } catch {
      toast.error("Ошибка при удалении")
    }
  }

  const handleRemoveParam = async () => {
    if (!deleteParamItem || !deviceId) return
    try {
      await removeParamMutation.mutateAsync({ deviceId, parameterId: deleteParamItem.parameter })
      toast.success("Параметр отвязан")
      setDeleteParamItem(null)
    } catch {
      toast.error("Ошибка")
    }
  }

  const handleRemoveComp = async () => {
    if (!deleteCompItem || !deviceId) return
    try {
      await removeCompMutation.mutateAsync({ deviceId, componentId: deleteCompItem.component })
      toast.success("Компонент отвязан")
      setDeleteCompItem(null)
    } catch {
      toast.error("Ошибка")
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/devices/rza")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            Бреслер-0107.{device.rza_code}
          </h1>
          <p className="text-muted-foreground">{device.rza_name}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Код:</span>{" "}
            <span className="font-medium">{device.rza_code}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Сокращение:</span>{" "}
            <span className="font-medium">{device.rza_short_name || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Род. падеж:</span>{" "}
            <span className="font-medium">{device.rza_name_rod || "—"}</span>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="modifications">
        <TabsList>
          <TabsTrigger value="modifications">
            Модификации
            {modifications && <Badge variant="secondary" className="ml-1.5">{modifications.count}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="parameters">
            Параметры
            {parameters && <Badge variant="secondary" className="ml-1.5">{parameters.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="components">
            Компоненты
            {components && <Badge variant="secondary" className="ml-1.5">{components.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Modifications Tab */}
        <TabsContent value="modifications" className="space-y-3">
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                setEditingMod(null)
                setModFormOpen(true)
              }}
            >
              <Plus className="mr-1 size-4" /> Добавить модификацию
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Код</TableHead>
                <TableHead>Наименование</TableHead>
                <TableHead>Полный код</TableHead>
                <TableHead>Альт. код</TableHead>
                <TableHead>Код по ШЭТ</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...(modifications?.results ?? [])]
                .sort((a, b) => a.mod_code.localeCompare(b.mod_code, "ru", { numeric: true }))
                .map((mod) => (
                  <TableRow key={mod.id}>
                    <TableCell className="font-mono">{mod.mod_code}</TableCell>
                    <TableCell>{mod.mod_name || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{mod.full_code}</TableCell>
                    <TableCell className="text-xs">{mod.alter_mod_code || "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{mod.sec_mod_code || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingMod(mod)
                          setModFormOpen(true)
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteModItem(mod)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              {!modifications?.results.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Нет модификаций
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Parameters Tab */}
        <TabsContent value="parameters" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Параметры — опции, которые можно включать в модификации (тип, цена). Выберите справа «Добавить параметр».
            </p>
            <Button size="sm" onClick={() => setParamDialogOpen(true)}>
              <Plus className="mr-1 size-4" /> Добавить параметр
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Параметр</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Цена</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {parameters?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.parameter_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.parameter_type}</Badge>
                  </TableCell>
                  <TableCell>{Number(p.price).toLocaleString("ru-RU")} ₽</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteParamItem(p)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!parameters?.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Нет привязанных параметров
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Components Tab */}
        <TabsContent value="components" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setCompDialogOpen(true)}>
              <Plus className="mr-1 size-4" /> Добавить компонент
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Компонент</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Цена</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {components?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.component_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{c.component_type_name}</Badge>
                  </TableCell>
                  <TableCell>{Number(c.price).toLocaleString("ru-RU")} ₽</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteCompItem(c)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!components?.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Нет привязанных компонентов
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {deviceId && (
        <>
          <ModificationFormDialog
            deviceId={deviceId}
            open={modFormOpen}
            onOpenChange={(open) => {
              setModFormOpen(open)
              if (!open) setEditingMod(null)
            }}
            modification={editingMod}
          />
          <AddParameterDialog
            deviceId={deviceId}
            open={paramDialogOpen}
            onOpenChange={setParamDialogOpen}
          />
          <AddComponentDialog
            deviceId={deviceId}
            open={compDialogOpen}
            onOpenChange={setCompDialogOpen}
          />
        </>
      )}

      <ConfirmDialog
        open={!!deleteModItem}
        onOpenChange={() => setDeleteModItem(null)}
        title="Удалить модификацию?"
        description={`Модификация «${deleteModItem?.mod_code}» будет удалена.`}
        onConfirm={handleDeleteMod}
        loading={deleteModMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteParamItem}
        onOpenChange={() => setDeleteParamItem(null)}
        title="Отвязать параметр?"
        description={`Параметр «${deleteParamItem?.parameter_name}» будет отвязан от устройства.`}
        onConfirm={handleRemoveParam}
        loading={removeParamMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteCompItem}
        onOpenChange={() => setDeleteCompItem(null)}
        title="Отвязать компонент?"
        description={`Компонент «${deleteCompItem?.component_name}» будет отвязан от устройства.`}
        onConfirm={handleRemoveComp}
        loading={removeCompMutation.isPending}
      />
    </div>
  )
}
