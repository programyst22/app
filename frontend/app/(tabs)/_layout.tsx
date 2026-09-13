import React from "react";
import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useTheme } from "@/src/theme";

const TABS = [
  { name: "index", title: "Home", icon: "home-outline", active: "home", sf: "house" },
  { name: "leistungen", title: "Leistungen", icon: "layers-outline", active: "layers", sf: "square.stack.3d.up" },
  { name: "projekte", title: "Projekte", icon: "images-outline", active: "images", sf: "photo.on.rectangle" },
  { name: "mein-projekt", title: "Mein Projekt", icon: "cube-outline", active: "cube", sf: "cube" },
  { name: "kontakt", title: "Kontakt", icon: "chatbubble-ellipses-outline", active: "chatbubble-ellipses", sf: "bubble.left.and.bubble.right" },
] as const;

const isIOS26 = Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 26;

export default function TabsLayout() {
  const { colors } = useTheme();
  if (isIOS26) {
    return (
      <NativeTabs tintColor={colors.brandPrimary}>
        {TABS.map((t) => (
          <NativeTabs.Trigger key={t.name} name={t.name}>
            <NativeTabs.Trigger.Icon sf={t.sf as any} />
            <NativeTabs.Trigger.Label>{t.title}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    );
  }
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.onSurface,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: Platform.OS === "ios" ? "transparent" : colors.surfaceSecondary, borderTopColor: colors.border, ...(Platform.OS === "web" ? { height: 64 } : {}) },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarBackground: Platform.OS === "ios" ? () => <BlurView intensity={60} tint="light" style={{ flex: 1 }} /> : undefined,
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarButtonTestID: `tab-${t.name}`,
            tabBarIcon: ({ color, focused }) => <Ionicons name={(focused ? t.active : t.icon) as any} size={22} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
