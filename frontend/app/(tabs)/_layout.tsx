import React from "react";
import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  Camera01Icon,
  DashboardSquare01Icon,
  File01Icon,
  Message01Icon,
  UserAccountIcon,
} from "@hugeicons/core-free-icons";
import { useAuth, isStaff } from "@/src/auth";
import { useTheme } from "@/src/theme";

const CONTROL_TABS = [
  { name: "mein-projekt", title: "Control", icon: DashboardSquare01Icon },
  { name: "aktivitaet", title: "Verlauf", icon: Message01Icon },
  { name: "medien", title: "Medien", icon: Camera01Icon },
  { name: "dateien", title: "Dateien", icon: File01Icon },
  { name: "profil", title: "Profil", icon: UserAccountIcon },
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
            tabBarIcon: ({ color }) => <HugeiconsIcon icon={t.icon} size={21} color={color} strokeWidth={1.5} />,
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
