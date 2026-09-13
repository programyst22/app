import React, { useState } from "react";
import { View, ScrollView, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, fmtDate } from "@/src/api";
import { pdfUrl } from "@/src/components/project-sections";
import { Eyebrow, H1, H3, Small, Caption, Badge, Card, Row, Button, Input, ScreenHeader, Loading, useToast } from "@/src/components/ui";
import { Select } from "@/src/components/forms";
import { makeStyles, space } from "@/src/theme";

const useStyles = makeStyles((c) => ({ screen: { flex: 1, backgroundColor: c.surface } }));

export default function LeadDetail() {
  const s = useStyles();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [note, setNote] = useState("");
  const [converted, setConverted] = useState<any>(null);
  const { data: l, isLoading } = useQuery({ queryKey: ["lead", id], queryFn: () => api(`/leads/${id}`) });
  const { data: meta } = useQuery({ queryKey: ["meta"], queryFn: () => api("/meta") });
  const { data: employees } = useQuery({ queryKey: ["employees"], queryFn: () => api("/employees") });
  const inv = () => { qc.invalidateQueries({ queryKey: ["lead", id] }); qc.invalidateQueries({ queryKey: ["leads"] }); qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); };
  const patch = useMutation({ mutationFn: (body: any) => api(`/leads/${id}`, { method: "PATCH", json: body }), onSuccess: () => { inv(); setNote(""); }, onError: (e: any) => toast.show(e.message, "error") });
  const convert = useMutation({ mutationFn: () => api(`/leads/${id}/convert`, { method: "POST" }), onSuccess: (r) => { inv(); qc.invalidateQueries({ queryKey: ["projects"] }); setConverted(r); toast.show(`Projekt ${r.project.number} angelegt`, "success"); }, onError: (e: any) => toast.show(e.message, "error") });
  const empLabels = Object.fromEntries((employees || []).map((e: any) => [e.id, `${e.first_name} ${e.last_name}`]));
  return (
    <View style={s.screen}>
      <ScreenHeader title={l?.name || "Anfrage"} subtitle={l ? `Anfrage vom ${fmtDate(l.created_at, true)}` : ""} />
      {isLoading || !l ? <Loading /> : (
        <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg, paddingBottom: space.xxxl }} testID="lead-detail">
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Eyebrow>{l.project_type}</Eyebrow><Badge label={l.status} status={l.status} testID="lead-status" /></View>
          <H1>{l.name}</H1>
          <Card style={{ gap: 0 }}>
            <Row icon="call-outline" title={l.phone} subtitle="Telefon" onPress={() => Linking.openURL(`tel:${l.phone}`)} testID="lead-phone" />
            <Row icon="mail-outline" title={l.email} subtitle="E-Mail" onPress={() => Linking.openURL(`mailto:${l.email}`)} testID="lead-email" />
            <Row icon="location-outline" title={`${l.address || "–"} ${l.postal_code || ""}`} subtitle="Adresse" />
            <Row icon="time-outline" title={l.desired_period || "–"} subtitle="Wunschzeitraum" />
            <Row icon="cash-outline" title={l.budget || "–"} subtitle="Budget" />
            <Row icon="share-social-outline" title={l.source} subtitle="Quelle" />
          </Card>
          {l.message ? <Card><Caption>Nachricht</Caption><Small>{l.message}</Small></Card> : null}
          {l.attachments?.length ? (
            <View style={{ gap: space.sm }}><Eyebrow>Anhänge</Eyebrow>{l.attachments.map((a: any) => <Row key={a.id} icon="attach-outline" title={a.filename} subtitle={`${Math.round(a.size / 1024)} KB`} onPress={() => Linking.openURL(pdfUrl(`/files/${a.id}`))} />)}</View>
          ) : null}
          <Select label="Status" value={l.status} options={meta?.lead_statuses || []} onChange={(v) => patch.mutate({ status: v })} testID="lead-status-select" />
          <Select label="Verantwortlich" value={l.responsible_id} options={(employees || []).map((e: any) => e.id)} labels={empLabels} onChange={(v) => patch.mutate({ responsible_id: v })} testID="lead-responsible" />
          {l.converted_project_id ? (
            <Card dark style={{ gap: space.sm }} testID="lead-converted">
              <Eyebrow onDark>Umgewandelt</Eyebrow>
              <H3 onDark>Projekt vorhanden</H3>
              <Button title="Projekt öffnen" variant="accent" onPress={() => router.push(`/admin/project/${l.converted_project_id}`)} testID="lead-open-project" />
              {converted?.temp_password ? <Small onDark>Kundenzugang: {converted.account.email} · temporäres Passwort: {converted.temp_password}</Small> : null}
            </Card>
          ) : (
            <Card dark style={{ gap: space.sm }}>
              <Eyebrow onDark>Ein Klick</Eyebrow>
              <H3 onDark>Lead in Projekt umwandeln</H3>
              <Small onDark>Erstellt Kunde, Kundenkonto, Projekt, Projektchat, Dokumentenbereich, Timeline und Benachrichtigung.</Small>
              <Button title="Lead in Projekt umwandeln" variant="accent" onPress={() => convert.mutate()} loading={convert.isPending} testID="lead-convert" />
            </Card>
          )}
          <Eyebrow>Interne Notizen</Eyebrow>
          {(l.notes || []).map((n: any) => <Card key={n.id} style={{ gap: 2 }}><Caption>{fmtDate(n.created_at, true)}</Caption><Small>{n.text}</Small></Card>)}
          <Input placeholder="Notiz hinzufügen…" value={note} onChangeText={setNote} multiline testID="lead-note-input" />
          <Button title="Notiz speichern" variant="light" small onPress={() => note.trim() && patch.mutate({ notes: note.trim() })} testID="lead-note-submit" />
        </ScrollView>
      )}
    </View>
  );
}
