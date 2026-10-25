import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { trpc } from "@/lib/trpc";

const cancellableStatuses = ["REQUESTED", "ASSIGNED", "ACCEPTED", "QUOTE_PENDING", "QUOTE_ACCEPTED", "SCHEDULED", "IN_PROGRESS"];

function AssignRequestControl({ requestId }: { requestId: number }) {
  const candidatesQuery = trpc.admin.assignableProviders.useQuery({ requestId });
  const [providerId, setProviderId] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const assignRequest = trpc.admin.assignRequest.useMutation({
    onSuccess: () => {
      void utils.admin.requests.invalidate();
      void utils.admin.assignableProviders.invalidate({ requestId });
      void utils.admin.analytics.invalidate();
    },
  });

  if (candidatesQuery.isLoading) return <Text className="mt-3 text-xs text-muted">Recherche des prestataires compatibles…</Text>;
  if (candidatesQuery.error) return <Text className="mt-3 text-xs text-error">Prestataires disponibles momentanément indisponibles.</Text>;
  const candidates = candidatesQuery.data ?? [];
  if (candidates.length === 0) return <Text className="mt-3 text-xs text-muted">Aucun prestataire vérifié ne couvre cette prestation et cette zone. Vérifiez le catalogue ou les profils avant d’affecter.</Text>;

  return (
    <View className="mt-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
      <Text className="text-xs font-bold uppercase tracking-wide text-primary">Affectation manuelle</Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {candidates.map((candidate) => <Pressable key={candidate.id} onPress={() => setProviderId(candidate.id)} style={({ pressed }) => ({ borderRadius: 12, borderWidth: 1, borderColor: providerId === candidate.id ? "#0D6B5B" : "#D9DEDA", backgroundColor: providerId === candidate.id ? "#0D6B5B" : "#FFFFFF", paddingHorizontal: 12, paddingVertical: 8, opacity: pressed ? 0.8 : 1 })}><Text className={`text-xs font-bold ${providerId === candidate.id ? "text-white" : "text-foreground"}`}>{candidate.displayName}</Text></Pressable>)}
      </View>
      <Pressable disabled={!providerId || assignRequest.isPending} onPress={() => { if (providerId) assignRequest.mutate({ requestId, providerId, note: "Affectation manuelle depuis l’administration du pilote." }); }} style={({ pressed }) => ({ marginTop: 10, borderRadius: 12, backgroundColor: providerId ? "#0D6B5B" : "#D9DEDA", paddingVertical: 10, alignItems: "center", opacity: pressed ? 0.82 : 1 })}><Text className="text-sm font-bold text-white">{assignRequest.isPending ? "Affectation…" : "Affecter ce prestataire"}</Text></Pressable>
      {assignRequest.error ? <Text className="mt-2 text-xs text-error">L’affectation a été refusée : le prestataire ou la demande ne remplit plus les conditions.</Text> : null}
    </View>
  );
}

export function AdminRequestsPanel() {
  const requestsQuery = trpc.admin.requests.useQuery();
  const utils = trpc.useUtils();
  const cancelRequest = trpc.admin.cancelRequest.useMutation({ onSuccess: () => utils.admin.requests.invalidate() });

  if (requestsQuery.isLoading) return <View className="items-center rounded-3xl border border-border bg-surface p-8"><ActivityIndicator color="#0D6B5B" /><Text className="mt-3 text-sm text-muted">Chargement des demandes…</Text></View>;
  if (requestsQuery.error) return <View className="rounded-3xl border border-coral/30 bg-coral/10 p-5"><Text className="font-bold text-foreground">Demandes indisponibles</Text><Text className="mt-1 text-sm leading-5 text-muted">La file opérationnelle n’a pas pu être chargée.</Text><Pressable onPress={() => void requestsQuery.refetch()} className="mt-4 self-start rounded-2xl bg-primary px-4 py-3"><Text className="font-bold text-white">Réessayer</Text></Pressable></View>;

  const requests = requestsQuery.data ?? [];
  return <View className="gap-3">{requests.length === 0 ? <Text className="rounded-3xl border border-dashed border-border bg-surface p-6 text-center text-muted">Aucune demande enregistrée.</Text> : requests.map(({ request, customerName, providerName, appointment }) => {
    const canCancel = cancellableStatuses.includes(request.status);
    const canAssign = request.status === "REQUESTED" && !request.assignedProviderId;
    return <View key={request.id} className="rounded-3xl border border-border bg-surface p-4">
      <View className="flex-row items-center justify-between"><Text className="font-bold text-foreground">{request.reference}</Text><Text className="text-xs font-bold text-primary">{request.status}</Text></View>
      <Text className="mt-2 text-sm text-foreground">{request.commune} · {request.quartier} · {customerName || "Compte client"}</Text>
      <Text className="mt-1 text-xs text-muted">Prestataire : {providerName || "Non affecté"}</Text>
      {request.desiredSlot ? <Text className="mt-2 text-xs font-semibold text-primary">Créneau souhaité : {new Date(request.desiredSlot).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</Text> : <Text className="mt-2 text-xs text-error">Aucun créneau souhaité</Text>}
      {appointment?.status === "confirmed" ? <Text className="mt-1 text-xs text-primary">Rendez-vous confirmé jusqu’à {new Date(appointment.endsAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</Text> : null}
      {canAssign ? <AssignRequestControl requestId={request.id} /> : null}
      {canCancel ? <Pressable disabled={cancelRequest.isPending} onPress={() => cancelRequest.mutate({ requestId: request.id, reason: "Annulation administrative du pilote" })} className="mt-4 items-center rounded-2xl border border-coral/40 py-3"><Text className="text-sm font-bold text-error">{cancelRequest.isPending ? "Annulation…" : "Annuler côté administration"}</Text></Pressable> : null}
      {cancelRequest.error ? <Text className="mt-2 text-sm text-error">L’annulation n’a pas pu être enregistrée.</Text> : null}
    </View>;
  })}</View>;
}
