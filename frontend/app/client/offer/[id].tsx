import React, { useState } from "react";
import { View, ScrollView, Linking } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, fmtDate, fmtMoney } from "@/src/api";
import { useAuth, isStaff } from "@/src/auth";
import { pdfUrl } from "@/src/components/project-sections";
import { Eyebrow, H1, H3, Small, Caption, Badge, Card, Button, ScreenHeader, Loading, Input, useToast } from "@/src/components/ui";
import { makeStyles, useTheme, space } from "@/src/theme";

const useStyles = makeStyles((c) => ({ screen: { flex: 1, backgroundColor: c.surface }, line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: c.divider, gap: space.md } }));

export default function OfferDetail() {
  const s = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const { data: o, isLoading } = useQuery({ queryKey: ["offer", id], queryFn: () => api(`/offers/${id}`) });
  const respond = useMutation({
    mutationFn: (accept: boolean) => api(`/offers/${id}/respond`, { method: "POST", json: { accept, reason } }),
    onSuccess: (r) => { toast.show(r.message, "success"); qc.invalidateQueries({ queryKey: ["offer", id] }); qc.invalidateQueries({ queryKey: ["offers"] }); qc.invalidateQueries({ queryKey: ["client-dashboard"] }); },
    onError: (e: any) => toast.show(e.message, "error"),
  });
  const open = o && ["SENT", "VIEWED"].includes(o.status) && !isStaff(user);
  return (
    <View style={s.screen}>
      <ScreenHeader title={o ? `Angebot ${o.number}` : "Angebot"} subtitle={o?.project_number} />
      {isLoading || !o ? <Loading /> : (
        <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg, paddingBottom: space.xxxl }} testID="offer-detail">
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Eyebrow>Angebot vom {fmtDate(o.date)}</Eyebrow><Badge status={o.status} testID="offer-status" /></View>
          <H1>{fmtMoney(o.total)}</H1>
          <Caption>inkl. {o.vat_rate}% MwSt. · Version {o.version}{o.expiration_date ? ` · gültig bis ${fmtDate(o.expiration_date)}` : ""}</Caption>
          <Card style={{ gap: 0 }}>
            {o.items.map((it: any, i: number) => (
              <View key={i} style={s.line}>
                <View style={{ flex: 1 }}><Small style={{ fontWeight: "600", color: colors.onSurface }}>{it.description}</Small><Caption>{it.quantity} {it.unit} × {fmtMoney(it.unit_price)}</Caption></View>
                <Small style={{ fontWeight: "600" }}>{fmtMoney(it.quantity * it.unit_price)}</Small>
              </View>
            ))}
            <View style={[s.line, { borderBottomWidth: 0 }]}><Caption>Netto</Caption><Small>{fmtMoney(o.subtotal)}</Small></View>
            <View style={[s.line, { borderBottomWidth: 0, paddingTop: 0 }]}><Caption>MwSt. {o.vat_rate}%</Caption><Small>{fmtMoney(o.vat)}</Small></View>
            <View style={[s.line, { borderBottomWidth: 0 }]}><H3>Gesamt</H3><H3>{fmtMoney(o.total)}</H3></View>
          </Card>
          {o.notes ? <Small>{o.notes}</Small> : null}
          <Button title="PDF öffnen" variant="light" icon="document-outline" onPress={() => Linking.openURL(pdfUrl(`/offers/${id}/pdf`))} testID="offer-pdf" />
          {open ? (
            <Card dark style={{ gap: space.md }}>
              <H3 onDark>Ihre Entscheidung</H3>
              <Small style={{ color: colors.sand }}>Mit „Angebot annehmen“ bestätigen Sie digital den Leistungsumfang dieser Version. Die digitale Annahme ersetzt keine gesetzlich vorgeschriebene Unterschrift.</Small>
              <Button title="Angebot annehmen" variant="accent" onPress={() => respond.mutate(true)} loading={respond.isPending} testID="offer-accept" />
              {!rejecting ? <Button title="Ablehnen" variant="ghostDark" onPress={() => setRejecting(true)} testID="offer-reject" /> : (
                <>
                  <Input placeholder="Grund (optional)" value={reason} onChangeText={setReason} testID="offer-reject-reason" />
                  <Button title="Ablehnung bestätigen" variant="ghostDark" onPress={() => respond.mutate(false)} loading={respond.isPending} testID="offer-reject-confirm" />
                </>
              )}
            </Card>
          ) : o.acceptance ? (
            <Card style={{ gap: 4 }} testID="offer-acceptance">
              <Caption>{o.acceptance.status === "ACCEPTED" ? "Digital angenommen" : "Abgelehnt"}</Caption>
              <Small>{fmtDate(o.acceptance.timestamp, true)} · {o.acceptance.user_email} · Version {o.acceptance.offer_version}</Small>
              {o.acceptance.reason ? <Caption>Grund: {o.acceptance.reason}</Caption> : null}
            </Card>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
