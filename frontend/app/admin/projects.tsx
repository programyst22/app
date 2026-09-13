import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api";
import { Eyebrow, H1, H3, Small, Caption, Badge, Card, Progress, Button, Input, Loading, ChipRow, Empty, useToast } from "@/src/components/ui";
import { Sheet, Select } from "@/src/components/forms";
import { makeStyles, space } from "@/src/theme";

const useStyles = makeStyles((c) => ({ screen: { flex: 1, backgroundColor: c.surface } }));

export default function AdminProjects() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("Aktiv");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", customer_id: "", address: "", description: "", category: "", start_date: "", planned_finish: "", budget: "" });
  const { data, isLoading } = useQuery({ queryKey: ["projects"], queryFn: () => api("/projects") });
  const { data: customers } = useQuery({ queryKey: ["customers"], queryFn: () => api("/customers") });
  const { data: meta } = useQuery({ queryKey: ["meta"], queryFn: () => api("/meta") });
  const create = useMutation({ mutationFn: () => api("/projects", { method: "POST", json: { ...f, start_date: f.start_date || null, planned_finish: f.planned_finish || null, budget: f.budget || null } }), onSuccess: (p) => { qc.invalidateQueries({ queryKey: ["projects"] }); setOpen(false); router.push(`/admin/project/${p.id}`); }, onError: (e: any) => toast.show(e.message, "error") });
  const list = (data || []).filter((p: any) => filter === "Alle" || (filter === "Aktiv" ? p.status === "ACTIVE" : p.status !== "ACTIVE"));
  const custLabels = Object.fromEntries((customers || []).map((c: any) => [c.id, `${c.name} · ${c.email}`]));
  return (
    <View style={s.screen}>
      <View style={{ paddingTop: insets.top + space.lg, paddingHorizontal: space.xl, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: space.sm }}>
        <View><Eyebrow>Projekte</Eyebrow><H1>{list.length} Projekte</H1></View>
        <Button title="Neu" small icon="add" onPress={() => setOpen(true)} testID="project-new" />
      </View>
      <ChipRow items={["Aktiv", "Abgeschlossen", "Alle"]} value={filter} onChange={setFilter} testID="project-filter" />
      {isLoading ? <Loading /> : (
        <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.md, paddingBottom: space.xxl }} testID="admin-projects">
          {!list.length ? <Empty icon="business-outline" title="Keine Projekte" text="Wandeln Sie eine Anfrage um oder legen Sie ein Projekt an." /> : list.map((p: any, i: number) => (
            <Card key={p.id} index={i} onPress={() => router.push(`/admin/project/${p.id}`)} style={{ gap: space.sm }} testID={`admin-project-${p.id}`}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Caption>{p.number} · {p.customer_name}</Caption><Badge label={p.stage} /></View>
              <H3>{p.name}</H3>
              <Small numberOfLines={1}>{p.address}</Small>
              <Progress value={p.progress} />
              <View style={{ flexDirection: "row", gap: space.md }}><Caption>{p.progress}%</Caption>{p.has_3d_model ? <Caption>· 3D-Modell</Caption> : null}<Caption>· PL {p.project_manager ? p.project_manager.first_name : "–"}</Caption></View>
            </Card>
          ))}
        </ScrollView>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title="Neues Projekt" testID="project-create-sheet">
        <Input label="Projektname" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} testID="np-name" />
        <Select label="Kunde" value={f.customer_id || null} options={(customers || []).map((c: any) => c.id)} labels={custLabels} onChange={(v) => setF({ ...f, customer_id: v })} testID="np-customer" />
        <Select label="Kategorie" value={f.category || null} options={(meta?.services || []).map((x: any) => x.title)} onChange={(v) => setF({ ...f, category: v })} testID="np-category" />
        <Input label="Adresse" value={f.address} onChangeText={(v) => setF({ ...f, address: v })} testID="np-address" />
        <Input label="Beschreibung" value={f.description} onChangeText={(v) => setF({ ...f, description: v })} multiline testID="np-desc" />
        <View style={{ flexDirection: "row", gap: space.md }}>
          <View style={{ flex: 1 }}><Input label="Start (JJJJ-MM-TT)" value={f.start_date} onChangeText={(v) => setF({ ...f, start_date: v })} testID="np-start" /></View>
          <View style={{ flex: 1 }}><Input label="Geplantes Ende" value={f.planned_finish} onChangeText={(v) => setF({ ...f, planned_finish: v })} testID="np-end" /></View>
        </View>
        <Input label="Budget (optional)" value={f.budget} onChangeText={(v) => setF({ ...f, budget: v })} testID="np-budget" />
        <Button title="Projekt anlegen" onPress={() => create.mutate()} loading={create.isPending} disabled={!f.name || !f.customer_id} testID="np-submit" />
        {!customers?.length ? <Caption>Noch keine Kunden – legen Sie zuerst unter „Mehr → Kunden“ einen Kunden an oder wandeln Sie eine Anfrage um.</Caption> : null}
      </Sheet>
    </View>
  );
}
