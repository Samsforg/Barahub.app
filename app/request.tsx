import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

export default function RequestScreen() {
  const [description, setDescription] = useState("");
  const [zone, setZone] = useState("");
  const [desiredSlot, setDesiredSlot] = useState("");
  const [slotError, setSlotError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => `request-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const { isAuthenticated } = useAuth();
  const createRequest = trpc.requests.create.useMutation({
    onSuccess: (request) => router.replace({ pathname: "/request/saved", params: { reference: request.reference } } as never),
  });
  const submitRequest = () => {
    if (!isAuthenticated) {
      router.push("/login" as never);
      return;
    }
    let desiredSlotIso: string | undefined;
    if (desiredSlot.trim()) {
      const parsed = new Date(desiredSlot.trim().replace(" ", "T"));
      if (!Number.isFinite(parsed.getTime())) {
        setSlotError("Format attendu : AAAA-MM-JJ HH:mm");
        return;
      }
      if (parsed.getTime() <= Date.now()) {
        setSlotError("Choisissez un créneau à venir.");
        return;
      }
      desiredSlotIso = parsed.toISOString();
    }
    setSlotError(null);
    createRequest.mutate({ description, commune: zone.split(",")[0]?.trim() || zone, quartier: zone.split(",")[1]?.trim() || zone, desiredSlot: desiredSlotIso, latitude: coordinates?.latitude, longitude: coordinates?.longitude, idempotencyKey });
  };
  const captureLocation = async () => {
    setLocationError(null);
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED) {
      setLocationError("Autorisation GPS refusée. Vous pouvez continuer sans position.");
      return;
    }
    try {
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy ?? undefined });
    } catch {
      setLocationError("Position indisponible pour le moment. Vérifiez le GPS puis réessayez.");
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36 }} keyboardShouldPersistTaps="handled">
        <Pressable className="mb-5 flex-row items-center" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0D6B5B" />
          <Text className="ml-2 font-semibold text-primary">Retour</Text>
        </Pressable>
        <Text className="text-xs font-semibold uppercase tracking-widest text-primary">Nouvelle demande</Text>
        <Text className="mt-1 text-3xl font-bold text-foreground">Décrivez votre besoin</Text>
        <Text className="mt-2 text-base leading-6 text-muted">Ces informations aideront l’équipe pilote à orienter votre demande vers un professionnel adapté.</Text>

        <Text className="mt-8 text-sm font-bold text-foreground">Que faut-il faire ?</Text>
        <TextInput
          accessibilityLabel="Description du besoin"
          className="mt-2 min-h-32 rounded-2xl border border-border bg-surface px-4 py-3 text-base text-foreground"
          multiline
          numberOfLines={5}
          placeholder="Ex. : le robinet de la cuisine fuit depuis ce matin..."
          placeholderTextColor="#8A9893"
          textAlignVertical="top"
          value={description}
          onChangeText={setDescription}
        />

        <Text className="mt-6 text-sm font-bold text-foreground">Commune ou quartier</Text>
        <View className="mt-2 flex-row items-center rounded-2xl border border-border bg-surface px-4">
          <Ionicons name="location-outline" size={19} color="#64736F" />
          <TextInput
            accessibilityLabel="Commune ou quartier"
            className="ml-2 flex-1 py-4 text-base text-foreground"
            placeholder="Ex. Cocody, Marcory..."
            placeholderTextColor="#8A9893"
            value={zone}
            onChangeText={setZone}
          />
        </View>

        <View className="mt-6 flex-row items-start rounded-2xl bg-sand/60 p-4">
          <Ionicons name="information-circle-outline" size={21} color="#B7791F" />
          <Text className="ml-3 flex-1 text-sm leading-5 text-foreground">La position GPS et l’adresse précise restent facultatives. Elles ne seront partagées qu’avec les personnes autorisées au moment nécessaire.</Text>
        </View>

        <Text className="mt-6 text-sm font-bold text-foreground">Créneau souhaité</Text>
        <Text className="mt-1 text-xs leading-4 text-muted">Facultatif à l’envoi, mais nécessaire pour confirmer un rendez-vous. Format : AAAA-MM-JJ HH:mm.</Text>
        <TextInput
          accessibilityLabel="Créneau souhaité"
          className="mt-2 rounded-2xl border border-border bg-surface px-4 py-4 text-base text-foreground"
          placeholder="Ex. 2026-11-04 14:00"
          placeholderTextColor="#8A9893"
          value={desiredSlot}
          onChangeText={(value) => { setDesiredSlot(value); setSlotError(null); }}
          keyboardType="numbers-and-punctuation"
        />
        {slotError ? <Text className="mt-2 text-xs text-error">{slotError}</Text> : null}

        <View className="mt-4 rounded-2xl border border-border bg-surface p-4"><View className="flex-row items-center"><Ionicons name="navigate-outline" size={19} color="#0D6B5B" /><View className="ml-3 flex-1"><Text className="font-bold text-foreground">Ajouter ma position GPS</Text><Text className="mt-1 text-xs leading-4 text-muted">Facultatif · uniquement pour aider l’orientation et le suivi autorisé.</Text></View></View><Pressable onPress={() => { void captureLocation(); }} style={({ pressed }) => ({ marginTop: 12, alignItems: "center", borderRadius: 12, borderWidth: 1, borderColor: "#0D6B5B", paddingVertical: 10, opacity: pressed ? 0.7 : 1 })}><Text className="text-sm font-bold text-primary">{coordinates ? "Position ajoutée" : "Utiliser ma position actuelle"}</Text></Pressable>{locationError ? <Text className="mt-2 text-xs text-error">{locationError}</Text> : null}{coordinates ? <Text className="mt-2 text-xs text-muted">Position enregistrée avec une précision d’environ {coordinates.accuracy ? `${Math.round(coordinates.accuracy)} m` : "inconnue"}.</Text> : null}</View>

        <Pressable
          className="flex-row items-center justify-center"
          style={({ pressed }) => ({ marginTop: 32, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: description.trim() && zone.trim() ? "#0D6B5B" : "#E4E8E3", paddingHorizontal: 16, paddingVertical: 16, opacity: pressed ? 0.82 : 1 })}
          disabled={!description.trim() || !zone.trim()}
          onPress={submitRequest}
        >
          <Text className="font-bold text-white">{createRequest.isPending ? "Envoi..." : isAuthenticated ? "Envoyer ma demande" : "Se connecter pour continuer"}</Text>
          <Ionicons name="arrow-forward" size={19} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </Pressable>
        {createRequest.error ? <Text className="mt-3 text-center text-xs text-error">Impossible d’envoyer la demande. Vérifiez votre connexion puis réessayez.</Text> : null}
        <Text className="mt-3 text-center text-xs text-muted">La demande sera confirmée après vérification des détails.</Text>
      </ScrollView>
    </ScreenContainer>
  );
}
