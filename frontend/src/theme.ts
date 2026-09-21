import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#F4F2EC",
  onSurface: "#0B0C0C",
  surfaceSecondary: "#FBFAF7",
  onSurfaceSecondary: "#262724",
  surfaceTertiary: "#E7E3DA",
  onSurfaceTertiary: "#4B4C48",
  surfaceSoft: "#EFEBE3",
  surfaceGrey: "#E5E1D9",
  surfaceInverse: "#0B0C0C",
  onSurfaceInverse: "#F8F6F0",
  muted: "#74736D",

  brand: "#E66A32",
  onBrand: "#FFFFFF",
  brandPrimary: "#E66A32",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#1A1B19",
  onBrandSecondary: "#F8F6F0",
  brandTertiary: "#F1D7C8",
  onBrandTertiary: "#6F2E13",

  success: "#56836A",
  onSuccess: "#FFFFFF",
  warning: "#C9902E",
  onWarning: "#0B0C0C",
  error: "#A94743",
  onError: "#FFFFFF",
  info: "#767A80",
  onInfo: "#FFFFFF",

  border: "#D9D5CC",
  borderStrong: "#BBB7AE",
  divider: "#E0DCD3",

  statusPlanned: "#8B8A84",
  statusInProgress: "#E66A32",
  statusWaiting: "#C9902E",
  statusCompleted: "#56836A",
  statusProblem: "#A94743",

  nearBlack: "#0B0C0C",
  sand: "#D8D5CD",
  warmWhite: "#F4F2EC",
  scrim: "rgba(11,12,12,0.66)",
  glass: "rgba(248,246,240,0.86)",
  glassDark: "rgba(11,12,12,0.78)",
  heroShadow: "rgba(0,0,0,0.64)",
};

export const space = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48,
  section: 64, sectionLarge: 96,
} as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, hero: 34, pill: 999 } as const;
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
