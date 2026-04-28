import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { templatesApi } from '../api/client';
import type { TemplateListItem } from '../api/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Edit3, Plus, Trash2 } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";

type Scope = 'public' | 'my' | 'shared';

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id;

  interface IncomingState {
    letterId?: number
    prefillText?: string
    letterNumber?: string
    letterData?: unknown
  }
  const incomingState = (location.state ?? {}) as IncomingState;
  const letterId = incomingState.letterId;
  const prefillText = incomingState.prefillText;
  const letterNumber = incomingState.letterNumber;
  const letterData = incomingState.letterData;

  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [scope, setScope] = useState<Scope>('public');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [scope]);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await templatesApi.list(scope);
      setTemplates(data);
    } catch (err) {
      setError('Не удалось загрузить шаблоны');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, template: TemplateListItem) => {
    e.preventDefault();
    e.stopPropagation();

    if (template.owner_id !== currentUserId) {
      toast.error("Удаление разрешено только владельцу шаблона");
      return;
    }

    if (!window.confirm(`Вы уверены, что хотите удалить шаблон "${template.title}"?`)) {
      return;
    }

    try {
      await templatesApi.delete(template.id);
      toast.success("Шаблон успешно удален");
      loadTemplates();
    } catch (err) {
      toast.error("Ошибка при удалении шаблона");
      console.error(err);
    }
  };

  const handleCardClick = (template: TemplateListItem) => {
    navigate(`/edo/templates/${template.id}`, { 
      state: { 
        letterId,
        prefillText,
        letterNumber,
        letterData
      }
    });
  };

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="flex flex-col">
          <CardHeader className="gap-2">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent className="flex-grow space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </CardContent>
          <CardFooter className="gap-2 pt-4">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto p-6 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">ЭДО шаблоны</h1>
          <p className="text-muted-foreground mt-2">
            Управляйте шаблонами документов, создавайте новые или генерируйте документы из существующих.
          </p>
        </div>
        <Button asChild size="lg" className="shrink-0 shadow-sm">
          <Link to="/edo/builder">
            <Plus className="mr-2 h-4 w-4" /> Разработать шаблон
          </Link>
        </Button>
      </div>

      <Tabs 
        defaultValue="public" 
        value={scope} 
        onValueChange={(val) => setScope(val as Scope)} 
        className="w-full"
      >
        <TabsList className="mb-6 grid w-full grid-cols-3 md:w-auto md:inline-flex">
          <TabsTrigger value="public">Публичные</TabsTrigger>
          <TabsTrigger value="my">Мои шаблоны</TabsTrigger>
          <TabsTrigger value="shared">Доступные мне</TabsTrigger>
        </TabsList>

        {error && (
          <div className="bg-destructive/10 text-destructive border-l-4 border-destructive p-4 rounded-md mb-6">
            <p className="font-medium">{error}</p>
          </div>
        )}

        <TabsContent value={scope} className="mt-0">
          {loading ? (
            renderSkeletons()
          ) : templates.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center bg-muted/20 border-dashed">
              <div className="rounded-full bg-secondary/80 p-4 mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium tracking-tight mb-2">В этой категории нет шаблонов</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Вы можете создать свой собственный шаблон прямо сейчас с помощью удобного конструктора.
              </p>
              <Button asChild>
                <Link to="/edo/builder">Создать новый шаблон</Link>
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <Card 
                  key={template.id} 
                  className="flex flex-col hover:border-primary/50 transition-all shadow-sm hover:shadow-xl group relative cursor-pointer active:scale-[0.98]"
                  onClick={() => handleCardClick(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="bg-secondary/50 p-2 rounded-md">
                         {template.template_type === 'HTML' ? <FileText className="h-5 w-5 text-primary" /> : <Edit3 className="h-5 w-5 text-primary" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={template.visibility === 'PUBLIC' ? 'default' : 'secondary'}>
                          {template.visibility === 'PUBLIC' ? 'Публичный' : 'Ограниченный'}
                        </Badge>
                        {template.owner_id === currentUserId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors z-20"
                            onClick={(e) => handleDelete(e, template)}
                            title="Удалить шаблон"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <CardTitle className="text-xl line-clamp-1 group-hover:text-primary transition-colors">{template.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="font-normal text-xs uppercase tracking-wider">
                        {template.template_type}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-grow pb-4">
                    {template.description ? (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {template.description}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic line-clamp-1 mb-3">
                        Без описания
                      </p>
                    )}
                    
                    {template.placeholders.length > 0 && (
                      <div className="mt-4">
                         <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest block mb-2">
                           Поля шаблона
                         </span>
                         <div className="flex flex-wrap gap-1">
                           {template.placeholders.slice(0, 4).map((ph, idx) => (
                             <span key={idx} className="inline-flex items-center rounded-sm bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                               {"{"}{ph}{"}"}
                             </span>
                           ))}
                           {template.placeholders.length > 4 && (
                             <span className="inline-flex items-center rounded-sm bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                               +{template.placeholders.length - 4}
                             </span>
                           )}
                         </div>
                      </div>
                    )}
                  </CardContent>
                  
                  <CardFooter className="pt-0 flex flex-col sm:flex-row gap-2 border-t mt-4 p-4 bg-muted/10 relative z-10">
                    <Button 
                      asChild 
                      variant="outline" 
                      className="w-full sm:flex-1" 
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link to={`/edo/builder`} state={{ templateToEdit: template, templateId: template.id }}>
                        <span className="truncate">Редактировать</span>
                      </Link>
                    </Button>
                    <Button 
                      asChild 
                      className="w-full sm:flex-1" 
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link to={`/edo/builder`} state={{ 
                        templateToEdit: template, 
                        templateId: template.id,
                        letterId,
                        prefillText,
                        letterNumber,
                        letterData
                      }}>
                        <span className="truncate">Сгенерировать</span>
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
