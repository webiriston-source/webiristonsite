import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Flame, Snowflake, Mail, MessageSquare, Calendar, ExternalLink } from "lucide-react";
import type { Lead } from "@shared/schema";

const projectTypeLabels: Record<string, string> = {
  landing: "Лендинг",
  website: "Корпоративный сайт",
  ecommerce: "Интернет-магазин",
  saas: "SaaS-платформа",
  webapp: "Веб-приложение",
  "telegram-bot": "Telegram-бот",
  other: "Другое",
};

const featureLabels: Record<string, string> = {
  auth: "Авторизация",
  admin: "Админ-панель",
  payment: "Онлайн-оплата",
  profile: "Личный кабинет",
  integrations: "Интеграции",
  multilang: "Мультиязычность",
};

const designLabels: Record<string, string> = {
  basic: "Базовый",
  modern: "Современный",
  premium: "Премиум + UX",
};

const urgencyLabels: Record<string, string> = {
  relaxed: "Не срочно",
  standard: "Стандарт",
  urgent: "Срочно",
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat("ru-RU").format(price) + " ₽";
}

export default function AdminLeads() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [scoringFilter, setScoringFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const { toast } = useToast();

  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/leads/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/stats"] });
      toast({ title: "Статус обновлён" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось обновить статус", variant: "destructive" });
    },
  });

  const filteredLeads = leads?.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || lead.type === typeFilter;
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesScoring = scoringFilter === "all" || lead.scoring === scoringFilter;
    return matchesSearch && matchesType && matchesStatus && matchesScoring;
  });

  const ScoringIcon = ({ scoring }: { scoring: string }) => {
    switch (scoring) {
      case "A":
        return <Flame className="h-4 w-4 text-orange-500" />;
      case "B":
        return <span className="text-yellow-500">●</span>;
      case "C":
        return <Snowflake className="h-4 w-4 text-blue-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Заявки</h1>
        <p className="text-muted-foreground">Управление заявками с сайта</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени или email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-leads"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-type-filter">
                  <SelectValue placeholder="Тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value="contact">Контакт</SelectItem>
                  <SelectItem value="estimation">Оценка</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="new">Новые</SelectItem>
                  <SelectItem value="in_progress">В работе</SelectItem>
                  <SelectItem value="closed">Закрыты</SelectItem>
                </SelectContent>
              </Select>
              <Select value={scoringFilter} onValueChange={setScoringFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-scoring-filter">
                  <SelectValue placeholder="Scoring" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="A">A - Горячие</SelectItem>
                  <SelectItem value="B">B - Тёплые</SelectItem>
                  <SelectItem value="C">C - Холодные</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredLeads && filteredLeads.length > 0 ? (
            <div className="space-y-2">
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-4 rounded-md bg-muted/50 hover-elevate cursor-pointer"
                  onClick={() => setSelectedLead(lead)}
                  data-testid={`lead-row-${lead.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background">
                      <ScoringIcon scoring={lead.scoring} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{lead.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {lead.type === "contact" ? "Контакт" : "Оценка"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </span>
                        {lead.telegram && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {lead.telegram}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Select
                      value={lead.status}
                      onValueChange={(status) => {
                        updateStatusMutation.mutate({ id: lead.id, status });
                      }}
                    >
                      <SelectTrigger
                        className={`w-[130px] ${
                          lead.status === "new"
                            ? "border-blue-500/50 text-blue-500"
                            : lead.status === "in_progress"
                            ? "border-yellow-500/50 text-yellow-500"
                            : "border-green-500/50 text-green-500"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`select-status-${lead.id}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Новая</SelectItem>
                        <SelectItem value="in_progress">В работе</SelectItem>
                        <SelectItem value="closed">Закрыта</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="text-right min-w-[100px]">
                      <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                        <Calendar className="h-3 w-3" />
                        {new Date(lead.createdAt).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-12">
              {searchQuery || typeFilter !== "all" || statusFilter !== "all" || scoringFilter !== "all"
                ? "Заявки по заданным фильтрам не найдены"
                : "Заявок пока нет"}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScoringIcon scoring={selectedLead?.scoring || "C"} />
              Заявка от {selectedLead?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedLead.email}</p>
                </div>
                {selectedLead.telegram && (
                  <div>
                    <p className="text-sm text-muted-foreground">Telegram</p>
                    <p className="font-medium">{selectedLead.telegram}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Тип</p>
                  <p className="font-medium">
                    {selectedLead.type === "contact" ? "Контактная форма" : "Оценка проекта"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Дата</p>
                  <p className="font-medium">
                    {new Date(selectedLead.createdAt).toLocaleString("ru-RU")}
                  </p>
                </div>
              </div>

              {selectedLead.message && (
                <div>
                  <p className="text-sm text-muted-foreground">Сообщение</p>
                  <p className="mt-1 p-3 rounded-md bg-muted">{selectedLead.message}</p>
                </div>
              )}

              {selectedLead.type === "estimation" && (
                <>
                  <div className="border-t pt-4">
                    <p className="font-medium mb-3">Детали проекта</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Тип проекта</p>
                        <p className="font-medium">
                          {projectTypeLabels[selectedLead.projectType || ""] || selectedLead.projectType}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Дизайн</p>
                        <p className="font-medium">
                          {designLabels[selectedLead.designComplexity || ""] || selectedLead.designComplexity}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Срочность</p>
                        <p className="font-medium">
                          {urgencyLabels[selectedLead.urgency || ""] || selectedLead.urgency}
                        </p>
                      </div>
                      {selectedLead.budget && (
                        <div>
                          <p className="text-sm text-muted-foreground">Бюджет клиента</p>
                          <p className="font-medium">{selectedLead.budget}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedLead.features && selectedLead.features.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Функции</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedLead.features.map((f) => (
                          <Badge key={f} variant="secondary">
                            {featureLabels[f] || f}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedLead.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Описание проекта</p>
                      <p className="mt-1 p-3 rounded-md bg-muted">{selectedLead.description}</p>
                    </div>
                  )}

                  {selectedLead.estimatedMinPrice && selectedLead.estimatedMaxPrice && (
                    <div className="border-t pt-4">
                      <p className="font-medium mb-3">Автооценка</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Стоимость</p>
                          <p className="font-medium text-lg">
                            {formatPrice(selectedLead.estimatedMinPrice)} — {formatPrice(selectedLead.estimatedMaxPrice)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Сроки</p>
                          <p className="font-medium text-lg">
                            {selectedLead.estimatedMinDays}—{selectedLead.estimatedMaxDays} дней
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedLead(null)}>
                  Закрыть
                </Button>
                <Button
                  variant="default"
                  onClick={() => window.open(`mailto:${selectedLead.email}`, "_blank")}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Написать
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
