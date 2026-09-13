import { useEffect, useRef, useState, useCallback } from "react";
import { AppState } from "react-native";
import { BACKEND_URL, getToken } from "@/src/api";

export type ChatEvent = { type: string; [k: string]: any };

/** Realtime project chat socket with exponential-backoff reconnect (network loss, background/foreground). */
export function useChatSocket(projectId: string | undefined, onEvent: (e: ChatEvent) => void) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const attempts = useRef(0);
  const timer = useRef<any>(null);
  const closedByUs = useRef(false);
  const handler = useRef(onEvent);
  handler.current = onEvent;

  const connect = useCallback(() => {
    if (!projectId || !getToken()) return;
    clearTimeout(timer.current);
    const url = `${BACKEND_URL.replace(/^http/, "ws")}/api/ws/projects/${projectId}?token=${encodeURIComponent(getToken()!)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onopen = () => { attempts.current = 0; setConnected(true); handler.current({ type: "connected" }); };
    ws.onmessage = (ev) => { try { handler.current(JSON.parse(ev.data)); } catch {} };
    ws.onerror = () => {};
    ws.onclose = () => {
      setConnected(false);
      if (closedByUs.current) return;
      const delay = Math.min(15000, 500 * 2 ** attempts.current++);
      timer.current = setTimeout(connect, delay);
    };
  }, [projectId]);

  useEffect(() => {
    closedByUs.current = false;
    connect();
    const sub = AppState.addEventListener("change", (st) => { if (st === "active" && wsRef.current?.readyState !== WebSocket.OPEN) { attempts.current = 0; connect(); } });
    const ping = setInterval(() => { if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ type: "ping" })); }, 25000);
    return () => { closedByUs.current = true; clearTimeout(timer.current); clearInterval(ping); sub.remove(); wsRef.current?.close(); };
  }, [connect]);

  const send = useCallback((e: ChatEvent) => { if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(e)); }, []);
  return { connected, send };
}
