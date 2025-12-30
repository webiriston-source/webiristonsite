import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, Flame, Snowflake, Clock } from "lucide-react";
import type { Lead } from "@shared/schema";

interface LeadStats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byScoring: Record<string, number>;
  thisMonth: number;
  lastMonth: number;
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<LeadStats>({
    queryKey: ["/api/leads/stats"],
  });

  const { data: recentLeads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const growth = stats
    ? stats.lastMonth > 0
      ? Math.round(((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100)
      : stats.thisMonth > 0
      ? 100
      : 0
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Дашборд</h1>
        <p className="text-muted-foreground">Обзор заявок и статистики</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего заявок
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              В этом месяце
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.thisMonth || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {growth >= 0 ? "+" : ""}{growth}% от прошлого месяца
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Горячие лиды
            </CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-orange-500">
                {stats?.byScoring?.A || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Новые заявки
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-blue-500">
                {stats?.byStatus?.new || 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">По типу</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {statsLoading ? (
              <>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Контакты</span>
                  <span className="font-medium">{stats?.byType?.contact || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Оценки</span>
                  <span className="font-medium">{stats?.byType?.estimation || 0}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">По статусу</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {statsLoading ? (
              <>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Новые</span>
                  <span className="font-medium">{stats?.byStatus?.new || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">В работе</span>
                  <span className="font-medium">{stats?.byStatus?.in_progress || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Закрыты</span>
                  <span className="font-medium">{stats?.byStatus?.closed || 0}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">По scoring</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {statsLoading ? (
              <>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-muted-foreground">A - Горячие</span>
                  </span>
                  <span className="font-medium">{stats?.byScoring?.A || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 flex items-center justify-center text-yellow-500">●</span>
                    <span className="text-muted-foreground">B - Тёплые</span>
                  </span>
                  <span className="font-medium">{stats?.byScoring?.B || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <Snowflake className="h-4 w-4 text-blue-400" />
                    <span className="text-muted-foreground">C - Холодные</span>
                  </span>
                  <span className="font-medium">{stats?.byScoring?.C || 0}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Последние заявки</CardTitle>
        </CardHeader>
        <CardContent>
          {leadsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentLeads && recentLeads.length > 0 ? (
            <div className="space-y-2">
              {recentLeads.slice(0, 5).map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8">
                      {lead.scoring === "A" && <Flame className="h-5 w-5 text-orange-500" />}
                      {lead.scoring === "B" && <span className="text-yellow-500 text-lg">●</span>}
                      {lead.scoring === "C" && <Snowflake className="h-5 w-5 text-blue-400" />}
                    </div>
                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {lead.type === "contact" ? "Контакт" : "Оценка проекта"} • {lead.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        lead.status === "new"
                          ? "bg-blue-500/10 text-blue-500"
                          : lead.status === "in_progress"
                          ? "bg-yellow-500/10 text-yellow-500"
                          : "bg-green-500/10 text-green-500"
                      }`}
                    >
                      {lead.status === "new" ? "Новая" : lead.status === "in_progress" ? "В работе" : "Закрыта"}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(lead.createdAt).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Заявок пока нет
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
