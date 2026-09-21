import React, { useState } from "react";
import { View, ScrollView, Pressable, Text, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowUpRight01Icon, Add01Icon } from "@hugeicons/core-free-icons";
import { api } from "@/src/api";
import { Badge, Progress, Button, Input, Loading, Empty, useToast } from "@/src/components/ui";
import { Sheet, Select } from "@/src/components/forms";
import { StrokeIcon } from "@/src/components/premium";
import { fonts, makeStyles, useTheme } from "@/src/theme";

const FILTERS = ["Aktiv", "Abgeschlossen", "Alle"] as const;

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  shell: { width: "100%", maxWidth: 1260, alignSelf: "center" },
  overline: {
    fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.4,
    color: c.onSurface, textTransform: "uppercase",
  },
  heading: { fontFamily: fonts.medium, color: c.onSurface, letterSpacing: -1.4 },
  body: { fontFamily: fonts.regular, color: c.muted, fontSize: 14, lineHeight: 21 },
  card: {
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1, borderColor: c.border,
    borderRadius: 20, padding: 22, gap: 12,
  },
  title: {
    fontFamily: fonts.semibold, fontSize: 20,
    lineHeight: 26, color: c.onSurface,
  },
  filter: {
    minHeight: 42, borderRadius: 999, paddingHorizontal: 18,
    borderWidth: 1, borderColor: c.border,
    alignItems: "center", justifyContent: "center",
  },
}));

export default function AdminProjects() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { width } = useWindowDimensions();

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Aktiv");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    name: "", customer_id: "", address: "", description: "", category: "",
    start_date: "", planned_finish: "", budget: "",
  });

  const { data, isLoading } = useQuery({ queryKey: ["projects"], queryFn: () => api("/projects") });
  const { data: customers } = useQuery({ queryKey: ["customers"], queryFn: () => api("/customers") });
  const { data: meta } = useQuery({ queryKey: ["meta"], queryFn: () => api("/meta") });

  const create = useMutation({
    mutationFn: () =>
      api("/projects", {
        method: "POST",
        json: {
          ...f,
          start_date: f.start_date || null,
          planned_finish: f.planned_finish || null,
          budget: f.budget || null,
        },
      }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
      router.push(`/admin/project/${p.id}`);
    },
    onError: (e: any) => toast.show(e.message, "error"),
  });

  const list = (data || []).filter((p: any) =>
    filter === "Alle" || (filter === "Aktiv" ? p.status === "ACTIVE" : p.status !== "ACTIVE")
  );
  const custLabels = Object.fromEntries((customers || []).map((c: any) => [c.id, `${c.name} · ${c.email}`]));

  const pagePad = width < 700 ? 20 : 36;
  const headingSize = width < 700 ? 38 : 52;

  return (
    <View style={s.screen}>
      <View style={{ paddingTop: insets.top + 30, paddingHorizontal: pagePad, paddingBottom: 18 }}>
        <View style={s.shell}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 18 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.overline}>PROJEKTE</Text>
              <Text style={[s.heading, { fontSize: headingSize, lineHeight: headingSize * 1.08, marginTop: 8 }]}>
                {list.length} Projekte.
              </Text>
            </View>
            <Pressable
              onPress={() => setOpen(true)}
              testID="project-new"
              style={{
                minHeight: 46, borderRadius: 999, backgroundColor: colors.surfaceInverse,
                paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 9,
              }}
            >
              <StrokeIcon icon={Add01Icon} size={18} color="#fff" />
              <Text style={{ fontFamily: fonts.semibold, color: "#fff", fontSize: 14 }}>Neu</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9, paddingTop: 22 }}>
            {FILTERS.map((it) => (
              <Pressable
                key={it}
                onPress={() => setFilter(it)}
                testID={`project-filter-${it}`}
                style={[
                  s.filter,
                  filter === it && { backgroundColor: colors.surfaceInverse, borderColor: colors.surfaceInverse },
                ]}
              >
                <Text
                  style={{
                    fontFamily: fonts.semibold,
                    fontSize: 13,
                    color: filter === it ? "#fff" : colors.onSurface,
                  }}
                >
                  {it}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      {isLoading ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: pagePad, paddingBottom: 70 }} testID="admin-projects">
          <View style={[s.shell, { gap: 14 }]}>
            {!list.length ? (
              <View style={s.card}>
                <Empty title="Keine Projekte" text="Wandeln Sie eine Anfrage um oder legen Sie ein Projekt an." />
              </View>
            ) : (
              list.map((p: any) => (
                <Pressable
                  key={p.id}
                  onPress={() => router.push(`/admin/project/${p.id}`)}
                  style={s.card}
                  testID={`admin-project-${p.id}`}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <Text style={[s.body, { fontSize: 12, letterSpacing: 0.7 }]}>
                      {p.number} · {p.customer_name}
                    </Text>
                    <Badge label={p.stage} />
                  </View>
                  <Text style={s.title}>{p.name}</Text>
                  <Text style={s.body} numberOfLines={1}>{p.address}</Text>
                  <Progress value={p.progress} />
                  <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <Text style={s.body}>
                      {p.progress}% · {p.has_3d_model ? "3D-Modell · " : ""}PL {p.project_manager ? p.project_manager.first_name : "–"}
                    </Text>
                    <StrokeIcon icon={ArrowUpRight01Icon} size={20} color={colors.onSurface} />
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Neues Projekt" testID="project-create-sheet">
        <Input label="Projektname" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} testID="np-name" />
        <Select
          label="Kunde"
          value={f.customer_id || null}
          options={(customers || []).map((c: any) => c.id)}
          labels={custLabels}
          onChange={(v) => setF({ ...f, customer_id: v })}
          testID="np-customer"
        />
        <Select
          label="Kategorie"
          value={f.category || null}
          options={(meta?.services || []).map((x: any) => x.title)}
          onChange={(v) => setF({ ...f, category: v })}
          testID="np-category"
        />
        <Input label="Adresse" value={f.address} onChangeText={(v) => setF({ ...f, address: v })} testID="np-address" />
        <Input label="Beschreibung" value={f.description} onChangeText={(v) => setF({ ...f, description: v })} multiline testID="np-desc" />
        <View style={{ flexDirection: width < 560 ? "column" : "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Input label="Start (JJJJ-MM-TT)" value={f.start_date} onChangeText={(v) => setF({ ...f, start_date: v })} testID="np-start" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Geplantes Ende" value={f.planned_finish} onChangeText={(v) => setF({ ...f, planned_finish: v })} testID="np-end" />
          </View>
        </View>
        <Input label="Budget (optional)" value={f.budget} onChangeText={(v) => setF({ ...f, budget: v })} testID="np-budget" />
        <Button
          title="Projekt anlegen"
          onPress={() => create.mutate()}
          loading={create.isPending}
          disabled={!f.name || !f.customer_id}
          testID="np-submit"
        />
        {!customers?.length ? (
          <Text style={s.body}>
            Noch keine Kunden – legen Sie zuerst unter „Mehr → Kunden“ einen Kunden an oder wandeln Sie eine Anfrage um.
          </Text>
        ) : null}
      </Sheet>
    </View>
  );
}
