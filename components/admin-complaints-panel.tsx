import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { trpc } from "@/lib/trpc";

const statusLabels = { open: "À traiter", in_progress: "En cours", resolved: "Résolue", dismissed: "Rejetée" } as const;
const statusTone = { open: "text-error", in_progress: "text-primary", resolved: "text-primary", dismissed: "text-muted" } as const;

export function AdminComplaintsPanel() {
  const complaintsQuery = trpc.admin.complaints.useQuery();
  const utils = trpc.useUtils();
  const [notes, setNotes] = useState<Record<number, string>>({});
  const resolveComplaint = trpc.admin.resolveComplaint.useMutation({
    onSuccess: () => {
      void utils.admin.complaints.invalidate();
      void utils.admin.requests.invalidate();
      void utils.admin.analytics.invalidate();
    },
  });

  if (complaintsQuery.isLoading) return <View className="items-center rounded-3xl border border-border bg-surface p-8"><ActivityIndicator color="#0D6B5B" /><Text className="mt-3 text-sm text-muted">Chargement des réclamations…</Text></View>;
  if (complaintsQuery.error) return <View className="rounded-3xl border border-coral/30 bg-coral/10 p-5"><Text className="font-bold text-foreground">Réclamations indisponibles</Text><Text className="mt-1 text-sm leading-5 text-muted">La file de support n’a pas pu être chargée.</Text><Pressable onPress={() => void complaintsQuery.refetch()} className="mt-4 self-start rounded-2xl bg-primary px-4 py-3"><Text className="font-bold text-white">Réessayer</Text></Pressable></View>;

  const complaints = complaintsQuery.data ?? [];
  const act = (complaintId: number, status: "in_progress" | "resolved" | "dismissed") => {
    const note = notes[complaintId]?.trim() || (status === "in_progress" ? "Prise en charge par l’administration." : status === "resolved" ? "Réclamation résolue après vérification." : "Réclamation écartée après vérification.");
    resolveComplaint.mutate({ complaintId, status, resolutionNote: note });
  };

  return <View className="gap-3">
    <View className="rounded-3xl bg-sand p-4"><Text className="text-sm leading-5 text-foreground">Une réclamation ouverte place la demande en <Text className="font-bold">CLAIM_OPEN</Text>. La clôture restaure le statut précédent et notifie le client. Aucune adresse précise n’est affichée ici.</Text></View>
    {complaints.length === 0 ? <Text className="rounded-3xl border border-dashed border-border bg-surface p-6 text-center text-muted">Aucune réclamation.</Text> : complaints.map(({ complaint, requestReference, requestStatus, customerName, providerName }) => (
      <View key={complaint.id} className="rounded-3xl border border-border bg-surface p-4">
        <View className="flex-row items-center justify-between"><Text className="font-bold text-foreground">{requestReference}</Text><Text className={`text-xs font-bold ${statusTone[complaint.status]}`}>{statusLabels[complaint.status]}</Text></View>
        <Text className="mt-2 font-semibold text-foreground">{complaint.subject}</Text>
        <Text className="mt-1 text-sm leading-5 text-foreground">{complaint.description}</Text>
        <Text className="mt-2 text-xs text-muted">{customerName || "Compte client"} · Prestataire : {providerName || "Non affecté"} · Demande : {requestStatus}</Text>
        <Text className="mt-1 text-xs text-muted">Ouverte le {new Date(complaint.createdAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</Text>
        {complaint.resolutionNote ? <Text className="mt-2 text-xs font-semibold text-primary">Note de traitement : {complaint.resolutionNote}</Text> : null}
        {complaint.status === "open" || complaint.status === "in_progress" ? <View className="mt-3">
          <TextInput value={notes[complaint.id] ?? ""} onChangeText={(value) => setNotes((current) => ({ ...current, [complaint.id]: value }))} placeholder="Note de traitement (facultatif)" placeholderTextColor="#87938F" multiline maxLength={1200} textAlignVertical="top" className="min-h-16 rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground" />
          <View className="mt-3 flex-row gap-2">
            {complaint.status === "open" ? <Pressable disabled={resolveComplaint.isPending} onPress={() => act(complaint.id, "in_progress")} className="flex-1 items-center rounded-2xl border border-border py-3"><Text className="text-sm font-bold text-foreground">Prendre en charge</Text></Pressable> : null}
            <Pressable disabled={resolveComplaint.isPending} onPress={() => act(complaint.id, "resolved")} className="flex-1 items-center rounded-2xl bg-primary py-3"><Text className="text-sm font-bold text-white">Résoudre</Text></Pressable>
            <Pressable disabled={resolveComplaint.isPending} onPress={() => act(complaint.id, "dismissed")} className="flex-1 items-center rounded-2xl border border-coral/40 py-3"><Text className="text-sm font-bold text-error">Rejeter</Text></Pressable>
          </View>
        </View> : null}
        {resolveComplaint.error ? <Text className="mt-2 text-sm text-error">La mise à jour n’a pas pu être enregistrée.</Text> : null}
      </View>
    ))}
  </View>;
}
