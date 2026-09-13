// Design tokens for this app. Light theme only.Always modify the colors and theme to Dark, Light or Dark and Light according to the design guidelines.
//
// The keys match the "color" block of /app/design_guidelines.json. Fill the
// values from that file (or from the user's brand colors). Keep every key; do
// not add a second theme or colors file; do not write color literals in
// components.
//
// How the names work: a plain key is a background, and its `on` partner is the
// text or icon color that sits on top of it. Always use them as a pair.
//   <View style={{ backgroundColor: colors.brandPrimary }}>
//     <Text style={{ color: colors.onBrandPrimary }}>Continue</Text>
//   </View>
//
// Styling a screen or component: build the sheet with makeStyles so colors
// and layout live together and follow the active scheme:
//   const useStyles = makeStyles((colors) => ({
//     card: { backgroundColor: colors.surfaceSecondary, padding: 16 },
//     title: { color: colors.onSurfaceSecondary, fontSize: 16 },
//   }));
//   function Screen() {
//     const styles = useStyles();
//     return <View style={styles.card}><Text style={styles.title}>Hi</Text></View>;
//   }
// For color props that are not styles (icon color, placeholderTextColor,
// ActivityIndicator) read useTheme().colors inside the component.
// Never call StyleSheet.create with color values at module level; it cannot
// follow the scheme.
//
// To support dark mode later: add `dark` to `themes` with every key filled.
// Nothing else changes; the device setting takes over automatically.
// Feel free to add as many new colors as you need to support the design guidelines.

import { useMemo } from "react";
import { Appearance, Platform, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#F9F9F8",
  onSurface: "#121212",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#1A1A1A",
  surfaceTertiary: "#EAE8E1",
  onSurfaceTertiary: "#2C2C2C",
  surfaceInverse: "#1A1A1A",
  onSurfaceInverse: "#FFFFFF",
  muted: "#7A7A7A",

  brand: "#D96C40",
  onBrand: "#FFFFFF",
  brandPrimary: "#D96C40",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#F0EFE9",
  onBrandSecondary: "#1A1A1A",
  brandTertiary: "#F9EFEA",
  onBrandTertiary: "#8C3F20",

  success: "#4E8563",
  onSuccess: "#FFFFFF",
  warning: "#F59E0B",
  onWarning: "#FFFFFF",
  error: "#B94A48",
  onError: "#FFFFFF",
  info: "#8A8A8A",
  onInfo: "#FFFFFF",

  border: "#E6E4DD",
  borderStrong: "#CCC9C0",
  divider: "#E6E4DD",

  // 3D / project zone status colors (requested by client)
  statusPlanned: "#8A8A8A",
  statusInProgress: "#D96C40",
  statusWaiting: "#F59E0B",
  statusCompleted: "#4E8563",
  statusProblem: "#B94A48",

  // cinematic surfaces
  nearBlack: "#0E0E0E",
  sand: "#D9CFBF",
  warmWhite: "#F5F3EE",
  scrim: "rgba(10,10,10,0.55)",
  glass: "rgba(255,255,255,0.72)",
  glassDark: "rgba(18,18,18,0.55)",
};

// Non-color tokens from design_guidelines.json
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 } as const;
export const type = { sm: 12, base: 14, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 40, display: 52 } as const;
export const fonts = {
  display: Platform.select({ ios: "Avenir Next", android: "sans-serif-medium", default: '"Helvetica Neue", Helvetica, Arial, sans-serif' }) as string,
  text: Platform.select({ ios: "Avenir Next", android: "sans-serif", default: '"Helvetica Neue", Helvetica, Arial, sans-serif' }) as string,
};

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

// In-app theme toggle, only after `dark` exists in `themes`. Call
// setColorScheme("dark"), setColorScheme("light"), or setColorScheme(null) to
// follow the device. Every useTheme() consumer re-renders. Persisting the
// choice and re-applying it on launch is the toggle's job.
export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme);
}

// Keep native surfaces (alerts, pickers, navigation chrome) on the schemes this
// app ships: light only forces light; once `dark` exists the device decides.
// Optional call because react-native-web does not implement it.
setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

// Themed StyleSheet: returns a hook that builds the sheet from the active
// scheme's colors and memoizes it until the scheme changes.
export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}


