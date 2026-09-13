import React, { useState } from "react";
import { View, Pressable, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Ionicons from "@react-native-vector-icons/ionicons";
import { api, abs, upload } from "@/src/api";
import { Sheet, usePickers } from "@/src/components/forms";
import { Button, Caption, Loading, Empty, useToast, ChipRow } from "@/src/components/ui";
import { makeStyles, useTheme, space, radius } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  tile: { borderRadius: radius.md, overflow: "hidden", backgroundColor: c.surfaceTertiary, borderWidth: 2, borderColor: "transparent" },
  tileActive: { borderColor: c.brandPrimary },
  tag: { position: "absolute", top: 6, left: 6, backgroundColor: c.surfaceInverse, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
}));

export type MediaItem = { id: string; url: string; filename?: string; title?: string; content_type?: string };

/**
 * Pick images from the marketing Media Library (kind=library, public) or from a project's private gallery.
 * Returns full items so callers can store either the id (private) or the /api/files url (public CMS/portfolio).
 */
export function MediaPicker({ open, onClose, onPick, multiple, projectId, title = "Medien wählen", labels }: {
  open: boolean; onClose: () => void; onPick: (items: MediaItem[]) => void; multiple?: boolean; projectId?: string; title?: string; labels?: Record<string, string>;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const toast = useToast();
  const qc = useQueryClient();
  const { pickImages } = usePickers();
  const [sel, setSel] = useState<MediaItem[]>([]);
  const [source, setSource] = useState<"library" | "project">(projectId ? "project" : "library");
  const [busy, setBusy] = useState(false);
  const path = source === "project" && projectId ? `/projects/${projectId}/media` : "/media?type=image";
  const { data, isLoading } = useQuery({ queryKey: ["picker", path], queryFn: () => api(path), enabled: open });
  const items: MediaItem[] = (data || []).filter((m: any) => m.content_type?.startsWith("image"));
  const w = (width - space.xl * 2 - space.sm * 2) / 3;
  const toggle = (m: MediaItem) => {
    if (!multiple) { onPick([m]); onClose(); setSel([]); return; }
    setSel((p) => (p.find((x) => x.id === m.id) ? p.filter((x) => x.id !== m.id) : [...p, m]));
  };
  const uploadNew = async () => {
    const files = await pickImages();
    if (!files.length) return;
    setBusy(true);
    try {
      await upload(source === "project" && projectId ? `/projects/${projectId}/media` : "/media", files, source === "project" ? { client_visible: "true" } : { category: "Marketing", public: "true" });
      qc.invalidateQueries({ queryKey: ["picker"] }); qc.invalidateQueries({ queryKey: ["media-lib"] }); qc.invalidateQueries({ queryKey: ["media", projectId] });
      toast.show("Hochgeladen", "success");
    } catch (e: any) { toast.show(e.message, "error"); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={title} testID="media-picker">
      {projectId ? <View style={{ marginHorizontal: -space.xl }}><ChipRow items={["project", "library"] as const} value={source} onChange={setSource} labels={{ project: "Projektfotos", library: "Medienbibliothek" }} testID="picker-source" /></View> : null}
      <Button title="Neu hochladen" small variant="light" icon="cloud-upload-outline" onPress={uploadNew} loading={busy} testID="picker-upload" />
      {isLoading ? <Loading /> : !items.length ? <Empty icon="images-outline" title="Keine Bilder" text="Laden Sie zuerst Bilder hoch." /> : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {items.map((m) => {
            const idx = sel.findIndex((x) => x.id === m.id);
            return (
              <Pressable key={m.id} onPress={() => toggle(m)} style={[s.tile, idx >= 0 && s.tileActive, { width: w, height: w }]} testID={`picker-item-${m.id}`}>
                <Image source={{ uri: abs(m.url) }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                {idx >= 0 ? <View style={s.tag}><Caption style={{ color: colors.onSurfaceInverse, fontWeight: "700" }}>{labels ? Object.values(labels)[idx] || idx + 1 : idx + 1}</Caption></View> : null}
              </Pressable>
            );
          })}
        </View>
      )}
      {multiple ? <Button title={`Übernehmen (${sel.length})`} onPress={() => { onPick(sel); onClose(); setSel([]); }} disabled={!sel.length} testID="picker-confirm" /> : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Ionicons name="lock-closed-outline" size={12} color={colors.muted} /><Caption>Projektfotos bleiben privat; Medienbibliothek ist für Website/App-Inhalte gedacht.</Caption></View>
    </Sheet>
  );
}

/** Small "image field" for CMS / portfolio forms: preview + choose + clear. */
export function ImageField({ label, value, onChange, testID }: { label: string; value?: string | null; onChange: (url: string | null) => void; testID?: string }) {
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <Caption style={{ letterSpacing: 1, textTransform: "uppercase", fontWeight: "600" }}>{label}</Caption>
      <View style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}>
        <View style={{ width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, overflow: "hidden" }}>{value ? <Image source={{ uri: abs(value) }} style={{ width: 72, height: 72 }} contentFit="cover" /> : null}</View>
        <Button title={value ? "Ändern" : "Bild wählen"} small variant="light" onPress={() => setOpen(true)} testID={testID} />
        {value ? <Button title="Entfernen" small variant="ghost" onPress={() => onChange(null)} testID={`${testID}-clear`} /> : null}
      </View>
      <MediaPicker open={open} onClose={() => setOpen(false)} onPick={(items) => onChange(items[0]?.url?.split("?")[0] || null)} title={label} />
    </View>
  );
}
