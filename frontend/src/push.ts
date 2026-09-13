import { Platform } from "react-native";
import { api } from "./api";

/** Registers the native device token with the Emergent managed push relay. No-op on web / Expo Go failures. */
export async function registerForPush(userId: string) {
  if (Platform.OS === "web") return;
  try {
    const Notifications = await import("expo-notifications");
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;
    const tokenResp = await Notifications.getDevicePushTokenAsync();
    await api("/auth/register-push", { method: "POST", json: { user_id: userId, platform: Platform.OS, device_token: tokenResp.data } });
  } catch (e) {
    console.warn("push registration skipped", e);
  }
}
