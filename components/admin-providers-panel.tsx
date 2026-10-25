import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { trpc } from "@/lib/trpc";

const statusLabels = { pending: "En attente", verified: "Vérifié", suspended: "Suspendu" } as const;

export function AdminProvidersPanel() {
  const providersQuery = trpc.admin.providers.useQuery();
  const utils = trpc.useUtils();
  const reviewProvider = trpc.admin.reviewProvider.useMutation({
    onSuccess: () => {
      void utils.admin.providers.invalidate();
      void utils.admin.analytics.invalidate();
    },
  });

  if (providersQuery.isLoading) return <View className="items-center rounded-3xl border border-border bg-surface p-8"><ActivityIndicator color="#0D6B5B" /><Text className="mt-3 text-sm text-muted">Chargement des prestataires…</Text></View>;
  if (providersQuery.error) return <View className="rounded-3xl border border-coral/30 bg-coral/10 p-5"><Text className="font-bold text-foreground">Prestataires indisponibles</Text><Text className="mt-1 text-sm leading-5 text-muted">La file de vérification n’a pas pu être chargée.</Text><Pressable onPress={() => void providersQuery.refetch()} className="mt-4 self-start rounded-2xl bg-primary px-4 py-3"><Text className="font-bold text-white">Réessayer</Text></Pressable></View>;

  const providers = providersQuery.data ?? [];
  return (
    <View className="gap-3">
      <View className="rounded-3xl bg-sand p-4">
        <Text className="text-sm leading-5 text-foreground">Un profil reste <Text className="font-bold">en attente</Text> jusqu’à validation. La suspension bloque les nouvelles missions sans supprimer l’historique. Chaque décision est journalisée.</Text>
      </View>
      {providers.length === 0 ? <Text className="rounded-3xl border border-dashed border-border bg-surface p-6 text-center text-muted">Aucun profil prestataire enregistré.</Text> : providers.map((provider) => (
        <View key={provider.id} className="rounded-3xl border border-border bg-surface p-4">
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="font-bold text-foreground">{provider.displayName}</Text>
              <Text className="mt-1 text-xs text-muted">{provider.userName || "Compte prestataire"} · {provider.userEmail || "Sans e-mail"}</Text>
            </View>
            <View className={`rounded-full px-3 py-1 ${provider.verificationStatus === "verified" ? "bg-primary/10" : provider.verificationStatus === "suspended" ? "bg-coral/15" : "bg-amber-100"}`}>
              <Text className={`text-xs font-bold ${provider.verificationStatus === "verified" ? "text-primary" : provider.verificationStatus === "suspended" ? "text-error" : "text-amber-800"}`}>{statusLabels[provider.verificationStatus]}</Text>
            </View>
          </View>
          {provider.bio ? <Text className="mt-2 text-sm leading-5 text-foreground">{provider.bio}</Text> : null}
          <Text className="mt-2 text-xs text-muted">Prestations : {provider.services.length > 0 ? provider.services.map((service) => service.name).join(", ") : "Aucune"}</Text>
          <Text className="mt-1 text-xs text-muted">Zones : {provider.zones.length > 0 ? provider.zones.map((zone) => `${zone.commune} · ${zone.quartier}`).join(", ") : "Aucune"}</Text>
          {provider.verificationNote ? <Text className="mt-2 text-xs font-semibold text-primary">Note admin : {provider.verificationNote}</Text> : null}
          <View className="mt-4 flex-row gap-2">
            {provider.verificationStatus !== "verified" ? <Pressable disabled={reviewProvider.isPending} onPress={() => reviewProvider.mutate({ providerId: provider.id, status: "verified", note: "Profil vérifié depuis l’administration du pilote." })} className="flex-1 items-center rounded-2xl bg-primary py-3"><Text className="text-sm font-bold text-white">Vérifier</Text></Pressable> : null}
            {provider.verificationStatus !== "suspended" ? <Pressable disabled={reviewProvider.isPending} onPress={() => reviewProvider.mutate({ providerId: provider.id, status: "suspended", note: "Profil suspendu depuis l’administration du pilote." })} className="flex-1 items-center rounded-2xl border border-coral/40 py-3"><Text className="text-sm font-bold text-error">Suspendre</Text></Pressable> : null}
            {provider.verificationStatus !== "pending" ? <Pressable disabled={reviewProvider.isPending} onPress={() => reviewProvider.mutate({ providerId: provider.id, status: "pending", note: "Vérification à reprendre." })} className="flex-1 items-center rounded-2xl border border-border py-3"><Text className="text-sm font-bold text-foreground">Remettre en attente</Text></Pressable> : null}
          </View>
          {reviewProvider.error ? <Text className="mt-2 text-sm text-error">La décision n’a pas pu être enregistrée.</Text> : null}
        </View>
      ))}
    </View>
  );
}
