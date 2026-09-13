import React, { useEffect, useRef, useState } from "react";
import { View, FlatList, Pressable, TextInput, Linking, Platform } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import * as ImagePicker from "expo-image-picker";
import Ionicons from "@react-native-vector-icons/ionicons";
import { api, abs, upload, fmtDate } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Caption, Small, ScreenHeader, useToast } from "@/src/components/ui";
import { makeStyles, useTheme, space, radius, fonts } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  bubble: { maxWidth: "80%", padding: space.md, borderRadius: radius.lg, gap: 4 },
  mine: { alignSelf: "flex-end", backgroundColor: c.surfaceInverse, borderBottomRightRadius: 6 },
  theirs: { alignSelf: "flex-start", backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderBottomLeftRadius: 6 },
  system: { alignSelf: "center", backgroundColor: c.surfaceTertiary, paddingHorizontal: space.lg, paddingVertical: 6, borderRadius: radius.pill },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, paddingHorizontal: space.lg, paddingVertical: 10, fontSize: 16, color: c.onSurface, fontFamily: fonts.text },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceInverse, alignItems: "center", justifyContent: "center" },
  attach: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
}));

export default function Chat() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [text, setText] = useState("");
  const lastTyping = useRef(0);
  const listRef = useRef<FlatList>(null);
  const { data: p } = useQuery({ queryKey: ["project", id], queryFn: () => api(`/projects/${id}`) });
  const { data } = useQuery({ queryKey: ["messages", id], queryFn: () => api(`/projects/${id}/messages`), refetchInterval: 3000 });
  const send = useMutation({
    mutationFn: (body: any) => api(`/projects/${id}/messages`, { method: "POST", json: body }),
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["messages", id] }); qc.invalidateQueries({ queryKey: ["client-dashboard"] }); },
    onError: (e: any) => toast.show(e.message, "error"),
  });
  const messages = data?.messages || [];
  useEffect(() => { if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100); }, [messages.length]);

  const onType = (v: string) => {
    setText(v);
    if (Date.now() - lastTyping.current > 3000) { lastTyping.current = Date.now(); api(`/projects/${id}/typing`, { method: "POST" }).catch(() => {}); }
  };
  const attach = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") return toast.show("Fotozugriff benötigt, um Bilder zu senden.", "error");
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (res.canceled) return;
    const a = res.assets[0];
    try {
      const up = await upload(`/projects/${id}/media`, [{ uri: a.uri, name: a.fileName || `chat-${Date.now()}.jpg`, type: a.mimeType || "image/jpeg" }], { client_visible: "true", media_kind: "photo" });
      send.mutate({ text: text.trim(), attachment_ids: up.map((x: any) => x.id) });
    } catch (e: any) { toast.show(e.message, "error"); }
  };

  return (
    <View style={s.screen}>
      <ScreenHeader title={p?.name || "Projektchat"} subtitle={data?.typing?.length ? `${data.typing.join(", ")} schreibt…` : p?.number} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }} keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m: any) => m.id}
          contentContainerStyle={{ padding: space.lg, gap: space.sm }}
          testID="chat-list"
          renderItem={({ item: m }: any) =>
            m.type === "system" ? (
              <View style={s.system}><Caption>{m.text}</Caption></View>
            ) : (
              <View style={[s.bubble, m.mine ? s.mine : s.theirs]} testID={`msg-${m.id}`}>
                {!m.mine ? <Caption style={{ color: colors.brandPrimary, fontWeight: "600" }}>{m.sender_name}{m.sender_role && m.sender_role !== "CLIENT" ? " · OKA Bau" : ""}</Caption> : null}
                {m.attachments?.map((a: any) => <Pressable key={a.id} onPress={() => Linking.openURL(abs(a.url)!)}><Image source={{ uri: abs(a.url) }} style={{ width: 200, height: 150, borderRadius: radius.md }} contentFit="cover" /></Pressable>)}
                {m.text ? <Small style={{ color: m.mine ? colors.onSurfaceInverse : colors.onSurface, fontSize: 15 }}>{m.text}</Small> : null}
                <View style={{ flexDirection: "row", gap: 4, alignSelf: "flex-end", alignItems: "center" }}>
                  <Caption style={m.mine ? { color: colors.sand } : undefined}>{fmtDate(m.created_at, true)}</Caption>
                  {m.mine ? <Ionicons name={(m.read_by?.length || 0) > 1 ? "checkmark-done" : "checkmark"} size={14} color={colors.sand} /> : null}
                </View>
              </View>
            )
          }
        />
        <View style={[s.inputBar, { paddingBottom: insets.bottom + space.sm }]}>
          <Pressable onPress={attach} style={s.attach} testID="chat-attach"><Ionicons name="image-outline" size={22} color={colors.muted} /></Pressable>
          <TextInput value={text} onChangeText={onType} placeholder="Nachricht schreiben…" placeholderTextColor={colors.muted} style={s.input} multiline testID="chat-input" />
          <Pressable onPress={() => text.trim() && send.mutate({ text: text.trim() })} style={[s.send, !text.trim() && { opacity: 0.4 }]} testID="chat-send" disabled={!text.trim() || send.isPending}>
            <Ionicons name="arrow-up" size={20} color={colors.onSurfaceInverse} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
