import React, { useState } from "react";
import { View, ScrollView, Linking, Pressable } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, abs, upload, fmtDate, fmtMoney } from "@/src/api";
import { useAuth, isAdmin } from "@/src/auth";
import { Eyebrow, H2, H3, Small, Caption, Badge, Card, Row, Button, Input, ScreenHeader, Loading, Empty, Stat, ChipRow, useToast } from "@/src/components/ui";
import { Select, Toggle, Sheet, usePickers } from "@/src/components/forms";
import { pdfUrl } from "@/src/components/project-sections";
import { makeStyles, useTheme, space, radius } from "@/src/theme";

const TITLES: Record<string, string> = { customers: "Kunden", employees: "Mitarbeiter", tasks: "Aufgaben", calendar: "Kalender", messages: "Nachrichten", offers: "Angebote", invoices: "Rechnungen", portfolio: "Portfolio", cms: "CMS", media: "Medien", notifications: "Benachrichtigungen", analytics: "Analytics", activity: "Aktivitätsprotokoll", settings: "Einstellungen" };
const useStyles = makeStyles((c) => ({ screen: { flex: 1, backgroundColor: c.surface }, thumb: { width: 96, height: 96, borderRadius: radius.md, backgroundColor: c.surfaceTertiary } }));

export default function EntityList() {
  const s = useStyles();
  const { entity } = useLocalSearchParams<{ entity: string }>();
  return (
    <View style={s.screen}>
      <ScreenHeader title={TITLES[entity] || entity} />
      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.md, paddingBottom: space.xxxl }} testID={`list-${entity}`}>
        {entity === "customers" ? <Customers /> : entity === "employees" ? <Employees /> : entity === "tasks" ? <Tasks /> : entity === "calendar" ? <Calendar /> : entity === "messages" ? <Inbox /> : entity === "offers" ? <OffersAll /> : entity === "invoices" ? <InvoicesAll /> : entity === "portfolio" ? <Portfolio /> : entity === "cms" ? <Cms /> : entity === "media" ? <Media /> : entity === "notifications" ? <Notifs /> : entity === "analytics" ? <Analytics /> : entity === "activity" ? <Activity /> : entity === "settings" ? <Settings /> : <Empty title="Unbekannt" />}
      </ScrollView>
    </View>
  );
}

function useList(key: string, path: string, opts: any = {}) { return useQuery<any>({ queryKey: [key], queryFn: () => api(path), ...opts }); }

function Customers() {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<any>(null);
  const [f, setF] = useState({ name: "", email: "", phone: "", address: "", postal_code: "", city: "" });
  const { data, isLoading } = useList("customers", "/customers");
  const { data: detail } = useQuery({ queryKey: ["customer", sel?.id], queryFn: () => api(`/customers/${sel.id}`), enabled: !!sel });
  const create = useMutation({ mutationFn: () => api("/customers", { method: "POST", json: f }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); setOpen(false); toast.show("Kunde angelegt", "success"); }, onError: (e: any) => toast.show(e.message, "error") });
  if (isLoading) return <Loading />;
  return (<>
    <Button title="Kunde anlegen" icon="add" onPress={() => setOpen(true)} testID="customer-new" />
    {!data?.length ? <Empty icon="people-outline" title="Keine Kunden" /> : data.map((c: any) => <Row key={c.id} icon="person-outline" title={c.name} subtitle={`${c.email} · ${c.phone || ""}`} onPress={() => setSel(c)} testID={`customer-${c.id}`} />)}
    <Sheet open={open} onClose={() => setOpen(false)} title="Neuer Kunde" testID="sheet-customer">
      {(["name", "email", "phone", "address", "postal_code", "city"] as const).map((k) => <Input key={k} label={{ name: "Name", email: "E-Mail", phone: "Telefon", address: "Adresse", postal_code: "PLZ", city: "Ort" }[k]} value={(f as any)[k]} onChangeText={(v) => setF({ ...f, [k]: v })} autoCapitalize={k === "email" ? "none" : "sentences"} testID={`cust-${k}`} />)}
      <Button title="Anlegen" onPress={() => create.mutate()} loading={create.isPending} disabled={!f.name || !f.email} testID="cust-submit" />
    </Sheet>
    <Sheet open={!!sel} onClose={() => setSel(null)} title={sel?.name || ""} testID="sheet-customer-detail">
      {!detail ? <Loading /> : (<>
        <Row icon="mail-outline" title={detail.email} subtitle={detail.phone || "–"} onPress={() => Linking.openURL(`mailto:${detail.email}`)} />
        <Row icon="location-outline" title={`${detail.address || "–"}, ${detail.postal_code || ""} ${detail.city || ""}`} subtitle="Adresse" />
        <Eyebrow>Projekte ({detail.projects.length})</Eyebrow>
        {detail.projects.map((p: any) => <Row key={p.id} title={`${p.number} · ${p.name}`} subtitle={p.stage} onPress={() => { setSel(null); router.push(`/admin/project/${p.id}`); }} />)}
        <Eyebrow>Angebote ({detail.offers.length}) · Rechnungen ({detail.invoices.length}) · Termine ({detail.appointments.length}) · Dokumente ({detail.documents.length})</Eyebrow>
        <Eyebrow>Kundenkonten</Eyebrow>
        {detail.users.map((u: any) => <Caption key={u.id}>{u.email} · {u.role}</Caption>)}
        <Eyebrow>Aktivität</Eyebrow>
        {detail.activity.slice(0, 10).map((a: any) => <Caption key={a.id}>{fmtDate(a.created_at, true)} · {a.action} · {a.user_name}</Caption>)}
      </>)}
    </Sheet>
  </>);
}

function Employees() {
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ email: "", first_name: "", last_name: "", password: "", role: "EMPLOYEE", phone: "", can_publish_client_updates: false });
  const { data, isLoading } = useList("employees", "/employees");
  const { data: meta } = useList("meta", "/meta");
  const create = useMutation({ mutationFn: () => api("/employees", { method: "POST", json: f }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); setOpen(false); toast.show("Mitarbeiter angelegt", "success"); }, onError: (e: any) => toast.show(e.message, "error") });
  const patch = useMutation({ mutationFn: ({ id, body }: any) => api(`/employees/${id}`, { method: "PATCH", json: body }), onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }), onError: (e: any) => toast.show(e.message, "error") });
  if (isLoading) return <Loading />;
  const roles = (meta?.roles || []).filter((r: string) => r !== "CLIENT");
  return (<>
    {isAdmin(user) ? <Button title="Mitarbeiter anlegen" icon="add" onPress={() => setOpen(true)} testID="employee-new" /> : null}
    {(data || []).map((e: any) => (
      <Card key={e.id} style={{ gap: space.sm }} testID={`employee-${e.id}`}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}><H3>{e.first_name} {e.last_name}</H3><Badge label={e.role} status={e.disabled ? "CANCELLED" : "ACTIVE"} /></View>
        <Caption>{e.email}{e.phone ? ` · ${e.phone}` : ""}</Caption>
        {isAdmin(user) ? (<>
          <Select label="Rolle" value={e.role} options={roles} onChange={(v) => patch.mutate({ id: e.id, body: { role: v } })} testID={`employee-role-${e.id}`} />
          <Toggle label="Darf kundensichtbare Updates veröffentlichen" value={!!e.can_publish_client_updates} onChange={(v) => patch.mutate({ id: e.id, body: { can_publish_client_updates: v } })} testID={`employee-publish-${e.id}`} />
          <Toggle label="Konto deaktiviert" value={!!e.disabled} onChange={(v) => patch.mutate({ id: e.id, body: { disabled: v } })} testID={`employee-disabled-${e.id}`} />
        </>) : null}
      </Card>
    ))}
    <Sheet open={open} onClose={() => setOpen(false)} title="Neuer Mitarbeiter" testID="sheet-employee">
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <View style={{ flex: 1 }}><Input label="Vorname" value={f.first_name} onChangeText={(v) => setF({ ...f, first_name: v })} testID="emp-first" /></View>
        <View style={{ flex: 1 }}><Input label="Nachname" value={f.last_name} onChangeText={(v) => setF({ ...f, last_name: v })} testID="emp-last" /></View>
      </View>
      <Input label="E-Mail" value={f.email} onChangeText={(v) => setF({ ...f, email: v })} autoCapitalize="none" testID="emp-email" />
      <Input label="Telefon" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} testID="emp-phone" />
      <Input label="Passwort (min. 8)" value={f.password} onChangeText={(v) => setF({ ...f, password: v })} secureTextEntry testID="emp-password" />
      <Select label="Rolle" value={f.role} options={roles} onChange={(v) => setF({ ...f, role: v })} testID="emp-role" />
      <Toggle label="Kundensichtbare Updates erlaubt" value={f.can_publish_client_updates} onChange={(v) => setF({ ...f, can_publish_client_updates: v })} testID="emp-publish" />
      <Button title="Anlegen" onPress={() => create.mutate()} loading={create.isPending} disabled={!f.email || !f.first_name || f.password.length < 8} testID="emp-submit" />
    </Sheet>
  </>);
}

function Tasks() {
  const router = useRouter();
  const { data, isLoading } = useList("all-tasks", "/tasks");
  if (isLoading) return <Loading />;
  const list = [...(data || [])].sort((a: any, b: any) => Number(b.overdue) - Number(a.overdue));
  return !list.length ? <Empty icon="checkbox-outline" title="Keine Aufgaben" /> : list.map((t: any) => <Row key={t.id} icon={t.overdue ? "alert-circle-outline" : "checkbox-outline"} title={t.title} subtitle={`${t.project_number} · fällig ${fmtDate(t.due_date)}${t.overdue ? " · ÜBERFÄLLIG" : ""}`} right={<Badge status={t.status} label={t.status} />} onPress={() => router.push({ pathname: `/admin/project/${t.project_id}`, params: { tab: "Aufgaben" } })} testID={`all-task-${t.id}`} />);
}

function Calendar() {
  const router = useRouter();
  const [view, setView] = useState<"Tag" | "Woche" | "Monat">("Woche");
  const [type, setType] = useState("Alle");
  const { data: meta } = useList("meta", "/meta");
  const now = new Date();
  const end = new Date(now); end.setDate(now.getDate() + (view === "Tag" ? 1 : view === "Woche" ? 7 : 31));
  const { data, isLoading } = useQuery({ queryKey: ["cal", view, type], queryFn: () => api(`/appointments?start=${now.toISOString().slice(0, 10)}&end=${end.toISOString()}${type !== "Alle" ? `&type=${encodeURIComponent(type)}` : ""}`) });
  const groups: Record<string, any[]> = {};
  (data || []).forEach((a: any) => (groups[fmtDate(a.start)] = [...(groups[fmtDate(a.start)] || []), a]));
  return (<>
    <View style={{ marginHorizontal: -space.xl }}><ChipRow items={["Tag", "Woche", "Monat"]} value={view} onChange={setView} testID="cal-view" /></View>
    <View style={{ marginHorizontal: -space.xl }}><ChipRow items={["Alle", ...(meta?.appointment_types || [])]} value={type} onChange={setType} testID="cal-type" /></View>
    {isLoading ? <Loading /> : !Object.keys(groups).length ? <Empty icon="calendar-outline" title="Keine Termine im Zeitraum" /> : Object.entries(groups).map(([d, items]) => (
      <View key={d} style={{ gap: 4 }}>
        <Eyebrow>{d}</Eyebrow>
        {items.map((a: any) => <Row key={a.id} icon="time-outline" title={`${a.start.slice(11, 16)} · ${a.type} · ${a.title}`} subtitle={`${a.project_number || ""}${a.location ? ` · ${a.location}` : ""}`} right={<Badge status={a.confirmation_status} />} onPress={a.project_id ? () => router.push({ pathname: `/admin/project/${a.project_id}`, params: { tab: "Termine" } }) : undefined} testID={`cal-${a.id}`} />)}
      </View>
    ))}
  </>);
}

function Inbox() {
  const router = useRouter();
  const { data, isLoading } = useList("inbox", "/messages/inbox", { refetchInterval: 10000 });
  if (isLoading) return <Loading />;
  return !data?.length ? <Empty icon="chatbubbles-outline" title="Keine Chats" /> : data.map((c: any) => <Row key={c.project_id} icon="chatbubble-outline" title={`${c.project_number} · ${c.customer_name || c.project_name}`} subtitle={c.last_message ? `${c.last_message.sender_name}: ${c.last_message.text}` : "Noch keine Nachrichten"} right={c.unread ? <Badge status="IN_PROGRESS" label={String(c.unread)} /> : undefined} onPress={() => router.push(`/client/chat/${c.project_id}`)} testID={`inbox-${c.project_id}`} />);
}

function OffersAll() {
  const router = useRouter();
  const { data, isLoading } = useList("offers-all", "/offers");
  if (isLoading) return <Loading />;
  return !data?.length ? <Empty icon="document-text-outline" title="Keine Angebote" /> : data.map((o: any) => <Row key={o.id} icon="document-text-outline" title={`${o.number} · ${fmtMoney(o.total)}`} subtitle={`${o.customer_name} · ${o.project_number || ""} · ${fmtDate(o.date)}`} right={<Badge status={o.status} />} onPress={() => router.push(o.project_id ? { pathname: `/admin/project/${o.project_id}`, params: { tab: "Angebote" } } : `/client/offer/${o.id}`)} testID={`offers-all-${o.id}`} />);
}

function InvoicesAll() {
  const { data, isLoading } = useList("invoices-all", "/invoices");
  if (isLoading) return <Loading />;
  return !data?.length ? <Empty icon="card-outline" title="Keine Rechnungen" /> : data.map((i: any) => <Row key={i.id} icon="card-outline" title={`${i.number} · ${fmtMoney(i.total)}`} subtitle={`${i.customer_name} · fällig ${fmtDate(i.due_date)}`} right={<Badge status={i.status} />} onPress={() => Linking.openURL(pdfUrl(`/invoices/${i.id}/pdf`))} testID={`invoices-all-${i.id}`} />);
}

function Portfolio() {
  const s = useStyles();
  const toast = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", category: "", description: "", location: "", cover_url: "", featured: false, published: false });
  const { data, isLoading } = useList("portfolio-all", "/portfolio?all=true");
  const { data: meta } = useList("meta", "/meta");
  const inv = () => { qc.invalidateQueries({ queryKey: ["portfolio-all"] }); qc.invalidateQueries({ queryKey: ["portfolio"] }); };
  const create = useMutation({ mutationFn: () => api("/portfolio", { method: "POST", json: f }), onSuccess: () => { inv(); setOpen(false); toast.show("Portfolio-Eintrag angelegt", "success"); }, onError: (e: any) => toast.show(e.message, "error") });
  const patch = useMutation({ mutationFn: ({ id, body }: any) => api(`/portfolio/${id}`, { method: "PATCH", json: body }), onSuccess: inv, onError: (e: any) => toast.show(e.message, "error") });
  if (isLoading) return <Loading />;
  return (<>
    <Button title="Eintrag anlegen" icon="add" onPress={() => setOpen(true)} testID="portfolio-new" />
    {(data || []).map((p: any) => (
      <Card key={p.id} style={{ gap: space.sm }} testID={`pf-${p.id}`}>
        <View style={{ flexDirection: "row", gap: space.md }}>
          {p.cover ? <Image source={{ uri: abs(p.cover) }} style={s.thumb} contentFit="cover" /> : <View style={s.thumb} />}
          <View style={{ flex: 1, gap: 2 }}><Caption>{p.category}</Caption><H3>{p.title}</H3><Caption>{p.photos?.length || 0} Fotos{p.source ? ` · Quelle ${p.source}` : ""}</Caption></View>
        </View>
        <Toggle label="Veröffentlicht" value={!!p.published} onChange={(v) => patch.mutate({ id: p.id, body: { published: v } })} testID={`pf-pub-${p.id}`} />
        <Toggle label="Hervorgehoben" value={!!p.featured} onChange={(v) => patch.mutate({ id: p.id, body: { featured: v } })} testID={`pf-feat-${p.id}`} />
      </Card>
    ))}
    <Sheet open={open} onClose={() => setOpen(false)} title="Portfolio-Eintrag" testID="sheet-portfolio">
      <Input label="Titel" value={f.title} onChangeText={(v) => setF({ ...f, title: v })} testID="pf-title" />
      <Select label="Kategorie" value={f.category || null} options={(meta?.services || []).map((x: any) => x.title)} onChange={(v) => setF({ ...f, category: v })} testID="pf-category" />
      <Input label="Beschreibung" value={f.description} onChangeText={(v) => setF({ ...f, description: v })} multiline testID="pf-desc" />
      <Input label="Ort (optional)" value={f.location} onChangeText={(v) => setF({ ...f, location: v })} testID="pf-location" />
      <Input label="Cover-URL (aus Medienbibliothek)" value={f.cover_url} onChangeText={(v) => setF({ ...f, cover_url: v })} autoCapitalize="none" testID="pf-cover" />
      <Toggle label="Veröffentlichen" value={f.published} onChange={(v) => setF({ ...f, published: v })} testID="pf-published" />
      <Caption>Hinweis: Private Kundendaten werden nie automatisch veröffentlicht – nur freigegebene Medien.</Caption>
      <Button title="Speichern" onPress={() => create.mutate()} loading={create.isPending} disabled={!f.title || !f.category} testID="pf-submit" />
    </Sheet>
  </>);
}

function Cms() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useList("cms", "/cms");
  const [edit, setEdit] = useState<{ key: string; text: string } | null>(null);
  const save = useMutation({ mutationFn: ({ key, text }: any) => api(`/cms/${key}`, { method: "PUT", json: JSON.parse(text) }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["cms"] }); setEdit(null); toast.show("Inhalt gespeichert", "success"); }, onError: (e: any) => toast.show(e.message.includes("JSON") ? "Ungültiges Format" : e.message, "error") });
  if (isLoading) return <Loading />;
  const labels: Record<string, string> = { hero: "Hero", services: "Leistungen", about: "Über OKA Bau / Werte", katharina: "Katharina Kling", process: "Ablauf", faq: "FAQ", contact: "Kontakt & Rechtliches", announcements: "Ankündigungen" };
  return (<>
    <Caption>Inhalte der App/Website ohne Code bearbeiten. Änderungen sind sofort live.</Caption>
    {Object.keys(labels).map((k) => <Row key={k} icon="create-outline" title={labels[k]} subtitle={k} onPress={() => setEdit({ key: k, text: JSON.stringify(data?.[k] ?? {}, null, 2) })} testID={`cms-${k}`} />)}
    <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit ? labels[edit.key] : ""} testID="sheet-cms">
      {edit ? (<>
        <Input value={edit.text} onChangeText={(v) => setEdit({ ...edit, text: v })} multiline style={{ minHeight: 320, fontFamily: "monospace", fontSize: 13 }} autoCapitalize="none" testID="cms-editor" />
        <Button title="Speichern" onPress={() => save.mutate(edit)} loading={save.isPending} testID="cms-save" />
      </>) : null}
    </Sheet>
  </>);
}

function Media() {
  const s = useStyles();
  const toast = useToast();
  const qc = useQueryClient();
  const { pickImages, pickDocument } = usePickers();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["media-lib", q], queryFn: () => api(`/media${q ? `?q=${encodeURIComponent(q)}` : ""}`) });
  const del = useMutation({ mutationFn: (id: string) => api(`/files/${id}`, { method: "DELETE" }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["media-lib"] }); toast.show("Datei entfernt", "success"); }, onError: (e: any) => toast.show(e.message, "error") });
  const up = async (kind: "images" | "doc") => {
    const files = kind === "images" ? await pickImages() : [await pickDocument()].filter(Boolean);
    if (!files.length) return;
    setBusy(true);
    try { await upload("/media", files as any, { category: "Allgemein" }); qc.invalidateQueries({ queryKey: ["media-lib"] }); toast.show("Hochgeladen", "success"); } catch (e: any) { toast.show(e.message, "error"); } finally { setBusy(false); }
  };
  return (<>
    <View style={{ flexDirection: "row", gap: space.sm }}>
      <Button title="Bilder / Videos" small icon="image-outline" onPress={() => up("images")} loading={busy} testID="media-upload-images" />
      <Button title="PDF / GLB" small variant="light" icon="document-outline" onPress={() => up("doc")} loading={busy} testID="media-upload-doc" />
    </View>
    <Input placeholder="Suchen…" value={q} onChangeText={setQ} testID="media-search" />
    {isLoading ? <Loading /> : !data?.length ? <Empty icon="folder-open-outline" title="Keine Medien" /> : data.map((m: any) => (
      <View key={m.id} style={{ flexDirection: "row", gap: space.md, alignItems: "center" }} testID={`media-${m.id}`}>
        {m.content_type?.startsWith("image") ? <Image source={{ uri: abs(m.url) }} style={s.thumb} contentFit="cover" /> : <View style={[s.thumb, { alignItems: "center", justifyContent: "center" }]}><Caption>{m.content_type?.split("/")[1]?.toUpperCase().slice(0, 6)}</Caption></View>}
        <View style={{ flex: 1, gap: 2 }}>
          <Small style={{ fontWeight: "600" }} numberOfLines={1}>{m.title || m.filename}</Small>
          <Caption>{m.kind} · {m.category || "–"} · {Math.round((m.size || 0) / 1024)} KB · {fmtDate(m.created_at)}</Caption>
          <View style={{ flexDirection: "row", gap: space.md }}>
            <Pressable onPress={() => Linking.openURL(abs(m.url)!)} testID={`media-open-${m.id}`}><Caption style={{ textDecorationLine: "underline" }}>Öffnen</Caption></Pressable>
            <Pressable onPress={() => del.mutate(m.id)} testID={`media-delete-${m.id}`}><Caption style={{ textDecorationLine: "underline" }}>Löschen</Caption></Pressable>
          </View>
        </View>
      </View>
    ))}
  </>);
}

function Notifs() {
  const qc = useQueryClient();
  const { data, isLoading } = useList("notifications", "/notifications");
  const { data: outbox } = useList("outbox", "/email-outbox");
  const read = useMutation({ mutationFn: () => api("/notifications/read", { method: "POST", json: {} }), onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }) });
  if (isLoading) return <Loading />;
  return (<>
    <Button title="Alle als gelesen markieren" small variant="light" onPress={() => read.mutate()} testID="notifs-read-all" />
    {(data || []).map((n: any) => <Row key={n.id} icon={n.read ? "notifications-outline" : "notifications"} title={n.title} subtitle={`${n.message} · ${fmtDate(n.created_at, true)}`} testID={`notif-${n.id}`} />)}
    <Eyebrow style={{ paddingTop: space.lg }}>E-Mail-Postausgang (Abstraktion)</Eyebrow>
    {(outbox || []).slice(0, 30).map((e: any) => <Row key={e.id} icon="mail-outline" title={e.subject} subtitle={`${e.to} · ${e.template} · ${e.status}`} />)}
  </>);
}

function Analytics() {
  const { data, isLoading } = useList("analytics", "/analytics");
  if (isLoading || !data) return <Loading />;
  return (<>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md }}>
      <Stat label="Leads gesamt" value={data.leads_total} />
      <Stat label="Lead-Conversion" value={`${data.lead_conversion_rate}%`} accent />
      <Stat label="Ø Reaktionszeit" value={data.avg_response_hours != null ? `${data.avg_response_hours} h` : "–"} />
      <Stat label="Aktive Projekte" value={data.active_projects} />
      <Stat label="Überfällige Aufgaben" value={data.overdue_tasks} />
      <Stat label="Angebotsannahme" value={data.offer_acceptance_rate != null ? `${data.offer_acceptance_rate}%` : "–"} accent />
    </View>
    <Eyebrow>Leads nach Status</Eyebrow>
    {Object.entries(data.leads_by_status).map(([k, v]: any) => <Row key={k} title={k} right={<Small>{v}</Small>} />)}
    <Eyebrow>Lead-Quellen</Eyebrow>
    {Object.entries(data.lead_sources).map(([k, v]: any) => <Row key={k} title={k} right={<Small>{v}</Small>} />)}
    <Eyebrow>Projekte nach Phase</Eyebrow>
    {Object.entries(data.projects_by_stage).map(([k, v]: any) => <Row key={k} title={k} right={<Small>{v}</Small>} />)}
    <Caption>Datenschutzfreundlich: keine personenbezogenen Kundendaten in dieser Ansicht.</Caption>
  </>);
}

function Activity() {
  const { data, isLoading } = useList("activity", "/activity");
  if (isLoading) return <Loading />;
  return (data || []).map((a: any) => (
    <Card key={a.id} style={{ gap: 2 }} testID={`activity-${a.id}`}>
      <Caption>{fmtDate(a.created_at, true)} · {a.user_name}</Caption>
      <Small style={{ fontWeight: "600" }}>{a.action} · {a.entity}</Small>
      {a.old_value != null || a.new_value != null ? <Caption numberOfLines={3}>{a.old_value != null ? `alt: ${JSON.stringify(a.old_value)} → ` : ""}{a.new_value != null ? `neu: ${JSON.stringify(a.new_value)}` : ""}</Caption> : null}
    </Card>
  ));
}

function Settings() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useList("settings", "/settings");
  const [f, setF] = useState<any>(null);
  const save = useMutation({ mutationFn: () => api("/settings", { method: "PUT", json: { ...f, workflow_stages: f.workflow_stages.split("\n").map((x: string) => x.trim()).filter(Boolean) } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings"] }); qc.invalidateQueries({ queryKey: ["meta"] }); toast.show("Einstellungen gespeichert", "success"); }, onError: (e: any) => toast.show(e.message, "error") });
  if (isLoading || !data) return <Loading />;
  const v = f || { ...data, workflow_stages: data.workflow_stages.join("\n") };
  return (<>
    <Input label="Projektnummer-Format" value={v.project_number_format} onChangeText={(x) => setF({ ...v, project_number_format: x })} autoCapitalize="none" testID="set-project-format" />
    <Input label="Angebotsnummer-Format" value={v.offer_number_format} onChangeText={(x) => setF({ ...v, offer_number_format: x })} autoCapitalize="none" testID="set-offer-format" />
    <Input label="Rechnungsnummer-Format" value={v.invoice_number_format} onChangeText={(x) => setF({ ...v, invoice_number_format: x })} autoCapitalize="none" testID="set-invoice-format" />
    <Caption>Platzhalter: {"{year}"} und {"{seq:04d}"} · Beispiel OKA-{"{year}"}-{"{seq:04d}"} → OKA-2026-0001</Caption>
    <Input label="Workflow-Phasen (eine pro Zeile)" value={v.workflow_stages} onChangeText={(x) => setF({ ...v, workflow_stages: x })} multiline style={{ minHeight: 260 }} testID="set-stages" />
    <Button title="Speichern" onPress={() => save.mutate()} loading={save.isPending} disabled={!f} testID="set-submit" />
  </>);
}
