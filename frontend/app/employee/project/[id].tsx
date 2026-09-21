import React, { useState } from "react";
import { View, ScrollView, Pressable, Text, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { api, upload, fmtDate } from "@/src/api";
import { useAuth } from "@/src/auth";
import {
  Badge,
  Progress,
  ChipRow,
  Loading,
  Button,
  Input,
  Empty,
  useToast,
} from "@/src/components/ui";
import { Toggle, Sheet, usePickers } from "@/src/components/forms";
import { Updates, MediaGrid, BeforeAfter } from "@/src/components/project-sections";
import { BeforeAfterEditor } from "@/src/components/BeforeAfterEditor";
import { PremiumHeader } from "@/src/components/premium";
import { fonts, makeStyles, useTheme } from "@/src/theme";

const TABS = ["Übersicht", "Updates", "Fotos", "Aufgaben", "Bautagebuch"];

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  shell: { width: "100%", alignSelf: "center", maxWidth: 1100 },
  hero: {
    backgroundColor: c.surfaceInverse,
    borderRadius: 26,
    padding: 24,
    gap: 14,
  },
  card: {
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  overline: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 1.3,
    color: c.onSurface,
    textTransform: "uppercase",
  },
  title: { fontFamily: fonts.semibold, color: c.onSurface, fontSize: 19, lineHeight: 25 },
  body: { fontFamily: fonts.regular, color: c.muted, fontSize: 14, lineHeight: 21 },
}));

export default function EmployeeProject() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { pickImages } = usePickers();
  const { width } = useWindowDimensions();
  const { id, tab: t0 } = useLocalSearchParams<{ id: string; tab?: string }>();

  const [tab, setTab] = useState(t0 && TABS.includes(t0) ? t0 : "Übersicht");
  const [sheet, setSheet] = useState<null | "update" | "diary" | "progress" | "ba">(null);
  const [upd, setUpd] = useState({ title: "", description: "", progress: "", client_visible: true });
  const [diary, setDiary] = useState({
    date: new Date().toISOString().slice(0, 10),
    work_completed: "",
    materials: "",
    problems: "",
    notes: "",
    weather: "",
    client_visible: false,
  });
  const [progress, setProgress] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: p, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => api(`/projects/${id}`),
  });
  const { data: tasks } = useQuery({
    queryKey: ["tasks", id],
    queryFn: () => api(`/projects/${id}/tasks`),
  });
  const { data: entries } = useQuery({
    queryKey: ["diary", id],
    queryFn: () => api(`/projects/${id}/diary`),
  });
  const { data: meta } = useQuery({
    queryKey: ["meta"],
    queryFn: () => api("/meta"),
  });

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["project", id] });
    qc.invalidateQueries({ queryKey: ["updates", id] });
    qc.invalidateQueries({ queryKey: ["tasks", id] });
    qc.invalidateQueries({ queryKey: ["diary", id] });
    qc.invalidateQueries({ queryKey: ["media", id] });
    qc.invalidateQueries({ queryKey: ["employee-dashboard"] });
  };

  const createUpdate = useMutation({
    mutationFn: () =>
      api(`/projects/${id}/updates`, {
        method: "POST",
        json: { ...upd, progress: upd.progress ? Number(upd.progress) : null },
      }),
    onSuccess: () => {
      inv();
      setSheet(null);
      setUpd({ title: "", description: "", progress: "", client_visible: true });
      toast.show("Update veröffentlicht", "success");
    },
    onError: (e: any) => toast.show(e.message, "error"),
  });

  const createDiary = useMutation({
    mutationFn: () =>
      api(`/projects/${id}/diary`, {
        method: "POST",
        json: {
          ...diary,
          employees_present: [user?.id],
          weather: diary.weather || null,
        },
      }),
    onSuccess: () => {
      inv();
      setSheet(null);
      toast.show("Bautagebuch-Eintrag gespeichert", "success");
    },
    onError: (e: any) => toast.show(e.message, "error"),
  });

  const setProg = useMutation({
    mutationFn: () =>
      api(`/projects/${id}`, {
        method: "PATCH",
        json: { progress: Number(progress) },
      }),
    onSuccess: () => {
      inv();
      setSheet(null);
      toast.show("Fortschritt aktualisiert", "success");
    },
    onError: (e: any) => toast.show(e.message, "error"),
  });

  const taskStatus = useMutation({
    mutationFn: ({ tid, status }: any) =>
      api(`/projects/${id}/tasks/${tid}`, { method: "PATCH", json: { status } }),
    onSuccess: inv,
  });

  const uploadPhotos = async () => {
    const files = await pickImages();
    if (!files.length) return;
    setUploading(true);
    try {
      await upload(`/projects/${id}/media`, files, { client_visible: "true", media_kind: "photo" });
      inv();
      toast.show(`${files.length} Datei(en) hochgeladen`, "success");
    } catch (e: any) {
      toast.show(e.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const pad = width < 700 ? 20 : 34;

  return (
    <View style={s.screen}>
      <PremiumHeader title={p?.name || "Projekt"} subtitle={p?.number} />
      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <ChipRow items={TABS} value={tab} onChange={setTab} testID="emp-tabs" />
      </View>

      {isLoading || !p ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: pad, paddingTop: 24, paddingBottom: 70 }}
          testID={`emp-section-${tab}`}
        >
          <View style={[s.shell, { gap: 18 }]}>
            {tab === "Übersicht" ? (
              <>
                <View style={s.hero}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <Text style={{ color: "rgba(255,255,255,.66)", fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.1 }}>
                      {p.number}
                    </Text>
                    <Badge label={p.stage} />
                  </View>
                  <Text style={{ color: "#fff", fontFamily: fonts.semibold, fontSize: width < 700 ? 30 : 38, lineHeight: width < 700 ? 35 : 43 }}>
                    {p.name}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,.72)", fontFamily: fonts.regular, fontSize: 14 }}>{p.address}</Text>
                  <Text style={{ color: "rgba(255,255,255,.72)", fontFamily: fonts.regular, fontSize: 13 }}>
                    Kunde: {p.customer_name}
                  </Text>
                  <Progress value={p.progress} />
                  <Text style={{ color: "rgba(255,255,255,.72)", fontFamily: fonts.regular, fontSize: 12 }}>
                    {p.progress}% · PL: {p.project_manager ? `${p.project_manager.first_name} ${p.project_manager.last_name}` : "–"}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  <Button title="Update" small onPress={() => setSheet("update")} testID="emp-add-update" />
                  <Button title="Fotos hochladen" small variant="light" onPress={uploadPhotos} loading={uploading} testID="emp-upload-photos" />
                  <Button
                    title="Fortschritt"
                    small
                    variant="light"
                    onPress={() => {
                      setProgress(String(p.progress));
                      setSheet("progress");
                    }}
                    testID="emp-set-progress"
                  />
                  <Button title="Bautagebuch" small variant="light" onPress={() => setSheet("diary")} testID="emp-add-diary" />
                  <Button title="Chat" small variant="light" onPress={() => router.push(`/client/chat/${id}`)} testID="emp-chat" />
                </View>

                {p.internal_notes ? (
                  <View style={s.card}>
                    <Text style={s.overline}>INTERNE NOTIZEN</Text>
                    <Text style={s.body}>{p.internal_notes}</Text>
                  </View>
                ) : null}

                {p.description ? (
                  <View style={s.card}>
                    <Text style={s.overline}>BESCHREIBUNG</Text>
                    <Text style={s.body}>{p.description}</Text>
                  </View>
                ) : null}
              </>
            ) : null}

            {tab === "Updates" ? (
              <>
                <Button title="Neues Update" onPress={() => setSheet("update")} testID="emp-add-update-2" />
                <Updates projectId={id} />
              </>
            ) : null}

            {tab === "Fotos" ? (
              <>
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  <Button
                    title="Fotos / Videos hochladen"
                    small
                    onPress={uploadPhotos}
                    loading={uploading}
                    testID="emp-upload-photos-2"
                  />
                  <Button
                    title="Vorher / Nachher"
                    small
                    variant="light"
                    onPress={() => setSheet("ba")}
                    testID="emp-add-before-after"
                  />
                </View>
                <MediaGrid projectId={id} />
                <Text style={s.overline}>VORHER / NACHHER</Text>
                <BeforeAfter projectId={id} editable />
              </>
            ) : null}

            {tab === "Aufgaben" ? (
              !tasks?.length ? (
                <Empty title="Keine Aufgaben" />
              ) : (
                tasks.map((t: any) => (
                  <View key={t.id} style={s.card} testID={`task-${t.id}`}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <Text style={[s.body, { fontSize: 12 }]}>
                        {t.priority} · fällig {fmtDate(t.due_date)}
                      </Text>
                      <Badge status={t.status} label={t.status} />
                    </View>
                    <Text style={s.title}>{t.title}</Text>
                    {t.description ? <Text style={s.body}>{t.description}</Text> : null}
                    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                      {(meta?.task_statuses || [])
                        .filter((st: string) => st !== t.status)
                        .map((st: string) => (
                          <Button
                            key={st}
                            title={st}
                            small
                            variant={st === "ERLEDIGT" ? "primary" : "ghost"}
                            onPress={() => taskStatus.mutate({ tid: t.id, status: st })}
                            testID={`task-${t.id}-${st}`}
                          />
                        ))}
                    </View>
                  </View>
                ))
              )
            ) : null}

            {tab === "Bautagebuch" ? (
              <>
                <Button title="Neuer Eintrag" onPress={() => setSheet("diary")} testID="emp-add-diary-2" />
                {!entries?.length ? (
                  <Empty title="Noch keine Einträge" />
                ) : (
                  entries.map((e: any) => (
                    <View key={e.id} style={s.card} testID={`diary-${e.id}`}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                        <Text style={[s.body, { fontSize: 12 }]}>
                          {fmtDate(e.date)} · {e.author_name}
                        </Text>
                        {e.client_visible ? (
                          <Badge status="COMPLETED" label="Kunde sieht" />
                        ) : (
                          <Badge label="intern" />
                        )}
                      </View>
                      <Text style={s.title}>{e.work_completed}</Text>
                      {e.materials ? <Text style={s.body}>Material: {e.materials}</Text> : null}
                      {e.problems ? <Text style={s.body}>Probleme: {e.problems}</Text> : null}
                      {e.weather ? <Text style={s.body}>Wetter: {e.weather}</Text> : null}
                      {e.notes ? <Text style={s.body}>{e.notes}</Text> : null}
                    </View>
                  ))
                )}
              </>
            ) : null}
          </View>
        </ScrollView>
      )}

      <BeforeAfterEditor projectId={id} open={sheet === "ba"} onClose={() => setSheet(null)} />

      <Sheet open={sheet === "update"} onClose={() => setSheet(null)} title="Projektupdate" testID="sheet-update">
        <Input label="Titel" value={upd.title} onChangeText={(v) => setUpd({ ...upd, title: v })} testID="upd-title" />
        <Input
          label="Beschreibung"
          value={upd.description}
          onChangeText={(v) => setUpd({ ...upd, description: v })}
          multiline
          testID="upd-desc"
        />
        <Input
          label="Fortschritt % (optional)"
          value={upd.progress}
          onChangeText={(v) => setUpd({ ...upd, progress: v.replace(/[^0-9]/g, "") })}
          keyboardType="number-pad"
          testID="upd-progress"
        />
        <Toggle
          label="Für Kunden sichtbar (löst Benachrichtigung aus)"
          value={upd.client_visible}
          onChange={(v) => setUpd({ ...upd, client_visible: v })}
          testID="upd-visible"
        />
        <Button
          title="Veröffentlichen"
          onPress={() => createUpdate.mutate()}
          loading={createUpdate.isPending}
          disabled={!upd.title}
          testID="upd-submit"
        />
      </Sheet>

      <Sheet open={sheet === "diary"} onClose={() => setSheet(null)} title="Bautagebuch" testID="sheet-diary">
        <Input
          label="Datum (JJJJ-MM-TT)"
          value={diary.date}
          onChangeText={(v) => setDiary({ ...diary, date: v })}
          testID="diary-date"
        />
        <Input
          label="Ausgeführte Arbeiten"
          value={diary.work_completed}
          onChangeText={(v) => setDiary({ ...diary, work_completed: v })}
          multiline
          testID="diary-work"
        />
        <Input
          label="Material"
          value={diary.materials}
          onChangeText={(v) => setDiary({ ...diary, materials: v })}
          testID="diary-materials"
        />
        <Input
          label="Probleme"
          value={diary.problems}
          onChangeText={(v) => setDiary({ ...diary, problems: v })}
          testID="diary-problems"
        />
        <Input
          label="Wetter (optional)"
          value={diary.weather}
          onChangeText={(v) => setDiary({ ...diary, weather: v })}
          testID="diary-weather"
        />
        <Input
          label="Notizen"
          value={diary.notes}
          onChangeText={(v) => setDiary({ ...diary, notes: v })}
          multiline
          testID="diary-notes"
        />
        <Toggle
          label="Für Kunden sichtbar"
          value={diary.client_visible}
          onChange={(v) => setDiary({ ...diary, client_visible: v })}
          testID="diary-visible"
        />
        <Button
          title="Eintrag speichern"
          onPress={() => createDiary.mutate()}
          loading={createDiary.isPending}
          disabled={!diary.work_completed}
          testID="diary-submit"
        />
      </Sheet>

      <Sheet open={sheet === "progress"} onClose={() => setSheet(null)} title="Fortschritt setzen" testID="sheet-progress">
        <Input
          label="Gesamtfortschritt in %"
          value={progress}
          onChangeText={(v) => setProgress(v.replace(/[^0-9]/g, ""))}
          keyboardType="number-pad"
          testID="progress-input"
        />
        <Button title="Speichern" onPress={() => setProg.mutate()} loading={setProg.isPending} testID="progress-submit" />
      </Sheet>
    </View>
  );
}
