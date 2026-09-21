import React from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight01Icon, Logout01Icon, Mail01Icon, UserAccountIcon } from "@hugeicons/core-free-icons";
import { isStaff, useAuth } from "@/src/auth";
import { StrokeIcon } from "@/src/components/premium";
import { fonts, makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  shell: { width: "100%", maxWidth: 760, alignSelf: "center" },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.6, color: c.muted, textTransform: "uppercase" },
  title: { fontFamily: fonts.semibold, color: c.onSurface, letterSpacing: -1.4 },
  card: { borderRadius: 26, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
  row: { minHeight: 72, paddingHorizontal: 18, paddingVertical: 15, flexDirection: "row", alignItems: "center", gap: 14, borderBottomWidth: 1, borderBottomColor: c.divider },
  icon: { width: 42, height: 42, borderRadius: 15, backgroundColor: c.surfaceSoft, alignItems: "center", justifyContent: "center" },
}));

export default function ProfileTab() {
  const s = useStyles();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();

  if (user === undefined) return null;
  if (!user || isStaff(user)) return <Redirect href="/(tabs)/mein-projekt" />;

  const Row = ({ icon, title, subtitle, onPress, last = false }: any) => (
    <Pressable style={[s.row, last && { borderBottomWidth: 0 }]} onPress={onPress}>
      <View style={s.icon}><StrokeIcon icon={icon} size={19} color={colors.onSurface} /></View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.onSurface }}>{title}</Text>
        {subtitle ? <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 3 }}>{subtitle}</Text> : null}
      </View>
      <StrokeIcon icon={ArrowRight01Icon} size={18} color={colors.muted} />
    </Pressable>
  );

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingTop: insets.top + 26, paddingHorizontal: width < 700 ? 16 : 30, paddingBottom: 118 }}>
      <View style={[s.shell, { gap: 20 }]}>
        <View>
          <Text style={s.eyebrow}>MEIN OKA</Text>
          <Text style={[s.title, { fontSize: width < 700 ? 38 : 50, lineHeight: width < 700 ? 41 : 53, marginTop: 7 }]}>Persönlich.{"\n"}Direkt verbunden.</Text>
        </View>

        <View style={[s.card, { padding: 22, gap: 8 }]}>
          <View style={[s.icon, { width: 56, height: 56, borderRadius: 20, backgroundColor: colors.surfaceInverse }]}>
            <StrokeIcon icon={UserAccountIcon} size={24} color="#fff" />
          </View>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 24, color: colors.onSurface, letterSpacing: -0.7, marginTop: 8 }}>{user.first_name} {user.last_name}</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.muted }}>{user.email}</Text>
        </View>

        <View style={s.card}>
          <Row icon={Mail01Icon} title="OKA Bau kontaktieren" subtitle="Direkter Kontakt zum Projektteam" onPress={() => router.push("/(tabs)/kontakt")} />
          <Row icon={UserAccountIcon} title="Projekt öffnen" subtitle="Alle Projektdetails und Räume" onPress={() => router.push("/(tabs)/mein-projekt")} />
          <Row icon={Logout01Icon} title="Abmelden" subtitle="Sitzung auf diesem Gerät beenden" onPress={logout} last />
        </View>
      </View>
    </ScrollView>
  );
}
