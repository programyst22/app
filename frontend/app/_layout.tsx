import React, { useEffect, useState } from "react";
import { LogBox, Platform, View, Modal, Pressable, Linking as RNLinking } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";
import { AuthProvider } from "@/src/auth";
import { ToastProvider, H3, Small, Button } from "@/src/components/ui";
import { storage } from "@/src/utils/storage";
import { useTheme, space, radius } from "@/src/theme";

LogBox.ignoreAllLogs(true);

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
  });
}

function PushNudge() {
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();
  useEffect(() => {
    if (Platform.OS === "web") return;
    (async () => {
      try {
        const { status, canAskAgain } = await Notifications.getPermissionsAsync();
        if (status !== "denied" || canAskAgain) return;
        const last = await storage.getItem("pushNudgeAt", 0);
        if (last && Date.now() - Number(last) <= 7 * 24 * 3600 * 1000) return;
        setOpen(true);
      } catch {}
    })();
  }, []);
  const close = async (openSettings: boolean) => {
    await storage.setItem("pushNudgeAt", Date.now());
    setOpen(false);
    if (openSettings) RNLinking.openSettings();
  };
  if (!open) return null;
  return (
    <Modal transparent animationType="fade" visible={open} onRequestClose={() => close(false)}>
      <Pressable style={{ flex: 1, backgroundColor: colors.scrim, justifyContent: "flex-end" }} onPress={() => close(false)}>
        <View style={{ backgroundColor: colors.surfaceSecondary, padding: space.xl, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, gap: space.md }}>
          <H3>Benachrichtigungen aktivieren</H3>
          <Small>Erhalten Sie Neuigkeiten zu Ihrem Projekt, Terminen und Dokumenten direkt aufs Gerät.</Small>
          <Button title="Einstellungen öffnen" onPress={() => close(true)} testID="push-nudge-settings" />
          <Button title="Später" variant="ghost" onPress={() => close(false)} testID="push-nudge-later" />
        </View>
      </Pressable>
    </Modal>
  );
}

function PushRouting() {
  const router = useRouter();
  useEffect(() => {
    if (Platform.OS === "web") return;
    const go = (data: any) => {
      const url = data?.deeplink || data?.action_url;
      if (!url) return;
      url.startsWith("http") ? Linking.openURL(url) : router.push(url);
    };
    const sub = Notifications.addNotificationResponseReceivedListener((r) => go(r.notification.request.content.data));
    Notifications.getLastNotificationResponseAsync().then((r) => r && go(r.notification.request.content.data));
    return () => sub.remove();
  }, [router]);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <KeyboardProvider>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <ToastProvider>
                  <StatusBar style="dark" />
                  <Stack screenOptions={{ headerShown: false, animation: "fade_from_bottom" }} />
                  <PushRouting />
                  <PushNudge />
                </ToastProvider>
              </AuthProvider>
            </QueryClientProvider>
          </KeyboardProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
