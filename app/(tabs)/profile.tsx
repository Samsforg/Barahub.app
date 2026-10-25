import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";

const links = [
  { label: "Espace prestataire", icon: "briefcase-outline" as const, route: "/provider" },
  { label: "Conditions de service", icon: "document-text-outline" as const, route: "/support" },
  { label: "Confidentialité", icon: "shield-checkmark-outline" as const, route: "/support" },
  { label: "Besoin d’aide ?", icon: "help-circle-outline" as const, route: "/support" },
];

export default function ProfileScreen() {
  const { user, isAuthenticated } = useAuth();
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36 }}>
        <Text className="text-xs font-semibold uppercase tracking-widest text-primary">Barahub</Text>
        <Text className="mt-1 text-3xl font-bold text-foreground">Mon compte</Text>
        <View className="mt-6 flex-row items-center rounded-3xl border border-border bg-surface p-4">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-sand"><Ionicons name="person-outline" size={26} color="#0D6B5B" /></View>
          <View className="ml-3 flex-1"><Text className="font-bold text-foreground">{isAuthenticated ? user?.name ?? "Compte Barahub" : "Visiteur"}</Text><Text className="mt-1 text-sm text-muted">{isAuthenticated ? "Gérez votre profil et vos demandes." : "Connectez-vous pour suivre vos demandes."}</Text></View>
          {!isAuthenticated ? <Pressable style={({ pressed }) => ({ borderRadius: 12, backgroundColor: "#0D6B5B", paddingHorizontal: 14, paddingVertical: 10, opacity: pressed ? 0.82 : 1 })} onPress={() => router.push("/login" as never)}><Text className="text-sm font-bold text-white">Se connecter</Text></Pressable> : null}
        </View>

        <Text className="mt-8 text-lg font-bold text-foreground">Accès utiles</Text>
        <View className="mt-3 overflow-hidden rounded-3xl border border-border bg-surface">
          {user?.role === "admin" ? <Pressable className="flex-row items-center" style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#E4E8E3", opacity: pressed ? 0.72 : 1 })} onPress={() => router.push("/admin" as never)}><Ionicons name="shield-checkmark-outline" size={21} color="#0D6B5B" /><Text className="ml-3 flex-1 font-semibold text-foreground">Administration des avis</Text><Ionicons name="chevron-forward" size={18} color="#64736F" /></Pressable> : null}
          {links.map((link, index) => <Pressable key={link.label} className="flex-row items-center" style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16, borderTopWidth: index > 0 ? 1 : 0, borderTopColor: "#E4E8E3", opacity: pressed ? 0.72 : 1 })} onPress={() => router.push(link.route as never)}><Ionicons name={link.icon} size={21} color="#0D6B5B" /><Text className="ml-3 flex-1 font-semibold text-foreground">{link.label}</Text><Ionicons name="chevron-forward" size={18} color="#64736F" /></Pressable>)}
        </View>

        <View className="mt-8 rounded-3xl bg-primary/10 p-5"><Text className="font-bold text-primary">Pilote Abidjan</Text><Text className="mt-2 text-sm leading-5 text-foreground">Les catégories et zones disponibles dépendent des professionnels réellement vérifiés par Barahub.</Text></View>
      </ScrollView>
    </ScreenContainer>
  );
}
