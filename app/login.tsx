import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { startOAuthLogin } from "@/constants/oauth";

export default function LoginScreen() {
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (isStarting) return;

    setIsStarting(true);
    setErrorMessage(null);

    try {
      await startOAuthLogin();
    } catch (error) {
      console.error("[Login] Failed to start OAuth", error);
      setErrorMessage("La connexion est momentanément indisponible. Réessayez.");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <ScreenContainer className="px-5 pt-5">
      <Pressable className="flex-row items-center" onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#0D6B5B" />
        <Text className="ml-2 font-semibold text-primary">Retour</Text>
      </Pressable>
      <View className="mt-14 items-center">
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-primary">
          <Text className="text-4xl font-black text-white">B</Text>
        </View>
        <Text className="mt-6 text-3xl font-bold text-foreground">Ravi de vous revoir</Text>
        <Text className="mt-2 text-center text-base leading-6 text-muted">Connectez-vous pour retrouver vos demandes et recevoir les mises à jour autorisées.</Text>
      </View>
      <View className="mt-10 rounded-3xl border border-border bg-surface p-5">
        <Text className="font-bold text-foreground">Connexion sécurisée</Text>
        <Text className="mt-2 text-sm leading-5 text-muted">Barahub utilise la connexion Manus OAuth du projet. Aucun mot de passe n’est stocké dans cette application.</Text>
        <Pressable
          disabled={isStarting}
          style={({ pressed }) => ({
            marginTop: 20,
            borderRadius: 16,
            backgroundColor: "#0D6B5B",
            paddingHorizontal: 16,
            paddingVertical: 16,
            opacity: isStarting ? 0.6 : pressed ? 0.82 : 1,
          })}
          onPress={handleLogin}
        >
          <Text className="text-center font-bold text-white">
            {isStarting ? "Redirection en cours..." : "Continuer vers la connexion"}
          </Text>
        </Pressable>
        {errorMessage ? (
          <Text className="mt-3 text-center text-sm leading-5 text-error">{errorMessage}</Text>
        ) : null}
      </View>
    </ScreenContainer>
  );
}
