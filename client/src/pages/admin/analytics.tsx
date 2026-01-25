import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Flame, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { Lead } from "@shared/schema";

interface LeadStats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byScoring: Record<string, number>;
  thisMonth: number;
  lastMonth: number;
  avgMinPrice?: number;
  avgMaxPrice?: number;
  projectTypeCounts?: Record<string, number>;
}

const COLORS = {
  A: "#f97316",
  B: "#eab308",
  C: "#3b82f6",
};

const STATUS_COLORS = {
  new: "#3b82f6",
  in_progress: "#eab308",
  closed: "#22c55e",
};

export default function AdminAnalytics() {
  const { data: stats, isLoading: statsLoading } = useQuery<LeadStats>({
    queryKey: ["/api/?action=getAnalytics"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE || window.location.origin}/api/?action=getAnalytics`);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
  });

  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/?action=getRequests"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE || window.location.origin}/api/?action=getRequests`);
      if (!response.ok) throw new Error("Failed to fetch leads");
      return response.json();
    },
  });

  const scoringData = stats
    ? [
        { name: "A - Горячие", value: stats.byScoring?.A || 0, color: COLORS.A },
        { name: "B - Тёплые", value: stats.byScoring?.B || 0, color: COLORS.B },
        { name: "C - Холодные", value: stats.byScoring?.C || 0, color: COLORS.C },
      ]
    : [];

  const statusData = stats
    ? [
        { name: "Новые", value: stats.byStatus?.new || 0, fill: STATUS_COLORS.new },
        { name: "В работе", value: stats.byStatus?.in_progress || 0, fill: STATUS_COLORS.in_progress },
        { name: "Закрыты", value: stats.byStatus?.closed || 0, fill: STATUS_COLORS.closed },
      ]
    : [];

  const typeData = stats
    ? [
        { name: "Контакты", value: stats.byType?.contact || 0 },
        { name: "Оценки", value: stats.byType?.estimation || 0 },
      ]
    : [];

  const growth = stats
    ? stats.lastMonth > 0
      ? Math.round(((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100)
      : stats.thisMonth > 0
      ? 100
      : 0
    : 0;

  const conversionRate = stats
    ? stats.total > 0
      ? Math.round(((stats.byStatus?.in_progress || 0) + (stats.byStatus?.closed || 0)) / stats.total * 100)
      : 0
    : 0;

  const hotLeadRate = stats
    ? stats.total > 0
      ? Math.round((stats.byScoring?.A || 0) / stats.total * 100)
      : 0
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Аналитика</h1>
        <p className="text-muted-foreground">Статистика по заявкам и конверсиям</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Рост заявок
            </CardTitle>
            {growth >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${growth >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {growth >= 0 ? "+" : ""}{growth}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.thisMonth || 0} в этом месяце vs {stats?.lastMonth || 0} в прошлом
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Конверсия в работу
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{conversionRate}%</div>
                <p className="text-xs text-muted-foreground">
                  Заявок перешло в статус "В работе" или "Закрыта"
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Доля горячих лидов
            </CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-orange-500">{hotLeadRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.byScoring?.A || 0} из {stats?.total || 0} заявок
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего заявок
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.total || 0}</div>
                <p className="text-xs text-muted-foreground">
                  За всё время
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Распределение по scoring</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : scoringData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={scoringData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {scoringData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Нет данных для отображения
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Распределение по статусу</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : statusData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Нет данных для отображения
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Распределение по типу формы</CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : typeData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" className="text-xs" width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Нет данных для отображения
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
