import { env as workerEnv } from "cloudflare:workers";

export type LibraryRecord = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  r2Key: string;
  openaiFileId: string | null;
  vectorStoreFileId: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

type RuntimeEnv = {
  DB: D1Database;
  LIBRARY: R2Bucket;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
};

type OpenAiError = { error?: { message?: string } };

export function getRuntimeEnv() {
  const runtime = workerEnv as unknown as RuntimeEnv;
  if (!runtime.DB || !runtime.LIBRARY) {
    throw new Error("Cloudové úložiště knihovny není připravené.");
  }
  return runtime;
}

export function getOpenAiApiKey(request?: Request) {
  const serverKey = (workerEnv as unknown as RuntimeEnv).OPENAI_API_KEY?.trim();
  if (serverKey) return serverKey;
  return request?.headers.get("x-openai-api-key")?.trim() || null;
}

export function isAiConfigured(request?: Request) {
  return Boolean(getOpenAiApiKey(request));
}

export function getAiMode(request?: Request) {
  if ((workerEnv as unknown as RuntimeEnv).OPENAI_API_KEY?.trim()) return "server";
  return getOpenAiApiKey(request) ? "session" : "none";
}

export async function ensureKnowledgeSchema() {
  const { DB } = getRuntimeEnv();
  await DB.batch([
    DB.prepare("CREATE TABLE IF NOT EXISTS knowledge_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    DB.prepare("CREATE TABLE IF NOT EXISTS library_files (id TEXT PRIMARY KEY, file_name TEXT NOT NULL, content_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, r2_key TEXT NOT NULL, openai_file_id TEXT, vector_store_file_id TEXT, status TEXT NOT NULL, error_message TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS library_files_created_at_idx ON library_files(created_at DESC)"),
  ]);
}

export async function readSetting(key: string) {
  const { DB } = getRuntimeEnv();
  const result = await DB.prepare("SELECT value FROM knowledge_settings WHERE key = ?").bind(key).all<{ value: string }>();
  return result.results[0]?.value ?? null;
}

export async function writeSetting(key: string, value: string) {
  const { DB } = getRuntimeEnv();
  const now = new Date().toISOString();
  await DB.prepare("INSERT INTO knowledge_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").bind(key, value, now).run();
}

export async function listLibraryFiles() {
  const { DB } = getRuntimeEnv();
  const result = await DB.prepare("SELECT id, file_name as fileName, content_type as contentType, size_bytes as sizeBytes, r2_key as r2Key, openai_file_id as openaiFileId, vector_store_file_id as vectorStoreFileId, status, error_message as errorMessage, created_at as createdAt, updated_at as updatedAt FROM library_files ORDER BY created_at DESC").all<LibraryRecord>();
  return result.results;
}

export async function updateLibraryFile(id: string, changes: Partial<Pick<LibraryRecord, "openaiFileId" | "vectorStoreFileId" | "status" | "errorMessage">>) {
  const { DB } = getRuntimeEnv();
  const existing = await DB.prepare("SELECT id, openai_file_id as openaiFileId, vector_store_file_id as vectorStoreFileId, status, error_message as errorMessage FROM library_files WHERE id = ?").bind(id).all<Pick<LibraryRecord, "id" | "openaiFileId" | "vectorStoreFileId" | "status" | "errorMessage">>();
  const record = existing.results[0];
  if (!record) return;
  const now = new Date().toISOString();
  await DB.prepare("UPDATE library_files SET openai_file_id = ?, vector_store_file_id = ?, status = ?, error_message = ?, updated_at = ? WHERE id = ?").bind(
    changes.openaiFileId ?? record.openaiFileId,
    changes.vectorStoreFileId ?? record.vectorStoreFileId,
    changes.status ?? record.status,
    changes.errorMessage ?? record.errorMessage,
    now,
    id,
  ).run();
}

export async function insertLibraryFile(record: LibraryRecord) {
  const { DB } = getRuntimeEnv();
  await DB.prepare("INSERT INTO library_files (id, file_name, content_type, size_bytes, r2_key, openai_file_id, vector_store_file_id, status, error_message, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(
    record.id, record.fileName, record.contentType, record.sizeBytes, record.r2Key, record.openaiFileId, record.vectorStoreFileId, record.status, record.errorMessage, record.createdAt, record.updatedAt,
  ).run();
}

export async function openAiRequest<T>(path: string, init: RequestInit, apiKey?: string | null) {
  const key = apiKey || getOpenAiApiKey();
  if (!key) {
    throw new Error("AI zatím není aktivní. Zadej testovací klíč OpenAI API.");
  }
  const response = await fetch(`https://api.openai.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, ...(init.headers ?? {}) },
  });
  const payload = await response.json() as T & OpenAiError;
  if (!response.ok) {
    throw new Error(payload.error?.message || "OpenAI vrátilo neznámou chybu.");
  }
  return payload;
}

export async function getOrCreateVectorStore(apiKey?: string | null) {
  await ensureKnowledgeSchema();
  const stored = await readSetting("openai_vector_store_id");
  if (stored) return stored;

  const created = await openAiRequest<{ id: string }>("/v1/vector_stores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Barnet servisní knihovna" }),
  }, apiKey);
  await writeSetting("openai_vector_store_id", created.id);
  return created.id;
}

export function getConfiguredModel() {
  return getRuntimeEnv().OPENAI_MODEL || "gpt-5.6-terra";
}
