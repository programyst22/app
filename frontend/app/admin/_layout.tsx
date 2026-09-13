import React from "react";
import { Platform } from "react-native";
import { Redirect, Tabs } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useAuth, isManagement } from "@/src/auth";
import { Loading } from "@/src/components/ui";
import { useTheme } from "@/src/theme";

const TABS = [
  { name: "index", title: "Dashboard", icon: "grid-outline" },
  { name: "crm", title: "CRM", icon: "funnel-outline" },
  { name: "projects", title: "Projekte", icon: "business-outline" },
  { name: "more", title: "Mehr", icon: "ellipsis-horizontal" },
];
const HIDDEN = ["lead/[id]", "project/[id]", "list/[entity]"];

export default function AdminLayout() {
  const { colors } = useTheme();
  const { user } = useAuth();
  if (user === undefined) return <Loading />;
  if (!isManagement(user)) return <Redirect href="/(tabs)/mein-projekt" />;
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.onSurface, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.surfaceSecondary, borderTopColor: colors.border, ...(Platform.OS === "web" ? { height: 64 } : {}) }, tabBarItemStyle: { alignSelf: "center" }, tabBarLabelStyle: { fontSize: 11, fontWeight: "600" } }}>
      {TABS.map((t) => <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title, tabBarButtonTestID: `admin-tab-${t.name}`, tabBarIcon: ({ color }) => <Ionicons name={t.icon as any} size={22} color={color} /> }} />)}
      {HIDDEN.map((n) => <Tabs.Screen key={n} name={n} options={{ href: null }} />)}
    </Tabs>
  );
}
