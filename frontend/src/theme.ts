import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#FFFFFF",
  onSurface: "#111111",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#333333",
  surfaceTertiary: "#F1F1F1",
  onSurfaceTertiary: "#555555",
  surfaceSoft: "#FAFAFA",
  surfaceGrey: "#F4F4F4",
  surfaceInverse: "#111111",
  onSurfaceInverse: "#FFFFFF",
  muted: "#7A7A7A",

  brand: "#D96C40",
  onBrand: "#FFFFFF",
  brandPrimary: "#111111",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#F4F4F4",
  onBrandSecondary: "#111111",
  brandTertiary: "#F9EFEA",
  onBrandTertiary: "#8C3F20",

  success: "#4E8563",
  onSuccess: "#FFFFFF",
  warning: "#F59E0B",
  onWarning: "#111111",
  error: "#B94A48",
  onError: "#FFFFFF",
  info: "#8A8A8A",
  onInfo: "#FFFFFF",

  border: "#E7E7E7",
  borderStrong: "#D6D6D6",
  divider: "#ECECEC",

  statusPlanned: "#8A8A8A",
  statusInProgress: "#D96C40",
  statusWaiting: "#F59E0B",
  statusCompleted: "#4E8563",
  statusProblem: "#B94A48",

  nearBlack: "#111111",
  sand: "#D7D7D7",
  warmWhite: "#FAFAFA",
  scrim: "rgba(17,17,17,0.58)",
  glass: "rgba(255,255,255,0.82)",
  glassDark: "rgba(17,17,17,0.72)",
  heroShadow: "rgba(0,0,0,0.55)",
};

export const space = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48,
  section: 72, sectionLarge: 110,
} as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 26, hero: 40, pill: 999 } as const;
export const type = { sm: 12, base: 14, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 42, display: 64 } as const;

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extrabold: "Inter_800ExtraBold",
  text: "Inter_400Regular",
  display: "Inter_600SemiBold",
} as const;

export const STATUS_COLOR_KEY: Record<string, keyof typeof light> = {
  PLANNED: "statusPlanned",
  IN_PROGRESS: "statusInProgress",
  WAITING: "statusWaiting",
  COMPLETED: "statusCompleted",
  PROBLEM: "statusProblem",
};

export type ThemeColors = typeof light;
export const defaultScheme = "light" satisfies ColorScheme;
export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system === "dark" && themes.dark ? "dark" : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
