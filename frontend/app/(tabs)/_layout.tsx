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

import { isStaff, useAuth } from "@/src/auth";
import { fonts, useTheme } from "@/src/theme";

const CONTROL_TABS = [
  { name: "mein-projekt", title: "Control", icon: DashboardSquare01Icon },
  { name: "aktivitaet", title: "Verlauf", icon: Message01Icon },
  { name: "medien", title: "Medien", icon: Camera01Icon },
  { name: "dateien", title: "Dateien", icon: File01Icon },
  { name: "profil", title: "Profil", icon: UserAccountIcon },
] as const;

const LEGACY = ["index", "leistungen", "projekte", "kontakt"] as const;

export default function TabsLayout() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const staff = isStaff(user);

  return (
    <Tabs
      initialRouteName="mein-projekt"
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.onSurface,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: staff
          ? { display: "none" }
          : {
              position: "absolute",
              left: 14,
              right: 14,
              bottom: Platform.OS === "ios" ? 8 : 12,
              height: 70,
              borderTopWidth: 0,
              borderWidth: 1,
              borderColor: "rgba(11,12,12,0.08)",
              borderRadius: 26,
              backgroundColor: Platform.OS === "ios" ? "transparent" : "rgba(251,250,247,0.96)",
              overflow: "hidden",
              elevation: 12,
              shadowColor: "#000",
              shadowOpacity: 0.10,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: 10 },
            },
        tabBarItemStyle: {
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 2 : 7,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.semibold,
          fontSize: 10,
          letterSpacing: 0.1,
        },
        tabBarBackground:
          !staff && Platform.OS === "ios"
            ? () => <BlurView intensity={78} tint="light" style={{ flex: 1 }} />
            : undefined,
      }}
    >
      {CONTROL_TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            href: staff ? null : undefined,
            tabBarButtonTestID: `control-tab-${t.name}`,
            tabBarIcon: ({ color }) => (
              <HugeiconsIcon icon={t.icon} size={21} color={color} strokeWidth={1.5} />
            ),
          }}
        />
      ))}

      {LEGACY.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
