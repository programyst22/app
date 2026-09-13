import React, { useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, abs } from "@/src/api";
import { useAuth, isManagement } from "@/src/auth";
import { Sheet, Select, Toggle } from "@/src/components/forms";
import { MediaPicker, MediaItem } from "@/src/components/MediaPicker";
import { Button, Caption, Input, useToast } from "@/src/components/ui";
import { useTheme, space, radius } from "@/src/theme";

/** Before/After editor for Admin & Employee: pick two project images, assign BEFORE/AFTER, meta, visibility, publishing. */
export function BeforeAfterEditor({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [picker, setPicker] = useState<"before" | "after" | null>(null);
  const [before, setBefore] = useState<MediaItem | null>(null);
  const [after, setAfter] = useState<MediaItem | null>(null);
  const [f, setF] = useState({ title: "", description: "", zone_id: "", date: new Date().toISOString().slice(0, 10), client_visible: true, published: false });
  const { data: zones } = useQuery({ queryKey: ["zones", projectId], queryFn: () => api(`/projects/${projectId}/zones`), enabled: open });
  const zoneLabels = Object.fromEntries((zones || []).map((z: any) => [z.id, z.display_name]));
  const create = useMutation({
    mutationFn: () => api(`/projects/${projectId}/before-after`, { method: "POST", json: { before_id: before!.id, after_id: after!.id, ...f, zone_id: f.zone_id || null } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["before-after", projectId] }); qc.invalidateQueries({ queryKey: ["public-before-after"] }); toast.show("Vorher / Nachher gespeichert", "success"); setBefore(null); setAfter(null); onClose(); },
    onError: (e: any) => toast.show(e.message, "error"),
  });
  const Slot = ({ label, item, onPress, testID }: any) => (
    <View style={{ flex: 1, gap: 6 }}>
      <Caption style={{ letterSpacing: 1, fontWeight: "700" }}>{label}</Caption>
      <View style={{ height: 140, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, overflow: "hidden", borderWidth: 1, borderColor: item ? colors.brandPrimary : colors.border }}>
        {item ? <Image source={{ uri: abs(item.url) }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : null}
      </View>
      <Button title={item ? "Ändern" : "Bild wählen"} small variant="light" onPress={onPress} testID={testID} />
    </View>
  );
  return (
    <>
      <Sheet open={open && !picker} onClose={onClose} title="Vorher / Nachher" testID="sheet-before-after">
        <View style={{ flexDirection: "row", gap: space.md }}>
          <Slot label="VORHER" item={before} onPress={() => setPicker("before")} testID="ba-pick-before" />
          <Slot label="NACHHER" item={after} onPress={() => setPicker("after")} testID="ba-pick-after" />
        </View>
        <Input label="Titel" value={f.title} onChangeText={(v) => setF({ ...f, title: v })} testID="ba-title" />
        <Input label="Beschreibung" value={f.description} onChangeText={(v) => setF({ ...f, description: v })} multiline testID="ba-desc" />
        <Select label="Raum / Bereich" value={f.zone_id || null} options={(zones || []).map((z: any) => z.id)} labels={zoneLabels} onChange={(v) => setF({ ...f, zone_id: v })} placeholder="Optional" testID="ba-zone" />
        <Input label="Datum (JJJJ-MM-TT)" value={f.date} onChangeText={(v) => setF({ ...f, date: v })} testID="ba-date" />
        <Toggle label="Für Kunden sichtbar" value={f.client_visible} onChange={(v) => setF({ ...f, client_visible: v })} testID="ba-visible" />
        {isManagement(user) ? <Toggle label="Im öffentlichen Portfolio veröffentlichen" value={f.published} onChange={(v) => setF({ ...f, published: v })} testID="ba-published" /> : <Caption>Veröffentlichung im Portfolio erfolgt durch die Projektleitung.</Caption>}
        <Button title="Speichern" onPress={() => create.mutate()} loading={create.isPending} disabled={!before || !after} testID="ba-submit" />
      </Sheet>
      <MediaPicker open={!!picker} onClose={() => setPicker(null)} projectId={projectId} title={picker === "before" ? "Vorher-Bild wählen" : "Nachher-Bild wählen"} onPick={(items) => { if (picker === "before") setBefore(items[0]); else setAfter(items[0]); }} />
    </>
  );
}
