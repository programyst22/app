import React, { useState } from "react";
import { View, ScrollView, Pressable, Text, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from "react-native-reanimated";
import { ArrowRight01Icon, MoveIcon } from "@hugeicons/core-free-icons";
import { api, fmtDate } from "@/src/api";
import { Loading, useToast, Badge } from "@/src/components/ui";
import { Sheet } from "@/src/components/forms";
import { StrokeIcon } from "@/src/components/premium";
import { fonts, makeStyles, useTheme, space, radius } from "@/src/theme";

const COLS = [
  ["NEU", "Neue Anfrage"],
  ["KONTAKTIERT", "Kontaktiert"],
  ["BESICHTIGUNG", "Besichtigung"],
  ["ANGEBOT", "Angebot"],
  ["VERHANDLUNG", "Verhandlung"],
  ["GEWONNEN", "Gewonnen"],
  ["VERLOREN", "Verloren"],
] as const;

const COL_W = 290;

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  shell: { width: "100%", maxWidth: 1380, alignSelf: "center" },
  overline: {
    fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.4,
    color: c.onSurface, textTransform: "uppercase",
  },
  heading: { fontFamily: fonts.medium, color: c.onSurface, letterSpacing: -1.4 },
  body: { fontFamily: fonts.regular, color: c.muted, fontSize: 14, lineHeight: 21 },
  col: {
    width: COL_W,
    backgroundColor: c.surfaceGrey,
    borderRadius: 20,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: c.border,
  },
  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    gap: 7,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1,
  },
  count: {
    minWidth: 27, height: 27, borderRadius: 14,
    backgroundColor: c.surfaceInverse,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 7,
  },
  option: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
}));

function LeadCard({ lead, onOpen, onDrop, onMove, styles: s }: any) {
  const { colors } = useTheme();
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const active = useSharedValue(0);

  const pan = Gesture.Pan()
    .activateAfterLongPress(220)
    .onStart(() => { active.value = 1; })
    .onUpdate((e) => { tx.value = e.translationX; ty.value = e.translationY; })
    .onEnd((e) => {
      const steps = Math.round(e.translationX / (COL_W + space.md));
      if (steps !== 0) runOnJS(onDrop)(lead, steps);
      tx.value = withSpring(0);
      ty.value = withSpring(0);
      active.value = 0;
    });

  const st = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: active.value ? 1.03 : 1 },
    ],
    zIndex: active.value ? 10 : 0,
    opacity: active.value ? 0.92 : 1,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={st}>
        <Pressable
          style={s.card}
          onPress={() => onOpen(lead)}
          onLongPress={() => {}}
          testID={`lead-card-${lead.id}`}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
            <Text style={[s.body, { fontSize: 12 }]}>{fmtDate(lead.created_at)}</Text>
            <Text style={[s.body, { fontSize: 12 }]}>{lead.source}</Text>
          </View>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, color: colors.onSurface }}>
            {lead.name}
          </Text>
          <Text style={s.body} numberOfLines={2}>{lead.project_type}</Text>
          {lead.postal_code ? (
            <Text style={[s.body, { fontSize: 12 }]}>{lead.postal_code} {lead.address}</Text>
          ) : null}
          <Pressable
            onPress={() => onMove(lead)}
            hitSlop={6}
            testID={`lead-move-${lead.id}`}
            style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4 }}
          >
            <StrokeIcon icon={MoveIcon} size={16} color={colors.onSurface} />
            <Text style={{ fontFamily: fonts.semibold, color: colors.onSurface, fontSize: 13 }}>
              Verschieben
            </Text>
          </Pressable>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

export default function CRM() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { width } = useWindowDimensions();
  const [moving, setMoving] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => api("/leads"),
    refetchInterval: 15000,
  });

  const move = useMutation({
    mutationFn: ({ id, status }: any) =>
      api(`/leads/${id}`, { method: "PATCH", json: { status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.show("Status aktualisiert", "success");
    },
    onError: (e: any) => toast.show(e.message, "error"),
  });

  const onDrop = (lead: any, steps: number) => {
    const idx = COLS.findIndex((c) => c[0] === lead.status);
    const next = COLS[Math.max(0, Math.min(COLS.length - 1, idx + steps))][0];
    if (next !== lead.status) move.mutate({ id: lead.id, status: next });
  };

  const pagePad = width < 700 ? 20 : 36;
  const headingSize = width < 700 ? 38 : 52;

  return (
    <View style={s.screen}>
      <View style={{ paddingTop: insets.top + 30, paddingHorizontal: pagePad, paddingBottom: 18 }}>
        <View style={s.shell}>
          <Text style={s.overline}>CRM</Text>
          <Text style={[s.heading, { fontSize: headingSize, lineHeight: headingSize * 1.08, marginTop: 8 }]}>
            Pipeline.
          </Text>
          <Text style={[s.body, { fontSize: 15, marginTop: 10 }]}>
            Karte lange halten und horizontal ziehen oder „Verschieben“ tippen.
          </Text>
        </View>
      </View>

      {isLoading ? (
        <Loading />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: pagePad, gap: 14, paddingBottom: 26 }}
          testID="kanban"
        >
          {COLS.map(([key, label]) => {
            const items = (data || []).filter((l: any) => l.status === key);
            return (
              <View key={key} style={s.col} testID={`kanban-col-${key}`}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4, paddingVertical: 3 }}>
                  <Text style={{ fontFamily: fonts.semibold, color: colors.onSurface, fontSize: 14 }}>{label}</Text>
                  <View style={s.count}>
                    <Text style={{ color: "#fff", fontFamily: fonts.bold, fontSize: 12 }}>{items.length}</Text>
                  </View>
                </View>

                <ScrollView
                  contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 610 }}
                >
                  {items.map((l: any) => (
                    <LeadCard
                      key={l.id}
                      lead={l}
                      styles={s}
                      onOpen={(x: any) => router.push(`/admin/lead/${x.id}`)}
                      onDrop={onDrop}
                      onMove={setMoving}
                    />
                  ))}
                  {!items.length ? (
                    <Text style={[s.body, { padding: 12 }]}>Keine Einträge</Text>
                  ) : null}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      )}

      <Sheet
        open={!!moving}
        onClose={() => setMoving(null)}
        title={moving ? `${moving.name} verschieben` : ""}
        testID="move-sheet"
      >
        {COLS.map(([key, label]) => (
          <Pressable
            key={key}
            style={s.option}
            onPress={() => {
              move.mutate({ id: moving.id, status: key });
              setMoving(null);
            }}
            testID={`move-to-${key}`}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <Text style={{ fontFamily: fonts.medium, fontSize: 16, color: colors.onSurface }}>{label}</Text>
              {moving?.status === key ? (
                <Badge label="aktuell" />
              ) : (
                <StrokeIcon icon={ArrowRight01Icon} size={18} color={colors.muted} />
              )}
            </View>
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}
