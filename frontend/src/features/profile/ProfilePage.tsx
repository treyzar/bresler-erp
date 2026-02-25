import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useAuthStore } from "@/stores/useAuthStore"
import { usersApi } from "@/api/usersApi"
import { useOrderList } from "@/api/hooks/useOrders"
import { ORDER_STATUSES } from "@/api/types"

const profileSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  patronymic: z.string(),
  email: z.string(),
  phone: z.string(),
  extension_number: z.string(),
  position: z.string(),
  department: z.string(),
  company: z.string(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export function ProfilePage() {
  const setUser = useAuthStore((s) => s.setUser)
  const qc = useQueryClient()

  const { data: user, isLoading } = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => usersApi.getMe(),
  })

  const { data: allOrders } = useOrderList({ page_size: 1 })
  const { data: recentOrders } = useOrderList({ page_size: 5, ordering: "-created_at" })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ProfileFormValues>) => usersApi.updateMe(data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["users", "me"] })
      setUser(updated)
      toast.success("Профиль обновлён")
    },
    onError: () => toast.error("Ошибка при сохранении"),
  })

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: user
      ? {
          first_name: user.first_name ?? "",
          last_name: user.last_name ?? "",
          patronymic: user.patronymic ?? "",
          email: user.email ?? "",
          phone: user.phone ?? "",
          extension_number: user.extension_number ?? "",
          position: user.position ?? "",
          department: user.department ?? "",
          company: user.company ?? "",
        }
      : undefined,
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

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Личный кабинет</h1>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Дашборд</TabsTrigger>
          <TabsTrigger value="profile">Профиль</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xl">
                {greeting},{" "}
                <span className="font-semibold">{user?.first_name || user?.username}</span>!
              </p>
              {user?.position && (
                <p className="text-muted-foreground text-sm mt-1">{user.position}</p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Всего заказов
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{allOrders?.count ?? "—"}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Последние заказы</CardTitle>
            </CardHeader>
            <CardContent>
              {recentOrders?.results.length === 0 ? (
                <p className="text-muted-foreground text-sm">Заказов нет</p>
              ) : (
                <div className="divide-y">
                  {recentOrders?.results.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between py-2"
                    >
                      <div>
                        <span className="font-medium">#{order.order_number}</span>
                        {order.customer_name && (
                          <span className="text-muted-foreground text-sm ml-2">
                            {order.customer_name}
                          </span>
                        )}
                      </div>
                      <Badge variant="outline">
                        {ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES] ??
                          order.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Личные данные</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Фамилия</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Имя</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="patronymic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Отчество</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Телефон</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="extension_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Добавочный</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Должность</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Отдел</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Компания</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="pt-2">
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? "Сохранение..." : "Сохранить изменения"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {user && (
            <Card className="max-w-2xl">
              <CardHeader>
                <CardTitle>Информация об аккаунте</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Логин</span>
                  <span className="font-medium">{user.username}</span>
                </div>
                {user.last_login && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Последний вход</span>
                    <span className="font-medium">
                      {new Date(user.last_login).toLocaleString("ru")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Дата регистрации</span>
                  <span className="font-medium">
                    {new Date(user.date_joined).toLocaleString("ru")}
                  </span>
                </div>
                {user.groups && user.groups.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Группы</span>
                    <span className="font-medium">{user.groups.join(", ")}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
