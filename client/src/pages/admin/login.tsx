import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { setAuthToken, isAuthenticated } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";

export default function AdminLogin() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      setLocation("/admin/dashboard");
    }
  }, [setLocation]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { login: string; password: string }) => {
      const response = await apiRequest("POST", "/api/?action=login", credentials);
      return response.json();
    },
    onSuccess: (data: { success: boolean; token?: string }) => {
      if (data.success && data.token) {
        // Save token to localStorage
        setAuthToken(data.token);
        toast({ title: "Добро пожаловать!" });
        // Redirect to dashboard
        setLocation("/admin/dashboard");
      } else {
        toast({
          title: "Ошибка входа",
          description: "Токен не получен от сервера",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      const message = error.message || "";
      const isUnauthorized = message.includes("401");
      const isServerError = message.includes("500") || message.includes("Service error");
      toast({
        title: "Ошибка входа",
        description: isUnauthorized
          ? "Неверный логин или пароль"
          : isServerError
            ? "Сервер авторизации временно недоступен. Попробуйте позже."
            : "Не удалось выполнить вход. Попробуйте позже.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ login, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary" />
            </div>
          </div>
          <CardTitle>Вход в админ-панель</CardTitle>
          <CardDescription>Введите логин и пароль для доступа</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login">Логин</Label>
              <Input
                id="login"
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Введите логин"
                data-testid="input-admin-login"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                data-testid="input-admin-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
              data-testid="button-admin-login"
            >
              {loginMutation.isPending ? "Вход..." : "Войти"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
