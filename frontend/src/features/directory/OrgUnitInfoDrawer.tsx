import { useState, useEffect } from "react"
import { ChevronRight, Building2, Folder, MapPin, Phone, Mail, User, Info, Network, Users } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  orgUnitHooks,
  useOrgUnitAncestors,
  useOrgUnitChildren,
} from "@/api/hooks/useOrgUnits"
import { contactHooks } from "@/api/hooks/useContacts"
import { UNIT_TYPES, BUSINESS_ROLES } from "@/lib/constants"
import { cn } from "@/lib/utils"

interface OrgUnitInfoDrawerProps {
  id: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrgUnitInfoDrawer({ id, open, onOpenChange }: OrgUnitInfoDrawerProps) {
  const [activeId, setActiveId] = useState<number | null>(id)

  useEffect(() => {
    if (open && id) {
      setActiveId(id)
    }
  }, [open, id])

  const { data: orgUnit, isLoading: isOrgLoading } = orgUnitHooks.useGet(activeId)
  const { data: ancestors = [], isLoading: isAncestorsLoading } = useOrgUnitAncestors(activeId)
  const { data: children = [], isLoading: isChildrenLoading } = useOrgUnitChildren(activeId)
  const { data: contactsData, isLoading: isContactsLoading } = contactHooks.useList(
    activeId ? { org_unit: activeId, page_size: 100 } : undefined,
    { enabled: !!activeId }
  )

  const isLoading = isOrgLoading || isAncestorsLoading

  const handleNavigate = (newId: number) => {
    setActiveId(newId)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl flex flex-col gap-0 p-0 overflow-hidden">
        <SheetHeader className="p-6 pb-4 space-y-4">
          {isLoading ? (
            <>
              <div className="flex gap-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-20" />
              </div>
              <SheetTitle><Skeleton className="h-8 w-3/4" /></SheetTitle>
              <div className="flex gap-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-24" />
              </div>
            </>
          ) : (
            <>
              <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                <button 
                  onClick={() => setActiveId(id)} 
                  className="hover:text-foreground transition-colors underline decoration-dotted underline-offset-2"
                >
                  Начало
                </button>
                {ancestors.map((anc) => (
                  <div key={anc.id} className="flex items-center gap-1">
                    <ChevronRight className="size-3 shrink-0" />
                    <button
                      onClick={() => handleNavigate(anc.id)}
                      className="hover:text-foreground transition-colors truncate max-w-[120px]"
                      title={anc.name}
                    >
                      {anc.name}
                    </button>
                  </div>
                ))}
              </nav>
              
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-4">
                  <SheetTitle className="text-2xl font-bold tracking-tight">
                    {orgUnit?.name}
                  </SheetTitle>
                  <Badge variant={orgUnit?.is_active ? "default" : "secondary"}>
                    {orgUnit?.is_active ? "Активна" : "Неактивна"}
                  </Badge>
                </div>
                <SheetDescription className="text-sm">
                  {orgUnit?.full_name || "Информация об организации"}
                </SheetDescription>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-md font-medium bg-muted/50">
                  {UNIT_TYPES[orgUnit?.unit_type as keyof typeof UNIT_TYPES] || orgUnit?.unit_type}
                </Badge>
                <Badge variant="outline" className="rounded-md font-medium bg-muted/50">
                  {BUSINESS_ROLES[orgUnit?.business_role as keyof typeof BUSINESS_ROLES] || orgUnit?.business_role}
                </Badge>
              </div>
            </>
          )}
        </SheetHeader>

        <Tabs defaultValue="info" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 py-2 border-b bg-muted/10">
            <TabsList>
              <TabsTrigger value="info">Общее</TabsTrigger>
              <TabsTrigger value="structure">
                Структура
                {children.length > 0 && (
                  <span className="ml-2 text-[10px] opacity-70">({children.length})</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="contacts">
                Контакты
                {contactsData?.count ? (
                  <span className="ml-2 text-[10px] opacity-70">({contactsData.count})</span>
                ) : null}
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6">
              <TabsContent value="info" className="mt-0 space-y-8">
                <div className="grid gap-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                      <Info className="size-4" /> Юридические данные
                    </h4>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 bg-muted/30 p-4 rounded-xl border">
                      <InfoField label="ИНН" value={orgUnit?.inn} />
                      <InfoField label="КПП" value={orgUnit?.kpp} />
                      <InfoField label="ОГРН" value={orgUnit?.ogrn} />
                      <InfoField label="Внешний код" value={orgUnit?.external_code} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                      <MapPin className="size-4" /> Расположение
                    </h4>
                    <div className="space-y-4 px-1">
                      <InfoField label="Страна" value={orgUnit?.country_name} />
                      <InfoField label="Юридический адрес" value={orgUnit?.address} />
                    </div>
                  </div>

                  {orgUnit?.previous_names && orgUnit.previous_names.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">История наименований</h4>
                      <div className="space-y-2 border-l-2 border-muted pl-4 ml-1">
                        {orgUnit.previous_names.map((name, i) => (
                          <p key={i} className="text-sm text-muted-foreground italic">«{name}»</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="structure" className="mt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Дочерние элементы</h4>
                  <span className="text-xs text-muted-foreground">{children.length} объектов</span>
                </div>
                
                {isChildrenLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
                  </div>
                ) : children.length > 0 ? (
                  <div className="grid gap-2">
                    {children.map((child) => (
                      <Button
                        key={child.id}
                        variant="outline"
                        onClick={() => handleNavigate(child.id)}
                        className="h-auto py-3 px-4 justify-between bg-card hover:bg-accent group border-muted/60"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "size-8 rounded-md flex items-center justify-center shrink-0 border",
                            child.children_count > 0 ? "bg-primary/5 text-primary border-primary/10" : "bg-muted text-muted-foreground"
                          )}>
                            {child.children_count > 0 ? (
                              <Folder className="size-4" />
                            ) : (
                              <Building2 className="size-4" />
                            )}
                          </div>
                          <div className="flex flex-col items-start min-w-0">
                            <span className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                              {child.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                              {UNIT_TYPES[child.unit_type as keyof typeof UNIT_TYPES] || child.unit_type}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/10">
                    <Network className="size-10 text-muted-foreground/20 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">Структура отсутствует</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="contacts" className="mt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Сотрудники</h4>
                  {contactsData?.count ? (
                    <span className="text-xs text-muted-foreground">{contactsData.count} чел.</span>
                  ) : null}
                </div>

                {isContactsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                  </div>
                ) : contactsData?.results && contactsData.results.length > 0 ? (
                  <div className="grid gap-3">
                    {contactsData.results.map((contact) => (
                      <Card key={contact.id} className="overflow-hidden py-0 gap-0 border-muted/60 shadow-none hover:border-primary/30 transition-colors">
                        <CardHeader className="p-4 pb-2 gap-1">
                          <div className="flex items-center gap-2">
                            <User className="size-4 text-primary shrink-0" />
                            <CardTitle className="text-sm font-bold">{contact.full_name}</CardTitle>
                          </div>
                          {contact.position && (
                            <CardDescription className="text-xs pl-6">{contact.position}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="p-4 pt-0 pl-10 space-y-2">
                          <div className="flex flex-col gap-1.5">
                            {contact.phone && (
                              <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit">
                                <Phone className="size-3" />
                                {contact.phone}
                              </a>
                            )}
                            {contact.email && (
                              <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-xs text-primary/80 hover:text-primary hover:underline transition-colors w-fit">
                                <Mail className="size-3" />
                                {contact.email}
                              </a>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/10">
                    <Users className="size-10 text-muted-foreground/20 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">Контакты не привязаны</p>
                  </div>
                )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{label}</p>
      <p className="text-sm font-medium leading-relaxed">{value}</p>
    </div>
  )
}
