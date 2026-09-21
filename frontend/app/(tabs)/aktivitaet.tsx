import React from "react";
import { ScrollView, Text, View, useWindowDimensions } from "react-native";
import { Redirect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api";
import { isStaff, useAuth } from "@/src/auth";
import { Loading } from "@/src/components/ui";
import { fonts, makeStyles } from "@/src/theme";

import { Timeline, Updates } from "@/src/components/project-sections";

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  shell: { width: "100%", maxWidth: 980, alignSelf: "center" },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.6, color: c.muted, textTransform: "uppercase" },
  title: { fontFamily: fonts.semibold, color: c.onSurface, letterSpacing: -1.4 },
  empty: { borderRadius: 26, padding: 24, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
}));

export default function ActivityTab() {
  const s = useStyles();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const client = !!user && !isStaff(user);
  const { data, isLoading } = useQuery({ queryKey: ["client-dashboard"], queryFn: () => api("/client/dashboard"), enabled: client, refetchInterval: 20000 });

  if (user === undefined || (client && isLoading)) return <Loading text="Verlauf wird geladen…" />;
  if (!user || isStaff(user)) return <Redirect href="/(tabs)/mein-projekt" />;
  const p = data?.active_project;

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 26, paddingHorizontal: width < 700 ? 16 : 30, paddingBottom: 118 }}>
      <View style={[s.shell, { gap: 20 }]}>
        <View>
          <Text style={s.eyebrow}>PROJEKTVERLAUF</Text>
          <Text style={[s.title, { fontSize: width < 700 ? 38 : 50, lineHeight: width < 700 ? 41 : 53, marginTop: 7 }]}>Was passiert{"\n"}auf der Baustelle?</Text>
        </View>
        {!p ? (
          <View style={s.empty}><Text style={{ fontFamily: fonts.medium, fontSize: 16 }}>Noch kein aktives Projekt.</Text></View>
        ) : (
          <>
            <Updates projectId={p.id} />
            <Text style={s.eyebrow}>GESAMTER VERLAUF</Text>
            <Timeline projectId={p.id} />
          </>
        )}
      </View>
    </ScrollView>
  );
}
