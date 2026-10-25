import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View, type DimensionValue } from "react-native";

import { trpc } from "@/lib/trpc";

const periodOptions = [7, 30, 90] as const;
const statusLabels: Record<string, string> = {
  REQUESTED: "Demandées",
  ASSIGNED: "Affectées",
  ACCEPTED: "Acceptées",
  QUOTE_PENDING: "Devis attendus",
  QUOTE_ACCEPTED: "Devis acceptés",
  SCHEDULED: "Planifiées",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminées",
  REVIEWED: "Évaluées",
  REFUSED: "Refusées",
  CANCELLED: "Annulées",
  CLAIM_OPEN: "Réclamations",
  REFUND_PENDING: "Remboursements",
  REFUNDED: "Remboursées",
};
const providerLabels: Record<string, string> = { pending: "En attente", verified: "Vérifiés", suspended: "Suspendus" };

function MetricCard({ label, value, detail, icon, accent = "#0D6B5B" }: { label: string; value: string; detail: string; icon: keyof typeof Ionicons.glyphMap; accent?: string }) {
  return <View className="flex-1 rounded-3xl border border-border bg-surface p-4"><View className="h-9 w-9 items-center justify-center rounded-full bg-sand"><Ionicons name={icon} size={18} color={accent} /></View><Text className="mt-3 text-2xl font-bold text-foreground">{value}</Text><Text className="mt-1 text-xs font-bold text-foreground">{label}</Text><Text className="mt-1 text-xs leading-4 text-muted">{detail}</Text></View>;
}

function BarRow({ label, total, maximum, detail }: { label: string; total: number; maximum: number; detail?: string }) {
  const width: DimensionValue = total > 0 ? `${Math.max(8, Math.round((total / Math.max(maximum, 1)) * 100))}%` : "0%";
  return <View className="mt-3"><View className="flex-row items-center justify-between"><Text className="flex-1 text-sm font-semibold text-foreground">{label}</Text><Text className="ml-2 text-xs font-bold text-primary">{detail ?? total}</Text></View><View className="mt-2 h-2 overflow-hidden rounded-full bg-sand"><View style={{ width, height: "100%", borderRadius: 999, backgroundColor: "#0D6B5B" }} /></View></View>;
}

export function AdminAnalyticsPanel() {
  const [days, setDays] = useState<(typeof periodOptions)[number]>(30);
  const query = trpc.admin.analytics.useQuery({ days });

  if (query.isLoading) return <View className="items-center rounded-3xl border border-border bg-surface px-6 py-12"><ActivityIndicator color="#0D6B5B" /><Text className="mt-3 text-sm text-muted">Calcul des indicateurs…</Text></View>;
  if (query.error) return <View className="items-center rounded-3xl border border-border bg-surface px-6 py-10"><View className="h-14 w-14 items-center justify-center rounded-full bg-coral/15"><Ionicons name="warning-outline" size={25} color="#C75B3D" /></View><Text className="mt-4 text-center text-xl font-bold text-foreground">Rapport indisponible</Text><Text className="mt-2 text-center text-sm leading-5 text-muted">Les données statistiques n’ont pas pu être calculées. Aucun total n’est affiché en remplacement.</Text><Pressable onPress={() => void query.refetch()} style={({ pressed }) => ({ marginTop: 18, borderRadius: 14, backgroundColor: "#0D6B5B", paddingHorizontal: 20, paddingVertical: 12, opacity: pressed ? 0.82 : 1 })}><Text className="font-bold text-white">Réessayer</Text></Pressable></View>;

  const data = query.data;
  if (!data) return <View className="items-center rounded-3xl border border-border bg-surface px-6 py-10"><Text className="text-sm text-muted">Aucune donnée analytique disponible.</Text></View>;
  const overview = data.overview;
  const maxStatus = Math.max(...data.statusBreakdown.map((item) => item.total), 1);
  const maxService = Math.max(...data.demandByService.map((item) => item.total), 1);
  const maxZone = Math.max(...data.demandByZone.map((item) => item.total), 1);
  const maxDay = Math.max(...data.dailyActivity.map((item) => item.requests), 1);
  const recentDays = data.dailyActivity.slice(-14);

  return <View>
    <View className="flex-row items-center justify-between"><View><Text className="text-lg font-bold text-foreground">Vue opérationnelle</Text><Text className="mt-1 text-xs text-muted">Données enregistrées sur les {data.periodDays} derniers jours</Text></View>{query.isFetching ? <ActivityIndicator size="small" color="#0D6B5B" /> : null}</View>

    <View className="mt-4 flex-row gap-2">{periodOptions.map((option) => <Pressable key={option} onPress={() => setDays(option)} style={({ pressed }) => ({ flex: 1, borderRadius: 14, borderWidth: 1, borderColor: days === option ? "#0D6B5B" : "#D9DEDA", backgroundColor: days === option ? "#0D6B5B" : "#FFFFFF", paddingVertical: 10, alignItems: "center", opacity: pressed ? 0.8 : 1 })}><Text className={`text-xs font-bold ${days === option ? "text-white" : "text-foreground"}`}>{option} jours</Text></Pressable>)}</View>

    <View className="mt-4 flex-row gap-3"><MetricCard label="Demandes" value={String(overview.requests)} detail={`${overview.active} encore actives`} icon="briefcase-outline" /><MetricCard label="Terminées" value={`${overview.completionRate}%`} detail={`${overview.completed} demandes clôturées`} icon="checkmark-circle-outline" /></View>
    <View className="mt-3 flex-row gap-3"><MetricCard label="Nouveaux comptes" value={String(overview.newUsers)} detail={`sur ${data.periodDays} jours`} icon="people-outline" /><MetricCard label="Avis publiés" value={String(overview.publishedReviews)} detail={`${overview.averageRating.toFixed(1)}/5 de moyenne`} icon="star-outline" /></View>

    <View className="mt-4 rounded-3xl border border-border bg-surface p-4"><Text className="text-lg font-bold text-foreground">Demandes par statut</Text>{data.statusBreakdown.length === 0 ? <Text className="mt-3 text-sm text-muted">Aucune demande sur cette période.</Text> : data.statusBreakdown.map((item) => <BarRow key={item.status} label={statusLabels[item.status] ?? item.status} total={item.total} maximum={maxStatus} />)}</View>

    <View className="mt-4 rounded-3xl border border-border bg-surface p-4"><Text className="text-lg font-bold text-foreground">Activité quotidienne</Text>{recentDays.length === 0 ? <Text className="mt-3 text-sm text-muted">Aucune activité enregistrée sur cette période.</Text> : recentDays.map((item) => <BarRow key={item.day} label={item.day.slice(5)} total={item.requests} maximum={maxDay} detail={`${item.requests} · ${item.completed} finies`} />)}</View>

    <View className="mt-4 rounded-3xl border border-border bg-surface p-4"><Text className="text-lg font-bold text-foreground">Demande par prestation</Text>{data.demandByService.length === 0 ? <Text className="mt-3 text-sm text-muted">Aucune prestation demandée.</Text> : data.demandByService.map((item) => <BarRow key={item.service} label={item.service} total={item.total} maximum={maxService} />)}</View>

    <View className="mt-4 rounded-3xl border border-border bg-surface p-4"><Text className="text-lg font-bold text-foreground">Zones les plus actives</Text>{data.demandByZone.length === 0 ? <Text className="mt-3 text-sm text-muted">Aucune zone active.</Text> : data.demandByZone.map((item) => <BarRow key={`${item.commune}-${item.quartier}`} label={`${item.commune} · ${item.quartier}`} total={item.total} maximum={maxZone} />)}</View>

    <View className="mt-4 rounded-3xl border border-border bg-surface p-4"><Text className="text-lg font-bold text-foreground">Réseau prestataire</Text>{data.providers.length === 0 ? <Text className="mt-3 text-sm text-muted">Aucun profil prestataire enregistré.</Text> : data.providers.map((item) => <View key={item.status} className="mt-3 flex-row items-center justify-between"><Text className="text-sm text-foreground">{providerLabels[item.status] ?? item.status}</Text><Text className="font-bold text-primary">{item.total}</Text></View>)}<View className="mt-4 border-t border-border pt-3"><Text className="text-sm text-muted">Réponses aux missions : {data.missionResponses.accepted} acceptées · {data.missionResponses.refused} refusées</Text><Text className="mt-1 text-sm font-semibold text-primary">Taux d’acceptation : {data.missionResponses.acceptanceRate}%</Text></View></View>

    <View className="mt-4 rounded-3xl bg-sand p-4"><View className="flex-row items-center"><Ionicons name="information-circle-outline" size={19} color="#0D6B5B" /><Text className="ml-2 font-bold text-primary">Périmètre du rapport</Text></View><Text className="mt-2 text-sm leading-5 text-foreground">Signalements ouverts : {overview.openReports}. Les revenus, paiements et commissions ne sont pas affichés : ces données ne sont pas encore persistées dans le MVP.</Text><Text className="mt-2 text-xs text-muted">Calculé le {new Date(data.generatedAt).toLocaleString("fr-FR")}</Text></View>
  </View>;
}
