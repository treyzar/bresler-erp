import { useRef, useState } from "react"
import { useNavigate } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  ClipboardList, Bell, User as UserIcon, Settings, Camera, Trash2, Lock,
  AlertTriangle, Clock, CheckCircle2, Building2, BarChart3, FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuthStore } from "@/stores/useAuthStore"
import { usersApi } from "@/api/usersApi"
import type { ActivityItem, MyOrderItem, MyOfferItem } from "@/api/usersApi"
import { ORDER_STATUSES, OFFER_STATUSES } from "@/api/types"
import { MyCustomersTab } from "./MyCustomersTab"
import { MyStatsTab } from "./MyStatsTab"

// ── Schemas ──

const profileSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  patronymic: z.string(),
  email: z.string().email("Некорректный email"),
  phone: z.string(),
  extension_number: z.string(),
  position: z.string(),
  department: z.string(),
  company: z.string(),
})

const passwordSchema = z.object({
  current_password: z.string().min(1, "Введите текущий пароль"),
  new_password: z.string().min(8, "Минимум 8 символов"),
  new_password_confirm: z.string().min(1, "Подтвердите пароль"),
}).refine((data) => data.new_password === data.new_password_confirm, {
  message: "Пароли не совпадают",
  path: ["new_password_confirm"],
})

type ProfileFormValues = z.infer<typeof profileSchema>
type PasswordFormValues = z.infer<typeof passwordSchema>

// ── Status helpers ──

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  N: "outline", D: "secondary", P: "default", C: "secondary", S: "default", A: "outline",
}

// ── Main component ──

export function ProfilePage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const qc = useQueryClient()

  const { data: user, isLoading } = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => usersApi.getMe(),
  })

  const [ordersGroup, setOrdersGroup] = useState<string>("current")
  const [ordersScope, setOrdersScope] = useState<string>("manager")
  const [ordersPage, setOrdersPage] = useState(1)

  const { data: myOrdersData } = useQuery({
    queryKey: ["users", "me", "orders", ordersScope, ordersGroup, ordersPage],
    queryFn: () => usersApi.myOrders({ scope: ordersScope, group: ordersGroup, page: ordersPage }),
  })

  const { data: myOffers } = useQuery({
    queryKey: ["users", "me", "offers"],
    queryFn: () => usersApi.myOffers(),
  })

  const { data: activityData } = useQuery({
    queryKey: ["users", "me", "activity"],
    queryFn: () => usersApi.activity(30),
  })

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер"
  const initials = `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`.toUpperCase() || "?"
  const stats = myOrdersData?.stats

  return (
    <div className="p-6 space-y-6">
      {/* Header with avatar */}
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          <AvatarImage src={user?.avatar ?? undefined} />
          <AvatarFallback className="text-lg font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">
            {greeting}, {user?.first_name || user?.username}!
          </h1>
          <p className="text-muted-foreground text-sm">
            {user?.position}{user?.position && user?.department ? " · " : ""}{user?.department}
            {user?.groups?.length ? ` · ${user.groups.join(", ")}` : ""}
          </p>
        </div>
      </div>

      {/* Quick stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <NumberCard label="Всего заказов" value={stats.total} icon={<ClipboardList className="size-4" />} />
          <NumberCard label="В работе" value={stats.in_progress} icon={<Clock className="size-4" />} />
          <NumberCard label="Реализовано" value={stats.shipped} icon={<CheckCircle2 className="size-4" />} />
          <NumberCard
            label="Просрочено"
            value={stats.overdue}
            icon={<AlertTriangle className="size-4" />}
            variant={stats.overdue > 0 ? "destructive" : "default"}
          />
          <NumberCard
            label="Непрочитанных"
            value={activityData?.results.filter((a) => !a.is_read).length ?? 0}
            icon={<Bell className="size-4" />}
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders" className="gap-1.5">
            <ClipboardList className="size-4" />
            Мои заказы
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-1.5">
            <Building2 className="size-4" />
            Мои заказчики
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5">
            <BarChart3 className="size-4" />
            Статистика
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5">
            <Bell className="size-4" />
            Активность
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-1.5">
            <UserIcon className="size-4" />
            Профиль
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="size-4" />
            Настройки
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: My Orders ── */}
        <TabsContent value="orders" className="mt-4 space-y-4">
          {/* Scope selector (role-based) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1">Моя роль:</span>
            {([
              ["manager", "Менеджер"],
              ["creator", "Создатель"],
              ["all", "Все"],
            ] as const).map(([key, label]) => (
              <Button
                key={key}
                variant={ordersScope === key ? "default" : "outline"}
                size="sm"
                onClick={() => { setOrdersScope(key); setOrdersPage(1) }}
              >
                {label}
              </Button>
            ))}
          </div>
          {/* Sub-tabs for order groups */}
          <div className="flex items-center gap-2">
            {([
              ["current", "Текущие"],
              ["shipped", "Отгруженные"],
              ["offers", "КП"],
              ["all", "Все"],
            ] as const).map(([key, label]) => (
              <Button
                key={key}
                variant={ordersGroup === key ? "default" : "outline"}
                size="sm"
                onClick={() => { setOrdersGroup(key); setOrdersPage(1) }}
              >
                {label}
              </Button>
            ))}
          </div>

          {ordersGroup === "offers" ? (
            /* КП list */
            <Card>
              <CardContent className="pt-4">
                {!myOffers?.length ? (
                  <p className="text-muted-foreground text-sm">Нет коммерческих предложений</p>
                ) : (
                  <div className="divide-y">
                    {myOffers.map((offer) => (
                      <button
                        key={offer.id}
                        onClick={() => navigate(`/orders/${offer.order_number}`)}
                        className="flex items-center justify-between py-3 w-full text-left hover:bg-muted/50 px-2 -mx-2 rounded"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="size-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{offer.offer_number}</span>
                          <span className="text-muted-foreground text-sm">{offer.participant_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {new Date(offer.date).toLocaleDateString("ru")}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {OFFER_STATUSES[offer.status as keyof typeof OFFER_STATUSES] ?? offer.status}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            /* Orders list */
            <Card>
              <CardContent className="pt-4">
                {!myOrdersData?.orders.length ? (
                  <p className="text-muted-foreground text-sm">Нет заказов</p>
                ) : (
                  <>
                    <div className="divide-y">
                      {myOrdersData.orders.map((order: MyOrderItem) => (
                        <button
                          key={order.id}
                          onClick={() => navigate(`/orders/${order.order_number}`)}
                          className="flex items-center justify-between py-3 w-full text-left hover:bg-muted/50 px-2 -mx-2 rounded"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-bold">#{order.order_number}</span>
                            {order.customer_name && (
                              <span className="text-muted-foreground text-sm">{order.customer_name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {order.contract_amount && (
                              <span className="text-xs font-medium">
                                {Number(order.contract_amount).toLocaleString("ru-RU")} руб.
                              </span>
                            )}
                            {order.payment_status && (
                              <span className="text-xs text-muted-foreground">{order.payment_status}</span>
                            )}
                            {order.ship_date && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(order.ship_date).toLocaleDateString("ru")}
                              </span>
                            )}
                            <Badge variant={statusVariant[order.status] ?? "outline"}>
                              {order.status_display}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                    {/* Pagination */}
                    {myOrdersData.count > myOrdersData.page_size && (
                      <div className="flex items-center justify-between pt-4">
                        <span className="text-xs text-muted-foreground">
                          {myOrdersData.count} заказов, стр. {myOrdersData.page}
                        </span>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" onClick={() => setOrdersPage(ordersPage - 1)} disabled={ordersPage <= 1}>
                            Назад
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setOrdersPage(ordersPage + 1)} disabled={myOrdersData.orders.length < myOrdersData.page_size}>
                            Вперёд
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: My Customers ── */}
        <TabsContent value="customers" className="mt-4">
          <MyCustomersTab />
        </TabsContent>

        {/* ── Tab: Statistics ── */}
        <TabsContent value="stats" className="mt-4">
          <MyStatsTab />
        </TabsContent>

        {/* ── Tab: Activity ── */}
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Последняя активность</CardTitle>
            </CardHeader>
            <CardContent>
              {!activityData?.results.length ? (
                <p className="text-muted-foreground text-sm">Нет активности</p>
              ) : (
                <div className="space-y-3">
                  {activityData.results.map((item: ActivityItem) => (
                    <ActivityRow key={item.id} item={item} onClick={() => item.link && navigate(item.link)} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Profile ── */}
        <TabsContent value="profile" className="mt-4 space-y-4">
          <AvatarUploadCard
            avatarUrl={user?.avatar ?? null}
            initials={initials}
            onAvatarChange={() => qc.invalidateQueries({ queryKey: ["users", "me"] })}
          />

          <ProfileFormCard
            user={user!}
            onSave={(data) => {
              return usersApi.updateMe(data).then((updated) => {
                qc.invalidateQueries({ queryKey: ["users", "me"] })
                setUser(updated)
              })
            }}
          />

          {user && (
            <Card className="max-w-2xl">
              <CardHeader>
                <CardTitle>Информация об аккаунте</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Логин" value={user.username} />
                {user.last_login && (
                  <InfoRow label="Последний вход" value={new Date(user.last_login).toLocaleString("ru")} />
                )}
                {user.date_joined && (
                  <InfoRow label="Дата регистрации" value={new Date(user.date_joined).toLocaleString("ru")} />
                )}
                {user.groups && user.groups.length > 0 && (
                  <InfoRow label="Группы" value={user.groups.join(", ")} />
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: Settings ── */}
        <TabsContent value="settings" className="mt-4 space-y-4">
          <ChangePasswordCard />

          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Настройки уведомлений</CardTitle>
            </CardHeader>
            <CardContent>
              <NotificationSettingsCard />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Sub-components ──

function NumberCard({ label, value, icon, variant = "default" }: {
  label: string; value: number; icon: React.ReactNode; variant?: "default" | "destructive"
}) {
  const isRed = variant === "destructive" && value > 0
  return (
    <Card className={isRed ? "border-destructive/50" : ""}>
      <CardContent className="pt-4 pb-3 flex items-center gap-3">
        <div className={`rounded-lg p-2 ${isRed ? "bg-destructive/10 text-destructive" : "bg-muted"}`}>
          {icon}
        </div>
        <div>
          <p className={`text-2xl font-bold ${isRed ? "text-destructive" : ""}`}>{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityRow({ item, onClick }: { item: ActivityItem; onClick: () => void }) {
  const categoryIcon: Record<string, React.ReactNode> = {
    info: <Bell className="size-4 text-blue-500" />,
    success: <CheckCircle2 className="size-4 text-green-500" />,
    warning: <AlertTriangle className="size-4 text-amber-500" />,
    error: <AlertTriangle className="size-4 text-red-500" />,
  }
  return (
    <button
      onClick={onClick}
      className={`flex items-start gap-3 w-full text-left p-2 -mx-2 rounded hover:bg-muted/50 ${!item.is_read ? "bg-muted/30" : ""}`}
    >
      <div className="mt-0.5">{categoryIcon[item.category] ?? categoryIcon.info}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${!item.is_read ? "font-medium" : ""}`}>{item.title}</p>
        {item.message && <p className="text-xs text-muted-foreground truncate">{item.message}</p>}
        <p className="text-xs text-muted-foreground mt-0.5">
          {new Date(item.created_at).toLocaleString("ru")}
        </p>
      </div>
    </button>
  )
}

function AvatarUploadCard({ avatarUrl, initials, onAvatarChange }: {
  avatarUrl: string | null; initials: string; onAvatarChange: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  const uploadMutation = useMutation({
    mutationFn: (file: File) => usersApi.uploadAvatar(file),
    onSuccess: () => { onAvatarChange(); toast.success("Аватар обновлён") },
    onError: () => toast.error("Ошибка загрузки аватара"),
  })

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.deleteAvatar(),
    onSuccess: () => { onAvatarChange(); toast.success("Аватар удалён") },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadMutation.mutate(file)
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Фото профиля</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-6">
        <Avatar className="size-20">
          <AvatarImage src={avatarUrl ?? undefined} />
          <AvatarFallback className="text-xl font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            <Camera className="size-4 mr-1" />
            {uploadMutation.isPending ? "Загрузка..." : "Загрузить"}
          </Button>
          {avatarUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="size-4 mr-1" />
              Удалить
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ProfileFormCard({ user, onSave }: {
  user: { first_name: string; last_name: string; patronymic: string; email: string; phone: string; extension_number: string; position: string; department: string; company: string }
  onSave: (data: Partial<ProfileFormValues>) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      patronymic: user.patronymic ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      extension_number: user.extension_number ?? "",
      position: user.position ?? "",
      department: user.department ?? "",
      company: user.company ?? "",
    },
  })

  const handleSubmit = async (values: ProfileFormValues) => {
    setSaving(true)
    try {
      await onSave(values)
      toast.success("Профиль обновлён")
    } catch {
      toast.error("Ошибка при сохранении")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Личные данные</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {(
                [
                  ["last_name", "Фамилия"],
                  ["first_name", "Имя"],
                  ["patronymic", "Отчество"],
                  ["email", "Email"],
                  ["phone", "Телефон"],
                  ["extension_number", "Добавочный"],
                  ["position", "Должность"],
                  ["department", "Отдел"],
                ] as const
              ).map(([name, label]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input {...field} type={name === "email" ? "email" : "text"} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Компания</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Сохранение..." : "Сохранить изменения"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

function ChangePasswordCard() {
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: "", new_password: "", new_password_confirm: "" },
  })

  const mutation = useMutation({
    mutationFn: (data: PasswordFormValues) => usersApi.changePassword(data),
    onSuccess: () => {
      toast.success("Пароль изменён")
      form.reset()
    },
    onError: (err: any) => {
      const detail = err.response?.data
      if (detail?.current_password) {
        form.setError("current_password", { message: detail.current_password[0] })
      } else if (detail?.new_password) {
        form.setError("new_password", { message: detail.new_password[0] })
      } else if (detail?.new_password_confirm) {
        form.setError("new_password_confirm", { message: detail.new_password_confirm[0] })
      } else {
        toast.error("Ошибка при смене пароля")
      }
    },
  })

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="size-5" />
          Смена пароля
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="current_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Текущий пароль</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="new_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Новый пароль</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="new_password_confirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Подтверждение пароля</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Сохранение..." : "Изменить пароль"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

function NotificationSettingsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "preferences"],
    queryFn: () => import("@/api/client").then((m) => m.default.get("/notifications/preferences/").then((r) => r.data)),
  })

  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (update: Record<string, string>) =>
      import("@/api/client").then((m) => m.default.patch("/notifications/preferences/", update).then((r) => r.data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", "preferences"] })
      toast.success("Настройки сохранены")
    },
  })

  if (isLoading) return <Skeleton className="h-40" />

  const PREF_LABELS: Record<string, string> = {
    order_created: "Новые заказы",
    order_status_changed: "Изменение статуса заказа",
    order_deadline: "Дедлайны и просрочки",
    contract_payment: "Оплата контрактов",
    comments: "Комментарии",
    import_completed: "Завершение импорта",
  }

  const CHANNEL_OPTIONS = [
    { value: "bell", label: "В приложении" },
    { value: "all", label: "Приложение + email" },
    { value: "none", label: "Отключены" },
  ]

  return (
    <div className="space-y-3">
      {Object.entries(PREF_LABELS).map(([key, label]) => (
        <div key={key} className="flex items-center justify-between">
          <span className="text-sm">{label}</span>
          <select
            className="text-sm border rounded px-2 py-1"
            value={data?.[key] ?? "bell"}
            onChange={(e) => mutation.mutate({ [key]: e.target.value })}
          >
            {CHANNEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
