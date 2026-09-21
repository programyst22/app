import React from "react";
import { Platform } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { DashboardSquare01Icon, FilterHorizontalIcon, Building03Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { isManagement, useAuth } from "@/src/auth";
import { Loading } from "@/src/components/ui";
import { fonts, useTheme } from "@/src/theme";

const TABS = [
  { name: "index", title: "Control", icon: DashboardSquare01Icon },
  { name: "crm", title: "Pipeline", icon: FilterHorizontalIcon },
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
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.onSurface,
      tabBarInactiveTintColor: colors.muted,
      tabBarStyle: {
        position: "absolute",
        left: 14, right: 14, bottom: Platform.OS === "ios" ? 18 : 12,
        height: 68, paddingTop: 7, paddingBottom: 7,
        borderTopWidth: 0, borderRadius: 24,
        backgroundColor: Platform.OS === "android" ? "rgba(251,250,247,.96)" : "transparent",
        shadowColor: "#000", shadowOpacity: .12, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 12,
      },
      tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 10 },
      tabBarBackground: () => <BlurView intensity={70} tint="light" style={{ flex: 1, borderRadius: 24, overflow: "hidden" }} />,
    }}>
      {TABS.map((t) => <Tabs.Screen key={t.name} name={t.name} options={{
        title: t.title,
        tabBarButtonTestID: `admin-tab-${t.name}`,
        tabBarIcon: ({ color }) => <HugeiconsIcon icon={t.icon} size={21} color={color} strokeWidth={1.5} />,
      }} />)}
      {HIDDEN.map((n) => <Tabs.Screen key={n} name={n} options={{ href: null }} />)}
    </Tabs>
  );
}
