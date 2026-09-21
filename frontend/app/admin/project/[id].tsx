import React, { useState } from "react";
import { View, ScrollView, Linking, Pressable, Text, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";

import { api, upload, fmtDate, fmtMoney } from "@/src/api";
import { ProjectTwin, ZoneDetail, Zone } from "@/src/three/Experiences";
import {
  Badge,
  Progress,
  ChipRow,
  Loading,
  Button,
  Input,
  Empty,
  useToast,
  STATUS_LABEL,
} from "@/src/components/ui";
import { Select, Toggle, Sheet, usePickers } from "@/src/components/forms";
import {
  Timeline,
  Updates,
  MediaGrid,
  BeforeAfter,
  Appointments,
  Documents,
  Team,
  pdfUrl,
} from "@/src/components/project-sections";
import { BeforeAfterEditor } from "@/src/components/BeforeAfterEditor";
import { PremiumHeader, StrokeIcon } from "@/src/components/premium";
import { makeStyles, useTheme, fonts } from "@/src/theme";

const TABS = [
  "Übersicht",
  "Fortschritt",
  "3D",
  "Timeline",
  "Bautagebuch",
  "Aufgaben",
  "Fotos",
  "Dokumente",
  "Angebote",
  "Rechnungen",
  "Termine",
  "Nachrichten",
  "Team",
  "Einstellungen",
];

const emptyZone = {
  object_name: "bathroom",
  display_name: "",
  description: "",
  progress: "0",
  status: "PLANNED",
  client_visible: true,
  expected_finish: "",
  assigned_employee_id: "",
};

const emptyItem = { description: "", quantity: "1", unit: "Stk.", unit_price: "" };

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  shell: { width: "100%", maxWidth: 1180, alignSelf: "center" },
  hero: {
    backgroundColor: c.surfaceInverse,
    borderRadius: 26,
    padding: 25,
    gap: 15,
  },
  panel: {
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  row: {
    minHeight: 72,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 1.3,
    color: c.onSurface,
    textTransform: "uppercase",
  },
  title: { fontFamily: fonts.semibold, color: c.onSurface, fontSize: 19, lineHeight: 25 },
  body: { fontFamily: fonts.regular, color: c.muted, fontSize: 14, lineHeight: 21 },
}));

function InfoRow({
  title,
  subtitle,
  onPress,
  last = false,
}: {
  title: string;
  subtitle: string;
  onPress?: () => void;
  last?: boolean;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[s.row, last && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.semibold, color: colors.onSurface, fontSize: 15 }}>{title}</Text>
        <Text style={[s.body, { marginTop: 3, fontSize: 12 }]}>{subtitle}</Text>
      </View>
      {onPress ? <StrokeIcon icon={ArrowUpRight01Icon} size={19} color={colors.onSurface} /> : null}
    </Pressable>
  );
}

export default function AdminProject() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { pickImages, pickDocument } = usePickers();
  const { width } = useWindowDimensions();
  const { id, tab: t0 } = useLocalSearchParams<{ id: string; tab?: string }>();

  const [tab, setTab] = useState(t0 && TABS.includes(t0) ? t0 : "Übersicht");
  const [sheet, setSheet] = useState<string | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [zf, setZf] = useState<any>(emptyZone);
  const [task, setTask] = useState({
    title: "",
    description: "",
    employee_id: "",
    priority: "NORMAL",
    due_date: "",
  });
  const [appt, setAppt] = useState({
    type: "Besichtigung",
    title: "",
    start: "",
    end: "",
    location: "",
    description: "",
    employee_id: "",
  });
  const [offer, setOffer] = useState<{ expiration_date: string; notes: string; items: any[] }>({
    expiration_date: "",
    notes: "",
    items: [{ ...emptyItem }],
  });
  const [invoice, setInvoice] = useState({ due_date: "", offer_id: "" });
  const [docMeta, setDocMeta] = useState({ category: "Plan", client_visible: true });
  const [cam, setCam] = useState({
    x: "8",
    y: "5",
    z: "8",
    auto_rotate: true,
    preset: "studio",
    background: "#EAE8E1",
  });
  const [settings, setSettings] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const { data: p, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => api(`/projects/${id}`),
  });
  const { data: zones } = useQuery({
    queryKey: ["zones", id],
    queryFn: () => api(`/projects/${id}/zones`),
  });
  const { data: model } = useQuery({
    queryKey: ["model", id],
    queryFn: () => api(`/projects/${id}/model`),
  });
  const { data: tasks } = useQuery({
    queryKey: ["tasks", id],
    queryFn: () => api(`/projects/${id}/tasks`),
  });
  const { data: diary } = useQuery({
    queryKey: ["diary", id],
    queryFn: () => api(`/projects/${id}/diary`),
  });
  const { data: offers } = useQuery({
    queryKey: ["offers", id],
    queryFn: () => api(`/offers?project_id=${id}`),
  });
  const { data: invoices } = useQuery({
    queryKey: ["invoices", id],
    queryFn: () => api(`/invoices?project_id=${id}`),
  });
  const { data: meta } = useQuery({
    queryKey: ["meta"],
    queryFn: () => api("/meta"),
  });
  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: () => api("/employees"),
  });

  const empLabels = Object.fromEntries(
    (employees || []).map((e: any) => [e.id, `${e.first_name} ${e.last_name}`]),
  );

  const inv = (...keys: string[]) => {
    keys.forEach((k) => qc.invalidateQueries({ queryKey: [k, id] }));
    qc.invalidateQueries({ queryKey: ["projects"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };
  const err = (e: any) => toast.show(e.message, "error");

  const patchProject = useMutation({
    mutationFn: (body: any) => api(`/projects/${id}`, { method: "PATCH", json: body }),
    onSuccess: () => {
      inv("project", "timeline");
      toast.show("Gespeichert", "success");
      setSheet(null);
    },
    onError: err,
  });

  const saveZone = useMutation({
    mutationFn: () => {
      const body = {
        ...zf,
        progress: Number(zf.progress) || 0,
        expected_finish: zf.expected_finish || null,
        assigned_employee_id: zf.assigned_employee_id || null,
      };
      return zf.id
        ? api(`/projects/${id}/zones/${zf.id}`, { method: "PATCH", json: body })
        : api(`/projects/${id}/zones`, { method: "POST", json: body });
    },
    onSuccess: () => {
      inv("zones", "timeline");
      setSheet(null);
      setZone(null);
      toast.show("Bereich gespeichert", "success");
    },
    onError: err,
  });

  const delZone = useMutation({
    mutationFn: (zid: string) => api(`/projects/${id}/zones/${zid}`, { method: "DELETE" }),
    onSuccess: () => {
      inv("zones");
      setZone(null);
      setSheet(null);
    },
    onError: err,
  });

  const saveCam = useMutation({
    mutationFn: () =>
      api(`/projects/${id}/model`, {
        method: "PATCH",
        json: {
          camera_config: {
            position: [Number(cam.x), Number(cam.y), Number(cam.z)],
            target: [0, 1.4, 0],
            fov: 40,
            auto_rotate: cam.auto_rotate,
          },
          environment_config: {
            preset: cam.preset,
            intensity: 1,
            background: cam.background,
          },
        },
      }),
    onSuccess: () => {
      inv("model");
      setSheet(null);
      toast.show("Kamera & Licht gespeichert", "success");
    },
    onError: err,
  });

  const createTask = useMutation({
    mutationFn: () =>
      api(`/projects/${id}/tasks`, {
        method: "POST",
        json: {
          ...task,
          employee_id: task.employee_id || null,
          due_date: task.due_date || null,
        },
      }),
    onSuccess: () => {
      inv("tasks");
      setSheet(null);
      setTask({
        title: "",
        description: "",
        employee_id: "",
        priority: "NORMAL",
        due_date: "",
      });
    },
    onError: err,
  });

  const taskStatus = useMutation({
    mutationFn: ({ tid, status }: any) =>
      api(`/projects/${id}/tasks/${tid}`, { method: "PATCH", json: { status } }),
    onSuccess: () => inv("tasks"),
  });

  const createAppt = useMutation({
    mutationFn: () =>
      api("/appointments", {
        method: "POST",
        json: {
          ...appt,
          project_id: id,
          end: appt.end || null,
          employee_id: appt.employee_id || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      inv("project");
      setSheet(null);
      toast.show("Termin angelegt", "success");
    },
    onError: err,
  });

  const createOffer = useMutation({
    mutationFn: () =>
      api("/offers", {
        method: "POST",
        json: {
          customer_id: p.customer_id,
          project_id: id,
          expiration_date: offer.expiration_date || null,
          notes: offer.notes,
          items: offer.items
            .filter((i) => i.description)
            .map((i) => ({
              ...i,
              quantity: Number(i.quantity) || 1,
              unit_price: Number(String(i.unit_price).replace(",", ".")) || 0,
            })),
        },
      }),
    onSuccess: () => {
      inv("offers");
      setSheet(null);
      toast.show("Angebot als Entwurf erstellt", "success");
    },
    onError: err,
  });

  const offerStatus = useMutation({
    mutationFn: ({ oid, status }: any) =>
      api(`/offers/${oid}`, { method: "PATCH", json: { status } }),
    onSuccess: () => {
      inv("offers");
      toast.show("Angebot aktualisiert", "success");
    },
    onError: err,
  });

  const createInvoice = useMutation({
    mutationFn: () =>
      api("/invoices", {
        method: "POST",
        json: {
          customer_id: p.customer_id,
          project_id: id,
          offer_id: invoice.offer_id || null,
          due_date: invoice.due_date || null,
          items: [],
        },
      }),
    onSuccess: () => {
      inv("invoices");
      setSheet(null);
      toast.show("Rechnung erstellt", "success");
    },
    onError: err,
  });

  const invoiceStatus = useMutation({
    mutationFn: ({ iid, status }: any) =>
      api(`/invoices/${iid}`, { method: "PATCH", json: { status } }),
    onSuccess: () => inv("invoices"),
    onError: err,
  });

  const saveTeam = useMutation({
    mutationFn: (body: any) => api(`/projects/${id}/team`, { method: "PATCH", json: body }),
    onSuccess: () => {
      inv("project");
      toast.show("Team aktualisiert", "success");
    },
    onError: err,
  });

  const uploadModel = async () => {
    const f = await pickDocument(["*/*"]);
    if (!f) return;
    if (!/\.(glb|gltf)$/i.test(f.name)) return toast.show("Nur .glb oder .gltf", "error");
    setBusy(true);
    try {
      await upload(`/projects/${id}/model`, [f], {}, "file");
      inv("model", "project");
      toast.show("3D-Modell hochgeladen", "success");
    } catch (e: any) {
      err(e);
    } finally {
      setBusy(false);
    }
  };

  const uploadPhotos = async (zoneId?: string) => {
    const files = await pickImages();
    if (!files.length) return;
    setBusy(true);
    try {
      await upload(`/projects/${id}/media`, files, {
        client_visible: "true",
        zone_id: zoneId || "",
      });
      inv("media", "project");
      toast.show("Fotos hochgeladen", "success");
    } catch (e: any) {
      err(e);
    } finally {
      setBusy(false);
    }
  };

  const uploadDoc = async () => {
    const f = await pickDocument();
    if (!f) return;
    setBusy(true);
    try {
      await upload(
        `/projects/${id}/documents`,
        [f],
        {
          category: docMeta.category,
          client_visible: String(docMeta.client_visible),
        },
        "file",
      );
      inv("documents", "project");
      setSheet(null);
      toast.show("Dokument hochgeladen", "success");
    } catch (e: any) {
      err(e);
    } finally {
      setBusy(false);
    }
  };

  const editZone = (z: Zone) => {
    setZf({
      ...z,
      progress: String(z.progress),
      expected_finish: z.expected_finish || "",
      assigned_employee_id: z.assigned_employee_id || "",
    });
    setSheet("zone");
  };

  const pad = width < 700 ? 20 : 34;
  const heroTitle = width < 700 ? 31 : 42;

  return (
    <View style={s.screen}>
      <PremiumHeader
        title={p?.name || "Projekt"}
        subtitle={p ? `${p.number} · ${p.customer_name}` : ""}
      />
      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <ChipRow items={TABS} value={tab} onChange={setTab} testID="admin-project-tabs" />
      </View>

      {isLoading || !p ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: pad,
            paddingTop: 24,
            paddingBottom: 70,
          }}
          testID={`admin-section-${tab}`}
        >
          <View style={[s.shell, { gap: 18 }]}>
            {tab === "Übersicht" ? (
              <>
                <View style={s.hero}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.2, color: "rgba(255,255,255,.65)" }}>
                      {p.number}
                    </Text>
                    <Badge status={p.status} />
                  </View>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: heroTitle, lineHeight: heroTitle * 1.06, color: "#fff", letterSpacing: -1 }}>
                    {p.name}
                  </Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: "rgba(255,255,255,.7)" }}>
                    {p.address}
                  </Text>
                  <Progress value={p.progress} />
                  <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: "rgba(255,255,255,.7)" }}>
                    {p.progress}% · {p.stage}
                  </Text>
                </View>

                <View style={s.panel}>
                  <Text style={s.label}>PROJEKTSTEUERUNG</Text>
                  <Select
                    label="Phase"
                    value={p.stage}
                    options={meta?.workflow_stages || []}
                    onChange={(v) => patchProject.mutate({ stage: v })}
                    testID="project-stage"
                  />
                  <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                    <Button
                      title="Fortschritt"
                      small
                      variant="light"
                      onPress={() => {
                        setSettings({ progress: String(p.progress) });
                        setSheet("progress");
                      }}
                      testID="set-progress"
                    />
                    <Button
                      title="Chat"
                      small
                      variant="light"
                      onPress={() => router.push(`/client/chat/${id}`)}
                      testID="admin-chat"
                    />
                    <Button
                      title="Kundenansicht"
                      small
                      variant="light"
                      onPress={() => router.push(`/client/project/${id}`)}
                      testID="client-view"
                    />
                  </View>
                </View>

                <View style={[s.panel, { padding: 0, overflow: "hidden" }]}>
                  <InfoRow
                    title={p.customer?.name || p.customer_name}
                    subtitle={`${p.customer?.email || ""} · ${p.customer?.phone || ""}`}
                  />
                  <InfoRow
                    title={`${fmtDate(p.start_date)} → ${fmtDate(p.planned_finish)}`}
                    subtitle="Zeitraum"
                  />
                  <InfoRow title={p.budget || "–"} subtitle="Budget" />
                  <InfoRow
                    title={p.has_3d_model ? "3D-Modell vorhanden" : "Kein 3D-Modell"}
                    subtitle={`${zones?.length || 0} Bereiche`}
                    onPress={() => setTab("3D")}
                    last
                  />
                </View>

                {p.internal_notes ? (
                  <View style={s.panel}>
                    <Text style={s.label}>INTERNE NOTIZEN</Text>
                    <Text style={s.body}>{p.internal_notes}</Text>
                  </View>
                ) : null}
              </>
            ) : null}

            {tab === "Fortschritt" ? (
              <>
                <Button
                  title="Update veröffentlichen"
                  onPress={() => {
                    setSettings({
                      title: "",
                      description: "",
                      progress: String(p.progress),
                      client_visible: true,
                    });
                    setSheet("update");
                  }}
                  testID="add-update"
                />
                <Updates projectId={id} />
              </>
            ) : null}

            {tab === "3D" ? (
              <>
                <Text style={s.label}>PROJEKT 3D · EDITOR</Text>
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  <Button
                    title={model ? `GLB ersetzen (v${model.version})` : "GLB / GLTF hochladen"}
                    small
                    onPress={uploadModel}
                    loading={busy}
                    testID="upload-glb"
                  />
                  <Button
                    title="Bereich hinzufügen"
                    small
                    variant="light"
                    onPress={() => {
                      setZf({ ...emptyZone });
                      setSheet("zone");
                    }}
                    testID="add-zone"
                  />
                  {model ? (
                    <Button
                      title="Kamera & Licht"
                      small
                      variant="light"
                      onPress={() => {
                        const c = model.camera_config?.position || [8, 5, 8];
                        setCam({
                          x: String(c[0]),
                          y: String(c[1]),
                          z: String(c[2]),
                          auto_rotate: model.camera_config?.auto_rotate ?? true,
                          preset: model.environment_config?.preset || "studio",
                          background: model.environment_config?.background || "#EAE8E1",
                        });
                        setSheet("camera");
                      }}
                      testID="camera-config"
                    />
                  ) : null}
                </View>

                <Text style={s.body}>
                  {model
                    ? `Modell v${model.version} · ${fmtDate(model.created_at, true)} · Objekte im GLB per Namen mit Bereichen verknüpfen.`
                    : "Ohne GLB wird das schematische Haus verwendet. Objektnamen: bathroom, walls, ceiling, floor, doors, windows, interior, exterior."}
                </Text>

                <ProjectTwin
                  zones={zones || []}
                  model={model}
                  start={p.start_date || p.created_at}
                  end={p.planned_finish}
                  onSelectZone={setZone}
                  selectedId={zone?.id}
                />

                {zone ? (
                  <>
                    <ZoneDetail zone={zone} />
                    <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                      <Button title="Bearbeiten" small onPress={() => editZone(zone)} testID="edit-zone" />
                      <Button
                        title="Fotos anhängen"
                        small
                        variant="light"
                        onPress={() => uploadPhotos(zone.id)}
                        testID="zone-photos"
                      />
                      <Button
                        title="Entfernen"
                        small
                        variant="ghost"
                        onPress={() => delZone.mutate(zone.id)}
                        testID="delete-zone"
                      />
                    </View>
                  </>
                ) : null}

                {!(zones || []).length ? (
                  <Empty
                    title="Noch keine Bereiche"
                    text="Definieren Sie Räume und Elemente, damit Kunden den Fortschritt in 3D sehen."
                  />
                ) : null}
              </>
            ) : null}

            {tab === "Timeline" ? <Timeline projectId={id} /> : null}

            {tab === "Bautagebuch" ? (
              !diary?.length ? (
                <Empty title="Keine Einträge" text="Mitarbeiter erstellen Einträge im Mitarbeiterportal." />
              ) : (
                diary.map((e: any) => (
                  <View key={e.id} style={s.panel}>
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
                  </View>
                ))
              )
            ) : null}

            {tab === "Aufgaben" ? (
              <>
                <Button title="Aufgabe anlegen" onPress={() => setSheet("task")} testID="add-task" />
                {!tasks?.length ? (
                  <Empty title="Keine Aufgaben" />
                ) : (
                  tasks.map((t: any) => (
                    <View key={t.id} style={s.panel} testID={`admin-task-${t.id}`}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                        <Text style={[s.body, { fontSize: 12 }]}>
                          {empLabels[t.employee_id] || "Nicht zugewiesen"} · {t.priority} · {fmtDate(t.due_date)}
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
                              variant="ghost"
                              onPress={() => taskStatus.mutate({ tid: t.id, status: st })}
                              testID={`admin-task-${t.id}-${st}`}
                            />
                          ))}
                      </View>
                    </View>
                  ))
                )}
              </>
            ) : null}

            {tab === "Fotos" ? (
              <>
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  <Button
                    title="Fotos / Videos hochladen"
                    small
                    onPress={() => uploadPhotos()}
                    loading={busy}
                    testID="admin-upload-photos"
                  />
                  <Button
                    title="Vorher / Nachher erstellen"
                    small
                    variant="light"
                    onPress={() => setSheet("ba")}
                    testID="admin-add-before-after"
                  />
                </View>
                <MediaGrid projectId={id} />
                <Text style={s.label}>VORHER / NACHHER</Text>
                <BeforeAfter projectId={id} editable />
              </>
            ) : null}

            {tab === "Dokumente" ? (
              <>
                <Button title="Dokument hochladen" onPress={() => setSheet("doc")} testID="admin-upload-doc" />
                <Documents projectId={id} />
              </>
            ) : null}

            {tab === "Angebote" ? (
              <>
                <Button title="Angebot erstellen" onPress={() => setSheet("offer")} testID="add-offer" />
                {!offers?.length ? (
                  <Empty title="Keine Angebote" />
                ) : (
                  offers.map((o: any) => (
                    <View key={o.id} style={s.panel} testID={`admin-offer-${o.id}`}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                        <Text style={[s.body, { fontSize: 12 }]}>
                          {o.number} · {fmtDate(o.date)} · v{o.version}
                        </Text>
                        <Badge status={o.status} />
                      </View>
                      <Text style={[s.title, { fontSize: 27 }]}>{fmtMoney(o.total)}</Text>
                      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                        <Button
                          title="PDF"
                          small
                          variant="light"
                          onPress={() => Linking.openURL(pdfUrl(`/offers/${o.id}/pdf`))}
                          testID={`offer-pdf-${o.id}`}
                        />
                        {o.status === "DRAFT" ? (
                          <Button
                            title="An Kunden senden"
                            small
                            onPress={() => offerStatus.mutate({ oid: o.id, status: "SENT" })}
                            testID={`offer-send-${o.id}`}
                          />
                        ) : null}
                        {o.status === "ACCEPTED" ? (
                          <Button
                            title="Rechnung daraus"
                            small
                            onPress={() => {
                              setInvoice({ due_date: "", offer_id: o.id });
                              setSheet("invoice");
                            }}
                            testID={`offer-invoice-${o.id}`}
                          />
                        ) : null}
                        <Button
                          title="Details"
                          small
                          variant="ghost"
                          onPress={() => router.push(`/client/offer/${o.id}`)}
                          testID={`offer-open-${o.id}`}
                        />
                      </View>
                      {o.acceptance ? (
                        <Text style={[s.body, { fontSize: 12 }]}>
                          {STATUS_LABEL[o.acceptance.status]} am {fmtDate(o.acceptance.timestamp, true)} · {o.acceptance.user_email} · IP {o.acceptance.ip}
                        </Text>
                      ) : null}
                    </View>
                  ))
                )}
              </>
            ) : null}

            {tab === "Rechnungen" ? (
              <>
                <Button
                  title="Rechnung erstellen"
                  onPress={() => {
                    setInvoice({ due_date: "", offer_id: "" });
                    setSheet("invoice");
                  }}
                  testID="add-invoice"
                />
                {!invoices?.length ? (
                  <Empty title="Keine Rechnungen" />
                ) : (
                  invoices.map((i: any) => (
                    <View key={i.id} style={s.panel} testID={`admin-invoice-${i.id}`}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                        <Text style={[s.body, { fontSize: 12 }]}>
                          {i.number} · fällig {fmtDate(i.due_date)}
                        </Text>
                        <Badge status={i.status} />
                      </View>
                      <Text style={[s.title, { fontSize: 27 }]}>{fmtMoney(i.total)}</Text>
                      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                        <Button
                          title="PDF"
                          small
                          variant="light"
                          onPress={() => Linking.openURL(pdfUrl(`/invoices/${i.id}/pdf`))}
                          testID={`invoice-pdf-${i.id}`}
                        />
                        {i.status !== "PAID" ? (
                          <Button
                            title="Als bezahlt"
                            small
                            onPress={() => invoiceStatus.mutate({ iid: i.id, status: "PAID" })}
                            testID={`invoice-paid-${i.id}`}
                          />
                        ) : null}
                        {i.status !== "CANCELLED" && i.status !== "PAID" ? (
                          <Button
                            title="Stornieren"
                            small
                            variant="ghost"
                            onPress={() => invoiceStatus.mutate({ iid: i.id, status: "CANCELLED" })}
                            testID={`invoice-cancel-${i.id}`}
                          />
                        ) : null}
                      </View>
                    </View>
                  ))
                )}
              </>
            ) : null}

            {tab === "Termine" ? (
              <>
                <Button title="Termin anlegen" onPress={() => setSheet("appt")} testID="add-appointment" />
                <Appointments projectId={id} />
              </>
            ) : null}

            {tab === "Nachrichten" ? (
              <View style={s.panel}>
                <Text style={s.label}>PROJEKTCHAT</Text>
                <Text style={s.body}>Realtime-Kommunikation mit Kunde und Projektteam.</Text>
                <Button
                  title="Projektchat öffnen"
                  onPress={() => router.push(`/client/chat/${id}`)}
                  testID="open-chat"
                />
              </View>
            ) : null}

            {tab === "Team" ? (
              <>
                <Select
                  label="Projektleitung"
                  value={p.project_manager_id}
                  options={(employees || []).map((e: any) => e.id)}
                  labels={empLabels}
                  onChange={(v) => saveTeam.mutate({ project_manager_id: v })}
                  testID="team-pm"
                />
                <Text style={s.label}>MITARBEITER</Text>
                {(employees || []).map((e: any) => (
                  <Toggle
                    key={e.id}
                    label={`${e.first_name} ${e.last_name} · ${e.role}`}
                    value={(p.employee_ids || []).includes(e.id)}
                    onChange={(on) =>
                      saveTeam.mutate({
                        employee_ids: on
                          ? [...p.employee_ids, e.id]
                          : p.employee_ids.filter((x: string) => x !== e.id),
                      })
                    }
                    testID={`team-${e.id}`}
                  />
                ))}
                <Team project={p} />
              </>
            ) : null}

            {tab === "Einstellungen" ? (
              <View style={s.panel}>
                <Text style={s.label}>PROJEKTEINSTELLUNGEN</Text>
                <Button
                  title="Stammdaten bearbeiten"
                  variant="light"
                  onPress={() => {
                    setSettings({
                      name: p.name,
                      address: p.address,
                      description: p.description,
                      start_date: p.start_date || "",
                      planned_finish: p.planned_finish || "",
                      budget: p.budget || "",
                      internal_notes: p.internal_notes || "",
                      client_notes: p.client_notes || "",
                    });
                    setSheet("settings");
                  }}
                  testID="edit-settings"
                />
                <Button
                  title={p.status === "ACTIVE" ? "Projekt abschließen" : "Projekt reaktivieren"}
                  variant="ghost"
                  onPress={() =>
                    patchProject.mutate({
                      status: p.status === "ACTIVE" ? "COMPLETED" : "ACTIVE",
                      actual_finish: p.status === "ACTIVE" ? new Date().toISOString() : null,
                    })
                  }
                  testID="toggle-status"
                />
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}

      <BeforeAfterEditor
        projectId={id}
        open={sheet === "ba"}
        onClose={() => setSheet(null)}
      />

      <Sheet
        open={sheet === "zone"}
        onClose={() => setSheet(null)}
        title={zf.id ? "Bereich bearbeiten" : "Neuer Bereich"}
        testID="sheet-zone"
      >
        <Input
          label="Anzeigename (z. B. Badezimmer)"
          value={zf.display_name}
          onChangeText={(v) => setZf({ ...zf, display_name: v })}
          testID="zone-name"
        />
        <Input
          label="3D-Objektname (Mesh-Name im GLB oder bathroom/walls/…)"
          value={zf.object_name}
          onChangeText={(v) => setZf({ ...zf, object_name: v })}
          autoCapitalize="none"
          testID="zone-object"
        />
        <Input
          label="Beschreibung"
          value={zf.description}
          onChangeText={(v) => setZf({ ...zf, description: v })}
          multiline
          testID="zone-desc"
        />
        <Select
          label="Status"
          value={zf.status}
          options={meta?.zone_statuses || []}
          labels={STATUS_LABEL}
          onChange={(v) => setZf({ ...zf, status: v })}
          testID="zone-status"
        />
        <Input
          label="Fortschritt %"
          value={zf.progress}
          onChangeText={(v) => setZf({ ...zf, progress: v.replace(/[^0-9]/g, "") })}
          keyboardType="number-pad"
          testID="zone-progress"
        />
        <Select
          label="Projektphase"
          value={zf.project_stage}
          options={meta?.workflow_stages || []}
          onChange={(v) => setZf({ ...zf, project_stage: v })}
          testID="zone-stage"
        />
        <Select
          label="Zuständig"
          value={zf.assigned_employee_id || null}
          options={(employees || []).map((e: any) => e.id)}
          labels={empLabels}
          onChange={(v) => setZf({ ...zf, assigned_employee_id: v })}
          testID="zone-employee"
        />
        <Input
          label="Geplant fertig (JJJJ-MM-TT)"
          value={zf.expected_finish}
          onChangeText={(v) => setZf({ ...zf, expected_finish: v })}
          testID="zone-finish"
        />
        <Input
          label="Eigene Farbe (optional, Hex)"
          value={zf.color_state || ""}
          onChangeText={(v) => setZf({ ...zf, color_state: v || null })}
          autoCapitalize="none"
          testID="zone-color"
        />
        <Toggle
          label="Für Kunden sichtbar"
          value={zf.client_visible}
          onChange={(v) => setZf({ ...zf, client_visible: v })}
          testID="zone-visible"
        />
        <Button
          title="Speichern"
          onPress={() => saveZone.mutate()}
          loading={saveZone.isPending}
          disabled={!zf.display_name}
          testID="zone-submit"
        />
      </Sheet>

      <Sheet
        open={sheet === "camera"}
        onClose={() => setSheet(null)}
        title="Kamera, Rotation & Licht"
        testID="sheet-camera"
      >
        <View style={{ flexDirection: "row", gap: 10 }}>
          {(["x", "y", "z"] as const).map((k) => (
            <View key={k} style={{ flex: 1 }}>
              <Input
                label={`Kamera ${k.toUpperCase()}`}
                value={(cam as any)[k]}
                onChangeText={(v) => setCam({ ...cam, [k]: v })}
                keyboardType="numeric"
                testID={`cam-${k}`}
              />
            </View>
          ))}
        </View>
        <Toggle
          label="Automatische Rotation"
          value={cam.auto_rotate}
          onChange={(v) => setCam({ ...cam, auto_rotate: v })}
          testID="cam-rotate"
        />
        <Select
          label="Licht-Preset"
          value={cam.preset}
          options={["studio", "daylight", "warm", "night"]}
          onChange={(v) => setCam({ ...cam, preset: v })}
          testID="cam-preset"
        />
        <Input
          label="Hintergrund (Hex)"
          value={cam.background}
          onChangeText={(v) => setCam({ ...cam, background: v })}
          autoCapitalize="none"
          testID="cam-bg"
        />
        <Button
          title="Speichern"
          onPress={() => saveCam.mutate()}
          loading={saveCam.isPending}
          testID="cam-submit"
        />
      </Sheet>

      <Sheet open={sheet === "task"} onClose={() => setSheet(null)} title="Neue Aufgabe" testID="sheet-task">
        <Input
          label="Titel"
          value={task.title}
          onChangeText={(v) => setTask({ ...task, title: v })}
          testID="task-title"
        />
        <Input
          label="Beschreibung"
          value={task.description}
          onChangeText={(v) => setTask({ ...task, description: v })}
          multiline
          testID="task-desc"
        />
        <Select
          label="Mitarbeiter"
          value={task.employee_id || null}
          options={(employees || []).map((e: any) => e.id)}
          labels={empLabels}
          onChange={(v) => setTask({ ...task, employee_id: v })}
          testID="task-employee"
        />
        <Select
          label="Priorität"
          value={task.priority}
          options={["NIEDRIG", "NORMAL", "HOCH", "DRINGEND"]}
          onChange={(v) => setTask({ ...task, priority: v })}
          testID="task-priority"
        />
        <Input
          label="Fällig (JJJJ-MM-TT)"
          value={task.due_date}
          onChangeText={(v) => setTask({ ...task, due_date: v })}
          testID="task-due"
        />
        <Button
          title="Anlegen"
          onPress={() => createTask.mutate()}
          loading={createTask.isPending}
          disabled={!task.title}
          testID="task-submit"
        />
      </Sheet>

      <Sheet open={sheet === "appt"} onClose={() => setSheet(null)} title="Neuer Termin" testID="sheet-appt">
        <Select
          label="Art"
          value={appt.type}
          options={meta?.appointment_types || []}
          onChange={(v) => setAppt({ ...appt, type: v })}
          testID="appt-type"
        />
        <Input label="Titel" value={appt.title} onChangeText={(v) => setAppt({ ...appt, title: v })} testID="appt-title" />
        <Input
          label="Start (JJJJ-MM-TTTHH:MM)"
          value={appt.start}
          onChangeText={(v) => setAppt({ ...appt, start: v })}
          placeholder="2026-07-01T09:00"
          autoCapitalize="none"
          testID="appt-start"
        />
        <Input label="Ende (optional)" value={appt.end} onChangeText={(v) => setAppt({ ...appt, end: v })} autoCapitalize="none" testID="appt-end" />
        <Input label="Ort" value={appt.location} onChangeText={(v) => setAppt({ ...appt, location: v })} testID="appt-location" />
        <Select
          label="Mitarbeiter"
          value={appt.employee_id || null}
          options={(employees || []).map((e: any) => e.id)}
          labels={empLabels}
          onChange={(v) => setAppt({ ...appt, employee_id: v })}
          testID="appt-employee"
        />
        <Input
          label="Beschreibung"
          value={appt.description}
          onChangeText={(v) => setAppt({ ...appt, description: v })}
          multiline
          testID="appt-desc"
        />
        <Button
          title="Termin anlegen"
          onPress={() => createAppt.mutate()}
          loading={createAppt.isPending}
          disabled={!appt.title || !appt.start}
          testID="appt-submit"
        />
      </Sheet>

      <Sheet open={sheet === "offer"} onClose={() => setSheet(null)} title="Angebot erstellen" testID="sheet-offer">
        {offer.items.map((it, i) => (
          <View key={i} style={s.panel}>
            <Input
              label={`Position ${i + 1}`}
              value={it.description}
              onChangeText={(v) => {
                const items = [...offer.items];
                items[i] = { ...it, description: v };
                setOffer({ ...offer, items });
              }}
              testID={`offer-item-${i}-desc`}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Menge"
                  value={it.quantity}
                  onChangeText={(v) => {
                    const items = [...offer.items];
                    items[i] = { ...it, quantity: v };
                    setOffer({ ...offer, items });
                  }}
                  keyboardType="numeric"
                  testID={`offer-item-${i}-qty`}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Einheit"
                  value={it.unit}
                  onChangeText={(v) => {
                    const items = [...offer.items];
                    items[i] = { ...it, unit: v };
                    setOffer({ ...offer, items });
                  }}
                  testID={`offer-item-${i}-unit`}
                />
              </View>
              <View style={{ flex: 1.4 }}>
                <Input
                  label="Einzelpreis €"
                  value={it.unit_price}
                  onChangeText={(v) => {
                    const items = [...offer.items];
                    items[i] = { ...it, unit_price: v };
                    setOffer({ ...offer, items });
                  }}
                  keyboardType="decimal-pad"
                  testID={`offer-item-${i}-price`}
                />
              </View>
            </View>
          </View>
        ))}
        <Button
          title="Position hinzufügen"
          small
          variant="light"
          onPress={() => setOffer({ ...offer, items: [...offer.items, { ...emptyItem }] })}
          testID="offer-add-item"
        />
        <Input
          label="Gültig bis (JJJJ-MM-TT)"
          value={offer.expiration_date}
          onChangeText={(v) => setOffer({ ...offer, expiration_date: v })}
          testID="offer-expiry"
        />
        <Input
          label="Hinweise"
          value={offer.notes}
          onChangeText={(v) => setOffer({ ...offer, notes: v })}
          multiline
          testID="offer-notes"
        />
        <Text style={s.body}>
          MwSt. 19 % · Netto{" "}
          {fmtMoney(
            offer.items.reduce(
              (a, i) =>
                a +
                (Number(i.quantity) || 0) *
                  (Number(String(i.unit_price).replace(",", ".")) || 0),
              0,
            ),
          )}
        </Text>
        <Button
          title="Als Entwurf speichern"
          onPress={() => createOffer.mutate()}
          loading={createOffer.isPending}
          disabled={!offer.items.some((i) => i.description)}
          testID="offer-submit"
        />
      </Sheet>

      <Sheet open={sheet === "invoice"} onClose={() => setSheet(null)} title="Rechnung erstellen" testID="sheet-invoice">
        <Select
          label="Aus Angebot übernehmen"
          value={invoice.offer_id || null}
          options={(offers || []).filter((o: any) => o.status === "ACCEPTED").map((o: any) => o.id)}
          labels={Object.fromEntries((offers || []).map((o: any) => [o.id, `${o.number} · ${fmtMoney(o.total)}`]))}
          onChange={(v) => setInvoice({ ...invoice, offer_id: v })}
          placeholder="Angenommenes Angebot wählen"
          testID="invoice-offer"
        />
        <Input
          label="Fällig am (JJJJ-MM-TT)"
          value={invoice.due_date}
          onChangeText={(v) => setInvoice({ ...invoice, due_date: v })}
          testID="invoice-due"
        />
        <Button
          title="Rechnung erstellen"
          onPress={() => createInvoice.mutate()}
          loading={createInvoice.isPending}
          disabled={!invoice.offer_id}
          testID="invoice-submit"
        />
        <Text style={s.body}>
          Positionen werden aus dem angenommenen Angebot übernommen. Kunde wird benachrichtigt.
        </Text>
      </Sheet>

      <Sheet open={sheet === "doc"} onClose={() => setSheet(null)} title="Dokument hochladen" testID="sheet-doc">
        <Select
          label="Kategorie"
          value={docMeta.category}
          options={meta?.doc_categories || []}
          onChange={(v) => setDocMeta({ ...docMeta, category: v })}
          testID="doc-category"
        />
        <Toggle
          label="Für Kunden sichtbar"
          value={docMeta.client_visible}
          onChange={(v) => setDocMeta({ ...docMeta, client_visible: v })}
          testID="doc-visible"
        />
        <Button
          title="Datei wählen & hochladen"
          onPress={uploadDoc}
          loading={busy}
          testID="doc-submit"
        />
      </Sheet>

      <Sheet open={sheet === "progress"} onClose={() => setSheet(null)} title="Gesamtfortschritt" testID="sheet-progress">
        <Input
          label="Fortschritt %"
          value={settings?.progress || ""}
          onChangeText={(v) => setSettings({ progress: v.replace(/[^0-9]/g, "") })}
          keyboardType="number-pad"
          testID="progress-input"
        />
        <Button
          title="Speichern"
          onPress={() => patchProject.mutate({ progress: Number(settings?.progress) || 0 })}
          loading={patchProject.isPending}
          testID="progress-submit"
        />
      </Sheet>

      <Sheet open={sheet === "update"} onClose={() => setSheet(null)} title="Projektupdate" testID="sheet-update">
        <Input
          label="Titel"
          value={settings?.title || ""}
          onChangeText={(v) => setSettings({ ...settings, title: v })}
          testID="upd-title"
        />
        <Input
          label="Beschreibung"
          value={settings?.description || ""}
          onChangeText={(v) => setSettings({ ...settings, description: v })}
          multiline
          testID="upd-desc"
        />
        <Input
          label="Fortschritt %"
          value={settings?.progress || ""}
          onChangeText={(v) => setSettings({ ...settings, progress: v.replace(/[^0-9]/g, "") })}
          keyboardType="number-pad"
          testID="upd-progress"
        />
        <Toggle
          label="Für Kunden sichtbar (Benachrichtigung)"
          value={settings?.client_visible ?? true}
          onChange={(v) => setSettings({ ...settings, client_visible: v })}
          testID="upd-visible"
        />
        <Button
          title="Veröffentlichen"
          onPress={async () => {
            try {
              await api(`/projects/${id}/updates`, {
                method: "POST",
                json: {
                  title: settings.title,
                  description: settings.description,
                  progress: settings.progress ? Number(settings.progress) : null,
                  client_visible: settings.client_visible ?? true,
                },
              });
              inv("updates", "project", "timeline");
              setSheet(null);
              toast.show("Update veröffentlicht", "success");
            } catch (e: any) {
              err(e);
            }
          }}
          disabled={!settings?.title}
          testID="upd-submit"
        />
      </Sheet>

      <Sheet open={sheet === "settings"} onClose={() => setSheet(null)} title="Projekt bearbeiten" testID="sheet-settings">
        {settings ? (
          <>
            <Input label="Name" value={settings.name} onChangeText={(v) => setSettings({ ...settings, name: v })} testID="st-name" />
            <Input label="Adresse" value={settings.address} onChangeText={(v) => setSettings({ ...settings, address: v })} testID="st-address" />
            <Input
              label="Beschreibung"
              value={settings.description}
              onChangeText={(v) => setSettings({ ...settings, description: v })}
              multiline
              testID="st-desc"
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Input label="Start" value={settings.start_date} onChangeText={(v) => setSettings({ ...settings, start_date: v })} testID="st-start" />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Geplantes Ende"
                  value={settings.planned_finish}
                  onChangeText={(v) => setSettings({ ...settings, planned_finish: v })}
                  testID="st-end"
                />
              </View>
            </View>
            <Input label="Budget" value={settings.budget} onChangeText={(v) => setSettings({ ...settings, budget: v })} testID="st-budget" />
            <Input
              label="Interne Notizen"
              value={settings.internal_notes}
              onChangeText={(v) => setSettings({ ...settings, internal_notes: v })}
              multiline
              testID="st-internal"
            />
            <Input
              label="Hinweise für Kunden"
              value={settings.client_notes}
              onChangeText={(v) => setSettings({ ...settings, client_notes: v })}
              multiline
              testID="st-client-notes"
            />
            <Button
              title="Speichern"
              onPress={() =>
                patchProject.mutate({
                  ...settings,
                  start_date: settings.start_date || null,
                  planned_finish: settings.planned_finish || null,
                })
              }
              loading={patchProject.isPending}
              testID="st-submit"
            />
          </>
        ) : null}
      </Sheet>
    </View>
  );
}
