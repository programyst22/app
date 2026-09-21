import React, { useState } from "react";
import {
  View,
  ScrollView,
  Linking,
  Pressable,
  Text,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";

import { api, abs, upload, fmtDate, fmtMoney } from "@/src/api";
import { useAuth, isAdmin } from "@/src/auth";
import {
  Badge,
  Button,
  Input,
  Loading,
  Empty,
  ChipRow,
  useToast,
} from "@/src/components/ui";
import { Select, Toggle, Sheet, usePickers } from "@/src/components/forms";
import { pdfUrl } from "@/src/components/project-sections";
import { MediaPicker, ImageField } from "@/src/components/MediaPicker";
import { PremiumHeader, StrokeIcon, ZoomImage } from "@/src/components/premium";
import { makeStyles, useTheme, fonts } from "@/src/theme";

const TITLES: Record<string, string> = {
  customers: "Kunden",
  employees: "Mitarbeiter",
  tasks: "Aufgaben",
  calendar: "Kalender",
  messages: "Nachrichten",
  offers: "Angebote",
  invoices: "Rechnungen",
  portfolio: "Portfolio",
  cms: "CMS",
  media: "Medien",
  notifications: "Benachrichtigungen",
  analytics: "Analytics",
  activity: "Aktivitätsprotokoll",
  settings: "Einstellungen",
};

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  shell: { width: "100%", alignSelf: "center", maxWidth: 1100 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
    padding: 20,
    gap: 10,
  },
  row: {
    minHeight: 72,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 1.25,
    color: c.onSurface,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: c.onSurface,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: c.muted,
  },
  metric: {
    flex: 1,
    minWidth: 155,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
    padding: 20,
    gap: 7,
  },
  metricValue: {
    fontFamily: fonts.semibold,
    fontSize: 30,
    letterSpacing: -1,
    color: c.onSurface,
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: 14,
    backgroundColor: c.surfaceTertiary,
  },
}));

function Label({ children }: { children: React.ReactNode }) {
  const s = useStyles();
  return <Text style={s.label}>{children}</Text>;
}

function CardBox({
  children,
  testID,
  style,
}: {
  children: React.ReactNode;
  testID?: string;
  style?: any;
}) {
  const s = useStyles();
  return (
    <View style={[s.card, style]} testID={testID}>
      {children}
    </View>
  );
}

function ListRow({
  title,
  subtitle,
  onPress,
  right,
  testID,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  testID?: string;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={s.row}
      testID={testID}
    >
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{title}</Text>
        {subtitle ? <Text style={[s.body, { marginTop: 3, fontSize: 12 }]}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <StrokeIcon icon={ArrowUpRight01Icon} size={19} color={colors.onSurface} /> : null)}
    </Pressable>
  );
}

function Metric({ label, value }: { label: string; value: any }) {
  const s = useStyles();
  return (
    <View style={s.metric}>
      <Text style={s.metricValue}>{value}</Text>
      <Text style={[s.body, { fontSize: 13 }]}>{label}</Text>
    </View>
  );
}

function useList(key: string, path: string, opts: any = {}) {
  return useQuery<any>({
    queryKey: [key],
    queryFn: () => api(path),
    ...opts,
  });
}

export default function EntityList() {
  const s = useStyles();
  const { entity } = useLocalSearchParams<{ entity: string }>();
  const { width } = useWindowDimensions();
  const pad = width < 700 ? 20 : 34;

  return (
    <View style={s.screen}>
      <PremiumHeader title={TITLES[entity] || entity} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: pad,
          paddingTop: 24,
          paddingBottom: 80,
        }}
        testID={`list-${entity}`}
      >
        <View style={[s.shell, { gap: 14 }]}>
          {entity === "customers" ? (
            <Customers />
          ) : entity === "employees" ? (
            <Employees />
          ) : entity === "tasks" ? (
            <Tasks />
          ) : entity === "calendar" ? (
            <Calendar />
          ) : entity === "messages" ? (
            <Inbox />
          ) : entity === "offers" ? (
            <OffersAll />
          ) : entity === "invoices" ? (
            <InvoicesAll />
          ) : entity === "portfolio" ? (
            <Portfolio />
          ) : entity === "cms" ? (
            <Cms />
          ) : entity === "media" ? (
            <Media />
          ) : entity === "notifications" ? (
            <Notifs />
          ) : entity === "analytics" ? (
            <Analytics />
          ) : entity === "activity" ? (
            <Activity />
          ) : entity === "settings" ? (
            <Settings />
          ) : (
            <Empty title="Unbekannt" />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Customers() {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<any>(null);
  const [f, setF] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    postal_code: "",
    city: "",
  });

  const { data, isLoading } = useList("customers", "/customers");
  const { data: detail } = useQuery({
    queryKey: ["customer", sel?.id],
    queryFn: () => api(`/customers/${sel.id}`),
    enabled: !!sel,
  });

  const create = useMutation({
    mutationFn: () => api("/customers", { method: "POST", json: f }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      setOpen(false);
      toast.show("Kunde angelegt", "success");
    },
    onError: (e: any) => toast.show(e.message, "error"),
  });

  if (isLoading) return <Loading />;

  return (
    <>
      <Button title="Kunde anlegen" onPress={() => setOpen(true)} testID="customer-new" />
      {!data?.length ? (
        <Empty title="Keine Kunden" />
      ) : (
        data.map((c: any) => (
          <ListRow
            key={c.id}
            title={c.name}
            subtitle={`${c.email} · ${c.phone || ""}`}
            onPress={() => setSel(c)}
            testID={`customer-${c.id}`}
          />
        ))
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Neuer Kunde" testID="sheet-customer">
        {(["name", "email", "phone", "address", "postal_code", "city"] as const).map((k) => (
          <Input
            key={k}
            label={{
              name: "Name",
              email: "E-Mail",
              phone: "Telefon",
              address: "Adresse",
              postal_code: "PLZ",
              city: "Ort",
            }[k]}
            value={(f as any)[k]}
            onChangeText={(v) => setF({ ...f, [k]: v })}
            autoCapitalize={k === "email" ? "none" : "sentences"}
            testID={`cust-${k}`}
          />
        ))}
        <Button
          title="Anlegen"
          onPress={() => create.mutate()}
          loading={create.isPending}
          disabled={!f.name || !f.email}
          testID="cust-submit"
        />
      </Sheet>

      <Sheet
        open={!!sel}
        onClose={() => setSel(null)}
        title={sel?.name || ""}
        testID="sheet-customer-detail"
      >
        {!detail ? (
          <Loading />
        ) : (
          <>
            <ListRow
              title={detail.email}
              subtitle={detail.phone || "–"}
              onPress={() => Linking.openURL(`mailto:${detail.email}`)}
            />
            <ListRow
              title={`${detail.address || "–"}, ${detail.postal_code || ""} ${detail.city || ""}`}
              subtitle="Adresse"
            />
            <Label>PROJEKTE ({detail.projects.length})</Label>
            {detail.projects.map((p: any) => (
              <ListRow
                key={p.id}
                title={`${p.number} · ${p.name}`}
                subtitle={p.stage}
                onPress={() => {
                  setSel(null);
                  router.push(`/admin/project/${p.id}`);
                }}
              />
            ))}
            <Label>
              ANGEBOTE {detail.offers.length} · RECHNUNGEN {detail.invoices.length} · TERMINE{" "}
              {detail.appointments.length} · DOKUMENTE {detail.documents.length}
            </Label>
            <Label>KUNDENKONTEN</Label>
            {detail.users.map((u: any) => (
              <Text key={u.id} style={useStyles().body}>
                {u.email} · {u.role}
              </Text>
            ))}
            <Label>AKTIVITÄT</Label>
            {detail.activity.slice(0, 10).map((a: any) => (
              <Text key={a.id} style={useStyles().body}>
                {fmtDate(a.created_at, true)} · {a.action} · {a.user_name}
              </Text>
            ))}
          </>
        )}
      </Sheet>
    </>
  );
}

function Employees() {
  const s = useStyles();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    role: "EMPLOYEE",
    phone: "",
    can_publish_client_updates: false,
  });

  const { data, isLoading } = useList("employees", "/employees");
  const { data: meta } = useList("meta", "/meta");

  const create = useMutation({
    mutationFn: () => api("/employees", { method: "POST", json: f }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      setOpen(false);
      toast.show("Mitarbeiter angelegt", "success");
    },
    onError: (e: any) => toast.show(e.message, "error"),
  });

  const patch = useMutation({
    mutationFn: ({ id, body }: any) =>
      api(`/employees/${id}`, { method: "PATCH", json: body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
    onError: (e: any) => toast.show(e.message, "error"),
  });

  if (isLoading) return <Loading />;
  const roles = (meta?.roles || []).filter((r: string) => r !== "CLIENT");

  return (
    <>
      {isAdmin(user) ? (
        <Button title="Mitarbeiter anlegen" onPress={() => setOpen(true)} testID="employee-new" />
      ) : null}

      {(data || []).map((e: any) => (
        <CardBox key={e.id} testID={`employee-${e.id}`}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Text style={s.title}>
              {e.first_name} {e.last_name}
            </Text>
            <Badge label={e.role} status={e.disabled ? "CANCELLED" : "ACTIVE"} />
          </View>
          <Text style={s.body}>
            {e.email}
            {e.phone ? ` · ${e.phone}` : ""}
          </Text>

          {isAdmin(user) ? (
            <>
              <Select
                label="Rolle"
                value={e.role}
                options={roles}
                onChange={(v) => patch.mutate({ id: e.id, body: { role: v } })}
                testID={`employee-role-${e.id}`}
              />
              <Toggle
                label="Darf kundensichtbare Updates veröffentlichen"
                value={!!e.can_publish_client_updates}
                onChange={(v) =>
                  patch.mutate({
                    id: e.id,
                    body: { can_publish_client_updates: v },
                  })
                }
                testID={`employee-publish-${e.id}`}
              />
              <Toggle
                label="Konto deaktiviert"
                value={!!e.disabled}
                onChange={(v) => patch.mutate({ id: e.id, body: { disabled: v } })}
                testID={`employee-disabled-${e.id}`}
              />
            </>
          ) : null}
        </CardBox>
      ))}

      <Sheet open={open} onClose={() => setOpen(false)} title="Neuer Mitarbeiter" testID="sheet-employee">
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Input
              label="Vorname"
              value={f.first_name}
              onChangeText={(v) => setF({ ...f, first_name: v })}
              testID="emp-first"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Nachname"
              value={f.last_name}
              onChangeText={(v) => setF({ ...f, last_name: v })}
              testID="emp-last"
            />
          </View>
        </View>
        <Input
          label="E-Mail"
          value={f.email}
          onChangeText={(v) => setF({ ...f, email: v })}
          autoCapitalize="none"
          testID="emp-email"
        />
        <Input label="Telefon" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} testID="emp-phone" />
        <Input
          label="Passwort (min. 8)"
          value={f.password}
          onChangeText={(v) => setF({ ...f, password: v })}
          secureTextEntry
          testID="emp-password"
        />
        <Select
          label="Rolle"
          value={f.role}
          options={roles}
          onChange={(v) => setF({ ...f, role: v })}
          testID="emp-role"
        />
        <Toggle
          label="Kundensichtbare Updates erlaubt"
          value={f.can_publish_client_updates}
          onChange={(v) => setF({ ...f, can_publish_client_updates: v })}
          testID="emp-publish"
        />
        <Button
          title="Anlegen"
          onPress={() => create.mutate()}
          loading={create.isPending}
          disabled={!f.email || !f.first_name || f.password.length < 8}
          testID="emp-submit"
        />
      </Sheet>
    </>
  );
}

function Tasks() {
  const router = useRouter();
  const { data, isLoading } = useList("all-tasks", "/tasks");
  if (isLoading) return <Loading />;

  const list = [...(data || [])].sort(
    (a: any, b: any) => Number(b.overdue) - Number(a.overdue),
  );

  return !list.length ? (
    <Empty title="Keine Aufgaben" />
  ) : (
    <>
      {list.map((t: any) => (
        <ListRow
          key={t.id}
          title={t.title}
          subtitle={`${t.project_number} · fällig ${fmtDate(t.due_date)}${t.overdue ? " · ÜBERFÄLLIG" : ""}`}
          right={<Badge status={t.status} label={t.status} />}
          onPress={() =>
            router.push({
              pathname: `/admin/project/${t.project_id}`,
              params: { tab: "Aufgaben" },
            })
          }
          testID={`all-task-${t.id}`}
        />
      ))}
    </>
  );
}

function Calendar() {
  const router = useRouter();
  const [view, setView] = useState<"Tag" | "Woche" | "Monat">("Woche");
  const [type, setType] = useState("Alle");
  const { data: meta } = useList("meta", "/meta");

  const now = new Date();
  const end = new Date(now);
  end.setDate(now.getDate() + (view === "Tag" ? 1 : view === "Woche" ? 7 : 31));

  const { data, isLoading } = useQuery({
    queryKey: ["cal", view, type],
    queryFn: () =>
      api(
        `/appointments?start=${now.toISOString().slice(0, 10)}&end=${end.toISOString()}${
          type !== "Alle" ? `&type=${encodeURIComponent(type)}` : ""
        }`,
      ),
  });

  const groups: Record<string, any[]> = {};
  (data || []).forEach(
    (a: any) =>
      (groups[fmtDate(a.start)] = [...(groups[fmtDate(a.start)] || []), a]),
  );

  return (
    <>
      <View style={{ marginHorizontal: -20 }}>
        <ChipRow items={["Tag", "Woche", "Monat"]} value={view} onChange={setView} testID="cal-view" />
      </View>
      <View style={{ marginHorizontal: -20 }}>
        <ChipRow
          items={["Alle", ...(meta?.appointment_types || [])]}
          value={type}
          onChange={setType}
          testID="cal-type"
        />
      </View>

      {isLoading ? (
        <Loading />
      ) : !Object.keys(groups).length ? (
        <Empty title="Keine Termine im Zeitraum" />
      ) : (
        Object.entries(groups).map(([d, items]) => (
          <View key={d} style={{ gap: 9 }}>
            <Label>{d}</Label>
            {items.map((a: any) => (
              <ListRow
                key={a.id}
                title={`${a.start.slice(11, 16)} · ${a.type} · ${a.title}`}
                subtitle={`${a.project_number || ""}${a.location ? ` · ${a.location}` : ""}`}
                right={<Badge status={a.confirmation_status} />}
                onPress={
                  a.project_id
                    ? () =>
                        router.push({
                          pathname: `/admin/project/${a.project_id}`,
                          params: { tab: "Termine" },
                        })
                    : undefined
                }
                testID={`cal-${a.id}`}
              />
            ))}
          </View>
        ))
      )}
    </>
  );
}

function Inbox() {
  const router = useRouter();
  const { data, isLoading } = useList("inbox", "/messages/inbox", {
    refetchInterval: 10000,
  });

  if (isLoading) return <Loading />;
  return !data?.length ? (
    <Empty title="Keine Chats" />
  ) : (
    <>
      {data.map((c: any) => (
        <ListRow
          key={c.project_id}
          title={`${c.project_number} · ${c.customer_name || c.project_name}`}
          subtitle={
            c.last_message
              ? `${c.last_message.sender_name}: ${c.last_message.text}`
              : "Noch keine Nachrichten"
          }
          right={
            c.unread ? <Badge status="IN_PROGRESS" label={String(c.unread)} /> : undefined
          }
          onPress={() => router.push(`/client/chat/${c.project_id}`)}
          testID={`inbox-${c.project_id}`}
        />
      ))}
    </>
  );
}

function OffersAll() {
  const router = useRouter();
  const { data, isLoading } = useList("offers-all", "/offers");
  if (isLoading) return <Loading />;

  return !data?.length ? (
    <Empty title="Keine Angebote" />
  ) : (
    <>
      {data.map((o: any) => (
        <ListRow
          key={o.id}
          title={`${o.number} · ${fmtMoney(o.total)}`}
          subtitle={`${o.customer_name} · ${o.project_number || ""} · ${fmtDate(o.date)}`}
          right={<Badge status={o.status} />}
          onPress={() =>
            router.push(
              o.project_id
                ? { pathname: `/admin/project/${o.project_id}`, params: { tab: "Angebote" } }
                : `/client/offer/${o.id}`,
            )
          }
          testID={`offers-all-${o.id}`}
        />
      ))}
    </>
  );
}

function InvoicesAll() {
  const { data, isLoading } = useList("invoices-all", "/invoices");
  if (isLoading) return <Loading />;

  return !data?.length ? (
    <Empty title="Keine Rechnungen" />
  ) : (
    <>
      {data.map((i: any) => (
        <ListRow
          key={i.id}
          title={`${i.number} · ${fmtMoney(i.total)}`}
          subtitle={`${i.customer_name} · fällig ${fmtDate(i.due_date)}`}
          right={<Badge status={i.status} />}
          onPress={() => Linking.openURL(pdfUrl(`/invoices/${i.id}/pdf`))}
          testID={`invoices-all-${i.id}`}
        />
      ))}
    </>
  );
}

function Portfolio() {
  const s = useStyles();
  const toast = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState(false);
  const [f, setF] = useState<any>({
    title: "",
    category: "",
    description: "",
    location: "",
    cover_url: "",
    photo_urls: [],
    featured: false,
    published: false,
  });

  const { data, isLoading } = useList("portfolio-all", "/portfolio?all=true");
  const { data: meta } = useList("meta", "/meta");

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["portfolio-all"] });
    qc.invalidateQueries({ queryKey: ["portfolio"] });
  };

  const create = useMutation({
    mutationFn: () => api("/portfolio", { method: "POST", json: f }),
    onSuccess: () => {
      inv();
      setOpen(false);
      toast.show("Portfolio-Eintrag angelegt", "success");
    },
    onError: (e: any) => toast.show(e.message, "error"),
  });

  const patch = useMutation({
    mutationFn: ({ id, body }: any) =>
      api(`/portfolio/${id}`, { method: "PATCH", json: body }),
    onSuccess: inv,
    onError: (e: any) => toast.show(e.message, "error"),
  });

  if (isLoading) return <Loading />;

  return (
    <>
      <Button
        title={open ? "Formular schließen" : "Eintrag anlegen"}
        variant={open ? "light" : "primary"}
        onPress={() => setOpen(!open)}
        testID="portfolio-new"
      />

      {open ? (
        <CardBox testID="portfolio-form">
          <Input label="Titel" value={f.title} onChangeText={(v) => setF({ ...f, title: v })} testID="pf-title" />
          <Select
            label="Kategorie"
            value={f.category || null}
            options={(meta?.services || []).map((x: any) => x.title)}
            onChange={(v) => setF({ ...f, category: v })}
            testID="pf-category"
          />
          <Input
            label="Beschreibung"
            value={f.description}
            onChangeText={(v) => setF({ ...f, description: v })}
            multiline
            testID="pf-desc"
          />
          <Input
            label="Ort (optional)"
            value={f.location}
            onChangeText={(v) => setF({ ...f, location: v })}
            testID="pf-location"
          />
          <ImageField
            label="Cover"
            value={f.cover_url}
            onChange={(v) => setF({ ...f, cover_url: v || "" })}
            testID="pf-cover"
          />
          <Button
            title={`Fotos wählen (${f.photo_urls.length})`}
            small
            variant="light"
            onPress={() => setPick(true)}
            testID="pf-photos"
          />
          <Toggle
            label="Veröffentlichen"
            value={f.published}
            onChange={(v) => setF({ ...f, published: v })}
            testID="pf-published"
          />
          <Toggle
            label="Hervorgehoben"
            value={f.featured}
            onChange={(v) => setF({ ...f, featured: v })}
            testID="pf-featured"
          />
          <Text style={s.body}>
            Nur freigegebene Medien aus der Bibliothek – private Kundendaten werden nie automatisch veröffentlicht.
          </Text>
          <Button
            title="Speichern"
            onPress={() => create.mutate()}
            loading={create.isPending}
            disabled={!f.title || !f.category}
            testID="pf-submit"
          />
        </CardBox>
      ) : null}

      {(data || []).map((p: any) => (
        <CardBox key={p.id} testID={`pf-${p.id}`}>
          <View style={{ flexDirection: "row", gap: 14 }}>
            {p.cover ? (
              <ZoomImage source={{ uri: abs(p.cover) }} style={s.thumb} />
            ) : (
              <View style={s.thumb} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.label}>{p.category}</Text>
              <Text style={[s.title, { fontSize: 18, marginTop: 5 }]}>{p.title}</Text>
              <Text style={[s.body, { fontSize: 12, marginTop: 5 }]}>
                {p.photos?.length || 0} Fotos{p.source ? ` · Quelle ${p.source}` : ""}
              </Text>
            </View>
          </View>
          <Toggle
            label="Veröffentlicht"
            value={!!p.published}
            onChange={(v) => patch.mutate({ id: p.id, body: { published: v } })}
            testID={`pf-pub-${p.id}`}
          />
          <Toggle
            label="Hervorgehoben"
            value={!!p.featured}
            onChange={(v) => patch.mutate({ id: p.id, body: { featured: v } })}
            testID={`pf-feat-${p.id}`}
          />
        </CardBox>
      ))}

      <MediaPicker
        open={pick}
        onClose={() => setPick(false)}
        multiple
        title="Projektfotos (Bibliothek)"
        onPick={(items) =>
          setF({
            ...f,
            photo_urls: items.map((i) => i.url.split("?")[0]),
            cover_url: f.cover_url || items[0]?.url.split("?")[0] || "",
          })
        }
      />
    </>
  );
}

function Cms() {
  const s = useStyles();
  const toast = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useList("cms", "/cms");
  const [key, setKey] = useState("brand");
  const [draft, setDraft] = useState<any>(null);

  const save = useMutation({
    mutationFn: (body: any) => api(`/cms/${key}`, { method: "PUT", json: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms"] });
      setDraft(null);
      toast.show("Inhalt gespeichert – sofort live", "success");
    },
    onError: (e: any) => toast.show(e.message, "error"),
  });

  if (isLoading) return <Loading />;

  const labels: Record<string, string> = {
    brand: "Logo & Marke",
    hero: "Hero",
    services: "Leistungen",
    about: "Über OKA Bau / Werte",
    katharina: "Katharina Kling",
    process: "Ablauf",
    faq: "FAQ",
    contact: "Kontakt & Rechtliches",
    announcements: "Ankündigungen",
  };

  const cur = draft ?? data?.[key] ?? {};
  const set = (k: string, v: any) => setDraft({ ...cur, [k]: v });

  const IMAGE_FIELDS: Record<string, [string, string][]> = {
    brand: [
      ["logo", "Logo (hell, für dunkle Flächen)"],
      ["logo_dark", "Logo (dunkel)"],
    ],
    hero: [["image", "Hero-Bild (Hintergrund / 2D-Fallback)"]],
    about: [["image", "Bild Über uns"]],
    katharina: [["image", "Portrait Katharina Kling"]],
    contact: [["image", "Bild Kontakt"]],
  };

  const TEXT_FIELDS: Record<string, [string, string][]> = {
    hero: [
      ["eyebrow", "Eyebrow"],
      ["subtitle", "Untertitel"],
      ["cta", "CTA"],
      ["cta_secondary", "Zweiter CTA"],
    ],
    about: [
      ["eyebrow", "Eyebrow"],
      ["headline", "Headline"],
      ["text", "Text"],
    ],
    katharina: [
      ["name", "Name"],
      ["title", "Titel"],
      ["quote", "Zitat"],
    ],
    contact: [
      ["headline", "Headline"],
      ["phone", "Telefon"],
      ["email", "E-Mail"],
      ["address", "Adresse"],
    ],
    services: [
      ["eyebrow", "Eyebrow"],
      ["headline", "Headline"],
    ],
    faq: [
      ["eyebrow", "Eyebrow"],
      ["headline", "Headline"],
    ],
    process: [
      ["eyebrow", "Eyebrow"],
      ["headline", "Headline"],
    ],
  };

  return (
    <>
      <Text style={s.body}>
        Inhalte der App/Website ohne Code bearbeiten. Bilder kommen aus der Medienbibliothek mit echten OKA-Bau-Assets.
      </Text>
      <View style={{ marginHorizontal: -20 }}>
        <ChipRow
          items={Object.keys(labels)}
          value={key}
          onChange={(k) => {
            setKey(k);
            setDraft(null);
          }}
          labels={labels}
          testID="cms-key"
        />
      </View>

      {(IMAGE_FIELDS[key] || []).map(([f, l]) => (
        <ImageField
          key={f}
          label={l}
          value={cur[f]}
          onChange={(v) => set(f, v)}
          testID={`cms-img-${f}`}
        />
      ))}

      {(TEXT_FIELDS[key] || []).map(([f, l]) => (
        <Input
          key={f}
          label={l}
          value={String(cur[f] ?? "")}
          onChangeText={(v) => set(f, v)}
          multiline={f === "text" || f === "quote"}
          testID={`cms-${f}`}
        />
      ))}

      {key === "services"
        ? (cur.items || []).map((it: any, i: number) => (
            <CardBox key={it.key}>
              <Text style={s.title}>{it.title}</Text>
              <Input
                label="Kurztext"
                value={it.short}
                onChangeText={(v) =>
                  set(
                    "items",
                    cur.items.map((x: any, j: number) =>
                      j === i ? { ...x, short: v } : x,
                    ),
                  )
                }
                testID={`cms-service-${it.key}`}
              />
              <ImageField
                label="Bild"
                value={it.image}
                onChange={(v) =>
                  set(
                    "items",
                    cur.items.map((x: any, j: number) =>
                      j === i ? { ...x, image: v } : x,
                    ),
                  )
                }
                testID={`cms-service-img-${it.key}`}
              />
            </CardBox>
          ))
        : null}

      {["faq", "process", "about", "announcements"].includes(key) ? (
        <Input
          label="Erweitert (JSON)"
          value={JSON.stringify(cur, null, 2)}
          onChangeText={(v) => {
            try {
              setDraft(JSON.parse(v));
            } catch {
              // ignore while JSON is incomplete
            }
          }}
          multiline
          style={{ minHeight: 220, fontSize: 12 }}
          autoCapitalize="none"
          testID="cms-editor"
        />
      ) : null}

      <Button
        title="Speichern"
        onPress={() => save.mutate(cur)}
        loading={save.isPending}
        disabled={!draft}
        testID="cms-save"
      />
    </>
  );
}

function Media() {
  const s = useStyles();
  const toast = useToast();
  const qc = useQueryClient();
  const { pickImages, pickDocument } = usePickers();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["media-lib", q],
    queryFn: () => api(`/media${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  });

  const del = useMutation({
    mutationFn: (id: string) => api(`/files/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media-lib"] });
      toast.show("Datei entfernt", "success");
    },
    onError: (e: any) => toast.show(e.message, "error"),
  });

  const up = async (kind: "images" | "doc") => {
    const files =
      kind === "images" ? await pickImages() : [await pickDocument()].filter(Boolean);
    if (!files.length) return;

    setBusy(true);
    try {
      await upload("/media", files as any, { category: "Allgemein" });
      qc.invalidateQueries({ queryKey: ["media-lib"] });
      toast.show("Hochgeladen", "success");
    } catch (e: any) {
      toast.show(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        <Button
          title="Bilder / Videos"
          small
          onPress={() => up("images")}
          loading={busy}
          testID="media-upload-images"
        />
        <Button
          title="PDF / GLB"
          small
          variant="light"
          onPress={() => up("doc")}
          loading={busy}
          testID="media-upload-doc"
        />
      </View>

      <Input placeholder="Suchen…" value={q} onChangeText={setQ} testID="media-search" />

      {isLoading ? (
        <Loading />
      ) : !data?.length ? (
        <Empty title="Keine Medien" />
      ) : (
        data.map((m: any) => (
          <CardBox key={m.id} testID={`media-${m.id}`}>
            <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
              {m.content_type?.startsWith("image") ? (
                <ZoomImage source={{ uri: abs(m.url) }} style={s.thumb} />
              ) : (
                <View style={[s.thumb, { alignItems: "center", justifyContent: "center" }]}>
                  <Text style={s.label}>
                    {m.content_type?.split("/")[1]?.toUpperCase().slice(0, 6)}
                  </Text>
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text style={s.title} numberOfLines={1}>
                  {m.title || m.filename}
                </Text>
                <Text style={[s.body, { fontSize: 12, marginTop: 4 }]}>
                  {m.kind} · {m.category || "–"} · {Math.round((m.size || 0) / 1024)} KB · {fmtDate(m.created_at)}
                </Text>

                <View style={{ flexDirection: "row", gap: 14, marginTop: 9 }}>
                  <Pressable
                    onPress={() => Linking.openURL(abs(m.url)!)}
                    testID={`media-open-${m.id}`}
                  >
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: "#111" }}>
                      Öffnen
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => del.mutate(m.id)}
                    testID={`media-delete-${m.id}`}
                  >
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: "#111" }}>
                      Löschen
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </CardBox>
        ))
      )}
    </>
  );
}

function Notifs() {
  const s = useStyles();
  const qc = useQueryClient();
  const { data, isLoading } = useList("notifications", "/notifications");
  const { data: outbox } = useList("outbox", "/email-outbox");

  const read = useMutation({
    mutationFn: () => api("/notifications/read", { method: "POST", json: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (isLoading) return <Loading />;

  return (
    <>
      <CardBox testID="push-action-required">
        <Badge status="WAITING" label="ACTION REQUIRED" />
        <Text style={[s.title, { fontSize: 20 }]}>Firebase google-services.json</Text>
        <Text style={s.body}>
          Die komplette Expo-Push-Infrastruktur ist implementiert. Damit Pushs auf Geräten ankommen,
          muss die Firebase-Datei google-services.json bereitgestellt und danach ein nativer Build
          erzeugt werden. Bis dahin laufen Ereignisse als In-App-Benachrichtigung und E-Mail-Postausgang.
        </Text>
      </CardBox>

      <Button
        title="Alle als gelesen markieren"
        small
        variant="light"
        onPress={() => read.mutate()}
        testID="notifs-read-all"
      />

      {(data || []).map((n: any) => (
        <ListRow
          key={n.id}
          title={n.title}
          subtitle={`${n.message} · ${fmtDate(n.created_at, true)}`}
          testID={`notif-${n.id}`}
        />
      ))}

      <Label>E-MAIL-POSTAUSGANG</Label>
      {(outbox || []).slice(0, 30).map((e: any) => (
        <ListRow
          key={e.id}
          title={e.subject}
          subtitle={`${e.to} · ${e.template} · ${e.status}`}
        />
      ))}
    </>
  );
}

function Analytics() {
  const s = useStyles();
  const { data, isLoading } = useList("analytics", "/analytics");
  if (isLoading || !data) return <Loading />;

  return (
    <>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <Metric label="Leads gesamt" value={data.leads_total} />
        <Metric label="Lead-Conversion" value={`${data.lead_conversion_rate}%`} />
        <Metric
          label="Ø Reaktionszeit"
          value={data.avg_response_hours != null ? `${data.avg_response_hours} h` : "–"}
        />
        <Metric label="Aktive Projekte" value={data.active_projects} />
        <Metric label="Überfällige Aufgaben" value={data.overdue_tasks} />
        <Metric
          label="Angebotsannahme"
          value={data.offer_acceptance_rate != null ? `${data.offer_acceptance_rate}%` : "–"}
        />
      </View>

      <Label>LEADS NACH STATUS</Label>
      {Object.entries(data.leads_by_status).map(([k, v]: any) => (
        <ListRow key={k} title={k} right={<Text style={s.title}>{v}</Text>} />
      ))}

      <Label>LEAD-QUELLEN</Label>
      {Object.entries(data.lead_sources).map(([k, v]: any) => (
        <ListRow key={k} title={k} right={<Text style={s.title}>{v}</Text>} />
      ))}

      <Label>PROJEKTE NACH PHASE</Label>
      {Object.entries(data.projects_by_stage).map(([k, v]: any) => (
        <ListRow key={k} title={k} right={<Text style={s.title}>{v}</Text>} />
      ))}

      <Text style={s.body}>
        Datenschutzfreundlich: keine personenbezogenen Kundendaten in dieser Ansicht.
      </Text>
    </>
  );
}

function Activity() {
  const s = useStyles();
  const { data, isLoading } = useList("activity", "/activity");
  if (isLoading) return <Loading />;

  return (
    <>
      {(data || []).map((a: any) => (
        <CardBox key={a.id} testID={`activity-${a.id}`}>
          <Text style={[s.body, { fontSize: 12 }]}>
            {fmtDate(a.created_at, true)} · {a.user_name}
          </Text>
          <Text style={s.title}>
            {a.action} · {a.entity}
          </Text>
          {a.old_value != null || a.new_value != null ? (
            <Text style={[s.body, { fontSize: 12 }]} numberOfLines={3}>
              {a.old_value != null ? `alt: ${JSON.stringify(a.old_value)} → ` : ""}
              {a.new_value != null ? `neu: ${JSON.stringify(a.new_value)}` : ""}
            </Text>
          ) : null}
        </CardBox>
      ))}
    </>
  );
}

function Settings() {
  const s = useStyles();
  const toast = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useList("settings", "/settings");
  const [f, setF] = useState<any>(null);

  const save = useMutation({
    mutationFn: () =>
      api("/settings", {
        method: "PUT",
        json: {
          ...f,
          workflow_stages: f.workflow_stages
            .split("\n")
            .map((x: string) => x.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["meta"] });
      toast.show("Einstellungen gespeichert", "success");
    },
    onError: (e: any) => toast.show(e.message, "error"),
  });

  if (isLoading || !data) return <Loading />;
  const v = f || { ...data, workflow_stages: data.workflow_stages.join("\n") };

  return (
    <>
      <Input
        label="Projektnummer-Format"
        value={v.project_number_format}
        onChangeText={(x) => setF({ ...v, project_number_format: x })}
        autoCapitalize="none"
        testID="set-project-format"
      />
      <Input
        label="Angebotsnummer-Format"
        value={v.offer_number_format}
        onChangeText={(x) => setF({ ...v, offer_number_format: x })}
        autoCapitalize="none"
        testID="set-offer-format"
      />
      <Input
        label="Rechnungsnummer-Format"
        value={v.invoice_number_format}
        onChangeText={(x) => setF({ ...v, invoice_number_format: x })}
        autoCapitalize="none"
        testID="set-invoice-format"
      />

      <Text style={s.body}>
        Platzhalter: {"{year}"} und {"{seq:04d}"} · Beispiel OKA-{"{year}"}-{"{seq:04d}"} → OKA-2026-0001
      </Text>

      <Input
        label="Workflow-Phasen (eine pro Zeile)"
        value={v.workflow_stages}
        onChangeText={(x) => setF({ ...v, workflow_stages: x })}
        multiline
        style={{ minHeight: 260 }}
        testID="set-stages"
      />

      <Button
        title="Speichern"
        onPress={() => save.mutate()}
        loading={save.isPending}
        disabled={!f}
        testID="set-submit"
      />
    </>
  );
}
