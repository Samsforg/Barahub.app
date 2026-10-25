import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

export function ConversationCard({ requestId, viewer }: { requestId: number; viewer: "client" | "prestataire" }) {
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const query = trpc.messages.list.useQuery({ requestId }, { refetchInterval: 5_000, refetchIntervalInBackground: false });
  const utils = trpc.useUtils();
  const send = trpc.messages.send.useMutation({ onSuccess: () => { setDraft(""); void utils.messages.list.invalidate({ requestId }); } });
  const markRead = trpc.messages.markRead.useMutation({ onSuccess: () => { void utils.messages.list.invalidate({ requestId }); } });
  const markReadMessage = markRead.mutate;
  const items = useMemo(() => (query.data?.items ?? []).slice(-12), [query.data?.items]);

  useEffect(() => {
    if (query.data?.unreadCount && !markRead.isPending) markReadMessage({ requestId });
  }, [query.data?.unreadCount, requestId, markReadMessage, markRead.isPending]);

  const submit = () => {
    const body = draft.trim();
    if (!body || send.isPending) return;
    send.mutate({ requestId, body, idempotencyKey: `message-${requestId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
  };

  return (
    <View className="mt-4 rounded-2xl border border-border bg-surface p-3">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="font-bold text-foreground">Coordination</Text>
          <Text className="mt-1 text-xs text-muted">Échangez sans partager vos coordonnées personnelles.</Text>
        </View>
        {query.isFetching ? <ActivityIndicator size="small" color="#0D6B5B" /> : null}
      </View>

      {query.error ? <Text className="mt-3 text-sm text-error">La conversation est momentanément indisponible.</Text> : null}
      {!query.error && items.length === 0 ? <Text className="mt-3 text-sm leading-5 text-muted">Aucun message. Confirmez le créneau ou partagez une consigne utile à l’intervention.</Text> : null}
      {items.map((message) => {
        const mine = message.senderId === user?.id;
        return (
          <View key={message.id} className={`mt-2 max-w-[88%] rounded-2xl px-3 py-2 ${mine ? "self-end bg-primary" : "self-start bg-sand"}`}>
            <Text className={`text-[10px] font-bold uppercase ${mine ? "text-white/70" : "text-primary"}`}>{mine ? "Vous" : viewer === "client" ? "Prestataire" : "Client"}</Text>
            <Text className={`text-sm leading-5 ${mine ? "text-white" : "text-foreground"}`}>{message.body}</Text>
            <Text className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-muted"}`}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
          </View>
        );
      })}

      <View className="mt-3 flex-row items-end gap-2">
        <TextInput value={draft} onChangeText={setDraft} placeholder="Écrire un message…" placeholderTextColor="#87938F" multiline maxLength={2000} textAlignVertical="top" className="min-h-11 flex-1 rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground" />
        <Pressable accessibilityLabel="Envoyer le message" disabled={!draft.trim() || send.isPending} onPress={submit} style={({ pressed }) => ({ height: 44, width: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: draft.trim() && !send.isPending ? "#0D6B5B" : "#D9DEDA", opacity: pressed ? 0.78 : 1 })}>
          <Text className="text-lg font-bold text-white">↑</Text>
        </Pressable>
      </View>
      {send.error ? <Text className="mt-2 text-xs text-error">Message non envoyé. Vérifiez la connexion et réessayez.</Text> : null}
    </View>
  );
}
