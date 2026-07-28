import {
  ensureKnowledgeSchema,
  getAiMode,
  getOpenAiApiKey,
  getOrCreateVectorStore,
  getRuntimeEnv,
  insertLibraryFile,
  listLibraryFiles,
  openAiRequest,
  updateLibraryFile,
} from "../../../lib/knowledge";

export const runtime = "edge";

const MAX_FILE_SIZE = 30 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = /\.(pdf|docx|txt|md)$/i;

export async function GET(request: Request) {
  try {
    await ensureKnowledgeSchema();
    const files = await listLibraryFiles();
    const apiKey = getOpenAiApiKey(request);

    if (apiKey) {
      const pending = files.filter((file) => file.vectorStoreFileId && ["uploading", "in_progress"].includes(file.status));
      for (const file of pending.slice(0, 20)) {
        try {
          const vectorStoreId = await getOrCreateVectorStore(apiKey);
          const remote = await openAiRequest<{ status?: string }>(`/v1/vector_stores/${vectorStoreId}/files/${file.vectorStoreFileId}`, { method: "GET" }, apiKey);
          if (remote.status && remote.status !== file.status) await updateLibraryFile(file.id, { status: remote.status });
        } catch {
          // A list request should remain useful even if one file is still processing.
        }
      }
    }

    return Response.json({ configured: Boolean(apiKey), mode: getAiMode(request), files: await listLibraryFiles() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Knihovnu se nepodařilo načíst." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = getOpenAiApiKey(request);
    if (!apiKey) {
      return Response.json({ error: "Pro test nejdřív zadej jednorázový OpenAI API klíč." }, { status: 503 });
    }

    const data = await request.formData();
    const file = data.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Vyber soubor k nahrání." }, { status: 400 });
    if (!SUPPORTED_EXTENSIONS.test(file.name)) return Response.json({ error: "Pro první test nahraj PDF, DOCX, TXT nebo MD." }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return Response.json({ error: "Jeden soubor může mít maximálně 30 MB." }, { status: 400 });

    await ensureKnowledgeSchema();
    const runtime = getRuntimeEnv();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const r2Key = `library/${id}-${safeName}`;
    const bytes = await file.arrayBuffer();

    await insertLibraryFile({
      id,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      r2Key,
      openaiFileId: null,
      vectorStoreFileId: null,
      status: "uploading",
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    });

    await runtime.LIBRARY.put(r2Key, bytes, { httpMetadata: { contentType: file.type || "application/octet-stream" } });
    const upload = new FormData();
    upload.append("purpose", "assistants");
    upload.append("file", new File([bytes], file.name, { type: file.type || "application/octet-stream" }));
    const openAiFile = await openAiRequest<{ id: string }>("/v1/files", { method: "POST", body: upload }, apiKey);
    const vectorStoreId = await getOrCreateVectorStore(apiKey);
    const vectorFile = await openAiRequest<{ id: string; status?: string }>(`/v1/vector_stores/${vectorStoreId}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: openAiFile.id }),
    }, apiKey);

    await updateLibraryFile(id, {
      openaiFileId: openAiFile.id,
      vectorStoreFileId: vectorFile.id,
      status: vectorFile.status || "in_progress",
      errorMessage: null,
    });
    return Response.json({ file: (await listLibraryFiles()).find((entry) => entry.id === id) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Soubor se nepodařilo nahrát." }, { status: 500 });
  }
}
