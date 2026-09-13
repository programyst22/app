import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, upload, fmtDate } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Eyebrow, H2, H3, Small, Caption, Badge, Card, Row, Progress, ChipRow, ScreenHeader, Loading, Button, Input, Empty, useToast } from "@/src/components/ui";
import { Select, Toggle, Sheet, usePickers } from "@/src/components/forms";
import { Updates, MediaGrid } from "@/src/components/project-sections";
import { makeStyles, space } from "@/src/theme";

const TABS = ["Übersicht", "Updates", "Fotos", "Aufgaben", "Bautagebuch"];
const useStyles = makeStyles((c) => ({ screen: { flex: 1, backgroundColor: c.surface } }));

export default function EmployeeProject() {
  const s = useStyles();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { pickImages } = usePickers();
  const { id, tab: t0 } = useLocalSearchParams<{ id: string; tab?: string }>();
  const [tab, setTab] = useState(t0 && TABS.includes(t0) ? t0 : "Übersicht");
  const [sheet, setSheet] = useState<null | "update" | "diary" | "progress">(null);
  const [upd, setUpd] = useState({ title: "", description: "", progress: "", client_visible: true });
  const [diary, setDiary] = useState({ date: new Date().toISOString().slice(0, 10), work_completed: "", materials: "", problems: "", notes: "", weather: "", client_visible: false });
  const [progress, setProgress] = useState("");
  const [uploading, setUploading] = useState(false);
  const { data: p, isLoading } = useQuery({ queryKey: ["project", id], queryFn: () => api(`/projects/${id}`) });
  const { data: tasks } = useQuery({ queryKey: ["tasks", id], queryFn: () => api(`/projects/${id}/tasks`) });
  const { data: entries } = useQuery({ queryKey: ["diary", id], queryFn: () => api(`/projects/${id}/diary`) });
  const { data: meta } = useQuery({ queryKey: ["meta"], queryFn: () => api("/meta") });
  const inv = () => { qc.invalidateQueries({ queryKey: ["project", id] }); qc.invalidateQueries({ queryKey: ["updates", id] }); qc.invalidateQueries({ queryKey: ["tasks", id] }); qc.invalidateQueries({ queryKey: ["diary", id] }); qc.invalidateQueries({ queryKey: ["media", id] }); qc.invalidateQueries({ queryKey: ["employee-dashboard"] }); };
  const createUpdate = useMutation({ mutationFn: () => api(`/projects/${id}/updates`, { method: "POST", json: { ...upd, progress: upd.progress ? Number(upd.progress) : null } }), onSuccess: () => { inv(); setSheet(null); setUpd({ title: "", description: "", progress: "", client_visible: true }); toast.show("Update veröffentlicht", "success"); }, onError: (e: any) => toast.show(e.message, "error") });
  const createDiary = useMutation({ mutationFn: () => api(`/projects/${id}/diary`, { method: "POST", json: { ...diary, employees_present: [user?.id], weather: diary.weather || null } }), onSuccess: () => { inv(); setSheet(null); toast.show("Bautagebuch-Eintrag gespeichert", "success"); }, onError: (e: any) => toast.show(e.message, "error") });
  const setProg = useMutation({ mutationFn: () => api(`/projects/${id}`, { method: "PATCH", json: { progress: Number(progress) } }), onSuccess: () => { inv(); setSheet(null); toast.show("Fortschritt aktualisiert", "success"); }, onError: (e: any) => toast.show(e.message, "error") });
  const taskStatus = useMutation({ mutationFn: ({ tid, status }: any) => api(`/projects/${id}/tasks/${tid}`, { method: "PATCH", json: { status } }), onSuccess: inv });
  const uploadPhotos = async () => {
    const files = await pickImages();
    if (!files.length) return;
    setUploading(true);
    try { await upload(`/projects/${id}/media`, files, { client_visible: "true", media_kind: "photo" }); inv(); toast.show(`${files.length} Datei(en) hochgeladen`, "success"); } catch (e: any) { toast.show(e.message, "error"); } finally { setUploading(false); }
  };

  return (
    <View style={s.screen}>
      <ScreenHeader title={p?.name || "Projekt"} subtitle={p?.number} />
      <ChipRow items={TABS} value={tab} onChange={setTab} testID="emp-tabs" />
      {isLoading || !p ? <Loading /> : (
        <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg, paddingBottom: space.xxxl }} testID={`emp-section-${tab}`}>
          {tab === "Übersicht" ? (
            <>
              <Card dark style={{ gap: space.sm }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Eyebrow onDark>{p.number}</Eyebrow><Badge label={p.stage} /></View>
                <H2 onDark>{p.name}</H2>
                <Small onDark>{p.address}</Small>
                <Caption onDark>Kunde: {p.customer_name}</Caption>
                <Progress value={p.progress} />
                <Caption onDark>{p.progress}% · PL: {p.project_manager ? `${p.project_manager.first_name} ${p.project_manager.last_name}` : "–"}</Caption>
              </Card>
              <View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap" }}>
                <Button title="Update" small icon="add" onPress={() => setSheet("update")} testID="emp-add-update" />
                <Button title="Fotos hochladen" small variant="light" icon="camera-outline" onPress={uploadPhotos} loading={uploading} testID="emp-upload-photos" />
                <Button title="Fortschritt" small variant="light" icon="trending-up-outline" onPress={() => { setProgress(String(p.progress)); setSheet("progress"); }} testID="emp-set-progress" />
                <Button title="Bautagebuch" small variant="light" icon="book-outline" onPress={() => setSheet("diary")} testID="emp-add-diary" />
                <Button title="Chat" small variant="light" icon="chatbubble-outline" onPress={() => router.push(`/client/chat/${id}`)} testID="emp-chat" />
              </View>
              {p.internal_notes ? <Card><Caption>Interne Notizen</Caption><Small>{p.internal_notes}</Small></Card> : null}
              {p.description ? <Card><Caption>Beschreibung</Caption><Small>{p.description}</Small></Card> : null}
            </>
          ) : null}
          {tab === "Updates" ? (<><Button title="Neues Update" icon="add" onPress={() => setSheet("update")} testID="emp-add-update-2" /><Updates projectId={id} /></>) : null}
          {tab === "Fotos" ? (<><Button title="Fotos / Videos hochladen" icon="camera-outline" onPress={uploadPhotos} loading={uploading} testID="emp-upload-photos-2" /><MediaGrid projectId={id} /></>) : null}
          {tab === "Aufgaben" ? (!tasks?.length ? <Empty icon="checkbox-outline" title="Keine Aufgaben" /> : tasks.map((t: any) => (
            <Card key={t.id} style={{ gap: space.sm }} testID={`task-${t.id}`}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Caption>{t.priority} · fällig {fmtDate(t.due_date)}</Caption><Badge status={t.status} label={t.status} /></View>
              <H3>{t.title}</H3>
              {t.description ? <Small>{t.description}</Small> : null}
              <View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap" }}>
                {(meta?.task_statuses || []).filter((st: string) => st !== t.status).map((st: string) => <Button key={st} title={st} small variant={st === "ERLEDIGT" ? "primary" : "ghost"} onPress={() => taskStatus.mutate({ tid: t.id, status: st })} testID={`task-${t.id}-${st}`} />)}
              </View>
            </Card>
          ))) : null}
          {tab === "Bautagebuch" ? (<>
            <Button title="Neuer Eintrag" icon="add" onPress={() => setSheet("diary")} testID="emp-add-diary-2" />
            {!entries?.length ? <Empty icon="book-outline" title="Noch keine Einträge" /> : entries.map((e: any) => (
              <Card key={e.id} style={{ gap: 6 }} testID={`diary-${e.id}`}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Caption>{fmtDate(e.date)} · {e.author_name}</Caption>{e.client_visible ? <Badge status="COMPLETED" label="Kunde sieht" /> : <Badge label="intern" />}</View>
                <Small style={{ fontWeight: "600" }}>{e.work_completed}</Small>
                {e.materials ? <Caption>Material: {e.materials}</Caption> : null}
                {e.problems ? <Caption>Probleme: {e.problems}</Caption> : null}
                {e.weather ? <Caption>Wetter: {e.weather}</Caption> : null}
                {e.notes ? <Caption>{e.notes}</Caption> : null}
              </Card>
            ))}
          </>) : null}
        </ScrollView>
      )}

      <Sheet open={sheet === "update"} onClose={() => setSheet(null)} title="Projektupdate" testID="sheet-update">
        <Input label="Titel" value={upd.title} onChangeText={(v) => setUpd({ ...upd, title: v })} testID="upd-title" />
        <Input label="Beschreibung" value={upd.description} onChangeText={(v) => setUpd({ ...upd, description: v })} multiline testID="upd-desc" />
        <Input label="Fortschritt % (optional)" value={upd.progress} onChangeText={(v) => setUpd({ ...upd, progress: v.replace(/[^0-9]/g, "") })} keyboardType="number-pad" testID="upd-progress" />
        <Toggle label="Für Kunden sichtbar (löst Benachrichtigung aus)" value={upd.client_visible} onChange={(v) => setUpd({ ...upd, client_visible: v })} testID="upd-visible" />
        <Button title="Veröffentlichen" onPress={() => createUpdate.mutate()} loading={createUpdate.isPending} disabled={!upd.title} testID="upd-submit" />
      </Sheet>
      <Sheet open={sheet === "diary"} onClose={() => setSheet(null)} title="Bautagebuch" testID="sheet-diary">
        <Input label="Datum (JJJJ-MM-TT)" value={diary.date} onChangeText={(v) => setDiary({ ...diary, date: v })} testID="diary-date" />
        <Input label="Ausgeführte Arbeiten" value={diary.work_completed} onChangeText={(v) => setDiary({ ...diary, work_completed: v })} multiline testID="diary-work" />
        <Input label="Material" value={diary.materials} onChangeText={(v) => setDiary({ ...diary, materials: v })} testID="diary-materials" />
        <Input label="Probleme" value={diary.problems} onChangeText={(v) => setDiary({ ...diary, problems: v })} testID="diary-problems" />
        <Input label="Wetter (optional)" value={diary.weather} onChangeText={(v) => setDiary({ ...diary, weather: v })} testID="diary-weather" />
        <Input label="Notizen" value={diary.notes} onChangeText={(v) => setDiary({ ...diary, notes: v })} multiline testID="diary-notes" />
        <Toggle label="Für Kunden sichtbar" value={diary.client_visible} onChange={(v) => setDiary({ ...diary, client_visible: v })} testID="diary-visible" />
        <Button title="Eintrag speichern" onPress={() => createDiary.mutate()} loading={createDiary.isPending} disabled={!diary.work_completed} testID="diary-submit" />
      </Sheet>
      <Sheet open={sheet === "progress"} onClose={() => setSheet(null)} title="Fortschritt setzen" testID="sheet-progress">
        <Input label="Gesamtfortschritt in %" value={progress} onChangeText={(v) => setProgress(v.replace(/[^0-9]/g, ""))} keyboardType="number-pad" testID="progress-input" />
        <Button title="Speichern" onPress={() => setProg.mutate()} loading={setProg.isPending} testID="progress-submit" />
      </Sheet>
    </View>
  );
}
