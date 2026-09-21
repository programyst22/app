import React, { useState } from "react";
import { View, ScrollView, Linking, Pressable, Text, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";

import { api, fmtDate } from "@/src/api";
import { pdfUrl } from "@/src/components/project-sections";
import { Badge, Button, Input, Loading, useToast } from "@/src/components/ui";
import { Select } from "@/src/components/forms";
import { PremiumHeader, StrokeIcon } from "@/src/components/premium";
import { fonts, makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  shell: { width: "100%", alignSelf: "center", maxWidth: 980 },
  label: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 1.25,
    color: c.onSurface,
    textTransform: "uppercase",
  },
  heading: { fontFamily: fonts.medium, color: c.onSurface, letterSpacing: -1.4 },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: c.muted },
  row: {
    minHeight: 74,
    paddingHorizontal: 18,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  panel: {
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
    borderRadius: 20,
    overflow: "hidden",
  },
  card: {
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  dark: {
    backgroundColor: c.surfaceInverse,
    borderRadius: 24,
    padding: 24,
    gap: 14,
  },
}));

function DetailRow({
  title,
  subtitle,
  onPress,
  last = false,
  testID,
}: {
  title: string;
  subtitle: string;
  onPress?: () => void;
  last?: boolean;
  testID?: string;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      testID={testID}
      style={[s.row, last && { borderBottomWidth: 0 }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.onSurface }}>{title}</Text>
        <Text style={[s.body, { marginTop: 3, fontSize: 12 }]}>{subtitle}</Text>
      </View>
      {onPress ? <StrokeIcon icon={ArrowUpRight01Icon} size={18} color={colors.onSurface} /> : null}
    </Pressable>
  );
}

export default function LeadDetail() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [note, setNote] = useState("");
  const [converted, setConverted] = useState<any>(null);

  const { data: l, isLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => api(`/leads/${id}`),
  });
  const { data: meta } = useQuery({
    queryKey: ["meta"],
    queryFn: () => api("/meta"),
  });
  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: () => api("/employees"),
  });

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["lead", id] });
    qc.invalidateQueries({ queryKey: ["leads"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };

  const patch = useMutation({
    mutationFn: (body: any) => api(`/leads/${id}`, { method: "PATCH", json: body }),
    onSuccess: () => {
      inv();
      setNote("");
    },
    onError: (e: any) => toast.show(e.message, "error"),
  });

  const convert = useMutation({
    mutationFn: () => api(`/leads/${id}/convert`, { method: "POST" }),
    onSuccess: (r) => {
      inv();
      qc.invalidateQueries({ queryKey: ["projects"] });
      setConverted(r);
      toast.show(`Projekt ${r.project.number} angelegt`, "success");
    },
    onError: (e: any) => toast.show(e.message, "error"),
  });

  const empLabels = Object.fromEntries(
    (employees || []).map((e: any) => [e.id, `${e.first_name} ${e.last_name}`]),
  );

  const pad = width < 700 ? 20 : 34;
  const headingSize = width < 700 ? 38 : 52;

  return (
    <View style={s.screen}>
      <PremiumHeader
        title={l?.name || "Anfrage"}
        subtitle={l ? `Anfrage vom ${fmtDate(l.created_at, true)}` : ""}
      />

      {isLoading || !l ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: pad, paddingTop: 26, paddingBottom: 70 }}
          testID="lead-detail"
        >
          <View style={[s.shell, { gap: 18 }]}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Text style={s.label}>{l.project_type}</Text>
              <Badge label={l.status} status={l.status} testID="lead-status" />
            </View>

            <Text
              style={[
                s.heading,
                { fontSize: headingSize, lineHeight: headingSize * 1.06 },
              ]}
            >
              {l.name}
            </Text>

            <View style={s.panel}>
              <DetailRow
                title={l.phone || "–"}
                subtitle="Telefon"
                onPress={l.phone ? () => Linking.openURL(`tel:${l.phone}`) : undefined}
                testID="lead-phone"
              />
              <DetailRow
                title={l.email || "–"}
                subtitle="E-Mail"
                onPress={l.email ? () => Linking.openURL(`mailto:${l.email}`) : undefined}
                testID="lead-email"
              />
              <DetailRow
                title={`${l.address || "–"} ${l.postal_code || ""}`.trim()}
                subtitle="Adresse"
              />
              <DetailRow title={l.desired_period || "–"} subtitle="Wunschzeitraum" />
              <DetailRow title={l.budget || "–"} subtitle="Budget" />
              <DetailRow title={l.source || "–"} subtitle="Quelle" last />
            </View>

            {l.message ? (
              <View style={s.card}>
                <Text style={s.label}>NACHRICHT</Text>
                <Text style={s.body}>{l.message}</Text>
              </View>
            ) : null}

            {l.attachments?.length ? (
              <View style={{ gap: 10 }}>
                <Text style={s.label}>ANHÄNGE</Text>
                {l.attachments.map((a: any) => (
                  <DetailRow
                    key={a.id}
                    title={a.filename}
                    subtitle={`${Math.round(a.size / 1024)} KB`}
                    onPress={() => Linking.openURL(pdfUrl(`/files/${a.id}`))}
                  />
                ))}
              </View>
            ) : null}

            <View style={s.card}>
              <Text style={s.label}>CRM</Text>
              <Select
                label="Status"
                value={l.status}
                options={meta?.lead_statuses || []}
                onChange={(v) => patch.mutate({ status: v })}
                testID="lead-status-select"
              />
              <Select
                label="Verantwortlich"
                value={l.responsible_id}
                options={(employees || []).map((e: any) => e.id)}
                labels={empLabels}
                onChange={(v) => patch.mutate({ responsible_id: v })}
                testID="lead-responsible"
              />
            </View>

            {l.converted_project_id ? (
              <View style={s.dark} testID="lead-converted">
                <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.2, color: "rgba(255,255,255,.62)" }}>
                  UMWANDLUNG
                </Text>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 25, color: "#fff" }}>
                  Projekt vorhanden
                </Text>
                <Button
                  title="Projekt öffnen"
                  variant="light"
                  onPress={() => router.push(`/admin/project/${l.converted_project_id}`)}
                  testID="lead-open-project"
                />
                {converted?.temp_password ? (
                  <Text style={{ fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: "rgba(255,255,255,.66)" }}>
                    Kundenzugang: {converted.account.email} · temporäres Passwort: {converted.temp_password}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={s.dark}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.2, color: "rgba(255,255,255,.62)" }}>
                  EIN KLICK
                </Text>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 25, color: "#fff" }}>
                  Lead in Projekt umwandeln
                </Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: "rgba(255,255,255,.68)" }}>
                  Erstellt Kunde, Kundenkonto, Projekt, Projektchat, Dokumentenbereich, Timeline und Benachrichtigung.
                </Text>
                <Button
                  title="Lead in Projekt umwandeln"
                  variant="light"
                  onPress={() => convert.mutate()}
                  loading={convert.isPending}
                  testID="lead-convert"
                />
              </View>
            )}

            <Text style={s.label}>INTERNE NOTIZEN</Text>
            {(l.notes || []).map((n: any) => (
              <View key={n.id} style={s.card}>
                <Text style={[s.body, { fontSize: 12 }]}>{fmtDate(n.created_at, true)}</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.onSurface }}>
                  {n.text}
                </Text>
              </View>
            ))}

            <Input
              placeholder="Notiz hinzufügen…"
              value={note}
              onChangeText={setNote}
              multiline
              testID="lead-note-input"
            />
            <Button
              title="Notiz speichern"
              variant="light"
              small
              onPress={() => note.trim() && patch.mutate({ notes: note.trim() })}
              testID="lead-note-submit"
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}
