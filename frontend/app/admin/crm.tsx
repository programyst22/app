import React, { useState } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from "react-native-reanimated";
import { api, fmtDate } from "@/src/api";
import { Eyebrow, H1, H3, Small, Caption, Loading, useToast, Badge } from "@/src/components/ui";
import { Sheet } from "@/src/components/forms";
import { makeStyles, useTheme, space, radius } from "@/src/theme";

const COLS = [["NEU", "Neue Anfrage"], ["KONTAKTIERT", "Kontaktiert"], ["BESICHTIGUNG", "Besichtigung"], ["ANGEBOT", "Angebot"], ["VERHANDLUNG", "Verhandlung"], ["GEWONNEN", "Gewonnen"], ["VERLOREN", "Verloren"]] as const;
const COL_W = 260;

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  col: { width: COL_W, backgroundColor: c.surfaceTertiary, borderRadius: radius.lg, padding: space.md, gap: space.sm },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: space.md, gap: 4, borderWidth: 1, borderColor: c.border },
  count: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: c.surfaceInverse, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  option: { paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: c.divider },
}));

function LeadCard({ lead, onOpen, onDrop, onMove, styles: s }: any) {
  const { colors } = useTheme();
  const tx = useSharedValue(0), ty = useSharedValue(0), active = useSharedValue(0);
  const pan = Gesture.Pan().activateAfterLongPress(220)
    .onStart(() => { active.value = 1; })
    .onUpdate((e) => { tx.value = e.translationX; ty.value = e.translationY; })
    .onEnd((e) => { const steps = Math.round(e.translationX / (COL_W + space.md)); if (steps !== 0) runOnJS(onDrop)(lead, steps); tx.value = withSpring(0); ty.value = withSpring(0); active.value = 0; });
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: active.value ? 1.04 : 1 }], zIndex: active.value ? 10 : 0, opacity: active.value ? 0.9 : 1 }));
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={st}>
        <Pressable style={s.card} onPress={() => onOpen(lead)} onLongPress={() => {}} testID={`lead-card-${lead.id}`}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Caption>{fmtDate(lead.created_at)}</Caption><Caption>{lead.source}</Caption></View>
          <H3 style={{ fontSize: 16 }}>{lead.name}</H3>
          <Small numberOfLines={1}>{lead.project_type}</Small>
          {lead.postal_code ? <Caption>{lead.postal_code} {lead.address}</Caption> : null}
          <Pressable onPress={() => onMove(lead)} hitSlop={6} testID={`lead-move-${lead.id}`}><Caption style={{ color: colors.brandPrimary, fontWeight: "600" }}>Verschieben →</Caption></Pressable>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

export default function CRM() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [moving, setMoving] = useState<any>(null);
  const { data, isLoading } = useQuery({ queryKey: ["leads"], queryFn: () => api("/leads"), refetchInterval: 15000 });
  const move = useMutation({
    mutationFn: ({ id, status }: any) => api(`/leads/${id}`, { method: "PATCH", json: { status } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); toast.show("Status aktualisiert", "success"); },
    onError: (e: any) => toast.show(e.message, "error"),
  });
  const onDrop = (lead: any, steps: number) => {
    const idx = COLS.findIndex((c) => c[0] === lead.status);
    const next = COLS[Math.max(0, Math.min(COLS.length - 1, idx + steps))][0];
    if (next !== lead.status) move.mutate({ id: lead.id, status: next });
  };
  return (
    <View style={s.screen}>
      <View style={{ paddingTop: insets.top + space.lg, paddingHorizontal: space.xl, gap: 4, paddingBottom: space.md }}>
        <Eyebrow>CRM</Eyebrow>
        <H1>Pipeline</H1>
        <Caption>Karte lange halten und horizontal ziehen oder „Verschieben“ tippen.</Caption>
      </View>
      {isLoading ? <Loading /> : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.md, paddingBottom: space.xl }} testID="kanban">
          {COLS.map(([key, label]) => {
            const items = (data || []).filter((l: any) => l.status === key);
            return (
              <View key={key} style={s.col} testID={`kanban-col-${key}`}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4 }}>
                  <Small style={{ fontWeight: "700" }}>{label}</Small>
                  <View style={s.count}><Caption style={{ color: "#FFFFFF", fontWeight: "700" }}>{items.length}</Caption></View>
                </View>
                <ScrollView contentContainerStyle={{ gap: space.sm }} showsVerticalScrollIndicator={false} style={{ maxHeight: 560 }}>
                  {items.map((l: any) => <LeadCard key={l.id} lead={l} styles={s} onOpen={(x: any) => router.push(`/admin/lead/${x.id}`)} onDrop={onDrop} onMove={setMoving} />)}
                  {!items.length ? <Caption style={{ padding: space.sm }}>Keine Einträge</Caption> : null}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      )}
      <Sheet open={!!moving} onClose={() => setMoving(null)} title={moving ? `${moving.name} verschieben` : ""} testID="move-sheet">
        {COLS.map(([key, label]) => (
          <Pressable key={key} style={s.option} onPress={() => { move.mutate({ id: moving.id, status: key }); setMoving(null); }} testID={`move-to-${key}`}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Small style={{ fontSize: 16 }}>{label}</Small>{moving?.status === key ? <Badge label="aktuell" /> : null}</View>
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}
