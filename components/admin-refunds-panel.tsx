import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { trpc } from "@/lib/trpc";

const refundStatusLabels = { pending: "En attente", completed: "Effectué", rejected: "Rejeté" } as const;
const methodLabels = { cash: "Espèces", mobile_money: "Mobile Money", external: "Prestataire externe" } as const;

function formatXof(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} FCFA`;
}

export function AdminRefundsPanel() {
  const paymentsQuery = trpc.admin.payments.useQuery();
  const refundsQuery = trpc.admin.refunds.useQuery();
  const utils = trpc.useUtils();
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const invalidate = () => {
    void utils.admin.refunds.invalidate();
    void utils.admin.payments.invalidate();
    void utils.admin.requests.invalidate();
  };
  const createRefund = trpc.admin.createRefund.useMutation({ onSuccess: invalidate });
  const processRefund = trpc.admin.processRefund.useMutation({ onSuccess: invalidate });

  if (paymentsQuery.isLoading || refundsQuery.isLoading) return <View className="items-center rounded-3xl border border-border bg-surface p-8"><ActivityIndicator color="#0D6B5B" /><Text className="mt-3 text-sm text-muted">Chargement des remboursements…</Text></View>;
  if (paymentsQuery.error || refundsQuery.error) return <View className="rounded-3xl border border-coral/30 bg-coral/10 p-5"><Text className="font-bold text-foreground">Remboursements indisponibles</Text><Text className="mt-1 text-sm leading-5 text-muted">La file de remboursement n’a pas pu être chargée.</Text><Pressable onPress={() => { void paymentsQuery.refetch(); void refundsQuery.refetch(); }} className="mt-4 self-start rounded-2xl bg-primary px-4 py-3"><Text className="font-bold text-white">Réessayer</Text></Pressable></View>;

  const refunds = refundsQuery.data ?? [];
  const refundedPaymentIds = new Set(refunds.map((row) => row.refund.paymentId));
  const refundable = (paymentsQuery.data ?? []).filter(({ payment }) => payment.status === "confirmed" && !refundedPaymentIds.has(payment.id));
  const pendingRefunds = refunds.filter((row) => row.refund.status === "pending");

  return <View className="gap-4">
    <View className="rounded-3xl bg-sand p-4"><Text className="text-sm leading-5 text-foreground">Le remboursement est créé sur un paiement <Text className="font-bold">confirmé</Text>, puis confirmé ou rejeté par un administrateur. Un paiement ne peut être remboursé qu’une fois et chaque décision est journalisée.</Text></View>

    <View className="rounded-3xl border border-border bg-surface p-4">
      <Text className="text-lg font-bold text-foreground">À rembourser</Text>
      {refundable.length === 0 ? <Text className="mt-3 text-sm text-muted">Aucun paiement confirmé en attente de remboursement.</Text> : refundable.map(({ payment, requestReference, customerName, providerName }) => (
        <View key={payment.id} className="mt-4 rounded-2xl bg-sand/60 p-3">
          <Text className="font-bold text-foreground">{requestReference} · {formatXof(payment.amountXof)}</Text>
          <Text className="mt-1 text-xs text-muted">{methodLabels[payment.method]} · {customerName || "Compte client"} · {providerName || "Non affecté"}</Text>
          <Text className="mt-1 text-xs text-muted">Commission simulée : {formatXof(payment.commissionXof)}</Text>
          <TextInput value={reasons[payment.id] ?? ""} onChangeText={(value) => setReasons((current) => ({ ...current, [payment.id]: value }))} placeholder="Motif du remboursement (obligatoire)" placeholderTextColor="#87938F" multiline maxLength={1200} textAlignVertical="top" className="mt-3 min-h-14 rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-foreground" />
          <Pressable disabled={createRefund.isPending} onPress={() => createRefund.mutate({ paymentId: payment.id, reason: reasons[payment.id]?.trim() || "Remboursement demandé par l’administration du pilote." })} className="mt-3 items-center rounded-2xl border border-coral/40 py-3"><Text className="text-sm font-bold text-error">Demander le remboursement</Text></Pressable>
        </View>
      ))}
      {createRefund.error ? <Text className="mt-2 text-sm text-error">Le remboursement n’a pas pu être créé.</Text> : null}
    </View>

    <View className="rounded-3xl border border-border bg-surface p-4">
      <Text className="text-lg font-bold text-foreground">Remboursements en attente</Text>
      {pendingRefunds.length === 0 ? <Text className="mt-3 text-sm text-muted">Aucun remboursement en attente.</Text> : pendingRefunds.map(({ refund, requestReference, requestStatus, customerName }) => (
        <View key={refund.id} className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-3">
          <Text className="font-bold text-foreground">{requestReference} · {formatXof(refund.amountXof)}</Text>
          <Text className="mt-1 text-sm text-foreground">{refund.reason}</Text>
          <Text className="mt-1 text-xs text-muted">{customerName || "Compte client"} · Statut de la demande : {requestStatus}</Text>
          <View className="mt-3 flex-row gap-2">
            <Pressable disabled={processRefund.isPending} onPress={() => processRefund.mutate({ refundId: refund.id, status: "completed", note: "Remboursement confirmé depuis l’administration." })} className="flex-1 items-center rounded-2xl bg-primary py-3"><Text className="text-sm font-bold text-white">Confirmer</Text></Pressable>
            <Pressable disabled={processRefund.isPending} onPress={() => processRefund.mutate({ refundId: refund.id, status: "rejected", note: "Remboursement rejeté depuis l’administration." })} className="flex-1 items-center rounded-2xl border border-border py-3"><Text className="text-sm font-bold text-foreground">Rejeter</Text></Pressable>
          </View>
        </View>
      ))}
      {processRefund.error ? <Text className="mt-2 text-sm text-error">La décision n’a pas pu être enregistrée.</Text> : null}
    </View>

    <View className="rounded-3xl border border-border bg-surface p-4">
      <Text className="text-lg font-bold text-foreground">Historique</Text>
      {refunds.length === 0 ? <Text className="mt-3 text-sm text-muted">Aucun remboursement enregistré.</Text> : refunds.map(({ refund, requestReference, requestStatus }) => (
        <View key={refund.id} className="mt-3 border-t border-border pt-3">
          <View className="flex-row items-center justify-between"><Text className="font-bold text-foreground">{requestReference} · {formatXof(refund.amountXof)}</Text><Text className="text-xs font-bold text-primary">{refundStatusLabels[refund.status]}</Text></View>
          <Text className="mt-1 text-sm text-foreground">{refund.reason}</Text>
          <Text className="mt-1 text-xs text-muted">Demande : {requestStatus} · Créé le {new Date(refund.createdAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</Text>
        </View>
      ))}
    </View>
  </View>;
}
