import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

const categories = [
  { label: "Plomberie", icon: "water-outline" as const },
  { label: "Électricité", icon: "flash-outline" as const },
  { label: "Climatisation", icon: "snow-outline" as const },
  { label: "Ménage", icon: "sparkles-outline" as const },
  { label: "Petites réparations", icon: "hammer-outline" as const },
];

const fallbackServices = [
  {
    title: "Dépannage plomberie",
    category: "Plomberie",
    description: "Fuite, robinet ou évacuation à diagnostiquer.",
    price: "Sur devis",
    zone: "Cocody · Plateau",
    icon: "water-outline" as const,
  },
  {
    title: "Diagnostic électrique",
    category: "Électricité",
    description: "Un professionnel pour sécuriser votre installation.",
    price: "Sur devis",
    zone: "Marcory · Treichville",
    icon: "flash-outline" as const,
  },
  {
    title: "Entretien climatisation",
    category: "Climatisation",
    description: "Nettoyage et contrôle avant la prochaine chaleur.",
    price: "À partir de 15 000 FCFA",
    zone: "Cocody · Deux-Plateaux",
    icon: "snow-outline" as const,
  },
];

export default function HomeScreen() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const catalogQuery = trpc.catalog.list.useQuery(undefined, { staleTime: 300_000 });
  const services = catalogQuery.data?.length
    ? catalogQuery.data.map((service) => ({
        title: service.name,
        category: service.category.name,
        description: service.description,
        price: service.pricingMode === "fixed" && service.fixedPriceXof ? `À partir de ${Number(service.fixedPriceXof).toLocaleString("fr-FR")} FCFA` : "Sur devis",
        zone: service.travelTerms ?? "Zone à confirmer",
        icon: (service.category.slug === "plomberie" ? "water-outline" : service.category.slug === "electricite" ? "flash-outline" : service.category.slug === "climatisation" ? "snow-outline" : service.category.slug === "menage" ? "sparkles-outline" : "hammer-outline") as (typeof categories)[number]["icon"],
      }))
    : fallbackServices;

  const filteredServices = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return services.filter((service) => {
      const matchesQuery = !normalized || `${service.title} ${service.category}`.toLowerCase().includes(normalized);
      const matchesCategory = !activeCategory || service.category === activeCategory;
      return matchesQuery && matchesCategory;
    });
  }, [activeCategory, query, services]);

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-5 pt-5">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-semibold uppercase tracking-widest text-primary">Abidjan · pilote</Text>
              <Text className="mt-1 text-3xl font-bold text-foreground">Barahub</Text>
            </View>
            <Pressable
              accessibilityLabel="Ouvrir l’assistance"
              className="items-center justify-center"
              style={({ pressed }) => ({ height: 44, width: 44, borderRadius: 22, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E4E8E3", opacity: pressed ? 0.82 : 1 })}
              onPress={() => router.push("/support" as never)}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={21} color="#0D6B5B" />
            </Pressable>
          </View>

          <View className="mt-6 rounded-3xl bg-primary px-5 py-6">
            <Text className="text-2xl font-bold leading-8 text-white">Le bon professionnel pour votre maison.</Text>
            <Text className="mt-2 text-sm leading-5 text-white/80">Décrivez votre besoin. Nous vous aidons à trouver une intervention adaptée à votre zone.</Text>
            <Pressable
              className="flex-row items-center justify-center"
              onPress={() => router.push("/request" as never)}
              style={({ pressed }) => ({ marginTop: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingVertical: 14, opacity: pressed ? 0.82 : 1 })}
            >
              <Ionicons name="add-circle-outline" size={20} color="#0D6B5B" />
              <Text className="ml-2 font-bold text-primary">Décrire mon besoin</Text>
            </Pressable>
          </View>

          <View className="mt-7 flex-row items-center rounded-2xl border border-border bg-surface px-4">
            <Ionicons name="search-outline" size={20} color="#64736F" />
            <TextInput
              accessibilityLabel="Rechercher un service"
              className="ml-3 flex-1 py-4 text-base text-foreground"
              placeholder="Rechercher un service"
              placeholderTextColor="#8A9893"
              value={query}
              onChangeText={setQuery}
            />
            {query.length > 0 ? <Pressable onPress={() => setQuery("")}><Ionicons name="close-circle" size={19} color="#64736F" /></Pressable> : null}
          </View>

          <View className="mt-7 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-foreground">Parcourir les services</Text>
            <Text className="text-sm text-muted">{filteredServices.length} résultat{filteredServices.length > 1 ? "s" : ""}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ gap: 10 }}>
            <Pressable
              className="items-center"
              style={({ pressed }) => ({ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: activeCategory === null ? "#0D6B5B" : "#E4E8E3", backgroundColor: activeCategory === null ? "#E7F3EF" : "#FFFFFF", opacity: pressed ? 0.82 : 1 })}
              onPress={() => setActiveCategory(null)}
            >
              <Ionicons name="grid-outline" size={21} color="#0D6B5B" />
              <Text className="mt-1 text-xs font-semibold text-foreground">Tout</Text>
            </Pressable>
            {categories.map((category) => (
              <Pressable
                key={category.label}
                className="items-center"
                style={({ pressed }) => ({ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: activeCategory === category.label ? "#0D6B5B" : "#E4E8E3", backgroundColor: activeCategory === category.label ? "#E7F3EF" : "#FFFFFF", opacity: pressed ? 0.82 : 1 })}
                onPress={() => setActiveCategory(category.label)}
              >
                <Ionicons name={category.icon} size={21} color="#0D6B5B" />
                <Text className="mt-1 text-xs font-semibold text-foreground">{category.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View className="mt-7 gap-3">
            {filteredServices.map((service) => (
              <Pressable
                key={service.title}
                className=""
                onPress={() => router.push({ pathname: "/service/[slug]", params: { slug: service.title } } as never)}
                style={({ pressed }) => ({ borderRadius: 24, borderWidth: 1, borderColor: "#E4E8E3", backgroundColor: "#FFFFFF", padding: 16, transform: [{ scale: pressed ? 0.99 : 1 }] })}
              >
                <View className="flex-row">
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-sand">
                    <Ionicons name={service.icon} size={23} color="#0D6B5B" />
                  </View>
                  <View className="ml-3 flex-1">
                    <View className="flex-row items-start justify-between gap-2">
                      <Text className="flex-1 text-base font-bold text-foreground">{service.title}</Text>
                      <Text className="text-xs font-bold text-primary">{service.price}</Text>
                    </View>
                    <Text className="mt-1 text-sm leading-5 text-muted">{service.description}</Text>
                    <View className="mt-3 flex-row items-center">
                      <Ionicons name="location-outline" size={15} color="#64736F" />
                      <Text className="ml-1 text-xs text-muted">{service.zone}</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
            {filteredServices.length === 0 ? (
              <View className="items-center rounded-3xl border border-dashed border-border px-5 py-8">
                <Ionicons name="search-outline" size={28} color="#64736F" />
                <Text className="mt-3 text-center font-semibold text-foreground">Aucun service trouvé</Text>
                <Text className="mt-1 text-center text-sm text-muted">Essayez un autre mot ou décrivez directement votre besoin.</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
