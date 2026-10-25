import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";

export default function RequestSavedScreen() {
  const { reference } = useLocalSearchParams<{ reference?: string }>();
  return (
    <ScreenContainer className="items-center justify-center px-6">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <Ionicons name="checkmark-circle-outline" size={48} color="#0D6B5B" />
      </View>
      <Text className="mt-6 text-center text-2xl font-bold text-foreground">Demande reçue</Text>
      <Text className="mt-3 text-center text-base leading-6 text-muted">Votre demande a été enregistrée côté serveur. L’équipe pilote pourra la vérifier et l’affecter selon la couverture réelle.</Text>
      {reference ? <Text className="mt-4 rounded-xl bg-sand px-4 py-3 text-center font-bold text-primary">Référence : {reference}</Text> : null}
      <Pressable className="mt-8 rounded-2xl bg-primary px-6 py-4" onPress={() => router.replace("/(tabs)/requests" as never)}>
        <Text className="font-bold text-white">Voir mes demandes</Text>
      </Pressable>
    </ScreenContainer>
  );
}
