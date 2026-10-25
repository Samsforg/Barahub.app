import { ActivityIndicator, Text, View } from "react-native";

import { LocationMap } from "@/components/location-map";
import { trpc } from "@/lib/trpc";

export function CustomerTrackingCard({ requestId }: { requestId: number }) {
  const trackingQuery = trpc.requests.tracking.useQuery({ requestId }, { refetchInterval: 15_000, refetchIntervalInBackground: false });
  const tracking = trackingQuery.data;

  if (trackingQuery.isLoading) return <View className="mt-4 items-center rounded-3xl border border-border bg-surface p-5"><ActivityIndicator color="#0D6B5B" /><Text className="mt-2 text-sm text-muted">Chargement du suivi…</Text></View>;
  if (trackingQuery.error) return <View className="mt-4 rounded-3xl border border-border bg-surface p-4"><Text className="text-sm text-error">Le suivi est momentanément indisponible.</Text></View>;
  if (!tracking?.customerLocation) return <View className="mt-4 rounded-3xl bg-sand p-4"><Text className="font-bold text-foreground">Suivi non activé</Text><Text className="mt-1 text-sm leading-5 text-muted">Aucune position GPS n’a été transmise pour cette demande. Le suivi reste facultatif.</Text></View>;
  if (!tracking.trackingAvailable) return <View className="mt-4 rounded-3xl bg-sand p-4"><Text className="font-bold text-foreground">Suivi disponible pendant l’intervention</Text><Text className="mt-1 text-sm leading-5 text-muted">La position du prestataire apparaîtra lorsqu’un rendez-vous sera planifié ou que l’intervention commencera.</Text></View>;

  return <View className="mt-4"><LocationMap customer={tracking.customerLocation} provider={tracking.providerLocation} providerAccuracy={tracking.providerLocation?.accuracy} providerUpdatedAt={tracking.providerLocation?.updatedAt} />{!tracking.providerLocation ? <View className="mt-3 flex-row items-start rounded-2xl bg-sand/70 p-3"><Text className="mr-2 text-base text-primary">●</Text><Text className="flex-1 text-sm leading-5 text-muted">Le prestataire n’a pas encore partagé sa position. Cette carte se rafraîchit automatiquement.</Text></View> : null}</View>;
}
