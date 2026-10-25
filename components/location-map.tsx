import { Text, View } from "react-native";

type Point = { latitude: number; longitude: number };

type LocationMapProps = {
  customer: Point;
  provider?: Point | null;
  providerAccuracy?: number | null;
  providerUpdatedAt?: Date | string | null;
};

const bounds = { minLatitude: 5.25, maxLatitude: 5.47, minLongitude: -4.25, maxLongitude: -3.75 };

function markerPosition(point: Point) {
  const left = Math.min(92, Math.max(8, ((point.longitude - bounds.minLongitude) / (bounds.maxLongitude - bounds.minLongitude)) * 100));
  const top = Math.min(88, Math.max(8, (1 - (point.latitude - bounds.minLatitude) / (bounds.maxLatitude - bounds.minLatitude)) * 100));
  return { left: `${left}%`, top: `${top}%` } as const;
}

export function LocationMap({ customer, provider, providerAccuracy, providerUpdatedAt }: LocationMapProps) {
  return (
    <View className="overflow-hidden rounded-3xl border border-border bg-[#E5EFE6]">
      <View className="relative h-52 overflow-hidden bg-[#E8F0E6]">
        <View className="absolute -left-10 top-16 h-3 w-[120%] rotate-[18deg] bg-[#D2E2D0]" />
        <View className="absolute -left-10 top-32 h-2 w-[120%] -rotate-[12deg] bg-[#D2E2D0]" />
        <View className="absolute left-20 -top-8 h-[130%] w-2 rotate-[28deg] bg-[#D2E2D0]" />
        <View className="absolute right-20 -top-8 h-[130%] w-1 rotate-[74deg] bg-[#D2E2D0]" />
        <View className="absolute left-3 top-3 rounded-full bg-white/80 px-3 py-1"><Text className="text-[10px] font-bold uppercase tracking-widest text-primary">Abidjan · carte pilote</Text></View>
        <View className="absolute bottom-3 left-3 rounded-2xl bg-white/90 px-3 py-2"><Text className="text-xs font-bold text-foreground">Votre adresse</Text><Text className="text-[10px] text-muted">Position partagée pour cette demande</Text></View>
        <View className="absolute items-center" style={markerPosition(customer)}><View className="h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#C75B3D] shadow"><View className="h-2.5 w-2.5 rounded-full bg-white" /></View></View>
        {provider ? <View className="absolute items-center" style={markerPosition(provider)}><View className="h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-primary shadow"><Text className="text-base text-white">●</Text></View><View className="mt-1 rounded-full bg-primary px-2 py-0.5"><Text className="text-[9px] font-bold text-white">Prestataire</Text></View></View> : null}
      </View>
      <View className="border-t border-border bg-surface px-4 py-3"><View className="flex-row items-center justify-between"><View className="flex-row items-center"><View className="h-2.5 w-2.5 rounded-full bg-[#C75B3D]" /><Text className="ml-2 text-xs text-muted">Votre position</Text><View className="ml-4 h-2.5 w-2.5 rounded-full bg-primary" /><Text className="ml-2 text-xs text-muted">Prestataire</Text></View><Text className="text-[10px] text-muted">{provider ? `Mis à jour ${providerUpdatedAt ? new Date(providerUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "à l’instant"}` : "En attente"}</Text></View><Text className="mt-2 text-[10px] leading-4 text-muted">Repère schématique, pas une navigation routière.{provider && providerAccuracy ? ` Précision estimée : ${Math.round(providerAccuracy)} m.` : ""}</Text></View>
    </View>
  );
}
