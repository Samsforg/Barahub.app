import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { trpc } from "@/lib/trpc";

type Section = "categories" | "services" | "zones";

const emptyCategory = { id: undefined as number | undefined, name: "", description: "", active: true, sortOrder: 0 };
const emptyZone = { id: undefined as number | undefined, commune: "", quartier: "", active: true };
const emptyService = {
  id: undefined as number | undefined,
  categoryId: 0,
  name: "",
  description: "",
  pricingMode: "quote" as "fixed" | "quote",
  fixedPriceXof: "",
  diagnosticRequired: false,
  durationMinutes: "",
  travelTerms: "",
  excludedSupplies: "",
  safetyNotes: "",
  active: true,
  sortOrder: 0,
};

export function AdminCatalogPanel() {
  const categoriesQuery = trpc.admin.categories.useQuery();
  const servicesQuery = trpc.admin.services.useQuery();
  const zonesQuery = trpc.admin.zones.useQuery();
  const utils = trpc.useUtils();
  const [section, setSection] = useState<Section>("categories");
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [zoneForm, setZoneForm] = useState(emptyZone);
  const [serviceForm, setServiceForm] = useState(emptyService);
  const invalidate = () => {
    void utils.admin.categories.invalidate();
    void utils.admin.services.invalidate();
    void utils.admin.zones.invalidate();
    void utils.catalog.list.invalidate();
    void utils.catalog.zones.invalidate();
  };
  const saveCategory = trpc.admin.saveCategory.useMutation({ onSuccess: () => { invalidate(); setCategoryForm(emptyCategory); } });
  const saveService = trpc.admin.saveService.useMutation({ onSuccess: () => { invalidate(); setServiceForm(emptyService); } });
  const saveZone = trpc.admin.saveZone.useMutation({ onSuccess: () => { invalidate(); setZoneForm(emptyZone); } });

  const loading = categoriesQuery.isLoading || servicesQuery.isLoading || zonesQuery.isLoading;
  const error = categoriesQuery.error || servicesQuery.error || zonesQuery.error;
  if (loading) return <View className="items-center rounded-3xl border border-border bg-surface p-8"><ActivityIndicator color="#0D6B5B" /><Text className="mt-3 text-sm text-muted">Chargement du catalogue…</Text></View>;
  if (error) return <View className="rounded-3xl border border-coral/30 bg-coral/10 p-5"><Text className="font-bold text-foreground">Catalogue indisponible</Text><Text className="mt-1 text-sm leading-5 text-muted">Les catégories, prestations et zones n’ont pas pu être chargées.</Text><Pressable onPress={() => { void categoriesQuery.refetch(); void servicesQuery.refetch(); void zonesQuery.refetch(); }} className="mt-4 self-start rounded-2xl bg-primary px-4 py-3"><Text className="font-bold text-white">Réessayer</Text></Pressable></View>;

  const categories = categoriesQuery.data ?? [];
  const services = servicesQuery.data ?? [];
  const zones = zonesQuery.data ?? [];
  const submitCategory = () => saveCategory.mutate({ id: categoryForm.id, name: categoryForm.name, description: categoryForm.description || undefined, active: categoryForm.active, sortOrder: categoryForm.sortOrder });
  const submitZone = () => saveZone.mutate({ id: zoneForm.id, commune: zoneForm.commune, quartier: zoneForm.quartier, active: zoneForm.active });
  const submitService = () => saveService.mutate({
    id: serviceForm.id,
    categoryId: serviceForm.categoryId,
    name: serviceForm.name,
    description: serviceForm.description,
    pricingMode: serviceForm.pricingMode,
    fixedPriceXof: serviceForm.pricingMode === "fixed" && serviceForm.fixedPriceXof ? Number(serviceForm.fixedPriceXof) : undefined,
    diagnosticRequired: serviceForm.diagnosticRequired,
    durationMinutes: serviceForm.durationMinutes ? Number(serviceForm.durationMinutes) : undefined,
    travelTerms: serviceForm.travelTerms || undefined,
    excludedSupplies: serviceForm.excludedSupplies || undefined,
    safetyNotes: serviceForm.safetyNotes || undefined,
    active: serviceForm.active,
    sortOrder: serviceForm.sortOrder,
  });

  const editService = (row: (typeof services)[number]) => {
    setServiceForm({
      id: row.service.id,
      categoryId: row.service.categoryId,
      name: row.service.name,
      description: row.service.description,
      pricingMode: row.service.pricingMode,
      fixedPriceXof: row.service.fixedPriceXof ? String(Number(row.service.fixedPriceXof)) : "",
      diagnosticRequired: row.service.diagnosticRequired,
      durationMinutes: row.service.durationMinutes ? String(row.service.durationMinutes) : "",
      travelTerms: row.service.travelTerms ?? "",
      excludedSupplies: row.service.excludedSupplies ?? "",
      safetyNotes: row.service.safetyNotes ?? "",
      active: row.service.active,
      sortOrder: row.service.sortOrder,
    });
  };

  return <View className="gap-4">
    <View className="flex-row rounded-2xl bg-sand p-1">{(["categories", "services", "zones"] as const).map((value) => <Pressable key={value} onPress={() => setSection(value)} style={{ flex: 1, borderRadius: 14, backgroundColor: section === value ? "#FFFFFF" : "transparent", paddingVertical: 11, alignItems: "center" }}><Text className={`text-xs font-bold ${section === value ? "text-primary" : "text-muted"}`}>{value === "categories" ? "Catégories" : value === "services" ? "Prestations" : "Zones"}</Text></Pressable>)}</View>

    {section === "categories" ? <View className="gap-4">
      <View className="rounded-3xl border border-border bg-surface p-4">
        <Text className="text-lg font-bold text-foreground">{categoryForm.id ? "Modifier la catégorie" : "Nouvelle catégorie"}</Text>
        <TextInput value={categoryForm.name} onChangeText={(name) => setCategoryForm((current) => ({ ...current, name }))} placeholder="Nom" placeholderTextColor="#87938F" className="mt-3 rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground" />
        <TextInput value={categoryForm.description} onChangeText={(description) => setCategoryForm((current) => ({ ...current, description }))} placeholder="Description (facultatif)" placeholderTextColor="#87938F" multiline className="mt-2 min-h-16 rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground" />
        <View className="mt-3 flex-row items-center gap-2">
          <Pressable onPress={() => setCategoryForm((current) => ({ ...current, active: !current.active }))} className={`rounded-full px-3 py-2 ${categoryForm.active ? "bg-primary/10" : "bg-sand"}`}><Text className={`text-xs font-bold ${categoryForm.active ? "text-primary" : "text-muted"}`}>{categoryForm.active ? "Active" : "Inactive"}</Text></Pressable>
          <TextInput value={String(categoryForm.sortOrder)} onChangeText={(value) => setCategoryForm((current) => ({ ...current, sortOrder: Number(value.replace(/[^0-9]/g, "")) || 0 }))} keyboardType="number-pad" placeholder="Ordre" placeholderTextColor="#87938F" className="flex-1 rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-foreground" />
        </View>
        <View className="mt-3 flex-row gap-2">
          <Pressable disabled={saveCategory.isPending || categoryForm.name.trim().length < 2} onPress={submitCategory} className="flex-1 items-center rounded-2xl bg-primary py-3"><Text className="text-sm font-bold text-white">{saveCategory.isPending ? "Enregistrement…" : "Enregistrer"}</Text></Pressable>
          {categoryForm.id ? <Pressable onPress={() => setCategoryForm(emptyCategory)} className="items-center rounded-2xl border border-border px-4 py-3"><Text className="text-sm font-bold text-foreground">Annuler</Text></Pressable> : null}
        </View>
        {saveCategory.error ? <Text className="mt-2 text-sm text-error">La catégorie n’a pas pu être enregistrée. Vérifiez le slug et les champs.</Text> : null}
      </View>
      {categories.map((category) => <View key={category.id} className="rounded-3xl border border-border bg-surface p-4">
        <View className="flex-row items-center justify-between"><Text className="font-bold text-foreground">{category.name}</Text><Text className={`text-xs font-bold ${category.active ? "text-primary" : "text-muted"}`}>{category.active ? "Active" : "Inactive"}</Text></View>
        {category.description ? <Text className="mt-1 text-sm leading-5 text-muted">{category.description}</Text> : null}
        <Text className="mt-1 text-xs text-muted">{category.serviceCount} prestation(s) · ordre {category.sortOrder}</Text>
        <View className="mt-3 flex-row gap-2">
          <Pressable onPress={() => setCategoryForm({ id: category.id, name: category.name, description: category.description ?? "", active: category.active, sortOrder: category.sortOrder })} className="flex-1 items-center rounded-2xl border border-border py-2"><Text className="text-xs font-bold text-foreground">Modifier</Text></Pressable>
          <Pressable onPress={() => saveCategory.mutate({ id: category.id, name: category.name, description: category.description ?? undefined, active: !category.active, sortOrder: category.sortOrder })} className="flex-1 items-center rounded-2xl border border-border py-2"><Text className="text-xs font-bold text-foreground">{category.active ? "Désactiver" : "Activer"}</Text></Pressable>
        </View>
      </View>)}
    </View> : null}

    {section === "services" ? <View className="gap-4">
      <View className="rounded-3xl border border-border bg-surface p-4">
        <Text className="text-lg font-bold text-foreground">{serviceForm.id ? "Modifier la prestation" : "Nouvelle prestation"}</Text>
        <Text className="mt-1 text-xs text-muted">Un diagnostic obligatoire ne peut pas être proposé à prix fixe.</Text>
        <TextInput value={serviceForm.name} onChangeText={(name) => setServiceForm((current) => ({ ...current, name }))} placeholder="Nom de la prestation" placeholderTextColor="#87938F" className="mt-3 rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground" />
        <TextInput value={serviceForm.description} onChangeText={(description) => setServiceForm((current) => ({ ...current, description }))} placeholder="Description détaillée" placeholderTextColor="#87938F" multiline className="mt-2 min-h-20 rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground" />
        <Text className="mt-3 text-xs font-bold text-foreground">Catégorie</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>{categories.map((category) => <Pressable key={category.id} onPress={() => setServiceForm((current) => ({ ...current, categoryId: category.id }))} style={{ borderRadius: 12, borderWidth: 1, borderColor: serviceForm.categoryId === category.id ? "#0D6B5B" : "#D9DEDA", backgroundColor: serviceForm.categoryId === category.id ? "#0D6B5B" : "#FFFFFF", paddingHorizontal: 12, paddingVertical: 8 }}><Text className={`text-xs font-bold ${serviceForm.categoryId === category.id ? "text-white" : "text-foreground"}`}>{category.name}</Text></Pressable>)}</ScrollView>
        <View className="mt-2 flex-row gap-2">
          <Pressable onPress={() => setServiceForm((current) => ({ ...current, pricingMode: "quote", fixedPriceXof: "" }))} className={`flex-1 items-center rounded-2xl border py-2 ${serviceForm.pricingMode === "quote" ? "border-primary bg-primary/10" : "border-border"}`}><Text className="text-xs font-bold text-foreground">Sur devis</Text></Pressable>
          <Pressable disabled={serviceForm.diagnosticRequired} onPress={() => setServiceForm((current) => ({ ...current, pricingMode: "fixed" }))} className={`flex-1 items-center rounded-2xl border py-2 ${serviceForm.pricingMode === "fixed" ? "border-primary bg-primary/10" : "border-border"}`}><Text className="text-xs font-bold text-foreground">Prix fixe</Text></Pressable>
        </View>
        {serviceForm.pricingMode === "fixed" ? <TextInput value={serviceForm.fixedPriceXof} onChangeText={(fixedPriceXof) => setServiceForm((current) => ({ ...current, fixedPriceXof: fixedPriceXof.replace(/[^0-9]/g, "") }))} keyboardType="number-pad" placeholder="Prix fixe en FCFA" placeholderTextColor="#87938F" className="mt-2 rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground" /> : null}
        <View className="mt-3 flex-row flex-wrap gap-2">
          <Pressable onPress={() => setServiceForm((current) => ({ ...current, diagnosticRequired: !current.diagnosticRequired, pricingMode: !current.diagnosticRequired ? "quote" : current.pricingMode }))} className={`rounded-full px-3 py-2 ${serviceForm.diagnosticRequired ? "bg-primary/10" : "bg-sand"}`}><Text className={`text-xs font-bold ${serviceForm.diagnosticRequired ? "text-primary" : "text-muted"}`}>Diagnostic obligatoire</Text></Pressable>
          <Pressable onPress={() => setServiceForm((current) => ({ ...current, active: !current.active }))} className={`rounded-full px-3 py-2 ${serviceForm.active ? "bg-primary/10" : "bg-sand"}`}><Text className={`text-xs font-bold ${serviceForm.active ? "text-primary" : "text-muted"}`}>{serviceForm.active ? "Active" : "Inactive"}</Text></Pressable>
        </View>
        <TextInput value={serviceForm.durationMinutes} onChangeText={(durationMinutes) => setServiceForm((current) => ({ ...current, durationMinutes: durationMinutes.replace(/[^0-9]/g, "") }))} keyboardType="number-pad" placeholder="Durée indicative (minutes, facultatif)" placeholderTextColor="#87938F" className="mt-2 rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground" />
        <TextInput value={serviceForm.travelTerms} onChangeText={(travelTerms) => setServiceForm((current) => ({ ...current, travelTerms }))} placeholder="Conditions de déplacement (facultatif)" placeholderTextColor="#87938F" multiline className="mt-2 min-h-12 rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground" />
        <TextInput value={serviceForm.excludedSupplies} onChangeText={(excludedSupplies) => setServiceForm((current) => ({ ...current, excludedSupplies }))} placeholder="Fournitures exclues (facultatif)" placeholderTextColor="#87938F" multiline className="mt-2 min-h-12 rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground" />
        <TextInput value={serviceForm.safetyNotes} onChangeText={(safetyNotes) => setServiceForm((current) => ({ ...current, safetyNotes }))} placeholder="Consignes de sécurité (facultatif)" placeholderTextColor="#87938F" multiline className="mt-2 min-h-12 rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground" />
        <View className="mt-3 flex-row gap-2">
          <Pressable disabled={saveService.isPending || !serviceForm.categoryId || serviceForm.name.trim().length < 2 || serviceForm.description.trim().length < 10} onPress={submitService} className="flex-1 items-center rounded-2xl bg-primary py-3"><Text className="text-sm font-bold text-white">{saveService.isPending ? "Enregistrement…" : "Enregistrer"}</Text></Pressable>
          {serviceForm.id ? <Pressable onPress={() => setServiceForm(emptyService)} className="items-center rounded-2xl border border-border px-4 py-3"><Text className="text-sm font-bold text-foreground">Annuler</Text></Pressable> : null}
        </View>
        {saveService.error ? <Text className="mt-2 text-sm text-error">La prestation n’a pas pu être enregistrée. Vérifiez la catégorie, le prix et le diagnostic.</Text> : null}
      </View>
      {services.map((row) => <View key={row.service.id} className="rounded-3xl border border-border bg-surface p-4">
        <View className="flex-row items-center justify-between"><Text className="flex-1 font-bold text-foreground">{row.service.name}</Text><Text className={`text-xs font-bold ${row.service.active ? "text-primary" : "text-muted"}`}>{row.service.active ? "Active" : "Inactive"}</Text></View>
        <Text className="mt-1 text-xs text-muted">{row.categoryName} · {row.service.pricingMode === "fixed" ? `${Number(row.service.fixedPriceXof).toLocaleString("fr-FR")} FCFA` : "Sur devis"} · {row.service.diagnosticRequired ? "Diagnostic obligatoire" : "Sans diagnostic obligatoire"}</Text>
        <View className="mt-3 flex-row gap-2">
          <Pressable onPress={() => editService(row)} className="flex-1 items-center rounded-2xl border border-border py-2"><Text className="text-xs font-bold text-foreground">Modifier</Text></Pressable>
          <Pressable onPress={() => saveService.mutate({ id: row.service.id, categoryId: row.service.categoryId, name: row.service.name, description: row.service.description, pricingMode: row.service.pricingMode, fixedPriceXof: row.service.fixedPriceXof ? Number(row.service.fixedPriceXof) : undefined, diagnosticRequired: row.service.diagnosticRequired, durationMinutes: row.service.durationMinutes ?? undefined, travelTerms: row.service.travelTerms ?? undefined, excludedSupplies: row.service.excludedSupplies ?? undefined, safetyNotes: row.service.safetyNotes ?? undefined, active: !row.service.active, sortOrder: row.service.sortOrder })} className="flex-1 items-center rounded-2xl border border-border py-2"><Text className="text-xs font-bold text-foreground">{row.service.active ? "Désactiver" : "Activer"}</Text></Pressable>
        </View>
      </View>)}
    </View> : null}

    {section === "zones" ? <View className="gap-4">
      <View className="rounded-3xl border border-border bg-surface p-4">
        <Text className="text-lg font-bold text-foreground">{zoneForm.id ? "Modifier la zone" : "Nouvelle zone"}</Text>
        <TextInput value={zoneForm.commune} onChangeText={(commune) => setZoneForm((current) => ({ ...current, commune }))} placeholder="Commune" placeholderTextColor="#87938F" className="mt-3 rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground" />
        <TextInput value={zoneForm.quartier} onChangeText={(quartier) => setZoneForm((current) => ({ ...current, quartier }))} placeholder="Quartier" placeholderTextColor="#87938F" className="mt-2 rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground" />
        <Pressable onPress={() => setZoneForm((current) => ({ ...current, active: !current.active }))} className={`mt-3 self-start rounded-full px-3 py-2 ${zoneForm.active ? "bg-primary/10" : "bg-sand"}`}><Text className={`text-xs font-bold ${zoneForm.active ? "text-primary" : "text-muted"}`}>{zoneForm.active ? "Active" : "Inactive"}</Text></Pressable>
        <View className="mt-3 flex-row gap-2">
          <Pressable disabled={saveZone.isPending || zoneForm.commune.trim().length < 2 || zoneForm.quartier.trim().length < 2} onPress={submitZone} className="flex-1 items-center rounded-2xl bg-primary py-3"><Text className="text-sm font-bold text-white">{saveZone.isPending ? "Enregistrement…" : "Enregistrer"}</Text></Pressable>
          {zoneForm.id ? <Pressable onPress={() => setZoneForm(emptyZone)} className="items-center rounded-2xl border border-border px-4 py-3"><Text className="text-sm font-bold text-foreground">Annuler</Text></Pressable> : null}
        </View>
        {saveZone.error ? <Text className="mt-2 text-sm text-error">La zone n’a pas pu être enregistrée. Vérifiez qu’elle n’existe pas déjà.</Text> : null}
      </View>
      {zones.map((zone) => <View key={zone.id} className="rounded-3xl border border-border bg-surface p-4">
        <View className="flex-row items-center justify-between"><Text className="font-bold text-foreground">{zone.commune} · {zone.quartier}</Text><Text className={`text-xs font-bold ${zone.active ? "text-primary" : "text-muted"}`}>{zone.active ? "Active" : "Inactive"}</Text></View>
        <View className="mt-3 flex-row gap-2">
          <Pressable onPress={() => setZoneForm({ id: zone.id, commune: zone.commune, quartier: zone.quartier, active: zone.active })} className="flex-1 items-center rounded-2xl border border-border py-2"><Text className="text-xs font-bold text-foreground">Modifier</Text></Pressable>
          <Pressable onPress={() => saveZone.mutate({ id: zone.id, commune: zone.commune, quartier: zone.quartier, active: !zone.active })} className="flex-1 items-center rounded-2xl border border-border py-2"><Text className="text-xs font-bold text-foreground">{zone.active ? "Désactiver" : "Activer"}</Text></Pressable>
        </View>
      </View>)}
    </View> : null}
  </View>;
}
