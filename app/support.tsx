import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Linking, Pressable, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";

export default function SupportScreen() {
  return (
    <ScreenContainer className="px-5 pt-5">
      <Pressable className="flex-row items-center" onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#0D6B5B" />
        <Text className="ml-2 font-semibold text-primary">Retour</Text>
      </Pressable>
      <Text className="mt-8 text-3xl font-bold text-foreground">Besoin d’aide ?</Text>
      <Text className="mt-2 text-base leading-6 text-muted">Le pilote Barahub est suivi manuellement à Abidjan. Pour une question ou un incident, contactez l’assistance.</Text>
      <Pressable className="flex-row items-center" style={({ pressed }) => ({ marginTop: 32, flexDirection: "row", alignItems: "center", borderRadius: 16, backgroundColor: "#0D6B5B", paddingHorizontal: 20, paddingVertical: 16, opacity: pressed ? 0.82 : 1 })} onPress={() => Linking.openURL("https://wa.me/?text=Bonjour%20Barahub%2C%20j%27ai%20une%20question%20sur%20une%20demande.") }>
        <Ionicons name="logo-whatsapp" size={24} color="#FFFFFF" />
        <Text className="ml-3 font-bold text-white">Contacter le support WhatsApp</Text>
      </Pressable>
      <View className="mt-5 rounded-3xl bg-sand/60 p-5">
        <Text className="font-bold text-foreground">À savoir</Text>
        <Text className="mt-2 text-sm leading-5 text-foreground">Ce bouton ouvre WhatsApp avec un message générique. Aucun envoi automatique ni secret WhatsApp n’est embarqué dans l’application.</Text>
      </View>
    </ScreenContainer>
  );
}
