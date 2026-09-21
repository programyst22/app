import React from "react";
import { Platform } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  DashboardSquare01Icon,
  FilterHorizontalIcon,
  Building03Icon,
  MoreHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { useAuth, isManagement } from "@/src/auth";
import { Loading } from "@/src/components/ui";
import { fonts, useTheme } from "@/src/theme";

const TABS = [
  { name: "index", title: "Dashboard", icon: DashboardSquare01Icon },
  { name: "crm", title: "CRM", icon: FilterHorizontalIcon },
  { name: "projects", title: "Projekte", icon: Building03Icon },
  { name: "more", title: "Mehr", icon: MoreHorizontalIcon },
];
const HIDDEN = ["lead/[id]", "project/[id]", "list/[entity]"];

export default function AdminLayout() {
  const { colors } = useTheme();
  const { user } = useAuth();
  if (user === undefined) return <Loading />;
  if (!isManagement(user)) return <Redirect href="/(tabs)/mein-projekt" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.onSurface,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surfaceSecondary,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          ...(Platform.OS === "web" ? { height: 68 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: {
          fontFamily: fonts.semibold,
          fontSize: 11,
        },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarButtonTestID: `admin-tab-${t.name}`,
            tabBarIcon: ({ color }) => (
              <HugeiconsIcon icon={t.icon} size={21} color={color} strokeWidth={1.5} />
            ),
          }}
        />
      ))}
      {HIDDEN.map((n) => (
        <Tabs.Screen key={n} name={n} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
