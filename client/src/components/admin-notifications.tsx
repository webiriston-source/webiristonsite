import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export function AdminNotifications() {
  const { toast } = useToast();
  const [lastCount, setLastCount] = useState<number | null>(null);

  // Fetch unread count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/?action=getUnreadCount"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE || window.location.origin}/api/?action=getUnreadCount`);
      if (!response.ok) throw new Error("Failed to fetch unread count");
      return response.json();
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const unreadCount = unreadData?.count || 0;

  // Show notification when new leads appear
  useEffect(() => {
    if (lastCount !== null && unreadCount > lastCount) {
      const newLeads = unreadCount - lastCount;
      toast({
        title: "Новые заявки!",
        description: `Поступило ${newLeads} ${newLeads === 1 ? "новая заявка" : newLeads < 5 ? "новые заявки" : "новых заявок"}`,
      });
    }
    setLastCount(unreadCount);
  }, [unreadCount, lastCount, toast]);

  if (unreadCount === 0) return null;

  return (
    <Badge
      variant="destructive"
      className="h-5 min-w-5 flex items-center justify-center p-0 text-xs"
    >
      {unreadCount > 99 ? "99+" : unreadCount}
    </Badge>
  );
}
