import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { AdminAnalyticsPanel } from "@/components/admin-analytics-panel";
import { AdminCatalogPanel } from "@/components/admin-catalog-panel";
import { AdminComplaintsPanel } from "@/components/admin-complaints-panel";
import { AdminPaymentsPanel } from "@/components/admin-payments-panel";
import { AdminProvidersPanel } from "@/components/admin-providers-panel";
import { AdminRefundsPanel } from "@/components/admin-refunds-panel";
import { AdminRequestsPanel } from "@/components/admin-requests-panel";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

const reviewStatusLabels = { published: "Publié", flagged: "Signalé", hidden: "Masqué" } as const;
const reportStatusLabels = { open: "À traiter", resolved: "Traité", dismissed: "Rejeté" } as const;

type ReviewStatus = keyof typeof reviewStatusLabels;
type Tab = "reviews" | "reports" | "providers" | "requests" | "catalog" | "complaints" | "refunds" | "payments" | "analytics";

const tabs: { key: Tab; label: string }[] = [
  { key: "reviews", label: "Avis" },
  { key: "reports", label: "Signalements" },
  { key: "providers", label: "Prestataires" },
  { key: "requests", label: "Demandes" },
  { key: "catalog", label: "Catalogue" },
  { key: "complaints", label: "Réclamations" },
  { key: "refunds", label: "Remboursements" },
  { key: "payments", label: "Paiements" },
  { key: "analytics", label: "Analyse" },
];

export default function AdminReviewsScreen() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const isAdmin = isAuthenticated && user?.role === "admin";
  const [tab, setTab] = useState<Tab>("reviews");
  const reviewsQuery = trpc.admin.reviews.useQuery(undefined, { enabled: isAdmin });
  const reportsQuery = trpc.admin.reports.useQuery(undefined, { enabled: isAdmin });
  const requestsQuery = trpc.admin.requests.useQuery(undefined, { enabled: isAdmin });
  const utils = trpc.useUtils();
  const moderateReview = trpc.admin.moderateReview.useMutation({ onSuccess: () => { void utils.admin.reviews.invalidate(); void utils.admin.reports.invalidate(); } });
  const resolveReport = trpc.admin.resolveReport.useMutation({ onSuccess: () => utils.admin.reports.invalidate() });

  if (authLoading) {
    return <ScreenContainer><View className="flex-1 items-center justify-center"><ActivityIndicator color="#0D6B5B" /><Text className="mt-3 text-sm text-muted">Vérification des accès…</Text></View></ScreenContainer>;
  }

  if (!isAuthenticated || !isAdmin) {
    return <ScreenContainer><View className="flex-1 items-center justify-center px-6"><View className="h-16 w-16 items-center justify-center rounded-full bg-sand"><Ionicons name="lock-closed-outline" size={28} color="#0D6B5B" /></View><Text className="mt-5 text-center text-2xl font-bold text-foreground">Accès réservé</Text><Text className="mt-3 text-center text-base leading-6 text-muted">Cet espace est réservé aux administrateurs Barahub. Le rôle est vérifié côté serveur.</Text><Pressable onPress={() => router.back()} style={({ pressed }) => ({ marginTop: 24, borderRadius: 16, backgroundColor: "#0D6B5B", paddingHorizontal: 24, paddingVertical: 14, opacity: pressed ? 0.82 : 1 })}><Text className="font-bold text-white">Retour</Text></Pressable></View></ScreenContainer>;
  }

  if (reviewsQuery.isLoading || reportsQuery.isLoading || requestsQuery.isLoading) {
    return <ScreenContainer><View className="flex-1 items-center justify-center px-6"><ActivityIndicator color="#0D6B5B" /><Text className="mt-3 text-sm text-muted">Chargement de l’administration…</Text></View></ScreenContainer>;
  }

  if (reviewsQuery.error || reportsQuery.error || requestsQuery.error) {
    return <ScreenContainer><View className="flex-1 items-center justify-center px-6"><View className="h-16 w-16 items-center justify-center rounded-full bg-coral/15"><Ionicons name="warning-outline" size={28} color="#C75B3D" /></View><Text className="mt-5 text-center text-2xl font-bold text-foreground">Données indisponibles</Text><Text className="mt-3 text-center text-base leading-6 text-muted">La file opérationnelle n’a pas pu être chargée. Vérifiez votre connexion puis réessayez.</Text><Pressable onPress={() => { void reviewsQuery.refetch(); void reportsQuery.refetch(); void requestsQuery.refetch(); }} style={({ pressed }) => ({ marginTop: 24, borderRadius: 16, backgroundColor: "#0D6B5B", paddingHorizontal: 24, paddingVertical: 14, opacity: pressed ? 0.82 : 1 })}><Text className="font-bold text-white">Réessayer</Text></Pressable></View></ScreenContainer>;
  }

  const reviews = reviewsQuery.data ?? [];
  const reports = reportsQuery.data ?? [];
  const pendingReports = reports.filter((report) => report.status === "open").length;
  const moderate = (reviewId: number, status: ReviewStatus) => moderateReview.mutate({ reviewId, status, note: `Action effectuée depuis l’espace admin (${reviewStatusLabels[status]}).` });

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", opacity: pressed ? 0.7 : 1 })}><Ionicons name="arrow-back" size={20} color="#0D6B5B" /><Text className="ml-2 font-bold text-primary">Retour au compte</Text></Pressable>
        <Text className="mt-5 text-xs font-semibold uppercase tracking-widest text-primary">Administration</Text>
        <Text className="mt-1 text-3xl font-bold text-foreground">Pilotage Barahub</Text>
        <Text className="mt-2 text-base leading-6 text-muted">Vérifiez les prestataires, affectez les demandes, tenez le catalogue et traitez réclamations et remboursements sans exposer de donnée sensible.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 12 }} className="-mx-1 mt-4">
          {tabs.map((item) => <Pressable key={item.key} onPress={() => setTab(item.key)} style={{ borderRadius: 14, backgroundColor: tab === item.key ? "#0D6B5B" : "#F1EDE6", paddingHorizontal: 14, paddingVertical: 10 }}><Text className={`text-sm font-bold ${tab === item.key ? "text-white" : "text-foreground"}`}>{item.label}{item.key === "reviews" ? ` (${reviews.length})` : item.key === "reports" ? ` (${pendingReports})` : ""}</Text></Pressable>)}
        </ScrollView>

        {tab === "analytics" ? <View className="mt-2"><AdminAnalyticsPanel /></View> : null}
        {tab === "payments" ? <View className="mt-2"><AdminPaymentsPanel /></View> : null}
        {tab === "requests" ? <View className="mt-2"><AdminRequestsPanel /></View> : null}
        {tab === "providers" ? <View className="mt-2"><AdminProvidersPanel /></View> : null}
        {tab === "catalog" ? <View className="mt-2"><AdminCatalogPanel /></View> : null}
        {tab === "complaints" ? <View className="mt-2"><AdminComplaintsPanel /></View> : null}
        {tab === "refunds" ? <View className="mt-2"><AdminRefundsPanel /></View> : null}
        {tab === "reviews" ? <View className="mt-2 gap-3">{reviews.length === 0 ? <Text className="rounded-3xl border border-dashed border-border bg-surface p-6 text-center text-muted">Aucun avis à modérer.</Text> : reviews.map((review) => <View key={review.id} className="rounded-3xl border border-border bg-surface p-4"><View className="flex-row items-center justify-between"><Text className="font-bold text-foreground">{review.requestReference}</Text><Text className="text-xs font-bold text-primary">{reviewStatusLabels[review.status]}</Text></View><Text className="mt-2 text-lg tracking-widest text-primary">{"★".repeat(review.rating)}<Text className="text-border">{"★".repeat(5 - review.rating)}</Text></Text><Text className="mt-1 text-sm leading-5 text-foreground">{review.comment || "Sans commentaire"}</Text><Text className="mt-2 text-xs text-muted">Client : {review.customerName || "Compte client"} · Prestataire : {review.providerName}</Text><View className="mt-4 flex-row gap-2">{review.status !== "hidden" ? <Pressable onPress={() => moderate(review.id, "hidden")} style={({ pressed }) => ({ flex: 1, borderRadius: 14, borderWidth: 1, borderColor: "#D9DEDA", paddingVertical: 11, alignItems: "center", opacity: pressed ? 0.7 : 1 })}><Text className="text-sm font-bold text-foreground">Masquer</Text></Pressable> : <Pressable onPress={() => moderate(review.id, "published")} style={({ pressed }) => ({ flex: 1, borderRadius: 14, backgroundColor: "#0D6B5B", paddingVertical: 11, alignItems: "center", opacity: pressed ? 0.82 : 1 })}><Text className="text-sm font-bold text-white">Rétablir</Text></Pressable>}<Pressable onPress={() => moderate(review.id, review.status === "flagged" ? "published" : "flagged")} style={({ pressed }) => ({ flex: 1, borderRadius: 14, borderWidth: 1, borderColor: "#D9DEDA", paddingVertical: 11, alignItems: "center", opacity: pressed ? 0.7 : 1 })}><Text className="text-sm font-bold text-foreground">{review.status === "flagged" ? "Lever le signalement" : "Signaler"}</Text></Pressable></View>{moderateReview.error ? <Text className="mt-2 text-sm text-error">La modération n’a pas pu être enregistrée.</Text> : null}</View>)}</View> : null}
        {tab === "reports" ? <View className="mt-2 gap-3">{reports.length === 0 ? <Text className="rounded-3xl border border-dashed border-border bg-surface p-6 text-center text-muted">Aucun signalement.</Text> : reports.map((report) => <View key={report.id} className="rounded-3xl border border-border bg-surface p-4"><View className="flex-row items-center justify-between"><Text className="font-bold text-foreground">{report.requestReference}</Text><Text className="text-xs font-bold text-primary">{reportStatusLabels[report.status]}</Text></View><Text className="mt-2 text-sm font-semibold text-foreground">{report.reason}</Text>{report.details ? <Text className="mt-1 text-sm leading-5 text-foreground">{report.details}</Text> : null}<Text className="mt-2 text-xs text-muted">Signalé par {report.reporterName || "Compte utilisateur"} · Avis : {report.reviewRating}/5 · {report.reviewComment || "Sans commentaire"}</Text>{report.status === "open" ? <View className="mt-4 flex-row gap-2"><Pressable disabled={resolveReport.isPending} onPress={() => resolveReport.mutate({ reportId: report.id, status: "resolved", resolutionNote: "Signalement traité depuis l’administration du pilote." })} className="flex-1 items-center rounded-2xl bg-primary py-3"><Text className="text-sm font-bold text-white">Traiter</Text></Pressable><Pressable disabled={resolveReport.isPending} onPress={() => resolveReport.mutate({ reportId: report.id, status: "dismissed", resolutionNote: "Signalement écarté depuis l’administration du pilote." })} className="flex-1 items-center rounded-2xl border border-border py-3"><Text className="text-sm font-bold text-foreground">Rejeter</Text></Pressable></View> : null}{resolveReport.error ? <Text className="mt-2 text-sm text-error">Le signalement n’a pas pu être mis à jour.</Text> : null}</View>)}</View> : null}
      </ScrollView>
    </ScreenContainer>
  );
}
