import React from "react";
import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useAuth, isStaff } from "@/src/auth";
import { useTheme } from "@/src/theme";

const CONTROL_TABS = [
  { name: "mein-projekt", title: "Control", icon: "grid-outline", active: "grid" },
  { name: "aktivitaet", title: "Verlauf", icon: "pulse-outline", active: "pulse" },
  { name: "medien", title: "Medien", icon: "images-outline", active: "images" },
  { name: "dateien", title: "Dateien", icon: "folder-outline", active: "folder" },
  { name: "profil", title: "Profil", icon: "person-outline", active: "person" },
] as const;

export default function TabsLayout() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const hideBar = user === undefined || !user || isStaff(user);

  return (
    <Tabs
      initialRouteName="mein-projekt"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.onSurface,
        tabBarInactiveTintColor: colors.muted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: hideBar ? { display: "none" } : {
          position: "absolute",
          left: 14,
          right: 14,
          bottom: Platform.OS === "ios" ? 18 : 12,
          height: 68,
          paddingTop: 7,
          paddingBottom: 7,
          borderTopWidth: 0,
          borderRadius: 24,
          backgroundColor: Platform.OS === "android" ? "rgba(251,250,247,.96)" : "transparent",
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
          elevation: 12,
        },
        tabBarItemStyle: { borderRadius: 18 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700", marginTop: 1 },
        tabBarBackground: hideBar ? undefined : () => (
          <BlurView intensity={70} tint="light" style={{ flex: 1, borderRadius: 24, overflow: "hidden" }} />
        ),
      }}
    >
      {CONTROL_TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarButtonTestID: `tab-${t.name}`,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={(focused ? t.active : t.icon) as any} size={21} color={color} />
            ),
          }}
        />
      ))}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="leistungen" options={{ href: null }} />
      <Tabs.Screen name="projekte" options={{ href: null }} />
      <Tabs.Screen name="kontakt" options={{ href: null }} />
    </Tabs>
  );
}
