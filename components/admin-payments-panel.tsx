import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { trpc } from "@/lib/trpc";

const statusLabels = { declared: "Déclaré", confirmed: "Confirmé", failed: "Échoué", refunded: "Remboursé" } as const;
const methodLabels = { cash: "Espèces", mobile_money: "Mobile Money", external: "Prestataire externe" } as const;

function formatXof(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} FCFA`;
}

export function AdminPaymentsPanel() {
  const paymentsQuery = trpc.admin.payments.useQuery();
  const utils = trpc.useUtils();
  const transition = trpc.admin.transitionPayment.useMutation({ onSuccess: () => { void utils.admin.payments.invalidate(); void utils.admin.requests.invalidate(); void utils.admin.analytics.invalidate(); } });

  if (paymentsQuery.isLoading) return <View className="items-center rounded-3xl border border-border bg-surface p-8"><ActivityIndicator color="#0D6B5B" /><Text className="mt-3 text-sm text-muted">Chargement des paiements…</Text></View>;
  if (paymentsQuery.error) return <View className="rounded-3xl border border-coral/30 bg-coral/10 p-5"><Text className="font-bold text-foreground">Paiements indisponibles</Text><Text className="mt-1 text-sm leading-5 text-muted">La file de rapprochement n’a pas pu être chargée.</Text><Pressable onPress={() => void paymentsQuery.refetch()} className="mt-4 self-start rounded-2xl bg-primary px-4 py-3"><Text className="font-bold text-white">Réessayer</Text></Pressable></View>;

  const rows = paymentsQuery.data ?? [];
  return <View className="gap-3">{rows.length === 0 ? <Text className="rounded-3xl border border-dashed border-border bg-surface p-6 text-center text-muted">Aucune déclaration de paiement.</Text> : rows.map(({ payment, requestReference, customerName, providerName }) => {
    return <View key={payment.id} className="rounded-3xl border border-border bg-surface p-4">
      <View className="flex-row items-center justify-between"><Text className="font-bold text-foreground">{requestReference}</Text><Text className="text-xs font-bold text-primary">{statusLabels[payment.status]}</Text></View>
      <Text className="mt-2 text-lg font-bold text-foreground">{formatXof(payment.amountXof)}</Text>
      <Text className="mt-1 text-sm text-muted">{methodLabels[payment.method]} · {customerName || "Compte client"}</Text>
      <Text className="mt-1 text-xs text-muted">Prestataire : {providerName || "Non affecté"} · Commission pilote simulée : {formatXof(payment.commissionXof)} ({payment.commissionRateBps / 100} %)</Text>
      {payment.status === "declared" ? <View className="mt-4 flex-row gap-2"><Pressable disabled={transition.isPending} onPress={() => transition.mutate({ paymentId: payment.id, status: "confirmed", note: "Déclaration vérifiée manuellement." })} className="flex-1 items-center rounded-2xl bg-primary py-3"><Text className="text-sm font-bold text-white">Confirmer</Text></Pressable><Pressable disabled={transition.isPending} onPress={() => transition.mutate({ paymentId: payment.id, status: "failed", note: "Déclaration non confirmée." })} className="flex-1 items-center rounded-2xl border border-border py-3"><Text className="text-sm font-bold text-foreground">Marquer échoué</Text></Pressable></View> : null}
      {payment.status === "confirmed" ? <Text className="mt-3 text-xs text-muted">Pour rembourser ce paiement, ouvrez l’onglet Remboursements.</Text> : null}
      {transition.error ? <Text className="mt-2 text-sm text-error">La mise à jour n’a pas pu être enregistrée.</Text> : null}
    </View>;
  })}</View>;
}
