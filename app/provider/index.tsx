import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { NotificationCenter } from "@/components/notification-center";
import { ProviderLocationControl } from "@/components/provider-location-control";
import { ConversationCard } from "@/components/conversation-card";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

const statusCopy = {
  pending: { label: "Vérification en attente", tone: "bg-sand", detail: "Votre profil est enregistré. L’équipe pilote vérifiera vos informations avant toute mission." },
  verified: { label: "Profil vérifié", tone: "bg-primary/10", detail: "Vous pouvez recevoir des missions compatibles avec vos services et vos zones." },
  suspended: { label: "Profil suspendu", tone: "bg-coral/15", detail: "Vous ne recevez plus de nouvelles missions. Contactez le support si vous pensez qu’il s’agit d’une erreur." },
} as const;

function Field({ label, value, onChangeText, placeholder, multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean }) {
  return (
    <View className="mt-4">
      <Text className="mb-2 text-sm font-bold text-foreground">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#87938F"
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        className={multiline ? "min-h-24 rounded-2xl border border-border bg-surface px-4 py-3 text-base text-foreground" : "rounded-2xl border border-border bg-surface px-4 py-3 text-base text-foreground"}
      />
    </View>
  );
}

export default function ProviderWorkspaceScreen() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const workspaceQuery = trpc.provider.me.useQuery(undefined, { enabled: isAuthenticated });
  const reviewSummaryQuery = trpc.provider.reviews.useQuery(undefined, { enabled: isAuthenticated });
  const catalogQuery = trpc.catalog.list.useQuery(undefined, { staleTime: 300_000 });
  const zonesQuery = trpc.catalog.zones.useQuery(undefined, { staleTime: 300_000 });
  const utils = trpc.useUtils();
  const saveProfile = trpc.provider.saveProfile.useMutation({ onSuccess: () => utils.provider.me.invalidate() });
  const respond = trpc.provider.respond.useMutation({ onSuccess: () => utils.provider.me.invalidate() });
  const sendQuote = trpc.provider.sendQuote.useMutation({ onSuccess: () => { void utils.provider.me.invalidate(); } });
  const updateStatus = trpc.provider.updateMissionStatus.useMutation({ onSuccess: () => utils.provider.me.invalidate() });
  const cancelMission = trpc.provider.cancelMission.useMutation({ onSuccess: () => utils.provider.me.invalidate() });
  const reportReview = trpc.reviews.report.useMutation();

  const profile = workspaceQuery.data?.profile;
  type ProviderDraft = { displayName: string; bio: string; skills: string; availabilityNotes: string; serviceIds: number[]; zoneIds: number[] };
  const [draftOverride, setDraftOverride] = useState<ProviderDraft | null>(null);
  const [quoteDrafts, setQuoteDrafts] = useState<Record<number, { amountXof: string; travelFeeXof: string; note: string }>>({});
  const draft: ProviderDraft = draftOverride ?? {
    displayName: profile?.displayName ?? "",
    bio: profile?.bio ?? "",
    skills: profile?.skills ?? "",
    availabilityNotes: profile?.availabilityNotes ?? "",
    serviceIds: (workspaceQuery.data?.services ?? []).map((service) => service.id),
    zoneIds: (workspaceQuery.data?.zones ?? []).map((zone) => zone.id),
  };

  const selectedStatus = profile ? statusCopy[profile.verificationStatus] : null;
  const canSave = draft.displayName.trim().length >= 2 && draft.serviceIds.length > 0 && draft.zoneIds.length > 0 && !saveProfile.isPending;
  const formServices = useMemo(() => catalogQuery.data ?? [], [catalogQuery.data]);
  const formZones = useMemo(() => zonesQuery.data ?? [], [zonesQuery.data]);
  const updateDraft = (patch: Partial<ProviderDraft>) => setDraftOverride({ ...draft, ...patch });

  const toggle = (field: "serviceIds" | "zoneIds", value: number) => {
    const current = draft[field];
    updateDraft({ [field]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value] });
  };

  const submitProfile = () => {
    if (!canSave) return;
    saveProfile.mutate({ displayName: draft.displayName.trim(), bio: draft.bio.trim() || undefined, skills: draft.skills.trim() || undefined, availabilityNotes: draft.availabilityNotes.trim() || undefined, serviceIds: draft.serviceIds, zoneIds: draft.zoneIds });
  };

  const respondToMission = (requestId: number, decision: "accepted" | "refused") => {
    respond.mutate({ requestId, decision, idempotencyKey: `mission-${requestId}-${decision}` });
  };

  const quoteDraftFor = (requestId: number) => quoteDrafts[requestId] ?? { amountXof: "", travelFeeXof: "0", note: "" };
  const updateQuoteDraft = (requestId: number, patch: Partial<{ amountXof: string; travelFeeXof: string; note: string }>) => setQuoteDrafts((current) => ({ ...current, [requestId]: { ...quoteDraftFor(requestId), ...patch } }));
  const submitQuote = (requestId: number) => {
    const draft = quoteDraftFor(requestId);
    const amountXof = Number(draft.amountXof);
    const travelFeeXof = Number(draft.travelFeeXof || 0);
    if (!Number.isInteger(amountXof) || amountXof <= 0 || !Number.isInteger(travelFeeXof) || travelFeeXof < 0 || sendQuote.isPending) return;
    sendQuote.mutate({ requestId, amountXof, travelFeeXof, note: draft.note.trim() || undefined, idempotencyKey: `quote-${requestId}-${amountXof}-${travelFeeXof}` });
  };
  const requestMissionCancellation = (requestId: number) => {
    const perform = () => cancelMission.mutate({ requestId, reason: "Annulation demandée par le prestataire" });
    if (Platform.OS === "web") {
      if (globalThis.confirm("Annuler cette mission ? Le client sera informé.")) perform();
      return;
    }
    Alert.alert("Annuler la mission ?", "Le client sera informé de cette annulation.", [{ text: "Garder", style: "cancel" }, { text: "Annuler", style: "destructive", onPress: perform }]);
  };

  const nextStatus: Record<string, { status: "ACCEPTED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED"; label: string }> = {
    ASSIGNED: { status: "ACCEPTED", label: "Confirmer la mission" },
    ACCEPTED: { status: "SCHEDULED", label: "Planifier le rendez-vous" },
    QUOTE_ACCEPTED: { status: "SCHEDULED", label: "Planifier le rendez-vous" },
    SCHEDULED: { status: "IN_PROGRESS", label: "Démarrer l’intervention" },
    IN_PROGRESS: { status: "COMPLETED", label: "Marquer terminée" },
  };

  if (authLoading || (isAuthenticated && workspaceQuery.isLoading)) {
    return <ScreenContainer><View className="flex-1 items-center justify-center"><ActivityIndicator color="#0D6B5B" /><Text className="mt-3 text-sm text-muted">Chargement de votre espace…</Text></View></ScreenContainer>;
  }

  if (!isAuthenticated) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center px-6">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-sand"><Ionicons name="briefcase-outline" size={30} color="#0D6B5B" /></View>
          <Text className="mt-5 text-center text-2xl font-bold text-foreground">Espace prestataire</Text>
          <Text className="mt-3 text-center text-base leading-6 text-muted">Connectez-vous pour créer votre profil, choisir vos zones et gérer vos missions.</Text>
          <Pressable style={({ pressed }) => ({ marginTop: 24, borderRadius: 16, backgroundColor: "#0D6B5B", paddingHorizontal: 24, paddingVertical: 14, opacity: pressed ? 0.82 : 1 })} onPress={() => router.push("/login" as never)}><Text className="font-bold text-white">Se connecter</Text></Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const missions = workspaceQuery.data?.assignedMissions ?? [];
  const availableMissions = profile?.verificationStatus === "verified" ? workspaceQuery.data?.availableMissions ?? [] : [];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <Pressable style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", opacity: pressed ? 0.7 : 1 })} onPress={() => router.back()}><Ionicons name="arrow-back" size={20} color="#0D6B5B" /><Text className="ml-2 font-bold text-primary">Retour au compte</Text></Pressable>
        <Text className="mt-5 text-xs font-semibold uppercase tracking-widest text-primary">Espace prestataire</Text>
        <Text className="mt-1 text-3xl font-bold text-foreground">Vos missions, clairement.</Text>
        <Text className="mt-2 text-base leading-6 text-muted">Configurez vos compétences et vos zones. Une mission n’est visible qu’après vérification et compatibilité.</Text>
        <NotificationCenter />

        {selectedStatus ? <View className={`mt-6 rounded-3xl p-4 ${selectedStatus.tone}`}><Text className="font-bold text-foreground">{selectedStatus.label}</Text><Text className="mt-1 text-sm leading-5 text-foreground">{selectedStatus.detail}</Text></View> : null}

        <View className="mt-6 rounded-3xl border border-border bg-surface p-4">
          <Text className="text-lg font-bold text-foreground">Votre profil</Text>
          <Field label="Nom affiché" value={draft.displayName} onChangeText={(value) => updateDraft({ displayName: value })} placeholder="Ex. Atelier Kouassi" />
          <Field label="Présentation" value={draft.bio} onChangeText={(value) => updateDraft({ bio: value })} placeholder="Présentez votre expérience en quelques mots" multiline />
          <Field label="Compétences" value={draft.skills} onChangeText={(value) => updateDraft({ skills: value })} placeholder="Ex. fuite, tableau électrique, entretien" />
          <Field label="Disponibilités" value={draft.availabilityNotes} onChangeText={(value) => updateDraft({ availabilityNotes: value })} placeholder="Ex. lundi à samedi, 8h–18h" />

          <Text className="mt-5 text-sm font-bold text-foreground">Services proposés</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">{formServices.map((service) => <Pressable key={service.id} onPress={() => toggle("serviceIds", service.id)} style={({ pressed }) => ({ borderRadius: 999, borderWidth: 1, borderColor: draft.serviceIds.includes(service.id) ? "#0D6B5B" : "#D9DEDA", backgroundColor: draft.serviceIds.includes(service.id) ? "#0D6B5B" : "#FBFCFA", paddingHorizontal: 12, paddingVertical: 8, opacity: pressed ? 0.75 : 1 })}><Text className={`text-sm font-semibold ${draft.serviceIds.includes(service.id) ? "text-white" : "text-foreground"}`}>{service.name}</Text></Pressable>)}</View>

          <Text className="mt-5 text-sm font-bold text-foreground">Zones couvertes</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">{formZones.map((zone) => <Pressable key={zone.id} onPress={() => toggle("zoneIds", zone.id)} style={({ pressed }) => ({ borderRadius: 999, borderWidth: 1, borderColor: draft.zoneIds.includes(zone.id) ? "#0D6B5B" : "#D9DEDA", backgroundColor: draft.zoneIds.includes(zone.id) ? "#0D6B5B" : "#FBFCFA", paddingHorizontal: 12, paddingVertical: 8, opacity: pressed ? 0.75 : 1 })}><Text className={`text-sm font-semibold ${draft.zoneIds.includes(zone.id) ? "text-white" : "text-foreground"}`}>{zone.commune} · {zone.quartier}</Text></Pressable>)}</View>

          {saveProfile.error ? <Text className="mt-3 text-sm text-error">Impossible d’enregistrer le profil. Vérifiez vos choix puis réessayez.</Text> : null}
          <Pressable disabled={!canSave} onPress={submitProfile} style={({ pressed }) => ({ marginTop: 20, borderRadius: 16, backgroundColor: canSave ? "#0D6B5B" : "#D9DEDA", paddingVertical: 14, alignItems: "center", opacity: pressed && canSave ? 0.82 : 1 })}><Text className="font-bold text-white">{saveProfile.isPending ? "Enregistrement…" : profile ? "Mettre à jour le profil" : "Envoyer mon profil"}</Text></Pressable>
        </View>

        {profile?.verificationStatus === "verified" ? <View className="mt-5 rounded-3xl bg-sand p-4"><Text className="text-sm font-bold uppercase tracking-wide text-primary">Avis clients</Text><View className="mt-2 flex-row items-end"><Text className="text-3xl font-bold text-foreground">{reviewSummaryQuery.data?.averageRating ?? "—"}</Text><Text className="ml-2 pb-1 text-sm text-muted">/ 5 · {reviewSummaryQuery.data?.reviewCount ?? 0} avis</Text></View>{reviewSummaryQuery.data?.reviews?.[0]?.comment ? <><Text className="mt-2 text-sm leading-5 text-foreground">« {reviewSummaryQuery.data.reviews[0].comment} »</Text><Pressable disabled={reportReview.isPending} onPress={() => reportReview.mutate({ reviewId: reviewSummaryQuery.data!.reviews[0]!.id, reason: "Contenu inapproprié", details: "Signalement envoyé depuis l’espace prestataire." })} style={({ pressed }) => ({ marginTop: 12, alignSelf: "flex-start", opacity: pressed ? 0.7 : 1 })}><Text className="text-xs font-bold text-primary">{reportReview.isSuccess ? "Signalement envoyé" : "Signaler cet avis"}</Text></Pressable></> : <Text className="mt-2 text-sm text-muted">Les avis publiés après vos interventions apparaîtront ici.</Text>}</View> : null}

        {profile?.verificationStatus === "verified" ? <>
          <Text className="mt-8 text-xl font-bold text-foreground">Missions disponibles</Text>
          {availableMissions.length === 0 ? <Text className="mt-2 text-sm leading-5 text-muted">Aucune demande compatible dans vos zones pour le moment.</Text> : availableMissions.map((mission) => <View key={mission.id} className="mt-3 rounded-3xl border border-border bg-surface p-4"><View className="flex-row items-center justify-between"><Text className="font-bold text-foreground">{mission.reference}</Text><Text className="text-xs font-bold text-primary">À répondre</Text></View><Text className="mt-2 font-semibold text-foreground">{mission.service?.name ?? "Service à préciser"}</Text><Text className="mt-1 text-sm leading-5 text-muted">{mission.description}</Text><Text className="mt-2 text-xs text-muted">{mission.commune} · {mission.quartier}</Text><View className="mt-4 flex-row gap-2"><Pressable onPress={() => respondToMission(mission.id, "refused")} style={({ pressed }) => ({ flex: 1, borderRadius: 14, borderWidth: 1, borderColor: "#D9DEDA", paddingVertical: 12, alignItems: "center", opacity: pressed ? 0.7 : 1 })}><Text className="font-bold text-foreground">Refuser</Text></Pressable><Pressable onPress={() => respondToMission(mission.id, "accepted")} style={({ pressed }) => ({ flex: 1, borderRadius: 14, backgroundColor: "#0D6B5B", paddingVertical: 12, alignItems: "center", opacity: pressed ? 0.82 : 1 })}><Text className="font-bold text-white">Accepter</Text></Pressable></View></View>)}

          <Text className="mt-8 text-xl font-bold text-foreground">Mes missions</Text>
          {missions.length === 0 ? <Text className="mt-2 text-sm leading-5 text-muted">Les missions acceptées apparaîtront ici avec leur statut.</Text> : missions.map((mission) => { const action = nextStatus[mission.status]; const quoteDraft = quoteDraftFor(mission.id); const canSendQuote = mission.status === "ACCEPTED"; const canCancel = ["ASSIGNED", "ACCEPTED", "QUOTE_PENDING", "QUOTE_ACCEPTED", "SCHEDULED"].includes(mission.status); return <View key={mission.id} className="mt-3 rounded-3xl border border-border bg-surface p-4"><View className="flex-row items-center justify-between"><Text className="font-bold text-foreground">{mission.reference}</Text><Text className="text-xs font-bold text-primary">{mission.status}</Text></View><Text className="mt-2 font-semibold text-foreground">{mission.service?.name ?? "Service"}</Text><Text className="mt-1 text-sm leading-5 text-muted">{mission.description}</Text><Text className="mt-2 text-xs text-muted">{mission.commune} · {mission.quartier}{mission.landmark ? ` · ${mission.landmark}` : ""}</Text>{mission.address ? <Text className="mt-1 text-xs text-muted">Adresse autorisée : {mission.address}</Text> : null}{mission.desiredSlot ? <Text className="mt-1 text-xs font-semibold text-primary">Créneau souhaité : {new Date(mission.desiredSlot).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</Text> : <Text className="mt-1 text-xs text-error">Définissez un créneau avant de planifier.</Text>}{canSendQuote ? <View className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-3"><Text className="font-bold text-foreground">Envoyer un devis</Text><TextInput value={quoteDraft.amountXof} onChangeText={(value) => updateQuoteDraft(mission.id, { amountXof: value.replace(/[^0-9]/g, "") })} keyboardType="number-pad" placeholder="Montant de la prestation (FCFA)" placeholderTextColor="#87938F" className="mt-3 rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground" /><TextInput value={quoteDraft.travelFeeXof} onChangeText={(value) => updateQuoteDraft(mission.id, { travelFeeXof: value.replace(/[^0-9]/g, "") })} keyboardType="number-pad" placeholder="Déplacement (FCFA, facultatif)" placeholderTextColor="#87938F" className="mt-2 rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground" /><TextInput value={quoteDraft.note} onChangeText={(value) => updateQuoteDraft(mission.id, { note: value })} placeholder="Détail ou condition (facultatif)" placeholderTextColor="#87938F" multiline maxLength={1200} className="mt-2 min-h-16 rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground" /><Pressable disabled={!quoteDraft.amountXof || sendQuote.isPending} onPress={() => submitQuote(mission.id)} style={({ pressed }) => ({ marginTop: 10, borderRadius: 14, backgroundColor: quoteDraft.amountXof ? "#0D6B5B" : "#D9DEDA", paddingVertical: 12, alignItems: "center", opacity: pressed ? 0.82 : 1 })}><Text className="font-bold text-white">{sendQuote.isPending ? "Envoi…" : "Envoyer le devis"}</Text></Pressable>{sendQuote.error ? <Text className="mt-2 text-sm text-error">Le devis n’a pas pu être envoyé. Vérifiez le montant et réessayez.</Text> : null}</View> : null}{action ? <Pressable disabled={updateStatus.isPending} onPress={() => updateStatus.mutate({ requestId: mission.id, status: action.status })} style={({ pressed }) => ({ marginTop: 14, borderRadius: 14, backgroundColor: "#0D6B5B", paddingVertical: 12, alignItems: "center", opacity: pressed ? 0.82 : 1 })}><Text className="font-bold text-white">{action.label}</Text></Pressable> : null}{canCancel ? <Pressable disabled={cancelMission.isPending} onPress={() => requestMissionCancellation(mission.id)} style={({ pressed }) => ({ marginTop: 10, alignItems: "center", borderRadius: 14, borderWidth: 1, borderColor: "#E8B6A5", paddingVertical: 11, opacity: pressed ? 0.7 : 1 })}><Text className="text-sm font-bold text-error">{cancelMission.isPending ? "Annulation…" : "Annuler la mission"}</Text></Pressable> : null}{updateStatus.error || cancelMission.error ? <Text className="mt-2 text-sm text-error">Action impossible : vérifiez le statut et le créneau de la mission.</Text> : null}<ConversationCard requestId={mission.id} viewer="prestataire" /><ProviderLocationControl requestId={mission.id} status={mission.status} /></View>; })}
        </> : null}
      </ScrollView>
    </ScreenContainer>
  );
}
