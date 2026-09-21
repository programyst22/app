import React, { useState } from "react";
import { View, ScrollView, Linking, Text, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { api, fmtDate, fmtMoney } from "@/src/api";
import { useAuth, isStaff } from "@/src/auth";
import { pdfUrl } from "@/src/components/project-sections";
import { Badge, Button, Loading, Input, useToast } from "@/src/components/ui";
import { PremiumHeader } from "@/src/components/premium";
import { fonts, makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  shell: { width: "100%", alignSelf: "center", maxWidth: 900 },
  overline: {
    fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.4,
    color: c.onSurface, textTransform: "uppercase",
  },
  amount: { fontFamily: fonts.semibold, color: c.onSurface, letterSpacing: -2 },
  body: { fontFamily: fonts.regular, color: c.muted, fontSize: 14, lineHeight: 21 },
  card: {
    borderRadius: 20, borderWidth: 1, borderColor: c.border,
    backgroundColor: c.surfaceSecondary, overflow: "hidden",
  },
  line: {
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: c.divider, gap: 14,
  },
  decision: {
    backgroundColor: c.surfaceInverse,
    borderRadius: 24, padding: 24, gap: 16,
  },
}));

export default function OfferDetail() {
  const s = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const { data: o, isLoading } = useQuery({
    queryKey: ["offer", id],
    queryFn: () => api(`/offers/${id}`),
  });

  const respond = useMutation({
    mutationFn: (accept: boolean) =>
      api(`/offers/${id}/respond`, { method: "POST", json: { accept, reason } }),
    onSuccess: (r) => {
      toast.show(r.message, "success");
      qc.invalidateQueries({ queryKey: ["offer", id] });
      qc.invalidateQueries({ queryKey: ["offers"] });
      qc.invalidateQueries({ queryKey: ["client-dashboard"] });
    },
    onError: (e: any) => toast.show(e.message, "error"),
  });

  const open = o && ["SENT", "VIEWED"].includes(o.status) && !isStaff(user);
  const pad = width < 700 ? 20 : 34;
  const amountSize = width < 700 ? 44 : 62;

  return (
    <View style={s.screen}>
      <PremiumHeader title={o ? `Angebot ${o.number}` : "Angebot"} subtitle={o?.project_number} />
      {isLoading || !o ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: pad, paddingTop: 26, paddingBottom: 70 }}
          testID="offer-detail"
        >
          <View style={[s.shell, { gap: 20 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <Text style={s.overline}>ANGEBOT VOM {fmtDate(o.date)}</Text>
              <Badge status={o.status} testID="offer-status" />
            </View>

            <Text style={[s.amount, { fontSize: amountSize, lineHeight: amountSize * 1.02 }]}>
              {fmtMoney(o.total)}
            </Text>
            <Text style={s.body}>
              inkl. {o.vat_rate}% MwSt. · Version {o.version}
              {o.expiration_date ? ` · gültig bis ${fmtDate(o.expiration_date)}` : ""}
            </Text>

            <View style={s.card}>
              {o.items.map((it: any, i: number) => (
                <View key={i} style={s.line}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.semibold, color: colors.onSurface, fontSize: 15 }}>
                      {it.description}
                    </Text>
                    <Text style={[s.body, { fontSize: 12, marginTop: 4 }]}>
                      {it.quantity} {it.unit} × {fmtMoney(it.unit_price)}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: fonts.semibold, color: colors.onSurface, fontSize: 14 }}>
                    {fmtMoney(it.quantity * it.unit_price)}
                  </Text>
                </View>
              ))}

              <View style={s.line}>
                <Text style={s.body}>Netto</Text>
                <Text style={{ fontFamily: fonts.medium, color: colors.onSurface }}>{fmtMoney(o.subtotal)}</Text>
              </View>
              <View style={s.line}>
                <Text style={s.body}>MwSt. {o.vat_rate}%</Text>
                <Text style={{ fontFamily: fonts.medium, color: colors.onSurface }}>{fmtMoney(o.vat)}</Text>
              </View>
              <View style={[s.line, { borderBottomWidth: 0, paddingVertical: 20 }]}>
                <Text style={{ fontFamily: fonts.semibold, color: colors.onSurface, fontSize: 20 }}>Gesamt</Text>
                <Text style={{ fontFamily: fonts.semibold, color: colors.onSurface, fontSize: 20 }}>{fmtMoney(o.total)}</Text>
              </View>
            </View>

            {o.notes ? <Text style={s.body}>{o.notes}</Text> : null}

            <Button
              title="PDF öffnen"
              variant="light"
              onPress={() => Linking.openURL(pdfUrl(`/offers/${id}/pdf`))}
              testID="offer-pdf"
            />

            {open ? (
              <View style={s.decision}>
                <Text style={{ fontFamily: fonts.semibold, color: "#fff", fontSize: 24 }}>
                  Ihre Entscheidung
                </Text>
                <Text style={{ fontFamily: fonts.regular, color: "rgba(255,255,255,.7)", fontSize: 14, lineHeight: 22 }}>
                  Mit „Angebot annehmen“ bestätigen Sie digital den Leistungsumfang dieser Version.
                  Die digitale Annahme ersetzt keine gesetzlich vorgeschriebene Unterschrift.
                </Text>

                <Button
                  title="Angebot annehmen"
                  variant="light"
                  onPress={() => respond.mutate(true)}
                  loading={respond.isPending}
                  testID="offer-accept"
                />

                {!rejecting ? (
                  <Button
                    title="Ablehnen"
                    variant="ghostDark"
                    onPress={() => setRejecting(true)}
                    testID="offer-reject"
                  />
                ) : (
                  <>
                    <Input
                      placeholder="Grund (optional)"
                      value={reason}
                      onChangeText={setReason}
                      testID="offer-reject-reason"
                    />
                    <Button
                      title="Ablehnung bestätigen"
                      variant="ghostDark"
                      onPress={() => respond.mutate(false)}
                      loading={respond.isPending}
                      testID="offer-reject-confirm"
                    />
                  </>
                )}
              </View>
            ) : o.acceptance ? (
              <View style={s.card} testID="offer-acceptance">
                <View style={{ padding: 20, gap: 7 }}>
                  <Text style={s.overline}>
                    {o.acceptance.status === "ACCEPTED" ? "DIGITAL ANGENOMMEN" : "ABGELEHNT"}
                  </Text>
                  <Text style={s.body}>
                    {fmtDate(o.acceptance.timestamp, true)} · {o.acceptance.user_email} · Version {o.acceptance.offer_version}
                  </Text>
                  {o.acceptance.reason ? <Text style={s.body}>Grund: {o.acceptance.reason}</Text> : null}
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
