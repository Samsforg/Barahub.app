import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { CustomerTrackingCard } from "@/components/customer-tracking-card";
import { ConversationCard } from "@/components/conversation-card";
import { NotificationCenter } from "@/components/notification-center";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

const statusLabels: Record<string, string> = {
  REQUESTED: "Demande envoyée",
  ASSIGNED: "Prestataire trouvé",
  ACCEPTED: "Mission confirmée",
  QUOTE_PENDING: "Devis à consulter",
  QUOTE_ACCEPTED: "Devis accepté",
  SCHEDULED: "Rendez-vous planifié",
  IN_PROGRESS: "Intervention en cours",
  COMPLETED: "Intervention terminée",
  REVIEWED: "Avis publié",
  CANCELLED: "Demande annulée",
  CLAIM_OPEN: "Réclamation en cours",
  REFUND_PENDING: "Remboursement en cours",
  REFUNDED: "Remboursement effectué",
  FAILED: "Échec",
};

const complaintStatusLabels: Record<string, string> = { open: "Reçue", in_progress: "En cours de traitement", resolved: "Résolue", dismissed: "Rejetée" };
const complaintEligibleStatuses = ["ASSIGNED", "ACCEPTED", "QUOTE_PENDING", "QUOTE_ACCEPTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "REVIEWED"];

function formatXof(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} FCFA`;
}

function QuoteCard({ requestId, requestStatus, pricingMode, fixedPriceXof }: { requestId: number; requestStatus: string; pricingMode?: "fixed" | "quote" | null; fixedPriceXof?: string | null }) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const quotesQuery = trpc.quotes.mine.useQuery({ requestId }, { enabled: isAuthenticated && ["QUOTE_PENDING", "QUOTE_ACCEPTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "REVIEWED"].includes(requestStatus) });
  const paymentQuery = trpc.payments.mine.useQuery({ requestId }, { enabled: isAuthenticated && ["QUOTE_ACCEPTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "REVIEWED"].includes(requestStatus) });
  const acceptQuote = trpc.quotes.accept.useMutation({ onSuccess: () => { void utils.quotes.mine.invalidate({ requestId }); void utils.requests.mine.invalidate(); } });
  const rejectQuote = trpc.quotes.reject.useMutation({ onSuccess: () => { void utils.quotes.mine.invalidate({ requestId }); void utils.requests.mine.invalidate(); } });
  const declarePayment = trpc.payments.declare.useMutation({ onSuccess: () => { void utils.payments.mine.invalidate({ requestId }); } });
  const [method, setMethod] = useState<"cash" | "mobile_money">("cash");
  const latestQuote = quotesQuery.data?.[0];
  const fixedPriceAvailable = pricingMode === "fixed" && Number(fixedPriceXof ?? 0) > 0;
  const canPay = (latestQuote?.status === "accepted" || fixedPriceAvailable) && !paymentQuery.data && ["ACCEPTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "REVIEWED"].includes(requestStatus);

  if (quotesQuery.isLoading) return <Text className="mt-3 text-sm text-muted">Chargement du devis…</Text>;
  if (!latestQuote && !fixedPriceAvailable) return null;

  return (
    <View className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-3">
      {latestQuote ? <><Text className="text-xs font-bold uppercase tracking-wide text-primary">Devis du prestataire</Text><Text className="mt-2 text-lg font-bold text-foreground">{formatXof(latestQuote.totalXof)}</Text><Text className="mt-1 text-sm text-muted">Prestation {formatXof(latestQuote.amountXof)} · déplacement {formatXof(latestQuote.travelFeeXof)}</Text>{latestQuote.note ? <Text className="mt-2 text-sm leading-5 text-foreground">{latestQuote.note}</Text> : null}<Text className="mt-2 text-xs font-semibold text-primary">{latestQuote.status === "proposed" ? "En attente de votre réponse" : latestQuote.status === "accepted" ? "Devis accepté" : latestQuote.status === "rejected" ? "Devis refusé" : "Devis remplacé"}</Text>{latestQuote.status === "proposed" ? <View className="mt-3 flex-row gap-2"><Pressable disabled={rejectQuote.isPending || acceptQuote.isPending} onPress={() => rejectQuote.mutate({ quoteId: latestQuote.id })} style={({ pressed }) => ({ flex: 1, borderRadius: 14, borderWidth: 1, borderColor: "#D9DEDA", paddingVertical: 12, alignItems: "center", opacity: pressed ? 0.7 : 1 })}><Text className="font-bold text-foreground">Refuser</Text></Pressable><Pressable disabled={rejectQuote.isPending || acceptQuote.isPending} onPress={() => acceptQuote.mutate({ quoteId: latestQuote.id })} style={({ pressed }) => ({ flex: 1, borderRadius: 14, backgroundColor: "#0D6B5B", paddingVertical: 12, alignItems: "center", opacity: pressed ? 0.82 : 1 })}><Text className="font-bold text-white">Accepter</Text></Pressable></View> : null}</> : <><Text className="text-xs font-bold uppercase tracking-wide text-primary">Tarif catalogue</Text><Text className="mt-2 text-lg font-bold text-foreground">{formatXof(fixedPriceXof ?? 0)}</Text><Text className="mt-1 text-sm text-muted">Cette prestation est proposée à prix fixe.</Text></>}
      {paymentQuery.data ? <Text className="mt-3 text-sm font-semibold text-primary">Paiement déclaré · {paymentQuery.data.payment.status}</Text> : null}
      {canPay ? <View className="mt-3"><Text className="text-sm font-bold text-foreground">Déclarer le mode de paiement</Text><View className="mt-2 flex-row gap-2"><Pressable onPress={() => setMethod("cash")} style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: method === "cash" ? "#0D6B5B" : "#D9DEDA", paddingVertical: 10, alignItems: "center", backgroundColor: method === "cash" ? "#E7F1ED" : "#FBFCFA" }}><Text className="text-xs font-bold text-foreground">Espèces</Text></Pressable><Pressable onPress={() => setMethod("mobile_money")} style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: method === "mobile_money" ? "#0D6B5B" : "#D9DEDA", paddingVertical: 10, alignItems: "center", backgroundColor: method === "mobile_money" ? "#E7F1ED" : "#FBFCFA" }}><Text className="text-xs font-bold text-foreground">Mobile Money</Text></Pressable></View><Text className="mt-2 text-xs leading-4 text-muted">Cette déclaration ne débite aucun compte. La confirmation est faite manuellement par l’administration.</Text><Pressable disabled={declarePayment.isPending} onPress={() => declarePayment.mutate({ requestId, method, idempotencyKey: `payment-${requestId}-${method}` })} style={({ pressed }) => ({ marginTop: 10, borderRadius: 14, backgroundColor: "#0D6B5B", paddingVertical: 12, alignItems: "center", opacity: pressed ? 0.82 : 1 })}><Text className="font-bold text-white">{declarePayment.isPending ? "Enregistrement…" : "Déclarer le paiement"}</Text></Pressable></View> : null}
      {acceptQuote.error || rejectQuote.error || declarePayment.error ? <Text className="mt-2 text-sm text-error">Cette action n’a pas pu aboutir. Vérifiez votre connexion et réessayez.</Text> : null}
    </View>
  );
}

type ComplaintRow = {
  complaint: { id: number; status: string; subject: string; description: string; resolutionNote: string | null; createdAt: Date | string };
  requestReference: string;
  requestStatus: string;
};

function ComplaintSection({ requestId, requestStatus, complaint }: { requestId: number; requestStatus: string; complaint?: ComplaintRow }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const createComplaint = trpc.complaints.create.useMutation({
    onSuccess: () => {
      setOpen(false);
      setSubject("");
      setDescription("");
      void utils.complaints.mine.invalidate();
      void utils.requests.mine.invalidate();
    },
  });
  const isActive = complaint?.complaint.status === "open" || complaint?.complaint.status === "in_progress";
  const eligible = complaintEligibleStatuses.includes(requestStatus) || requestStatus === "CLAIM_OPEN";

  if (!complaint && !eligible) return null;

  return (
    <View className="mt-3 rounded-2xl border border-border bg-sand/60 p-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-bold uppercase tracking-wide text-primary">Réclamation</Text>
        {complaint ? <Text className="text-xs font-bold text-foreground">{complaintStatusLabels[complaint.complaint.status] ?? complaint.complaint.status}</Text> : null}
      </View>
      {complaint ? <View className="mt-2">
        <Text className="font-semibold text-foreground">{complaint.complaint.subject}</Text>
        <Text className="mt-1 text-sm leading-5 text-foreground">{complaint.complaint.description}</Text>
        <Text className="mt-1 text-xs text-muted">Ouverte le {new Date(complaint.complaint.createdAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</Text>
        {complaint.complaint.resolutionNote ? <Text className="mt-2 text-xs font-semibold text-primary">Suivi Barahub : {complaint.complaint.resolutionNote}</Text> : null}
      </View> : null}
      {!isActive && eligible ? (open ? <View className="mt-3">
        <TextInput value={subject} onChangeText={setSubject} placeholder="Sujet de la réclamation" placeholderTextColor="#87938F" maxLength={180} className="rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground" />
        <TextInput value={description} onChangeText={setDescription} placeholder="Décrivez le problème rencontré (12 caractères minimum)" placeholderTextColor="#87938F" multiline maxLength={4000} textAlignVertical="top" className="mt-2 min-h-20 rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground" />
        {createComplaint.error ? <Text className="mt-2 text-sm text-error">La réclamation n’a pas pu être envoyée. Vérifiez les champs et réessayez.</Text> : null}
        <View className="mt-3 flex-row gap-2">
          <Pressable onPress={() => setOpen(false)} className="items-center rounded-2xl border border-border px-4 py-3"><Text className="text-sm font-bold text-foreground">Annuler</Text></Pressable>
          <Pressable disabled={createComplaint.isPending || subject.trim().length < 3 || description.trim().length < 12} onPress={() => createComplaint.mutate({ requestId, subject, description })} className="flex-1 items-center rounded-2xl bg-primary py-3"><Text className="text-sm font-bold text-white">{createComplaint.isPending ? "Envoi…" : "Envoyer la réclamation"}</Text></Pressable>
        </View>
      </View> : <Pressable onPress={() => setOpen(true)} className="mt-3 items-center rounded-2xl border border-coral/40 py-3"><Text className="text-sm font-bold text-error">Signaler un problème</Text></Pressable>) : null}
      {isActive ? <Text className="mt-2 text-xs text-muted">Barahub suit cette réclamation. Vous serez notifié à chaque mise à jour.</Text> : null}
    </View>
  );
}

export default function RequestsScreen() {
  const { isAuthenticated } = useAuth();
  const requestsQuery = trpc.requests.mine.useQuery(undefined, { enabled: isAuthenticated });
  const complaintsQuery = trpc.complaints.mine.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();
  const createReview = trpc.reviews.create.useMutation({ onSuccess: () => utils.requests.mine.invalidate() });
  const cancelRequest = trpc.requests.cancel.useMutation({ onSuccess: () => utils.requests.mine.invalidate() });
  const requests = requestsQuery.data ?? [];
  const complaints = complaintsQuery.data ?? [];
  const [drafts, setDrafts] = useState<Record<number, { rating: number; comment: string }>>({});

  const draftFor = (requestId: number) => drafts[requestId] ?? { rating: 0, comment: "" };
  const updateDraft = (requestId: number, patch: Partial<{ rating: number; comment: string }>) => {
    setDrafts((current) => ({ ...current, [requestId]: { ...draftFor(requestId), ...patch } }));
  };
  const submitReview = (requestId: number) => {
    const draft = draftFor(requestId);
    if (draft.rating < 1 || createReview.isPending) return;
    createReview.mutate({ requestId, rating: draft.rating, comment: draft.comment.trim() || undefined });
  };
  const requestCancellation = (requestId: number) => {
    const perform = () => cancelRequest.mutate({ requestId, reason: "Annulation demandée par le client" });
    if (Platform.OS === "web") {
      if (globalThis.confirm("Annuler cette demande ? Cette action ne peut pas être annulée.")) perform();
      return;
    }
    Alert.alert("Annuler la demande ?", "Cette action ne peut pas être annulée.", [{ text: "Garder", style: "cancel" }, { text: "Annuler", style: "destructive", onPress: perform }]);
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 42 }}>
        <Text className="text-xs font-semibold uppercase tracking-widest text-primary">Espace client</Text>
        <Text className="mt-1 text-3xl font-bold text-foreground">Mes demandes</Text>
        <Text className="mt-2 text-base leading-6 text-muted">Retrouvez vos demandes et partagez votre expérience après chaque intervention terminée.</Text>
        <NotificationCenter />

        {requests.length > 0 ? (
          <View className="mt-8 gap-3">
            {requests.map((request) => {
              const draft = draftFor(request.id);
              const complaint = complaints.find((row) => row.complaint.requestId === request.id);
              const canReview = request.status === "COMPLETED" && !request.review;
              const canCancel = ["REQUESTED", "ASSIGNED", "ACCEPTED", "QUOTE_PENDING", "QUOTE_ACCEPTED", "SCHEDULED"].includes(request.status);
              return (
                <View key={request.reference} className="rounded-3xl border border-border bg-surface p-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-bold text-foreground">{request.reference}</Text>
                    <Text className="text-xs font-bold text-primary">{statusLabels[request.status] ?? request.status}</Text>
                  </View>
                  {request.service?.name ? <Text className="mt-2 font-semibold text-foreground">{request.service.name}</Text> : null}
                  <Text className="mt-1 text-sm leading-5 text-muted">{request.description}</Text>
                  <Text className="mt-2 text-xs text-muted">{request.commune} · {request.quartier}</Text>
                  {request.desiredSlot ? <Text className="mt-1 text-xs font-semibold text-primary">Créneau souhaité : {new Date(request.desiredSlot).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</Text> : null}
                  {request.assignedProviderId ? <QuoteCard requestId={request.id} requestStatus={request.status} pricingMode={request.service?.pricingMode} fixedPriceXof={request.service?.fixedPriceXof} /> : null}
                  {request.assignedProviderId && (request.status === "SCHEDULED" || request.status === "IN_PROGRESS") ? <CustomerTrackingCard requestId={request.id} /> : null}
                  {request.assignedProviderId && ["ASSIGNED", "ACCEPTED", "QUOTE_PENDING", "QUOTE_ACCEPTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "REVIEWED", "CLAIM_OPEN"].includes(request.status) ? <ConversationCard requestId={request.id} viewer="client" /> : null}
                  <ComplaintSection requestId={request.id} requestStatus={request.status} complaint={complaint} />
                  {canCancel ? <Pressable disabled={cancelRequest.isPending} onPress={() => requestCancellation(request.id)} style={({ pressed }) => ({ marginTop: 14, alignItems: "center", borderRadius: 14, borderWidth: 1, borderColor: "#E8B6A5", paddingVertical: 11, opacity: pressed ? 0.7 : 1 })}><Text className="text-sm font-bold text-error">{cancelRequest.isPending ? "Annulation…" : "Annuler la demande"}</Text></Pressable> : null}
                  {cancelRequest.error ? <Text className="mt-2 text-sm text-error">Cette demande ne peut plus être annulée. Vérifiez son statut puis réessayez.</Text> : null}

                  {request.review ? (
                    <View className="mt-4 rounded-2xl bg-sand p-3">
                      <Text className="text-xs font-bold uppercase tracking-wide text-primary">Votre avis</Text>
                      <Text className="mt-1 text-lg tracking-widest text-primary">{"★".repeat(request.review.rating)}<Text className="text-border">{"★".repeat(5 - request.review.rating)}</Text></Text>
                      {request.review.comment ? <Text className="mt-1 text-sm leading-5 text-foreground">{request.review.comment}</Text> : null}
                    </View>
                  ) : null}

                  {canReview ? (
                    <View className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-3">
                      <Text className="font-bold text-foreground">Comment s’est passée l’intervention ?</Text>
                      <Text className="mt-1 text-sm text-muted">Votre retour aide le pilote à améliorer la qualité des prestations.</Text>
                      <View className="mt-3 flex-row gap-2">
                        {[1, 2, 3, 4, 5].map((value) => <Pressable key={value} accessibilityLabel={`${value} étoile${value > 1 ? "s" : ""}`} onPress={() => updateDraft(request.id, { rating: value })} style={({ pressed }) => ({ height: 42, width: 42, alignItems: "center", justifyContent: "center", borderRadius: 21, backgroundColor: value <= draft.rating ? "#0D6B5B" : "#E9EEEA", opacity: pressed ? 0.72 : 1 })}><Text style={{ color: value <= draft.rating ? "#FFFFFF" : "#64736F", fontSize: 18 }}>★</Text></Pressable>)}
                      </View>
                      <TextInput value={draft.comment} onChangeText={(comment) => updateDraft(request.id, { comment })} placeholder="Un commentaire (facultatif)" placeholderTextColor="#87938F" multiline maxLength={1200} textAlignVertical="top" className="mt-3 min-h-20 rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground" />
                      {createReview.error ? <Text className="mt-2 text-sm text-error">Cet avis n’a pas pu être enregistré. Vérifiez votre connexion et réessayez.</Text> : null}
                      <Pressable disabled={draft.rating < 1 || createReview.isPending} onPress={() => submitReview(request.id)} style={({ pressed }) => ({ marginTop: 12, alignItems: "center", borderRadius: 14, backgroundColor: draft.rating > 0 ? "#0D6B5B" : "#D9DEDA", paddingVertical: 12, opacity: pressed && draft.rating > 0 ? 0.82 : 1 })}><Text className="font-bold text-white">{createReview.isPending ? "Publication…" : "Publier mon avis"}</Text></Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : (
          <View className="mt-8 items-center rounded-3xl border border-dashed border-border bg-surface px-6 py-10">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-sand"><Ionicons name="receipt-outline" size={30} color="#0D6B5B" /></View>
            <Text className="mt-5 text-center text-lg font-bold text-foreground">{isAuthenticated ? "Aucune demande pour le moment" : "Connectez-vous pour suivre vos demandes"}</Text>
            <Text className="mt-2 text-center text-sm leading-5 text-muted">Décrivez votre besoin en quelques étapes. Les demandes envoyées apparaîtront ici avec leur statut.</Text>
            <Pressable style={({ pressed }) => ({ marginTop: 24, flexDirection: "row", alignItems: "center", borderRadius: 16, backgroundColor: "#0D6B5B", paddingHorizontal: 20, paddingVertical: 14, opacity: pressed ? 0.82 : 1 })} onPress={() => router.push("/request" as never)}><Ionicons name="add" size={20} color="#FFFFFF" /><Text className="ml-2 font-bold text-white">Créer une demande</Text></Pressable>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
