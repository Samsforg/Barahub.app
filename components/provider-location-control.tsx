import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { trpc } from "@/lib/trpc";

export function ProviderLocationControl({ requestId, status }: { requestId: number; status: string }) {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastPosition = useRef<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const updateLocation = trpc.provider.location.update.useMutation();
  const updateLocationRef = useRef(updateLocation);
  const canShare = status === "SCHEDULED" || status === "IN_PROGRESS";

  const sendCurrentPosition = async (sharingStatus: "shared" | "paused") => {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const current = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy ?? undefined };
    lastPosition.current = current;
    await updateLocation.mutateAsync({ requestId, ...current, sharingStatus });
  };

  const stopSharing = async () => {
    if (interval.current) clearInterval(interval.current);
    interval.current = null;
    if (lastPosition.current) {
      try {
        await updateLocationRef.current.mutateAsync({ requestId, ...lastPosition.current, sharingStatus: "paused" });
      } catch {
        setError("Le partage sera arrêté dès que la connexion sera rétablie.");
      }
    }
    setSharing(false);
  };

  const startSharing = async () => {
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setError("Autorisation GPS refusée. Le partage reste facultatif.");
        return;
      }
      await sendCurrentPosition("shared");
      setSharing(true);
      interval.current = setInterval(() => { void sendCurrentPosition("shared").catch(() => setError("Mise à jour GPS interrompue. Vous pouvez réessayer.")); }, 30_000);
    } catch {
      setError("Position indisponible pour le moment. Vérifiez le GPS et réessayez.");
    }
  };

  useEffect(() => { updateLocationRef.current = updateLocation; }, [updateLocation]);

  useEffect(() => {
    if (canShare || !lastPosition.current) return;
    if (interval.current) clearInterval(interval.current);
    interval.current = null;
    void updateLocationRef.current.mutateAsync({ requestId, ...lastPosition.current, sharingStatus: "paused" }).catch(() => undefined);
    setSharing(false);
  }, [canShare, requestId]);

  useEffect(() => () => {
    if (interval.current) clearInterval(interval.current);
    if (lastPosition.current) void updateLocationRef.current.mutateAsync({ requestId, ...lastPosition.current, sharingStatus: "paused" }).catch(() => undefined);
  }, [requestId]);

  if (!canShare) return null;

  return <View className="mt-3 rounded-2xl bg-sand/70 p-3"><View className="flex-row items-center justify-between"><View className="flex-1"><Text className="font-bold text-foreground">Suivi de trajet</Text><Text className="mt-1 text-xs leading-4 text-muted">Partagez votre position uniquement pendant cette mission active. Mise à jour toutes les 30 secondes.</Text></View><View className={`ml-3 h-3 w-3 rounded-full ${sharing ? "bg-primary" : "bg-border"}`} /></View>{error ? <Text className="mt-2 text-xs text-error">{error}</Text> : null}<Pressable disabled={updateLocation.isPending} onPress={sharing ? () => { void stopSharing(); } : () => { void startSharing(); }} style={({ pressed }) => ({ marginTop: 10, alignItems: "center", borderRadius: 12, backgroundColor: sharing ? "#FFFFFF" : "#0D6B5B", borderWidth: sharing ? 1 : 0, borderColor: "#D9DEDA", paddingVertical: 10, opacity: pressed ? 0.75 : 1 })}>{updateLocation.isPending ? <ActivityIndicator color={sharing ? "#0D6B5B" : "#FFFFFF"} /> : <Text className={`text-sm font-bold ${sharing ? "text-foreground" : "text-white"}`}>{sharing ? "Arrêter le partage" : "Partager ma position"}</Text>}</Pressable></View>;
}
