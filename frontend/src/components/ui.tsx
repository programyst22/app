import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, TextInputProps, View, ViewStyle, StyleProp, TextStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { makeStyles, useTheme, space, radius, type, fonts, STATUS_COLOR_KEY, ThemeColors } from "@/src/theme";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];

const useStyles = makeStyles((c) => ({
  eyebrow: { fontFamily: fonts.text, fontSize: type.sm, letterSpacing: 2, textTransform: "uppercase", color: c.muted, fontWeight: "600" },
  display: { fontFamily: fonts.display, fontSize: type.huge, lineHeight: type.huge * 1.02, letterSpacing: -1.5, color: c.onSurface, fontWeight: "700" },
  h1: { fontFamily: fonts.display, fontSize: type.xxxl, lineHeight: type.xxxl * 1.1, letterSpacing: -1, color: c.onSurface, fontWeight: "700" },
  h2: { fontFamily: fonts.display, fontSize: type.xxl, lineHeight: type.xxl * 1.15, letterSpacing: -0.5, color: c.onSurface, fontWeight: "700" },
  h3: { fontFamily: fonts.display, fontSize: type.xl, lineHeight: type.xl * 1.2, letterSpacing: -0.3, color: c.onSurface, fontWeight: "600" },
  body: { fontFamily: fonts.text, fontSize: type.lg, lineHeight: type.lg * 1.5, color: c.onSurfaceSecondary },
  small: { fontFamily: fonts.text, fontSize: type.base, lineHeight: type.base * 1.45, color: c.onSurfaceTertiary },
  caption: { fontFamily: fonts.text, fontSize: type.sm, lineHeight: type.sm * 1.4, color: c.muted },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: space.lg, borderWidth: 1, borderColor: c.border },
  cardDark: { backgroundColor: c.surfaceInverse, borderRadius: radius.lg, padding: space.lg },
  btn: { minHeight: 52, paddingHorizontal: space.xl, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: space.sm },
  btnPrimary: { backgroundColor: c.surfaceInverse },
  btnAccent: { backgroundColor: c.brandPrimary },
  btnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: c.borderStrong },
  btnLight: { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
  btnText: { fontFamily: fonts.text, fontSize: type.lg, fontWeight: "600" },
  input: { minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, paddingHorizontal: space.lg, fontSize: type.lg, color: c.onSurface, fontFamily: fonts.text },
  inputFocused: { borderColor: c.onSurface },
  label: { fontFamily: fonts.text, fontSize: type.sm, letterSpacing: 1, textTransform: "uppercase", color: c.muted, marginBottom: space.sm, fontWeight: "600" },
  badge: { paddingHorizontal: space.md, height: 28, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, alignSelf: "flex-start" },
  badgeText: { fontSize: type.sm, fontWeight: "700", letterSpacing: 0.5 },
  chip: { height: 36, paddingHorizontal: space.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: c.surfaceInverse, borderColor: c.surfaceInverse },
  chipText: { fontSize: type.base, color: c.onSurfaceSecondary, fontWeight: "500" },
  chipTextActive: { color: c.onSurfaceInverse },
  chipRow: { height: 56, flexGrow: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: c.divider },
  header: { paddingHorizontal: space.xl, paddingBottom: space.md, backgroundColor: c.surface, flexDirection: "row", alignItems: "center", gap: space.md },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
  progressTrack: { height: 6, backgroundColor: c.surfaceTertiary, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: c.brandPrimary, borderRadius: 3 },
  toast: { position: "absolute", left: space.lg, right: space.lg, backgroundColor: c.surfaceInverse, borderRadius: radius.md, padding: space.lg, flexDirection: "row", gap: space.md, alignItems: "center" },
  toastText: { color: c.onSurfaceInverse, fontSize: type.base, flex: 1 },
  empty: { alignItems: "center", padding: space.xxl, gap: space.md },
  stat: { flex: 1, minWidth: 140, backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: space.lg, borderWidth: 1, borderColor: c.border, gap: 4 },
  statValue: { fontFamily: fonts.display, fontSize: type.xxxl, fontWeight: "700", letterSpacing: -1, color: c.onSurface },
  glass: { backgroundColor: c.glass, borderRadius: radius.md, borderWidth: 1, borderColor: "rgba(255,255,255,0.6)" },
}));

// -------- typography --------
type TP = { children: React.ReactNode; style?: StyleProp<TextStyle>; testID?: string; numberOfLines?: number; onDark?: boolean };
const mk = (key: "eyebrow" | "display" | "h1" | "h2" | "h3" | "body" | "small" | "caption") =>
  function T({ children, style, testID, numberOfLines, onDark }: TP) {
    const s = useStyles();
    const { colors } = useTheme();
    return (
      <Text testID={testID} numberOfLines={numberOfLines} style={[s[key], onDark && { color: key === "eyebrow" || key === "caption" ? colors.sand : colors.onSurfaceInverse }, style]}>
        {children}
      </Text>
    );
  };
export const Eyebrow = mk("eyebrow");
export const Display = mk("display");
export const H1 = mk("h1");
export const H2 = mk("h2");
export const H3 = mk("h3");
export const Body = mk("body");
export const Small = mk("small");
export const Caption = mk("caption");

// -------- button --------
export function Button({ title, onPress, variant = "primary", icon, loading, disabled, style, testID, small }: {
  title: string; onPress?: () => void; variant?: "primary" | "accent" | "ghost" | "light" | "ghostDark"; icon?: IconName; loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; testID?: string; small?: boolean;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const fg = variant === "primary" || variant === "ghostDark" ? colors.onSurfaceInverse : variant === "accent" ? colors.onBrandPrimary : colors.onSurface;
  return (
    <Animated.View style={[anim, style]}>
      <Pressable
        testID={testID}
        disabled={disabled || loading}
        onPressIn={() => (scale.value = withSpring(0.97))}
        onPressOut={() => (scale.value = withSpring(1))}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onPress?.();
        }}
        style={[s.btn, variant === "primary" && s.btnPrimary, variant === "accent" && s.btnAccent, variant === "ghost" && s.btnGhost, variant === "ghostDark" && [s.btnGhost, { borderColor: "rgba(255,255,255,0.45)" }], variant === "light" && s.btnLight, small && { minHeight: 44, paddingHorizontal: space.lg }, (disabled || loading) && { opacity: 0.5 }]}
      >
        {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
        <Text style={[s.btnText, { color: fg }, small && { fontSize: type.base }]}>{title}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function IconButton({ icon, onPress, testID, dark }: { icon: IconName; onPress?: () => void; testID?: string; dark?: boolean }) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} style={[s.backBtn, dark && { backgroundColor: colors.glassDark, borderColor: "rgba(255,255,255,0.2)" }]} hitSlop={8}>
      <Ionicons name={icon} size={20} color={dark ? colors.onSurfaceInverse : colors.onSurface} />
    </Pressable>
  );
}

// -------- card / badge / chips --------
export function Card({ children, style, dark, onPress, testID, index = 0 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; dark?: boolean; onPress?: () => void; testID?: string; index?: number }) {
  const s = useStyles();
  const inner = <Animated.View entering={FadeInDown.delay(index * 60).duration(400)} style={[dark ? s.cardDark : s.card, style]}>{children}</Animated.View>;
  if (!onPress) return <View testID={testID}>{inner}</View>;
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] })}>
      {inner}
    </Pressable>
  );
}

export const STATUS_LABEL: Record<string, string> = {
  PLANNED: "Geplant", IN_PROGRESS: "In Arbeit", WAITING: "Wartend", COMPLETED: "Fertiggestellt", PROBLEM: "Problem",
  DRAFT: "Entwurf", SENT: "Gesendet", VIEWED: "Gesehen", ACCEPTED: "Angenommen", REJECTED: "Abgelehnt", EXPIRED: "Abgelaufen",
  OPEN: "Offen", PAID: "Bezahlt", OVERDUE: "Überfällig", CANCELLED: "Storniert", ACTIVE: "Aktiv", ARCHIVED: "Archiv", PENDING: "Ausstehend", CONFIRMED: "Bestätigt", DECLINED: "Abgesagt",
};

export function statusColor(c: ThemeColors, status?: string) {
  const key = STATUS_COLOR_KEY[status || ""];
  if (key) return c[key] as string;
  if (["ACCEPTED", "PAID", "ERLEDIGT", "GEWONNEN", "CONFIRMED", "ACTIVE"].includes(status || "")) return c.success;
  if (["REJECTED", "OVERDUE", "BLOCKIERT", "VERLOREN", "CANCELLED", "DECLINED"].includes(status || "")) return c.error;
  if (["SENT", "VIEWED", "IN ARBEIT", "OPEN", "PENDING"].includes(status || "")) return c.warning;
  return c.info;
}

export function Badge({ status, label, testID }: { status?: string; label?: string; testID?: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  const col = statusColor(colors, status);
  return (
    <View testID={testID} style={[s.badge, { backgroundColor: col + "22" }]}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: col }} />
      <Text style={[s.badgeText, { color: col }]}>{label ?? STATUS_LABEL[status || ""] ?? status}</Text>
    </View>
  );
}

export function ChipRow<T extends string>({ items, value, onChange, labels, testID }: { items: T[]; value: T; onChange: (v: T) => void; labels?: Record<string, string>; testID?: string }) {
  const s = useStyles();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.xl, alignItems: "center" }} testID={testID}>
      {items.map((it) => (
        <Pressable key={it} testID={`${testID || "chip"}-${it}`} onPress={() => { Haptics.selectionAsync().catch(() => {}); onChange(it); }} style={[s.chip, value === it && s.chipActive]}>
          <Text style={[s.chipText, value === it && s.chipTextActive]}>{labels?.[it] ?? it}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// -------- inputs --------
export function Input({ label, style, testID, ...props }: TextInputProps & { label?: string; testID?: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 0 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput
        testID={testID}
        placeholderTextColor={colors.muted}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={[s.input, focus && s.inputFocused, props.multiline && { minHeight: 120, paddingTop: space.md, textAlignVertical: "top" }, style]}
        {...props}
      />
    </View>
  );
}

// -------- rows / progress / stats --------
export function Row({ icon, title, subtitle, right, onPress, testID }: { icon?: IconName; title: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void; testID?: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} disabled={!onPress} style={s.row}>
      {icon ? (
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={icon} size={18} color={colors.onSurface} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[s.body, { fontWeight: "600", color: colors.onSurface }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={s.caption} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null)}
    </Pressable>
  );
}

export function Progress({ value, color, testID }: { value: number; color?: string; testID?: string }) {
  const s = useStyles();
  const w = useSharedValue(0);
  useEffect(() => { w.value = withTiming(Math.max(0, Math.min(100, value)), { duration: 700 }); }, [value]);
  const anim = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={s.progressTrack} testID={testID}>
      <Animated.View style={[s.progressFill, color ? { backgroundColor: color } : null, anim]} />
    </View>
  );
}

export function Stat({ label, value, onPress, testID, accent }: { label: string; value: string | number; onPress?: () => void; testID?: string; accent?: boolean }) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} disabled={!onPress} style={s.stat}>
      <Text style={[s.statValue, accent && { color: colors.brandPrimary }]}>{value}</Text>
      <Text style={s.caption}>{label}</Text>
    </Pressable>
  );
}

export function Empty({ icon = "cube-outline", title, text, action }: { icon?: IconName; title: string; text?: string; action?: React.ReactNode }) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <View style={s.empty} testID="empty-state">
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={28} color={colors.muted} />
      </View>
      <H3 style={{ textAlign: "center" }}>{title}</H3>
      {text ? <Small style={{ textAlign: "center" }}>{text}</Small> : null}
      {action}
    </View>
  );
}

export function Loading({ text = "Wird geladen…" }: { text?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ padding: space.xxl, alignItems: "center", gap: space.md }} testID="loading">
      <ActivityIndicator color={colors.onSurface} />
      <Caption>{text}</Caption>
    </View>
  );
}

// -------- screen scaffolding --------
export function ScreenHeader({ title, back = true, right, dark, subtitle }: { title?: string; back?: boolean; right?: React.ReactNode; dark?: boolean; subtitle?: string }) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <View style={[s.header, { paddingTop: insets.top + space.sm }, dark && { backgroundColor: colors.nearBlack }]}>
      {back ? <IconButton icon="chevron-back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} testID="back-button" dark={dark} /> : null}
      <View style={{ flex: 1 }}>
        {title ? <H3 onDark={dark} numberOfLines={1}>{title}</H3> : null}
        {subtitle ? <Caption onDark={dark} numberOfLines={1}>{subtitle}</Caption> : null}
      </View>
      {right}
    </View>
  );
}

export function Section({ eyebrow, title, children, style, action }: { eyebrow?: string; title?: string; children?: React.ReactNode; style?: StyleProp<ViewStyle>; action?: React.ReactNode }) {
  return (
    <View style={[{ paddingHorizontal: space.xl, gap: space.lg, marginTop: space.xxl }, style]}>
      {(eyebrow || title) && (
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
          <View style={{ flex: 1, gap: space.sm }}>
            {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            {title ? <H2>{title}</H2> : null}
          </View>
          {action}
        </View>
      )}
      {children}
    </View>
  );
}

// -------- toast --------
type ToastCtx = { show: (msg: string, kind?: "info" | "success" | "error") => void };
const ToastContext = createContext<ToastCtx>({ show: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [t, setT] = useState<{ msg: string; kind: string } | null>(null);
  const timer = useRef<any>(null);
  const show = useCallback((msg: string, kind: "info" | "success" | "error" = "info") => {
    setT({ msg, kind });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setT(null), 3200);
  }, []);
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {t ? (
        <Animated.View entering={FadeInDown} style={[s.toast, { top: insets.top + space.md }]} testID="toast">
          <Ionicons name={t.kind === "error" ? "alert-circle" : t.kind === "success" ? "checkmark-circle" : "information-circle"} size={20} color={t.kind === "error" ? colors.error : t.kind === "success" ? colors.success : colors.sand} />
          <Text style={s.toastText}>{t.msg}</Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export { useStyles as useUiStyles };
