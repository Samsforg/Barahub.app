import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";

export default function ServiceDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const title = slug ?? "Prestation Barahub";

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36 }}>
        <Pressable className="flex-row items-center" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0D6B5B" />
          <Text className="ml-2 font-semibold text-primary">Retour au catalogue</Text>
        </Pressable>
        <View className="mt-7 h-24 w-24 items-center justify-center rounded-3xl bg-sand">
          <Ionicons name="construct-outline" size={42} color="#0D6B5B" />
        </View>
        <Text className="mt-6 text-3xl font-bold text-foreground">{title}</Text>
        <Text className="mt-3 text-base leading-6 text-muted">Le tarif et la disponibilité dépendent du diagnostic, de la zone et des professionnels vérifiés disponibles au moment de la demande.</Text>
        <View className="mt-6 gap-3">
          {[
            ["shield-checkmark-outline", "Professionnels vérifiés par l’administration avant affectation"],
            ["location-outline", "Couverture définie par commune et quartier"],
            ["receipt-outline", "Devis présenté avant toute prestation concernée"],
          ].map(([icon, label]) => (
            <View key={label} className="flex-row items-center rounded-2xl border border-border bg-surface p-4">
              <Ionicons name={icon as never} size={21} color="#0D6B5B" />
              <Text className="ml-3 flex-1 text-sm font-semibold leading-5 text-foreground">{label}</Text>
            </View>
          ))}
        </View>
        <Pressable className="" style={({ pressed }) => ({ marginTop: 32, borderRadius: 16, backgroundColor: "#0D6B5B", paddingHorizontal: 16, paddingVertical: 16, opacity: pressed ? 0.82 : 1 })} onPress={() => router.push("/request" as never)}>
          <Text className="text-center font-bold text-white">Décrire mon besoin</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
