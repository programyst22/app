import { Platform } from "react-native";
import { storage } from "@/src/utils/storage";

export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL as string;
export const API = `${BACKEND_URL}/api`;
export const TOKEN_KEY = "oka_access_token";

let memToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setToken(t: string | null) {
  memToken = t;
  if (t) storage.secureSet(TOKEN_KEY, t);
  else storage.secureRemove(TOKEN_KEY);
}
export async function loadToken() {
  memToken = (await storage.secureGet(TOKEN_KEY, null)) as string | null;
  return memToken;
}
export const getToken = () => memToken;
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T = any>(path: string, init: RequestInit & { json?: any } = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as any) };
  if (memToken) headers.Authorization = `Bearer ${memToken}`;
  let body = init.body;
  if (init.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }
  const res = await fetch(`${API}${path}`, { ...init, headers, body });
  if (res.status === 401 && memToken) {
    setToken(null);
    onUnauthorized?.();
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail ?? j);
    } catch {}
    throw new ApiError(res.status, detail || "Fehler");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type PickedFile = { uri: string; name: string; type: string };

export async function appendFile(form: FormData, field: string, f: PickedFile) {
  if (Platform.OS === "web") {
    const blob = await (await fetch(f.uri)).blob();
    form.append(field, blob, f.name);
  } else {
    form.append(field, { uri: f.uri, name: f.name, type: f.type } as any);
  }
}

export async function upload<T = any>(path: string, files: PickedFile[], fields: Record<string, string> = {}, fileField = "files"): Promise<T> {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  for (const f of files) await appendFile(form, fileField, f);
  const headers: Record<string, string> = {};
  if (memToken) headers.Authorization = `Bearer ${memToken}`;
  const res = await fetch(`${API}${path}`, { method: "POST", headers, body: form });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail || detail;
    } catch {}
    throw new ApiError(res.status, typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return res.json();
}

/** Resolve relative signed urls (/api/files/..) to absolute. */
export const abs = (u?: string | null) => (!u ? undefined : u.startsWith("http") ? u : `${BACKEND_URL}${u}`);

export const fmtDate = (iso?: string | null, withTime = false) => {
  if (!iso) return "–";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) });
};
export const fmtMoney = (n?: number | null) => (n == null ? "–" : n.toLocaleString("de-DE", { style: "currency", currency: "EUR" }));
