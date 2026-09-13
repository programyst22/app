import React, { useState } from "react";
import { View, Modal, Pressable, ScrollView, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import Ionicons from "@react-native-vector-icons/ionicons";
import { PickedFile } from "@/src/api";
import { H2, Small, Caption, Button, IconButton, useToast } from "@/src/components/ui";
import { makeStyles, useTheme, space, radius, fonts } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  label: { fontFamily: fonts.text, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: c.muted, marginBottom: space.sm, fontWeight: "600" },
  select: { minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, paddingHorizontal: space.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: "92%" },
  option: { paddingVertical: space.md, paddingHorizontal: space.xl, borderBottomWidth: 1, borderBottomColor: c.divider, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space.sm },
}));

export function Select<T extends string>({ label, value, options, onChange, labels, testID, placeholder = "Auswählen" }: { label?: string; value?: T | null; options: T[]; onChange: (v: T) => void; labels?: Record<string, string>; testID?: string; placeholder?: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View>
      {label ? <Caption style={s.label}>{label}</Caption> : null}
      <Pressable style={s.select} onPress={() => setOpen(true)} testID={testID}>
        <Small style={{ color: value ? colors.onSurface : colors.muted, fontSize: 16 }}>{value ? labels?.[value] ?? value : placeholder}</Small>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={label || "Auswählen"}>
        <ScrollView>
          {options.map((o) => (
            <Pressable key={o} style={s.option} onPress={() => { onChange(o); setOpen(false); }} testID={`${testID || "select"}-option-${o}`}>
              <Small style={{ fontSize: 16, color: colors.onSurface }}>{labels?.[o] ?? o}</Small>
              {value === o ? <Ionicons name="checkmark" size={18} color={colors.brandPrimary} /> : null}
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>
    </View>
  );
}

export function Sheet({ open, onClose, title, children, testID }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; testID?: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.scrim, justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[s.sheet, { paddingBottom: insets.bottom }]} testID={testID}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: space.xl, paddingBottom: space.md }}>
            <H2>{title}</H2>
            <IconButton icon="close" onPress={onClose} testID="sheet-close" />
          </View>
          <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.md }}>{children}</KeyboardAwareScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function Toggle({ label, value, onChange, testID }: { label: string; value: boolean; onChange: (v: boolean) => void; testID?: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <View style={s.switchRow}>
      <Small style={{ flex: 1 }}>{label}</Small>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.brandPrimary, false: colors.border }} testID={testID} />
    </View>
  );
}

/** Contextual permission-aware pickers. */
export function usePickers() {
  const toast = useToast();
  const pickImages = async (multiple = true): Promise<PickedFile[]> => {
    let perm = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      if (!perm.canAskAgain) { toast.show("Fotozugriff in den Einstellungen erlauben.", "error"); return []; }
      perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") { toast.show("Ohne Fotozugriff können keine Bilder hochgeladen werden.", "error"); return []; }
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], allowsMultipleSelection: multiple, quality: 0.8 });
    if (res.canceled) return [];
    return res.assets.map((a) => ({ uri: a.uri, name: a.fileName || `upload-${Date.now()}.${a.type === "video" ? "mp4" : "jpg"}`, type: a.mimeType || (a.type === "video" ? "video/mp4" : "image/jpeg") }));
  };
  const pickDocument = async (types: string[] = ["*/*"]): Promise<PickedFile | null> => {
    const res = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return null;
    const a = res.assets[0];
    return { uri: a.uri, name: a.name, type: a.mimeType || "application/octet-stream" };
  };
  return { pickImages, pickDocument };
}

export function FormActions({ onSubmit, loading, title = "Speichern", testID }: { onSubmit: () => void; loading?: boolean; title?: string; testID?: string }) {
  return <Button title={title} onPress={onSubmit} loading={loading} testID={testID || "form-submit"} style={{ marginTop: space.sm }} />;
}
