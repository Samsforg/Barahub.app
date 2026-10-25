import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

const iconByType = {
  new_mission: "briefcase-outline",
  mission_update: "sync-outline",
  new_review: "star-outline",
  review_published: "checkmark-circle-outline",
  message: "chatbubble-ellipses-outline",
  system: "information-circle-outline",
} as const;

export function NotificationCenter() {
  const { isAuthenticated } = useAuth();
  const query = trpc.notifications.mine.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
  });
  const utils = trpc.useUtils();
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: () => utils.notifications.mine.invalidate() });
  const markAllRead = trpc.notifications.markAllRead.useMutation({ onSuccess: () => utils.notifications.mine.invalidate() });

  if (!isAuthenticated) return null;

  const items = query.data?.items ?? [];
  const unreadCount = query.data?.unreadCount ?? 0;

  return (
    <View className="mt-6 rounded-3xl border border-border bg-surface p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center"><View className="h-9 w-9 items-center justify-center rounded-full bg-sand"><Ionicons name="notifications-outline" size={19} color="#0D6B5B" /></View><Text className="ml-3 text-lg font-bold text-foreground">Notifications</Text>{unreadCount > 0 ? <View className="ml-2 min-w-6 items-center rounded-full bg-coral px-2 py-1"><Text className="text-xs font-bold text-white">{unreadCount}</Text></View> : null}</View>
        {unreadCount > 0 ? <Pressable disabled={markAllRead.isPending} onPress={() => markAllRead.mutate()}><Text className="text-xs font-bold text-primary">Tout lire</Text></Pressable> : null}
      </View>

      {query.isLoading ? <Text className="mt-4 text-sm text-muted">Recherche de nouvelles notifications…</Text> : null}
      {query.error ? <Text className="mt-4 text-sm text-error">Notifications momentanément indisponibles.</Text> : null}
      {!query.isLoading && !query.error && items.length === 0 ? <Text className="mt-4 text-sm leading-5 text-muted">Vous verrez ici les nouvelles missions, changements de statut et avis.</Text> : null}
      {!query.isLoading && !query.error ? <View className="mt-3">{items.slice(0, 8).map((item) => { const icon = iconByType[item.type] ?? iconByType.system; return <Pressable key={item.id} onPress={() => { if (!item.readAt) markRead.mutate({ notificationId: item.id }); }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "flex-start", borderTopWidth: 1, borderTopColor: "#E4E8E3", paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}><View className={`mt-0.5 h-8 w-8 items-center justify-center rounded-full ${item.readAt ? "bg-sand" : "bg-primary/10"}`}><Ionicons name={icon} size={16} color="#0D6B5B" /></View><View className="ml-3 flex-1"><View className="flex-row items-center"><Text className="flex-1 text-sm font-bold text-foreground">{item.title}</Text>{!item.readAt ? <View className="ml-2 h-2 w-2 rounded-full bg-coral" /> : null}</View><Text className="mt-1 text-sm leading-5 text-muted">{item.body}</Text>{item.reference ? <Text className="mt-1 text-xs font-semibold text-primary">{item.reference}</Text> : null}</View></Pressable>; })}</View> : null}
    </View>
  );
}
