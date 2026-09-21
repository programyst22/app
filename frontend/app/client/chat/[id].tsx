import React, { useEffect, useRef, useState } from "react";
import { View, FlatList, Pressable, TextInput, Linking, Platform, Text } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Add01Icon, ArrowUpRight01Icon } from "@hugeicons/core-free-icons";

import { api, abs, upload, fmtDate, PickedFile } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useChatSocket } from "@/src/hooks/useChatSocket";
import { PremiumHeader, StrokeIcon } from "@/src/components/premium";
import { useToast } from "@/src/components/ui";
import { makeStyles, useTheme, space, radius, fonts } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  bubble: { maxWidth: "82%", paddingHorizontal: 15, paddingVertical: 12, borderRadius: 18, gap: 5 },
  mine: { alignSelf: "flex-end", backgroundColor: c.surfaceInverse, borderBottomRightRadius: 6 },
  theirs: { alignSelf: "flex-start", backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderBottomLeftRadius: 6 },
  system: { alignSelf: "center", backgroundColor: c.surfaceTertiary, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999 },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 12, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: c.border,
    backgroundColor: c.surface,
  },
  input: {
    flex: 1, minHeight: 46, maxHeight: 120,
    borderRadius: 23, borderWidth: 1, borderColor: c.border,
    backgroundColor: c.surfaceTertiary,
    paddingHorizontal: 17, paddingVertical: 11,
    fontSize: 15, color: c.onSurface, fontFamily: fonts.regular,
  },
  round: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
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
  const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; at: number }>>({});

  const { connected, send: wsSend } = useChatSocket(id, (e) => {
    if (e.type === "message") {
      qc.setQueryData(["messages", id], (old: any) => {
        if (!old || old.messages.some((m: any) => m.id === e.message.id)) return old;
        return { ...old, messages: [...old.messages, { ...e.message, mine: e.message.sender_id === user?.id }] };
      });
      wsSend({ type: "read" });
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["client-dashboard"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setTypingUsers((t) => {
        const n = { ...t };
        delete n[e.message.sender_id];
        return n;
      });
    } else if (e.type === "typing") {
      setTypingUsers((t) => ({ ...t, [e.user_id]: { name: e.user_name, at: Date.now() } }));
    } else if (e.type === "read") {
      qc.setQueryData(["messages", id], (old: any) =>
        old && {
          ...old,
          messages: old.messages.map((m: any) =>
            m.read_by?.includes(e.user_id) ? m : { ...m, read_by: [...(m.read_by || []), e.user_id] }
          ),
        }
      );
    } else if (e.type === "connected") {
      qc.invalidateQueries({ queryKey: ["messages", id] });
    }
  });

  useEffect(() => {
    const t = setInterval(
      () =>
        setTypingUsers((cur) =>
          Object.fromEntries(Object.entries(cur).filter(([, v]) => Date.now() - (v as { at: number }).at < 5000))
        ),
      1000
    );
    return () => clearInterval(t);
  }, []);

  const { data } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => api(`/projects/${id}/messages`),
    refetchInterval: connected ? false : 5000,
  });

  const send = useMutation({
    mutationFn: (body: any) => api(`/projects/${id}/messages`, { method: "POST", json: body }),
    onSuccess: (m) => {
      setText("");
      qc.setQueryData(["messages", id], (old: any) =>
        !old || old.messages.some((x: any) => x.id === m.id)
          ? old
          : { ...old, messages: [...old.messages, m] }
      );
      qc.invalidateQueries({ queryKey: ["client-dashboard"] });
    },
    onError: (e: any) => toast.show(e.message, "error"),
  });

  const messages = data?.messages || [];
  const typingNames = (Object.values(typingUsers) as { name: string; at: number }[]).map((t) => t.name);

  useEffect(() => {
    if (messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const onType = (v: string) => {
    setText(v);
    if (Date.now() - lastTyping.current > 2000) {
      lastTyping.current = Date.now();
      if (connected) wsSend({ type: "typing" });
      else api(`/projects/${id}/typing`, { method: "POST" }).catch(() => {});
    }
  };

  const sendFiles = async (files: PickedFile[]) => {
    try {
      const up = await upload(`/projects/${id}/media`, files, {
        client_visible: "true",
        media_kind: "photo",
      });
      send.mutate({ text: text.trim(), attachment_ids: up.map((x: any) => x.id) });
    } catch (e: any) {
      toast.show(e.message, "error");
    }
  };

  const attach = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      return toast.show("Fotozugriff benötigt, um Bilder zu senden.", "error");
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (res.canceled) return;
    const a = res.assets[0];
    sendFiles([{ uri: a.uri, name: a.fileName || `chat-${Date.now()}.jpg`, type: a.mimeType || "image/jpeg" }]);
  };

  const attachDoc = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    sendFiles([{ uri: a.uri, name: a.name, type: a.mimeType || "application/pdf" }]);
  };

  const subtitle = typingNames.length
    ? `${typingNames.join(", ")} schreibt…`
    : `${p?.number || ""}${connected ? " · live" : " · verbinde…"}`;

  return (
    <View style={s.screen}>
      <PremiumHeader
        title={p?.name || "Projektchat"}
        subtitle={subtitle}
        right={
          <View
            style={{
              width: 9,
              height: 9,
              borderRadius: 5,
              backgroundColor: connected ? colors.success : colors.warning,
            }}
            testID="chat-connection"
          />
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m: any) => m.id}
          contentContainerStyle={{ padding: 16, gap: 9, paddingTop: 20 }}
          testID="chat-list"
          renderItem={({ item: m }: any) =>
            m.type === "system" ? (
              <View style={s.system}>
                <Text style={{ fontFamily: fonts.regular, color: colors.muted, fontSize: 12 }}>{m.text}</Text>
              </View>
            ) : (
              <View style={[s.bubble, m.mine ? s.mine : s.theirs]} testID={`msg-${m.id}`}>
                {!m.mine ? (
                  <Text style={{ color: colors.onSurface, fontFamily: fonts.semibold, fontSize: 12 }}>
                    {m.sender_name}
                    {m.sender_role && m.sender_role !== "CLIENT" ? " · OKA Bau" : ""}
                  </Text>
                ) : null}

                {m.attachments?.map((a: any) => (
                  <Pressable
                    key={a.id}
                    onPress={() => Linking.openURL(abs(a.url)!)}
                    testID={`attachment-${a.id}`}
                  >
                    {/(\.pdf)(\?|$)/i.test(a.url) || a.content_type?.includes("pdf") ? (
                      <View
                        style={{
                          borderRadius: 12,
                          backgroundColor: m.mine ? "rgba(255,255,255,.12)" : colors.surfaceTertiary,
                          padding: 12,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: fonts.semibold,
                            color: m.mine ? "#fff" : colors.onSurface,
                            fontSize: 13,
                          }}
                        >
                          PDF · Dokument öffnen
                        </Text>
                      </View>
                    ) : (
                      <Image
                        source={{ uri: abs(a.url) }}
                        style={{ width: 210, height: 155, borderRadius: 13 }}
                        contentFit="cover"
                      />
                    )}
                  </Pressable>
                ))}

                {m.text ? (
                  <Text
                    style={{
                      color: m.mine ? "#fff" : colors.onSurface,
                      fontFamily: fonts.regular,
                      fontSize: 15,
                      lineHeight: 22,
                    }}
                  >
                    {m.text}
                  </Text>
                ) : null}

                <Text
                  style={{
                    color: m.mine ? "rgba(255,255,255,.6)" : colors.muted,
                    fontFamily: fonts.regular,
                    fontSize: 11,
                    alignSelf: "flex-end",
                  }}
                >
                  {fmtDate(m.created_at, true)}
                  {m.mine ? ((m.read_by?.length || 0) > 1 ? " · gelesen" : " · gesendet") : ""}
                </Text>
              </View>
            )
          }
        />

        <View style={[s.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          <Pressable
            onPress={attach}
            style={[s.round, { borderWidth: 1, borderColor: colors.border }]}
            testID="chat-attach"
          >
            <StrokeIcon icon={Add01Icon} size={20} color={colors.onSurface} />
          </Pressable>

          <Pressable
            onPress={attachDoc}
            style={{
              minHeight: 46,
              borderRadius: 23,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
            testID="chat-attach-doc"
          >
            <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: colors.onSurface }}>PDF</Text>
          </Pressable>

          <TextInput
            value={text}
            onChangeText={onType}
            placeholder="Nachricht schreiben…"
            placeholderTextColor={colors.muted}
            style={s.input}
            multiline
            testID="chat-input"
          />

          <Pressable
            onPress={() => text.trim() && send.mutate({ text: text.trim() })}
            style={[s.round, { backgroundColor: colors.surfaceInverse }, !text.trim() && { opacity: 0.35 }]}
            testID="chat-send"
            disabled={!text.trim() || send.isPending}
          >
            <StrokeIcon icon={ArrowUpRight01Icon} size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
